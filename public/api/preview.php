<?php

require_once 'db-utils.php';
$config = require __DIR__ . '/config.php'; // Load configuration

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$adminApiKey = $config['admin']['key'] ?? null;

// Check for the custom admin key header
$requestApiKey = $_SERVER['HTTP_X_ADMIN_KEY'] ?? null;

if (!$adminApiKey) {
    // This is a server configuration issue, the admin key should be set.
    http_response_code(500);
    echo json_encode(['error' => 'Admin API key is not configured on the server.']);
    exit;
}

if ($requestApiKey !== $adminApiKey) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Invalid or missing X-Admin-Key header.']);
    exit;
}

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // Query the headline_preview table and return a list of the results.
        $stmt = $db->query('SELECT * FROM headline_preview ORDER BY id DESC');
        $previews = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$previews) {
            echo json_encode([]);
            exit;
        }

        $result = [];
        foreach ($previews as $preview_row) {
            // Decode JSON fields
            if (isset($preview_row['possible_answers'])) {
                $decodedPossibleAnswers = json_decode($preview_row['possible_answers'], true);
                // Store the array of answers, defaulting to an empty array if parsing fails or key missing
                $preview_row['possible_answers'] = $decodedPossibleAnswers['answers'] ?? $decodedPossibleAnswers ?? [];
            }

            // Convert all snake_case keys to camelCase
            $camelCasePreview = [];
            foreach ($preview_row as $key => $value) {
                $camelCaseKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
                $camelCasePreview[$camelCaseKey] = $value;
            }
            $result[] = $camelCasePreview;
        }

        echo json_encode($result);
    } elseif ($method === 'POST') {
        // Accepts a single parameter: id (of a preview headline).
        // Then it will load that preview and copy it into the actual "headline" table,
        // using the insertHeadline function.

        $input = json_decode(file_get_contents('php://input'), true);
        $previewId = $input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? null;

        if (!$previewId) {
            http_response_code(400);
            throw new Exception('Preview ID is required.');
        }
        $previewId = (int)$previewId;

        // Load the preview headline
        $stmt = $db->prepare('SELECT * FROM headline_preview WHERE id = ?');
        $stmt->execute([$previewId]);
        $previewData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$previewData) {
            http_response_code(404);
            throw new Exception('Preview headline not found with ID: ' . $previewId);
        }

        // Prepare data for insertHeadline function
        $headline = $previewData['headline'];
        $beforeBlank = $previewData['before_blank'];
        $afterBlank = $previewData['after_blank'];
        $hint = $previewData['hint'] ?? ''; // Hint can be null
        $articleUrl = $previewData['article_url'];
        $redditUrl = $previewData['reddit_url'];
        $correctAnswer = $previewData['correct_answer'];
        $explanation = $previewData['explanation'] ?? '';

        $possibleAnswersDecoded = json_decode($previewData['possible_answers'], true);
        // insertHeadline expects an array of strings for possible_answers
        $possibleAnswersArray = $possibleAnswersDecoded['answers'] ?? [];

        $publishTime = $previewData['publish_time'];

        // Temporarily capture output from insertHeadline as it echoes information
        ob_start();
        insertHeadline(
            $headline,
            $beforeBlank,
            $afterBlank,
            $hint,
            $articleUrl,
            $redditUrl,
            $correctAnswer,
            $possibleAnswersArray,
            $publishTime,
            $explanation,
            false // save_to_preview = false, so it saves to 'headline' table and 'headline_stats'
        );
        $insertOutput = ob_get_clean();

        $newHeadlineId = null;
        if (preg_match('/Inserted headline with ID: (\d+)/', $insertOutput, $matches)) {
            $newHeadlineId = (int)$matches[1];
        }

        if ($newHeadlineId) {
            echo json_encode([
                'message' => 'Preview headline published successfully to the main headline table.',
                'newHeadlineId' => $newHeadlineId,
                'details' => trim($insertOutput)
            ]);
        } else {
            http_response_code(500);
            throw new Exception('Failed to publish preview headline. Output: ' . trim($insertOutput));
        }
    } elseif ($method === 'DELETE') {
        // Check if an ID is provided for deleting a single preview
        $input = json_decode(file_get_contents('php://input'), true);
        $previewId = $input['id'] ?? $_GET['id'] ?? null;

        if ($previewId) {
            $previewId = (int)$previewId;
            // Delete a single row from headline_preview
            $stmt = $db->prepare('DELETE FROM headline_preview WHERE id = ?');
            $stmt->execute([$previewId]);
            $rowCount = $stmt->rowCount();

            if ($rowCount > 0) {
                echo json_encode(['message' => "Successfully deleted preview headline with ID: $previewId."]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => "Preview headline not found with ID: $previewId."]);
            }
        } else {
            // Deletes all rows from the headline_preview table.
            $stmt = $db->prepare('DELETE FROM headline_preview');
            $stmt->execute();
            $rowCount = $stmt->rowCount();
            echo json_encode(['message' => "Successfully deleted $rowCount row(s) from headline_preview."]);
        }
    } else {
        http_response_code(405); // Method Not Allowed
        throw new Exception('Unsupported request method. Only GET, POST, DELETE are allowed.');
    }
} catch (Exception $e) {
    if (http_response_code() === 200) { // If no HTTP error code has been set by a throw before
        http_response_code(500); // Default to 500 Internal Server Error
    }
    echo json_encode(['error' => $e->getMessage()]);
}

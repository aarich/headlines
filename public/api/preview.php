<?php

require_once 'db-utils.php';
require_once 'auth-utils.php'; // Include the new auth utility
$config = require __DIR__ . '/config.php'; // Load configuration

header('Content-Type: application/json');

// Perform admin authentication for all methods in this file
requireAdminAuth($config);

$method = $_SERVER['REQUEST_METHOD'];

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
    } elseif ($method === 'PATCH') {
        // Accepts parameters: id (of a preview headline) and status ('selected', 'rejected', or null).
        // Sets the specified record's status.
        // If status is 'selected', it ensures no other record is 'selected'.

        $input = json_decode(file_get_contents('php://input'), true);
        $previewId = $input['id'] ?? null;
        $status = $input['status'] ?? null;

        if (!$previewId) {
            http_response_code(400);
            throw new Exception('Preview ID is required for updating status.');
        }
        $previewId = (int)$previewId;

        if ($status !== null && !in_array($status, ['selected', 'rejected'])) {
            http_response_code(400);
            throw new Exception("Invalid status value. Must be 'selected', 'rejected', or null.");
        }

        $db->beginTransaction();
        try {
            // If setting to 'selected', first clear any other 'selected' status
            if ($status === 'selected') {
                $stmtClear = $db->prepare('UPDATE headline_preview SET status = NULL WHERE status = "selected"');
                $stmtClear->execute();
            }

            // Set the new status for the specified preview ID
            $stmtSet = $db->prepare('UPDATE headline_preview SET status = ? WHERE id = ?');
            if ($status === null) {
                $stmtSet->bindValue(1, null, PDO::PARAM_NULL);
            } else {
                $stmtSet->bindValue(1, $status, PDO::PARAM_STR);
            }
            $stmtSet->bindValue(2, $previewId, PDO::PARAM_INT);
            $stmtSet->execute();
            $rowCount = $stmtSet->rowCount();

            $db->commit();

            if ($rowCount > 0) {
                $statusMessage = $status === null ? "cleared" : "set to '$status'";
                echo json_encode(['message' => "Successfully updated status for preview headline with ID: $previewId (status $statusMessage)."]);
            } else {
                http_response_code(404); // Or 400 if ID not found is a client error
                // Check if the record exists at all
                $stmtCheck = $db->prepare('SELECT id FROM headline_preview WHERE id = ?');
                $stmtCheck->execute([$previewId]);
                if (!$stmtCheck->fetch()) {
                    throw new Exception("Preview headline not found with ID: $previewId.");
                }
                // If it exists but rowCount is 0, it means the status was already what we tried to set it to.
                echo json_encode(['message' => "Preview headline with ID: $previewId already had the status '$status' or status was unchanged."]);
            }
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    } else {
        http_response_code(405); // Method Not Allowed
        throw new Exception('Unsupported request method. Only GET, POST, PATCH, DELETE are allowed.');
    }
} catch (Exception $e) {
    if (http_response_code() === 200) { // If no HTTP error code has been set by a throw before
        http_response_code(500); // Default to 500 Internal Server Error
    }
    echo json_encode(['error' => $e->getMessage()]);
}

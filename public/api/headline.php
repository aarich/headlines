<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/auth.php';
$config = require __DIR__ . '/../util/config.php';

header('Content-Type: application/json');

try {
    $db = getDbConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        // Use the shared admin auth check
        requireAdminAuth($config);

        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            throw new Exception('Invalid JSON input: ' . json_last_error_msg());
        }

        $previewStatus = $input['previewStatus'] ?? null;
        $previewId = $input['previewId'] ?? null;

        if ($previewStatus === null && $previewData === null) {
            http_response_code(400);
            throw new Exception('The "previewStatus" or a preview ID must be provided');
        }

        if ($previewStatus && $previewId) {
            http_response_code(400);
            throw new Exception('Only one of "previewStatus" or "previewId" can be set');
        }

        if ($previewStatus) {
            // Find the preview with the specified status
            $stmtPreview = $db->prepare('SELECT * FROM headline_preview WHERE status = ? ORDER BY id ASC LIMIT 1');
            $stmtPreview->execute([$previewStatus]);
            $previewData = $stmtPreview->fetch(PDO::FETCH_ASSOC);
        } else {
            // Find the preview by ID
            $stmtPreview = $db->prepare('SELECT * FROM headline_preview WHERE id = ?');
            $stmtPreview->execute([$previewId]);
            $previewData = $stmtPreview->fetch(PDO::FETCH_ASSOC);
        }

        if (!$previewData) {
            http_response_code(404);
            throw new Exception('No preview headline found in headline_preview table.');
        }

        $result = promotePreview($previewData);

        if ($result) {
            $result['message'] = 'Selected preview headline published successfully to the main headline table and all previews cleared.';
            echo json_encode($result);
        } else {
            http_response_code(500);
            throw new Exception('Failed to publish selected preview headline. Previews not cleared. Output: ' . trim($insertOutput));
        }
    } elseif ($method === 'GET') {
        $headline_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        $headline_game_num = isset($_GET['game']) ? (int)$_GET['game'] : null;

        // Throw an error if they were both set
        if ($headline_id && $headline_game_num) {
            http_response_code(400);
            throw new Exception('Only one of id or game should be provided.');
        }

        // Prepare the base query
        $query = 'SELECT 
            id,
            game_num,
            headline,
            before_blank,
            after_blank,
            hint,
            article_url,
            reddit_url,
            correct_answer,
            possible_answers,
            publish_time
        FROM headline
    ';

        $params = [];
        if ($headline_id) {
            $query .= ' WHERE id = ?';
            $params[] = $headline_id;
        } else if ($headline_game_num) {
            $query .= ' WHERE game_num = ?';
            $params[] = $headline_game_num;
        } else {
            $query .= ' ORDER BY id DESC LIMIT 1';
        }

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $headlineData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$headlineData) {
            http_response_code(404);
            throw new Exception('No headlines found.');
        }

        // Decode the JSON fields
        $possibleAnswers = json_decode($headlineData['possible_answers'], true);
        // Ensure 'answers' key exists or default to empty array, then add correct answer
        $headlineData['possible_answers'] = $possibleAnswers['answers'] ?? [];
        // append the correct answer to the possible answers
        $headlineData['possible_answers'][] = $headlineData['correct_answer'];

        // shuffle the possible answers
        shuffle($headlineData['possible_answers']);

        // Convert all snake case to camel case
        $camelCaseHeadline = array_combine(
            array_map(function ($key) {
                return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
            }, array_keys($headlineData)),
            array_values($headlineData)
        );

        echo json_encode($camelCaseHeadline);
    } else {
        http_response_code(405); // Method Not Allowed
        throw new Exception('Unsupported request method. Only GET and POST are allowed.');
    }
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(['error' => $e->getMessage()]);
}

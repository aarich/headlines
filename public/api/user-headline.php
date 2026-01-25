<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/auth.php';
require_once __DIR__ . '/../util/api.php';
require_once __DIR__ . '/../util/create-helpers.php';
$config = require __DIR__ . '/../util/config.php';

header('Content-Type: application/json');

try {
    $db = getDbConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            throw new Exception('Invalid JSON input: ' . json_last_error_msg());
        }

        $headline = $input['headline'] ?? null;
        $hint = $input['hint'] ?? null;
        $article_url = $input['articleUrl'] ?? null;
        $correct_answer = $input['correctAnswer'] ?? null;
        $publish_time = $input['publishTime'] ?? null;
        $before_blank = $input['beforeBlank'] ?? null;
        $after_blank = $input['afterBlank'] ?? null;
        // if before_blank or after_blank are not provided, try to derive them
        if (!isset($input['beforeBlank']) || !isset($input['afterBlank'])) {
            $blankFields = derive_before_after_and_correct_answer($headline, $correct_answer, false);
            $before_blank = $blankFields['before_blank'];
            $after_blank = $blankFields['after_blank'];
            $correct_answer = $blankFields['actual_correct_answer'];
        }

        if (!$headline || !$hint || !$correct_answer) {
            http_response_code(400);
            throw new Exception('Missing required fields.');
        }

        $headlineId = createUserHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $correct_answer, $publish_time);
        http_response_code(201); // Created
        echo json_encode(['message' => 'Successfully created user headline.', 'id' => $headlineId]);
    } elseif ($method === 'GET') {
        $headline_id = $_GET['id'];
        $headlineData = getUserHeadline($headline_id);

        if (!$headlineData) {
            http_response_code(404);
            throw new Exception('No headlines found.');
        }

        $camelCaseHeadline = convertToCamelCase($headlineData);

        echo json_encode($camelCaseHeadline);
    } elseif ($method === 'DELETE') {
        $headline_id = (int)$_GET['id'];

        if (!validateHeadlineId($headline_id)) {
            http_response_code(404);
            throw new Exception('Headline not found.');
        }

        $stmt = $db->prepare('DELETE FROM user_headline WHERE id = ?');
        $stmt->execute([$headline_id]);

        echo json_encode(['message' => 'Headline deleted successfully.']);
    } else {
        http_response_code(405); // Method Not Allowed
        throw new Exception('Unsupported request method. Only GET, POST and PATCH are allowed.');
    }
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(['error' => $e->getMessage()]);
}

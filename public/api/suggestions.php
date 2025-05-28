<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/api.php';
$config = require __DIR__ . '/../util/config.php';

header('Content-Type: application/json');

// Handle preflight requests for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Allow common methods and headers. Adjust as necessary.
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$db = null;

try {
    $db = getDbConnection();

    if ($method === 'POST') {
        // Create a new suggestions
        $input = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            throw new Exception('Invalid JSON input: ' . json_last_error_msg());
        }

        if (!isset($input['headlineId'], $input['suggestionText'])) {
            http_response_code(400);
            throw new Exception('Missing required fields: headlineId, suggestionText');
        }

        $headline_id = (int)$input['headlineId'];
        $suggestion_text = trim($input['suggestionText']);

        if (empty($suggestion_text) || $headline_id <= 0) {
            http_response_code(400);
            throw new Exception('Invalid input values. headlineId must be positive, suggestionText must not be empty.');
        }

        // Check for blocked words
        $blockedWords = getBlockedWords();
        $lowerSuggestionText = strtolower($suggestion_text);

        foreach ($blockedWords as $blockedWord) {
            // $blockedWord is already lowercase from getBlockedWords()
            if (strpos($lowerSuggestionText, $blockedWord) !== false) {
                http_response_code(400);
                throw new Exception('Suggestion contains a blocked word.');
            }
        }

        // If a duplicate key (headline_id, suggestion_text) is found, increment votes
        $stmt = $db->prepare("
            INSERT INTO suggestion (headline_id, suggestion_text, votes) 
            VALUES (:headline_id, :suggestion_text, 1)
            ON DUPLICATE KEY UPDATE votes = votes + 1
        ");

        $stmt->execute([
            ':headline_id' => $headline_id,
            ':suggestion_text' => $suggestion_text
        ]);

        $return_id = $db->lastInsertId();
        $action = '';
        $message = '';

        if ($return_id > 0) {
            // A new suggestion was inserted
            $return_id = (int)$return_id;
            $action = 'created';
            $message = 'Suggestion created successfully';
            http_response_code(201); // Created
        } else {
            // An existing suggestion's vote was incremented
            // Fetch the ID of the existing row
            $stmt_select = $db->prepare("SELECT id FROM suggestion WHERE headline_id = :headline_id AND suggestion_text = :suggestion_text");
            $stmt_select->execute([
                ':headline_id' => $headline_id,
                ':suggestion_text' => $suggestion_text
            ]);
            $row = $stmt_select->fetch(PDO::FETCH_ASSOC);
            $return_id = $row ? (int)$row['id'] : null;
            $action = 'voted';
            $message = 'Suggestion vote counted successfully';
            http_response_code(200); // OK
        }
        echo json_encode(['message' => $message, 'id' => $return_id, 'action' => $action]);
    } elseif ($method === 'PATCH') {
        // Vote on a suggestion (increment votes)
        $suggestion_id = $_GET['id'] ?? null;

        if (!$suggestion_id || !is_numeric($suggestion_id) || (int)$suggestion_id <= 0) {
            http_response_code(400);
            throw new Exception('Missing or invalid suggestion ID.');
        }
        $suggestion_id = (int)$suggestion_id;

        $stmt = $db->prepare("UPDATE suggestion SET votes = votes + 1 WHERE id = :id");
        $stmt->execute([':id' => $suggestion_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Vote recorded successfully']);
        } else {
            http_response_code(404);
            throw new Exception('Suggestion not found or no change in votes.');
        }
    } elseif ($method === 'GET') {
        // Fetch suggestions for a game (top 10 + 5 random)
        $headline_id = $_GET['headlineId'] ?? null;

        if (!$headline_id || !is_numeric($headline_id) || (int)$headline_id <= 0) {
            http_response_code(400);
            throw new Exception('Missing or invalid headlineId parameter.');
        }
        $headline_id = (int)$headline_id;

        // Fetch top 10 suggestions by votes
        $stmt_top = $db->prepare("SELECT id, headline_id, suggestion_text, votes, created_at FROM suggestion WHERE headline_id = :headline_id ORDER BY votes DESC, created_at ASC LIMIT 10");
        $stmt_top->execute([':headline_id' => $headline_id]);
        $top_suggestions = $stmt_top->fetchAll(PDO::FETCH_ASSOC);

        $top_suggestion_ids = array_map(function ($s) {
            return $s['id'];
        }, $top_suggestions);

        // Fetch up to 5 random suggestions not in the top 10
        $query_parts = ["SELECT id, headline_id, suggestion_text, votes, created_at FROM suggestion WHERE headline_id = ?"];
        $bindings = [$headline_id];

        if (!empty($top_suggestion_ids)) {
            $id_placeholders = implode(',', array_fill(0, count($top_suggestion_ids), '?'));
            $query_parts[] = "AND id NOT IN ($id_placeholders)";
            // Add IDs to bindings array
            // Using array_merge for compatibility, alternative for PHP 5.6+ could be array_push($bindings, ...$top_suggestion_ids);
            $bindings = array_merge($bindings, $top_suggestion_ids);
        }
        $query_parts[] = "ORDER BY RAND() LIMIT 5";
        $query_random_sql = implode(' ', $query_parts);

        $stmt_random = $db->prepare($query_random_sql);
        $stmt_random->execute($bindings);
        $random_suggestions_fetched = $stmt_random->fetchAll(PDO::FETCH_ASSOC);

        // Combine and ensure uniqueness (though `NOT IN` should handle it for random part)
        $all_suggestions_map = [];
        // Ensure $top_suggestions and $random_suggestions_fetched are arrays before iterating
        $top_suggestions = is_array($top_suggestions) ? $top_suggestions : [];
        $random_suggestions_fetched = is_array($random_suggestions_fetched) ? $random_suggestions_fetched : [];

        foreach ($top_suggestions as $s) {
            $all_suggestions_map[$s['id']] = convertToCamelCase($s);
        }
        foreach ($random_suggestions_fetched as $s) {
            $all_suggestions_map[$s['id']] = convertToCamelCase($s);
        }

        echo json_encode(array_values($all_suggestions_map));
    } else {
        http_response_code(405); // Method Not Allowed
        throw new Exception('Method Not Allowed. Only GET, POST, PATCH are supported.');
    }
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    echo $e->getMessage();
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred.']);
} catch (Exception $e) {
    // If http_response_code hasn't been set, default to 500
    if (http_response_code() === 200 || http_response_code() === 0) { // 0 can happen in CLI or some setups
        http_response_code(500);
    }
    echo json_encode(['error' => $e->getMessage()]);
}

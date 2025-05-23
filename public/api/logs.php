<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/auth.php';
require_once __DIR__ . '/../util/api.php';
$config = require __DIR__ . '/../util/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only GET and DELETE are permitted.']);
    exit();
}

requireAdminAuth($config);

try {
    $db = getDbConnection();

    $limit = isset($_GET['n']) ? (int)$_GET['n'] : 20;
    if ($limit <= 0) {
        $limit = 20; // Default to 20 if invalid
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->prepare('SELECT id, created_date, command, environment, message, status FROM script_execution ORDER BY id DESC LIMIT :limit');
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $logsResult = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($logsResult === false) {
            // This case should ideally not happen if the query is correct and table exists.
            // fetchAll returns an empty array if no rows, or false on error.
            throw new Exception('Failed to fetch script logs.');
        }

        $logs = [];
        foreach ($logsResult as $row) {
            $logs[] = convertToCamelCase($row);
        }

        echo json_encode(['logs' => $logs]);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $stmt = $db->prepare('DELETE FROM script_execution');
        $stmt->execute();
        $rowCount = $stmt->rowCount();

        echo json_encode(['message' => "Successfully deleted $rowCount script execution log(s).", 'deletedCount' => $rowCount]);
    }
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(['error' => 'Failed to retrieve script logs: ' . $e->getMessage()]);
}

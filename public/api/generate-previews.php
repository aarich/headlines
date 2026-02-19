<?php

require_once __DIR__ . '/../util/auth.php';
$config = require __DIR__ . '/../util/config.php';

header('Content-Type: application/json');

requireAdminAuth($config);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only POST is permitted.']);
    exit();
}

$scriptPath = realpath(__DIR__ . '/../scripts/create-games.php');

if (!$scriptPath) {
    http_response_code(500);
    echo json_encode(['error' => 'Script not found.']);
    exit();
}

// Command to run the script in the background
// -y: auto-confirm
// --preview: save to preview table
// --skip-status: skip recency check (ignore if headline is recent)
$command = "php " . escapeshellarg($scriptPath) . " -y --preview --skip-status > /dev/null 2>&1 &";

exec($command);

echo json_encode(['message' => 'Preview creation initiated']);

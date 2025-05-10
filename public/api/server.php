<?php
// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the request URI
$request_uri = $_SERVER['REQUEST_URI'];

// Route the request to the appropriate PHP file
if (strpos($request_uri, '/api/headline') !== false) {
    require_once 'headline.php';
} else if (strpos($request_uri, '/api/update-stat') !== false) {
    require_once 'update-stat.php';
} else if (strpos($request_uri, '/api/history') !== false) {
    require_once 'history.php';
} else if (strpos($request_uri, '/api/status') !== false) {
    require_once 'status.php';
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
}

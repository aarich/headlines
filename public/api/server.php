<?php
// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the request URI
$request_uri = $_SERVER['REQUEST_URI'];

// Route the request to the appropriate PHP file
if (strpos($request_uri, '/api/get_headline.php') !== false) {
    require_once 'get_headline.php';
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
} 
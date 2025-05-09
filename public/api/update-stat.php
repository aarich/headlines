<?php
require_once 'db-utils.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: PATCH');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get the request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['headlineId']) || !isset($input['action'])) {
        throw new Exception('Invalid request format. Required fields: headlineId, action');
    }
    
    $headlineId = $input['headlineId'];
    $action = $input['action'];
    $data = $input['data'] ?? [];
    
    // Validate headline ID exists
    if (!validateHeadlineId($headlineId)) {
        throw new Exception('Invalid headline ID');
    }
    
    // Handle the game action
    $success = handleGameAction($headlineId, $action, $data);
    
    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Action processed successfully']);
    } else {
        throw new Exception('Failed to process action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} 
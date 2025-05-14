<?php

/**
 * Checks for a valid admin API key.
 *
 * This function will terminate script execution with an appropriate HTTP error
 * code and JSON error message if the admin key is not configured, missing,
 * or invalid.
 *
 * @param array $config The application configuration array, expected to contain ['admin']['key'].
 * @return void
 */
function requireAdminAuth(array $config): void {
    $adminApiKey = $config['admin']['key'] ?? null;
    if (!$adminApiKey) {
        http_response_code(500); // Server configuration error
        echo json_encode(['error' => 'Admin API key is not configured on the server.']);
        exit;
    }

    $requestApiKey = $_SERVER['HTTP_X_ADMIN_KEY'] ?? null;
    if ($requestApiKey !== $adminApiKey) {
        http_response_code(401); // Unauthorized
        echo json_encode(['error' => 'Unauthorized. Invalid or missing X-Admin-Key header.']);
        exit;
    }
}

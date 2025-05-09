<?php

// Default configuration
$config = [
    'db' => [
        'host' => 'localhost',
        'name' => 'name',
        'user' => 'your_username',
        'pass' => 'your_password',
        'charset' => 'utf8mb4'
    ]
];

// Load local configuration if it exists
$localConfigFile = __DIR__ . '/config.local.php';
if (file_exists($localConfigFile)) {
    $localConfig = require $localConfigFile;
    $config = array_replace_recursive($config, $localConfig);
}

return $config; 
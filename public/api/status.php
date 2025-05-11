<?php
/*
MySQL tables

CREATE TABLE headline (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    headline TEXT NOT NULL,
    before_blank TEXT NOT NULL,
    after_blank TEXT NOT NULL,
    hint TEXT,
    article_url TEXT NOT NULL,
    reddit_url TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    possible_answers JSON NOT NULL,
    publish_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_publish_time (publish_time),
    FULLTEXT INDEX idx_headline (headline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/

require_once 'db-utils.php';

header('Content-Type: application/json');

try {
    $result = getStatus();

    echo json_encode($result);
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(['error' => 'Failed to fetch headline: ' . $e->getMessage()]);
}

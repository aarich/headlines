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

CREATE TABLE headline_stats (
    headline_id INT UNSIGNED PRIMARY KEY,
    total_plays INT UNSIGNED DEFAULT 0,
    total_correct_guesses INT UNSIGNED DEFAULT 0,
    total_incorrect_guesses INT UNSIGNED DEFAULT 0,
    share_count INT UNSIGNED DEFAULT 0,
    article_click_count INT UNSIGNED DEFAULT 0,
    reddit_click_count INT UNSIGNED DEFAULT 0,
    first_guess_correct_count INT UNSIGNED DEFAULT 0,
    FOREIGN KEY (headline_id) REFERENCES headline(id) ON DELETE CASCADE,
    INDEX idx_total_plays (total_plays)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wrong_guess (
    headline_id INT UNSIGNED NOT NULL,
    guess_word VARCHAR(255) NOT NULL,
    guess_count INT UNSIGNED DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (headline_id, guess_word),
    FOREIGN KEY (headline_id) REFERENCES headline(id) ON DELETE CASCADE,
    INDEX idx_guess_count (guess_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/

require_once 'db-utils.php';

header('Content-Type: application/json');

try {
    // Get the headline ID from query parameter if provided
    $headlineId = isset($_GET['id']) ? (int)$_GET['id'] : null;

    // Prepare the base query
    $query = '
        SELECT 
            h.id,
            h.headline,
            h.before_blank,
            h.after_blank,
            h.hint,
            h.article_url,
            h.reddit_url,
            h.correct_answer,
            h.possible_answers,
            h.publish_time,
            hs.total_plays,
            hs.total_correct_guesses,
            hs.total_incorrect_guesses,
            -- hs.share_count,
            -- hs.article_click_count,
            hs.first_guess_correct_count
        FROM headline h
        LEFT JOIN headline_stats hs ON h.id = hs.headline_id
    ';

    // Add WHERE clause if headline ID is provided
    if ($headlineId) {
        $query .= ' WHERE h.id = ?';
        $stmt = getDbConnection()->prepare($query);
        $stmt->execute([$headlineId]);
    } else {
        $query .= ' ORDER BY h.id DESC LIMIT 1';
        $stmt = getDbConnection()->query($query);
    }

    $headline = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$headline) {
        http_response_code(404);
        throw new Exception('No headlines found');
    }

    // Get the incorrect guesses
    $stmt = getDbConnection()->prepare('
        SELECT guess_word, guess_count 
        FROM wrong_guess 
        WHERE headline_id = ? 
        ORDER BY guess_count DESC 
        LIMIT 10
    ');
    $stmt->execute([$headline['id']]);
    $incorrectGuesses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    // Decode the JSON fields
    $possibleAnswers = json_decode($headline['possible_answers'], true);
    $headline['possible_answers'] = $possibleAnswers['answers'];
    // append the correct answer to the possible answers
    $headline['possible_answers'][] = $headline['correct_answer'];
    $headline['most_common_incorrect_guesses'] = $incorrectGuesses;

    // shuffle the possible answers
    shuffle($headline['possible_answers']);

    // Convert all snake case to camel case
    $headline = array_combine(
        array_map(function ($key) {
            return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
        }, array_keys($headline)),
        array_values($headline)
    );

    echo json_encode($headline);
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(['error' => 'Failed to fetch headline: ' . $e->getMessage()]);
}

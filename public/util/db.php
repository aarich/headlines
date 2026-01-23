<?php

/*
MySQL tables. Here for reference.

CREATE TABLE headline (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_num INT UNSIGNED NOT NULL,
    headline TEXT NOT NULL,
    before_blank TEXT NOT NULL,
    after_blank TEXT NOT NULL,
    hint TEXT NOT NULL,
    explanation TEXT NOT NULL,
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

CREATE TABLE user_headline (
    id VARCHAR(6) PRIMARY KEY,
    headline TEXT NOT NULL,
    before_blank TEXT NOT NULL,
    after_blank TEXT NOT NULL,
    hint TEXT NOT NULL,
    article_url TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    publish_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

 CREATE TABLE headline_preview (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    headline TEXT NOT NULL,
    before_blank TEXT NOT NULL,
    after_blank TEXT NOT NULL,
    hint TEXT NOT NULL,
    explanation TEXT NOT NULL,
    article_url TEXT NOT NULL,
    reddit_url TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    possible_answers JSON NOT NULL,
    publish_time DATETIME NOT NULL,
    status ENUM('selected', 'final_selection', 'rejected', 'archived') DEFAULT NULL,
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

CREATE TABLE script_execution (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    command TEXT NOT NULL,
    environment VARCHAR(255),
    message TEXT,
    status ENUM('success', 'failed', 'completed_early') NOT NULL,
    INDEX idx_created_date (created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE suggestion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    headline_id INT UNSIGNED NOT NULL,
    suggestion_text TEXT NOT NULL,
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (headline_id) REFERENCES headline(id) ON DELETE CASCADE,
    INDEX idx_headline_id_votes (headline_id, votes DESC),
    UNIQUE INDEX idx_headline_suggestion (headline_id, suggestion_text(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE blocked_words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/

function getDbConnection() {
    static $db = null;
    if ($db === null) {
        $config = require __DIR__ . '/config.php';
        $dbConfig = $config['db'];

        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            $dbConfig['host'],
            $dbConfig['name'],
            $dbConfig['charset']
        );

        $db = new PDO(
            $dsn,
            $dbConfig['user'],
            $dbConfig['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'" // Ensure connection timezone is UTC
            ]
        );
    }
    return $db;
}

function validateHeadlineId($headlineId) {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT id FROM headline WHERE id = ?');
    $stmt->execute([$headlineId]);
    return $stmt->fetch() !== false;
}

function updateHeadlineStats($headlineId, $updates) {
    $db = getDbConnection();

    // Whitelist of allowed fields to update for security
    $allowedFields = [
        'total_plays',
        'total_correct_guesses',
        'total_incorrect_guesses',
        'first_guess_correct_count',
        'article_click_count',
        'reddit_click_count',
        'share_count'
    ];

    // Build the SET clause dynamically based on provided updates
    $setClauses = [];
    $params = [];

    foreach ($updates as $field => $value) {
        if (!in_array($field, $allowedFields)) continue; // Skip non-whitelisted fields
        // Increment by the value
        $setClauses[] = "$field = $field + ?";
        $params[] = $value;
    }

    $sql = "UPDATE headline_stats SET " . implode(', ', $setClauses) . " WHERE headline_id = ?";
    $params[] = $headlineId;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    return $stmt->rowCount() > 0;
}

function getBlockedWords() {
    static $blockedWordsList = null; // Cache within the request

    if ($blockedWordsList === null) {
        $db = getDbConnection();
        $stmt = $db->query('SELECT word FROM blocked_words');
        $words = $stmt->fetchAll(PDO::FETCH_COLUMN);
        // Store/compare words in lowercase for case-insensitive matching
        $blockedWordsList = array_map('strtolower', $words);
    }
    return $blockedWordsList;
}

function updateGuesses($headlineId, $guesses) {
    // Fetch blocked words
    $blockedWords = getBlockedWords();

    // Filter inappropriate guesses
    $filteredGuesses = [];
    foreach ($guesses as $guess) {
        if (!in_array(strtolower(trim($guess)), $blockedWords, true)) {
            $filteredGuesses[] = trim($guess); // Store the trimmed original guess
        }
    }

    // Filter guesses to allow alphanumeric, spaces, apostrophes, dashes, slashes, and periods.
    $filteredGuesses = array_filter($filteredGuesses, function ($word) {
        return preg_match('/^[a-zA-Z0-9\' \-\/\.]+$/', $word);
    });

    // if the filtered guesses are empty, don't do anything
    if (empty($filteredGuesses)) {
        return true;
    }

    $db = getDbConnection();

    // Start a transaction
    $db->beginTransaction();

    try {
        // Build a single INSERT statement with multiple VALUES
        $values = array_fill(0, count($filteredGuesses), "(?, ?, 1)");
        $sql = "INSERT INTO wrong_guess (headline_id, guess_word, guess_count) 
                VALUES " . implode(', ', $values) . "
                ON DUPLICATE KEY UPDATE guess_count = guess_count + 1";

        // Flatten the parameters array
        $params = [];
        foreach ($filteredGuesses as $word) {
            $params[] = $headlineId;
            $params[] = strtolower($word);
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $db->commit();
        return true;
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleGameAction($headlineId, $action, $data = []) {
    $updates = [];

    switch ($action) {
        case 'game_started':
            $updates = ['total_plays' => 1];
            break;

        case 'game_completed':
            // Required data: incorrectGuesses
            if (!isset($data['guesses'])) {
                throw new Exception('Missing required data for game_completed action');
            }

            $updates = [
                'total_correct_guesses' => 1,
                'total_incorrect_guesses' => count($data['guesses']),
                'first_guess_correct_count' => count($data['guesses']) === 0 ? 1 : 0
            ];

            // Update incorrect guesses if any
            if (!empty($data['guesses'])) {
                updateGuesses($headlineId, $data['guesses']);
            }
            break;

        case 'article_clicked':
            $updates = ['article_click_count' => 1];
            break;

        case 'reddit_clicked':
            $updates = ['reddit_click_count' => 1];
            break;

        case 'shared':
            $updates = ['share_count' => 1];
            break;

        default:
            throw new Exception('Invalid action');
    }

    return updateHeadlineStats($headlineId, $updates);
}

/**
 * @param string $created_at may be null to use current time
 */
function insertHeadline(string $headline, string $before_blank, string $after_blank, string $hint, string $article_url, string $reddit_url, string $correct_answer, array $possible_answers, string $publish_time, string $explanation, bool $save_to_preview, ?string $created_at) {
    $possible_answers = array_map('trim', $possible_answers);
    $possible_answers = array_filter($possible_answers); // Remove empty values
    $possible_answers = ['answers' => $possible_answers];

    $db = getDbConnection();

    $table = $save_to_preview ? 'headline_preview' : 'headline';
    $db_cols = ['headline', 'before_blank', 'after_blank', 'hint', 'article_url', 'reddit_url', 'correct_answer', 'possible_answers', 'publish_time', 'explanation'];
    $params = [$headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, json_encode($possible_answers), $publish_time, $explanation];

    if (!$save_to_preview) {
        // Find the highest game number already in the table
        $stmt = $db->prepare("SELECT MAX(game_num) AS max_game_num FROM $table");
        $stmt->execute();
        $max_game_num = $stmt->fetch(PDO::FETCH_ASSOC)['max_game_num'] ?? 0;
        $db_cols[] = 'game_num';
        $params[] = $max_game_num + 1;
    }

    if ($created_at !== null) {
        $db_cols[] = 'created_at';
        $params[] = $created_at;
    }

    $db_cols_str = implode(', ', $db_cols);
    $params_str = implode(', ', array_fill(0, count($db_cols), '?'));

    $stmt = $db->prepare("INSERT INTO $table ($db_cols_str) VALUES ($params_str)");
    $stmt->execute($params);

    $headlineId = $db->lastInsertId();
    echo "Inserted headline\n";

    if (!$save_to_preview) {
        // If not saving to preview, also insert into headline_stats
        $stmt = $db->prepare('INSERT INTO headline_stats (headline_id) VALUES (?)');
        $stmt->execute([$headlineId]);
        echo "Inserted headline stats\n";

        // Add all answers as initial suggestions
        if (!empty($possible_answers['answers'])) {
            $suggestion_values_placeholder = array_fill(0, count($possible_answers['answers']), '(?, ?)');
            $suggestion_params = [];
            foreach ($possible_answers['answers'] as $answer) {
                $suggestion_params[] = $headlineId;
                $suggestion_params[] = $answer;
            }
            $stmt = $db->prepare('INSERT INTO suggestion (headline_id, suggestion_text) VALUES ' . implode(', ', $suggestion_values_placeholder));
            $stmt->execute($suggestion_params);
            echo "Inserted " . count($possible_answers['answers']) . " suggestions\n";
        }

        // Since we just added a headline into the non-preview table, delete anything in the preview table
        $rows_deleted = $db->exec("DELETE FROM headline_preview WHERE status NOT IN ('archived', 'rejected') OR created_at < NOW() - INTERVAL 7 DAY");
        echo "Deleted $rows_deleted preview headlines\n";
    }

    return $headlineId;
}

function getStatus() {
    $db = getDbConnection();
    $query = 'SELECT id, headline, created_at FROM headline ORDER BY id DESC LIMIT 1';
    $stmt = $db->query($query);
    $headline = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$headline) {
        http_response_code(404);
        throw new Exception('No headlines found');
    }


    // Since the DB connection timezone is set to UTC, created_at represents a UTC timestamp.
    // Create DateTime objects in UTC for accurate comparison
    $current_time_utc = new DateTime("now", new DateTimeZone("UTC"));
    $created_time_utc = new DateTime($headline['created_at'], new DateTimeZone("UTC"));

    $seconds_since_last_headline = $current_time_utc->getTimestamp() - $created_time_utc->getTimestamp();

    $result = [
        'latest' => $headline,
        'secondsSinceLastHeadline' => $seconds_since_last_headline
    ];

    return $result;
}

// $previewData - record from headline_preview
function promotePreview($previewData, bool $override_created_at) {
    $db = getDbConnection();

    // Prepare data for insertHeadline function
    $headlineText = $previewData['headline'];
    $beforeBlank = $previewData['before_blank'];
    $afterBlank = $previewData['after_blank'];
    $hint = $previewData['hint'];
    $articleUrl = $previewData['article_url'];
    $redditUrl = $previewData['reddit_url'];
    $correctAnswer = $previewData['correct_answer'];
    $explanation = $previewData['explanation'] ?? '';
    $publishTime = $previewData['publish_time'];
    $created_at_to_insert = null;

    if ($override_created_at) {
        // Set to today at 00:01:00 UTC
        $created_at_to_insert = (new DateTime("today 00:01:00", new DateTimeZone("UTC")))->format('Y-m-d H:i:s');
    }

    $possibleAnswersDecoded = json_decode($previewData['possible_answers'], true);
    $possibleAnswersArray = [];
    if (is_array($possibleAnswersDecoded)) {
        // Use 'answers' key if present, otherwise assume the decoded JSON is the array itself
        $possibleAnswersArray = $possibleAnswersDecoded['answers'] ?? $possibleAnswersDecoded;
    }

    $newHeadlineId = insertHeadline(
        $headlineText,
        $beforeBlank,
        $afterBlank,
        $hint,
        $articleUrl,
        $redditUrl,
        $correctAnswer,
        $possibleAnswersArray,
        $publishTime,
        $explanation,
        false, // save_to_preview = false
        $created_at_to_insert
    );

    if ($newHeadlineId) {
        // If insert was successful, delete records from headline_preview based on age or if it was the one that was promoted
        $stmt = $db->prepare("DELETE FROM headline_preview WHERE created_at < NOW() - INTERVAL 14 DAY OR id = ?");
        $stmt->execute([$previewData['id']]);
        $deletedRowCount = $stmt->rowCount();
        return [
            'newHeadlineId' => $newHeadlineId,
            'deletedPreviewCount' => $deletedRowCount
        ];
    }

    return false;
}

function getUserHeadline($id) {
    $db = getDbConnection();
    $stmt = $db->prepare('SELECT * FROM user_headline WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function createUserHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $correct_answer, $publish_time) {
    $db = getDbConnection();

    // generate 6 character alpha id
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    $id = "";
    for ($i = 0; $i < 6; $i++) {
        $id .= $chars[rand(0, strlen($chars) - 1)];
    }

    $stmt = $db->prepare('INSERT INTO user_headline (id, headline, before_blank, after_blank, hint, article_url, correct_answer, publish_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $headline, $before_blank, $after_blank, $hint, $article_url, $correct_answer, $publish_time]);

    return $id;
}

<?php

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

function insertHeadline(string $headline, string $before_blank, string $after_blank, string $hint, string $article_url, string $reddit_url, string $correct_answer, array $possible_answers, string $publish_time, string $explanation, bool $save_to_preview) {
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

    $db_cols_str = implode(', ', $db_cols);
    $params_str = implode(', ', array_fill(0, count($db_cols), '?'));

    $stmt = $db->prepare("INSERT INTO $table ($db_cols_str) VALUES ($params_str)");
    $stmt->execute($params);

    $headlineId = $db->lastInsertId();
    echo "Inserted headline with ID: $headlineId\n";

    if (!$save_to_preview) {
        // If not saving to preview, also insert into headline_stats
        $stmt = $db->prepare('INSERT INTO headline_stats (headline_id) VALUES (?)');
        $stmt->execute([$headlineId]);
        echo "Inserted headline stats\n";

        // Since we just added a headline into the non-preview table, delete anything in the preview table
        $stmt = $db->prepare('DELETE FROM headline_preview');
        $stmt->execute();
        $rows_deleted = $stmt->rowCount();
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
function promotePreview($previewData) {
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
        false // save_to_preview = false
    );

    if ($newHeadlineId) {
        // If insert was successful, delete all records from headline_preview
        $deleteStmt = $db->prepare('DELETE FROM headline_preview');
        $deleteStmt->execute();
        $deletedRowCount = $deleteStmt->rowCount();

        return [
            'newHeadlineId' => $newHeadlineId,
            'deletedPreviewCount' => $deletedRowCount
        ];
    }

    return false;
}

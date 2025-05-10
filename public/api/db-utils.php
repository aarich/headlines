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
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
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

    // Build the SET clause dynamically based on provided updates
    $setClauses = [];
    $params = [];

    foreach ($updates as $field => $value) {
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

function updateGuesses($headlineId, $guesses) {

    // TODO filter inappropriate guesses

    // if the guesses are empty, don't do anything
    if (empty($guesses)) {
        return true;
    }

    $db = getDbConnection();

    // Start a transaction
    $db->beginTransaction();

    try {
        // Build a single INSERT statement with multiple VALUES
        $values = array_fill(0, count($guesses), "(?, ?, 1)");
        $sql = "INSERT INTO wrong_guess (headline_id, guess_word, guess_count) 
                VALUES " . implode(', ', $values) . "
                ON DUPLICATE KEY UPDATE guess_count = guess_count + 1";

        // Flatten the parameters array
        $params = [];
        foreach ($guesses as $word) {
            $params[] = $headlineId;
            $params[] = $word;
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
            $updates = [
                'total_plays' => 1  // This will increment total_plays by 1
            ];
            break;

        case 'game_completed':
            // Required data: incorrectGuesses
            if (!isset($data['guesses'])) {
                throw new Exception('Missing required data for game_completed action');
            }

            $updates = [
                'total_correct_guesses' => 1,
                'total_incorrect_guesses' => count($data['guesses']),
                'first_guess_correct_count' => count($data['guesses']) === 1 ? 1 : 0
            ];

            // Update incorrect guesses if any
            if (!empty($data['guesses'])) {
                updateGuesses($headlineId, $data['guesses']);
            }
            break;

        case 'article_clicked':
            $updates = [
                'article_click_count' => 1  // Increment article clicks by 1
            ];
            break;

        case 'reddit_clicked':
            $updates = [
                'reddit_click_count' => 1  // Increment reddit clicks by 1
            ];
            break;

        case 'shared':
            $updates = [
                'share_count' => 1  // Increment share count by 1
            ];
            break;

        default:
            throw new Exception('Invalid action');
    }

    return updateHeadlineStats($headlineId, $updates);
}

function insertHeadline(string $headline, string $before_blank, string $after_blank, string $hint, string $article_url, string $reddit_url, string $correct_answer, array $possible_answers, string $publish_time, string $explanation) {
    $db = getDbConnection();
    $stmt = $db->prepare('INSERT INTO headline (headline, before_blank, after_blank, hint, article_url, reddit_url, correct_answer, possible_answers, publish_time, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, json_encode($possible_answers), $publish_time, $explanation]);


    // get the just inserted headline id
    $headlineId = $db->lastInsertId();

    // insert the headline stats
    $stmt = $db->prepare('INSERT INTO headline_stats (headline_id) VALUES (?)');
    $stmt->execute([$headlineId]);
}

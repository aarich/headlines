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
    $db = getDbConnection();
    
    // Start a transaction
    $db->beginTransaction();
    
    try {
        foreach ($guesses as $word => $count) {
            // Try to insert, if duplicate then update the count
            $sql = "INSERT INTO guess (headline_id, guess_word, guess_count) 
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE guess_count = guess_count + 1";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([$headlineId, $word, $count, $count]);
        }
        
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
            // Required data: isCorrect, guessCount, incorrectGuesses
            if (!isset($data['isCorrect']) || !isset($data['guessCount']) || !isset($data['incorrectGuesses'])) {
                throw new Exception('Missing required data for game_completed action');
            }
            
            $updates = [
                'total_correct_guesses' => $data['isCorrect'] ? 1 : 0,  // Increment by 1 if correct
                'total_incorrect_guesses' => $data['isCorrect'] ? 0 : 1,  // Increment by 1 if incorrect
                'first_guess_correct_count' => ($data['isCorrect'] && $data['guessCount'] === 1) ? 1 : 0  // Increment by 1 if first guess was correct
            ];
            
            // Update incorrect guesses if any
            if (!empty($data['incorrectGuesses'])) {
                updateGuesses($headlineId, $data['incorrectGuesses']);
            }
            break;
            
        case 'article_clicked':
            $updates = [
                'article_click_count' => 1  // Increment article clicks by 1
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
<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/api.php';

header('Content-Type: application/json');

$set_response_code = false;

try {
    // Prepare the base query. It loads the last 15 headlines and the stats for each one
    $query = "
        SELECT 
            h.id,
            h.game_num,
            h.created_at,
            h.headline,
            h.before_blank,
            h.after_blank,
            h.article_url,
            h.reddit_url,
            h.correct_answer,
            h.publish_time,
            hs.total_plays,
            hs.total_correct_guesses,
            hs.total_incorrect_guesses,
            hs.first_guess_correct_count,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('word', wg.guess_word, 'count', wg.guess_count))
                FROM wrong_guess wg
                WHERE wg.headline_id = h.id
                ORDER BY wg.guess_count DESC
                LIMIT 20
            ) AS wrong_guesses
        FROM headline h
        LEFT JOIN headline_stats hs ON h.id = hs.headline_id
        ORDER BY h.id desc
        LIMIT 15";
    $stmt = getDbConnection()->query($query);

    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$result) {
        http_response_code(404);
        $set_response_code = true;
        throw new Exception('No headlines found');
    }

    $headlines = [];
    for ($i = 0; $i < count($result); $i++) {
        // Convert all snake case to camel case
        $headline = $result[$i];
        $headline = convertToCamelCase($headline);

        // Decode the wrong guesses JSON
        if (isset($headline['wrongGuesses'])) {
            $headline['wrongGuesses'] = json_decode($headline['wrongGuesses'], true);
        } else {
            $headline['wrongGuesses'] = [];
        }

        $headlines[] = $headline;
    }

    $result = [
        'headlines' => $headlines
    ];

    echo json_encode($result);
} catch (Exception $e) {
    if (!$set_response_code) {
        http_response_code(500);
    }
    echo json_encode(['error' => 'Failed to fetch headlines: ' . $e->getMessage()]);
}

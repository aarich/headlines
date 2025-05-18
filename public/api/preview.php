<?php

require_once 'db-utils.php';
require_once 'auth-utils.php';
$config = require __DIR__ . '/config.php';

header('Content-Type: application/json');

// Perform admin authentication for all methods in this file
requireAdminAuth($config);

/**
 * Validates preview input data.
 * @param array $input The raw input data.
 * @param array $allowedFields List of database field names expected.
 * @param bool $isCreate True if validating for a new record (all fields mandatory except status).
 * @return array Validated and processed data.
 * @throws Exception If validation fails.
 */
function validateAndProcessPreviewInput(array $input, array $allowedFields, bool $isCreate = false): array {
    $processedData = [];
    $statusValue = null; // For special handling

    foreach ($allowedFields as $dbField) {
        $camelCaseField = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $dbField))));

        if ($isCreate && $dbField === 'status') { // Status is not required for creation, defaults to null
            $processedData[$dbField] = null;
            $statusValue = null;
            continue;
        }

        if (!array_key_exists($camelCaseField, $input)) {
            http_response_code(400);
            throw new Exception("Missing required field in input: $camelCaseField");
        }
        $value = $input[$camelCaseField];

        // Type validations
        if (in_array($dbField, ['headline', 'article_url', 'reddit_url', 'correct_answer', 'publish_time', 'hint'])) {
            if (empty($value) || !is_string($value)) {
                http_response_code(400);
                throw new Exception("Field '$camelCaseField' must be a non-empty string.");
            }
        } elseif ($dbField === 'possible_answers') {
            if (!is_array($value)) {
                http_response_code(400);
                throw new Exception("Field '$camelCaseField' must be an array.");
            }
        } elseif ($dbField === 'status') {
            if ($value !== null && !in_array($value, ['selected', 'final_selection', 'rejected'])) {
                http_response_code(400);
                throw new Exception("Invalid status value for '$camelCaseField'. Must be 'selected', 'final_selection', or null.");
            }
            $statusValue = $value;
        } elseif ($dbField === 'publish_time') {
            // Basic validation for datetime format, MySQL is quite flexible
            // YYYY-MM-DD HH:MM:SS or YYYY-MM-DDTHH:MM
            if (!preg_match('/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/', $value)) {
                // http_response_code(400); // Commenting out for now, as MySQL is flexible. Non-empty string check above might be enough.
                // throw new Exception("Field '$camelCaseField' must be a valid datetime string (e.g., YYYY-MM-DDTHH:MM).");
            }
            $statusValue = $value;
        }
        // Store the validated (and potentially transformed) value
        if ($dbField === 'possible_answers') {
            $processedData[$dbField] = json_encode(['answers' => $value]);
        } else {
            $processedData[$dbField] = $value;
        }
    }
    $processedData['status_for_logic'] = $statusValue; // Keep original status for logic if needed
    return $processedData;
}

/**
 * Derives before_blank and after_blank fields.
 * @param string $headline
 * @param string $correctAnswer
 * @return array Associative array with 'before_blank' and 'after_blank'.
 * @throws Exception If correct answer not found in headline.
 */
function deriveBlankFields(string $headline, string $correctAnswer): array {
    $position = strpos($headline, $correctAnswer);
    if ($position === false) {
        http_response_code(400);
        throw new Exception("Correct answer '$correctAnswer' not found within the headline '$headline'. Cannot derive before/after blank parts.");
    }
    return [
        'before_blank' => substr($headline, 0, $position),
        'after_blank' => substr($headline, $position + strlen($correctAnswer))
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // Query the headline_preview table and return a list of the results.
        $stmt = $db->query('SELECT * FROM headline_preview ORDER BY id DESC');
        $previews = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$previews) {
            echo json_encode([]);
            exit;
        }

        $result = [];
        foreach ($previews as $preview_row) {
            // Decode JSON fields
            if (isset($preview_row['possible_answers'])) {
                $decodedPossibleAnswers = json_decode($preview_row['possible_answers'], true);
                // Store the array of answers, defaulting to an empty array if parsing fails or key missing
                $preview_row['possible_answers'] = $decodedPossibleAnswers['answers'] ?? $decodedPossibleAnswers ?? [];
            }

            // Convert all snake_case keys to camelCase
            $camelCasePreview = [];
            foreach ($preview_row as $key => $value) {
                $camelCaseKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
                $camelCasePreview[$camelCaseKey] = $value;
            }
            $result[] = $camelCasePreview;
        }

        echo json_encode($result);
    } elseif ($method === 'POST') {
        // Creates a new preview headline.
        $input = json_decode(file_get_contents('php://input'), true);

        $requiredFieldsForCreate = [
            'headline',
            'hint',
            'article_url',
            'reddit_url',
            'correct_answer',
            'possible_answers',
            'publish_time'
        ];

        $processedInput = validateAndProcessPreviewInput($input, $requiredFieldsForCreate, true);
        $blankFields = deriveBlankFields($processedInput['headline'], $processedInput['correct_answer']);

        $sql = 'INSERT INTO headline_preview (
                    headline, hint, article_url, reddit_url,
                    correct_answer, possible_answers,
                    before_blank, after_blank, publish_time, explanation
                ) VALUES (
                    :headline, :hint, :article_url, :reddit_url,
                    :correct_answer, :possible_answers,
                    :before_blank, :after_blank, :publish_time, :explanation
                )';

        // Ensure publish_time is formatted correctly for MySQL if needed, though 'YYYY-MM-DDTHH:MM' from datetime-local is usually fine.
        // MySQL DATETIME format is 'YYYY-MM-DD HH:MM:SS'. We can replace 'T' with a space.
        $params = [
            ':headline' => $processedInput['headline'],
            ':hint' => $processedInput['hint'],
            ':article_url' => $processedInput['article_url'],
            ':reddit_url' => $processedInput['reddit_url'],
            ':correct_answer' => $processedInput['correct_answer'],
            ':possible_answers' => $processedInput['possible_answers'], // Already JSON encoded
            ':before_blank' => $blankFields['before_blank'],
            ':after_blank' => $blankFields['after_blank'],
            ':publish_time' => str_replace('T', ' ', $processedInput['publish_time']),
            ':explanation' => 'Manual Entry'
        ];

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $newId = $db->lastInsertId();

        if ($newId) {
            http_response_code(201); // Created
            echo json_encode(['message' => 'Successfully created preview headline.', 'id' => (int)$newId]);
        } else {
            http_response_code(500);
            throw new Exception('Failed to create preview headline, no ID returned.');
        }
    } elseif ($method === 'DELETE') {
        // Check if an ID is provided for deleting a single preview
        $input = json_decode(file_get_contents('php://input'), true);
        $previewId = $input['id'] ?? $_GET['id'] ?? null;

        if ($previewId) {
            $previewId = (int)$previewId;
            // Delete a single row from headline_preview
            $stmt = $db->prepare('DELETE FROM headline_preview WHERE id = ?');
            $stmt->execute([$previewId]);
            $rowCount = $stmt->rowCount();

            if ($rowCount > 0) {
                echo json_encode(['message' => "Successfully deleted preview."]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => "Preview headline not found."]);
            }
        } else {
            // Deletes all rows from the headline_preview table.
            $stmt = $db->prepare('DELETE FROM headline_preview');
            $stmt->execute();
            $rowCount = $stmt->rowCount();
            echo json_encode(['message' => "Successfully deleted $rowCount row(s) from headline_preview."]);
        }
    } elseif ($method === 'PATCH') {
        // Accepts parameters: id (of a preview headline) and editable fields:
        // headline, hint, articleUrl, redditUrl, correctAnswer, possibleAnswers.
        // If status is set to anything other than rejected, it ensures no other record is set with any status

        $input = json_decode(file_get_contents('php://input'), true);
        $previewId = $input['id'] ?? null;

        if (!$previewId) {
            http_response_code(400);
            throw new Exception('Preview ID is required for updating status.');
        }
        $previewId = (int)$previewId;

        $allowedFields = [
            'headline',
            'hint',
            'article_url',
            'reddit_url',
            'correct_answer',
            'possible_answers',
            'status',
            'publish_time'
        ];

        $processedInput = validateAndProcessPreviewInput($input, $allowedFields, false);
        $blankFields = deriveBlankFields($processedInput['headline'], $processedInput['correct_answer']);
        $statusUpdateValue = $processedInput['status_for_logic']; // Get the original status for logic

        $sql = 'UPDATE headline_preview SET 
                    headline = :headline, 
                    hint = :hint, 
                    article_url = :article_url, 
                    reddit_url = :reddit_url, 
                    correct_answer = :correct_answer, 
                    possible_answers = :possible_answers, 
                    status = :status, 
                    before_blank = :before_blank, 
                    after_blank = :after_blank,
                    publish_time = :publish_time
                WHERE id = :id';

        // Prepare parameters for the execute call, ensuring keys match placeholders
        $queryParams = [
            ':headline' => $processedInput['headline'],
            ':hint' => $processedInput['hint'],
            ':article_url' => $processedInput['article_url'],
            ':reddit_url' => $processedInput['reddit_url'],
            ':correct_answer' => $processedInput['correct_answer'],
            ':possible_answers' => $processedInput['possible_answers'],
            ':status' => ($statusUpdateValue === null) ? null : $statusUpdateValue,
            ':before_blank' => $blankFields['before_blank'],
            ':after_blank' => $blankFields['after_blank'],
            ':id' => $previewId,
            ':publish_time' => str_replace('T', ' ', $processedInput['publish_time'])
        ];

        $db->beginTransaction();
        try {
            // Handle status update logic (ensuring only one has a status)
            if ($statusUpdateValue && $statusUpdateValue !== 'rejected') {
                $stmtClear = $db->prepare("UPDATE headline_preview SET status = NULL WHERE status IS NOT NULL AND status != 'rejected' AND id != ?");
                $stmtClear->execute([$previewId]);
            }

            $stmtSet = $db->prepare($sql);
            $stmtSet->execute($queryParams);
            $rowCount = $stmtSet->rowCount();

            $db->commit();

            if ($rowCount > 0) {
                echo json_encode(['message' => "Successfully updated preview headline."]);
            } else {
                // Check if the record exists (already done above, $currentData would be false)
                echo json_encode(['message' => "Preview headline was not changed (values might be the same or record not found)."]);
            }
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    } else {
        http_response_code(405); // Method Not Allowed
        throw new Exception('Unsupported request method. Only GET, POST, PATCH, DELETE are allowed.');
    }
} catch (Exception $e) {
    if (http_response_code() === 200) { // If no HTTP error code has been set by a throw before
        http_response_code(500); // Default to 500 Internal Server Error
    }
    echo json_encode(['error' => $e->getMessage()]);
}

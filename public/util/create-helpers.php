<?php

require_once __DIR__ . '/../util/db.php';
/**
 * Extracts plain text content primarily from the <body> of an HTML string.
 * It attempts to isolate the <body> content, then removes <script> and <style>
 * tags and their content, followed by all other HTML tags.
 * Whitespace is normalized. If no <body> tag is found, an empty string is returned.
 *
 * @param string $html The HTML string.
 * @return string The extracted plain text from the body, or an empty string.
 */
function extract_text_from_html(string $html): string {
  // Remove <script> and <style> tags and their entire content from the extracted body
  $body_content = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
  $body_content = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $body_content);

  // Remove any remaining HTML tags from the processed body content
  $text = strip_tags($body_content);

  // Replace multiple whitespace characters (including newlines) with a single space
  $text = preg_replace('/\s+/', ' ', $text);

  // Trim leading/trailing spaces
  return trim($text);
}

/**
 * Recursively cleans string values within an array or object.
 * Replaces multiple whitespace characters (spaces, tabs, newlines) with a single space,
 * and trims leading/trailing whitespace from strings.
 *
 * @param mixed $item The item to clean (array, object, or scalar).
 */
function clean_string_values_recursive(&$item) {
  if (is_string($item)) {
    // Replace sequences of whitespace characters (including \n, \t, etc.) with a single space
    $item = preg_replace('/\s+/', ' ', $item);
    // Trim leading/trailing spaces that might have been created or were already there
    $item = trim($item);
  } elseif (is_array($item)) {
    foreach ($item as &$value) {
      clean_string_values_recursive($value);
    }
    unset($value); // Important to unset the reference
  } elseif (is_object($item)) {
    foreach ($item as &$value) {
      clean_string_values_recursive($value);
    }
    unset($value); // Important to unset the reference
  }
}

function convert_smart_quotes($string) {

  $search = array('’', '‘', '“', '”',);

  $replace = array("'", "'", '"', '"',);
  return str_replace($search, $replace, $string);
}

// function getRedditToken($user_agent, $code) {
//   $ch = curl_init('https://www.reddit.com/api/v1/access_token');
//   curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
//   curl_setopt($ch, CURLOPT_HTTPHEADER, [
//     'User-Agent: ' . $user_agent
//   ]);

//   curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
//     'grant_type' => 'authorization_code',
//     'code' => $code,
//     'redirect_uri' => 'http://localhost:3000/profile'
//   ]));

//   curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
//   curl_setopt($ch, CURLOPT_USERPWD, getenv('REDDIT_CLIENT_ID') . ':' . getenv('REDDIT_CLIENT_SECRET'));


//   $response = curl_exec($ch);
// }

function getTopPosts($subreddit, $user_agent, $client_id, $client_secret) {
  $ch = curl_init("https://oauth.reddit.com/r/{$subreddit}/top.json?limit=25&t=day");
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: ' . $user_agent
  ]);
  curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
  curl_setopt($ch, CURLOPT_USERPWD, $client_id . ':' . $client_secret);

  $response = curl_exec($ch);

  if (curl_errno($ch)) {
    throw new Exception('Curl error: ' . curl_error($ch));
  }

  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($httpCode !== 200) {
    $responseText = extract_text_from_html($response);
    throw new Exception('HTTP error: ' . $httpCode . ' Response: ' . $responseText);
  }

  curl_close($ch);

  $data = json_decode($response, true);

  // Check for JSON decode errors
  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception('JSON decode error: ' . json_last_error_msg());
  }

  return $data;
}

function invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $model_name) {
  echo "invoking google prompt using $model_name\n";
  echo $prompt . "\n";
  $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model_name}:generateContent?key={$gemini_api_key}";
  $payload = json_encode([
    'contents' => [
      [
        'parts' => [['text' => $prompt]],
      ],
    ],
    'generationConfig' => $generationConfig
  ]);

  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

  $response = curl_exec($ch);

  // Check for cURL errors
  if (curl_errno($ch)) {
    throw new Exception('Curl error: ' . curl_error($ch));
  }

  // Get HTTP status code
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($httpCode !== 200) {
    $responseText = extract_text_from_html($response);
    throw new Exception('HTTP error: ' . $httpCode . ' Response: ' . $responseText);
  }

  curl_close($ch);

  $data = json_decode($response, true);

  // Check for JSON decode errors
  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception('JSON decode error: ' . json_last_error_msg());
  }

  return $data;
}

/**
 * Calculates the Levenshtein distance between two strings.
 * This is the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one string into the other.
 * This implementation uses the space-optimized dynamic programming approach.
 *
 * @return int The Levenshtein distance between $s1 and $s2.
 */
function getDifference(string $s1, string $s2): int {
  $m = strlen($s1);
  $n = strlen($s2);

  // $curr_row_dp will store the current row of the DP table.
  // $curr_row_dp[j] will be the edit distance between the first $i characters of $s1
  // and the first $j characters of $s2.
  $curr_row_dp = array_fill(0, $n + 1, 0);

  // Initialize the first row of the DP table.
  // The distance from an empty string s1 to a prefix of s2 is just the length of the prefix.
  for ($j = 0; $j <= $n; $j++) {
    $curr_row_dp[$j] = $j;
  }

  // Iterate through each character of s1 (rows of the DP table).
  for ($i = 1; $i <= $m; $i++) {
    // $prev_val_dp_diag stores dp[i-1][j-1] (cost from diagonal).
    // Before starting row i, $curr_row_dp[0] is dp[i-1][0].
    $prev_val_dp_diag = $curr_row_dp[0];

    // Cost of transforming s1[0...i-1] to an empty string s2 is $i (i deletions).
    // This is dp[i][0].
    $curr_row_dp[0] = $i;

    // Iterate through each character of s2 (columns of the DP table).
    for ($j = 1; $j <= $n; $j++) {
      // $temp_dp_up stores dp[i-1][j] (cost from cell directly above).
      $temp_dp_up = $curr_row_dp[$j];

      if ($s1[$i - 1] == $s2[$j - 1]) {
        $curr_row_dp[$j] = $prev_val_dp_diag;
      } else {
        $curr_row_dp[$j] = 1 + min($curr_row_dp[$j - 1], $prev_val_dp_diag, $temp_dp_up);
      }
      $prev_val_dp_diag = $temp_dp_up;
    }
  }
  return $curr_row_dp[$n];
}

function findMostSimilarHeadline($title, $headlines_full) {
  $minDifference = 0;
  $mostSimilarHeadline = null;

  foreach ($headlines_full as $headline) {
    $difference = getDifference($title, $headline['headline']);
    if ($mostSimilarHeadline === null || $difference < $minDifference) {
      $minDifference = $difference;
      $mostSimilarHeadline = $headline;
    }
  }

  // If the difference is large, return null. We probably just didn't find the headline.
  if ($minDifference > 10) {
    return null;
  }


  return $mostSimilarHeadline;
}

function getInput($prompt) {
  echo "$prompt: ";
  $handle = fopen("php://stdin", "r");
  $line = fgets($handle);
  return trim($line);
}

function confirmProceed($message) {
  $line = getInput("$message. Type 'y' to continue");
  return trim($line) === 'y';
}

/**
 * EXITs if headline is not needed and not ignoring failure
 * @param bool $ignore_failure If true continue even if headline is recent.
 */
function checkIfHeadlineIsNeeded(bool $ignore_failure, string $command_to_log_on_exit) {
  $status = getStatus();

  $seconds_since_last_headline = $status['secondsSinceLastHeadline'];
  $hours_since_last_headline = $seconds_since_last_headline / 3600;
  echo "hours since last headline: $hours_since_last_headline\n";

  if ($hours_since_last_headline < 23) {
    $log_message = "*** Headline is recent (" . round($hours_since_last_headline, 2) . " hours old). ***";
    echo $log_message . "\n";

    if ($ignore_failure) {
      echo " ---> Requesting to ignore failure. Proceeding anyway\n\n";
    } else {
      echo " ---> Exiting. No need to generate a new headline.\n";
      log_script_execution($command_to_log_on_exit, 'completed_early', $log_message);

      exit(0);
    }
  }
}

/**
 * Finds a whole word (case-insensitive) in a headline, derives the parts before and after it,
 * and returns the exact matched segment (trimmed) as the correct answer.
 *
 * @param string $headline The full headline text.
 * @param string $word_to_find The word to search for within the headline.
 * @return array An associative array with 'before_blank', 'after_blank', and 'actual_correct_answer'.
 * @throws Exception If the word is not found as a whole word in the headline.
 */
function derive_before_after_and_correct_answer(string $headline, string $word_to_find, bool $must_be_whole_word): array {
  if (!$must_be_whole_word) {
    $pattern = '/' . preg_quote($word_to_find, '/') . '/i';
  } else {
    // The pattern uses \b for word boundaries. preg_quote escapes special regex characters in the word itself.
    // Case-insensitive match.
    $pattern = '/\b' . preg_quote($word_to_find, '/') . '\b/i';
  }

  if (preg_match($pattern, $headline, $matches, PREG_OFFSET_CAPTURE)) {
    $matched_segment_in_headline = $matches[0][0];
    $offset_in_headline = $matches[0][1];

    $actual_correct_answer = trim($matched_segment_in_headline, "\"'.,!?()[]{}<>");

    $before_blank = substr($headline, 0, $offset_in_headline);
    $after_blank = substr($headline, $offset_in_headline + strlen($matched_segment_in_headline));

    return [
      'before_blank' => $before_blank,
      'after_blank' => $after_blank,
      'actual_correct_answer' => $actual_correct_answer
    ];
  } else {
    throw new Exception(
      "The word '{$word_to_find}' (as a whole word) could not be found in the headline '{$headline}'."
    );
  }
}

/**
 * Logs script execution details to the database.
 *
 * @param string $command The command that was executed.
 * @param string $status The status of the execution ('success', 'failed', 'completed_early').
 * @param string $message Optional message (e.g., error message or success details).
 */
function log_script_execution(string $command, string $status, string $message = ''): void {
  try {
    $db = getDbConnection();
    $environment = php_uname('n'); // Gets the host name
    $stmt = $db->prepare(
      'INSERT INTO script_execution (command, environment, status, message) VALUES (:command, :environment, :status, :message)'
    );
    $stmt->execute([':command' => $command, ':environment' => $environment, ':status' => $status, ':message' => $message]);
  } catch (Exception $e) {
    error_log("Failed to log script execution to DB. Command: $command, Status: $status, Error: " . $e->getMessage());
  }
}

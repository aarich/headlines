<?php

require_once 'db-utils.php';
require_once 'prompts.php';

$config = require __DIR__ . '/config.php';
$reddit_user_agent = $config['reddit']['user_agent'];
$reddit_client_id = $config['reddit']['client_id'];
$reddit_client_secret = $config['reddit']['client_secret'];
$gemini_api_key = $config['google']['api_key'];

// Subreddit to fetch posts from
$subreddit = 'nottheonion';

// Function to fetch top posts
function getTopPosts($subreddit, $user_agent, $client_id, $client_secret) {
  // $ch = curl_init("https://www.reddit.com/api/v1/access_token");
  // curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  // curl_setopt($ch, CURLOPT_POST, true);
  // curl_setopt($ch, CURLOPT_USERPWD, $client_id . ":" . $client_secret);
  // curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
  // curl_setopt($ch, CURLOPT_HTTPHEADER, [
  //   'Content-Type: application/x-www-form-urlencoded'
  // ]);

  // $response = curl_exec($ch);

  // if (curl_errno($ch)) {
  //   throw new Exception('Curl error getting access token: ' . curl_error($ch));
  // }

  // $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  // if ($httpCode !== 200) {
  //   throw new Exception('HTTP error getting access token: ' . $httpCode);
  // }

  // curl_close($ch);

  // $tokenData = json_decode($response, true);
  // if (json_last_error() !== JSON_ERROR_NONE) {
  //   throw new Exception('JSON decode error getting access token: ' . json_last_error_msg());
  // }

  // $access_token = $tokenData['access_token'];
  $ch = curl_init("https://www.reddit.com/r/{$subreddit}/top.json?limit=25&t=day");
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: ' . $user_agent
    // 'Authorization: Bearer ' . $access_token
  ]);

  $response = curl_exec($ch);

  // Check for cURL errors
  if (curl_errno($ch)) {
    throw new Exception('Curl error: ' . curl_error($ch));
  }

  // Get HTTP status code
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($httpCode !== 200) {
    throw new Exception('HTTP error: ' . $httpCode);
  }

  curl_close($ch);

  $data = json_decode($response, true);

  // Check for JSON decode errors
  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception('JSON decode error: ' . json_last_error_msg());
  }

  return $data;
}

function invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key) {
  echo "invoking google prompt\n";
  echo "prompt: " . $prompt . "\n";
  echo "generationConfig: " . json_encode($generationConfig) . "\n";
  $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key={$gemini_api_key}";
  // $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$gemini_api_key}";
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
    $data = json_decode($response, true);
    echo print_r($data, true);
    throw new Exception('HTTP error: ' . $httpCode);
  }

  curl_close($ch);

  $data = json_decode($response, true);

  // Check for JSON decode errors
  if (json_last_error() !== JSON_ERROR_NONE) {
    throw new Exception('JSON decode error: ' . json_last_error_msg());
  }

  return $data;
}

// Main execution
try {
  // first check if we are actually missing a headline
  $status = getStatus();
  if (!$status['missing']) {
    echo "No missing headlines\n";
    exit(0);
  }

  // Fetch top posts
  $posts = getTopPosts($subreddit, $reddit_user_agent, $reddit_client_id, $reddit_client_secret);

  $headlines_brief = [];
  $headlines_full = [];
  foreach ($posts['data']['children'] as $post) {
    $title = $post['data']['title'];
    $url = $post['data']['url'];
    $score = $post['data']['score'];
    $reddit_url = "https://www.reddit.com" . $post['data']['permalink'];
    $created_utc = $post['data']['created_utc'];
    $headlines_brief[] = [
      'title' => $title,
      'score' => $score,
    ];

    $headlines_full[] = [
      'headline' => $title,
      'url' => $url,
      'reddit_url' => $reddit_url,
      'created_utc' => $created_utc,
    ];
  }

  echo "headlines_brief: " . print_r($headlines_brief, true) . "\n";
  echo "headlines_full: " . print_r($headlines_full, true) . "\n";

  $prompt = getInitialPrompt($headlines_brief);

  $generationConfig = getInitialGenerationConfig();

  $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key);

  echo "response: " . print_r($response, true) . "\n";

  $options_by_google = $response['candidates'][0]['content']['parts'][0]['text'];

  // remove newlines and then reformat the json
  $options_by_google = str_replace("\n", "", $options_by_google);
  $options_by_google = json_decode($options_by_google, true);
  $options_by_google = json_encode($options_by_google);

  $prompt = getFinalPrompt($options_by_google, $headlines_full);
  $generationConfig = getFinalGenerationConfig();
  $final_choice = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key);

  echo "final choice\n: " . print_r($final_choice, true) . "\n";

  $final_choice_data = json_decode($final_choice['candidates'][0]['content']['parts'][0]['text'], true);

  echo "final choice data\n: " . print_r($final_choice_data, true) . "\n";

  $headline = $final_choice_data['headline'];
  $article_url = $final_choice_data['article_url'];
  $reddit_url = $final_choice_data['reddit_url'];
  $correct_answer = $final_choice_data['word_to_remove'];
  $possible_answers = $final_choice_data['replacements'];
  $publish_time = $final_choice_data['created_utc'];
  $hint = $final_choice_data['hint'];
  $explanation = $final_choice_data['explanation'];

  // convert publish_time to a date
  $publish_time = date('Y-m-d H:i:s', $publish_time);
  // add utc to the publish_time
  $publish_time = $publish_time . ' UTC';

  // split the headline into before_blank and after_blank
  $parts = explode($correct_answer, $headline);
  $before_blank = $parts[0];
  $after_blank = $parts[1];
  $possible_answers = ['answers' => $possible_answers];

  insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation);
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}

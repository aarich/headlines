<?php

require_once 'db-utils.php';
require_once 'prompts.php';
require_once 'daily-helpers.php';

$config = require __DIR__ . '/config.php';
$reddit_user_agent = $config['reddit']['user_agent'];
$gemini_api_key = $config['google']['api_key'];

try {
  // Check if we are actually missing a headline
  $status = getStatus();
  if (!$status['missing']) {
    echo "No missing headlines\n";
    exit(0);
  }

  // Fetch top posts from Reddit
  $posts = getTopPosts('nottheonion', $reddit_user_agent);

  $headline_titles = [];
  $headlines_full = [];
  foreach ($posts['data']['children'] as $post) {
    $title = convert_smart_quotes($post['data']['title']);
    $url = $post['data']['url'];
    $reddit_url = "https://www.reddit.com" . $post['data']['permalink'];
    $created_utc = $post['data']['created_utc'];
    $headline_titles[] = $title;

    $headlines_full[] = [
      'headline' => $title,
      'url' => $url,
      'reddit_url' => $reddit_url,
      'created_utc' => $created_utc,
    ];
  }

  echo "headlines: \n" . print_r($headline_titles, true) . "\n";

  // Get initial candidates
  $prompt = getInitialPrompt($headline_titles);
  $generationConfig = getInitialGenerationConfig();
  $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key);

  $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
  echo "Initial candidate response:\n" . $generated_text . "\n";

  // Choose the best candidate
  $prompt = getFinalPrompt($generated_text);
  $generationConfig = getFinalGenerationConfig();
  $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key);

  $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
  echo "Final choice response:\n" . $generated_text . "\n";
  $final_choice_data = json_decode($generated_text, true);

  // Extract data from the LLM response
  $headline = $final_choice_data['headline'];
  $correct_answer = $final_choice_data['word_to_remove'];
  $possible_answers = $final_choice_data['replacements'];
  $hint = $final_choice_data['hint'];
  $explanation = $final_choice_data['explanation'];

  // Match with original data from Reddit and extract additional info
  $matched_headline = findMostSimilarHeadline($headline, $headlines_full);
  $headline = $matched_headline['headline'];
  $article_url = $matched_headline['url'];
  $reddit_url = $matched_headline['reddit_url'];
  $publish_time = gmdate('Y-m-d H:i:s', $matched_headline['created_utc']);

  // Ensure the case of correct_answer is consistent with the headline
  $correct_answer_lower = strtolower($correct_answer);
  $headline_lower = strtolower($headline);
  $index_of_answer = strpos($headline_lower, $correct_answer_lower);
  $correct_answer = substr($headline, $index_of_answer, strlen($correct_answer));

  // split the headline into before_blank and after_blank
  $parts = explode($correct_answer, $headline, 2);
  $before_blank = $parts[0];
  $after_blank = $parts[1];
  $possible_answers = ['answers' => $possible_answers];

  insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation);
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}

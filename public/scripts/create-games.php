<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/create-helpers.php';
require_once 'prompts.php';

$config = require __DIR__ . '/../util/config.php';
$reddit_user_agent = $config['reddit']['user_agent'];
$gemini_api_key = $config['google']['api_key'];

// Parse command-line arguments
$short_opts = "y";
$long_opts = [
  "model:",
  "ignore-patterns:", // Comma-separated list of strings to ignore in headlines
  "dry-run",
  "skip-status",
  "preview",
  "interactive"
];
$cli_options = getopt($short_opts, $long_opts);

$gpt_model_name = $cli_options['model'] ?? 'gemini-2.5-pro-preview-03-25'; // gemini-2.5-flash-preview-04-17 gemini-2.5-pro-preview-03-25 gemini-2.5-pro-exp-03-25
$ignore_patterns = [];
if (isset($cli_options['ignore-patterns'])) {
  $ignore_patterns =  explode(',', $cli_options['ignore-patterns']);
}

echo "Ignore patterns: " . implode(", ", $ignore_patterns) . "\n";
$dry_run = isset($cli_options['dry-run']);
$skip_age_verification = isset($cli_options['skip-status']);
$auto_confirm = isset($cli_options['y']);
$interactive = isset($cli_options['interactive']);
$save_to_preview = isset($cli_options['preview']);

$command_name = basename(__FILE__) . ' ' . implode(' ', array_slice($argv, 1));

try {
  checkIfHeadlineIsNeeded($skip_age_verification, $command_name);

  $db = getDbConnection();

  $stmt = $db->query('SELECT headline, status FROM headline_preview');
  $all_previews = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $already_proposed_headline_texts = [];
  foreach ($all_previews as $preview_item) {
    if ($save_to_preview && $preview_item['status'] === 'final_selection') {
      $log_message = "Found an already finalized preview: " . $preview_item['headline'];
      echo "*** $log_message ***\n";
      log_script_execution($command_name, 'completed_early', $log_message);
      exit(0);
    }

    $already_proposed_headline_texts[] = $preview_item['headline'];
  }

  echo count($already_proposed_headline_texts) . " existing headlines found. They will be skipped.\n";

  // Load recent headlines to ensure we don't re-post them
  $stmt = $db->query('SELECT headline FROM headline ORDER BY id DESC LIMIT 10');
  $previous_headlines = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $already_posted_headline_texts = [];
  foreach ($previous_headlines as $headline_item) {
    $already_posted_headline_texts[] = $headline_item['headline'];
  }

  // Fetch top posts from Reddit
  $posts = getTopPosts('nottheonion', $reddit_user_agent);

  // Extract titles and URLs from the posts
  $headline_titles = [];
  $headlines_full = [];
  foreach ($posts['data']['children'] as $post) {
    $title = convert_smart_quotes($post['data']['title']);

    // Ignore this one if it matches an already proposed headline
    if (!$interactive && in_array($title, $already_proposed_headline_texts, true)) {
      echo "Skipping (already proposed): $title\n";
      continue;
    }

    // Ignore this one if it matches an already posted headline 
    if (in_array($title, $already_posted_headline_texts, true)) {
      echo "Skipping (already posted): $title\n";
      continue;
    }

    // Ignore this one if it contains any of the strings in ignore_patterns.
    $should_ignore = false;
    foreach ($ignore_patterns as $pattern) {
      if (strpos($title, $pattern) !== false) {
        $should_ignore = true;
        break;
      }
    }

    if ($should_ignore) {
      continue;
    }


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

  // Exit if there were no posts
  if (empty($headline_titles)) {
    $log_message = "No posts found. Exiting";
    echo $log_message . "\n";
    log_script_execution($command_name, 'completed_early', $log_message);
    exit();
  }

  // Exit if we already have gone through half of the top posts
  $num_proposed = count($already_proposed_headline_texts);
  if ($num_proposed > 5 && count($headline_titles) < 5) {
    $log_message = "Already proposed " . $num_proposed . " headlines with " . count($headline_titles) . " remaining. Exiting";
    echo $log_message . "\n";
    log_script_execution($command_name, 'completed_early', $log_message);
    exit();
  }

  $selected_headline_data = null;
  $word_to_remove = null;
  $possible_answers = [];
  $hint = null;
  $explanation = null;

  if ($interactive) {
    echo "Available Headlines:\n";
    foreach ($headlines_full as $index => $h) {
      echo "[$index] " . $h['headline'] . "\n";
    }

    $selectedIndex = (int)getInput("Enter the index to use");
    $selected_headline_data = $headlines_full[$selectedIndex];
    $explanation = 'Manual Entry';
    echo "\nSelected Headline: " . $selected_headline_data['headline'] . "\n";

    $word_to_remove = getInput("Enter the word to remove");
    $possible_answers_input = getInput("Enter possible answers (comma-separated)");
    $possible_answers = array_map('trim', explode(',', $possible_answers_input));
    $possible_answers = array_filter($possible_answers); // Remove empty strings
    $hint = getInput("Enter a hint");
  } else {
    // Get initial candidates
    $prompt = getInitialPrompt($headline_titles);
    $generationConfig = getInitialGenerationConfig($headline_titles);
    $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $gpt_model_name);

    $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
    echo "Initial candidate response:\n" . $generated_text . "\n";

    // Choose the best candidate
    $prompt = getFinalPrompt($generated_text);
    $generationConfig = getFinalGenerationConfig();
    $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $gpt_model_name);

    $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
    echo "Final choice response:\n" . $generated_text . "\n";
    $final_choice_data = json_decode($generated_text, true);

    // Extract data from the LLM response
    $headline_text = $final_choice_data['headline'];
    $word_to_remove = $final_choice_data['word_to_remove'];
    $possible_answers = $final_choice_data['replacements'];
    $hint = $final_choice_data['hint'];
    $explanation = $final_choice_data['explanation'];

    // Match LLM headline with original data from Reddit to get the definitive headline and URLs
    $selected_headline_data = findMostSimilarHeadline($headline_text, $headlines_full);
    if ($selected_headline_data === null) {
      throw new Exception("LLM's chosen headline '{$headline_text}' was probably a hallucination. Not found in original list.");
    }
  }

  $headline = $selected_headline_data['headline'];
  $article_url = $selected_headline_data['url'];
  $reddit_url = $selected_headline_data['reddit_url'];
  $publish_time = gmdate('Y-m-d H:i:s', $selected_headline_data['created_utc']);

  try {
    $derived_parts = derive_before_after_and_correct_answer($headline, $word_to_remove);
    $before_blank = $derived_parts['before_blank'];
    $after_blank = $derived_parts['after_blank'];
    $correct_answer = $derived_parts['actual_correct_answer']; // This is the one to store
  } catch (Exception $e) {
    // The helper throws: "The word '{$word_to_find}' (as a whole word) could not be found in the headline '{$headline}'."
    // Add the LLM's original headline context for better debugging.
    throw new Exception(
      "LLM's chosen word_to_remove ('{$word_to_remove}') processing failed. " .
        "Error with final headline ('{$headline}'): " . $e->getMessage()
    );
  }

  echo "Final headline about to be inserted:\n";
  echo "Headline: $headline\n";
  echo "Before blank: $before_blank\n";
  echo "After blank: $after_blank\n";
  echo "Correct answer: $correct_answer\n";
  echo "Possible answers: " . implode(",", $possible_answers) . "\n";
  echo "Hint: $hint\n";
  echo "Article URL: $article_url\n";
  echo "Reddit URL: $reddit_url\n";
  echo "Publish time: $publish_time\n";
  echo "Explanation: $explanation\n";

  $will_save_to_preview = $save_to_preview ? 'yes' : 'no';
  echo "Going to Preview? $will_save_to_preview\n";

  if ($auto_confirm) {
    echo "-y was specified, so not asking for confirmation.\n";
  } else {
    if (!confirmProceed("Would you like to submit this headline?")) {
      $log_message = "User aborted at confirmation prompt.";
      echo $log_message . "\n";
      log_script_execution($command_name, 'completed_early', $log_message);
      exit;
    }
  }

  if ($dry_run) {
    $log_message = "Dry run: Headline not inserted into the database.";
    echo $log_message . "\n";
    log_script_execution($command_name, 'success', $log_message);
  } else {
    insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation, $save_to_preview);
    $log_message = "Headline inserted into the database.";
    echo $log_message . "\n";
    log_script_execution($command_name, 'success', $log_message);
  }
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
  log_script_execution($command_name, 'failed', $e->getMessage());
}

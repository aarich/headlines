<?php

require_once 'db-utils.php';
require_once 'prompts.php';
require_once 'create-helpers.php';

$config = require __DIR__ . '/config.php';
$reddit_user_agent = $config['reddit']['user_agent'];
$gemini_api_key = $config['google']['api_key'];

// Parse command-line arguments
$short_opts = "y";
$long_opts = [
  "model:",      // Requires a value
  "ignore-patterns:",
  "dry-run",
  "skip-status",
  "preview"
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
$save_to_preview = isset($cli_options['preview']);

try {
  checkIfHeadlineIsNeeded($skip_age_verification);

  $db = getDbConnection();
  $already_proposed_headline_texts = [];

  $stmt = $db->query('SELECT headline, status FROM headline_preview');
  $all_previews = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($all_previews as $preview_item) {
    if ($save_to_preview && $preview_item['status'] === 'final_selection') {
      echo "*** Found an already finalized preview ***\n";
      echo $preview_item['headline'];
      exit(0);
    }

    $already_proposed_headline_texts[] = $preview_item['headline'];
  }

  echo count($already_proposed_headline_texts) . " existing headlines found. They will be skipped.\n";

  // Fetch top posts from Reddit
  $posts = getTopPosts('nottheonion', $reddit_user_agent);

  // Extract titles and URLs from the posts
  $headline_titles = [];
  $headlines_full = [];
  foreach ($posts['data']['children'] as $post) {
    $title = convert_smart_quotes($post['data']['title']);

    // Ignore this one if it matches an already proposed headline
    if (in_array($title, $already_proposed_headline_texts, true)) {
      echo "Skipping (already proposed): $title\n";
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
    echo "No posts found. Exiting";
    exit();
  }

  // Get initial candidates
  $prompt = getInitialPrompt($headline_titles);
  $generationConfig = getInitialGenerationConfig();
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
  $llm_headline_text = $final_choice_data['headline'];
  $llm_word_to_remove = $final_choice_data['word_to_remove'];
  $possible_answers = $final_choice_data['replacements'];
  $hint = $final_choice_data['hint'];
  $explanation = $final_choice_data['explanation'];

  // Match LLM headline with original data from Reddit to get the definitive headline and URLs
  $matched_reddit_data = findMostSimilarHeadline($llm_headline_text, $headlines_full);
  if ($matched_reddit_data === null) {
    throw new Exception(
      "LLM's chosen headline '{$llm_headline_text}' was probably a hallucination. Not found in original list."
    );
  }
  $headline = $matched_reddit_data['headline']; // This is the final headline text to be used
  $article_url = $matched_reddit_data['url'];
  $reddit_url = $matched_reddit_data['reddit_url'];
  $publish_time = gmdate('Y-m-d H:i:s', $matched_reddit_data['created_utc']);

  try {
    $derived_parts = derive_before_after_and_correct_answer($headline, $llm_word_to_remove);
    $before_blank = $derived_parts['before_blank'];
    $after_blank = $derived_parts['after_blank'];
    $correct_answer = $derived_parts['actual_correct_answer']; // This is the one to store
  } catch (Exception $e) {
    // The helper throws: "The word '{$word_to_find}' (as a whole word) could not be found in the headline '{$headline}'."
    // Add the LLM's original headline context for better debugging.
    throw new Exception(
      "LLM's chosen word_to_remove ('{$llm_word_to_remove}') processing failed. " .
        "Original LLM headline: '{$llm_headline_text}'. " .
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
    confirmProceed("Would you like to submit this headline?");
  }

  if ($dry_run) {
    echo "Dry run: Headline not inserted into the database.\n";
  } else {
    insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation, $save_to_preview);
    echo "Headline inserted into the database.\n";
  }
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}

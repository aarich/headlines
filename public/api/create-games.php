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
$ignore_patterns = $cli_options['ignore-patterns'] ? explode(',', $cli_options['ignore-patterns']) : [];
echo "Ignore patterns: " . implode(", ", $ignore_patterns) . "\n";
$dry_run = isset($cli_options['dry-run']);
$skip_age_verification = isset($cli_options['skip-status']);
$auto_confirm = isset($cli_options['y']);
$save_to_preview = isset($cli_options['preview']);

try {
  checkIfHeadlineIsNeeded($skip_age_verification);

  if ($save_to_preview) {
    // Check preview table. If one was already selected we can stop generating new candidates
    $db = getDbConnection();
    $stmt = $db->query('SELECT * FROM headline_preview WHERE is_selected = TRUE LIMIT 1');
    $preview = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($preview) {
      echo "*** Found an already selected preview ***\n";
      echo json_encode($preview, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
      exit(0);
    }
  }

  // Fetch top posts from Reddit
  $posts = getTopPosts('nottheonion', $reddit_user_agent);

  $headline_titles = [];
  $headlines_full = [];
  foreach ($posts['data']['children'] as $post) {
    $title = convert_smart_quotes($post['data']['title']);

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

  // If the word to remove has quotes or other punctuation on the outside, remove them so that they remain part of the headline.
  $correct_answer = trim($correct_answer, "\"'.,!?()[]{}<>");

  // split the headline into before_blank and after_blank
  $parts = explode($correct_answer, $headline, 2);
  $before_blank = $parts[0];
  $after_blank = $parts[1];

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

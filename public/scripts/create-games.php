<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/create-helpers.php';
require_once 'prompts.php';

$config = require __DIR__ . '/../util/config.php';
$reddit_user_agent = $config['reddit']['user_agent'];
$reddit_client_id = $config['reddit']['client_id'];
$reddit_client_secret = $config['reddit']['client_secret'];
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

  $posts = getTopPosts('nottheonion', $reddit_user_agent, $reddit_client_id, $reddit_client_secret);

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

  // Exit if we already have gone through many of the top posts
  $num_proposed = count($already_proposed_headline_texts);
  if ($num_proposed > 8 && count($headline_titles) < 3) {
    $log_message = "Already proposed " . $num_proposed . " headlines with " . count($headline_titles) . " remaining. Exiting";
    echo $log_message . "\n";
    log_script_execution($command_name, 'completed_early', $log_message);
    exit();
  }

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

    $headline = $selected_headline_data['headline'];
    $article_url = $selected_headline_data['url'];
    $reddit_url = $selected_headline_data['reddit_url'];
    $publish_time = gmdate('Y-m-d H:i:s', $selected_headline_data['created_utc']);

    try {
      $derived_parts = derive_before_after_and_correct_answer($headline, $word_to_remove);
      $before_blank = $derived_parts['before_blank'];
      $after_blank = $derived_parts['after_blank'];
      $correct_answer = $derived_parts['actual_correct_answer'];
    } catch (Exception $e) {
      throw new Exception(
        "Error processing manually entered word_to_remove ('{$word_to_remove}') for headline ('{$headline}'): " . $e->getMessage()
      );
    }

    echo "Final headline about to be inserted:\n";
    echo "Headline: $headline\n";

    if ($auto_confirm || confirmProceed("Would you like to submit this headline?")) {
      if ($dry_run) {
        $log_message = "Dry run: Headline not inserted into the database.";
        echo $log_message . "\n";
        log_script_execution($command_name, 'success', $log_message);
      } else {
        insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation, $save_to_preview, null);
        $log_message = "Headline inserted into the database.";
        echo $log_message . "\n";
        log_script_execution($command_name, 'success', $log_message);
      }
    } else {
      $log_message = "User aborted at confirmation prompt.";
      echo $log_message . "\n";
      log_script_execution($command_name, 'completed_early', $log_message);
      exit;
    }
  } else { // Non-interactive mode - process multiple headlines
    // Get initial candidates
    $prompt = getInitialPrompt($headline_titles);
    $initial_candidates_to_provide = getInitialGenerationCandidatesToProvide($headline_titles);
    $generationConfig = getInitialGenerationConfig($initial_candidates_to_provide);
    $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $gpt_model_name);
    $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
    echo "Initial candidate response:\n" . $generated_text . "\n";

    // Choose the best candidates
    $num_final_results = min($initial_candidates_to_provide, 4);
    $prompt = getFinalPrompt($num_final_results, $generated_text);
    $generationConfig = getFinalGenerationConfig($num_final_results);
    $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $gpt_model_name);
    $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
    echo "Final choice response:\n" . $generated_text . "\n";

    $parsed_llm_response = json_decode($generated_text, true);
    if (!isset($parsed_llm_response['choices']) || !is_array($parsed_llm_response['choices'])) {
      throw new Exception("LLM response does not contain a 'choices' array or is malformed. Response: " . $generated_text);
    }
    $final_choices_from_llm = $parsed_llm_response['choices'];

    $successfully_inserted_count = 0;
    $processed_headlines_count = 0;

    foreach ($final_choices_from_llm as $index => $choice_item) {
      echo "\nProcessing LLM candidate headline " . ($index + 1) . "/" . count($final_choices_from_llm) . "...\n";
      try {
        $headline_text = $choice_item['headline'];
        $word_to_remove = $choice_item['word_to_remove'];
        $possible_answers = $choice_item['replacements'];
        $hint = $choice_item['hint'];
        $explanation = $choice_item['explanation'] ?? 'N/A';

        $selected_headline_data = findMostSimilarHeadline($headline_text, $headlines_full);
        if ($selected_headline_data === null) {
          echo "Warning: LLM's chosen headline '{$headline_text}' was not found precisely in original list. Skipping this candidate.\n";
          continue;
        }

        $headline = $selected_headline_data['headline'];
        $article_url = $selected_headline_data['url'];
        $reddit_url = $selected_headline_data['reddit_url'];
        $publish_time = gmdate('Y-m-d H:i:s', $selected_headline_data['created_utc']);

        $derived_parts = derive_before_after_and_correct_answer($headline, $word_to_remove);
        $before_blank = $derived_parts['before_blank'];
        $after_blank = $derived_parts['after_blank'];
        $correct_answer = $derived_parts['actual_correct_answer'];

        echo "Details for submission:\n";
        echo "  Headline: $headline\n";
        echo "  Before blank: $before_blank\n";
        echo "  After blank: $after_blank\n";
        echo "  Correct answer: $correct_answer\n";
        echo "  Possible answers: " . implode(", ", $possible_answers) . "\n";
        echo "  Hint: $hint\n";
        echo "  Article URL: $article_url\n";
        echo "  Reddit URL: $reddit_url\n";
        echo "  Publish time: $publish_time\n";
        echo "  Explanation: $explanation\n";
        $will_save_to_preview = $save_to_preview ? 'yes' : 'no';
        echo "  Going to Preview? $will_save_to_preview\n";

        if (!$auto_confirm) {
          if (!confirmProceed("Would you like to submit this headline? (" . ($index + 1) . "/" . count($final_choices_from_llm) . ")")) {
            echo "User aborted for this headline. Skipping.\n";
            continue;
          }
        }

        if (!$dry_run) {
          insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation, $save_to_preview, null);
          echo "Headline inserted into the database.\n";
        } else {
          echo "Dry run: Headline not inserted.\n";
        }
        $successfully_inserted_count++;
        $processed_headlines_count++;
      } catch (Exception $e) {
        echo "Error processing candidate headline ('{$headline_text}'): " . $e->getMessage() . "\n";
        echo "Skipping this candidate.\n";
        continue;
      }
    } // End foreach loop

    if ($dry_run) {
      $log_message = "Dry run: {$successfully_inserted_count} headline(s) were processed and would have been submitted.";
      echo $log_message . "\n";
      log_script_execution($command_name, 'success', $log_message);
    } else {
      if ($successfully_inserted_count > 0) {
        $log_message = "Successfully inserted {$successfully_inserted_count} headline(s) into the database.";
        echo $log_message . "\n";
        log_script_execution($command_name, 'success', $log_message);
      } else {
        $log_message = "No headlines were inserted.";
        if (empty($final_choices_from_llm)) {
          $log_message .= " LLM provided no suitable candidates.";
        } elseif ($processed_headlines_count == 0 && count($final_choices_from_llm) > 0) {
          $log_message .= " All LLM candidates failed early in processing.";
        } else {
          $log_message .= " All processed candidates were skipped or encountered errors before insertion.";
        }
        echo $log_message . "\n";
        log_script_execution($command_name, 'completed_early', $log_message);
      }
    }
  }
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
  log_script_execution($command_name, 'failed', $e->getMessage());
}

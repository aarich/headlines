<?php

require_once __DIR__ . '/../util/db.php';
require_once __DIR__ . '/../util/create-helpers.php';
require_once 'prompts.php';

$config = require __DIR__ . '/../util/config.php';
$gemini_api_key = $config['google']['api_key'];

// Parse command-line arguments
$short_opts = "y";
$long_opts = [
  "model:",
  "dry-run",
  "selected-only"
];
$cli_options = getopt($short_opts, $long_opts);

$gpt_model_name = $cli_options['model'] ?? 'gemini-2.5-pro-preview-03-25'; // gemini-2.5-flash-preview-04-17 gemini-2.5-pro-preview-03-25 gemini-2.5-pro-exp-03-25
$dry_run = isset($cli_options['dry-run']);
$auto_confirm = isset($cli_options['y']);
$selected_only = isset($cli_options['selected-only']);

$command_name = basename(__FILE__) . ' ' . implode(' ', array_slice($argv, 1));

try {
  checkIfHeadlineIsNeeded(false, $command_name);

  // Load everything from the headline_preview table
  $db = getDbConnection();
  $stmt = $db->query('SELECT * FROM headline_preview');
  $previews = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if (empty($previews)) {
    $log_message = "No previews found. Exiting";
    echo $log_message . "\n";
    log_script_execution($command_name, 'completed_early', $log_message);
    exit();
  }

  // If only one exists, just use that
  if (count($previews) === 1) {
    echo "Only one preview found. Promoting it\n";
    echo json_decode($previews[0], JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
    $result = promotePreview($previews[0], true);
    $log_message = "Only one preview found. Promoted. Result: " . ($result ? json_encode($result) : "Failed");
    echo $log_message . "\n";
    log_script_execution($command_name, $result ? 'success' : 'failed', $log_message);
    exit();
  }

  $previews_simplified = [];
  foreach ($previews as $previewData) {
    // If one is selected, just use that. There should only be one with status
    if ($previewData['status'] === 'selected' || $previewData['status'] === 'final_selection') {

      echo "Found a selected preview! Promoting it\n";
      echo json_encode($previewData, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
      $result = promotePreview($previewData, true);
      $log_message = "Found a selected preview. Promoted. Result: " . ($result ? json_encode($result) : "Failed");
      echo $log_message . "\n";
      log_script_execution($command_name, $result ? 'success' : 'failed', $log_message);
      exit();
    }

    $headline = $previewData['headline'];
    $word_to_remove = $previewData['correct_answer'];
    $replacements = json_decode($previewData['possible_answers'], true);
    $hint = $previewData['hint'];

    $previews_simplified[] = [
      'headline' => $headline,
      'word_to_remove' => $word_to_remove,
      'replacements' => $replacements['answers'],
      'hint' => $hint
    ];
  }

  if ($selected_only) {
    $log_message = "No selected previews found and --selected-only was specified. Exiting.";
    echo $log_message . "\n";
    log_script_execution($command_name, 'completed_early', $log_message);
    exit();
  }

  // Check if any are archived. If so, choose the oldest one
  $archived_previews = array_filter($previews, function ($preview) {
    return $preview['status'] === 'archived';
  });

  if (!empty($archived_previews)) {
    // sort archived preview by created date, oldest first
    usort($archived_previews, function ($a, $b) {
      return $a['created_at'] <=> $b['created_at'];
    });

    echo "Found " . count($archived_previews) . " archived previews. Choosing the oldest to promote.\n";
    $matched_preview = $archived_previews[0];
  } else {
    // Choose the best candidate
    $prompt = getChooseFromPreviewsPrompt(json_encode($previews_simplified, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE));
    $generationConfig = getFinalGenerationConfig(1, false);
    $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $gpt_model_name);

    $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
    echo "Final choice response:\n" . $generated_text . "\n";
    $final_choice_data = json_decode($generated_text, true)['choices'][0];

    // Extract data from the LLM response
    $headline = $final_choice_data['headline'];
    $correct_answer = $final_choice_data['word_to_remove'];
    $possible_answers = ['answers' => $final_choice_data['replacements']];
    $hint = $final_choice_data['hint'];

    // Match with original preview data and extract additional info. There could be multiple for the same headline, but we will overwrite the generated values anyway.
    $matched_preview = findMostSimilarHeadline($headline, $previews);

    if ($matched_preview === null) {
      // The LLM likely hallucinated an answer... Just choose the first preview.
      $matched_preview = $previews[0];
    }

    // Overwrite with any edits made
    $matched_preview['correct_answer'] = $correct_answer;
    $matched_preview['possible_answers'] = json_encode($possible_answers);
    $matched_preview['hint'] = $hint;
  }

  echo "Final headline about to be inserted:\n";
  echo json_encode($matched_preview, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
  echo "\n";

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
    $result = promotePreview($matched_preview, true);
    $log_message = "Headline " . ($result ? "inserted into the database. Result: " . json_encode($result) : "insertion failed.");
    echo $log_message . "\n";
    log_script_execution($command_name, $result ? 'success' : 'failed', $log_message);
  }
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
  log_script_execution($command_name, 'failed', $e->getMessage());
}

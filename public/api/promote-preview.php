<?php

require_once 'db-utils.php';
require_once 'prompts.php';
require_once 'create-helpers.php';

$config = require __DIR__ . '/config.php';
$gemini_api_key = $config['google']['api_key'];

// Parse command-line arguments
$short_opts = "y";
$long_opts = [
  "model:",      // Requires a value
  "dry-run"
];
$cli_options = getopt($short_opts, $long_opts);

$gpt_model_name = $cli_options['model'] ?? 'gemini-2.5-pro-preview-03-25'; // gemini-2.5-flash-preview-04-17 gemini-2.5-pro-preview-03-25 gemini-2.5-pro-exp-03-25
$dry_run = isset($cli_options['dry-run']);
$auto_confirm = isset($cli_options['y']);

try {
  checkIfHeadlineIsNeeded(false);

  // Load everything from the headline_preview table
  $db = getDbConnection();
  $stmt = $db->query('SELECT * FROM headline_preview');
  $previews = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // if there are none, there's nothing we can do, just bail.
  if (empty($previews)) {
    echo "No previews found. Exiting";
    exit();
  }

  // If only one exists, just use that
  if (count($previews) === 1) {
    echo "Only one preview found. Promoting it\n";
    echo json_decode($previews[0], JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
    $result = promotePreview($previews[0]);
    echo print_r($result);
    exit();
  }

  $previews_simplified = [];
  foreach ($previews as $previewData) {
    // If one is selected, just use that
    if ($previewData['status'] === 'selected') {

      echo "Found a selected preview! Promoting it\n";
      echo json_encode($previewData, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
      $result = promotePreview($previewData);
      echo print_r($result);
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

  // Choose the best candidate
  $prompt = getChooseFromPreviewsPrompt(json_encode($previews_simplified, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE));
  $generationConfig = getFinalGenerationConfig(false);
  $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key, $gpt_model_name);

  $generated_text = $response['candidates'][0]['content']['parts'][0]['text'];
  echo "Final choice response:\n" . $generated_text . "\n";
  $final_choice_data = json_decode($generated_text, true);

  // Extract data from the LLM response
  $headline = $final_choice_data['headline'];
  $correct_answer = $final_choice_data['word_to_remove'];
  $possible_answers = ['answers' => $final_choice_data['replacements']];
  $hint = $final_choice_data['hint'];

  // Match with original preview data and extract additional info. There could be multiple for the same headline, but we will overwrite the generated values anyway.
  $matched_preview = findMostSimilarHeadline($headline, $previews);

  // Overwrite with any edits made
  $matched_preview['correct_answer'] = $correct_answer;
  $matched_preview['possible_answers'] = json_encode($possible_answers);
  $matched_preview['hint'] = $hint;

  echo "Final headline about to be inserted:\n";
  echo json_encode($matched_preview, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
  echo "\n";

  if ($auto_confirm) {
    echo "-y was specified, so not asking for confirmation.\n";
  } else {
    confirmProceed("Would you like to submit this headline?");
  }

  if ($dry_run) {
    echo "Dry run: Headline not inserted into the database.\n";
  } else {
    promotePreview($matched_preview);
    echo "Headline inserted into the database.\n";
  }
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}

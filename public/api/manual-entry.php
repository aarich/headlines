<?php

require_once 'db-utils.php';
require_once 'prompts.php';
require_once 'create-helpers.php';

// Parse CLI arguments
$short_opts = "";
$long_opts = ["dry-run", "preview"];
$cli_options = getopt($short_opts, $long_opts);
$dry_run = isset($cli_options['dry-run']);
$save_to_preview = isset($cli_options['preview']);

try {
  checkIfHeadlineIsNeeded(true);

  echo "\n";
  $headline = getInput("headline");
  $before_blank = getInput("before blank");
  $after_blank = getInput("after blank");
  $hint = getInput("hint");
  $article_url = getInput("article url");
  $reddit_url = getInput("reddit url");
  $correct_answer = getInput("correct answer");
  $possible_answers = explode(',', getInput("possible answers (comma separated)"));
  $publish_time = getInput("publish time (YYYY-MM-DD HH:MM:SS, skip for current time, or a number of hours ago)");
  $explanation = "manual entry";

  if ($publish_time === '') {
    $publish_time = date('Y-m-d H:i:s');
  } elseif (is_numeric($publish_time)) {
    $publish_time = date('Y-m-d H:i:s', strtotime("-$publish_time hours"));
  } else {
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', $publish_time);
    if (!$dt) {
      throw new Exception("Invalid publish time format. Use 'YYYY-MM-DD HH:MM:SS' or 'now' or a number for hours ago.");
    }
    $publish_time = $dt->format('Y-m-d H:i:s');
  }

  echo "\nSummary of data about to be inserted:\n";
  echo "Headline: $headline\n";
  echo "Before blank: $before_blank\n";
  echo "After blank: $after_blank\n";
  echo "Hint: $hint\n";
  echo "Article URL: $article_url\n";
  echo "Reddit URL: $reddit_url\n";
  echo "Correct answer: $correct_answer\n";
  echo "Possible answers: " . implode(", ", $possible_answers) . "\n";
  echo "Publish time: $publish_time\n";
  echo "Explanation: $explanation\n";

  confirmProceed("\nWould you like to submit this headline?");

  if ($dry_run) {
    echo "Dry run: Headline not inserted into the database.\n";
  } else {
    insertHeadline($headline, $before_blank, $after_blank, $hint, $article_url, $reddit_url, $correct_answer, $possible_answers, $publish_time, $explanation, $save_to_preview);
  }
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}

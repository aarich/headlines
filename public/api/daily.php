<?php

require_once 'db-utils.php';

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


  // Fetch top posts
  $posts = getTopPosts($subreddit, $reddit_user_agent, $reddit_client_id, $reddit_client_secret);

  echo "posts: " . print_r($posts, true) . "\n";

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
      'title' => $title,
      'url' => $url,
      'reddit_url' => $reddit_url,
      'created_utc' => $created_utc,
    ];
  }

  echo "headlines_brief: " . print_r($headlines_brief, true) . "\n";
  echo "headlines_full: " . print_r($headlines_full, true) . "\n";

  $prompt = "
Below are some headlines in the news recently.  Each headline below was chosen since they seem like they could be written by the Onion, but they are truly real headlines. You are to select a few headlines for a game. The game involves guessing a missing word from an absurd-but-real headline. So choose a headline that would be fun for that game. Here are the guidelines to help you choose. None of them are strict rules since it might be impossible to find a headline to meet all of them. Rather, they are to goals that you should weigh when choosing providing your answer.

1. The headline subject should be SFW
2. The headline subject should be friendly and positive and not alienate people
3. The headline should be popular (indicated by a high score value)
4. The headline should have a word in it that might be difficult to guess what it would be. For example, in the headline \"Newly selected pope revealed to own restaurant\". In that sentence, removing the word \"restaurant\" means the fill-in-the-blank would be \"newly selected pope revealed to own [blank]\". It might be difficult to guess the missing word. But it shouldn't be impossible.
4. The headline and removed word should have funny alternatives for the blank. For example, in the headline \"Newly selected pope revealed to own restaurant\". In that sentence, removing the word \"restaurant\" means the fill-in-the-blank would be \"newly selected pope revealed to own [blank]\" and funny options could be things like \"baseball team\", \"high heels\", \"slaves\", \"thongs\".
5. The removed word should be a single relatively known word and it should be important to the headline. It should not be a phrase.
6. The possible alternatives can be related to the word or they could be different so as to alter the meaning entirely. For example in the headline \"newly selected pope owns restaurant\", a replacement such as \"brothel\" is ok since it's a similar grammatical structure as \"restaurant\" since they're both establishments that could be owned. But it could also be something like \"toddler\" since that changes the entire structure of the headline. Now instead of being responsible for an establishment, the pope is insulting a child.
7. The headline should be relatively short

Format your response by including
- the original headline title
- the url of the associated article
- a specific word to remove from the headline that meets the above criteria
- an explanation for why this choice was made. What makes the headline and word to remove meet these preferences?
- a list of possible word choices that would be funny to suggest as alternatives. Provide at least 5 replacements

Here is the list of potential headlines:

" . json_encode($headlines_brief) . "

";

  $generationConfig = [
    "responseMimeType" => "application/json",
    "responseSchema" => [
      "type" => "object",
      "properties" => [
        "choices" => [
          "type" => "array",
          "minItems" => 7,
          "items" => [
            "type" => "object",
            "required" => [
              "headline",
              "word_to_remove",
              "explanation",
              "funny_replacements"
            ],
            "properties" => [
              "headline" => [
                "type" => "string"
              ],
              "word_to_remove" => [
                "type" => "string"
              ],
              "explanation" => [
                "type" => "string"
              ],
              "funny_replacements" => [
                "type" => "array",
                "minItems" => 5,
                "items" => [
                  "type" => "string"
                ]
              ]
            ]
          ]
        ]
      ]
    ]
  ];

  $response = invokeGooglePrompt($prompt, $generationConfig, $gemini_api_key);

  echo "response: " . print_r($response, true) . "\n";

  $options_by_google = $response['candidates'][0]['content']['parts'][0]['text'];


  $prompt = "
Below are some options for a fun guessing game. Each headline below was chosen since they seem like they could be written by the Onion, but they are truly real headlines. 
The game involves guessing a missing word from an absurd-but-real headline. So choose a headline that would be fun for that game. 
Here are the guidelines to help you choose. None of them are strict rules since it might be impossible to find a headline to meet all of them.

1. The headline subject should be SFW
2. The headline subject should be friendly and positive and not alienate people
3. The headline should be popular (indicated by a high score value)
4. The headline should have a word in it that might be difficult to guess what it would be. For example, in the headline \"Newly selected pope revealed to own restaurant\". In that sentence, removing the word \"restaurant\" means the fill-in-the-blank would be \"newly selected pope revealed to own [blank]\". It might be difficult to guess the missing word. But it shouldn't be impossible.
4. The headline and removed word should have funny alternatives for the blank. For example, in the headline \"Newly selected pope revealed to own restaurant\". In that sentence, removing the word \"restaurant\" means the fill-in-the-blank would be \"newly selected pope revealed to own [blank]\" and funny options could be things like \"baseball team\", \"high heels\", \"slaves\", \"thongs\".
5. The removed word should be a single relatively known word and it should be important to the headline. It should not be a phrase.
6. The possible alternatives can be related to the word or they could be different so as to alter the meaning entirely. For example in the headline \"newly selected pope owns restaurant\", a replacement such as \"brothel\" is ok since it's a similar grammatical structure as \"restaurant\" since they're both establishments that could be owned. But it could also be something like \"toddler\" since that changes the entire structure of the headline. Now instead of being responsible for an establishment, the pope is insulting a child.
7. The removed word should be difficult to guess but not just because it's a banal word. For example, in the headline \"newly selected pope owns restaurant\", the word \"newly\" would be difficult to guess but it doesn't really mean much in the headline.

You are to select one of the options and provide the following information:

Format your response by including
- the original headline (with any formatting issues cleaned up)
- the url of the associated article
- the reddit url of the associated article
- the specific word to remove from the headline that meets the above criteria
- an explanation for why this choice was made. What makes the headline and word to remove meet these preferences?
- a list of possible word choices that would be funny to suggest as alternatives. Feel free to edit or add to the list as needed.
- a hint for the answer that is kind of esoteric and not obvious. Maybe a pun or some other fun clue.

Here is the list of potential choices:

" . json_encode($options_by_google) . "

Here is data about the original headlines to form your response:

" . json_encode($headlines_full) . "

";


  $generationConfig = [
    "responseMimeType" => "application/json",
    "responseSchema" => [
      "type" => "object",
      "required" => [
        "headline",
        "word_to_remove",
        "explanation",
        "reddit_url",
        "replacements",
        "created_utc",
        "hint",
        "article_url"
      ],
      "properties" => [
        "headline" => ["type" => "string"],
        "word_to_remove" => ["type" => "string"],
        "explanation" => ["type" => "string"],
        "reddit_url" => ["type" => "string"],
        "replacements" => [
          "type" => "array",
          "items" => ["type" => "string"]
        ],
        "created_utc" => ["type" => "number"],
        "hint" => ["type" => "string"],
        "article_url" => ["type" => "string"]
      ]
    ]
  ];

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

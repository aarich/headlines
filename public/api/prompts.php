
<?php

$guidelines = "
- The headline subject should be SFW
- The headline subject should be friendly and positive and not alienate people
- The headline should be popular (indicated by a high score value)
- The headline should have a word in it that might be difficult to guess what it would be. For example, in the headline \"Newly selected pope revealed to own restaurant\". In that sentence, removing the word \"restaurant\" means the fill-in-the-blank would be \"newly selected pope revealed to own [blank]\". It might be difficult to guess the missing word. But it shouldn't be impossible.
- The headline and removed word should have funny alternatives for the blank. For example, in the headline \"Newly selected pope revealed to own restaurant\". In that sentence, removing the word \"restaurant\" means the fill-in-the-blank would be \"newly selected pope revealed to own [blank]\" and funny options could be things like \"baseball team\", \"high heels\", \"slaves\", \"thongs\".
- The removed word should be a single relatively known word and it should be important to the headline. It should not be a phrase.
- The possible alternatives can be related to the word or they could be different so as to alter the meaning entirely. For example in the headline \"newly selected pope owns restaurant\", a replacement such as \"brothel\" is ok since it's a similar grammatical structure as \"restaurant\" since they're both establishments that could be owned. But it could also be something like \"toddler\" since that changes the entire structure of the headline. Now instead of being responsible for an establishment, the pope is insulting a child.
- The possible alternatives should also be single words and very different from the original word. 
- The possible alternatives shouldn't be absurdly impossible. With the example above, \"unicorn\" is not a good replacement for \"restaurant\" since it's clearly not possible to own a unicorn. But \"heels\" is a good replacement since it's unbelievable but in the realm of possibilities.
- The headline should be relatively short
";

function getInitialPrompt($headlines_brief) {
    global $guidelines;

    return "
Below are some headlines in the recent news. Each headline below was chosen since they seem like they could be written by The Onion, but they are truly real headlines. You are to select a few headlines for a game. The game involves guessing a missing word from an absurd-but-real headline. So choose a few headlines that would be fun for that game. Here are the guidelines to help you choose. None are strict rules since it might be impossible to find a headline to meet all the criteria. Rather, they are to goals that you should weigh when providing your answer.

$guidelines

Format your response by including
- the original headline title
- the url of the associated article
- a specific word to remove from the headline that meets the above criteria
- an explanation for why this choice was made. What makes the headline and word to remove meet these preferences?
- a list of possible word choices that would be funny to suggest as alternatives. Provide at least 5 replacements

Choose at least 5 headlines. Here is the list of candidates:

" . json_encode($headlines_brief);
}

function getInitialGenerationConfig() {
    return [
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
}

function getFinalPrompt($options_by_google, $headlines_full) {
    global $guidelines;

    return  "
Below are some options for a fun guessing game. Each headline below was chosen since they seem like they could be written by The Onion, but they are truly real headlines. 
The game involves guessing a missing word from an absurd-but-real headline. So choose a headline that would be fun for that game. 
Here are the guidelines to help you choose. None of them are strict rules since it might be impossible to find a headline to meet all of them.

$guidelines

You are to select the best option and provide the following information:

Format your response by including
- the original headline as it was published. Do not alter the formatting except to clean up encoding issues if they exist.
- the url of the associated article
- the reddit url of the headline
- the specific word to remove from the headline that meets the above criteria
- an explanation for why this choice was made. What makes the headline and word to remove meet these preferences?
- a list of possible word choices that would be funny to suggest as alternatives. Feel free to edit or add to the list as needed.
- a hint for the answer that is kind of esoteric and not obvious. Maybe a pun or some other fun clue.

Here is the list of potential choices:

" . json_encode($options_by_google) . "

Here is data about the original headlines to form your response:

" . json_encode($headlines_full);
}

function getFinalGenerationConfig() {
    return [
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
                "created_utc" => ["type" => "number"],
                "hint" => ["type" => "string"],
                "article_url" => ["type" => "string"],
                "replacements" => [
                    "type" => "array",
                    "items" => ["type" => "string"]
                ]
            ]
        ]
    ];
}

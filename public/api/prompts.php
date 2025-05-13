
<?php

$guidelines = "
- The headline subject should be SFW but is welcome to be irreverent or absurd
- The headline subject should be friendly and positive
- The headline should have a word in it that might be difficult to guess what it would be. For example, in the headline \"Newly selected pope revealed to own a restaurant\". In that sentence, the fill-in-the-blank could be \"newly selected pope revealed to own [blank]\". It might be challenging and fun to guess the missing word.
- The headline without the removed word should leave the reader wondering what it could be. For example if the headline is \"Alchemist Turns Lead Into [???]\", the reader will be curious about what the missing word is. But if the headline is \"Alchemist Turns Lead Into [???] Gold\", the reader will be less curious since they can guess that the missing word is something like \"solid\" or \"liquid\".
- The headline and removed word should have funny alternatives for the blank. For example, in the headline \"Newly selected pope revealed to own a restaurant\". In that sentence, removing the word \"restaurant\" and funny options could be things like \"lambhorghini\", \"thong\", or \"slave\".
- The removed word should be a single relatively known word and it should be important to the headline. It should not be a phrase.
- The removed word should not be part of a phrase used in the headline. For example if \"Darth Vader\" was in the headline, it would not be a good choice to remove \"Darth\" since it would be obvious what the answer is given [blank] Vader. Or if \"Tesla Cybertruck\" is in the title, \"Cybertruck\" is not a good choice to remove since \"Tesla [blank]\" is not interesting as it could only be one of the few products by Tesla. Or \"Hermit Crab\" --> \"Hermit [blank]\" is not a good choice since \"crab\" is the only thing that makes sense.
- The removed word should not be a number. For example, if the headline is \"Man eats 85 sugar cubes\", the best word to replace would be \"sugar\". \"85\" would be impossible to guess, even if you knew it was a number.
- The removed word should be the shocking part of the headline if possible.
- The possible alternatives can be related to the word or they could be different so as to alter the meaning entirely. For example in the headline \"newly selected pope owns restaurant\", a replacement such as \"brothel\" is ok since it's a similar grammatical structure as \"restaurant\" since they're both establishments that could be owned. But it could also be something like \"toddler\" since that changes the entire structure of the headline. Now instead of being responsible for an establishment, the pope is insulting a child.
- The possible alternatives should also be single words and be different from the original word. Don't concatenate words or phrases with a hyphen just to make it a single word.
- The possible alternatives shouldn't be literally impossible. With the example above, \"unicorn\" is not a good replacement for \"restaurant\" since it's clearly not possible to own a unicorn. But \"heels\" is a good replacement since it's unbelievable but in the realm of possibilities.
- The possible alternatives should be grammatically correct when replaced into the headline. Use the correct form of the word. They should also match the case of the original word.
- There should be at least 5 possible alternatives.
- Between the actual missing words and the possible alternatives, it should be equally absurd to imagine any one being the correct answer given the implication. All of them should work gramatically.
";

function getInitialPrompt($headlines_brief) {
    global $guidelines;

    $json_str = json_encode($headlines_brief, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);

    return "
Below are some real headlines from the past 24 hours, even though they seem as if they could have been written by The Onion. You are to select a few headlines for a game. The game involves guessing a missing word from an absurd-but-real headline. So choose a few headlines that would be fun for that game. Here are the guidelines to help you choose. None are strict rules since it might be impossible to find a headline to meet all the criteria. Rather, they are to goals that you should weigh when providing your answer.

$guidelines

Format your response by including
- the original headline title as it was published.
- a specific word to remove from the headline that meets the above criteria
- an explanation for why this choice was made. What makes the headline and word to remove meet these preferences?
- a list of possible word choices that would be funny to suggest as alternatives. Provide at least 5 replacements

Choose at least 5 headlines from this list of candidates:

 $json_str";
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
                            "replacements"
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
                            "replacements" => [
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

function getFinalPrompt($initial_candidates_str) {
    global $guidelines;
    return  "
Below are some options for a fun guessing game. Each headline below was chosen since they seem like they could be written by The Onion, but they are truly real headlines. 
The game involves guessing a missing word from an absurd-but-real headline. So choose a headline that would be fun for that game. 
Here are the guidelines to help you choose. None of them are strict rules since it might be impossible to find a headline to meet all of them. If any option blatantly violates the guidelines, you can ignore it and choose one that better suits the guidelines.

$guidelines

You are to select the best option and provide the following information:

Format your response by including
- the original headline as it was published.
- the specific word to remove from the headline that meets the above criteria
- an explanation for why this choice was made. What makes the headline and word to remove meet these preferences?
- a list of possible word choices that would be funny to suggest as alternatives. Feel free to edit or add to the list as needed to adhere to the guidelines.
- a brief hint for the answer that is esoteric and not obvious, akin to a crossword clue in that it requires some thought to guess. Don't use a pun. It can be creative or funny or just a simple clue that doesn't give away the answer right away.

Here is the list of potential choices:

$initial_candidates_str
";
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
                "replacements",
                "hint"
            ],
            "properties" => [
                "headline" => ["type" => "string"],
                "word_to_remove" => ["type" => "string"],
                "explanation" => ["type" => "string"],
                "hint" => ["type" => "string"],
                "replacements" => [
                    "type" => "array",
                    "items" => ["type" => "string"]
                ]
            ]
        ]
    ];
}


<?php

$DEFAULT_CANDIDATE_COUNT = 6;

// Separating explicit rules from examples for better adherence
$core_rules = "
<rules>
    <rule>Content Safety: Headlines must be SFW, friendly, positive, apolitical, and nonviolent.</rule>
    <rule>Tone: Irreverent, absurd, or funny. It should make you laugh, then think.</rule>
    <rule>Word Selection:
        - Must be a single, relatively known word.
        - Must NOT be a number.
        - Must NOT be part of a proper noun phrase (e.g., do not remove 'Darth' from 'Darth Vader').
        - Should be the 'shocking' or 'key' part of the headline.
    </rule>
    <rule>The Blank: Removing the word must create suspense. Avoid blanks where the answer is obvious contextually.</rule>
    <rule>Alternatives:
        - Must be single words.
        - Must be grammatically correct replacements.
        - Must NOT be literally impossible (e.g., 'unicorn' is bad if owning it is impossible, but 'heels' is good if it's just unlikely).
        - Should be equally absurd/funny as the real answer.
    </rule>
</rules>
";

$few_shot_examples = "
<examples>
    <example>
        <headline>Newly selected pope revealed to own a restaurant</headline>
        <word_to_remove>restaurant</word_to_remove>
        <reasoning>Removing 'restaurant' creates a fun blank. 'Newly selected pope revealed to own a [blank]' invites funny guesses.</reasoning>
        <replacements>
            <item>Lamborghini</item>
            <item>thong</item>
            <item>slave</item>
            <item>brothel</item>
            <item>toddler</item>
        </replacements>
    </example>
    <example>
        <headline>Man eats 85 sugar cubes</headline>
        <word_to_remove>sugar</word_to_remove>
        <reasoning>'Sugar' is the key noun. Removing '85' would be a bad choice as numbers are impossible to guess.</reasoning>
        <replacements>
            <item>ice</item>
            <item>rubik's</item>
            <item>lego</item>
            <item>stock</item>
            <item>poison</item>
        </replacements>
    </example>
    <anti_pattern>
        <headline>Alchemist Turns Lead Into Gold</headline>
        <bad_choice>Gold</bad_choice>
        <reasoning>The phrase 'Turns Lead Into [blank]' strongly implies 'Gold'. It is too predictable.</reasoning>
    </anti_pattern>
</examples>
";

function getInitialPrompt($headlines_brief) {
    global $core_rules;
    global $few_shot_examples;
    global $DEFAULT_CANDIDATE_COUNT;
    $num_headlines = count($headlines_brief);
    $candidates_to_provide = min($DEFAULT_CANDIDATE_COUNT, $num_headlines);

    $json_str = json_encode($headlines_brief, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);

    return "
<role>
You are a creative Game Content Curator. Your specialty is finding real, absurd headlines that sound like satire (e.g., The Onion) but are factually true. You are designing content for a 'Fill-in-the-Blank' guessing game.
</role>

<task>
Analyze the provided headlines and select the top $candidates_to_provide that are most amenable to a funny guessing game.
For each selected headline, identify the perfect word to remove to create a suspenseful and humorous blank.
</task>

$core_rules

$few_shot_examples

<input_data>
$json_str
</input_data>

<instructions>
1. Select $candidates_to_provide headlines from the input data.
2. For each, apply the <rules> to choose a 'word_to_remove'.
3. Generate at least 5 funny, single-word 'replacements'.
4. Provide an 'explanation' for your choice.
</instructions>
";
}

function getInitialGenerationCandidatesToProvide($headline_titles) {
    global $DEFAULT_CANDIDATE_COUNT;
    $num_headlines = count($headline_titles);
    return min($DEFAULT_CANDIDATE_COUNT, $num_headlines);
}

function getInitialGenerationConfig(int $candidates_to_provide) {
    return [
        "responseMimeType" => "application/json",
        "responseSchema" => [
            "type" => "object",
            "properties" => [
                "choices" => [
                    "type" => "array",
                    "minItems" => $candidates_to_provide,
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

function getFinalPrompt(int $num_final_results, string $initial_candidates_str) {
    global $core_rules;
    global $few_shot_examples;
    
    return  "
<role>
You are the final editor for the 'Fill-in-the-Blank' headline game. You are selecting the absolute best content for the final production build.
</role>

<task>
Review the candidate options below and select the best $num_final_results headline(s).
You must also generate a 'hint' for the player.
</task>

$core_rules

$few_shot_examples

<input_candidates>
$initial_candidates_str
</input_candidates>

<instructions>
1. Select the top $num_final_results option(s) that best fit the <rules>.
2. Ensure the 'replacements' are funny and grammatically sound.
3. Write a 'hint' for the missing word.
    - Constraint: The hint must NOT be a pun.
    - Constraint: The hint should be creative, esoteric, or simple, but NOT give the answer away immediately.
</instructions>
";
}

function getFinalGenerationConfig($min_items, $include_explanation = true) {
    $schema = [
        "responseMimeType" => "application/json",
        "responseSchema" => [
            "type" => "object",
            "properties" => [
                "choices" => [
                    "type" => "array",
                    "minItems" => $min_items,
                    "items" => [
                        "type" => "object",
                        "required" => [
                            "headline",
                            "word_to_remove",
                            "replacements",
                            "hint"
                        ],
                        "properties" => [
                            "headline" => ["type" => "string"],
                            "word_to_remove" => ["type" => "string"],
                            "hint" => ["type" => "string"],
                            "replacements" => [
                                "type" => "array",
                                "items" => ["type" => "string"]
                            ]
                        ]
                    ]
                ]
            ]
        ]
    ];

    if ($include_explanation) {
        $schema["responseSchema"]['properties']['explanation'] = ["type" => "string"];
        $schema["responseSchema"]['required'][] = 'explanation';
    }

    return $schema;
}

function getChooseFromPreviewsPrompt($previewsStr) {
    global $core_rules;
    
    return  "
<role>
You are a game curator selecting the single best headline to feature in a 'Fill-in-the-Blank' game.
</role>

<task>
Choose a single headline from the provided options. This headline must be the funniest and most engaging one.
</task>

$core_rules

<input_options>
$previewsStr
</input_options>

<instructions>
1. Select the best option.
2. Refine the list of 'replacements' to ensure maximum humor and variety.
3. Create a 'hint' (esoteric, no puns) for the answer.
</instructions>
";
}


<?php

function convertToCamelCase($snake_case_obj): array {
    // Convert all snake_case keys to camelCase
    $camelCase = [];
    foreach ($snake_case_obj as $key => $value) {
        $camelCaseKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
        $camelCase[$camelCaseKey] = $value;
    }

    return $camelCase;
}

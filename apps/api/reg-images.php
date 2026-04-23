<?php
// Returns resolved HTTPS URLs for the three registration step hero images.
// GET (no params required) → 200 { s1_url, s2_url, s3_url }
//
// Tries .jpg → .jpeg → .png for each basename; falls back to default.jpg.
// This lets the clinic upload images in any supported format without
// changing Worker code.

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/queries.php';
require_once __DIR__ . '/image-rule.php';

handleCors();
requireLineOaAuth();

// Allow both GET and POST (Worker calls it once per registration start)
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
    jsonResponse(['error' => 'Method Not Allowed', 'message' => 'Use GET or POST'], 405);
}

jsonResponse([
    's1_url'       => resolveStepImage('registration_1_phone'),
    's2_url'       => resolveStepImage('registration_2_id'),
    's3_url'       => resolveStepImage('registration_3_people'),
    'no_apt_url'   => resolveStepImage('no_appointment'),
    'complete_url' => resolveStepImage('registration_4_complete'),
]);

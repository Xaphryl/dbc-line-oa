<?php
// Find candidate PatNums by phone number (digits-only match) — Plan §7.2 / FR-12, FR-18
// POST { phone_digits } → { candidates: [patNum, ...] } | 404

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/queries.php';

handleCors();
requireLineOaAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method Not Allowed', 'message' => 'Use POST'], 405);
}

try {
    $body        = getJsonBody();
    $rawPhone    = $body['phone_digits'] ?? '';

    // Normalize: strip all non-digits (FR-18: match even if user omits dashes/spaces)
    $phoneDigits = preg_replace('/[^0-9]/', '', $rawPhone);

    // Validate: must be exactly 10 digits (Thai mobile) or 9 digits (home without leading 0)
    if (!preg_match('/^0\d{8,9}$/', $phoneDigits)) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'phone_digits must be a valid Thai phone number (9–10 digits starting with 0)'], 400);
    }

    $pdo = DB::get();

    [$sql, $params] = sql_resolve_by_phone($phoneDigits);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    if (empty($rows)) {
        jsonResponse(['error' => 'Not Found', 'message' => 'No patient found with that phone number'], 404);
    }

    $candidates = array_map(fn($r) => (int) $r['PatNum'], $rows);

    jsonResponse(['candidates' => $candidates]);

} catch (Throwable $e) {
    error_log("line-oa/resolve-by-phone error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

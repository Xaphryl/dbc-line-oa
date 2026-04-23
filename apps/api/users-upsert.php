<?php
// Record a LINE follow or unfollow event — Plan §7.2 / FR-15, Phase 5
// Replaces the Google Apps Script Users DB Sheet write with a DB log row.
// POST { event_id, line_user_id, event_type, pat_num? } → 200 { logged: true }

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/queries.php';

handleCors();
requireLineOaAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method Not Allowed', 'message' => 'Use POST'], 405);
}

try {
    $body       = getJsonBody();
    $eventId    = trim($body['event_id']    ?? '');
    $lineUserId = trim($body['line_user_id'] ?? '');
    $eventType  = trim($body['event_type']  ?? '');
    $patNum     = isset($body['pat_num']) ? (int) $body['pat_num'] : null;

    // --- Input validation ---
    if ($eventId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'event_id is required'], 400);
    }
    if ($lineUserId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'line_user_id is required'], 400);
    }
    if (!in_array($eventType, ['follow', 'unfollow'], true)) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'event_type must be "follow" or "unfollow"'], 400);
    }
    if ($patNum !== null && $patNum <= 0) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'pat_num must be a positive integer if provided'], 400);
    }

    $pdo = DB::get();

    [$sql, $params] = sql_upsert_line_user_event(
        $eventId,
        $lineUserId,
        $eventType,
        $eventType,  // status mirrors event_type for follow/unfollow
        $patNum,
        null         // ms not measured here; Cloudflare Worker logs timing
    );
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['logged' => true]);

} catch (Throwable $e) {
    error_log("line-oa/users-upsert error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

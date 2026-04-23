<?php
// Append an audit row to line_event_log (fire-and-forget) — Plan §7.2 / §3 Guardrail 4
// POST { event_id, line_user_id, event_type, status, pat_num?, ms? } → 200 { logged: true }
//
// No PII stored: only line_user_id (LINE-internal token), pat_num (internal DB key),
// event_type, status, and duration in ms. Never logs full name, HN, phone, national ID.

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/queries.php';

handleCors();
requireLineOaAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method Not Allowed', 'message' => 'Use POST'], 405);
}

$VALID_EVENT_TYPES = ['next_appointment', 'bind_hn', 'follow', 'unfollow', 'error', 'verify_phone', 'verify_national_id', 'verify_name_confirm'];
$VALID_STATUSES    = ['ok', 'unbound', 'not_found', 'conflict', 'error', 'phone_found', 'phone_not_found', 'id_match', 'id_mismatch', 'confirmed', 'rejected', 'follow', 'unfollow'];

try {
    $body       = getJsonBody();
    $eventId    = trim($body['event_id']    ?? '');
    $lineUserId = trim($body['line_user_id'] ?? '');
    $eventType  = trim($body['event_type']  ?? '');
    $status     = trim($body['status']      ?? '');
    $patNum     = isset($body['pat_num']) ? (int) $body['pat_num'] : null;
    $ms         = isset($body['ms'])      ? (int) $body['ms']      : null;

    // --- Input validation ---
    if ($eventId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'event_id is required'], 400);
    }
    if ($lineUserId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'line_user_id is required'], 400);
    }
    if (!in_array($eventType, $VALID_EVENT_TYPES, true)) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'event_type is not in allowed list'], 400);
    }
    if (!in_array($status, $VALID_STATUSES, true)) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'status is not in allowed list'], 400);
    }
    if ($patNum !== null && $patNum <= 0) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'pat_num must be a positive integer if provided'], 400);
    }

    $pdo = DB::get();

    [$sql, $params] = sql_log_event($eventId, $lineUserId, $eventType, $status, $patNum, $ms);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['logged' => true]);

} catch (Throwable $e) {
    error_log("line-oa/log-event error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

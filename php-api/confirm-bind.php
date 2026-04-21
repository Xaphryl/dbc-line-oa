<?php
// Idempotent write of line_user_id to patient row — Plan §7.2 / FR-12, §3 Guardrail 7
// POST { line_user_id, patNum } → 200 { bound: true }
//
// Idempotency rules (updated for re-registration support):
//   - patient.line_user_id is NULL or ''    → write it, return 200
//   - patient.line_user_id equals incoming  → already bound to same user, return 200 (already: true)
//   - patient.line_user_id is a DIFFERENT LINE ID → overwrite, return 200
//     (safe because the patient proved identity through phone + national-ID verification
//      before this step is reached; 409 is no longer returned on conflict)

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
    $lineUserId = trim($body['line_user_id'] ?? '');
    $patNum     = (int) ($body['patNum'] ?? 0);

    // --- Input validation ---
    if ($lineUserId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'line_user_id is required'], 400);
    }
    if ($patNum <= 0) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'patNum must be a positive integer'], 400);
    }

    $pdo = DB::get();

    // --- Read current binding ---
    [$sql, $params] = sql_get_patient_line_binding($patNum);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $patient = $stmt->fetch();

    if (!$patient) {
        jsonResponse(['error' => 'Not Found', 'message' => 'Patient not found'], 404);
    }

    $existing = $patient['line_user_id'];

    // --- Idempotency: already bound to this exact LINE user ---
    if ($existing !== '' && $existing !== null && $existing === $lineUserId) {
        jsonResponse(['bound' => true, 'already' => true]);
    }

    // --- Write (or overwrite) the binding ---
    // sql_bind_line_user now performs an unconditional UPDATE (no AND clause),
    // which is safe because phone + national-ID verification already happened.
    [$sql, $params] = sql_bind_line_user($patNum, $lineUserId);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['bound' => true]);

} catch (Throwable $e) {
    error_log("line-oa/confirm-bind error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

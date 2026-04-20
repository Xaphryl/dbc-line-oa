<?php
// Idempotent write of line_user_id to patient row — Plan §7.2 / FR-12, §3 Guardrail 7
// POST { line_user_id, patNum } → 200 | 409
//
// Idempotency rules:
//   - patient.line_user_id is NULL or '' → write it, return 200 { bound: true }
//   - patient.line_user_id equals incoming line_user_id → already bound, return 200 { bound: true, already: true }
//   - patient.line_user_id is set to a DIFFERENT LINE ID → return 409 { error: 'Conflict' }
//   - NEVER overwrite an existing binding (Plan §3 Guardrail 7)

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

    // --- Idempotency check ---
    if ($existing !== '' && $existing !== null) {
        if ($existing === $lineUserId) {
            // Already bound to this same LINE user — idempotent success
            jsonResponse(['bound' => true, 'already' => true]);
        } else {
            // Bound to a DIFFERENT LINE user — refuse, return 409 (Plan §3 Guardrail 7)
            jsonResponse([
                'error'   => 'Conflict',
                'message' => 'This patient is already linked to a different LINE account. Please contact the clinic.',
            ], 409);
        }
    }

    // --- Write the binding ---
    [$sql, $params] = sql_bind_line_user($patNum, $lineUserId);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        // Race condition: another request bound it between our read and write
        // Re-read to check if it's now the same ID
        [$sql2, $params2] = sql_get_patient_line_binding($patNum);
        $stmt2 = $pdo->prepare($sql2);
        $stmt2->execute($params2);
        $recheckRow = $stmt2->fetch();
        $nowBound   = $recheckRow['line_user_id'] ?? '';

        if ($nowBound === $lineUserId) {
            jsonResponse(['bound' => true, 'already' => true]);
        } else {
            jsonResponse([
                'error'   => 'Conflict',
                'message' => 'This patient is already linked to a different LINE account. Please contact the clinic.',
            ], 409);
        }
    }

    jsonResponse(['bound' => true]);

} catch (Throwable $e) {
    error_log("line-oa/confirm-bind error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

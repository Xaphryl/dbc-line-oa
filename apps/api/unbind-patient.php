<?php
// Clears a patient's line_user_id binding given their LINE user ID.
// Called before re-registration so the patient can link afresh.
// POST { line_user_id } → 200 { unbound: true } (idempotent — 200 even if not found)

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

    if ($lineUserId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'line_user_id is required'], 400);
    }

    $pdo = DB::get();

    [$sql, $params] = sql_unbind_patient($lineUserId);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Idempotent — return 200 regardless of whether a row was actually updated
    jsonResponse(['unbound' => true, 'rows' => $stmt->rowCount()]);

} catch (Throwable $e) {
    error_log("line-oa/unbind-patient error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

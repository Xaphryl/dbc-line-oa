<?php
// Resolve a LINE user ID to a patient PatNum — Plan §7.2 / FR-1, FR-11
// POST { line_user_id } → { patNum } | 404

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

    [$sql, $params] = sql_resolve_patient($lineUserId);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(['error' => 'Not Found', 'message' => 'No patient bound to this LINE user'], 404);
    }

    jsonResponse([
        'patNum' => (int) $row['PatNum'],
        'fname'  => (string) ($row['FName'] ?? ''),
        'lname'  => (string) ($row['LName'] ?? ''),
    ]);

} catch (Throwable $e) {
    error_log("line-oa/resolve-patient error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

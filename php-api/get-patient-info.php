<?php
// GET ?line_user_id=X → { patNum, fname, lname, hn } | 404
// Used by Worker's handleUnfollow to enrich Telegram notification with patient identity.
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/queries.php';
handleCors();
requireLineOaAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method Not Allowed', 'message' => 'Use GET'], 405);
}

$lineUserId = trim($_GET['line_user_id'] ?? '');
if ($lineUserId === '') {
    jsonResponse(['error' => 'Bad Request', 'message' => 'line_user_id is required'], 400);
}

try {
    $pdo  = DB::get();
    $stmt = $pdo->prepare(
        'SELECT PatNum, FName, LName, DN AS HN
         FROM patient
         WHERE line_user_id = :line_user_id AND line_user_id != \'\'
         LIMIT 1'
    );
    $stmt->execute([':line_user_id' => $lineUserId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        jsonResponse(['error' => 'Not Found', 'message' => 'No patient bound to this LINE user'], 404);
    }

    jsonResponse([
        'patNum' => (int) $row['PatNum'],
        'fname'  => (string) $row['FName'],
        'lname'  => (string) $row['LName'],
        'hn'     => (string) $row['HN'],
    ]);
} catch (Throwable $e) {
    error_log('line-oa/get-patient-info error: ' . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

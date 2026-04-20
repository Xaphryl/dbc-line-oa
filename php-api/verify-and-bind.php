<?php
// Match national ID against a candidate set and return name for confirmation — Plan §7.2 / FR-12
// POST { line_user_id, candidates: [patNum, ...], national_id } → { patNum, fname, lname } | 404
//
// NOTE: The Thai national ID column in the patient table is `CitizenID` (VARCHAR 15).
// This is controlled by the PATIENT_NATIONAL_ID_COLUMN constant in queries.php.
// If the Hostinger schema uses a different column name, update that constant only.

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
    $candidates = $body['candidates'] ?? [];
    $nationalId = trim($body['national_id'] ?? '');

    // --- Input validation ---
    if ($lineUserId === '') {
        jsonResponse(['error' => 'Bad Request', 'message' => 'line_user_id is required'], 400);
    }

    if (!is_array($candidates) || empty($candidates)) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'candidates must be a non-empty array of PatNums'], 400);
    }

    // Cast all candidates to int and reject any that are not positive integers
    $candidateNums = [];
    foreach ($candidates as $c) {
        $n = (int) $c;
        if ($n <= 0) {
            jsonResponse(['error' => 'Bad Request', 'message' => 'All candidates must be positive integers'], 400);
        }
        $candidateNums[] = $n;
    }

    // Limit to 20 candidates (matches resolve-by-phone LIMIT 20) to avoid runaway queries
    if (count($candidateNums) > 20) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'candidates exceeds maximum of 20'], 400);
    }

    // Validate national ID: exactly 13 digits (Thai national ID format)
    if (!preg_match('/^\d{13}$/', $nationalId)) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'national_id must be exactly 13 digits'], 400);
    }

    $pdo = DB::get();

    [$sql, $params] = sql_verify_national_id($candidateNums, $nationalId);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();

    if (!$row) {
        jsonResponse(['error' => 'Not Found', 'message' => 'National ID does not match any candidate patient'], 404);
    }

    // Return patNum + name for confirmation step — NO national ID echoed back (PII rule §3.4)
    jsonResponse([
        'patNum' => (int) $row['PatNum'],
        'fname'  => $row['FName'],
        'lname'  => $row['LName'],
    ]);

} catch (Throwable $e) {
    error_log("line-oa/verify-and-bind error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

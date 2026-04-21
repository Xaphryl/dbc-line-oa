<?php
/**
 * LINE OA PHP API — Core helpers
 * Stripped of nsync-specific auth (requireAuth, requireWebAuth, generateWebToken, verifyWebToken).
 * requireLineOaAuth() lives in api/queries.php and uses the LINE_OA_API_KEY constant.
 */

require_once __DIR__ . '/config.php';

/**
 * Send a JSON response with appropriate headers and exit.
 */
function jsonResponse($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Line-Oa-Key');

    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) {
        http_response_code(500);
        echo json_encode(['error' => 'JSON encoding failed', 'message' => json_last_error_msg()]);
        exit;
    }
    echo $json;
    exit;
}

/**
 * Handle CORS preflight requests.
 */
function handleCors(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Line-Oa-Key');
        header('Access-Control-Max-Age: 86400');
        http_response_code(204);
        exit;
    }
}

/**
 * Get a query string parameter with an optional default.
 */
function getParam(string $name, $default = null)
{
    return $_GET[$name] ?? $default;
}

/**
 * Decode the JSON request body. Returns an associative array.
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'Empty request body'], 400);
    }

    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'Invalid JSON: ' . json_last_error_msg()], 400);
    }

    return $data;
}

/**
 * Validate that an identifier (table or column name) is safe for SQL.
 */
function isValidIdentifier(string $name): bool
{
    return (bool) preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/', $name);
}

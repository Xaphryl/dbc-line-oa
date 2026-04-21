<?php
/**
 * LINE OA PHP API — Configuration
 * Loads settings from .env file (one level above this file: public_html/line-oa/.env)
 */

$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);
        if (preg_match('/^["\'](.*)["\']\s*$/', $value, $m)) {
            $value = $m[1];
        }
        if (getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

define('DB_HOST',        getenv('DB_HOST')        ?: 'localhost');
define('DB_PORT',        getenv('DB_PORT')        ?: '3306');
define('DB_NAME',        getenv('DB_NAME')        ?: '');
define('DB_USER',        getenv('DB_USER')        ?: '');
define('DB_PASS',        getenv('DB_PASS')        ?: '');
define('LINE_OA_API_KEY', getenv('LINE_OA_API_KEY') ?: '');
define('IMAGE_BASE_URL', getenv('IMAGE_BASE_URL') ?: '');

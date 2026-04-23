<?php
// Resolve the hero image filename for a given appointment set and date — Plan §7.2 / §5.4 / FR-14
// Included by next-appointments.php; not a standalone HTTP endpoint.

require_once __DIR__ . '/queries.php';

/**
 * Resolve the best matching image filename for the given appointment data and date.
 *
 * Priority (Plan §5.4 / FR-14):
 *   1. Treatment match — any ProcDescript LIKE '%match_value%'
 *   2. Seasonal match  — today's MMDD BETWEEN season_start AND season_end
 *   3. Default fallback
 *
 * Returns filename only (e.g. 'songkran.jpg'). Caller composes the full URL.
 *
 * @param PDO    $pdo        Active PDO connection
 * @param array  $procDescs  ProcDescript strings from the patient's upcoming appointments
 * @param string $dateMMDD   Today as 'MMDD' (e.g. '0419')
 * @return string            Filename to use
 */
function resolveImageRule(PDO $pdo, array $procDescs, string $dateMMDD): string
{
    /**
     * Guard: only return a filename if the image file actually exists on disk.
     * This prevents LINE from getting a broken image URL when a seasonal/treatment
     * image has been configured in the DB but the file hasn't been uploaded yet.
     * Falls back gracefully to the next rule in priority order.
     */
    $imagesDir = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/') . '/line-oa/images/';
    $fileExists = static function (string $filename) use ($imagesDir): bool {
        return file_exists($imagesDir . $filename);
    };

    // --- 1. Treatment match ---
    if (!empty($procDescs)) {
        [$sql, $params] = sql_image_rule_treatment($procDescs);
        if ($sql !== 'SELECT NULL AS filename LIMIT 0') {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch();
            if ($row && !empty($row['filename']) && $fileExists($row['filename'])) {
                return $row['filename'];
            }
        }
    }

    // --- 2. Seasonal match ---
    [$sql, $params] = sql_image_rule_seasonal($dateMMDD);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if ($row && !empty($row['filename']) && $fileExists($row['filename'])) {
        return $row['filename'];
    }

    // --- 3. Default fallback ---
    [$sql, $params] = sql_image_rule_default();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if ($row && !empty($row['filename']) && $fileExists($row['filename'])) {
        return $row['filename'];
    }

    // Hard fallback if the table is empty or all rules inactive
    return 'default.jpg';
}

/**
 * Resolve the full URL for a registration step hero image.
 *
 * Given a base name (without extension), tries extensions in order:
 *   .jpg → .jpeg → .png
 * Returns the first one that exists on disk, composed with IMAGE_BASE_URL.
 * Falls back to IMAGE_BASE_URL/default.jpg if nothing is found.
 *
 * @param string $basename  Filename stem, e.g. 'registration_1_phone'
 * @return string           Full HTTPS URL, e.g. 'https://…/line-oa/images/registration_1_phone.png'
 */
function resolveStepImage(string $basename): string
{
    $imagesDir = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/') . '/line-oa/images/';
    $baseUrl   = rtrim(IMAGE_BASE_URL, '/');

    foreach (['.jpg', '.jpeg', '.png'] as $ext) {
        $filename = $basename . $ext;
        if (file_exists($imagesDir . $filename)) {
            return $baseUrl . '/' . $filename;
        }
    }

    // Nothing found — return default image URL (always safe)
    return $baseUrl . '/default.jpg';
}

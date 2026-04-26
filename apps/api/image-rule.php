<?php
// Resolve the hero image filename for a given appointment set and date — Plan §7.2 / §5.4 / FR-14
// Included by next-appointments.php; not a standalone HTTP endpoint.

require_once __DIR__ . '/queries.php';

/**
 * Find the first existing image file for a given basename, trying extensions
 * in order: .jpg → .jpeg → .png
 *
 * Accepts a filename with OR without an extension — the extension is always
 * stripped first so that a DB row storing 'default.jpg' still resolves to
 * 'default.png' if that is what exists on disk.
 *
 * @param string $filename   Basename with or without extension (e.g. 'default.jpg' or 'default')
 * @param string $imagesDir  Absolute path to the images folder, with trailing slash
 * @return string            Resolved filename including extension (e.g. 'default.png'),
 *                           or '' if no matching file exists in any supported extension.
 */
function resolveFilename(string $filename, string $imagesDir): string
{
    // Strip any existing extension so we always work from the bare stem.
    $stem = pathinfo($filename, PATHINFO_FILENAME);
    foreach (['.jpg', '.jpeg', '.png'] as $ext) {
        if (file_exists($imagesDir . $stem . $ext)) {
            return $stem . $ext;
        }
    }
    return '';
}

/**
 * Resolve the best matching image filename for the given appointment data and date.
 *
 * Priority (Plan §5.4 / FR-14):
 *   1. Treatment match — any ProcDescript contains the match_value substring
 *   2. Seasonal match  — today's MMDD falls within season_start–season_end
 *   3. Default fallback — rule_type = 'default'
 *
 * Returns filename only (e.g. 'default.png'). Caller composes the full URL.
 * Extension is resolved from disk so .jpg / .jpeg / .png all work.
 *
 * @param PDO    $pdo        Active PDO connection
 * @param array  $procDescs  ProcDescript strings from the patient's upcoming appointments
 * @param string $dateMMDD   Today as 'MMDD' (e.g. '0419')
 * @return string            Filename to use (with extension)
 */
function resolveImageRule(PDO $pdo, array $procDescs, string $dateMMDD): string
{
    $imagesDir = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/') . '/line-oa/images/';

    // --- 1. Treatment match ---
    if (!empty($procDescs)) {
        [$sql, $params] = sql_image_rule_treatment($procDescs);
        if ($sql !== 'SELECT NULL AS filename LIMIT 0') {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch();
            if ($row && !empty($row['filename'])) {
                $resolved = resolveFilename($row['filename'], $imagesDir);
                if ($resolved !== '') return $resolved;
            }
        }
    }

    // --- 2. Seasonal match ---
    [$sql, $params] = sql_image_rule_seasonal($dateMMDD);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if ($row && !empty($row['filename'])) {
        $resolved = resolveFilename($row['filename'], $imagesDir);
        if ($resolved !== '') return $resolved;
    }

    // --- 3. Default rule from DB ---
    [$sql, $params] = sql_image_rule_default();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if ($row && !empty($row['filename'])) {
        $resolved = resolveFilename($row['filename'], $imagesDir);
        if ($resolved !== '') return $resolved;
    }

    // Hard fallback — DB has no active default rule; try 'default' with all extensions
    $resolved = resolveFilename('default', $imagesDir);
    return $resolved !== '' ? $resolved : 'default.jpg'; // last resort: keep URL predictable
}

/**
 * Resolve the full URL for a registration step hero image.
 *
 * Given a base name (without extension), tries extensions in order:
 *   .jpg → .jpeg → .png
 * Returns the first one that exists on disk, composed with IMAGE_BASE_URL.
 * Falls back to the 'default' image (any supported extension) if nothing is found.
 *
 * @param string $basename  Filename stem, e.g. 'registration_1_phone'
 * @return string           Full HTTPS URL, e.g. 'https://…/line-oa/images/registration_1_phone.png'
 */
function resolveStepImage(string $basename): string
{
    $imagesDir = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/') . '/line-oa/images/';
    $baseUrl   = rtrim(IMAGE_BASE_URL, '/');

    $resolved = resolveFilename($basename, $imagesDir);
    if ($resolved !== '') {
        return $baseUrl . '/' . $resolved;
    }

    // Nothing found for this basename — fall back to the default image
    $default = resolveFilename('default', $imagesDir);
    return $baseUrl . '/' . ($default !== '' ? $default : 'default.jpg');
}

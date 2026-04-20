<?php
// Return upcoming appointments for a patient, grouped by day, with a hero image URL — Plan §7.2 / FR-1–FR-8, FR-13, FR-14
// GET ?patNum=X → { days: [{ date, appointments: [...] }], image_url }

require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/queries.php';
require_once __DIR__ . '/image-rule.php';

handleCors();
requireLineOaAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method Not Allowed', 'message' => 'Use GET'], 405);
}

try {
    $patNum = (int) getParam('patNum', 0);

    if ($patNum <= 0) {
        jsonResponse(['error' => 'Bad Request', 'message' => 'patNum must be a positive integer'], 400);
    }

    $pdo = DB::get();

    // -----------------------------------------------------------------------
    // 1. Fetch appointments (canonical query, Plan §7.4 / guardrails §3.1–3.3)
    // -----------------------------------------------------------------------
    [$sql, $params] = sql_next_appointments($patNum);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // -----------------------------------------------------------------------
    // 2. Group by calendar date (YYYY-MM-DD)
    // -----------------------------------------------------------------------
    $byDate = [];
    foreach ($rows as $row) {
        $dateKey = substr($row['AptDateTime'], 0, 10); // 'YYYY-MM-DD'
        $byDate[$dateKey][] = $row;
    }

    // -----------------------------------------------------------------------
    // 3. Cap at 12 bubbles (LINE carousel limit); within each day cap at 3 rows
    //    with a "+N เพิ่มเติม — ติดต่อคลินิก" hint (FR-5, FR-6)
    // -----------------------------------------------------------------------
    $MAX_DAYS        = 12;
    $MAX_PER_DAY     = 3;
    $days            = [];
    $allProcDescs    = []; // collect all proc descriptions for image rule resolution

    foreach (array_slice($byDate, 0, $MAX_DAYS, true) as $date => $apts) {
        $total     = count($apts);
        $visible   = array_slice($apts, 0, $MAX_PER_DAY);
        $overflow  = $total - count($visible);

        $appointments = [];
        foreach ($visible as $apt) {
            $time = substr($apt['AptDateTime'], 11, 5); // 'HH:MM'
            $appointments[] = [
                'aptNum'       => (int) $apt['AptNum'],
                'time'         => $time,
                'procDescript' => $apt['ProcDescript'],
            ];
            $allProcDescs[] = $apt['ProcDescript'];
        }

        if ($overflow > 0) {
            $appointments[] = [
                'aptNum'       => null,
                'time'         => null,
                'procDescript' => "+{$overflow} เพิ่มเติม — ติดต่อคลินิก",
                'overflow'     => true,
            ];
        }

        $days[] = [
            'date'         => $date,
            'appointments' => $appointments,
        ];
    }

    // -----------------------------------------------------------------------
    // 4. Resolve hero image (Plan §5.4 / FR-14); filename only → compose URL
    // -----------------------------------------------------------------------
    $today    = date('md');      // 'MMDD'
    $filename = resolveImageRule($pdo, $allProcDescs, $today);
    $imageUrl = IMAGE_BASE_URL . '/' . $filename;

    jsonResponse([
        'days'      => $days,
        'image_url' => $imageUrl,
    ]);

} catch (Throwable $e) {
    error_log("line-oa/next-appointments error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal Server Error', 'message' => 'An unexpected error occurred'], 500);
}

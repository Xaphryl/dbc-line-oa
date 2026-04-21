<?php
// All SQL for the LINE OA feature lives here — single-file portability discipline (Plan §4.5 / §7.2)
// Plan §7.4 canonical query reproduced verbatim; all other queries follow the same pattern.
//
// This file also provides requireLineOaAuth() so every endpoint gets it via a single include.

require_once __DIR__ . '/../config.php';

if (!defined('LINE_OA_API_KEY')) {
    define('LINE_OA_API_KEY', getenv('LINE_OA_API_KEY') ?: 'change-me-line-oa');
}

if (!defined('IMAGE_BASE_URL')) {
    define('IMAGE_BASE_URL', rtrim(getenv('IMAGE_BASE_URL') ?: 'https://dentalbuddyclinic.com/line-oa/images', '/'));
}

/**
 * Require X-Line-Oa-Key header authentication.
 * Set LINE_OA_API_KEY in .env on Hostinger. The Cloudflare Worker sends this key.
 */
function requireLineOaAuth(): void
{
    $key = $_SERVER['HTTP_X_LINE_OA_KEY'] ?? '';
    if ($key === '' || $key !== LINE_OA_API_KEY) {
        // helpers.php jsonResponse is available (caller must include helpers.php first)
        jsonResponse(['error' => 'Unauthorized', 'message' => 'Invalid or missing X-Line-Oa-Key header'], 401);
    }
}

/**
 * IMPORTANT: The Thai national ID column in the `patient` table is `CitizenID` (VARCHAR 15).
 * The FD7 schema does not have a `national_id` or `SSN` column on the `patient` table that stores
 * the 13-digit Thai national ID. `CitizenID` is the correct column name.
 * `SSN` exists on other tables (e.g. patient_ext) and stores something different.
 *
 * If the Hostinger copy differs, change ONLY this constant:
 */
define('PATIENT_NATIONAL_ID_COLUMN', 'CitizenID');

// ---------------------------------------------------------------------------
// 1. resolve-patient — look up PatNum by line_user_id
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to find a patient by line_user_id.
 * Expects line_user_id to be non-empty (validated by caller).
 */
function sql_resolve_patient(string $lineUserId): array
{
    $sql = "
        SELECT PatNum
        FROM patient
        WHERE line_user_id = :line_user_id
          AND line_user_id != ''
        LIMIT 1
    ";
    return [$sql, [':line_user_id' => $lineUserId]];
}

// ---------------------------------------------------------------------------
// 2. next-appointments — canonical query (Plan §7.4); LIMIT removed per plan
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] for all future scheduled appointments for a patient.
 * Guardrails enforced IN SQL (Plan §3.1–§3.3):
 *   - AptDateTime > NOW() + INTERVAL 7 HOUR  (Thai time — appointments stored as UTC+7)
 *   - AptStatus = 1
 *   - e_type IS NULL OR e_type != 'Deleted'  (soft-delete flag used by FD7 / nsync)
 *   - provider.Abbr NOT IN ('CEO', 'ตาราง')
 *
 * Timezone note: Hostinger MySQL runs at UTC. FD7 stores AptDateTime in Thai local time
 * (Asia/Bangkok, UTC+7) without timezone info. Shifting NOW() by +7h gives the correct
 * Thai "current time" for comparison against the stored values.
 *
 * Soft-delete note: FD7 marks cancelled/removed appointments with e_type = 'Deleted'
 * while leaving AptStatus = 1 unchanged. The AptStatus filter alone is insufficient.
 * All nsync queries (appointments/list.php, patients/detail.php, patients/list.php) use
 * this same guard — we must match them (ref: LINE OA autoreply thread in nsync project).
 */
function sql_next_appointments(int $patNum): array
{
    $sql = "
        SELECT
          a.AptNum,
          a.AptDateTime,
          a.ProcDescript,
          a.Note,
          pr.Abbr AS provider_abbr
        FROM appointment a
        JOIN provider pr ON a.ProvNum = pr.ProvNum
        JOIN patient p ON a.PatNum = p.PatNum
        WHERE p.PatNum = :patNum
          AND a.AptDateTime > NOW() + INTERVAL 7 HOUR
          AND a.AptStatus = 1
          AND (a.e_type IS NULL OR a.e_type != 'Deleted')
          AND pr.Abbr NOT IN ('CEO', 'ตาราง')
        ORDER BY a.AptDateTime ASC
    ";
    return [$sql, [':patNum' => $patNum]];
}

// ---------------------------------------------------------------------------
// 3. image-rule — resolve filename for a given date and procedure descriptions
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to find the best matching image rule.
 * Caller passes:
 *   $dateMMDD  — today as 'MMDD' (e.g. '0419')
 *   $procDescs — array of ProcDescript strings from that day's appointments
 *
 * Priority order: treatment (lowest priority number) > seasonal > default.
 * Only active rules are considered.
 *
 * NOTE: Treatment matching uses individual LIKE clauses built from $procDescs.
 * The match_value strings come from the DB (trusted), not from user input.
 * We use a separate query per rule_type to keep parameterisation simple and safe.
 */
function sql_image_rule_treatment(array $procDescs): array
{
    if (empty($procDescs)) {
        return ['SELECT NULL AS filename LIMIT 0', []];
    }

    // Check whether any ProcDescript contains the rule's match_value as a substring.
    // match_value (from DB, admin-managed) is the needle; each ProcDescript is the haystack.
    // LOCATE(needle, haystack) > 0 returns true when needle is found inside haystack.
    // match_value is NOT user input — it comes from the DB — so no additional parameterisation
    // risk exists for that side. The ProcDescript values are parameterised as :desc{i}.
    $conditions = [];
    $params = [];
    foreach ($procDescs as $i => $desc) {
        $conditions[] = "LOCATE(match_value, :desc{$i}) > 0";
        $params[":desc{$i}"] = $desc;
    }
    $likeClauses = implode(' OR ', $conditions);

    $sql = "
        SELECT filename
        FROM line_card_image
        WHERE rule_type = 'treatment'
          AND active = 1
          AND ({$likeClauses})
        ORDER BY priority ASC
        LIMIT 1
    ";
    return [$sql, $params];
}

function sql_image_rule_seasonal(string $dateMMDD): array
{
    // Two cases handled:
    //   Normal period  (season_start <= season_end): e.g. 0401–0420 → Apr 1–Apr 20
    //   Year-spanning  (season_start >  season_end): e.g. 1225–0105 → Dec 25–Jan 5
    // Both rely on the same :mmdd parameter (bound twice under different names).
    $sql = "
        SELECT filename
        FROM line_card_image
        WHERE rule_type = 'seasonal'
          AND active = 1
          AND (
              -- Normal period: start ≤ today ≤ end (within same calendar year)
              (season_start <= season_end
               AND season_start <= :mmdd1
               AND season_end   >= :mmdd2)
              OR
              -- Year-spanning: today is after start OR before end
              (season_start > season_end
               AND (:mmdd3 >= season_start OR :mmdd4 <= season_end))
          )
        ORDER BY priority ASC
        LIMIT 1
    ";
    return [$sql, [
        ':mmdd1' => $dateMMDD,
        ':mmdd2' => $dateMMDD,
        ':mmdd3' => $dateMMDD,
        ':mmdd4' => $dateMMDD,
    ]];
}

function sql_image_rule_default(): array
{
    $sql = "
        SELECT filename
        FROM line_card_image
        WHERE rule_type = 'default'
          AND active = 1
        ORDER BY priority ASC
        LIMIT 1
    ";
    return [$sql, []];
}

// ---------------------------------------------------------------------------
// 4. resolve-by-phone — find candidate PatNums by phone (digits-only match)
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to find patients whose HmPhone or WirelessPhone,
 * after stripping non-digits, matches $phoneDigits (10-digit Thai mobile).
 *
 * Phone normalization: REGEXP_REPLACE strips all non-digit characters.
 * MySQL 8 supports REGEXP_REPLACE natively.
 */
function sql_resolve_by_phone(string $phoneDigits): array
{
    $sql = "
        SELECT PatNum
        FROM patient
        WHERE REGEXP_REPLACE(HmPhone,      '[^0-9]', '') = :phone1
           OR REGEXP_REPLACE(WirelessPhone,'[^0-9]', '') = :phone2
        LIMIT 20
    ";
    return [$sql, [':phone1' => $phoneDigits, ':phone2' => $phoneDigits]];
}

// ---------------------------------------------------------------------------
// 5. verify-and-bind — match national ID against candidate set
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to match a national ID against a set of candidate PatNums.
 * Uses the PATIENT_NATIONAL_ID_COLUMN constant so the column name is swappable.
 *
 * $candidateNums — array of int PatNums (already validated as integers by caller)
 * $nationalId    — 13-digit string (validated by caller)
 */
function sql_verify_national_id(array $candidateNums, string $nationalId): array
{
    // Build integer-safe IN clause — values cast to int, then imploded
    $safePlaceholders = implode(',', array_map('intval', $candidateNums));
    $col = PATIENT_NATIONAL_ID_COLUMN;

    $sql = "
        SELECT PatNum, FName, LName
        FROM patient
        WHERE PatNum IN ({$safePlaceholders})
          AND `{$col}` = :national_id
        LIMIT 1
    ";
    return [$sql, [':national_id' => $nationalId]];
}

// ---------------------------------------------------------------------------
// 6. confirm-bind — idempotent write of line_user_id to patient row
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to read the current line_user_id for a patient.
 * Used to implement the idempotent check before writing (Plan §3 Guardrail 7).
 */
function sql_get_patient_line_binding(int $patNum): array
{
    $sql = "
        SELECT PatNum, FName, LName, line_user_id
        FROM patient
        WHERE PatNum = :patNum
        LIMIT 1
    ";
    return [$sql, [':patNum' => $patNum]];
}

/**
 * Returns [sql, params] to write line_user_id — only call after idempotency check.
 * Overwrites any existing binding (safe because the patient proved identity via
 * phone + national-ID verification before this step is reached).
 */
function sql_bind_line_user(int $patNum, string $lineUserId): array
{
    $sql = "
        UPDATE patient
        SET line_user_id = :line_user_id
        WHERE PatNum = :patNum
    ";
    return [$sql, [':line_user_id' => $lineUserId, ':patNum' => $patNum]];
}

/**
 * Returns [sql, params] to clear the line_user_id for a given LINE user ID.
 * Used by unbind-patient.php before re-registration.
 * Idempotent — 0 rows updated is not an error.
 */
function sql_unbind_patient(string $lineUserId): array
{
    $sql = "
        UPDATE patient
        SET line_user_id = ''
        WHERE line_user_id = :line_user_id
    ";
    return [$sql, [':line_user_id' => $lineUserId]];
}

// ---------------------------------------------------------------------------
// 7. users-upsert — insert/update LINE user row for follow/unfollow events
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to upsert a row in line_event_log for follow/unfollow.
 * This is a minimal users table using line_event_log for audit; a separate
 * line_users table is not required in Phase 1 (GAS behaviour replicated via log).
 *
 * For follow: status='follow'; for unfollow: status='unfollow'.
 */
function sql_upsert_line_user_event(
    string $eventId,
    string $lineUserId,
    string $eventType,
    string $status,
    ?int $patNum,
    ?int $ms
): array {
    $sql = "
        INSERT INTO line_event_log
            (event_id, line_user_id, pat_num, event_type, status, ms)
        VALUES
            (:event_id, :line_user_id, :pat_num, :event_type, :status, :ms)
        ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            ms     = VALUES(ms)
    ";
    return [$sql, [
        ':event_id'    => $eventId,
        ':line_user_id'=> $lineUserId,
        ':pat_num'     => $patNum,
        ':event_type'  => $eventType,
        ':status'      => $status,
        ':ms'          => $ms,
    ]];
}

// ---------------------------------------------------------------------------
// 8. log-event — append an audit row to line_event_log
// ---------------------------------------------------------------------------

/**
 * Returns [sql, params] to insert an event log row.
 * No PII: only line_user_id (LINE token), pat_num (internal), event_type, status, ms.
 */
function sql_log_event(
    string $eventId,
    string $lineUserId,
    string $eventType,
    string $status,
    ?int $patNum,
    ?int $ms
): array {
    $sql = "
        INSERT IGNORE INTO line_event_log
            (event_id, line_user_id, pat_num, event_type, status, ms)
        VALUES
            (:event_id, :line_user_id, :pat_num, :event_type, :status, :ms)
    ";
    return [$sql, [
        ':event_id'    => $eventId,
        ':line_user_id'=> $lineUserId,
        ':pat_num'     => $patNum,
        ':event_type'  => $eventType,
        ':status'      => $status,
        ':ms'          => $ms,
    ]];
}

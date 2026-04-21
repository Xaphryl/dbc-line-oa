/**
 * Central constants module.
 * Per portability discipline §4: all user-visible strings live here,
 * not hardcoded in handlers.
 */

export const TRIGGER_NEXT_APPOINTMENT = 'นัดครั้งต่อไป';
export const USER_KEYWORD_REGEX     = /^id$/i;
export const CANCEL_KEYWORD_REGEX   = /^ยกเลิก$/;
export const REGISTER_KEYWORD_REGEX = /^ลงทะเบียน$/;
/** Sent as a message action from the S2 card footer. */
export const BACK_KEYWORD = 'ย้อนกลับ';

// Dedup + session TTLs (seconds)
export const DEDUP_TTL_SEC    = 300;  // 5 min — LINE retry window is ~3 min
export const SESSION_TTL_SEC  = 600;  // 10 min — verification flow session


export const STRINGS = {
  // ── Appointment carousel ───────────────────────────────────────────────────
  NEXT_APT_ALT:     'นัดครั้งต่อไปของคุณ',
  NEXT_APT_HEADING: 'นัดครั้งต่อไปของคุณ',
  OVERFLOW_SUFFIX:  'เพิ่มเติม — ติดต่อคลินิก',
  CONTACT_CLINIC:   'ติดต่อคลินิก',

  // ── Empty state ────────────────────────────────────────────────────────────
  EMPTY_STATE_BODY: 'ยังไม่มีนัดในระบบ\nติดต่อคลินิกเพื่อทำนัดใหม่',

  // ── Registration S1 — phone entry ──────────────────────────────────────────
  VERIFY_HEADING: 'ยืนยันตัวตน',
  VERIFY_STEP:    'ขั้นตอน 1 จาก 3',
  VERIFY_BODY:    'กรุณาพิมพ์เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับคลินิก',
  PDPA_NOTE:      'ข้อมูลของท่านใช้เพื่อยืนยันตัวตนเท่านั้น ตามนโยบายความเป็นส่วนตัว (PDPA) คลินิกไม่เก็บข้อมูลส่วนบุคคลในระบบ LINE',
  VERIFY_HINTS:   'พิมพ์ "ยกเลิก" เพื่อยกเลิกการลงทะเบียน\nหรือ "id" เพื่อรับรหัสเพื่อแจ้งทางคลินิก',

  // ── Registration S1 — phone not found ─────────────────────────────────────
  PHONE_NOT_FOUND: 'ไม่พบเบอร์โทรศัพท์ในระบบ กรุณาลองอีกครั้ง\nหรือพิมพ์ "ยกเลิก" เพื่อยกเลิก',

  // ── Registration S2 — national ID entry ───────────────────────────────────
  ASK_NATIONAL_ID_HEADING:     'ยืนยันตัวตน',
  ASK_NATIONAL_ID_STEP:        'ขั้นตอน 2 จาก 3',
  ASK_NATIONAL_ID_PHONE_LABEL: 'เบอร์โทรที่ระบุ',
  ASK_NATIONAL_ID_BODY:        'กรุณาพิมพ์เลขบัตรประชาชน 13 หลัก\nพิมพ์ "ยกเลิก" เพื่อยกเลิก',
  BACK_BUTTON_LABEL:           'ย้อนกลับ',

  // ── Registration S2 — national ID mismatch ────────────────────────────────
  NATIONAL_ID_MISMATCH: 'ไม่พบเลขบัตรประชาชนในระบบ กรุณาลองอีกครั้ง\nหรือพิมพ์ "ยกเลิก" เพื่อยกเลิก',

  // ── Registration S3 — name confirm ────────────────────────────────────────
  CONFIRM_NAME_HEADING:   'ยืนยันตัวตน',
  CONFIRM_NAME_STEP:      'ขั้นตอน 3 จาก 3',
  CONFIRM_NAME_QUESTION:  'ท่านคือบุคคลนี้ใช่หรือไม่?',
  CONFIRM_NAME_LABEL:     'ชื่อ',
  CONFIRM_PHONE_LABEL:    'เบอร์โทร',
  CONFIRM_ID_LABEL:       'บัตรประชาชน',
  CONFIRM_YES:            'ใช่',
  CONFIRM_NO:             'ไม่ใช่',

  // ── Registration S3 — loop reminder (non-ใช่/ไม่ใช่ input) ────────────────
  S3_LOOP_REMINDER: 'กรุณายืนยันว่าข้อมูลข้างต้นถูกต้องหรือไม่\nโดยการเลือก "ใช่" หรือ "ไม่ใช่"',

  // ── Registration S3 — patient denied (ไม่ใช่) ─────────────────────────────
  NO_CONFIRM_REPLY: 'กรุณาติดต่อคลินิกโดยตรง\nหรือพิมพ์ "ลงทะเบียน" เพื่อเริ่มการยืนยันตัวตนใหม่อีกครั้ง',

  // ── Bind success ──────────────────────────────────────────────────────────
  BIND_SUCCESS_HEADING: 'เชื่อมบัญชีสำเร็จ',
  BIND_SUCCESS_BODY:    'บัญชีของคุณถูกเชื่อมกับ LINE เรียบร้อยแล้ว\nกำลังแสดงนัดของคุณ...',

  // ── Bind conflict (kept for unexpected 409 edge case) ─────────────────────
  BIND_CONFLICT: 'เกิดข้อผิดพลาดในการเชื่อมบัญชี กรุณาติดต่อคลินิก',

  // ── Cancel ────────────────────────────────────────────────────────────────
  CANCEL_SUCCESS: 'ยกเลิกการยืนยันตัวตนแล้ว\nพิมพ์ "ลงทะเบียน" เพื่อเริ่มต้นใหม่',

  // ── "id" keyword reply ────────────────────────────────────────────────────
  USER_KEYWORD_REPLY_PREFIX: 'LINE User ID ของคุณคือ:\n',
  USER_KEYWORD_REPLY_SUFFIX: '\n\nกรุณาส่ง ID นี้ให้เจ้าหน้าที่คลินิกเพื่อเชื่อมบัญชี\nหลังจากเจ้าหน้าที่ดำเนินการแล้ว พิมพ์ "นัดครั้งต่อไป" เพื่อดูนัดของคุณ',

  // ── Generic error ─────────────────────────────────────────────────────────
  GENERIC_ERROR: 'ระบบขัดข้อง กรุณาลองใหม่ภายหลัง\nหรือติดต่อคลินิก',
} as const;

/**
 * Central constants module.
 * Per portability discipline §4: all user-visible strings live here,
 * not hardcoded in handlers.
 */

export const TRIGGER_NEXT_APPOINTMENT = 'นัดครั้งต่อไป';
export const USER_KEYWORD_REGEX = /^user$/i;

// Dedup + session TTLs (seconds)
export const DEDUP_TTL_SEC = 300; // 5 min — LINE retry window is ~3 min
export const SESSION_TTL_SEC = 600; // 10 min — verification flow session

export const STRINGS = {
  // Carousel alt text
  NEXT_APT_ALT: 'นัดครั้งต่อไปของคุณ',

  // Bubble heading
  NEXT_APT_HEADING: 'นัดครั้งต่อไปของคุณ',

  // Overflow hint (append to bubble body when >3 appts on same day)
  // Usage: `+${n} เพิ่มเติม — ติดต่อคลินิก`
  OVERFLOW_SUFFIX: 'เพิ่มเติม — ติดต่อคลินิก',

  // Footer button
  CONTACT_CLINIC: 'ติดต่อคลินิก',

  // Empty state
  EMPTY_STATE_BODY: 'ยังไม่มีนัดในระบบ\nติดต่อคลินิกเพื่อทำนัดใหม่',

  // Verify prompt (unbound user)
  VERIFY_HEADING: 'ยืนยันตัวตน',
  VERIFY_BODY: 'กรุณาพิมพ์เบอร์โทรศัพท์ที่ลงทะเบียนไว้\n(มือถือหรือบ้าน)\n\nหรือพิมพ์ "user" เพื่อรับ LINE User ID\nสำหรับให้เจ้าหน้าที่เชื่อมบัญชีด้วยตนเอง',

  // Phone not found
  PHONE_NOT_FOUND: 'ไม่พบเบอร์โทรศัพท์ในระบบ\nกรุณาลองอีกครั้ง หรือติดต่อคลินิก',

  // Ask national ID
  ASK_NATIONAL_ID_HEADING: 'ยืนยันตัวตน',
  ASK_NATIONAL_ID_BODY: 'กรุณาพิมพ์เลขบัตรประชาชน 13 หลัก',

  // National ID mismatch
  NATIONAL_ID_MISMATCH: 'ข้อมูลไม่ตรงกัน\nกรุณาลองอีกครั้ง',

  // Confirm name
  CONFIRM_NAME_HEADING: 'ยืนยันตัวตน',
  // Used as: `คุณคือคุณ ${fname} ${lname} ใช่หรือไม่?`
  CONFIRM_NAME_PREFIX: 'คุณคือคุณ',
  CONFIRM_NAME_SUFFIX: 'ใช่หรือไม่?',
  CONFIRM_YES: 'ใช่',
  CONFIRM_NO: 'ไม่ใช่',

  // Bind success
  BIND_SUCCESS_HEADING: 'เชื่อมบัญชีสำเร็จ',
  BIND_SUCCESS_BODY: 'บัญชีของคุณถูกเชื่อมกับ LINE เรียบร้อยแล้ว\nกำลังแสดงนัดของคุณ...',

  // Bind conflict (line_user_id already bound to different patient)
  BIND_CONFLICT: 'บัญชี LINE นี้เชื่อมกับผู้ป่วยรายอื่นแล้ว\nกรุณาติดต่อคลินิก',

  // "user" keyword reply
  USER_KEYWORD_REPLY_PREFIX: 'LINE User ID ของคุณคือ:\n',
  USER_KEYWORD_REPLY_SUFFIX: '\n\nกรุณาส่ง ID นี้ให้เจ้าหน้าที่คลินิก\nเพื่อเชื่อมบัญชีของคุณ',

  // Generic error
  GENERIC_ERROR: 'ระบบขัดข้อง กรุณาลองใหม่ภายหลัง\nหรือติดต่อคลินิก',
} as const;

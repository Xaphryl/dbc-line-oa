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

// Reserved for Phase 3+ — leave file structure in place.
// Phase 3 will fill user-visible Thai strings here.
export const STRINGS = {
  // e.g. BIND_PROMPT_TITLE, EMPTY_STATE_BODY, etc.
} as const;

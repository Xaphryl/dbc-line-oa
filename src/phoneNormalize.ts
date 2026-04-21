/**
 * Phone number and national ID utilities — pure, no side effects.
 */

/**
 * Strip all non-digit characters from a phone input.
 * Example: "081-234-5678" → "0812345678"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Mask a 13-digit Thai national ID for display in Flex cards.
 *
 * Thai ID format groups (1-4-5-2-1):
 *   X - XXXX - XXXXX - XX - X
 *
 * Masking rule (user spec): show positions 1–5 and 11–13, hide 6–10.
 * Example: "1234567890123" → "1-2345-XXXXX-12-3"
 *
 * Returns the original string unchanged if it is not exactly 13 digits.
 */
export function maskNationalId(id: string): string {
  const digits = id.replace(/\D/g, '');
  if (digits.length !== 13) return id;

  const g1 = digits[0];                        // 1  digit  — visible
  const g2 = digits.slice(1, 5);               // 4  digits — visible
  const g3 = 'XXXXX';                          // 5  digits — hidden (positions 6–10)
  const g4 = digits.slice(10, 12);             // 2  digits — visible (positions 11–12)
  const g5 = digits[12];                       // 1  digit  — visible (position 13)

  return `${g1}-${g2}-${g3}-${g4}-${g5}`;
}

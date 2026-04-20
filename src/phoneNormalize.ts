/**
 * Phone number normalizer — pure, no side effects.
 */

/**
 * Strip all non-digit characters.
 * Example: "081-234-5678" → "0812345678"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

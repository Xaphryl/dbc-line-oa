/**
 * Thai phone number formatter — pure, no side effects.
 * Input: digits-only string (already normalised by normalizePhone).
 * Output: formatted string for display in Flex cards.
 *
 * Thai mobile (10 digits): 0XX-XXX-XXXX  e.g. 095-879-1663
 * Thai landline (9 digits): 0X-XXX-XXXX   e.g. 02-123-4567
 * Other lengths: returned as-is.
 */
export function formatThaiPhone(digits: string): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

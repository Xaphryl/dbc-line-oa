/**
 * Thai datetime formatters for LINE Flex display.
 * All pure functions — no side effects, no I/O.
 * Operates on local time (server timezone must be Bangkok / UTC+7).
 */

const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
const MONTHS   = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** Format just the time portion, zero-padded. Example: "14:30" */
export function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/** Format date only (no time). Example: "วันเสาร์ที่ 25 เม.ย. 2569" */
export function formatThaiDate(date: Date): string {
  const weekday     = WEEKDAYS[date.getDay()];
  const day         = date.getDate();
  const month       = MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `วัน${weekday}ที่ ${day} ${month} ${buddhistYear}`;
}

/**
 * Format date + time. Example: "วันเสาร์ที่ 25 เม.ย. 2569 เวลา 14:30 น."
 */
export function formatThaiDateTime(date: Date): string {
  return `${formatThaiDate(date)} เวลา ${formatTime(date)} น.`;
}

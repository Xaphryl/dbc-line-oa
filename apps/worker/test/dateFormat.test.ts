import { describe, it, expect } from 'vitest';
import { formatThaiDate, formatThaiDateTime, formatTime } from '../src/dateFormat';

describe('formatThaiDate', () => {
  it('formats Saturday April 25 2026 correctly', () => {
    expect(formatThaiDate(new Date(2026, 3, 25, 14, 30))).toBe('วันเสาร์ที่ 25 เม.ย. 2569');
  });

  it('formats Thursday January 1 2026 correctly', () => {
    expect(formatThaiDate(new Date(2026, 0, 1, 9, 5))).toBe('วันพฤหัสที่ 1 ม.ค. 2569');
  });

  it('formats Wednesday December 31 2025 correctly', () => {
    expect(formatThaiDate(new Date(2025, 11, 31, 23, 59))).toBe('วันพุธที่ 31 ธ.ค. 2568');
  });
});

describe('formatThaiDateTime', () => {
  it('formats date and time together', () => {
    expect(formatThaiDateTime(new Date(2026, 3, 25, 14, 30))).toBe(
      'วันเสาร์ที่ 25 เม.ย. 2569 เวลา 14:30 น.',
    );
  });
});

describe('formatTime', () => {
  it('formats 14:30 correctly', () => {
    expect(formatTime(new Date(2026, 3, 25, 14, 30))).toBe('14:30');
  });

  it('zero-pads single-digit hour and minute', () => {
    expect(formatTime(new Date(2026, 3, 25, 9, 5))).toBe('09:05');
  });

  it('formats midnight as 00:00', () => {
    expect(formatTime(new Date(2026, 3, 25, 0, 0))).toBe('00:00');
  });
});

import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../src/phoneNormalize';

describe('normalizePhone', () => {
  it('strips dashes', () => {
    expect(normalizePhone('081-234-5678')).toBe('0812345678');
  });

  it('strips spaces', () => {
    expect(normalizePhone('081 234 5678')).toBe('0812345678');
  });

  it('passes through already-clean number', () => {
    expect(normalizePhone('0812345678')).toBe('0812345678');
  });

  it('strips parentheses', () => {
    expect(normalizePhone('(081)2345678')).toBe('0812345678');
  });

  it('returns empty string for empty input', () => {
    expect(normalizePhone('')).toBe('');
  });

  it('returns empty string for letters-only input', () => {
    expect(normalizePhone('abc')).toBe('');
  });
});

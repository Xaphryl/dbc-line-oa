import { describe, it, expect } from 'vitest';
import { buildNextAppointmentFlex } from '../src/flex/nextAppointment';
import { buildVerifyPromptFlex } from '../src/flex/verifyPrompt';
import { buildConfirmNameFlex } from '../src/flex/confirmName';
import { buildEmptyStateFlex } from '../src/flex/emptyState';
import type {
  NextAppointmentPayload,
  FlexCarousel,
  FlexBubble,
  FlexBox,
  FlexButton,
  FlexText,
  FlexURIAction,
  FlexMessageAction,
} from '../src/types';
import { STRINGS } from '../src/constants';

const IMAGE_URL = 'https://dentalbuddyclinic.com/line-oa/images/test.jpg';
const PHONE = '038-001-0001';

// Helper to build appointment rows
const appt = (dateStr: string, time: string, proc: string, n: number) => ({
  aptNum: n,
  aptDateTime: `${dateStr}T${time}:00`,
  procDescript: proc,
});

// Helper to find all text values in a bubble's body contents (flat search)
function allBodyTexts(bubble: FlexBubble): string[] {
  const texts: string[] = [];
  function walk(contents: unknown[]): void {
    for (const item of contents) {
      const c = item as Record<string, unknown>;
      if (c.type === 'text') texts.push(c.text as string);
      if (Array.isArray(c.contents)) walk(c.contents as unknown[]);
    }
  }
  if (bubble.body) walk(bubble.body.contents);
  return texts;
}

// ── nextAppointment ──────────────────────────────────────────────────────────

describe('buildNextAppointmentFlex', () => {
  it('single day, 1 appointment → carousel with 1 bubble', () => {
    const payload: NextAppointmentPayload = {
      days: [{ date: '2026-04-25', appointments: [appt('2026-04-25', '14:30', 'Cleaning', 1)] }],
      imageUrl: IMAGE_URL,
    };
    const msg = buildNextAppointmentFlex(payload, PHONE);
    expect(msg.type).toBe('flex');
    const carousel = msg.contents as FlexCarousel;
    expect(carousel.type).toBe('carousel');
    expect(carousel.contents).toHaveLength(1);

    const bubble = carousel.contents[0]!;
    expect(bubble.size).toBe('kilo');

    const texts = allBodyTexts(bubble);
    expect(texts.some((t) => t.includes('เสาร์'))).toBe(true); // Apr 25 2026 is Saturday
    expect(texts.some((t) => t === '14:30')).toBe(true);
  });

  it('single day, 2 appointments → 1 bubble with 2 time rows', () => {
    const payload: NextAppointmentPayload = {
      days: [
        {
          date: '2026-04-25',
          appointments: [
            appt('2026-04-25', '09:00', 'Checkup', 1),
            appt('2026-04-25', '10:00', 'X-Ray', 2),
          ],
        },
      ],
      imageUrl: IMAGE_URL,
    };
    const msg = buildNextAppointmentFlex(payload, PHONE);
    const carousel = msg.contents as FlexCarousel;
    const texts = allBodyTexts(carousel.contents[0]!);
    expect(texts.filter((t) => /^\d{2}:\d{2}$/.test(t))).toHaveLength(2);
  });

  it('single day, 4 appointments → 3 time rows + overflow row with "+1"', () => {
    const payload: NextAppointmentPayload = {
      days: [
        {
          date: '2026-04-25',
          appointments: [
            appt('2026-04-25', '09:00', 'Checkup', 1),
            appt('2026-04-25', '10:00', 'X-Ray', 2),
            appt('2026-04-25', '11:00', 'Filling', 3),
            appt('2026-04-25', '13:00', 'Crown', 4),
          ],
        },
      ],
      imageUrl: IMAGE_URL,
    };
    const msg = buildNextAppointmentFlex(payload, PHONE);
    const carousel = msg.contents as FlexCarousel;
    const texts = allBodyTexts(carousel.contents[0]!);
    expect(texts.filter((t) => /^\d{2}:\d{2}$/.test(t))).toHaveLength(3);
    expect(texts.some((t) => t.startsWith('+1'))).toBe(true);
  });

  it('two different days → carousel with 2 bubbles', () => {
    const payload: NextAppointmentPayload = {
      days: [
        { date: '2026-04-25', appointments: [appt('2026-04-25', '09:00', 'Checkup', 1)] },
        { date: '2026-05-02', appointments: [appt('2026-05-02', '10:00', 'Filling', 2)] },
      ],
      imageUrl: IMAGE_URL,
    };
    const msg = buildNextAppointmentFlex(payload, PHONE);
    const carousel = msg.contents as FlexCarousel;
    expect(carousel.contents).toHaveLength(2);
  });

  it('caps at 12 bubbles when 13 days are supplied', () => {
    const days = Array.from({ length: 13 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      appointments: [appt(`2026-05-${String(i + 1).padStart(2, '0')}`, '09:00', 'Checkup', i + 1)],
    }));
    const payload: NextAppointmentPayload = { days, imageUrl: IMAGE_URL };
    const msg = buildNextAppointmentFlex(payload, PHONE);
    const carousel = msg.contents as FlexCarousel;
    expect(carousel.contents).toHaveLength(12);
  });

  it('footer contact button URI starts with tel:', () => {
    const payload: NextAppointmentPayload = {
      days: [{ date: '2026-04-25', appointments: [appt('2026-04-25', '09:00', 'Checkup', 1)] }],
      imageUrl: IMAGE_URL,
    };
    const msg = buildNextAppointmentFlex(payload, PHONE);
    const carousel = msg.contents as FlexCarousel;
    const bubble = carousel.contents[0]!;
    const footerBtn = bubble.footer!.contents[0] as FlexButton;
    expect((footerBtn.action as FlexURIAction).uri).toMatch(/^tel:/);
  });
});

// ── verifyPrompt ─────────────────────────────────────────────────────────────

describe('buildVerifyPromptFlex', () => {
  it('returns type flex', () => {
    const msg = buildVerifyPromptFlex(IMAGE_URL, PHONE);
    expect(msg.type).toBe('flex');
  });

  it('contents is a bubble, not a carousel', () => {
    const msg = buildVerifyPromptFlex(IMAGE_URL, PHONE);
    expect(msg.contents.type).toBe('bubble');
  });

  it('body contains verify heading text', () => {
    const msg = buildVerifyPromptFlex(IMAGE_URL, PHONE);
    const bubble = msg.contents as FlexBubble;
    const texts = allBodyTexts(bubble);
    expect(texts.some((t) => t === STRINGS.VERIFY_HEADING)).toBe(true);
  });
});

// ── confirmName ──────────────────────────────────────────────────────────────

describe('buildConfirmNameFlex', () => {
  it('footer has 2 buttons', () => {
    const msg = buildConfirmNameFlex('สมใจ', 'ใจดี', IMAGE_URL, PHONE);
    const bubble = msg.contents as FlexBubble;
    const footerContents = bubble.footer!.contents;
    const buttons = footerContents.filter((c) => (c as FlexButton).type === 'button');
    expect(buttons).toHaveLength(2);
  });

  it('first button action text is ใช่', () => {
    const msg = buildConfirmNameFlex('สมใจ', 'ใจดี', IMAGE_URL, PHONE);
    const bubble = msg.contents as FlexBubble;
    const firstBtn = bubble.footer!.contents[0] as FlexButton;
    expect((firstBtn.action as FlexMessageAction).text).toBe('ใช่');
  });

  it('body text includes fname and lname', () => {
    const msg = buildConfirmNameFlex('สมใจ', 'ใจดี', IMAGE_URL, PHONE);
    const bubble = msg.contents as FlexBubble;
    const texts = allBodyTexts(bubble);
    expect(texts.some((t) => t.includes('สมใจ') && t.includes('ใจดี'))).toBe(true);
  });
});

// ── emptyState ───────────────────────────────────────────────────────────────

describe('buildEmptyStateFlex', () => {
  it('body contains ยังไม่มีนัดในระบบ', () => {
    const msg = buildEmptyStateFlex(IMAGE_URL, PHONE);
    const bubble = msg.contents as FlexBubble;
    const texts = allBodyTexts(bubble);
    expect(texts.some((t) => t.includes('ยังไม่มีนัดในระบบ'))).toBe(true);
  });
});

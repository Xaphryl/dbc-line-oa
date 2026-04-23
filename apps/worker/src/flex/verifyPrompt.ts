/**
 * S1 — Verify-prompt Flex card (phone entry).
 * Pure, no side effects.
 *
 * Shown when:
 *  (a) an unbound user sends "นัดครั้งต่อไป"
 *  (b) any user sends "ลงทะเบียน"
 *  (c) S2 "ย้อนกลับ" resets to S1
 */

import type { FlexMessage, FlexBox, FlexText, FlexSeparator } from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage, contactButton, bubbleStyles } from './common';

export function buildVerifyPromptFlex(imageUrl: string, clinicPhone: string): FlexMessage {
  const body: FlexBox = {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    contents: [
      // Heading + step indicator
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: STRINGS.VERIFY_HEADING,
            weight: 'bold',
            color: BRAND_COLOR,
            flex: 1,
          } satisfies FlexText,
          {
            type: 'text',
            text: STRINGS.VERIFY_STEP,
            size: 'xs',
            color: '#888888',
            align: 'end',
          } satisfies FlexText,
        ],
      },
      { type: 'separator' } satisfies FlexSeparator,
      // Instruction
      {
        type: 'text',
        text: STRINGS.VERIFY_BODY,
        wrap: true,
        size: 'sm',
      } satisfies FlexText,
      { type: 'separator' } satisfies FlexSeparator,
      // PDPA note
      {
        type: 'text',
        text: STRINGS.PDPA_NOTE,
        wrap: true,
        size: 'xxs',
        color: '#888888',
      } satisfies FlexText,
    ],
  };

  const footer: FlexBox = {
    type: 'box',
    layout: 'vertical',
    contents: [contactButton(clinicPhone)],
  };

  return {
    type: 'flex',
    altText: STRINGS.VERIFY_HEADING,
    contents: {
      type: 'bubble',
      size: BUBBLE_SIZE,
      // Only include hero when we have a valid URL; empty string → omit hero
      ...(imageUrl ? { hero: heroImage(imageUrl) } : {}),
      body,
      footer,
      styles: bubbleStyles(),
    },
  };
}

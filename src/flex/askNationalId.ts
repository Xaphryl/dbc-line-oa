/**
 * S2 — Ask-for-national-ID Flex card.
 * Pure, no side effects.
 *
 * Shows the phone number the patient already entered so they can verify it,
 * and offers a "ย้อนกลับ" button (message action) to return to S1.
 */

import type { FlexMessage, FlexBox, FlexText, FlexSeparator } from '../types';
import { STRINGS, BACK_KEYWORD } from '../constants';
import {
  BRAND_COLOR,
  MINT_COLOR,
  BODY_BG,
  BUBBLE_SIZE,
  BUTTON_COLOR,
  heroImage,
  tappableButton,
  contactButton,
  bubbleStyles,
} from './common';

export function buildAskNationalIDFlex(
  phone: string,       // pre-formatted e.g. "095-879-1663"
  imageUrl: string,
  clinicPhone: string,
): FlexMessage {
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
            text: STRINGS.ASK_NATIONAL_ID_HEADING,
            weight: 'bold',
            color: BRAND_COLOR,
            flex: 1,
          } satisfies FlexText,
          {
            type: 'text',
            text: STRINGS.ASK_NATIONAL_ID_STEP,
            size: 'xs',
            color: '#888888',
            align: 'end',
          } satisfies FlexText,
        ],
      },
      { type: 'separator' } satisfies FlexSeparator,
      // Phone recap
      {
        type: 'text',
        text: STRINGS.ASK_NATIONAL_ID_PHONE_LABEL,
        size: 'xs',
        color: '#888888',
      } satisfies FlexText,
      {
        type: 'text',
        text: phone,
        weight: 'bold',
        color: BRAND_COLOR,
        size: 'lg',
      } satisfies FlexText,
      { type: 'separator' } satisfies FlexSeparator,
      // Instruction + hints
      {
        type: 'text',
        text: STRINGS.ASK_NATIONAL_ID_BODY,
        wrap: true,
        size: 'sm',
      } satisfies FlexText,
    ],
  };

  // ย้อนกลับ button — mint bg, brand text, message action
  const backBtn = tappableButton(
    STRINGS.BACK_BUTTON_LABEL,
    { type: 'message', label: STRINGS.BACK_BUTTON_LABEL, text: BACK_KEYWORD },
    MINT_COLOR,
    BRAND_COLOR,
  );
  backBtn.flex = 1;

  // ติดต่อคลินิก button — pink bg, cream text, URI action
  const contactBtn = contactButton(clinicPhone);
  contactBtn.flex = 1;

  const footer: FlexBox = {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [backBtn, contactBtn],
  };

  return {
    type: 'flex',
    altText: STRINGS.ASK_NATIONAL_ID_HEADING,
    contents: {
      type: 'bubble',
      size: BUBBLE_SIZE,
      ...(imageUrl ? { hero: heroImage(imageUrl) } : {}),
      body,
      footer,
      styles: bubbleStyles(),
    },
  };
}

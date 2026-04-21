/**
 * S3 — Confirm-name Flex card.
 * Pure, no side effects.
 *
 * Shows the patient's name, formatted phone, and partially-masked national ID
 * so they can verify all three before confirming the binding.
 *
 * Footer: two tappable boxes instead of <button> elements for full colour control.
 *   ใช่   → pink  (#F492B8) bg, dark-green text
 *   ไม่ใช่ → mint  (#B7DEBF) bg, dark-green text
 */

import type { FlexMessage, FlexBox, FlexText, FlexSeparator } from '../types';
import { STRINGS } from '../constants';
import {
  BRAND_COLOR,
  MINT_COLOR,
  BUBBLE_SIZE,
  heroImage,
  tappableButton,
  bubbleStyles,
} from './common';

export function buildConfirmNameFlex(
  fname: string,
  lname: string,
  phone: string,       // formatted e.g. "095-879-1663"
  nationalId: string,  // masked e.g. "1-2345-XXXXX-12-3"
  imageUrl: string,
  _clinicPhone: string,
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
            text: STRINGS.CONFIRM_NAME_HEADING,
            weight: 'bold',
            color: BRAND_COLOR,
            flex: 1,
          } satisfies FlexText,
          {
            type: 'text',
            text: STRINGS.CONFIRM_NAME_STEP,
            size: 'xs',
            color: '#888888',
            align: 'end',
          } satisfies FlexText,
        ],
      },
      {
        type: 'text',
        text: STRINGS.CONFIRM_NAME_QUESTION,
        wrap: true,
        size: 'sm',
      } satisfies FlexText,
      { type: 'separator' } satisfies FlexSeparator,
      // Name row
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: STRINGS.CONFIRM_NAME_LABEL,
            size: 'sm',
            color: '#888888',
            flex: 2,
          } satisfies FlexText,
          {
            type: 'text',
            text: `${fname} ${lname}`,
            size: 'sm',
            weight: 'bold',
            wrap: true,
            flex: 5,
          } satisfies FlexText,
        ],
      },
      // Phone row
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: STRINGS.CONFIRM_PHONE_LABEL,
            size: 'sm',
            color: '#888888',
            flex: 2,
          } satisfies FlexText,
          {
            type: 'text',
            text: phone,
            size: 'sm',
            weight: 'bold',
            flex: 5,
          } satisfies FlexText,
        ],
      },
      // National ID row (masked)
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: STRINGS.CONFIRM_ID_LABEL,
            size: 'sm',
            color: '#888888',
            flex: 2,
          } satisfies FlexText,
          {
            type: 'text',
            text: nationalId,
            size: 'sm',
            weight: 'bold',
            flex: 5,
          } satisfies FlexText,
        ],
      },
    ],
  };

  const yesBtn = tappableButton(
    STRINGS.CONFIRM_YES,
    { type: 'message', label: STRINGS.CONFIRM_YES, text: STRINGS.CONFIRM_YES },
    '#F492B8',   // pink
    BRAND_COLOR, // dark green text
  );
  yesBtn.flex = 1;

  const noBtn = tappableButton(
    STRINGS.CONFIRM_NO,
    { type: 'message', label: STRINGS.CONFIRM_NO, text: STRINGS.CONFIRM_NO },
    MINT_COLOR,  // mint
    BRAND_COLOR, // dark green text
  );
  noBtn.flex = 1;

  const footer: FlexBox = {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [yesBtn, noBtn],
  };

  return {
    type: 'flex',
    altText: STRINGS.CONFIRM_NAME_HEADING,
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

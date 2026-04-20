/**
 * Verify-prompt Flex card — pure, no side effects.
 */

import type { FlexMessage, FlexBox } from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage, contactButton } from './common';

export function buildVerifyPromptFlex(defaultImageUrl: string, clinicPhone: string): FlexMessage {
  const body: FlexBox = {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: STRINGS.VERIFY_HEADING,
        weight: 'bold',
        color: BRAND_COLOR,
      },
      {
        type: 'text',
        text: STRINGS.VERIFY_BODY,
        wrap: true,
        size: 'sm',
      },
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
      hero: heroImage(defaultImageUrl),
      body,
      footer,
    },
  };
}

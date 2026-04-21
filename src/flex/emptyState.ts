/**
 * Empty-state (no appointments) Flex card — pure, no side effects.
 */

import type { FlexMessage, FlexBox } from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage, contactButton, bubbleStyles } from './common';

export function buildEmptyStateFlex(defaultImageUrl: string, clinicPhone: string): FlexMessage {
  const body: FlexBox = {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: STRINGS.NEXT_APT_HEADING,
        weight: 'bold',
        color: BRAND_COLOR,
      },
      {
        type: 'text',
        text: STRINGS.EMPTY_STATE_BODY,
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
    altText: STRINGS.NEXT_APT_HEADING,
    contents: {
      type: 'bubble',
      size: BUBBLE_SIZE,
      ...(defaultImageUrl ? { hero: heroImage(defaultImageUrl) } : {}),
      body,
      footer,
      styles: bubbleStyles(),
    },
  };
}

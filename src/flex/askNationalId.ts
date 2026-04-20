/**
 * Ask-for-national-ID Flex card — pure, no side effects.
 */

import type { FlexMessage, FlexBox } from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage, contactButton } from './common';

export function buildAskNationalIDFlex(defaultImageUrl: string, clinicPhone: string): FlexMessage {
  const body: FlexBox = {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: STRINGS.ASK_NATIONAL_ID_HEADING,
        weight: 'bold',
        color: BRAND_COLOR,
      },
      {
        type: 'text',
        text: STRINGS.ASK_NATIONAL_ID_BODY,
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
    altText: STRINGS.ASK_NATIONAL_ID_HEADING,
    contents: {
      type: 'bubble',
      size: BUBBLE_SIZE,
      hero: heroImage(defaultImageUrl),
      body,
      footer,
    },
  };
}

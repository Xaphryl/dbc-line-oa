/**
 * Confirm-name Flex card — pure, no side effects.
 */

import type { FlexMessage, FlexBox } from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage } from './common';

export function buildConfirmNameFlex(
  fname: string,
  lname: string,
  defaultImageUrl: string,
  clinicPhone: string,
): FlexMessage {
  const body: FlexBox = {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: STRINGS.CONFIRM_NAME_HEADING,
        weight: 'bold',
        color: BRAND_COLOR,
      },
      {
        type: 'text',
        text: `${STRINGS.CONFIRM_NAME_PREFIX} ${fname} ${lname} ${STRINGS.CONFIRM_NAME_SUFFIX}`,
        wrap: true,
      },
    ],
  };

  const footer: FlexBox = {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'button',
        style: 'primary',
        color: BRAND_COLOR,
        action: {
          type: 'message',
          label: STRINGS.CONFIRM_YES,
          text: STRINGS.CONFIRM_YES,
        },
      },
      {
        type: 'button',
        style: 'secondary',
        action: {
          type: 'message',
          label: STRINGS.CONFIRM_NO,
          text: STRINGS.CONFIRM_NO,
        },
      },
    ],
  };

  return {
    type: 'flex',
    altText: STRINGS.CONFIRM_NAME_HEADING,
    contents: {
      type: 'bubble',
      size: BUBBLE_SIZE,
      hero: heroImage(defaultImageUrl),
      body,
      footer,
    },
  };
}

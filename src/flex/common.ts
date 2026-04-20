/**
 * Shared Flex primitives — pure, no side effects.
 */

import { STRINGS } from '../constants';
import type { FlexButton, FlexImage } from '../types';

export const BRAND_COLOR = '#c14a1b';
export const BUBBLE_SIZE = 'kilo' as const;
export const HERO_ASPECT_RATIO = '1.51:1';

export function heroImage(url: string): FlexImage {
  return {
    type: 'image',
    url,
    size: 'full',
    aspectRatio: HERO_ASPECT_RATIO,
    aspectMode: 'cover',
  };
}

export function contactButton(clinicPhone: string): FlexButton {
  return {
    type: 'button',
    style: 'primary',
    color: BRAND_COLOR,
    action: {
      type: 'uri',
      label: STRINGS.CONTACT_CLINIC,
      uri: `tel:${clinicPhone}`,
    },
  };
}

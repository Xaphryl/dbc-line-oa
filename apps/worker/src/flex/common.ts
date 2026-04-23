/**
 * Shared Flex primitives — pure, no side effects.
 *
 * DentalBuddyClinic Chiang Mai CI palette:
 *   BRAND_COLOR   #2E6A45  dark green  — headings, time text, button text
 *   BUTTON_COLOR  #F492B8  pink        — primary button background
 *   MINT_COLOR    #B7DEBF  mint green  — secondary / "no" button background
 *   BODY_BG       #FFF2DC  cream       — card body + footer background
 */

import { STRINGS } from '../constants';
import type { FlexBox, FlexBubbleStyles, FlexImage, FlexText } from '../types';

export const BRAND_COLOR  = '#2E6A45';
export const BUTTON_COLOR = '#F492B8';
export const MINT_COLOR   = '#B7DEBF';
export const BODY_BG      = '#FFF2DC';
export const BUBBLE_SIZE  = 'kilo' as const;
export const HERO_ASPECT_RATIO = '1.51:1';

/** Standard body + footer background applied to every bubble. */
export function bubbleStyles(): FlexBubbleStyles {
  return {
    body:   { backgroundColor: BODY_BG },
    footer: { backgroundColor: BODY_BG },
  };
}

export function heroImage(url: string): FlexImage {
  return {
    type: 'image',
    url,
    size: 'full',
    aspectRatio: HERO_ASPECT_RATIO,
    aspectMode: 'cover',
  };
}

/**
 * Primary CTA button — tappable FlexBox instead of a <button> element.
 * Reason: LINE's `button` component forces white text on `primary` style,
 * making it impossible to use green text on a pink background.
 * A tappable box has full colour control.
 */
export function contactButton(clinicPhone: string): FlexBox {
  return tappableButton(
    STRINGS.CONTACT_CLINIC,
    { type: 'uri', label: STRINGS.CONTACT_CLINIC, uri: `tel:${clinicPhone}` },
    BUTTON_COLOR,
    BODY_BG,
  );
}

/**
 * Generic tappable-box "button" with configurable label, action, bg and text colour.
 * Used for contactButton, confirm-yes, confirm-no, and future custom buttons.
 */
export function tappableButton(
  label: string,
  action: FlexBox['action'],
  bgColor: string,
  textColor: string,
): FlexBox {
  const text: FlexText = {
    type: 'text',
    text: label,
    color: textColor,
    align: 'center',
    weight: 'bold',
  };

  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: bgColor,
    cornerRadius: '4px',
    paddingAll: '15px',
    action,
    contents: [text],
  };
}

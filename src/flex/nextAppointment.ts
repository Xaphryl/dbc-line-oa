/**
 * Main next-appointment carousel builder — pure, no side effects.
 */

import type {
  NextAppointmentPayload,
  FlexMessage,
  FlexBubble,
  FlexBox,
  FlexComponent,
  FlexText,
} from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage, contactButton } from './common';
import { formatThaiDate, formatTime } from '../dateFormat';

const MAX_BUBBLES = 12;
const MAX_ROWS_PER_DAY = 3;

export function buildNextAppointmentFlex(
  payload: NextAppointmentPayload,
  clinicPhone: string,
): FlexMessage {
  const days = payload.days.slice(0, MAX_BUBBLES);

  const bubbles: FlexBubble[] = days.map((day) => {
    const appointments = day.appointments;
    const visibleAppts = appointments.slice(0, MAX_ROWS_PER_DAY);
    const overflowCount = appointments.length - MAX_ROWS_PER_DAY;

    const apptRows: FlexComponent[] = visibleAppts.map((appt, idx) => {
      const row: FlexBox = {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        ...(idx === 0 ? { margin: 'md' } : {}),
        contents: [
          {
            type: 'text',
            text: formatTime(new Date(appt.aptDateTime)),
            weight: 'bold',
            color: BRAND_COLOR,
            flex: 2,
          } satisfies FlexText,
          {
            type: 'text',
            text: appt.procDescript,
            flex: 5,
            wrap: true,
          } satisfies FlexText,
        ],
      };
      return row;
    });

    if (overflowCount > 0) {
      const overflowRow: FlexBox = {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: ' ',
            flex: 2,
          } satisfies FlexText,
          {
            type: 'text',
            text: `+${overflowCount} ${STRINGS.OVERFLOW_SUFFIX}`,
            flex: 5,
            size: 'sm',
            color: '#888888',
          } satisfies FlexText,
        ],
      };
      apptRows.push(overflowRow);
    }

    const body: FlexBox = {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: STRINGS.NEXT_APT_HEADING,
          size: 'xs',
          color: BRAND_COLOR,
          weight: 'bold',
        } satisfies FlexText,
        {
          type: 'text',
          text: formatThaiDate(new Date(day.date + 'T00:00:00')),
          size: 'md',
          weight: 'bold',
          wrap: true,
        } satisfies FlexText,
        {
          type: 'separator',
          margin: 'md',
        },
        ...apptRows,
      ],
    };

    const footer: FlexBox = {
      type: 'box',
      layout: 'vertical',
      contents: [contactButton(clinicPhone)],
    };

    return {
      type: 'bubble',
      size: BUBBLE_SIZE,
      hero: heroImage(payload.imageUrl),
      body,
      footer,
    };
  });

  return {
    type: 'flex',
    altText: STRINGS.NEXT_APT_ALT,
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  };
}

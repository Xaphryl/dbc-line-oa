/**
 * Main next-appointment carousel builder — pure, no side effects.
 *
 * PHP normally handles:
 *  - capping to MAX_DAYS (12) bubbles
 *  - capping to 3 rows per day, appending an overflow hint row
 * The builder also applies these caps as defense-in-depth, so it is
 * safe to call directly in tests with raw appointment data.
 */

const MAX_DAYS = 12;
const MAX_ROWS_PER_DAY = 3;

import type {
  DayGroup,
  AppointmentRow,
  FlexMessage,
  FlexBubble,
  FlexBox,
  FlexComponent,
  FlexText,
} from '../types';
import { STRINGS } from '../constants';
import { BRAND_COLOR, BUBBLE_SIZE, heroImage, contactButton, bubbleStyles } from './common';
import { formatThaiDate } from '../dateFormat';

export function buildNextAppointmentFlex(
  days: DayGroup[],
  clinicPhone: string,
): FlexMessage {
  const bubbles: FlexBubble[] = days.slice(0, MAX_DAYS).map((day) => {
    // Cap rows and append overflow hint if needed
    const cappedAppts: AppointmentRow[] = day.appointments.length > MAX_ROWS_PER_DAY
      ? [
          ...day.appointments.slice(0, MAX_ROWS_PER_DAY),
          {
            aptNum: null,
            time: null,
            procDescript: `+${day.appointments.length - MAX_ROWS_PER_DAY} ${STRINGS.OVERFLOW_SUFFIX}`,
            overflow: true,
          },
        ]
      : day.appointments;

    const apptRows: FlexComponent[] = cappedAppts.map((appt: AppointmentRow, idx: number) => {
      // Overflow hint rows from PHP have time=null and overflow=true
      const timeText = appt.time ?? ' ';
      // Prefer ProcDescript; fall back to appointment Note; then em-dash placeholder
      const procText = appt.procDescript?.trim() || appt.note?.trim() || '—';

      const row: FlexBox = {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        ...(idx === 0 ? { margin: 'md' } : {}),
        contents: [
          {
            type: 'text',
            text: timeText,
            weight: appt.overflow ? 'regular' : 'bold',
            color: appt.overflow ? '#888888' : BRAND_COLOR,
            flex: 2,
          } satisfies FlexText,
          {
            type: 'text',
            text: procText,
            flex: 5,
            wrap: true,
            ...(appt.overflow ? { size: 'sm', color: '#888888' } : {}),
          } satisfies FlexText,
        ],
      };
      return row;
    });

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
      ...(day.image_url ? { hero: heroImage(day.image_url) } : {}),
      body,
      footer,
      styles: bubbleStyles(),
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

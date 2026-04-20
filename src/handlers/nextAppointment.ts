/**
 * Handler for the "นัดครั้งต่อไป" trigger.
 * Resolves the patient by LINE user ID, fetches appointments, and replies.
 */

import type { LineMessageEvent, Env, ResolvePatientResponse, NextAppointmentsResponse } from '../types';
import { phpPost, phpGet, PhpApiError } from '../api/php';
import { replyToLine, textMessage } from '../line/reply';
import { setSession } from '../session';
import { buildNextAppointmentFlex } from '../flex/nextAppointment';
import { buildEmptyStateFlex } from '../flex/emptyState';
import { buildVerifyPromptFlex } from '../flex/verifyPrompt';
import { STRINGS } from '../constants';

export async function handleNextAppointment(
  event: LineMessageEvent,
  env: Env,
): Promise<void> {
  const userId = event.source.userId ?? null;
  if (!userId) return;

  let patNum: number;
  try {
    const res = await phpPost<ResolvePatientResponse>(
      '/resolve-patient.php',
      { line_user_id: userId },
      env,
    );
    patNum = res.patNum;
  } catch (err) {
    if (err instanceof PhpApiError && err.statusCode === 404) {
      // Unbound user — start verification flow
      await setSession(env.LINE_OA_KV, userId, { step: 'awaiting_phone' });
      const defaultImageUrl = `${env.IMAGE_BASE_URL}/default.jpg`;
      await replyToLine(event.replyToken, [buildVerifyPromptFlex(defaultImageUrl, env.CLINIC_PHONE)], env);
      console.log('[nextAppointment] unbound userId=<redacted>');
      return;
    }
    await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
    return;
  }

  // Bound user — fetch appointments
  let days: NextAppointmentsResponse['days'];
  let imageUrl: string;
  try {
    const res = await phpGet<NextAppointmentsResponse>(
      `/next-appointments.php?patNum=${patNum}`,
      env,
    );
    days = res.days;
    imageUrl = res.image_url;
  } catch {
    await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
    return;
  }

  const defaultImageUrl = `${env.IMAGE_BASE_URL}/default.jpg`;

  if (days.length === 0) {
    await replyToLine(event.replyToken, [buildEmptyStateFlex(defaultImageUrl, env.CLINIC_PHONE)], env);
    return;
  }

  console.log(`[nextAppointment] patNum=${patNum} days=${days.length}`);
  await replyToLine(
    event.replyToken,
    [buildNextAppointmentFlex({ days, imageUrl }, env.CLINIC_PHONE)],
    env,
  );
}

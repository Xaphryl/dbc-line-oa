/**
 * Handler for the "นัดครั้งต่อไป" trigger.
 * Resolves the patient by LINE user ID, fetches appointments, and replies.
 */

import type { LineMessageEvent, Env, ResolvePatientResponse, NextAppointmentsResponse } from '../types';
import { phpPost, phpGet, PhpApiError } from '../api/php';
import { replyToLine, textMessage } from '../line/reply';
import { setSession, clearSession } from '../session';
import { buildNextAppointmentFlex } from '../flex/nextAppointment';
import { buildEmptyStateFlex } from '../flex/emptyState';
import { buildVerifyPromptFlex } from '../flex/verifyPrompt';
import { resolveRegImages } from '../regImages';
import { STRINGS } from '../constants';

export async function handleNextAppointment(
  event: LineMessageEvent,
  env: Env,
): Promise<void> {
  const userId = event.source.userId ?? null;
  if (!userId) return;

  let patNum: number;
  try {
    console.log('[nextAppointment] calling resolve-patient.php');
    const res = await phpPost<ResolvePatientResponse>(
      '/resolve-patient.php',
      { line_user_id: userId },
      env,
    );
    patNum = res.patNum;
    console.log(`[nextAppointment] resolve-patient ok patNum=${patNum}`);
    // Clear any stale verification session (e.g. patient was mid-registration
    // when they sent the trigger keyword — the router now checks trigger before
    // session, so we arrive here with a stale session that is no longer needed).
    await clearSession(env.LINE_OA_KV, userId);
  } catch (err) {
    if (err instanceof PhpApiError && err.statusCode === 404) {
      // Unbound user — resolve images (KV cache or 1.5s PHP fetch) then start S1
      console.log('[nextAppointment] unbound — setting session + sending verify prompt');
      const ri = await resolveRegImages(env);
      await setSession(env.LINE_OA_KV, userId, { step: 'awaiting_phone', ri });
      await replyToLine(event.replyToken, [buildVerifyPromptFlex(ri.s1, env.CLINIC_PHONE)], env);
      return;
    }
    console.log(`[nextAppointment] resolve-patient error: ${err instanceof Error ? err.message : String(err)}`);
    await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
    return;
  }

  // Bound user — fetch appointments and resolve images in parallel
  let days: NextAppointmentsResponse['days'];
  try {
    console.log(`[nextAppointment] phpGet /next-appointments.php?patNum=${patNum}`);
    const res = await phpGet<NextAppointmentsResponse>(
      `/next-appointments.php?patNum=${patNum}`,
      env,
    );
    console.log(`[nextAppointment] phpGet ok days=${res.days?.length}`);
    days = res.days;
  } catch (err) {
    console.log(`[nextAppointment] phpGet error: ${err instanceof Error ? err.message : String(err)}`);
    await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
    return;
  }

  if (!Array.isArray(days) || days.length === 0) {
    const ri = await resolveRegImages(env);
    await replyToLine(event.replyToken, [buildEmptyStateFlex(ri.no_apt, env.CLINIC_PHONE)], env);
    return;
  }

  console.log(`[nextAppointment] patNum=${patNum} days=${days.length}`);
  await replyToLine(
    event.replyToken,
    [buildNextAppointmentFlex(days, env.CLINIC_PHONE)],
    env,
  );
}

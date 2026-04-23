/**
 * Handler for the "ลงทะเบียน" keyword.
 *
 * If the patient is already bound, replies with their name and stops.
 * Otherwise clears any stale session and starts the S1 verification flow.
 *
 * No unbind call: confirm-bind.php already overwrites any existing binding at the
 * end of registration, making a pre-emptive unbind redundant and slow.
 */

import type { LineMessageEvent, Env, ResolvePatientResponse } from '../types';
import { phpPost, PhpApiError } from '../api/php';
import { replyToLine, textMessage } from '../line/reply';
import { clearSession, setSession } from '../session';
import { buildVerifyPromptFlex } from '../flex/verifyPrompt';
import { resolveRegImages } from '../regImages';
import { alreadyRegisteredMsg, STRINGS } from '../constants';

export async function handleRegistration(
  event: LineMessageEvent,
  env: Env,
): Promise<void> {
  const userId = event.source.userId ?? null;
  if (!userId) return;

  console.log(`[registration] start userId=...${userId.slice(-6)}`);

  // Check if this LINE user is already bound to a patient record.
  try {
    const res = await phpPost<ResolvePatientResponse>(
      '/resolve-patient.php',
      { line_user_id: userId },
      env,
    );
    // Already bound — clear any stale session and reply with patient name.
    await clearSession(env.LINE_OA_KV, userId);
    await replyToLine(
      event.replyToken,
      [textMessage(alreadyRegisteredMsg(res.fname, res.lname))],
      env,
    );
    console.log(`[registration] already bound patNum=${res.patNum} — replied with name`);
    return;
  } catch (err) {
    if (!(err instanceof PhpApiError && err.statusCode === 404)) {
      // Unexpected error — surface to patient and abort.
      await replyToLine(event.replyToken, [textMessage(STRINGS.GENERIC_ERROR)], env);
      console.log(`[registration] resolve-patient error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    // 404 = not yet bound → fall through to registration flow.
  }

  // Clear any stale verification session
  await clearSession(env.LINE_OA_KV, userId);
  console.log('[registration] session cleared');

  // Resolve step images (KV cache hit: < 50ms; PHP fetch: ≤ 1.5s with abort)
  const ri = await resolveRegImages(env);

  // Write S1 session
  await setSession(env.LINE_OA_KV, userId, { step: 'awaiting_phone', ri });
  console.log('[registration] session set to awaiting_phone');

  // Reply with S1 card (hero omitted if ri.s1 is empty — Flex still valid)
  await replyToLine(event.replyToken, [buildVerifyPromptFlex(ri.s1, env.CLINIC_PHONE)], env);
  console.log('[registration] S1 reply sent');
}

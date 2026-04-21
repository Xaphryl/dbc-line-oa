/**
 * Handler for the "ลงทะเบียน" keyword.
 *
 * Resolves step hero images from KV cache (fast) or /reg-images.php (1.5s cap),
 * then sets the S1 session and replies with the S1 card — matching the hero shown
 * by the นัดครั้งต่อไป unbound path (both use registration_1_phone image).
 *
 * No unbind call: confirm-bind.php already overwrites any existing binding at the
 * end of registration, making a pre-emptive unbind redundant and slow.
 */

import type { LineMessageEvent, Env } from '../types';
import { replyToLine } from '../line/reply';
import { clearSession, setSession } from '../session';
import { buildVerifyPromptFlex } from '../flex/verifyPrompt';
import { resolveRegImages } from '../regImages';

export async function handleRegistration(
  event: LineMessageEvent,
  env: Env,
): Promise<void> {
  const userId = event.source.userId ?? null;
  if (!userId) return;

  console.log(`[registration] start userId=...${userId.slice(-6)}`);

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

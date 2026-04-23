/**
 * Handler for the "ยกเลิก" keyword.
 * Cancels any active verification session and tells the patient how to restart.
 */

import type { LineMessageEvent, Env } from '../types';
import { replyToLine, textMessage } from '../line/reply';
import { clearSession } from '../session';
import { STRINGS } from '../constants';

export async function handleCancel(
  event: LineMessageEvent,
  env: Env,
): Promise<void> {
  const userId = event.source.userId ?? 'unknown';
  await clearSession(env.LINE_OA_KV, userId);
  await replyToLine(event.replyToken, [textMessage(STRINGS.CANCEL_SUCCESS)], env);
  console.log('[cancel] session cleared');
}

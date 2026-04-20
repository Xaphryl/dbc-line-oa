/**
 * Handler for the "user"/"User" keyword.
 * Clears any existing session and replies with the user's LINE user ID.
 */

import type { LineMessageEvent, Env } from '../types';
import { replyToLine, textMessage } from '../line/reply';
import { clearSession } from '../session';
import { STRINGS } from '../constants';

export async function handleUserKeyword(
  event: LineMessageEvent,
  env: Env,
): Promise<void> {
  const userId = event.source.userId ?? 'unknown';
  await clearSession(env.LINE_OA_KV, userId);
  const replyText = `${STRINGS.USER_KEYWORD_REPLY_PREFIX}${userId}${STRINGS.USER_KEYWORD_REPLY_SUFFIX}`;
  await replyToLine(event.replyToken, [textMessage(replyText)], env);
  console.log('[userKeyword] sent LINE user ID to user');
}

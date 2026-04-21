/**
 * LINE Messaging API reply caller.
 * Sends up to 5 messages in one reply (LINE limit).
 */

import type { Env, FlexMessage } from '../types';

type LineTextReply = { type: 'text'; text: string };
type LineReplyMessage = FlexMessage | LineTextReply;

const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

/**
 * Call LINE Messaging API POST /v2/bot/message/reply.
 * Logs result but does NOT throw on LINE API error — LINE errors are not retryable.
 */
export async function replyToLine(
  replyToken: string,
  messages: LineReplyMessage[],
  env: Env,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ replyToken, messages }),
      signal: controller.signal,
    });
    if (res.ok) {
      console.log(`[reply] ok messages=${messages.length}`);
    } else {
      const body = await res.text().catch(() => '(unreadable)');
      console.log(`[reply] error status=${res.status} body=${body}`);
    }
  } catch {
    console.log('[reply] error status=network');
  } finally {
    clearTimeout(timer);
  }
}

/** Build a plain-text LINE message object. */
export function textMessage(text: string): LineTextReply {
  return { type: 'text', text };
}

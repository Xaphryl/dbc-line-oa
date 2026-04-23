/**
 * dbc-line-oa — Cloudflare Worker entry (module worker style).
 *
 * Keyword priority order (highest first):
 *   1. "id"           → reply with raw LINE user ID (FR-16)
 *   2. "ยกเลิก"       → cancel active verification session
 *   3. "ลงทะเบียน"    → start / re-start registration (unbind + S1)
 *   4. "นัดครั้งต่อไป" → show appointments (auto-starts registration if unbound)
 *      Checked BEFORE active session so sending it mid-registration exits the flow.
 *   5. Active session → route to verification state machine
 *   6. Unrecognised   → silently ignore
 */

import { verifyLineSignature } from './line/signature';
import { claimEvent } from './dedup';
import type { Env, LineWebhookBody, LineMessageEvent } from './types';
import { handleNextAppointment } from './handlers/nextAppointment';
import { handleVerify } from './handlers/verify';
import { handleUserKeyword } from './handlers/userKeyword';
import { handleCancel } from './handlers/cancel';
import { handleRegistration } from './handlers/registration';
import { handleFollow } from './handlers/follow';
import { handleUnfollow } from './handlers/unfollow';
import { getSession } from './session';
import {
  TRIGGER_NEXT_APPOINTMENT,
  USER_KEYWORD_REGEX,
  CANCEL_KEYWORD_REGEX,
  REGISTER_KEYWORD_REGEX,
  STRINGS,
} from './constants';
import { replyToLine, textMessage } from './line/reply';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('dbc-line-oa ok', { status: 200 });
    }

    // LINE webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env, ctx);
    }

    return new Response('not found', { status: 404 });
  },
};

/**
 * Process a batch of LINE webhook events.
 * Runs inside ctx.waitUntil so LINE already received 200 before any awaits here.
 */
async function dispatchEvents(
  events: LineWebhookBody['events'],
  env: Env,
): Promise<void> {
  for (const event of events ?? []) {
    const fresh = await claimEvent(env.LINE_OA_KV, event);
    if (!fresh) {
      console.log('[webhook] duplicate event skipped');
      continue;
    }

    // Follow / Unfollow
    if (event.type === 'follow') {
      await handleFollow(event, env);
      continue;
    }
    if (event.type === 'unfollow') {
      await handleUnfollow(event, env);
      continue;
    }

    // Only handle text message events
    if (event.type !== 'message' || !event.message || event.message.type !== 'text') {
      continue;
    }

    const msgEvent = event as LineMessageEvent;
    const userId = msgEvent.source?.userId;
    if (!userId) continue;

    // Normalise to NFC — LINE may deliver Thai combining characters in NFD form
    const text = msgEvent.message.text.trim().normalize('NFC');

    try {
      // 1. "id" — highest priority, always clears session
      if (USER_KEYWORD_REGEX.test(text)) {
        await handleUserKeyword(msgEvent, env);
        continue;
      }

      // 2. "ยกเลิก" — cancel active verification at any step
      if (CANCEL_KEYWORD_REGEX.test(text)) {
        await handleCancel(msgEvent, env);
        continue;
      }

      // 3. "ลงทะเบียน" — start / re-start registration
      if (REGISTER_KEYWORD_REGEX.test(text)) {
        await handleRegistration(msgEvent, env);
        continue;
      }

      // 4. Appointment trigger — check BEFORE active session so that sending
      //    "นัดครั้งต่อไป" mid-registration exits the flow cleanly rather than
      //    routing into the verification state machine.
      if (text === TRIGGER_NEXT_APPOINTMENT.normalize('NFC')) {
        await handleNextAppointment(msgEvent, env);
        continue;
      }

      // 5. Active verification session
      const session = await getSession(env.LINE_OA_KV, userId);
      if (session) {
        await handleVerify(msgEvent, env, session, text);
        continue;
      }

      // 6. Unrecognised text — silently ignore
      console.log('[router] unrecognised text, ignoring');
    } catch (err) {
      console.log(
        `[router] unhandled error: ${err instanceof Error ? err.message : String(err)}`,
      );
      await replyToLine(
        msgEvent.replyToken,
        [textMessage(STRINGS.GENERIC_ERROR)],
        env,
      ).catch(() => void 0);
    }
  }
}

async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // Read raw body as text — the signature is over exact bytes.
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');

  const ok = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
  if (!ok) {
    console.log('[webhook] signature mismatch');
    return new Response('unauthorized', { status: 401 });
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody) as LineWebhookBody;
  } catch {
    return new Response('bad request', { status: 400 });
  }

  // Forward raw body to fd-th.com (fire-and-forget, non-blocking)
  if (env.FORWARD_WEBHOOK_URL) {
    ctx.waitUntil(
      fetch(env.FORWARD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      }).catch((err: unknown) =>
        console.log('[forward] error:', err instanceof Error ? err.message : 'unknown'),
      ),
    );
  }

  // Dispatch all event processing in the background — return 200 to LINE immediately.
  // LINE's webhook connection has a hard ~7s timeout; processing (PHP calls + KV + LINE
  // reply API) can collectively exceed that. ctx.waitUntil lets us respond 200 first,
  // then complete the work within the reply-token window (30s from event.timestamp).
  ctx.waitUntil(dispatchEvents(body.events ?? [], env));

  return new Response('ok', { status: 200 });
}

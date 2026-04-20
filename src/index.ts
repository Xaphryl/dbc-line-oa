/**
 * dbc-line-oa — Cloudflare Worker entry (module worker style).
 *
 * Phase 2 scope: signature verify + dedup + 200 OK.
 * Phase 4 will add business handlers inside `handleWebhook`.
 */

import { verifyLineSignature } from './line/signature';
import { claimEvent } from './dedup';
import type { Env, LineWebhookBody, LineMessageEvent } from './types';
import { handleNextAppointment } from './handlers/nextAppointment';
import { handleVerify } from './handlers/verify';
import { handleUserKeyword } from './handlers/userKeyword';
import { handleFollow } from './handlers/follow';
import { handleUnfollow } from './handlers/unfollow';
import { getSession } from './session';
import { TRIGGER_NEXT_APPOINTMENT, USER_KEYWORD_REGEX } from './constants';

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
      }).catch((err: unknown) => console.log('[forward] error:', err instanceof Error ? err.message : 'unknown')),
    );
  }

  // Dedup + dispatch
  for (const event of body.events ?? []) {
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

    const text = msgEvent.message.text.trim();

    // 1. "user"/"User" keyword — highest priority, clears state
    if (USER_KEYWORD_REGEX.test(text)) {
      await handleUserKeyword(msgEvent, env);
      continue;
    }

    // 2. Active verification session
    const session = await getSession(env.LINE_OA_KV, userId);
    if (session) {
      await handleVerify(msgEvent, env, session, text);
      continue;
    }

    // 3. Appointment trigger
    if (text === TRIGGER_NEXT_APPOINTMENT) {
      await handleNextAppointment(msgEvent, env);
      continue;
    }

    // 4. All other text — ignore silently
  }

  return new Response('ok', { status: 200 });
}

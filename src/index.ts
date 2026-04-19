/**
 * dbc-line-oa — Cloudflare Worker entry (module worker style).
 *
 * Phase 2 scope: signature verify + dedup + 200 OK.
 * Phase 4 will add business handlers inside `handleWebhook`.
 */

import { verifyLineSignature } from './line/signature';
import { claimEvent } from './dedup';
import type { Env, LineWebhookBody } from './types';

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
  _ctx: ExecutionContext,
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

  // Dedup + dispatch — Phase 2: just log, no business logic.
  for (const event of body.events ?? []) {
    const fresh = await claimEvent(env.LINE_OA_KV, event);
    if (!fresh) {
      console.log('[webhook] duplicate event skipped');
      continue;
    }
    console.log(
      `[webhook] event type=${event.type} source=${event.source?.userId ?? 'n/a'}`,
    );
    // Phase 4 will add handlers here.
  }

  return new Response('ok', { status: 200 });
}

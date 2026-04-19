# dbc-line-oa

Cloudflare Worker for Dental Buddy Clinic's LINE Official Account
(@DentalBuddyClinic). Handles the "นัดครั้งต่อไป" (next appointment) flow,
patient verification, and follow/unfollow notifications.

**Status: Phase 2 scaffold only.** Webhook signature verify + event dedup
work; business handlers land in Phase 4.

## Stack

- TypeScript module Worker (`export default { fetch }`)
- Wrangler v3 as dev/deploy tool
- Cloudflare KV for dedup (5 min TTL) and verification session state (10 min TTL)
- Raw `fetch()` + Web Crypto — no LINE SDK, no ORM

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in real values
npm run dev                      # wrangler dev on http://localhost:8787
```

Health check: `curl http://localhost:8787/health` → `dbc-line-oa ok`.

## Tests

```bash
npm test            # vitest run
npm run typecheck   # tsc --noEmit
```

## Deploy (requires Cloudflare auth)

First-time setup:

```bash
wrangler login
wrangler kv:namespace create LINE_OA_KV
# Paste the returned id into wrangler.toml under [[kv_namespaces]].id

wrangler secret put LINE_CHANNEL_SECRET
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
wrangler secret put LINE_OA_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

Then:

```bash
npm run deploy
```

Finally, in the LINE Developer console, set the webhook URL to
`https://dbc-line-oa.<your-account>.workers.dev/webhook`.

## Layout

```
src/
  index.ts          # Worker entry + router
  types.ts          # Env, LineWebhookEvent, LineWebhookBody
  constants.ts      # Trigger text, TTLs, user-visible strings (stub for Phase 3)
  dedup.ts          # KV-based event dedup
  line/
    signature.ts    # x-line-signature HMAC verify (Web Crypto)
test/
  signature.test.ts
  dedup.test.ts
```

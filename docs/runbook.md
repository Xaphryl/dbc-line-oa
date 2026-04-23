# Runbook — dbc-line-oa Operations

Day-to-day operations reference for the LINE OA Cloudflare Worker.

---

## Rollback (emergency)

The fastest rollback requires no code change — just redirect LINE traffic:

1. Go to [LINE Developer Console](https://developers.line.biz/) → @DentalBuddyClinic → Messaging API
2. Change **Webhook URL** back to the previous URL (GAS or old Worker)
3. Click **Verify** — done. The Worker stops receiving events within seconds.

To re-enable this Worker, set the webhook URL back to:
```
https://dbc-line-oa.weiszer-ritter.workers.dev/webhook
```

No database changes are needed for rollback. The two new tables (`line_card_image`, `line_event_log`) are inert without the Worker.

---

## View live logs

Stream real-time Worker logs (requires Cloudflare auth):

```bash
cd apps/worker
npx wrangler tail
```

Filter to errors only:
```bash
npx wrangler tail --status error
```

> **Note:** `wrangler tail` logs are ephemeral — retained for 24 hours only.
> For persistent audit history, check the `line_event_log` table in MySQL (see below).

---

## Check the audit log (MySQL)

All significant events are written to `line_event_log` on Hostinger MySQL.

```sql
-- Recent events (last 50)
SELECT created_at, event_type, status, line_user_id, pat_num, ms
FROM line_event_log
ORDER BY created_at DESC
LIMIT 50;

-- Errors in the last 24 hours
SELECT created_at, event_type, status, line_user_id
FROM line_event_log
WHERE status = 'error'
  AND created_at > NOW() - INTERVAL 24 HOUR
ORDER BY created_at DESC;

-- Activity for a specific patient
SELECT created_at, event_type, status, ms
FROM line_event_log
WHERE pat_num = 12345
ORDER BY created_at DESC;
```

---

## Rotate secrets

Run each command from `apps/worker/`. Wrangler will prompt for the new value.

```bash
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN   # LINE token expired or compromised
npx wrangler secret put LINE_CHANNEL_SECRET          # LINE channel secret rotated
npx wrangler secret put LINE_OA_API_KEY              # Shared key between Worker and PHP
npx wrangler secret put TELEGRAM_BOT_TOKEN           # Telegram bot replaced
npx wrangler secret put TELEGRAM_CHAT_ID             # Telegram target chat changed
```

After rotating `LINE_OA_API_KEY`, also update it in `/public_html/.env` on Hostinger
(the PHP API reads it from there). Then test with:

```bash
curl -X POST https://dentalbuddyclinic.com/line-oa/api/resolve-patient.php \
  -H "X-Line-Oa-Key: <new-key>" \
  -H "Content-Type: application/json" \
  -d '{"line_user_id":"test"}'
# Expected: 404 {"error":"Not Found",...}
# If 401: key mismatch — check .env on Hostinger
```

---

## Update a non-secret env var

Non-secret vars (`PHP_API_BASE_URL`, `IMAGE_BASE_URL`, `CLINIC_PHONE`, `FORWARD_WEBHOOK_URL`)
live in `apps/worker/wrangler.toml` under `[vars]`. Edit the file, then redeploy:

```bash
cd apps/worker
npx wrangler deploy
```

---

## Clear the image URL cache

Registration step image URLs are cached in KV for 24 hours (key: `reg-images:v3`).
If you upload new images and want them to appear immediately without waiting:

```bash
cd apps/worker
npx wrangler kv:key delete --binding LINE_OA_KV "reg-images:v3"
```

The next registration trigger will fetch fresh URLs from PHP.

---

## Force-clear a user's verification session

If a patient is stuck mid-registration (e.g. session corrupted):

```bash
cd apps/worker
npx wrangler kv:key delete --binding LINE_OA_KV "session:<LINE_USER_ID>"
```

Replace `<LINE_USER_ID>` with the patient's LINE user ID (starts with `U`).
The patient can then type ลงทะเบียน to restart cleanly.

---

## Unbind a patient's LINE account

If a patient needs to re-register (e.g. new phone), clear their binding via phpMyAdmin:

```sql
UPDATE patient
SET line_user_id = ''
WHERE PatNum = <PatNum>;
```

Or use the existing `unbind-patient.php` endpoint (called internally by the ลงทะเบียน flow).

---

## Common errors

### Patient sends trigger — no reply

1. Check `wrangler tail` for the event — if it appears but no reply, look for PHP errors.
2. Check PHP API is reachable:
   ```bash
   curl https://dentalbuddyclinic.com/line-oa/api/resolve-patient.php
   # Expected: 401 (no auth header) — means PHP is up
   ```
3. Check `line_event_log` for `status = 'error'` rows.
4. Check Hostinger MySQL is running (login to Hostinger control panel → MySQL Databases).

### 401 from PHP API

`LINE_OA_API_KEY` mismatch between Worker secret and Hostinger `.env`.
Rotate the key (see above) and update both sides.

### Flex card shows no hero image

The image file is missing from `/public_html/line-oa/images/` or the filename doesn't match.
See `docs/images.md` for the full image inventory. The card still renders — just without a hero.

### Appointments show deleted entries

FD7 marks cancelled appointments with `e_type = 'Deleted'` while leaving `AptStatus = 1`.
The SQL in `apps/api/queries.php` already filters `AND (a.e_type IS NULL OR a.e_type != 'Deleted')`.
If deleted appointments reappear, confirm the query is deployed correctly on Hostinger.

### LINE webhook shows "Canceled"

LINE cancels the webhook if it doesn't receive HTTP 200 within ~7 seconds.
The Worker returns 200 immediately and processes in the background (`ctx.waitUntil`).
If "Canceled" appears, check that `apps/worker/src/index.ts` still returns the response
before `ctx.waitUntil(dispatchEvents(...))`.

### nsync sync wipes line_user_id

nsync uses `REPLACE INTO` (delete + reinsert) for the patient table. A `COALESCE` guard in
`nsync/sync-client/src/sync/remote-sender.ts` (`PRESERVE_COLUMNS`) protects `line_user_id`
from being overwritten when FD7 sends an empty value. If bindings are being wiped after a sync,
confirm the nsync `sync-client` PM2 process is running the latest build.

---

## Useful links

| Resource | URL |
|---|---|
| Cloudflare Workers dashboard | https://dash.cloudflare.com → Workers & Pages → dbc-line-oa |
| LINE Developer Console | https://developers.line.biz/ |
| Hostinger control panel | https://hpanel.hostinger.com |
| GitHub repo | https://github.com/Xaphryl/dbc-line-oa |

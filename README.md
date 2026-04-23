# dbc-line-oa

Cloudflare Worker for **Dental Buddy Clinic LINE Official Account** (@DentalBuddyClinic).

Handles patient-facing LINE interactions: appointment lookup, self-service registration (phone + national ID verification), and follow/unfollow notifications via Telegram.

**Live:** `https://dbc-line-oa.weiszer-ritter.workers.dev/webhook`

---

## Features

| Trigger | Behaviour |
|---|---|
| นัดครั้งต่อไป | Shows upcoming appointments as a Flex carousel (bound patients) or starts registration (unbound) |
| ลงทะเบียน | Starts or restarts the self-service registration flow |
| ยกเลิก | Cancels an in-progress registration session |
| id | Replies with the user's raw LINE user ID (for manual staff linking) |
| follow / unfollow | Logs to DB + sends Telegram notification to clinic |

**Registration flow:** Phone → National ID → Name confirmation → LINE account linked → Appointments shown.

---

## Stack

| Layer | Technology |
|---|---|
| Webhook runtime | Cloudflare Workers (TypeScript) |
| Edge state | Cloudflare KV (session + dedup) |
| Data API | PHP 8 on Hostinger (`apps/api/` → `/public_html/line-oa/api/`) |
| Database | MySQL 8 on Hostinger (synced from FD7 via nsync) |
| Images | Hostinger static folder (`/public_html/line-oa/images/`) |

---

## Repository layout

```
dbc-line-oa/
├── apps/
│   ├── worker/                  Cloudflare Worker (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts         Entry point — signature verify, dedup, router
│   │   │   ├── constants.ts     All user-visible strings
│   │   │   ├── types.ts         Env, LINE event types, DTOs
│   │   │   ├── handlers/        nextAppointment, verify, registration, follow, unfollow …
│   │   │   ├── flex/            Pure Flex Message builders
│   │   │   ├── line/            LINE API calls, signature verify, Telegram notify
│   │   │   └── api/             PHP fetch wrapper
│   │   ├── test/
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                     PHP API (FTP to /public_html/line-oa/api/)
│       ├── queries.php           All SQL (single file)
│       ├── image-rule.php        Image resolution logic
│       ├── reg-images.php        Registration step image URLs
│       ├── resolve-patient.php
│       ├── next-appointments.php
│       ├── resolve-by-phone.php
│       ├── verify-and-bind.php
│       ├── confirm-bind.php
│       ├── unbind-patient.php
│       ├── users-upsert.php
│       └── log-event.php
├── docs/
│   ├── images.md                Hero image inventory and upload guide
│   ├── image-rules.md           Clinic owner guide — seasonal/treatment image rules
│   ├── runbook.md               Operations — rollback, logs, secrets, errors
│   └── acceptance-log.md        FR acceptance test results
└── README.md
```

---

## Local development

All Worker commands run from `apps/worker/`:

```bash
cd apps/worker
npm install
cp .dev.vars.example .dev.vars   # fill in secrets
npm run dev                      # wrangler dev → http://localhost:8787
```

```bash
npm test            # vitest run
npm run typecheck   # tsc --noEmit
```

---

## Deploy

Run from `apps/worker/`:

```bash
npx wrangler deploy
```

### First-time setup

```bash
cd apps/worker

npx wrangler login
npx wrangler kv:namespace create LINE_OA_KV
# Paste the returned id into wrangler.toml [[kv_namespaces]].id

npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_OA_API_KEY
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Then in the LINE Developer console → Messaging API → Webhook URL:
```
https://dbc-line-oa.weiszer-ritter.workers.dev/webhook
```

### PHP API deployment

Upload all files in `apps/api/` to Hostinger:
```
/public_html/line-oa/api/
```

Set `LINE_OA_API_KEY` in `/public_html/.env` on Hostinger to match the Worker secret.

---

## Rollback

If the Worker needs to be rolled back immediately, change the LINE webhook URL in the LINE Developer console back to the previous URL. No database changes needed.

See `docs/runbook.md` for full rollback and operations procedures.

---

## Image management

Hero images live at `https://dentalbuddyclinic.com/line-oa/images/`.

| Basename | Card |
|---|---|
| `registration_1_phone` | S1 — phone entry |
| `registration_2_id` | S2 — national ID entry |
| `registration_3_people` | S3 — name confirmation |
| `registration_4_complete` | S4 — registration complete |
| `no_appointment` | Empty-state card |
| `default.jpg` | Appointment card fallback |

Supported extensions: `.jpg`, `.jpeg`, `.png` (tried in that order).
See `docs/images.md` for full reference and `docs/image-rules.md` for seasonal/treatment rules.

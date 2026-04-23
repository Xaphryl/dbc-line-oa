# Image Rules — Clinic Owner Guide

This guide explains how to change the hero image shown on the **นัดครั้งต่อไป** appointment card without any code changes.

All configuration is done in **phpMyAdmin** on Hostinger.

---

## How it works

When a patient checks their appointments, the bot picks a hero image based on three priority levels:

| Priority | Type | When it matches |
|---|---|---|
| 1 — highest | **Treatment** | Any appointment that day contains a specific procedure keyword |
| 2 | **Seasonal** | Today's date falls inside a configured date range |
| 3 — fallback | **Default** | Always matches — used when nothing else does |

The first matching rule wins. If no rule matches (or the image file is missing), `default.jpg` is used.

---

## The `line_card_image` table

Open **phpMyAdmin** on Hostinger → select the clinic database → open `line_card_image`.

| Column | Description |
|---|---|
| `rule_type` | `treatment`, `seasonal`, or `default` |
| `match_value` | Procedure keyword to look for (treatment rules only) |
| `season_start` | Start date as `MMDD` e.g. `0401` = April 1 (seasonal rules only) |
| `season_end` | End date as `MMDD` e.g. `0420` = April 20 (seasonal rules only) |
| `filename` | Image filename e.g. `songkran.jpg` (file must exist in `/public_html/line-oa/images/`) |
| `priority` | Lower number = higher priority. Use steps of 10 (10, 20, 30…) to leave room |
| `active` | `1` = enabled, `0` = disabled |

---

## Adding a seasonal image

**Example: Songkran festival, April 13–15**

1. Upload `songkran.jpg` to `/public_html/line-oa/images/` via Hostinger File Manager.
2. In phpMyAdmin, run:

```sql
INSERT INTO line_card_image (rule_type, season_start, season_end, filename, priority, active)
VALUES ('seasonal', '0413', '0415', 'songkran.jpg', 50, 1);
```

**Year-spanning dates** (e.g. New Year: December 25 – January 5):

```sql
INSERT INTO line_card_image (rule_type, season_start, season_end, filename, priority, active)
VALUES ('seasonal', '1225', '0105', 'newyear.jpg', 50, 1);
```

The system handles year-crossing automatically — no special setup needed.

---

## Adding a treatment image

**Example: Show a special image when any appointment that day involves implants**

1. Upload `implant.jpg` to `/public_html/line-oa/images/`.
2. Find the exact Thai text used in `ProcDescript` for that procedure in FD7
   (e.g. `ฝังรากเทียม`).
3. In phpMyAdmin, run:

```sql
INSERT INTO line_card_image (rule_type, match_value, filename, priority, active)
VALUES ('treatment', 'ฝังรากเทียม', 'implant.jpg', 10, 1);
```

The `match_value` is checked as a substring — `ฝังรากเทียม` matches
`ฝังรากเทียม stage 2` or `ประเมิน ฝังรากเทียม`. Case-sensitive.

---

## Changing the default image

The default image is used when no seasonal or treatment rule matches.

```sql
UPDATE line_card_image
SET filename = 'mynewdefault.jpg'
WHERE rule_type = 'default';
```

Remember to upload `mynewdefault.jpg` to `/public_html/line-oa/images/` first.

---

## Temporarily disabling a rule

Set `active = 0` — the rule is kept in the table but skipped:

```sql
UPDATE line_card_image
SET active = 0
WHERE id = 3;   -- replace 3 with the rule's id
```

Re-enable with `SET active = 1`.

---

## Changing priority between rules

Lower `priority` number = shown first.

```sql
-- Make implant rule take priority over seasonal rule
UPDATE line_card_image SET priority = 5  WHERE rule_type = 'treatment' AND match_value = 'ฝังรากเทียม';
UPDATE line_card_image SET priority = 50 WHERE rule_type = 'seasonal';
```

Recommended ranges:
- Treatment rules: **10–30**
- Seasonal rules: **40–90**
- Default: **999** (always last)

---

## Updating an existing image

Just upload the new file to Hostinger with the **same filename** — it replaces the old one instantly.
No DB change or code deploy needed.

If you want to use a **new filename**, update the DB row AND upload the file before deleting the old one:

```sql
UPDATE line_card_image
SET filename = 'songkran-2027.jpg'
WHERE filename = 'songkran.jpg';
```

---

## Viewing all current rules

```sql
SELECT id, rule_type, match_value, season_start, season_end, filename, priority, active
FROM line_card_image
ORDER BY rule_type, priority;
```

---

## Registration step images

The hero images on the registration cards (S1–S4) and the empty-state card are **not** in this table.
They are plain image files — upload or replace them directly in Hostinger:

| Filename (no extension) | Card |
|---|---|
| `registration_1_phone` | S1 — phone entry |
| `registration_2_id` | S2 — national ID entry |
| `registration_3_people` | S3 — name confirmation |
| `registration_4_complete` | S4 — registration complete |
| `no_appointment` | No upcoming appointments |

Supported extensions: `.jpg`, `.jpeg`, `.png` (tried in that order).
After uploading, the new image appears within 24 hours (KV cache). To force immediate update:

```bash
# From apps/worker/ on your local machine
npx wrangler kv:key delete --binding LINE_OA_KV "reg-images:v3"
```

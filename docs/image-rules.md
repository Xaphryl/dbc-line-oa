# LINE OA Hero Image Rules — Admin Guide

This document explains how to add, edit, and deactivate image rules in the `line_card_image` table using phpMyAdmin.

## How it works

Every time a patient requests their next appointment via LINE, the API picks a hero image for the Flex card using this priority order:

1. **Treatment match** — any appointment that day has a `ProcDescript` containing the `match_value` substring.
2. **Seasonal match** — today's date (MMDD) falls between `season_start` and `season_end`.
3. **Default fallback** — the row with `rule_type = 'default'`.

The `filename` column stores the bare filename only (e.g. `songkran.jpg`). The full URL is composed automatically: `IMAGE_BASE_URL/songkran.jpg`. You must upload the image file to Hostinger first (see `hosting/public_html/line-oa/images/README.md`).

---

## Column reference

| Column | Type | Description |
|---|---|---|
| `id` | INT | Auto-increment primary key |
| `rule_type` | ENUM | `'treatment'`, `'seasonal'`, or `'default'` |
| `match_value` | VARCHAR(100) | Substring to match in `ProcDescript` (treatment rules only) |
| `season_start` | CHAR(4) | Start date as MMDD, e.g. `'0401'` = April 1 |
| `season_end` | CHAR(4) | End date as MMDD, e.g. `'0420'` = April 20 |
| `filename` | VARCHAR(200) | Bare filename, e.g. `'songkran.jpg'` |
| `priority` | SMALLINT | Lower number = higher priority. Default rows use 999. |
| `active` | TINYINT | `1` = rule is live, `0` = rule is disabled |

---

## Worked examples

### Example 1 — Change the default image

You want all cards to use `clinic-logo.jpg` as the permanent fallback.

1. In phpMyAdmin, go to the `line_card_image` table.
2. Find the row where `rule_type = 'default'`.
3. Click **Edit**, change `filename` from `default.jpg` to `clinic-logo.jpg`, click **Go**.
4. Upload `clinic-logo.jpg` to `public_html/line-oa/images/` on Hostinger.

That's it — no code deploy needed.

---

### Example 2 — Add a Songkran seasonal image (April 1–20)

1. Upload `songkran.jpg` to `public_html/line-oa/images/` on Hostinger.
2. The seed row (id=2) is already in the table from the migration. To re-enable it if `active = 0`:
   - Find the row with `rule_type = 'seasonal'` and `filename = 'songkran.jpg'`.
   - Set `active = 1`, click **Go**.
3. To add a new seasonal range (e.g. New Year, Dec 25 – Jan 5):
   - Click **Insert** in phpMyAdmin.
   - Fill in: `rule_type = 'seasonal'`, `season_start = '1225'`, `season_end = '0105'`, `filename = 'new-year.jpg'`, `priority = 50`, `active = 1`.
   - Leave `match_value`, `id` blank.

**Note:** Cross-year ranges (Dec → Jan) work because the API compares MMDD strings — `1225 ≤ today ≤ 1231` will match December, and `0101 ≤ today ≤ 0105` will match January. You need two separate rows for a cross-year range.

---

### Example 3 — Treatment image for implant appointments (ฝังรากเทียม)

You want appointments containing "ฝังรากเทียม" in `ProcDescript` to show `implant.jpg`.

1. Upload `implant.jpg` to `public_html/line-oa/images/` on Hostinger.
2. In phpMyAdmin → `line_card_image` → **Insert**:
   - `rule_type = 'treatment'`
   - `match_value = 'ฝังรากเทียม'`
   - `filename = 'implant.jpg'`
   - `priority = 10` (lower than seasonal so treatment wins)
   - `active = 1`
   - Leave `season_start`, `season_end` blank.
3. Click **Go**.

The next time a patient has a "ฝังรากเทียม" appointment, the implant image will appear.

---

## Disabling a rule

Set `active = 0` on any row. The rule is ignored but not deleted, making it easy to re-enable later.

## Priority tips

- Treatment rules should have the lowest priority numbers (e.g. 10–30) so they beat seasonal ones.
- Seasonal rules should be in the 40–90 range.
- The default row should always have the highest priority number (e.g. 999).
- If two rules of the same type have the same priority number, the one with the lower `id` wins (MySQL sorts by `priority ASC` first, then by table order).

# LINE OA — Hero Image Reference

All images live in one folder on Hostinger:

```
/public_html/line-oa/images/
```

Public base URL (set via `IMAGE_BASE_URL` env var):

```
https://dentalbuddyclinic.com/line-oa/images
```

---

## Registration step images

These are the hero images shown on the four registration / state cards.
Upload them to the images folder and they appear automatically — no code change needed.

| Basename (no extension) | Card shown on | When displayed |
|---|---|---|
| `registration_1_phone` | **S1** — phone entry | Unbound user taps นัดครั้งต่อไป, or any user types ลงทะเบียน |
| `registration_2_id` | **S2** — national ID entry | After phone is matched to ≥1 candidate patient |
| `registration_3_people` | **S3** — name confirmation | After national ID is matched; patient confirms identity |
| `registration_4_complete` | **S4** — registration complete / bind success | Shown immediately after patient taps "ใช่" and binding is saved |
| `no_appointment` | **Empty state** — no upcoming appointments | Bound patient has no future scheduled appointments |

### Supported file extensions

For each basename, the system tries extensions in this order and uses the first file found:

```
.jpg → .jpeg → .png
```

Example: uploading `registration_1_phone.png` is fine — it will be picked up automatically.
If no file is found, the card falls back to `default.jpg`.

### Recommended dimensions

LINE Flex Message `hero` images render best at a **1.51:1** aspect ratio (e.g. 1200 × 795 px).
Keep files under 1 MB for fast delivery.

---

## Appointment card images

The hero image on the **นัดครั้งต่อไป** carousel and **bind-success** card is resolved
from the `line_card_image` table in MySQL using a three-level priority system.

### Priority order

| Priority | Rule type | How it matches |
|---|---|---|
| 1 (highest) | `treatment` | Any appointment that day has a `ProcDescript` containing the rule's `match_value` substring |
| 2 | `seasonal` | Today's date (MMDD) falls within `season_start`–`season_end` |
| 3 (fallback) | `default` | Always matches — used when nothing else does |

The **bind-success** card always uses `default.jpg` (it fires before the appointment query).

### Image filenames in the DB

The `filename` column stores only the bare filename (e.g. `songkran.jpg`).
The full URL is composed at runtime: `IMAGE_BASE_URL + '/' + filename`.

The image **must exist on disk** (`/public_html/line-oa/images/<filename>`).
If the file is missing, the rule is skipped and the next priority level is tried.

### Pre-seeded images

| Filename | Rule type | Notes |
|---|---|---|
| `default.jpg` | `default` | Required. Used if no other rule matches and as the bind-success hero. |
| `songkran.jpg` | `seasonal` | Sample — Apr 1–Apr 20 (`season_start = '0401'`, `season_end = '0420'`) |

### Adding a new image

1. Upload the image file to `/public_html/line-oa/images/` on Hostinger.
2. Insert a row into `line_card_image` via phpMyAdmin:

```sql
-- Seasonal example: New Year Dec 25 – Jan 5 (year-spanning)
INSERT INTO line_card_image (rule_type, season_start, season_end, filename, priority, active)
VALUES ('seasonal', '1225', '0105', 'newyear.jpg', 40, 1);

-- Treatment example: implant procedures
INSERT INTO line_card_image (rule_type, match_value, filename, priority, active)
VALUES ('treatment', 'ฝังรากเทียม', 'implant.jpg', 10, 1);
```

Lower `priority` number = higher priority (e.g. 10 beats 50).

---

## Complete image inventory

| File | Purpose | Source |
|---|---|---|
| `registration_1_phone.jpg` (or .png) | S1 phone entry hero | Upload to Hostinger |
| `registration_2_id.jpg` (or .png) | S2 national ID entry hero | Upload to Hostinger |
| `registration_3_people.jpg` (or .png) | S3 name confirmation hero | Upload to Hostinger |
| `registration_4_complete.jpg` (or .png) | Registration-complete / bind-success hero | Upload to Hostinger |
| `no_appointment.jpg` (or .png) | Empty-state card hero | Upload to Hostinger |
| `default.jpg` | Appointment card fallback | Must always exist |
| `songkran.jpg` | Songkran seasonal card hero (Apr 1–20) | Upload to Hostinger |
| *(any filename)* | Custom treatment / seasonal rule image | Upload + insert DB row |

---

## Updating an image

1. Upload the new file to Hostinger with the **same filename** — it replaces the old one instantly.
2. No code deploy or DB change needed for step images.
3. For appointment card images: if you want a new filename, update the `filename` column in `line_card_image` via phpMyAdmin AND upload the new file before removing the old one.

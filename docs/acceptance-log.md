# LINE OA Acceptance Test Log

**Date:** 2026-04-20  
**Worker:** https://dbc-line-oa.weiszer-ritter.workers.dev  
**PHP API:** https://dentalbuddyclinic.com/line-oa/api  
**Test patient:** HN 99-Boat (bound — line_user_id in DB)

---

## API Pre-flight ✅
| Check | Result |
|---|---|
| resolve-patient.php reachable | ✅ 404 for unknown user |
| Auth rejection (wrong key) | ✅ 401 |
| next-appointments.php reachable | ✅ 200, empty days |
| Seasonal image rule (Apr 1–20) | ✅ songkran.jpg returned |

---

## Round 1 — Bound patient (99-Boat LINE account)

| FR | Requirement | Result | Notes |
|---|---|---|---|
| FR-16 | "id" keyword (any case) → plain text reply with LINE user ID | ✅ | Confirmed working pre-FR-1 fix |
| FR-1 | "นัดครั้งต่อไป" → carousel (or empty-state if no appts) | ✅ | Confirmed 2026-04-20; log shows [reply] ok |
| FR-13 | Empty state card shows "ยังไม่มีนัดในระบบ" + ติดต่อคลินิก | ⬜ | Only if no future appts |
| FR-7 | Thai date format: วันX ที่ DD MMM BBBB | ⬜ | Visible in carousel bubble header — visual check |
| FR-8 | Rows show HH:MM + procedure, no doctor name | ⬜ | Inspect bubble rows |
| FR-9 | Footer button → ติดต่อคลินิก, taps to phone dialer | ⬜ | Tap the button |
| FR-10 | Bubble size = kilo (~1/4 viewport) | ⬜ | Visual check |
| FR-15 | Telegram receives follow/unfollow notification | ⬜ | Unfollow then re-follow |

---

## Round 2 — DB-seeded tests (phpMyAdmin)

| FR | Requirement | Result | Notes |
|---|---|---|---|
| FR-2 | Minute-level query — appt at NOW()+10min appears | ⬜ | Seed appt, trigger, verify |
| FR-3 | CEO/ตาราง provider excluded | ⬜ | Seed appt with CEO provider |
| FR-4 | AptStatus≠1 excluded | ⬜ | Seed cancelled appt (AptStatus=2) |
| FR-5 | Same-day grouping; >3 shows overflow hint | ⬜ | Seed 2 appts same day; then 5 |
| FR-6 | Different days → separate bubbles | ⬜ | Seed appts on 3+ different days |
| FR-14 | Image rule: treatment > seasonal > default | ⬜ | Seasonal already verified via API |

---

## Round 3 — Unbound flow (after clearing 99-Boat line_user_id)

| FR | Requirement | Result | Notes |
|---|---|---|---|
| FR-11 | Trigger → verification prompt card | ⬜ | |
| FR-12 | Phone → national ID → name confirm → bind → appointments | ⬜ | Full flow |
| FR-18 | Phone with dashes normalizes: 081-234-5678 = 0812345678 | ⬜ | Type with dashes |
| FR-17 | Session expires after 10 min | ⬜ | Code-verified (KV TTL=600s) |

---

## Legend
✅ Pass | ❌ Fail | ⬜ Not yet tested | ⚠️ Partial

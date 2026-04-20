# LINE OA Images — Upload Guide

This folder holds hero images displayed in LINE Flex Message cards.

## How to upload via Hostinger File Manager

1. Log in to Hostinger hPanel → File Manager.
2. Navigate to `public_html/line-oa/images/`.
3. Click **Upload** and select your JPEG or PNG file.
4. Rename the file to match the `filename` column in the `line_card_image` table (e.g. `songkran.jpg`).

## Naming rules

- Use lowercase letters, digits, and hyphens only. No spaces or Thai characters.
- Always use `.jpg` or `.png` extension.
- The default fallback image **must** be named `default.jpg`.

## Recommended image size

- Dimensions: **1024 × 678 px** (LINE Flex `aspectRatio: 1.51:1`)
- File size: under **1 MB** for fast LINE rendering
- Format: JPEG (preferred for photos), PNG (for graphics with transparency)

## After uploading

No code change needed. The `line_card_image` table controls which filename is used. To activate a new image, add or update a row in that table via phpMyAdmin (see `docs/line-oa/image-rules.md`).

import type { LineWebhookEvent, Env } from '../types';
import { escapeMarkdownV2, sendTelegramMessage } from '../line/telegram';
import { phpGet, phpPost } from '../api/php';

interface PatientInfo {
  patNum: number;
  fname: string;
  lname: string;
  hn: string;
}

export async function handleUnfollow(event: LineWebhookEvent, env: Env): Promise<void> {
  const userId = event.source?.userId;
  if (!userId) return;

  // Look up bound patient
  let patient: PatientInfo | null = null;
  try {
    patient = await phpGet<PatientInfo>(
      '/get-patient-info.php?line_user_id=' + encodeURIComponent(userId),
      env,
    );
  } catch {
    patient = null;
  }

  // Upsert user in PHP DB
  await phpPost(
    '/users-upsert.php',
    {
      event_id: event.webhookEventId ?? userId + String(event.timestamp),
      line_user_id: userId,
      event_type: 'unfollow',
      pat_num: patient?.patNum ?? null,
    },
    env,
  ).catch(() => {});

  // Telegram notification
  const escapedId = escapeMarkdownV2(userId);
  let msg: string;
  if (patient) {
    const escapedFname = escapeMarkdownV2(patient.fname);
    const escapedLname = escapeMarkdownV2(patient.lname);
    const escapedHn = escapeMarkdownV2(patient.hn);
    msg =
      `🚫 *มีคน Unfollow ไลน์ OA*\n\n` +
      `🦷 *ชื่อผู้ป่วย:* ${escapedFname} ${escapedLname}\n` +
      `🪪 *HN:* \`${escapedHn}\`\n` +
      `🆔 *User ID:* \`${escapedId}\``;
  } else {
    msg =
      `🚫 *มีคน Unfollow ไลน์ OA*\n\n` +
      `👤 *ชื่อ:* ไม่ทราบ \\(ยังไม่ผูกบัญชี\\)\n` +
      `🆔 *User ID:* \`${escapedId}\``;
  }
  await sendTelegramMessage(msg, env);

  // Fire-and-forget log (no LINE reply — unfollow events do not support reply tokens)
  phpPost(
    '/log-event.php',
    {
      event_id: event.webhookEventId ?? userId + String(event.timestamp),
      line_user_id: userId,
      pat_num: patient?.patNum ?? null,
      event_type: 'unfollow',
      status: 'ok',
      ms: null,
    },
    env,
  ).catch(() => {});
}

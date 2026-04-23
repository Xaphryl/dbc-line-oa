import type { LineWebhookEvent, Env } from '../types';
import { getLineProfile } from '../line/lineApi';
import { escapeMarkdownV2, sendTelegramMessage, sendTelegramPhoto } from '../line/telegram';
import { phpPost } from '../api/php';
import { replyToLine, textMessage } from '../line/reply';

export async function handleFollow(event: LineWebhookEvent, env: Env): Promise<void> {
  const userId = event.source?.userId;
  if (!userId) return;

  const profile = await getLineProfile(userId, env);

  // Upsert user in PHP DB
  try {
    await phpPost(
      '/users-upsert.php',
      {
        event_id: event.webhookEventId ?? userId + String(event.timestamp),
        line_user_id: userId,
        event_type: 'follow',
        pat_num: null,
      },
      env,
    );
  } catch (err: unknown) {
    console.log('[follow] users-upsert error:', err instanceof Error ? err.message : 'unknown');
  }

  // Telegram notification — photo + caption in one message when picture is available
  const escapedName = escapeMarkdownV2(profile.displayName);
  const escapedId   = escapeMarkdownV2(userId);
  const caption =
    `📢 *มีเพื่อนใหม่แอดไลน์ OA\\!*\n\n` +
    `👤 *ชื่อ:* ${escapedName}\n` +
    `🆔 *User ID:* \`${escapedId}\``;

  console.log(`[follow] pictureUrl=${profile.pictureUrl ?? 'none'}`);

  if (profile.pictureUrl) {
    // Send photo with the caption embedded — one Telegram message instead of two
    await sendTelegramPhoto(profile.pictureUrl, env, caption);
  } else {
    // No profile picture — fall back to text-only
    await sendTelegramMessage(caption, env);
  }

  // Reply to LINE
  const replyText =
    `สวัสดีคุณ ${profile.displayName} ยินดีต้อนรับครับ!\n\nนี่คือ User ID ของคุณ:\n${userId}`;
  await replyToLine(event.replyToken!, [textMessage(replyText)], env);

  // Fire-and-forget log
  phpPost(
    '/log-event.php',
    {
      event_id: event.webhookEventId ?? userId + String(event.timestamp),
      line_user_id: userId,
      pat_num: null,
      event_type: 'follow',
      status: 'ok',
      ms: null,
    },
    env,
  ).catch(() => {});
}

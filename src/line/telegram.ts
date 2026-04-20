import type { Env } from '../types';

/** Escape special chars for Telegram MarkdownV2 */
export function escapeMarkdownV2(text: string): string {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Send a text message to the configured Telegram chat.
 * Uses MarkdownV2 parse mode. Logs on failure, never throws.
 */
export async function sendTelegramMessage(text: string, env: Env): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'MarkdownV2',
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.log(`[telegram] sendMessage error status=${res.status}`);
    }
  } catch (err: unknown) {
    console.log('[telegram] sendMessage error:', err instanceof Error ? err.message : 'unknown');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a photo to the configured Telegram chat.
 * Logs on failure, never throws.
 */
export async function sendTelegramPhoto(photoUrl: string, env: Env): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          photo: photoUrl,
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.log(`[telegram] sendPhoto error status=${res.status}`);
    }
  } catch (err: unknown) {
    console.log('[telegram] sendPhoto error:', err instanceof Error ? err.message : 'unknown');
  } finally {
    clearTimeout(timer);
  }
}

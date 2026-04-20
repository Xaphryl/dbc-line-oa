import type { Env } from '../types';

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/**
 * Fetch LINE user profile from LINE Messaging API.
 * Returns a guest profile on failure (never throws).
 */
export async function getLineProfile(userId: string, env: Env): Promise<LineUserProfile> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.log(`[lineApi] getLineProfile error status=${res.status}`);
      return { userId, displayName: 'Guest', pictureUrl: undefined };
    }
    const data = (await res.json()) as LineUserProfile;
    return data;
  } catch (err: unknown) {
    console.log('[lineApi] getLineProfile error:', err instanceof Error ? err.message : 'unknown');
    return { userId, displayName: 'Guest', pictureUrl: undefined };
  } finally {
    clearTimeout(timer);
  }
}

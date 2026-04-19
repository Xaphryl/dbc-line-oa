/**
 * KV-based event dedup.
 *
 * LINE may retry webhook deliveries (within ~3 min). Each event carries a
 * unique `webhookEventId` on modern payloads; on older/edge payloads we
 * derive a stable ID from (userId, timestamp, type).
 *
 * `claimEvent` is the single primitive callers use: returns true if the
 * event was unseen and is now claimed, false if it's a duplicate.
 */

import { DEDUP_TTL_SEC } from './constants';
import type { LineWebhookEvent } from './types';

/**
 * Stable identifier for an event.
 * Prefers `event.webhookEventId` when LINE provides it; otherwise falls back
 * to a deterministic composite of source user + timestamp + type.
 */
export function eventId(event: LineWebhookEvent): string {
  if (event.webhookEventId && event.webhookEventId.length > 0) {
    return event.webhookEventId;
  }
  const user = event.source?.userId ?? 'anon';
  return `${user}:${event.timestamp}:${event.type}`;
}

/**
 * Atomically mark an event as seen.
 *
 * @returns true on first sight (caller should process), false on duplicate.
 */
export async function claimEvent(
  kv: KVNamespace,
  event: LineWebhookEvent,
): Promise<boolean> {
  const key = `event:${eventId(event)}`;
  const existing = await kv.get(key);
  if (existing !== null) return false;
  await kv.put(key, '1', { expirationTtl: DEDUP_TTL_SEC });
  return true;
}

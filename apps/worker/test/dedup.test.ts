import { describe, it, expect } from 'vitest';
import { claimEvent, eventId } from '../src/dedup';
import type { LineWebhookEvent } from '../src/types';

function makeMockKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return { keys: [], list_complete: true, cursor: '' };
    },
    async getWithMetadata() {
      return { value: null, metadata: null };
    },
  } as unknown as KVNamespace;
}

describe('claimEvent', () => {
  it('returns true on first sight', async () => {
    const kv = makeMockKV();
    const event = {
      type: 'message',
      timestamp: 123,
      webhookEventId: 'abc',
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent;
    expect(await claimEvent(kv, event)).toBe(true);
  });

  it('returns false on repeat', async () => {
    const kv = makeMockKV();
    const event = {
      type: 'message',
      timestamp: 123,
      webhookEventId: 'abc',
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent;
    await claimEvent(kv, event);
    expect(await claimEvent(kv, event)).toBe(false);
  });

  it('distinguishes events by webhookEventId', async () => {
    const kv = makeMockKV();
    const e1 = {
      type: 'message',
      timestamp: 123,
      webhookEventId: 'abc',
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent;
    const e2 = {
      type: 'message',
      timestamp: 123,
      webhookEventId: 'xyz',
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent;
    expect(await claimEvent(kv, e1)).toBe(true);
    expect(await claimEvent(kv, e2)).toBe(true);
  });
});

describe('eventId', () => {
  it('uses webhookEventId when present', () => {
    const id = eventId({
      type: 'message',
      timestamp: 123,
      webhookEventId: 'whk-1',
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent);
    expect(id).toBe('whk-1');
  });

  it('generates a stable id even without webhookEventId', () => {
    const a = eventId({
      type: 'message',
      timestamp: 123,
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent);
    const b = eventId({
      type: 'message',
      timestamp: 123,
      source: { type: 'user', userId: 'U1' },
    } as LineWebhookEvent);
    expect(a).toBe(b);
  });

  it('falls back to anon when userId missing', () => {
    const id = eventId({
      type: 'message',
      timestamp: 123,
      source: { type: 'user' },
    } as LineWebhookEvent);
    expect(id).toContain('anon');
  });
});

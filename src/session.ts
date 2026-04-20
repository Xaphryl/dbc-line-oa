/**
 * KV-backed verification session state with 10-minute TTL.
 */

import type { SessionState } from './types';
import { SESSION_TTL_SEC } from './constants';

const SESSION_PREFIX = 'session:';

export async function getSession(
  kv: KVNamespace,
  userId: string,
): Promise<SessionState | null> {
  const raw = await kv.get(`${SESSION_PREFIX}${userId}`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export async function setSession(
  kv: KVNamespace,
  userId: string,
  state: SessionState,
): Promise<void> {
  await kv.put(`${SESSION_PREFIX}${userId}`, JSON.stringify(state), {
    expirationTtl: SESSION_TTL_SEC,
  });
}

export async function clearSession(
  kv: KVNamespace,
  userId: string,
): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${userId}`);
}

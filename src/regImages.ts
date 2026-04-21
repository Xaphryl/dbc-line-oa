/**
 * Resolves registration step hero image URLs, with KV caching.
 *
 * Flow:
 *  1. Check KV for a cached result (< 50ms — used by all callers after first hit)
 *  2. Cache miss → call /reg-images.php with a 1.5s AbortController timeout
 *  3. On success → write to KV cache (24h TTL) and return
 *  4. On failure (timeout, PHP error, not uploaded yet) → return empty strings
 *     so Flex builders omit the hero rather than showing a broken image
 *
 * Cache key is global (not per-user) since image URLs are the same for everyone.
 * Cache is busted automatically after 24h, or can be forced by deleting the KV key.
 */

import type { Env, RegImages, RegImagesResponse } from './types';

const CACHE_KEY = 'reg-images:v1';
const CACHE_TTL_SEC = 86400; // 24 hours
const FETCH_TIMEOUT_MS = 1500;

const EMPTY: RegImages = { s1: '', s2: '', s3: '' };

export async function resolveRegImages(env: Env): Promise<RegImages> {
  // 1. Check KV cache
  try {
    const cached = await env.LINE_OA_KV.get(CACHE_KEY);
    if (cached) {
      const ri = JSON.parse(cached) as RegImages;
      // Validate shape
      if (ri.s1 !== undefined && ri.s2 !== undefined && ri.s3 !== undefined) {
        console.log('[regImages] cache hit s1=' + ri.s1);
        return ri;
      }
    }
  } catch {
    // Corrupt cache — fall through to fetch
  }

  // 2. Fetch from PHP with hard 1.5s abort
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${env.PHP_API_BASE_URL}/reg-images.php`, {
      headers: { 'X-Line-Oa-Key': env.LINE_OA_API_KEY },
      signal: ac.signal,
    });
    if (!res.ok) {
      console.log(`[regImages] fetch error status=${res.status}`);
      return EMPTY;
    }
    const data = await res.json() as RegImagesResponse;
    const ri: RegImages = { s1: data.s1_url, s2: data.s2_url, s3: data.s3_url };

    // 3. Persist to KV cache (24h)
    await env.LINE_OA_KV.put(CACHE_KEY, JSON.stringify(ri), { expirationTtl: CACHE_TTL_SEC });
    console.log('[regImages] fetched and cached s1=' + ri.s1);
    return ri;
  } catch (err) {
    console.log('[regImages] skipped:', err instanceof Error ? err.message : String(err));
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

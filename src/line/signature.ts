/**
 * LINE x-line-signature verification.
 *
 * LINE signs the raw request body with HMAC-SHA256 using the channel secret
 * and sends the base64-encoded digest in the `x-line-signature` header.
 * We recompute the digest and compare in constant time.
 *
 * Uses the Web Crypto API (available natively in the Cloudflare Workers
 * runtime — no `node:crypto` import required).
 */

/**
 * Verify the x-line-signature header on an incoming LINE webhook.
 *
 * @param rawBody - The raw request body as text (exactly as received).
 * @param signature - The `x-line-signature` header value (may be null).
 * @param channelSecret - `LINE_CHANNEL_SECRET` from wrangler secret.
 * @returns true if signature matches, false otherwise.
 */
export async function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): Promise<boolean> {
  if (!signature || signature.length === 0) return false;
  if (!channelSecret || channelSecret.length === 0) return false;

  let expected: string;
  try {
    expected = await computeHmacSha256Base64(rawBody, channelSecret);
  } catch {
    return false;
  }

  return constantTimeEqual(signature, expected);
}

/** Compute HMAC-SHA256 of `body` with `secret`, base64-encoded. */
async function computeHmacSha256Base64(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return bytesToBase64(new Uint8Array(sigBytes));
}

/** Base64-encode a byte array (Workers-friendly — uses btoa). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    // bytes[i] is always defined within bounds; cast for
    // noUncheckedIndexedAccess.
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

/**
 * Constant-time string comparison.
 * Returns false for different-length inputs without early return via length,
 * but short-circuiting on length is fine here — LINE signatures are always
 * a fixed-length base64 of a 32-byte digest (44 chars).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

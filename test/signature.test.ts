import { describe, it, expect } from 'vitest';
import { verifyLineSignature } from '../src/line/signature';

describe('verifyLineSignature', () => {
  const secret = 'testsecret';
  const body = '{"destination":"U12345","events":[]}';

  it('accepts a valid signature', async () => {
    const expectedSig = await computeSigForTest(body, secret);
    const ok = await verifyLineSignature(body, expectedSig, secret);
    expect(ok).toBe(true);
  });

  it('rejects a tampered signature', async () => {
    const tampered = 'A'.repeat(44); // same length as base64(sha256) but wrong bytes
    const ok = await verifyLineSignature(body, tampered, secret);
    expect(ok).toBe(false);
  });

  it('rejects a different-length signature', async () => {
    const shortSig = 'AAAA';
    const ok = await verifyLineSignature(body, shortSig, secret);
    expect(ok).toBe(false);
  });

  it('rejects null signature', async () => {
    const ok = await verifyLineSignature(body, null, secret);
    expect(ok).toBe(false);
  });

  it('rejects empty signature', async () => {
    const ok = await verifyLineSignature(body, '', secret);
    expect(ok).toBe(false);
  });

  it('rejects when body is tampered but signature is from original', async () => {
    const origSig = await computeSigForTest(body, secret);
    const tamperedBody = body.replace('U12345', 'U99999');
    const ok = await verifyLineSignature(tamperedBody, origSig, secret);
    expect(ok).toBe(false);
  });
});

/** Helper — uses Web Crypto, which vitest supports under Node 20+. */
async function computeSigForTest(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

/**
 * Fetch wrapper for Hostinger PHP API.
 * POST/GET with auth header, 1 retry, 5s total budget.
 */

import type { Env } from '../types';

export class PhpApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'PhpApiError';
  }
}

async function doFetch(req: Request): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(req, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(req: Request): Promise<Response> {
  try {
    return await doFetch(req);
  } catch {
    // One retry on network/timeout error
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      return await fetch(req.clone(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

function handleStatus(res: Response): void {
  if (res.ok) return;
  if (res.status === 404) throw new PhpApiError(404, 'not found');
  if (res.status === 409) throw new PhpApiError(409, 'conflict');
  throw new PhpApiError(res.status, 'php api error');
}

/**
 * POST JSON to a PHP API endpoint. Returns parsed response or throws PhpApiError.
 * Retries once on network failure. Total budget: 5 seconds.
 */
export async function phpPost<T>(
  path: string,
  body: unknown,
  env: Env,
): Promise<T> {
  const url = `${env.PHP_API_BASE_URL}${path}`;
  const req = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Line-Oa-Key': env.LINE_OA_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const res = await fetchWithRetry(req);
  handleStatus(res);
  return res.json() as Promise<T>;
}

/**
 * GET a PHP API endpoint. Returns parsed response or throws PhpApiError.
 */
export async function phpGet<T>(
  path: string,
  env: Env,
): Promise<T> {
  const url = `${env.PHP_API_BASE_URL}${path}`;
  const req = new Request(url, {
    method: 'GET',
    headers: {
      'X-Line-Oa-Key': env.LINE_OA_API_KEY,
    },
  });
  const res = await fetchWithRetry(req);
  handleStatus(res);
  return res.json() as Promise<T>;
}

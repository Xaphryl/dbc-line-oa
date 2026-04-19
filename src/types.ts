/**
 * Type definitions for the dbc-line-oa Worker.
 * Kept minimal — only what Phase 2 needs. Later phases will extend this.
 */

/** Cloudflare Worker environment bindings & vars. */
export interface Env {
  // KV namespace (dedup + verification session state)
  LINE_OA_KV: KVNamespace;

  // Secrets (set via `wrangler secret put`)
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_OA_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;

  // Non-secret env vars (wrangler.toml [vars])
  PHP_API_BASE_URL: string;
  IMAGE_BASE_URL: string;
  CLINIC_PHONE: string;
}

/** Minimal LINE webhook event shape. Unknown fields are permitted. */
export interface LineWebhookEvent {
  type: string;
  timestamp: number;
  /** Present on newer webhook payloads — used as the dedup key. */
  webhookEventId?: string;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  /** Single-use reply token, only present on replyable events. */
  replyToken?: string;
  /** For message events. */
  message?: {
    type: string;
    id?: string;
    text?: string;
    [key: string]: unknown;
  };
  /** Permit unknown fields without loss — LINE adds new event fields over time. */
  [key: string]: unknown;
}

/** The body LINE POSTs to the webhook URL. */
export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

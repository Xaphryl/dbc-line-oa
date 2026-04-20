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
  FORWARD_WEBHOOK_URL: string;
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
  message?: LineTextMessage;
  /** Permit unknown fields without loss — LINE adds new event fields over time. */
  [key: string]: unknown;
}

/** The body LINE POSTs to the webhook URL. */
export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

// ── Flex builder DTOs ──────────────────────────────────────────────────────

export interface AppointmentRow {
  aptNum: number;
  aptDateTime: string;  // ISO 8601 string, e.g. "2026-04-25T14:30:00"
  procDescript: string;
}

export interface DayGroup {
  date: string;           // YYYY-MM-DD, e.g. "2026-04-25"
  appointments: AppointmentRow[];
}

export interface NextAppointmentPayload {
  days: DayGroup[];
  imageUrl: string;       // fully-resolved HTTPS URL, e.g. "https://dentalbuddyclinic.com/line-oa/images/songkran.jpg"
}

// Generic LINE Flex container types (minimal — extend as needed)
export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexCarousel | FlexBubble;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexBubble {
  type: 'bubble';
  size: 'kilo' | 'micro' | 'nano' | 'deca' | 'mega' | 'giga';
  hero?: FlexImage;
  body?: FlexBox;
  footer?: FlexBox;
}

export interface FlexImage {
  type: 'image';
  url: string;
  size: string;
  aspectRatio: string;
  aspectMode: 'cover' | 'fit';
}

export interface FlexBox {
  type: 'box';
  layout: 'vertical' | 'horizontal' | 'baseline';
  spacing?: string;
  margin?: string;
  contents: FlexComponent[];
}

export type FlexComponent = FlexBox | FlexText | FlexSeparator | FlexButton;

export interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  weight?: 'regular' | 'bold';
  color?: string;
  wrap?: boolean;
  flex?: number;
}

export interface FlexSeparator {
  type: 'separator';
  margin?: string;
}

export interface FlexButton {
  type: 'button';
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  action: FlexURIAction | FlexMessageAction;
}

export interface FlexURIAction {
  type: 'uri';
  label: string;
  uri: string;
}

export interface FlexMessageAction {
  type: 'message';
  label: string;
  text: string;
}

// ── LINE event message subtypes ────────────────────────────────────────────

export interface LineTextMessage {
  type: 'text';
  id: string;
  text: string;
}

// Narrow LineWebhookEvent for message events
export interface LineMessageEvent extends LineWebhookEvent {
  type: 'message';
  replyToken: string;
  message: LineTextMessage;
}

// ── PHP API response shapes ────────────────────────────────────────────────

export interface ResolvePatientResponse {
  patNum: number;
}

export interface NextAppointmentsResponse {
  days: DayGroup[];
  image_url: string;   // snake_case — PHP convention; map to imageUrl in handler
}

export interface ResolveByPhoneResponse {
  candidates: number[];
}

export interface VerifyAndBindResponse {
  patNum: number;
  fname: string;
  lname: string;
}

// ── Session state ──────────────────────────────────────────────────────────

export type SessionState =
  | { step: 'awaiting_phone' }
  | { step: 'awaiting_national_id'; candidates: number[] }
  | { step: 'awaiting_name_confirm'; patNum: number; fname: string; lname: string };

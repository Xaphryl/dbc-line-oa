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
  aptNum: number | null;
  time: string | null;     // "HH:MM" from PHP; null for overflow hint rows
  procDescript: string;
  note?: string;           // OpenDental appointment Note field; shown when ProcDescript is empty
  overflow?: boolean;
}

export interface DayGroup {
  date: string;           // YYYY-MM-DD, e.g. "2026-04-25"
  appointments: AppointmentRow[];
  image_url: string;      // per-day hero image URL resolved by PHP image-rule engine
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

export interface FlexBubbleStyles {
  header?: { backgroundColor?: string; separator?: boolean };
  hero?:   { separator?: boolean };
  body?:   { backgroundColor?: string; separator?: boolean };
  footer?: { backgroundColor?: string; separator?: boolean };
}

export interface FlexBubble {
  type: 'bubble';
  size: 'kilo' | 'micro' | 'nano' | 'deca' | 'mega' | 'giga';
  hero?: FlexImage;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: FlexBubbleStyles;
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
  flex?: number;
  backgroundColor?: string;
  cornerRadius?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  action?: FlexURIAction | FlexMessageAction;
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
  align?: 'start' | 'center' | 'end';
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
  fname: string;
  lname: string;
}

export interface NextAppointmentsResponse {
  days: DayGroup[];   // image_url now lives on each DayGroup, not at the top level
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

/**
 * Resolved hero image URLs for the three registration steps.
 * Fetched once from /reg-images.php at registration start and stored in every
 * session variant so each step can use the correct image without a second
 * network call.
 */
export interface RegImages {
  s1: string;
  s2: string;
  s3: string;
  /** Hero image for the "no upcoming appointments" empty-state card. */
  no_apt: string;
  /** Hero image for the bind-success / registration-complete card. */
  complete: string;
}

export type SessionState =
  | { step: 'awaiting_phone'; ri: RegImages }
  | { step: 'awaiting_national_id'; candidates: number[]; phone: string; ri: RegImages }
  | { step: 'awaiting_name_confirm'; patNum: number; fname: string; lname: string; phone: string; nationalId: string; ri: RegImages };

// ── PHP API response shapes (registration) ─────────────────────────────────

export interface RegImagesResponse {
  s1_url: string;
  s2_url: string;
  s3_url: string;
  no_apt_url: string;
  complete_url: string;
}

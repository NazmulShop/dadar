import type { User } from "./db/schema";

/**
 * Bindings declared in wrangler.toml. Keep in sync.
 *
 * Free-plan note:
 *   UPLOADS (R2) and ADMIN_HUB (Durable Objects) are NOT available on the
 *   Cloudflare Workers free plan. They are marked optional so the Worker
 *   starts cleanly without them — affected features return 503 gracefully.
 *   Upgrade to the Workers Paid plan ($5/month) to enable them.
 */
export interface Env {
  // D1 — available on free plan
  DB: D1Database;
  // KV — available on free plan (limited: 1K writes/day, 100K reads/day)
  SESSIONS_KV: KVNamespace;
  RATE_KV: KVNamespace;

  // R2 — NOT available on free plan (optional — image uploads return 503 without it)
  UPLOADS?: R2Bucket;

  // Durable Objects — NOT available on free plan (optional — admin WS returns 503 without it)
  ADMIN_HUB?: DurableObjectNamespace;

  // ── Plain vars ──
  CORS_ORIGIN: string;
  APP_URL: string;
  SUPER_ADMIN_ENABLED: string;
  BREVO_FROM_EMAIL: string;
  /** Alias accepted per the auth spec (SENDER_EMAIL → BREVO_FROM_EMAIL fallback) */
  SENDER_EMAIL?: string;
  IMAGE_CDN_BASE: string;
  NODE_ENV: string;

  // ── Secrets ──
  JWT_SECRET?: string;
  SESSION_SECRET?: string;
  BREVO_API_KEY?: string;
  // Primary names per auth spec
  ADMIN_EMAIL?: string;
  ADMIN_SECRET_KEY?: string;
  // Legacy aliases — still accepted if set in Cloudflare
  SUPER_ADMIN_EMAIL?: string;
  SUPER_ADMIN_SECRET_KEY?: string;
  INTERNAL_BROADCAST_SECRET?: string;
  /** Powers the real AI assistant (account.support.tsx "AI Assistant" tab).
   *  Without it, /api/support/chatbot falls back to the rule-based responder. */
  ANTHROPIC_API_KEY?: string;
}

/** Hono context variables — set by middleware, read by handlers. */
export type Variables = {
  user?: User;
  requestId: string;
};

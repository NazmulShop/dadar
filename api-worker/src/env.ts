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
  IMAGE_CDN_BASE: string;
  NODE_ENV: string;

  // ── Secrets ──
  JWT_SECRET?: string;
  SESSION_SECRET?: string;
  BREVO_API_KEY?: string;
  // SENDER_EMAIL is the spec-named alias for BREVO_FROM_EMAIL — either works.
  SENDER_EMAIL?: string;
  // ADMIN_EMAIL / ADMIN_SECRET_KEY are the spec-named admin credentials.
  // SUPER_ADMIN_EMAIL / SUPER_ADMIN_SECRET_KEY are kept as backward-compatible
  // aliases so an already-deployed Worker does not need its secrets renamed.
  ADMIN_EMAIL?: string;
  ADMIN_SECRET_KEY?: string;
  SUPER_ADMIN_EMAIL?: string;
  SUPER_ADMIN_SECRET_KEY?: string;
  INTERNAL_BROADCAST_SECRET?: string;
}

/** Hono context variables — set by middleware, read by handlers. */
export type Variables = {
  user?: User;
  requestId: string;
};

/**
 * Startup validation — runs once per Worker isolate.
 *
 * Logs (does NOT throw) clear warnings for:
 *   - missing D1 / KV bindings (required on all plans)
 *   - missing required secrets (JWT_SECRET, etc.)
 *   - APP_URL / CORS_ORIGIN not set, or still the wrangler.toml placeholder
 *     value, or unsafe in production
 *   - Super Admin bootstrap left enabled in production
 *
 * Free-plan awareness:
 *   - UPLOADS (R2) absent → info log only, image endpoints fall back to D1 storage
 *   - ADMIN_HUB (Durable Objects) absent → info log only, WS endpoint returns 503 gracefully
 *
 * Local dev: only emits warnings — never breaks `wrangler dev`.
 * Production: surfaces the same warnings in Worker logs (`wrangler tail`).
 */
import type { Env } from "../env";

let validated = false;

export function validateEnvOnce(env: Env): void {
  if (validated) return;
  validated = true;

  const isProd = (env.NODE_ENV ?? "").toLowerCase() === "production";
  const info = (msg: string) =>
    console.info(`[startup]${isProd ? " (production)" : ""} ${msg}`);
  const warn = (msg: string) =>
    console.warn(`[startup]${isProd ? " (production)" : ""} ${msg}`);
  const err = (msg: string) =>
    console.error(`[startup]${isProd ? " (production)" : ""} ${msg}`);

  // ── Required bindings (available on all plans) ──
  if (!env.DB) err("D1 binding `DB` is missing — configure [[d1_databases]] in wrangler.toml");
  if (!env.SESSIONS_KV) err("KV binding `SESSIONS_KV` is missing — configure [[kv_namespaces]] in wrangler.toml");
  if (!env.RATE_KV) err("KV binding `RATE_KV` is missing — configure [[kv_namespaces]] in wrangler.toml");

  // ── Optional paid-plan bindings ──
  if (!env.UPLOADS) {
    info("R2 binding `UPLOADS` not configured — image uploads will use the D1 fallback store (free-plan mode, images capped ~750KB). Bind R2 on a paid plan for larger uploads.");
  }
  if (!env.ADMIN_HUB) {
    info(
      "Durable Object binding `ADMIN_HUB` not configured — admin WebSocket will return 503 " +
        "(requires Workers Paid plan — upgrade at dash.cloudflare.com)",
    );
  }

  // ── Secrets ──
  const jwt = env.JWT_SECRET ?? env.SESSION_SECRET;
  if (!jwt || jwt.length < 32) {
    err(
      "JWT_SECRET (or SESSION_SECRET alias) missing or shorter than 32 chars — " +
        "all logins will fail. Generate: openssl rand -hex 32 | wrangler secret put JWT_SECRET",
    );
  }
  if (env.ADMIN_HUB) {
    // Only warn about INTERNAL_BROADCAST_SECRET if Durable Objects are bound.
    if (!env.INTERNAL_BROADCAST_SECRET || env.INTERNAL_BROADCAST_SECRET.length < 16) {
      warn(
        "INTERNAL_BROADCAST_SECRET missing or < 16 chars — admin WebSocket broadcasts are disabled (fail-closed)",
      );
    }
  }
  if (!env.BREVO_API_KEY) {
    warn("BREVO_API_KEY missing — OTP / verification emails will print to console instead of sending");
  }

  // ── URL safety ──
  const appUrl = env.APP_URL ?? "";
  const corsOrigin = env.CORS_ORIGIN ?? "";
  // Placeholder values shipped in wrangler.toml's [vars] block by default —
  // both are syntactically valid https:// URLs, so the checks below would
  // otherwise pass silently if a deploy forgets to replace them.
  const isPlaceholderAppUrl = /your-worker-subdomain/i.test(appUrl);
  const isPlaceholderCorsOrigin = /your-frontend-domain/i.test(corsOrigin);

  if (isPlaceholderAppUrl) {
    err(
      `APP_URL is still the wrangler.toml placeholder ("${appUrl}") — ` +
        "set it to your real deployed Worker URL before going to production.",
    );
  }
  if (isPlaceholderCorsOrigin) {
    err(
      `CORS_ORIGIN is still the wrangler.toml placeholder ("${corsOrigin}") — ` +
        "set it to your real frontend URL(s) before going to production.",
    );
  }

  if (isProd) {
    if (!appUrl) {
      err(
        "APP_URL not set in production — email links and upload fallback URLs will break. " +
          "Set it to your Worker URL, e.g. https://dadar.your-subdomain.workers.dev",
      );
    } else if (!isPlaceholderAppUrl && /localhost|127\.0\.0\.1/i.test(appUrl)) {
      err(`APP_URL is localhost ("${appUrl}") in production — set it to your real Worker URL`);
    } else if (!/^https?:\/\//i.test(appUrl)) {
      err("APP_URL must be an absolute http(s) URL");
    }

    if (!corsOrigin) {
      warn(
        "CORS_ORIGIN not set — defaulting to echo-origin (any domain can call the API). " +
          "Set it to your frontend URL, e.g. https://dadar-shop.pages.dev",
      );
    } else if (corsOrigin === "*") {
      warn("CORS_ORIGIN=\"*\" in production — credentialed CORS requires explicit origins");
    }
  }

  // ── Super Admin bootstrap left armed in production ──
  if (isProd && (env.SUPER_ADMIN_ENABLED ?? "").toLowerCase() === "true") {
    warn(
      "SUPER_ADMIN_ENABLED=true in production — disable this after the first Super Admin is created",
    );
  }
}

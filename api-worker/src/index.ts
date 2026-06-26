/**
 * Dadar Shop API — Cloudflare Workers entry point.
 *
 * Mounts:
 *   GET  /api/healthz
 *   GET  /api/health/admin           GET /api/health/admin/last
 *   POST /api/auth/*                 (register/login/logout/me/...
 *                                      includes /admin/verify-otp and
 *                                      /admin/verify-secret as spec-named
 *                                      aliases of /admin-login/verify-otp
 *                                      and /admin-login/verify-secret)
 *   *    /api/admin/*                (admin core + admin-management)
 *   *    /api/support/*
 *   *    /api/uploads/*
 *   GET  /api/admin/ws               (WebSocket upgrade → AdminHub DO)
 *
 * Frontend (`artifacts/dadar-shop`) only needs `VITE_API_URL` flipped
 * to the deployed Worker origin. No code changes required.
 *
 * The `Env` bindings type (DB, SESSIONS_KV, RATE_KV, APP_URL, CORS_ORIGIN,
 * plus optional R2/Durable Object/secret fields) is defined once in
 * `./env.ts` and re-exported here so it's directly importable from the
 * entry point — `import type { Env } from "./index"` works the same as
 * `import type { Env } from "./env"`.
 */
import { Hono } from "hono";
import type { Env, Variables } from "./env";
import { cors } from "./lib/cors";
import { generateId } from "./lib/ids";
import health from "./routes/health";
import auth from "./routes/auth";
import account from "./routes/account";
import admin from "./routes/admin";
import adminManagement from "./routes/admin-management";
import support from "./routes/support";
import uploads from "./routes/uploads";
import shop from "./routes/shop";
import { handleWsUpgrade } from "./routes/ws";
import { runHealthCheck } from "./lib/health";
import { validateEnvOnce } from "./lib/startup";

export type { Env, Variables } from "./env";
export { AdminHub } from "./do/AdminHub";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── Cross-cutting middleware ──
app.use("*", async (c, next) => {
  c.set("requestId", c.req.header("x-request-id") ?? generateId());
  await next();
});
app.use("*", cors());

// ── 20MB body cap on /api/* (matches Express limit) ──
app.use("/api/*", async (c, next) => {
  const len = Number(c.req.header("content-length") ?? "0");
  if (len > 20 * 1024 * 1024) {
    return c.json({ error: "Payload too large" }, 413);
  }
  await next();
});

// ── Mount routers under /api ──
app.route("/api", health);
app.route("/api/auth", auth);
app.route("/api/account", account);
app.route("/api/admin", admin);
app.route("/api/admin", adminManagement);
app.route("/api/shop", shop);
app.route("/api/support", support);
app.route("/api/uploads", uploads);

// ── 404 ──
app.notFound((c) => c.json({ error: "Not found" }, 404));

// ── Global error envelope ──
app.onError((err, c) => {
  const status = (err as any)?.status ?? 500;
  console.error("[error]", c.req.method, c.req.path, err);
  return c.json(
    {
      error:
        (err as any)?.publicMessage ??
        (status >= 500 ? "Internal server error" : err.message),
    },
    status,
  );
});

// ── Worker default export ──
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    validateEnvOnce(env);
    // WebSocket upgrade has to bypass Hono so we can return a 101 with the
    // socket pair from the Durable Object.
    const url = new URL(request.url);
    if (url.pathname === "/api/admin/ws") {
      return handleWsUpgrade(request, env);
    }
    return app.fetch(request, env, ctx);
  },

  // ── Cron trigger: re-runs health check every minute. DO alarm refines to 15s. ──
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    validateEnvOnce(env);
    ctx.waitUntil(
      (async () => {
        try {
          await runHealthCheck(env);
        } catch (err) {
          console.warn("[cron] health check failed", err);
        }
      })(),
    );
  },
};

import type { Context, MiddlewareHandler } from "hono";
import type { Env, Variables } from "../env";

/**
 * CORS middleware that mirrors the Express server's behavior:
 *  - `CORS_ORIGIN` may be "*" (echo "*") or a comma-separated allow-list.
 *  - Credentials are allowed (frontend uses `Authorization` header, not cookies,
 *    but keeping the header preserves any future cookie-based flow).
 *  - Preflight OPTIONS short-circuits with 204.
 */
export function cors(): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const origin = c.req.header("origin");
    const cfg = (c.env.CORS_ORIGIN || "*").trim();

    // Normalize allowed origins: lowercase + strip trailing slash for comparison
    const normalize = (s: string) => s.toLowerCase().replace(/\/+$/, "");

    const allowed = cfg === "*" ? "*" : cfg.split(",").map((s) => normalize(s.trim())).filter(Boolean);

    let allowOrigin = "";
    if (allowed === "*") {
      // Echo the real origin instead of "*" so credentialed requests work.
      allowOrigin = origin ?? "*";
    } else if (origin) {
      // Case-insensitive, trailing-slash-tolerant match.
      if (allowed.includes(normalize(origin))) allowOrigin = origin;
    }

    // Always set CORS headers — even on error responses.
    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
      c.header("Vary", "Origin");
      c.header("Access-Control-Allow-Credentials", "true");
    }

    if (c.req.method === "OPTIONS") {
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.header(
        "Access-Control-Allow-Headers",
        c.req.header("access-control-request-headers") ??
          "Content-Type, Authorization, X-Requested-With, Accept, Origin",
      );
      c.header("Access-Control-Max-Age", "86400");
      return c.body(null, 204);
    }

    await next();

    // Re-apply CORS on error responses (Hono's onError may not go through middleware again).
    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
      c.header("Access-Control-Allow-Credentials", "true");
    }
  };
}

export function clientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

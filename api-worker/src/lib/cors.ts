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
    const cfg = c.env.CORS_ORIGIN || "*";
    const allowed =
      cfg === "*"
        ? "*"
        : cfg.split(",").map((s) => s.trim()).filter(Boolean);

    let allowOrigin = "";
    if (allowed === "*") allowOrigin = origin ?? "*";
    else if (origin && allowed.includes(origin)) allowOrigin = origin;

    if (allowOrigin) {
      c.header("Access-Control-Allow-Origin", allowOrigin);
      c.header("Vary", "Origin");
      c.header("Access-Control-Allow-Credentials", "true");
    }

    if (c.req.method === "OPTIONS") {
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      c.header(
        "Access-Control-Allow-Headers",
        c.req.header("access-control-request-headers") ??
          "Content-Type, Authorization, X-Requested-With, Accept, Origin",
      );
      c.header("Access-Control-Max-Age", "86400");
      return c.body(null, 204);
    }

    await next();
  };
}

export function clientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

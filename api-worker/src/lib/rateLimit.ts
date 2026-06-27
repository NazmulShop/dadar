/**
 * KV-backed sliding window rate limiter.
 *
 * Replaces the in-memory `RATE` Map used in the Express server, which
 * doesn't survive across Workers isolates.
 *
 * Stored at `rl:<key>` with a JSON value `{ count, reset }` and a TTL
 * equal to the window. Returns `false` once `count > limit` within the
 * current window.
 */
import type { Env } from "../env";

export async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const cacheKey = `rl:${key}`;
  try {
    const raw = await env.RATE_KV.get(cacheKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { count: number; reset: number };
        if (parsed.reset > now) {
          if (parsed.count >= limit) return false;
          const next = { count: parsed.count + 1, reset: parsed.reset };
          await env.RATE_KV.put(cacheKey, JSON.stringify(next), {
            expirationTtl: Math.max(60, Math.ceil((parsed.reset - now) / 1000)),
          });
          return true;
        }
      } catch {
        /* fall through to reset */
      }
    }
    const reset = now + windowMs;
    await env.RATE_KV.put(
      cacheKey,
      JSON.stringify({ count: 1, reset }),
      { expirationTtl: Math.max(60, Math.ceil(windowMs / 1000)) },
    );
    return true;
  } catch {
    // If KV is unavailable, fail-open rather than blocking real traffic.
    return true;
  }
}

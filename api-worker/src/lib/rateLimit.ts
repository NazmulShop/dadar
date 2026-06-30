/**
 * D1-backed sliding window rate limiter.
 *
 * Previously backed by Workers KV (`RATE_KV`). Moved to D1 because the
 * Workers KV free plan caps write (`put`) operations at 1,000/day,
 * account-wide — and the admin login flow alone could burn through that
 * quota in well under a day (every login touches the rate limiter twice,
 * plus the ticket helpers in routes/auth.ts write 2 more times). Once the
 * KV quota was exhausted, `RATE_KV.put()` started throwing
 * "KV put() limit exceeded for the day", which is exactly the error seen
 * blocking admin login.
 *
 * D1's free-plan write allowance is far higher, so the same `key ->
 * { count, reset }` model now lives in the `rate_limit_counters` table
 * instead. Expired rows are deleted opportunistically on read so the table
 * never grows unbounded.
 */
import { eq, lt } from "drizzle-orm";
import type { Env } from "../env";
import { getDb, rateLimitCountersTable } from "../db";

export async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const db = getDb(env);

  try {
    const existing = await db
      .select()
      .from(rateLimitCountersTable)
      .where(eq(rateLimitCountersTable.key, key))
      .limit(1);

    const row = existing[0];

    if (row && row.resetAt && row.resetAt.getTime() > now) {
      if (row.count >= limit) return false;
      await db
        .update(rateLimitCountersTable)
        .set({ count: row.count + 1 })
        .where(eq(rateLimitCountersTable.key, key));
      return true;
    }

    // No row yet, or the previous window has expired — start a fresh window.
    const reset = new Date(now + windowMs);
    if (row) {
      await db
        .update(rateLimitCountersTable)
        .set({ count: 1, resetAt: reset })
        .where(eq(rateLimitCountersTable.key, key));
    } else {
      await db.insert(rateLimitCountersTable).values({ key, count: 1, resetAt: reset });
    }

    // Best-effort cleanup of stale rows so this table never grows unbounded.
    // Failures here must never block the request.
    db.delete(rateLimitCountersTable)
      .where(lt(rateLimitCountersTable.resetAt, new Date(now - 24 * 60 * 60 * 1000)))
      .catch(() => {});

    return true;
  } catch {
    // If D1 is unavailable for some reason, fail-open rather than blocking
    // real traffic (same fail-open behavior as before).
    return true;
  }
}

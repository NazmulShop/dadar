/**
 * Session model — D1 (SQLite) as the primary session store.
 *
 * Why D1 instead of KV:
 *   KV is eventually consistent (up to ~60s propagation globally).
 *   This means a logout or password-reset might not take effect
 *   immediately in all regions. D1 is strongly consistent (SQLite WAL),
 *   so session revocation takes effect the instant the row is deleted.
 *
 * Architecture:
 *   - JWT carries identity + expiry (signed, stateless — fast path).
 *   - D1 `sessions` table is the revocation list:
 *       • token_hash → session row exists = session is live
 *       • row deleted = logout (immediate, consistent)
 *       • all user rows deleted = password-reset / ban (immediate)
 *   - KV `SESSIONS_KV` is retained only for health-status caching
 *     in health.ts — no longer used for session data.
 */
import { and, eq, gt } from "drizzle-orm";
import type { Env } from "../env";
import { sha256Hex, generateId } from "./ids";
import { signToken, verifyToken, getSessionDuration } from "./jwt";
import { getDb, sessionsTable } from "../db";

export async function createSession(
  env: Env,
  userId: string,
  role: string,
  remember: boolean,
): Promise<{ token: string; expiresAt: Date }> {
  const token = await signToken(env, { userId, role }, remember);
  const ttlMs = getSessionDuration(remember);
  const expiresAt = new Date(Date.now() + ttlMs);
  const tokenHash = await sha256Hex(token);

  await getDb(env).insert(sessionsTable).values({
    id: generateId(),
    userId,
    tokenHash,
    remember,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function validateSession(
  env: Env,
  token: string,
): Promise<{ userId: string; role: string } | null> {
  // 1. Verify JWT signature and expiry (fast, no I/O)
  const payload = await verifyToken(env, token);
  if (!payload) return null;

  // 2. Check D1 — immediately consistent, no eventual-consistency lag
  const tokenHash = await sha256Hex(token);
  const now = new Date();

  const rows = await getDb(env)
    .select({ userId: sessionsTable.userId })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tokenHash, tokenHash),
        gt(sessionsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!rows.length) return null;

  return { userId: payload.userId, role: payload.role };
}

export async function destroySession(env: Env, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await getDb(env)
    .delete(sessionsTable)
    .where(eq(sessionsTable.tokenHash, tokenHash));
}

/**
 * Invalidate every session for a user — used on password reset / ban.
 * D1 DELETE is immediate: the user is logged out globally within
 * milliseconds, not 60 seconds.
 */
export async function revokeAllForUser(env: Env, userId: string): Promise<void> {
  await getDb(env)
    .delete(sessionsTable)
    .where(eq(sessionsTable.userId, userId));
}

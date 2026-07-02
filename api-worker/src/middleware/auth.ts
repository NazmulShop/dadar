import type { Context, MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import type { Env, Variables } from "../env";
import { getDb, usersTable } from "../db";
import { validateSession } from "../lib/session";

type Ctx = { Bindings: Env; Variables: Variables };

async function loadUserFromBearer(c: Context<Ctx>) {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const session = await validateSession(c.env, token);
  if (!session) return null;
  const db = getDb(c.env);
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return rows[0] ?? null;
}

export function requireAuth(): MiddlewareHandler<Ctx> {
  return async (c, next) => {
    const user = await loadUserFromBearer(c);
    if (!user) return c.json({ error: "Not authenticated" }, 401);
    if (user.status !== "active") {
      return c.json({ error: `Your account is ${user.status}. Contact support.` }, 403);
    }
    c.set("user", user);
    await next();
  };
}

export function requireAdmin(): MiddlewareHandler<Ctx> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Not authenticated" }, 401);
    if (user.role !== "admin" && user.role !== "moderator") {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

export function requireSuperAdmin(): MiddlewareHandler<Ctx> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Not authenticated" }, 401);
    if (!user.isSuperAdmin) return c.json({ error: "Super admin required" }, 403);
    await next();
  };
}

/** Best-effort: attach user if present, don't reject anonymous requests. */
export function optionalAuth(): MiddlewareHandler<Ctx> {
  return async (c, next) => {
    const user = await loadUserFromBearer(c);
    if (user) c.set("user", user);
    await next();
  };
}

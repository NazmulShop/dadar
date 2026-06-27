/**
 * Admin Management & Activity Log routes — full port of
 * `api-server/src/routes/admin-management.ts` (~390 lines).
 *
 * Mounted at `/api/admin`, so endpoint paths match Express exactly:
 *   GET    /api/admin/users
 *   GET    /api/admin/admins
 *   POST   /api/admin/users/:id/promote
 *   POST   /api/admin/users/:id/demote
 *   POST   /api/admin/users/:id/status
 *   DELETE /api/admin/users/:id
 *   GET    /api/admin/activity-logs
 *
 * Authorization is enforced backend-side. Super Admin is fully protected:
 * cannot be deleted, banned, suspended, demoted, or role-changed.
 */
import { Hono } from "hono";
import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env, Variables } from "../env";
import { requireAuth } from "../middleware/auth";
import { getDb, usersTable, sessionsTable, adminActivityLogsTable, type User } from "../db";
import { logAdminActivity } from "../lib/activityLog";
import { rateLimit } from "../lib/rateLimit";
import { revokeAllForUser } from "../lib/session";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// All endpoints require an authenticated user.
app.use("*", requireAuth());

/* ─────────── Local admin helpers (stricter than middleware) ─────────── */
// Express required role === "admin" AND emailVerified AND status active.
// Worker's shared `requireAdmin()` middleware also allows moderators, so
// admin-management re-enforces the stricter rule here.
function isAdmin(u: User | undefined): u is User {
  return !!u && u.role === "admin" && u.emailVerified && u.status === "active";
}
function isSuperAdmin(u: User | undefined): u is User {
  return isAdmin(u) && u.isSuperAdmin === true;
}

function safeUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    status: u.status,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt!.getTime(),
    updatedAt: u.updatedAt!.getTime(),
  };
}

function clientMeta(c: any) {
  return {
    ip:
      (c.req.header("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      null,
    userAgent: c.req.header("user-agent") ?? null,
  };
}

/* ─── GET /users ─────────────────────────────────────────────────────────── */
app.get("/users", async (c) => {
  const admin = c.get("user");
  if (!isAdmin(admin)) return c.json({ error: "Forbidden" }, 403);

  const parsed = z
    .object({
      q: z.string().trim().max(120).optional(),
      role: z.enum(["all", "user", "seller", "moderator", "admin"]).optional().default("all"),
      status: z.enum(["all", "active", "banned", "suspended"]).optional().default("all"),
      sort: z.enum(["createdAt", "name", "email", "role"]).optional().default("createdAt"),
      order: z.enum(["asc", "desc"]).optional().default("desc"),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    })
    .safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) return c.json({ error: "Invalid query" }, 400);
  const { q, role, status, sort, order, page, pageSize } = parsed.data;

  const filters: any[] = [];
  if (q) {
    // SQLite LIKE is case-insensitive for ASCII; lower both sides for safety.
    const needle = `%${q.toLowerCase()}%`;
    filters.push(
      or(
        like(sql`LOWER(${usersTable.name})`, needle),
        like(sql`LOWER(${usersTable.email})`, needle),
      ),
    );
  }
  if (role !== "all") filters.push(eq(usersTable.role, role));
  if (status !== "all") filters.push(eq(usersTable.status, status));
  const where = filters.length ? and(...filters) : undefined;

  const sortCol =
    sort === "name" ? usersTable.name
      : sort === "email" ? usersTable.email
      : sort === "role" ? usersTable.role
      : usersTable.createdAt;
  const orderExpr = order === "asc" ? asc(sortCol) : desc(sortCol);
  const offset = (page - 1) * pageSize;
  const db = getDb(c.env);
  const [rows, totalRow] = await Promise.all([
    db.select().from(usersTable).where(where as any).orderBy(orderExpr).limit(pageSize).offset(offset),
    db.select({ c: count() }).from(usersTable).where(where as any),
  ]);

  return c.json({
    users: rows.map(safeUser),
    page,
    pageSize,
    total: Number(totalRow[0]?.c ?? 0),
  });
});

/* ─── GET /admins ────────────────────────────────────────────────────────── */
app.get("/admins", async (c) => {
  const admin = c.get("user");
  if (!isAdmin(admin)) return c.json({ error: "Forbidden" }, 403);
  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .orderBy(desc(usersTable.isSuperAdmin), desc(usersTable.createdAt));
  return c.json({ admins: rows.map(safeUser) });
});

/* ─── POST /users/:id/promote ────────────────────────────────────────────── */
app.post("/users/:id/promote", async (c) => {
  const meta = clientMeta(c);
  if (!(await rateLimit(c.env, `promote:${meta.ip ?? "unknown"}`, 30, 60_000))) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  const su = c.get("user");
  if (!isSuperAdmin(su)) return c.json({ error: "Only Super Admin can perform this action" }, 403);

  const raw = await c.req.json().catch(() => ({}));
  const parsed = z
    .object({ reason: z.string().trim().max(500).optional() })
    .safeParse(raw ?? {});
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const targetId = c.req.param("id");
  if (targetId === su.id) return c.json({ error: "You are already an admin." }, 400);

  const db = getDb(c.env);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);
  if (!target.emailVerified) return c.json({ error: "User must verify email before becoming admin." }, 400);
  if (target.role === "admin") return c.json({ error: "User is already an admin." }, 409);
  if (target.status !== "active") return c.json({ error: "Only active users can be promoted." }, 400);

  await db
    .update(usersTable)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(usersTable.id, targetId));

  await logAdminActivity(c.env, {
    adminId: su.id,
    action: "admin_promotion",
    targetUserId: targetId,
    details: { fromRole: target.role, reason: parsed.data.reason ?? null },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  return c.json({ user: safeUser(updated!) });
});

/* ─── POST /users/:id/demote ─────────────────────────────────────────────── */
app.post("/users/:id/demote", async (c) => {
  const meta = clientMeta(c);
  if (!(await rateLimit(c.env, `demote:${meta.ip ?? "unknown"}`, 30, 60_000))) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  const su = c.get("user");
  if (!isSuperAdmin(su)) return c.json({ error: "Only Super Admin can perform this action" }, 403);

  const raw = await c.req.json().catch(() => ({}));
  const parsed = z
    .object({
      newRole: z.enum(["user", "seller", "moderator"]).optional().default("user"),
      reason: z.string().trim().max(500).optional(),
    })
    .safeParse(raw ?? {});
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const targetId = c.req.param("id");
  const db = getDb(c.env);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);
  if (target.isSuperAdmin) return c.json({ error: "Super Admin cannot be demoted or modified." }, 403);
  if (target.id === su.id) return c.json({ error: "You cannot demote yourself." }, 400);
  if (target.role !== "admin") return c.json({ error: "User is not an admin." }, 400);

  await db
    .update(usersTable)
    .set({ role: parsed.data.newRole, updatedAt: new Date() })
    .where(eq(usersTable.id, targetId));

  await logAdminActivity(c.env, {
    adminId: su.id,
    action: "admin_removal",
    targetUserId: targetId,
    details: { toRole: parsed.data.newRole, reason: parsed.data.reason ?? null },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  return c.json({ user: safeUser(updated!) });
});

/* ─── POST /users/:id/status ─────────────────────────────────────────────── */
app.post("/users/:id/status", async (c) => {
  const meta = clientMeta(c);
  const admin = c.get("user");
  if (!isAdmin(admin)) return c.json({ error: "Forbidden" }, 403);

  const raw = await c.req.json().catch(() => ({}));
  const parsed = z
    .object({
      status: z.enum(["active", "banned", "suspended"]),
      reason: z.string().trim().max(500).optional(),
    })
    .safeParse(raw ?? {});
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const targetId = c.req.param("id");
  const db = getDb(c.env);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);
  if (target.isSuperAdmin) return c.json({ error: "Super Admin cannot be banned, suspended or modified." }, 403);
  if (target.role === "admin" && !admin.isSuperAdmin) {
    return c.json({ error: "Only Super Admin can change another admin's status." }, 403);
  }
  if (target.id === admin.id) return c.json({ error: "You cannot change your own status." }, 400);

  await db
    .update(usersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(usersTable.id, targetId));

  // Invalidate all sessions on ban/suspend — D1 row delete AND KV tombstone.
  if (parsed.data.status !== "active") {
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, targetId));
    await revokeAllForUser(c.env, targetId);
  }

  const actionMap: Record<string, string> = {
    active: "user_unban",
    banned: "user_ban",
    suspended: "user_suspend",
  };
  await logAdminActivity(c.env, {
    adminId: admin.id,
    action: actionMap[parsed.data.status] ?? "user_status_change",
    targetUserId: targetId,
    details: { status: parsed.data.status, reason: parsed.data.reason ?? null },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  return c.json({ user: safeUser(updated!) });
});

/* ─── DELETE /users/:id ─────────────────────────────────────────────────── */
app.delete("/users/:id", async (c) => {
  const meta = clientMeta(c);
  const su = c.get("user");
  if (!isSuperAdmin(su)) return c.json({ error: "Only Super Admin can delete users." }, 403);

  const targetId = c.req.param("id");
  const db = getDb(c.env);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);
  if (target.isSuperAdmin) return c.json({ error: "Super Admin cannot be deleted." }, 403);
  if (target.id === su.id) return c.json({ error: "You cannot delete yourself." }, 400);

  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  // Hard delete also revokes any live JWTs.
  await revokeAllForUser(c.env, targetId);

  await logAdminActivity(c.env, {
    adminId: su.id,
    action: "user_deleted",
    targetUserId: targetId,
    details: { email: target.email },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return c.json({ ok: true });
});

/* ─── GET /activity-logs ────────────────────────────────────────────────── */
app.get("/activity-logs", async (c) => {
  const admin = c.get("user");
  if (!isAdmin(admin)) return c.json({ error: "Forbidden" }, 403);

  const parsed = z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
      action: z.string().trim().max(60).optional(),
    })
    .safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) return c.json({ error: "Invalid query" }, 400);
  const { page, pageSize, action } = parsed.data;

  const where = action ? eq(adminActivityLogsTable.action, action) : undefined;
  const offset = (page - 1) * pageSize;
  const db = getDb(c.env);
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(adminActivityLogsTable)
      .where(where as any)
      .orderBy(desc(adminActivityLogsTable.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ c: count() }).from(adminActivityLogsTable).where(where as any),
  ]);

  return c.json({
    logs: rows.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      targetUserId: l.targetUserId,
      action: l.action,
      details: l.details,
      ip: l.ip,
      userAgent: l.userAgent,
      createdAt: l.createdAt!.getTime(),
    })),
    page,
    pageSize,
    total: Number(totalRow[0]?.c ?? 0),
  });
});

export default app;

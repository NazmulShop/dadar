import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { getDb, usersTable, systemSettingsTable } from "../db";
import { generateId, sha256Hex, timingSafeEqualHex } from "./ids";

/**
 * One-time Super Admin bootstrap — security-critical, identical contract
 * to the Express server (`artifacts/api-server/src/lib/superAdmin.ts`).
 *
 * Eligibility AND of:
 *   1. SUPER_ADMIN_ENABLED=true
 *   2. SUPER_ADMIN_EMAIL matches the registering email
 *   3. SUPER_ADMIN_SECRET_KEY set (>=16 chars) and provided secret matches
 *      via timing-safe SHA-256 compare
 *   4. Email verified
 *   5. No Super Admin already exists
 *   6. system_settings.setup_completed is false
 */
/**
 * Returns the configured admin email.
 * Reads ADMIN_EMAIL first (per auth spec), falls back to SUPER_ADMIN_EMAIL.
 */
export function configuredSuperAdminEmail(env: Env): string | null {
  const v = env.ADMIN_EMAIL || env.SUPER_ADMIN_EMAIL;
  return v ? v.toLowerCase().trim() : null;
}

/**
 * Returns the configured admin secret key.
 * Reads ADMIN_SECRET_KEY first (per auth spec), falls back to SUPER_ADMIN_SECRET_KEY.
 * Must be >= 16 characters.
 */
export function configuredSuperAdminSecret(env: Env): string | null {
  const v = env.ADMIN_SECRET_KEY || env.SUPER_ADMIN_SECRET_KEY;
  if (!v) return null;
  const t = v.trim();
  if (t.length < 16) return null;
  return t;
}

/**
 * SUPER_ADMIN_ENABLED gates only the ONE-TIME bootstrap registration.
 * It does NOT gate admin login — once the account exists, login always works.
 */
export function superAdminEnabled(env: Env): boolean {
  return (env.SUPER_ADMIN_ENABLED ?? "").toLowerCase() === "true";
}

export async function verifySuperAdminSecret(env: Env, provided: unknown): Promise<boolean> {
  const expected = configuredSuperAdminSecret(env);
  if (!expected) return false;
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = await sha256Hex(provided);
  const b = await sha256Hex(expected);
  return timingSafeEqualHex(a, b);
}

export async function getSystemSettings(env: Env) {
  const db = getDb(env);
  const rows = await db.select().from(systemSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const created = await db
    .insert(systemSettingsTable)
    .values({ id: generateId(), setupCompleted: false })
    .returning();
  return created[0]!;
}

export async function markSetupCompleted(env: Env): Promise<void> {
  const db = getDb(env);
  const current = await getSystemSettings(env);
  await db
    .update(systemSettingsTable)
    .set({ setupCompleted: true, updatedAt: new Date() })
    .where(eq(systemSettingsTable.id, current.id));
}

export async function existingSuperAdminCount(env: Env): Promise<number> {
  const db = getDb(env);
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.isSuperAdmin, true))
    .limit(1);
  return rows.length;
}

export type BootstrapReason =
  | "ok"
  | "disabled"
  | "email_mismatch"
  | "email_not_verified"
  | "bad_secret"
  | "already_completed"
  | "super_admin_exists";

export async function evaluateBootstrap(
  env: Env,
  input: { email: string; secretKey: unknown; emailVerified: boolean },
): Promise<{ ok: boolean; reason: BootstrapReason }> {
  if (!superAdminEnabled(env)) return { ok: false, reason: "disabled" };

  const cfgEmail = configuredSuperAdminEmail(env);
  if (!cfgEmail || input.email.toLowerCase() !== cfgEmail) {
    return { ok: false, reason: "email_mismatch" };
  }

  const settings = await getSystemSettings(env);
  if (settings.setupCompleted) return { ok: false, reason: "already_completed" };

  if ((await existingSuperAdminCount(env)) > 0) {
    return { ok: false, reason: "super_admin_exists" };
  }

  if (!(await verifySuperAdminSecret(env, input.secretKey))) {
    return { ok: false, reason: "bad_secret" };
  }

  if (!input.emailVerified) return { ok: false, reason: "email_not_verified" };

  return { ok: true, reason: "ok" };
}

/** Idempotently restore the Super Admin's role on login. */
export async function restoreSuperAdminIfMatches(
  env: Env,
  user: { id: string; email: string; role: string; isSuperAdmin: boolean },
): Promise<void> {
  const cfgEmail = configuredSuperAdminEmail(env);
  if (!cfgEmail || user.email.toLowerCase() !== cfgEmail) return;

  const settings = await getSystemSettings(env);
  if (!settings.setupCompleted && !user.isSuperAdmin) return;

  if (user.role !== "admin" || !user.isSuperAdmin) {
    const db = getDb(env);
    await db
      .update(usersTable)
      .set({ role: "admin", isSuperAdmin: true, status: "active", updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }
}

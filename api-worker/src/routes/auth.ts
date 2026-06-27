/**
 * Auth routes.
 *
 * Endpoints (all under /api/auth):
 *   POST /register   POST /login    POST /logout    GET  /me
 *   POST /admin-login/verify-otp   POST /admin-login/verify-secret
 *   POST /send-otp   POST /verify-otp
 *   POST /verify-email  POST /send-verification-email
 *   POST /forgot-password  POST /reset-password
 *
 * Super Admin login (the single account whose email matches the
 * SUPER_ADMIN_EMAIL secret) is gated behind 3 sequential steps, all
 * driven from the same /login form on the frontend:
 *   1. POST /login              — password (as normal) -> returns a ticket
 *                                  instead of a session, and emails an OTP.
 *   2. POST /admin-login/verify-otp     — email OTP tied to that ticket.
 *   3. POST /admin-login/verify-secret  — SUPER_ADMIN_SECRET_KEY match ->
 *                                  only now is a session actually created.
 * Regular users never see these extra steps; /login returns a normal
 * session for them exactly as before.
 */
import { Hono } from "hono";
import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import type { Env, Variables } from "../env";
import {
  getDb,
  usersTable,
  otpCodesTable,
  notificationsTable,
  rewardLedgerTable,
  type User,
} from "../db";
import { generateId, generateOtp, b64urlEncode, b64urlDecode } from "../lib/ids";
import { hashPassword, verifyPassword } from "../lib/hash";
import { createSession, destroySession, revokeAllForUser } from "../lib/session";
import {
  sendRegistrationOtp,
  sendAdminLoginOtp,
  sendGeneralOtp,
  sendPasswordResetEmail,
} from "../lib/email";
import {
  configuredSuperAdminEmail,
  configuredSuperAdminSecret,
  superAdminEnabled,
  verifySuperAdminSecret,
  getSystemSettings,
  markSetupCompleted,
  restoreSuperAdminIfMatches,
  evaluateBootstrap,
  existingSuperAdminCount,
} from "../lib/superAdmin";
import { logAdminActivity } from "../lib/activityLog";
import { clientIp } from "../lib/cors";
import { requireAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes to complete OTP + secret steps

function isDev(env: Env): boolean {
  return !env.BREVO_API_KEY;
}

function safeUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    status: u.status,
    emailVerified: u.emailVerified,
    phoneVerified: u.phoneVerified,
    avatarUrl: u.avatarUrl ?? undefined,
    createdAt: u.createdAt instanceof Date ? u.createdAt.getTime() : Number(u.createdAt),
  };
}

// ─── KV-backed bootstrap rate limit (per IP, 5 / hour) ─────
async function bootstrapRateLimit(env: Env, ip: string): Promise<boolean> {
  const key = `rl:bootstrap:${ip}`;
  const raw = await env.RATE_KV.get(key);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 5;
  if (!raw) {
    await env.RATE_KV.put(key, JSON.stringify({ count: 1, reset: now + windowMs }), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });
    return true;
  }
  try {
    const cur = JSON.parse(raw) as { count: number; reset: number };
    if (cur.reset < now) {
      await env.RATE_KV.put(key, JSON.stringify({ count: 1, reset: now + windowMs }), {
        expirationTtl: Math.ceil(windowMs / 1000),
      });
      return true;
    }
    cur.count += 1;
    await env.RATE_KV.put(key, JSON.stringify(cur), {
      expirationTtl: Math.max(60, Math.ceil((cur.reset - now) / 1000)),
    });
    return cur.count <= limit;
  } catch {
    return true;
  }
}

// ─── KV-backed Super Admin login ticket (password -> OTP -> secret) ────────
// Gatekeeps the 3-step admin login so each step can only be reached after
// the previous one succeeded. Stored in RATE_KV (already free-plan KV),
// keyed by a random opaque ticket id — never the user id or email, so a
// leaked ticket alone reveals nothing and expires quickly on its own.
interface AdminLoginTicket {
  userId: string;
  email: string;
  remember: boolean;
  stage: "password_ok" | "otp_ok";
}

function adminTicketKey(ticketId: string): string {
  return `admin-login-ticket:${ticketId}`;
}

async function issueAdminLoginTicket(
  env: Env,
  data: { userId: string; email: string; remember: boolean },
): Promise<string> {
  const ticketId = generateId();
  const ticket: AdminLoginTicket = { ...data, stage: "password_ok" };
  await env.RATE_KV.put(adminTicketKey(ticketId), JSON.stringify(ticket), {
    expirationTtl: Math.ceil(ADMIN_LOGIN_TICKET_TTL_MS / 1000),
  });
  return ticketId;
}

async function readAdminLoginTicket(env: Env, ticketId: string): Promise<AdminLoginTicket | null> {
  if (!ticketId || typeof ticketId !== "string") return null;
  const raw = await env.RATE_KV.get(adminTicketKey(ticketId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminLoginTicket;
  } catch {
    return null;
  }
}

async function advanceAdminLoginTicket(env: Env, ticketId: string, ticket: AdminLoginTicket): Promise<void> {
  await env.RATE_KV.put(adminTicketKey(ticketId), JSON.stringify(ticket), {
    expirationTtl: Math.ceil(ADMIN_LOGIN_TICKET_TTL_MS / 1000),
  });
}

async function consumeAdminLoginTicket(env: Env, ticketId: string): Promise<void> {
  await env.RATE_KV.delete(adminTicketKey(ticketId));
}

/**
 * Returns true if this user must go through the 3-step admin login flow
 * (password → OTP → secret key). Applies when:
 *   • The account email matches ADMIN_EMAIL / SUPER_ADMIN_EMAIL env var, OR
 *   • The user was previously promoted to Super Admin (isSuperAdmin flag).
 *
 * NOTE: This is intentionally NOT gated by SUPER_ADMIN_ENABLED.
 * SUPER_ADMIN_ENABLED only controls the one-time bootstrap registration.
 * Once the admin account exists, login must always work regardless of that flag.
 */
function isConfiguredSuperAdmin(env: Env, user: { email: string; isSuperAdmin: boolean }): boolean {
  const cfgEmail = configuredSuperAdminEmail(env);
  if (cfgEmail && user.email.toLowerCase() === cfgEmail) return true;
  // Fallback: already-promoted admins always use the secure login flow,
  // even if ADMIN_EMAIL env var is later changed or removed.
  return user.isSuperAdmin;
}

// ─── OTP helpers ─────
async function getOrCreateOtp(
  env: Env,
  target: string,
  type: "email_verify" | "otp_login" | "forgot_password" | "admin_login",
): Promise<{ otp: string; cooldownRemaining: number }> {
  const db = getDb(env);
  const recent = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.target, target.toLowerCase()),
        eq(otpCodesTable.type, type),
        gt(otpCodesTable.createdAt, new Date(Date.now() - OTP_COOLDOWN_MS)),
      ),
    )
    .limit(1);

  if (recent.length > 0) {
    const ts = recent[0]!.createdAt as unknown as Date;
    const elapsed = Date.now() - (ts instanceof Date ? ts.getTime() : Number(ts));
    const remaining = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
    const err = new Error("Please wait before requesting another code.") as Error & {
      status: number;
      cooldownRemaining: number;
    };
    err.status = 429;
    err.cooldownRemaining = remaining;
    throw err;
  }

  await db
    .delete(otpCodesTable)
    .where(and(eq(otpCodesTable.target, target.toLowerCase()), eq(otpCodesTable.type, type)));

  const otp = generateOtp();
  await db.insert(otpCodesTable).values({
    id: generateId(),
    target: target.toLowerCase(),
    code: otp,
    type,
    used: false,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  return { otp, cooldownRemaining: 0 };
}

async function consumeOtp(
  env: Env,
  target: string,
  code: string,
  type: "email_verify" | "otp_login" | "forgot_password" | "admin_login",
): Promise<boolean> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.target, target.toLowerCase()),
        eq(otpCodesTable.type, type),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const record = rows[0];
  if (!record || record.code !== code) return false;

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, record.id));
  return true;
}

// ───────────────────────────────  /register  ──────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(1),
  password: z.string().min(8),
  secretKey: z.string().max(512).optional(),
});

app.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.issues }, 400);
  }

  const { name, email, phone, password, secretKey } = parsed.data;
  const ip = clientIp(c);
  const userAgent = c.req.header("user-agent") ?? null;
  const db = getDb(c.env);

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  if (existing.length) {
    return c.json({ error: "This email is already registered." }, 409);
  }

  // ── Super Admin bootstrap path ──
  let candidate = false;
  const cfgEmail = configuredSuperAdminEmail(c.env);
  const targetingSuperAdmin =
    superAdminEnabled(c.env) && !!cfgEmail && email.toLowerCase() === cfgEmail;

  if (targetingSuperAdmin) {
    if (!(await bootstrapRateLimit(c.env, ip))) {
      await logAdminActivity(c.env, {
        adminId: "system",
        action: "super_admin_bootstrap_attempt",
        details: { email: email.toLowerCase(), ok: false, reason: "rate_limited" },
        ip,
        userAgent,
      });
      return c.json({ error: "Too many bootstrap attempts. Try later." }, 429);
    }

    const settings = await getSystemSettings(c.env);
    const superCount = await existingSuperAdminCount(c.env);
    const secretRequired = !!configuredSuperAdminSecret(c.env);

    if (settings.setupCompleted || superCount > 0) {
      if (secretKey || secretRequired) {
        await logAdminActivity(c.env, {
          adminId: "system",
          action: "super_admin_bootstrap_attempt",
          details: {
            email: email.toLowerCase(),
            ok: false,
            reason: settings.setupCompleted ? "already_completed" : "super_admin_exists",
          },
          ip,
          userAgent,
        });
        return c.json({ error: "Super Admin bootstrap is closed." }, 403);
      }
      // Otherwise fall through as a normal user.
    } else {
      if (!secretRequired) {
        await logAdminActivity(c.env, {
          adminId: "system",
          action: "super_admin_bootstrap_attempt",
          details: { email: email.toLowerCase(), ok: false, reason: "secret_not_configured" },
          ip,
          userAgent,
        });
        return c.json(
          { error: "Super Admin bootstrap is not configured on this server." },
          503,
        );
      }
      const result = await evaluateBootstrap(c.env, {
        email: email.toLowerCase(),
        secretKey,
        emailVerified: true,
      });
      if (!result.ok) {
        await logAdminActivity(c.env, {
          adminId: "system",
          action: "super_admin_bootstrap_attempt",
          details: { email: email.toLowerCase(), ok: false, reason: result.reason },
          ip,
          userAgent,
        });
        return c.json({ error: "Super Admin bootstrap rejected." }, 403);
      }
      candidate = true;
      await logAdminActivity(c.env, {
        adminId: "system",
        action: "super_admin_bootstrap_attempt",
        details: { email: email.toLowerCase(), ok: true, reason: "candidate_registered" },
        ip,
        userAgent,
      });
    }
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  await db.insert(usersTable).values({
    id: userId,
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role: "user",
    emailVerified: false,
    phoneVerified: false,
    superAdminCandidate: candidate,
  });

  // Real-time welcome notification + signup bonus — created only for this
  // specific new account, right now. Failure here must never block
  // registration itself (the account already exists at this point).
  try {
    await db.insert(notificationsTable).values({
      id: generateId(),
      userId,
      title: "Welcome to Dadar Shop!",
      body: `Hi ${name}, your account has been created. Start exploring and enjoy your first purchase.`,
      kind: "system",
      event: undefined,
      link: undefined,
      unread: true,
    });
    await db.insert(rewardLedgerTable).values({
      id: generateId(),
      userId,
      label: "Welcome bonus",
      points: 50,
    });
  } catch {
    // Non-critical — registration already succeeded.
  }

  try {
    const { otp } = await getOrCreateOtp(c.env, email.toLowerCase(), "email_verify");
    await sendRegistrationOtp(c.env, { to: email, name: name || "User", otp });
  } catch {
    // OTP send failure does not block registration
  }

  // Issue a short-lived session so the verify-email page can call /verify-email (requireAuth).
  // The session expires in 30 minutes — just enough time to verify.
  // Login is blocked (403) until emailVerified=true, so this session can't access the shop.
  const { token, expiresAt } = await createSession(c.env, userId, "user", false);
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  return c.json(
    {
      token,
      expiresAt: expiresAt.getTime(),
      user: safeUser(users[0]!),
      requiresVerification: true,
    },
    201,
  );
});

// ───────────────────────────────  /login  ─────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false),
});

app.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { email, password, remember } = parsed.data;
  const db = getDb(c.env);

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  const user = users[0];
  if (!user) return c.json({ error: "Invalid email or password." }, 401);

  const lockedUntil = user.lockedUntil as unknown as Date | null;
  if (lockedUntil && (lockedUntil instanceof Date ? lockedUntil.getTime() : Number(lockedUntil)) > Date.now()) {
    return c.json(
      { error: "Too many attempts. Account temporarily locked. Try again later." },
      423,
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const attempts = parseInt(user.failedLoginAttempts ?? "0", 10) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await db
        .update(usersTable)
        .set({ failedLoginAttempts: "0", lockedUntil: new Date(Date.now() + LOCK_MS) })
        .where(eq(usersTable.id, user.id));
      return c.json(
        { error: "Too many attempts. Account temporarily locked. Try again later." },
        423,
      );
    }
    await db
      .update(usersTable)
      .set({ failedLoginAttempts: String(attempts) })
      .where(eq(usersTable.id, user.id));
    return c.json({ error: "Invalid email or password." }, 401);
  }

  await db
    .update(usersTable)
    .set({ failedLoginAttempts: "0", lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  if (user.status !== "active") {
    return c.json({ error: `Your account is ${user.status}. Contact support.` }, 403);
  }

  // ── Email verification gate ───────────────────────────────────────────────
  // Block login until email is verified. Unverified users must complete OTP
  // verification before they can access the app. Admin accounts bypass this
  // because they go through a separate OTP flow below.
  if (!user.emailVerified && !isConfiguredSuperAdmin(c.env, { email: user.email, isSuperAdmin: user.isSuperAdmin })) {
    return c.json(
      {
        error: "Please verify your email before signing in.",
        requiresVerification: true,
        email: user.email,
      },
      403,
    );
  }

  // ── Super Admin gate: password alone is not enough. Issue a short-lived
  // ticket and require email OTP + secret key before any session exists. ──
  if (isConfiguredSuperAdmin(c.env, { email: user.email, isSuperAdmin: user.isSuperAdmin })) {
    const ticket = await issueAdminLoginTicket(c.env, {
      userId: user.id,
      email: user.email,
      remember,
    });

    let devOtp: string | undefined;
    try {
      const { otp } = await getOrCreateOtp(c.env, user.email.toLowerCase(), "admin_login");
      devOtp = otp;
      const sent = await sendAdminLoginOtp(c.env, {
        to: user.email,
        name: user.name || "Admin",
        otp,
      });
      if (!sent.success) {
        console.error("[admin-login] Email delivery failed:", sent.error);
        return c.json({ error: "Failed to send verification code. Please try again." }, 500);
      }
    } catch (err: any) {
      // Cooldown (429): a code was already sent very recently — that is fine,
      // the admin can still use that code to proceed.
      if (err?.status !== 429) {
        console.error("[admin-login] OTP generation failed:", err);
        return c.json({ error: "Failed to send verification code. Please try again." }, 500);
      }
    }

    await logAdminActivity(c.env, {
      adminId: user.id,
      action: "admin_login_otp_sent",
      details: { email: user.email.toLowerCase() },
      ip: clientIp(c),
      userAgent: c.req.header("user-agent") ?? null,
    });

    return c.json({
      requiresAdminVerification: true,
      stage: "otp",
      ticket,
      // devOtp is only present in local dev (no BREVO_API_KEY) so the
      // real OTP code only ever reaches the admin via email in production.
      ...(isDev(c.env) && devOtp && { devOtp }),
    });
  }

  await restoreSuperAdminIfMatches(c.env, {
    id: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  });

  const freshRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id))
    .limit(1);
  const fresh = freshRows[0] ?? user;

  const { token, expiresAt } = await createSession(c.env, fresh.id, fresh.role, remember);
  return c.json({ token, expiresAt: expiresAt.getTime(), user: safeUser(fresh) });
});


// ─────────────────────  /admin-login/resend-otp  ────────────────────────────
// Resends the admin login OTP for an existing ticket (stage: password_ok).
// Does NOT advance the ticket stage — just sends a fresh OTP code.
const adminLoginResendSchema = z.object({
  ticket: z.string().min(1),
});

app.post("/admin-login/resend-otp", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminLoginResendSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { ticket: ticketId } = parsed.data;
  const ticket = await readAdminLoginTicket(c.env, ticketId);
  if (!ticket || ticket.stage !== "password_ok") {
    return c.json({ error: "Verification session expired. Please sign in again." }, 400);
  }

  try {
    // Delete old OTP so a fresh one is created (bypass cooldown for resend)
    const db = getDb(c.env);
    await db.delete(otpCodesTable).where(
      and(
        eq(otpCodesTable.target, ticket.email.toLowerCase()),
        eq(otpCodesTable.type, "admin_login"),
      ),
    );
    const { otp } = await getOrCreateOtp(c.env, ticket.email.toLowerCase(), "admin_login");
    await sendAdminLoginOtp(c.env, {
      to: ticket.email,
      name: "Admin",
      otp,
    });
    const expose = c.env.NODE_ENV !== "production";
    return c.json({ ok: true, ...(expose && { devOtp: otp }) });
  } catch (err: any) {
    return c.json({ error: "Failed to send code." }, 500);
  }
});

// ─────────────────────  /admin-login/verify-otp  ───────────────────────────
// Step 2 of the Super Admin login: consumes the emailed OTP tied to the
// ticket from /login. On success, advances the ticket so step 3 (secret
// key) becomes reachable — it does NOT create a session by itself.
const adminLoginVerifyOtpSchema = z.object({
  ticket: z.string().min(1),
  code: z.string().length(6),
});

app.post("/admin-login/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminLoginVerifyOtpSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { ticket: ticketId, code } = parsed.data;

  // Rate limit: 5 attempts per ticket per 15 minutes
  const rlKey = `admin-otp-verify:${ticketId}`;
  const allowed = await rateLimit(c.env, rlKey, 5, 15 * 60 * 1000);
  if (!allowed) {
    return c.json({ error: "Too many attempts. Please sign in again." }, 429);
  }

  const ticket = await readAdminLoginTicket(c.env, ticketId);
  if (!ticket || ticket.stage !== "password_ok") {
    return c.json({ error: "Verification session expired. Please sign in again." }, 400);
  }

  const valid = await consumeOtp(c.env, ticket.email.toLowerCase(), code, "admin_login");
  if (!valid) return c.json({ error: "Invalid or expired code." }, 400);

  await advanceAdminLoginTicket(c.env, ticketId, { ...ticket, stage: "otp_ok" });

  return c.json({ stage: "secret" });
});

// ───────────────────  /admin-login/verify-secret  ──────────────────────────
// Step 3 of the Super Admin login: checks the secret key against
// SUPER_ADMIN_SECRET_KEY (Cloudflare secret). Only on a match — after the
// ticket already passed password + OTP — is a real session created.
const adminLoginVerifySecretSchema = z.object({
  ticket: z.string().min(1),
  secretKey: z.string().min(1),
});

app.post("/admin-login/verify-secret", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminLoginVerifySecretSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { ticket: ticketId, secretKey } = parsed.data;

  try {
    // Rate limit: 3 attempts per ticket per 15 minutes
    const rlKey = `admin-secret-verify:${ticketId}`;
    const allowed = await rateLimit(c.env, rlKey, 3, 15 * 60 * 1000);
    if (!allowed) {
      return c.json({ error: "Too many attempts. Please sign in again." }, 429);
    }

    const ticket = await readAdminLoginTicket(c.env, ticketId);
    if (!ticket || ticket.stage !== "otp_ok") {
      return c.json({ error: "Verification session expired. Please sign in again." }, 400);
    }

    const cfgSecret = configuredSuperAdminSecret(c.env);
    if (!cfgSecret) {
      console.error("[admin-login/verify-secret] ADMIN_SECRET_KEY / SUPER_ADMIN_SECRET_KEY not configured");
      return c.json({ error: "Admin secret key is not configured on this server." }, 503);
    }

    const matches = await verifySuperAdminSecret(c.env, secretKey);
    if (!matches) {
      await logAdminActivity(c.env, {
        adminId: ticket.userId,
        action: "admin_login_secret_failed",
        details: { email: ticket.email },
        ip: clientIp(c),
        userAgent: c.req.header("user-agent") ?? null,
      });
      return c.json({ error: "Invalid secret key." }, 401);
    }

    await consumeAdminLoginTicket(c.env, ticketId);

    const db = getDb(c.env);
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, ticket.userId))
      .limit(1);
    const user = users[0];
    if (!user) return c.json({ error: "Account not found." }, 404);

    // Promote to admin unconditionally — 3-step flow already verified identity.
    await restoreSuperAdminIfMatches(c.env, {
      id: user.id,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    });

    // Re-fetch to get updated role after promotion.
    const freshRows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);
    const fresh = freshRows[0] ?? user;

    await logAdminActivity(c.env, {
      adminId: fresh.id,
      action: "admin_login_success",
      details: { email: fresh.email, role: "admin" },
      ip: clientIp(c),
      userAgent: c.req.header("user-agent") ?? null,
    });

    // Issue session with role="admin" regardless of DB propagation timing.
    const { token, expiresAt } = await createSession(c.env, fresh.id, "admin", ticket.remember);
    return c.json({ token, expiresAt: expiresAt.getTime(), user: { ...safeUser(fresh), role: "admin" } });

  } catch (err) {
    console.error("[admin-login/verify-secret] Unexpected error:", err);
    return c.json({ error: "Internal server error. Please try again." }, 500);
  }
});

// ───────────────────────────────  /lock-info  ──────────────────────────────────
// Lets the frontend show "N attempts left" / lockout countdown before the
// user submits the login form. Never reveals whether the email exists.
app.get("/lock-info", async (c) => {
  const email = c.req.query("email");
  if (!email) return c.json({ failures: 0 });

  const db = getDb(c.env);
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  const user = users[0];
  if (!user) return c.json({ failures: 0 });

  const lockedUntilRaw = user.lockedUntil as unknown as Date | null;
  const lockedUntilMs =
    lockedUntilRaw == null
      ? undefined
      : lockedUntilRaw instanceof Date
        ? lockedUntilRaw.getTime()
        : Number(lockedUntilRaw);

  const isLocked = lockedUntilMs != null && lockedUntilMs > Date.now();

  return c.json({
    failures: parseInt(user.failedLoginAttempts ?? "0", 10),
    ...(isLocked ? { lockedUntil: lockedUntilMs } : {}),
  });
});

// ───────────────────────────────  /logout  ────────────────────────────────────
app.post("/logout", async (c) => {
  const header = c.req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    await destroySession(c.env, header.slice(7));
  }
  return c.json({ ok: true });
});

// ───────────────────────────────  /me  ────────────────────────────────────────
app.get("/me", requireAuth(), async (c) => {
  const user = c.get("user")!;
  return c.json({ user: safeUser(user) });
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(32).optional(),
});

app.patch("/me", requireAuth(), async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { name, phone } = parsed.data;
  const db = getDb(c.env);
  await db
    .update(usersTable)
    .set({
      name: name && name.length > 0 ? name : user.name,
      phone: phone !== undefined ? (phone.length > 0 ? phone : null) : user.phone,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id));

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  return c.json({ user: safeUser(updated[0]!) });
});

// ───────────────────────────────  /send-otp  ──────────────────────────────────
const sendOtpSchema = z.object({
  channel: z.enum(["email"]),
  target: z.string().min(3),
  type: z
    .enum(["email_verify", "otp_login", "forgot_password"])
    .optional()
    .default("otp_login"),
});

app.post("/send-otp", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { target, type } = parsed.data;

  const purposeMap: Record<string, string> = {
    email_verify: "Email Verification",
    otp_login: "Sign In",
    forgot_password: "Password Reset",
  };

  try {
    const db = getDb(c.env);
    const users = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, target.toLowerCase()))
      .limit(1);
    const name = users[0]?.name;

    const { otp } = await getOrCreateOtp(c.env, target.toLowerCase(), type);
    await sendGeneralOtp(c.env, {
      to: target,
      otp,
      name,
      purpose: type as "email_verify" | "otp_login",
    });

    return c.json({
      ok: true,
      cooldownSeconds: 60,
      ...(isDev(c.env) && { devOtp: otp }),
    });
  } catch (err: any) {
    if (err?.status === 429) {
      return c.json({ error: err.message, cooldownRemaining: err.cooldownRemaining }, 429);
    }
    return c.json({ error: "Failed to send OTP. Please try again." }, 500);
  }
});

// ───────────────────────────────  /verify-otp  ────────────────────────────────
const verifyOtpSchema = z.object({
  target: z.string().min(3),
  code: z.string().length(6),
  type: z
    .enum(["email_verify", "otp_login", "forgot_password"])
    .optional()
    .default("otp_login"),
});

app.post("/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { target, code, type } = parsed.data;
  const valid = await consumeOtp(c.env, target, code, type);
  if (!valid) return c.json({ error: "Invalid or expired code." }, 400);

  if (type === "otp_login") {
    const db = getDb(c.env);
    let users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, target.toLowerCase()))
      .limit(1);

    let user = users[0];
    if (!user) {
      const isEmail = target.includes("@");
      const newId = generateId();
      const passwordHash = await hashPassword(generateId());
      await db.insert(usersTable).values({
        id: newId,
        name: isEmail ? target.split("@")[0]! : "OTP User",
        email: isEmail ? target.toLowerCase() : `${newId}@otp.dadar.shop`,
        phone: !isEmail ? target : undefined,
        passwordHash,
        role: "user",
        emailVerified: isEmail,
        phoneVerified: !isEmail,
      });
      users = await db.select().from(usersTable).where(eq(usersTable.id, newId)).limit(1);
      user = users[0]!;
    }

    // The Super Admin account never gets a session from passwordless OTP
    // login — it must still go through password -> admin OTP -> secret key.
    // Hand back a ticket already past the "password" stage (this route IS
    // an email-ownership proof) so the frontend can continue straight into
    // the secret-key step.
    if (isConfiguredSuperAdmin(c.env, { email: user.email, isSuperAdmin: user.isSuperAdmin })) {
      const ticketId = generateId();
      const ticket: AdminLoginTicket = { userId: user.id, email: user.email, remember: false, stage: "otp_ok" };
      await advanceAdminLoginTicket(c.env, ticketId, ticket);
      return c.json({ requiresAdminVerification: true, stage: "secret", ticket: ticketId });
    }

    const { token, expiresAt } = await createSession(c.env, user.id, user.role, false);
    return c.json({
      token,
      expiresAt: expiresAt.getTime(),
      user: safeUser(user),
    });
  }

  return c.json({ ok: true });
});

// ───────────────────────────────  /verify-email  ──────────────────────────────
app.post("/verify-email", requireAuth(), async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));
  const schema = z.object({ code: z.string().length(6) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const valid = await consumeOtp(c.env, user.email, parsed.data.code, "email_verify");
  if (!valid) return c.json({ error: "Invalid or expired code." }, 400);

  const db = getDb(c.env);
  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, user.id));

  if (user.superAdminCandidate && superAdminEnabled(c.env)) {
    const cfgEmail = configuredSuperAdminEmail(c.env);
    const settings = await getSystemSettings(c.env);
    const existingSuper = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.isSuperAdmin, true))
      .limit(1);
    if (
      cfgEmail &&
      user.email.toLowerCase() === cfgEmail &&
      !settings.setupCompleted &&
      existingSuper.length === 0
    ) {
      await db
        .update(usersTable)
        .set({
          role: "admin",
          isSuperAdmin: true,
          status: "active",
          superAdminCandidate: false,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id));
      await markSetupCompleted(c.env);
      await logAdminActivity(c.env, {
        adminId: user.id,
        action: "super_admin_created",
        targetUserId: user.id,
        details: { email: user.email },
        ip: clientIp(c),
        userAgent: c.req.header("user-agent") ?? null,
      });
      // The session in the browser right now was issued before this
      // promotion, so it never went through the password -> OTP -> secret
      // gate. Kill it immediately — the new admin must sign in again from
      // scratch, this time through the full gated flow.
      await revokeAllForUser(c.env, user.id);
      return c.json({
        user: safeUser({ ...user, role: "admin", isSuperAdmin: true, status: "active", superAdminCandidate: false }),
        forceRelogin: true,
      });
    } else {
      await db
        .update(usersTable)
        .set({ superAdminCandidate: false })
        .where(eq(usersTable.id, user.id));
    }
  }

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  return c.json({ user: safeUser(updated[0]!) });
});

// ───────────────────────  /send-verification-email  ───────────────────────────
app.post("/send-verification-email", requireAuth(), async (c) => {
  const user = c.get("user")!;
  try {
    const { otp } = await getOrCreateOtp(c.env, user.email, "email_verify");
    await sendGeneralOtp(c.env, {
      to: user.email,
      otp,
      name: user.name,
      purpose: "email_verify",
    });
    const expose = c.env.NODE_ENV !== "production";
    return c.json({ ok: true, cooldownSeconds: 60, ...(expose && { devOtp: otp }) });
  } catch (err: any) {
    if (err?.status === 429) {
      return c.json({ error: err.message, cooldownRemaining: err.cooldownRemaining }, 429);
    }
    return c.json({ error: "Failed to send email." }, 500);
  }
});

// ───────────────────────────────  /forgot-password  ───────────────────────────
const forgotPasswordSchema = z.object({ email: z.string().email() });

app.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid email" }, 400);

  const { email } = parsed.data;
  let devToken: string | undefined;

  try {
    const db = getDb(c.env);
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (users.length) {
      const { otp } = await getOrCreateOtp(c.env, email.toLowerCase(), "forgot_password");
      const rawToken = b64urlEncode(`${email.toLowerCase()}:${otp}`);
      devToken = rawToken;
      await sendPasswordResetEmail(c.env, {
        to: email,
        name: users[0]!.name,
        resetToken: rawToken,
      });
    } else {
      devToken = b64urlEncode(`${email.toLowerCase()}:000000`);
    }
  } catch {
    /* swallow rate-limit / send errors — never leak existence */
  }

  const expose = c.env.NODE_ENV !== "production" && devToken;
  return c.json({ ok: true, ...(expose && { devToken }) });
});

// ───────────────────────────────  /reset-password  ────────────────────────────
const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8),
});

app.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const { resetToken, newPassword } = parsed.data;

  let email: string, code: string;
  try {
    const decoded = b64urlDecode(resetToken);
    const colon = decoded.indexOf(":");
    if (colon < 0) throw new Error("bad format");
    email = decoded.slice(0, colon);
    code = decoded.slice(colon + 1);
  } catch {
    return c.json({ error: "Invalid or expired reset link." }, 400);
  }

  const valid = await consumeOtp(c.env, email, code, "forgot_password");
  if (!valid) {
    return c.json(
      { error: "Reset link has expired. Please request a new one." },
      400,
    );
  }

  const db = getDb(c.env);
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!users.length) return c.json({ error: "Account not found." }, 404);

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash, failedLoginAttempts: "0", lockedUntil: null })
    .where(eq(usersTable.id, users[0]!.id));

  // Invalidate all live sessions for this user.
  await revokeAllForUser(c.env, users[0]!.id);

  return c.json({ ok: true });
});

export default app;

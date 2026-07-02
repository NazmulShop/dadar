/**
 * email.ts — Production-ready email service using Brevo (Sendinblue) REST API.
 *
 * Modular structure:
 *   - EmailService: core Brevo API caller
 *   - Email builders: typed functions per email type (OTP, password reset)
 *   - sendOtpEmail: unified entry point used by auth, otp, and admin routes
 *
 * Env vars (Cloudflare secrets / plaintext):
 *   BREVO_API_KEY  — Brevo API key (secret)
 *   SENDER_EMAIL   — "Name <email>" or bare email (plaintext)
 *   BREVO_FROM_EMAIL — legacy alias, still supported
 *
 * Security:
 *   - API key is never logged
 *   - No OTP is logged in production
 *   - All external fetch errors are caught and surfaced cleanly
 */

import type { Env } from "../env";
import { getDb, authEmailTemplatesTable } from "../db";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailResult = { success: true } | { success: false; error: string };

interface BrevoPayload {
  sender: { name: string; email: string };
  to: [{ email: string; name?: string }];
  subject: string;
  htmlContent: string;
}

// ─── Sender parsing ───────────────────────────────────────────────────────────

function parseSender(raw: string): { name: string; email: string } {
  // Accepts: "Dadar Shop <noreply@example.com>" or bare "noreply@example.com"
  const match = raw.trim().match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      name: match[1]!.replace(/^"|"$/g, "").trim() || "Dadar Shop",
      email: match[2]!.trim(),
    };
  }
  return { name: "Dadar Shop", email: raw.trim() };
}

function getSender(env: Env): { name: string; email: string } {
  const raw = env.SENDER_EMAIL || env.BREVO_FROM_EMAIL;
  if (!raw) {
    // Production should always have a sender configured.
    console.error("[email] No sender configured. Set SENDER_EMAIL in Cloudflare secrets.");
    return { name: "Dadar Shop", email: "noreply@dadar.shop" };
  }
  return parseSender(raw);
}

function getFrontendUrl(env: Env): string {
  // CORS_ORIGIN is the frontend URL (may be comma-separated for multi-origin).
  const fromCors = (env.CORS_ORIGIN ?? "").split(",")[0]?.trim();
  if (fromCors && /^https?:\/\//i.test(fromCors)) return fromCors;
  if (env.APP_URL && /^https?:\/\//i.test(env.APP_URL)) return env.APP_URL;
  return "https://dadar.shop";
}

// ─── Core Brevo API caller ────────────────────────────────────────────────────

async function callBrevoApi(apiKey: string, payload: BrevoPayload): Promise<EmailResult> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { success: true };

    // Parse Brevo error body for actionable message.
    let errMsg = `Brevo HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; code?: string };
      if (body.message) errMsg = `Brevo error: ${body.message}`;
    } catch {
      errMsg = `Brevo HTTP ${res.status}: ${await res.text().catch(() => "")}`;
    }
    console.error("[email] Brevo API failed:", errMsg);
    return { success: false, error: errMsg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Network error calling Brevo:", msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}

// ─── HTML builders ────────────────────────────────────────────────────────────

const baseStyle = `
  body { margin:0; padding:0; background:#f4f6f8; font-family:Arial,sans-serif; }
  .wrap { max-width:520px; margin:40px auto; background:#fff; border-radius:12px;
          padding:36px 32px; box-shadow:0 4px 16px rgba(0,0,0,0.08); text-align:center; }
  .logo { font-size:22px; font-weight:700; color:#1a7a4a; margin-bottom:4px; }
  .title { font-size:18px; font-weight:600; color:#111; margin:16px 0 8px; }
  .sub { font-size:14px; color:#555; margin:0 0 24px; }
  .otp { display:inline-block; background:#111; color:#fff; font-size:30px;
         letter-spacing:8px; padding:14px 28px; border-radius:8px; margin:8px 0 20px;
         font-weight:700; }
  .expiry { font-size:13px; color:#e53e3e; margin-bottom:24px; }
  .btn { display:inline-block; background:#1a7a4a; color:#fff; text-decoration:none;
         padding:13px 28px; border-radius:8px; font-size:14px; font-weight:600;
         margin:12px 0 24px; }
  .footer { font-size:12px; color:#aaa; border-top:1px solid #f0f0f0;
            padding-top:16px; margin-top:8px; }
`.replace(/\s+/g, " ");

function buildOtpHtml(opts: {
  greeting: string;
  bodyText: string;
  otp: string;
  expiryNote: string;
  footerNote: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${baseStyle}</style></head><body>
  <div class="wrap">
    <div class="logo">Dadar Shop</div>
    <div class="title">${opts.greeting}</div>
    <p class="sub">${opts.bodyText}</p>
    <div class="otp">${opts.otp}</div>
    <p class="expiry">${opts.expiryNote}</p>
    <p class="footer">${opts.footerNote}</p>
  </div></body></html>`;
}

function buildResetHtml(opts: {
  name: string;
  resetUrl: string;
  expiryNote: string;
  title?: string;
  bodyText?: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${baseStyle}</style></head><body>
  <div class="wrap">
    <div class="logo">Dadar Shop</div>
    <div class="title">${opts.title ?? "Reset your password"}</div>
    <p class="sub">${opts.bodyText ?? `Hi ${escHtml(opts.name)}, we received a request to reset your password.`}</p>
    <a class="btn" href="${opts.resetUrl}">Reset Password</a>
    <p class="expiry">${opts.expiryNote}</p>
    <p class="footer">${opts.footerNote ?? "If you didn't request this, you can safely ignore this email."}</p>
  </div></body></html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Admin-editable overrides ─────────────────────────────────────────────────
// Reads an admin-saved override for one of the 5 real system emails. Missing
// fields fall back to the hardcoded defaults below — an admin can edit just
// the subject, for example, and leave the rest untouched.
export type AuthEmailEvent = "register_otp" | "admin_login_otp" | "email_verify_otp" | "otp_login" | "password_reset";

interface AuthEmailOverride {
  subject: string | null;
  greeting: string | null;
  bodyText: string | null;
  footerNote: string | null;
}

async function getOverride(env: Env, event: AuthEmailEvent): Promise<AuthEmailOverride | null> {
  try {
    const db = getDb(env);
    const rows = await db.select().from(authEmailTemplatesTable).where(eq(authEmailTemplatesTable.event, event)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Public email functions ───────────────────────────────────────────────────

/**
 * Send a registration OTP email (type = "register").
 * OTP expires in 60 seconds.
 */
export async function sendRegistrationOtp(
  env: Env,
  opts: { to: string; name: string; otp: string },
): Promise<EmailResult> {
  if (!env.BREVO_API_KEY) {
    // Dev fallback: log OTP to Worker console, never in production.
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] Registration OTP for ${opts.to}: ${opts.otp}`);
    }
    return { success: true };
  }

  const sender = getSender(env);
  const o = await getOverride(env, "register_otp");
  const html = buildOtpHtml({
    greeting: o?.greeting ?? `Hi ${escHtml(opts.name)}, verify your email`,
    bodyText: o?.bodyText ?? "Enter this code to complete your registration:",
    otp: opts.otp,
    expiryNote: "⏱ This code expires in <strong>60 seconds</strong>.",
    footerNote: o?.footerNote ?? "If you didn't create an account, please ignore this email.",
  });

  return callBrevoApi(env.BREVO_API_KEY, {
    sender,
    to: [{ email: opts.to, name: opts.name }],
    subject: o?.subject ?? "Dadar Shop — Verify your email",
    htmlContent: html,
  });
}

/**
 * Send an admin login OTP email (type = "admin_login").
 * OTP expires in 60 seconds.
 */
export async function sendAdminLoginOtp(
  env: Env,
  opts: { to: string; name: string; otp: string },
): Promise<EmailResult> {
  if (!env.BREVO_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] Admin login OTP for ${opts.to}: ${opts.otp}`);
    }
    return { success: true };
  }

  const sender = getSender(env);
  const o = await getOverride(env, "admin_login_otp");
  const html = buildOtpHtml({
    greeting: o?.greeting ?? "Admin sign-in verification",
    bodyText: o?.bodyText ?? `Hi ${escHtml(opts.name)}, enter this code to continue signing in:`,
    otp: opts.otp,
    expiryNote: "⏱ This code expires in <strong>60 seconds</strong>.",
    footerNote:
      o?.footerNote ?? "If you didn't attempt to sign in, secure your account immediately.",
  });

  return callBrevoApi(env.BREVO_API_KEY, {
    sender,
    to: [{ email: opts.to, name: opts.name }],
    subject: o?.subject ?? "Dadar Shop — Sign-in verification code",
    htmlContent: html,
  });
}

/**
 * Send a general OTP email (email verification, passwordless login).
 * Used by /send-otp and /send-verification-email routes.
 */
export async function sendGeneralOtp(
  env: Env,
  opts: {
    to: string;
    name?: string;
    otp: string;
    purpose: "email_verify" | "otp_login";
  },
): Promise<EmailResult> {
  if (!env.BREVO_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] OTP (${opts.purpose}) for ${opts.to}: ${opts.otp}`);
    }
    return { success: true };
  }

  const sender = getSender(env);

  const config = {
    email_verify: {
      subject: "Dadar Shop — Verify your email",
      greeting: "Verify your email address",
      body: "Use this code to verify your email:",
    },
    otp_login: {
      subject: "Dadar Shop — Your sign-in code",
      greeting: "Your sign-in code",
      body: "Use this code to sign in to your account:",
    },
  }[opts.purpose];

  const o = await getOverride(env, opts.purpose === "email_verify" ? "email_verify_otp" : "otp_login");

  const html = buildOtpHtml({
    greeting: o?.greeting ?? config.greeting,
    bodyText: o?.bodyText ?? (opts.name ? `Hi ${escHtml(opts.name)}, ${config.body.toLowerCase()}` : config.body),
    otp: opts.otp,
    expiryNote: "⏱ This code expires in <strong>60 seconds</strong>.",
    footerNote: o?.footerNote ?? "If you didn't request this, you can safely ignore this email.",
  });

  return callBrevoApi(env.BREVO_API_KEY, {
    sender,
    to: [{ email: opts.to, ...(opts.name ? { name: opts.name } : {}) }],
    subject: o?.subject ?? config.subject,
    htmlContent: html,
  });
}

/**
 * Send a password reset email with a clickable reset link.
 */
export async function sendPasswordResetEmail(
  env: Env,
  opts: { to: string; name: string; resetToken: string },
): Promise<EmailResult> {
  if (!env.BREVO_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] Password reset token for ${opts.to}: ${opts.resetToken}`);
    }
    return { success: true };
  }

  const sender = getSender(env);
  const frontendUrl = getFrontendUrl(env);
  const resetUrl = `${frontendUrl}/auth/reset?token=${encodeURIComponent(opts.resetToken)}`;
  const o = await getOverride(env, "password_reset");

  const html = buildResetHtml({
    name: opts.name,
    resetUrl,
    expiryNote: "⏱ This link expires in <strong>10 minutes</strong>.",
    title: o?.greeting ?? undefined,
    bodyText: o?.bodyText ?? undefined,
    footerNote: o?.footerNote ?? undefined,
  });

  return callBrevoApi(env.BREVO_API_KEY, {
    sender,
    to: [{ email: opts.to, name: opts.name }],
    subject: o?.subject ?? "Dadar Shop — Reset your password",
    htmlContent: html,
  });
}

function buildGenericHtml(opts: { title: string; bodyText: string }): string {
  const safeBody = escHtml(opts.bodyText).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${baseStyle}</style></head><body>
  <div class="wrap">
    <div class="logo">Dadar Shop</div>
    <div class="title">${escHtml(opts.title)}</div>
    <p class="sub" style="text-align:left">${safeBody}</p>
    <p class="footer">Thank you for shopping with Dadar Shop.</p>
  </div></body></html>`;
}

/**
 * Generic templated transactional email — used by lib/notify.ts for order
 * and refund lifecycle events, and by the campaigns "Send Now" action.
 * Unlike the OTP/reset builders above, subject + body here are fully
 * dynamic (admin-editable or campaign copy), not hardcoded.
 */
export async function sendGenericEmail(
  env: Env,
  opts: { to: string; name?: string; subject: string; bodyText: string },
): Promise<EmailResult> {
  if (!env.BREVO_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] "${opts.subject}" -> ${opts.to}: ${opts.bodyText}`);
    }
    return { success: true };
  }
  const sender = getSender(env);
  const html = buildGenericHtml({ title: opts.subject, bodyText: opts.bodyText });
  return callBrevoApi(env.BREVO_API_KEY, {
    sender,
    to: [{ email: opts.to, ...(opts.name ? { name: opts.name } : {}) }],
    subject: opts.subject,
    htmlContent: html,
  });
}

/**
 * Legacy unified entry point — kept for backward compat with existing
 * route callers. New code should use the typed functions above.
 * Will be removed once all callers are migrated.
 */
export async function sendOtpEmail(
  env: Env,
  opts: {
    to: string;
    otp: string;
    purpose: string;
    name?: string;
    resetToken?: string;
  },
): Promise<EmailResult> {
  if (opts.resetToken) {
    return sendPasswordResetEmail(env, {
      to: opts.to,
      name: opts.name ?? "User",
      resetToken: opts.resetToken,
    });
  }
  // Route to the correct typed sender based on purpose string.
  if (opts.purpose === "Email Verification" || opts.purpose === "email_verify") {
    return sendGeneralOtp(env, {
      to: opts.to,
      otp: opts.otp,
      name: opts.name,
      purpose: "email_verify",
    });
  }
  if (opts.purpose === "Sign In" || opts.purpose === "otp_login") {
    return sendGeneralOtp(env, {
      to: opts.to,
      otp: opts.otp,
      name: opts.name,
      purpose: "otp_login",
    });
  }
  // Fallback generic OTP
  if (!env.BREVO_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] OTP for ${opts.to}: ${opts.otp}`);
    }
    return { success: true };
  }
  const sender = getSender(env);
  const html = buildOtpHtml({
    greeting: opts.name ? `Hi ${escHtml(opts.name)}` : "Your verification code",
    bodyText: `Use this code to complete your ${escHtml(opts.purpose.toLowerCase())}:`,
    otp: opts.otp,
    expiryNote: "⏱ This code expires in <strong>60 seconds</strong>.",
    footerNote: "If you didn't request this, you can safely ignore this email.",
  });
  return callBrevoApi(env.BREVO_API_KEY, {
    sender,
    to: [{ email: opts.to, ...(opts.name ? { name: opts.name } : {}) }],
    subject: `Dadar Shop — ${opts.purpose}`,
    htmlContent: html,
  });
}

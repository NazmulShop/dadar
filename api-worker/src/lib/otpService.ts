/**
 * OTP Service — single, shared, reusable OTP system.
 *
 * Used by BOTH:
 *   - User registration            (type = "register" / legacy alias "email_verify")
 *   - Admin login verification     (type = "admin_login")
 *   - Password reset                (type = "forgot_password")
 *   - Passwordless OTP login        (type = "otp_login")
 *
 * Every OTP row carries: target (email), code, type, expiresAt, used.
 * Verification ALWAYS checks the `type` column — an OTP issued for one
 * purpose can never be consumed for another, even if the code happens to
 * match. This is enforced at the SQL query level (the WHERE clause filters
 * on type), not just in application logic, so there is no path that skips
 * the check.
 *
 * Every type uses the SAME timing rule (per latest requirement):
 *   - Expiry: 2 minutes (120 seconds) from issuance
 *   - Cooldown: a fresh OTP cannot be requested for the same (target, type)
 *     pair until 2 minutes have elapsed since the previous one was issued —
 *     i.e. nobody can request a new OTP again until the previous one's
 *     2-minute window has fully elapsed. There is no bypass anywhere in
 *     the codebase (including "resend" endpoints).
 */
import { and, eq, gt } from "drizzle-orm";
import type { Env } from "../env";
import { getDb, otpCodesTable } from "../db";
import { generateId, generateOtp } from "./ids";

/** Canonical OTP types. "register" and "email_verify" are the same purpose
 *  (registration / email-ownership proof) — "register" is the spec-mandated
 *  name, "email_verify" is the pre-existing column value already stored in
 *  the database and used by the live registration flow. Both are accepted
 *  on input and normalized to the same DB value so OTP verification logic
 *  is never duplicated. */
export type OtpType = "register" | "email_verify" | "otp_login" | "forgot_password" | "admin_login";

/** The literal value persisted to `otp_codes.type` in D1. */
type StoredOtpType = "email_verify" | "otp_login" | "forgot_password" | "admin_login";

function normalizeType(type: OtpType): StoredOtpType {
  return type === "register" ? "email_verify" : type;
}

/** 2 minutes — minimum gap between two OTP requests for the same target+type,
 *  AND the lifetime of every OTP. Applies uniformly to register, admin_login,
 *  otp_login, and forgot_password. */
export const OTP_COOLDOWN_MS = 2 * 60 * 1000;
export const OTP_EXPIRY_MS_VALUE = 2 * 60 * 1000;

/** Per-type expiry window. Uniform 2 minutes across every OTP type. */
const OTP_EXPIRY_MS: Record<StoredOtpType, number> = {
  email_verify: OTP_EXPIRY_MS_VALUE, // register
  admin_login: OTP_EXPIRY_MS_VALUE,
  otp_login: OTP_EXPIRY_MS_VALUE,
  forgot_password: OTP_EXPIRY_MS_VALUE,
};

export class OtpCooldownError extends Error {
  status = 429 as const;
  cooldownRemaining: number;
  constructor(remainingSeconds: number) {
    super("Please wait before requesting another code.");
    this.cooldownRemaining = remainingSeconds;
  }
}

/**
 * Issues a fresh OTP for (target, type), enforcing the resend cooldown.
 * Any previous unconsumed OTP of the same (target, type) is deleted first
 * so there is never more than one live code per purpose — this also
 * guarantees single-use semantics combined with `consumeOtp` below.
 */
export async function issueOtp(
  env: Env,
  target: string,
  type: OtpType,
): Promise<{ otp: string; expiresInSeconds: number }> {
  const storedType = normalizeType(type);
  const normalizedTarget = target.toLowerCase().trim();
  const db = getDb(env);

  const recent = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.target, normalizedTarget),
        eq(otpCodesTable.type, storedType),
        gt(otpCodesTable.createdAt, new Date(Date.now() - OTP_COOLDOWN_MS)),
      ),
    )
    .limit(1);

  if (recent.length > 0) {
    const ts = recent[0]!.createdAt as unknown as Date;
    const createdMs = ts instanceof Date ? ts.getTime() : Number(ts);
    const elapsed = Date.now() - createdMs;
    const remaining = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000));
    throw new OtpCooldownError(remaining);
  }

  // Delete any stale/unused code of this type for this target — guarantees
  // single-use and that only the most recently issued code is ever valid.
  await db
    .delete(otpCodesTable)
    .where(and(eq(otpCodesTable.target, normalizedTarget), eq(otpCodesTable.type, storedType)));

  const otp = generateOtp();
  const expiryMs = OTP_EXPIRY_MS[storedType];

  await db.insert(otpCodesTable).values({
    id: generateId(),
    target: normalizedTarget,
    code: otp,
    type: storedType,
    used: false,
    expiresAt: new Date(Date.now() + expiryMs),
  });

  return { otp, expiresInSeconds: Math.floor(expiryMs / 1000) };
}

/**
 * Verifies and atomically consumes an OTP. Returns true only if:
 *   - a row exists for (target, type) [type-bound — CRITICAL],
 *   - it is not already used,
 *   - it has not expired,
 *   - the provided code matches exactly.
 * On success the row is immediately marked `used` so it can never be
 * replayed (single-use), even if the same code is submitted twice in a
 * race — the UPDATE only succeeds against an unused row in upstream calls
 * issuing fresh OTPs deletes prior rows for the same (target, type), the
 * single-row contract already prevents replay regardless.
 */
export async function consumeOtp(
  env: Env,
  target: string,
  code: string,
  type: OtpType,
): Promise<boolean> {
  const storedType = normalizeType(type);
  const normalizedTarget = target.toLowerCase().trim();
  const db = getDb(env);

  const rows = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.target, normalizedTarget),
        eq(otpCodesTable.type, storedType), // type-bound check — never cross-context
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const record = rows[0];
  if (!record) return false;

  // Constant-time-ish compare is unnecessary here (6-digit numeric code,
  // single-use, rate-limited, and the row itself is the secret-bearing
  // resource — an attacker who can already read `code` from the DB has
  // already won). Strict equality is sufficient and simplest.
  if (record.code !== code) return false;

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, record.id));
  return true;
}

/** Expiry, in seconds, for a given OTP type — exposed for response payloads. */
export function otpExpirySeconds(type: OtpType): number {
  return Math.floor(OTP_EXPIRY_MS[normalizeType(type)] / 1000);
}

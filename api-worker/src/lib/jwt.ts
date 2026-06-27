import jwt from "@tsndr/cloudflare-worker-jwt";
import type { Env } from "../env";

export interface JwtPayload {
  userId: string;
  role: string;
  // standard JWT claims
  iat?: number;
  exp?: number;
}

const SESSION_MS_REMEMBER = 30 * 24 * 60 * 60 * 1000;
const SESSION_MS_DEFAULT = 12 * 60 * 60 * 1000;

export function getSessionDuration(remember: boolean): number {
  return remember ? SESSION_MS_REMEMBER : SESSION_MS_DEFAULT;
}

/**
 * Resolves JWT_SECRET (or SESSION_SECRET alias).
 * Throws clearly rather than falling back to a hardcoded string —
 * a predictable secret allows anyone to forge tokens for any userId.
 */
function getSecret(env: Env): string {
  const secret = env.JWT_SECRET ?? env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is not configured or is shorter than 32 characters. " +
        "Generate one with: openssl rand -hex 32 " +
        "Then set it with: wrangler secret put JWT_SECRET",
    );
  }
  return secret;
}

/** Sign HS256 JWT carrying { userId, role }. */
export async function signToken(
  env: Env,
  payload: { userId: string; role: string },
  remember: boolean,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(getSessionDuration(remember) / 1000);
  return jwt.sign({ ...payload, iat: now, exp }, getSecret(env), {
    algorithm: "HS256",
  });
}

/** Verify HS256 JWT. Returns payload or null on failure / expiry. */
export async function verifyToken(
  env: Env,
  token: string,
): Promise<JwtPayload | null> {
  try {
    const ok = await jwt.verify(token, getSecret(env), { algorithm: "HS256" });
    if (!ok) return null;
    const { payload } = jwt.decode<JwtPayload>(token);
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

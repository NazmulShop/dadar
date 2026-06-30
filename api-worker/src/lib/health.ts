import { sql } from "drizzle-orm";
import type { Env } from "../env";
import { getDb } from "../db";

export interface HealthCheck {
  name: string;
  ok: boolean;
  code: string;
  message: string;
  solution: string;
  severity: "warning" | "critical";
}

export interface HealthStatus {
  ok: boolean;
  checks: HealthCheck[];
  checkedAt: string;
}

const STATE_KEY = "health:lastStatus";

export async function runHealthCheck(env: Env): Promise<HealthStatus> {
  const checks: HealthCheck[] = [];

  try {
    await getDb(env).run(sql`SELECT 1`);
    checks.push({
      name: "Database",
      ok: true,
      code: "DB_OK",
      message: "D1 connection healthy",
      solution: "",
      severity: "critical",
    });
  } catch (err: any) {
    checks.push({
      name: "Database",
      ok: false,
      code: "DB_UNREACHABLE",
      message: `D1 unreachable: ${err?.message ?? "unknown"}`,
      solution: "Check the DB binding in wrangler.toml and that migrations were applied.",
      severity: "critical",
    });
  }

  const secret = env.JWT_SECRET ?? env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    checks.push({
      name: "Config",
      ok: false,
      code: "WEAK_SESSION_SECRET",
      message: "JWT_SECRET / SESSION_SECRET is missing or too short (< 32 chars)",
      solution: "Set JWT_SECRET to a 64-char random string via `wrangler secret put JWT_SECRET`.",
      severity: "warning",
    });
  } else {
    checks.push({
      name: "Config",
      ok: true,
      code: "CONFIG_OK",
      message: "JWT secret configured",
      solution: "",
      severity: "warning",
    });
  }

  if (!env.BREVO_API_KEY) {
    checks.push({
      name: "Email",
      ok: false,
      code: "EMAIL_NOT_CONFIGURED",
      message: "BREVO_API_KEY is not set — OTP / reset emails will only log",
      solution: "Set BREVO_API_KEY via `wrangler secret put BREVO_API_KEY`.",
      severity: "warning",
    });
  } else {
    checks.push({
      name: "Email",
      ok: true,
      code: "EMAIL_OK",
      message: "Brevo configured",
      solution: "",
      severity: "warning",
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const status: HealthStatus = {
    ok: failed.length === 0,
    checks,
    checkedAt: new Date().toISOString(),
  };

  // Persist last status for /health/admin/last
  try {
    await env.SESSIONS_KV.put(STATE_KEY, JSON.stringify(status), {
      expirationTtl: 60 * 60,
    });
  } catch {
    /* ignore */
  }

  return status;
}

export async function getLastStatus(env: Env): Promise<HealthStatus> {
  try {
    const raw = await env.SESSIONS_KV.get(STATE_KEY);
    if (raw) return JSON.parse(raw) as HealthStatus;
  } catch {
    /* ignore */
  }
  return { ok: true, checks: [], checkedAt: new Date().toISOString() };
}

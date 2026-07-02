-- Migration 0008: Move rate-limit counters and Super Admin login tickets
-- from Workers KV (RATE_KV) into D1.
--
-- Why: Workers KV on the free plan allows only 1,000 write (`put`)
-- operations per day, account-wide. Every admin login attempt wrote to
-- RATE_KV 3-4 times (issue ticket, OTP rate-limit counter, ticket advance,
-- secret-key rate-limit counter), so normal admin login traffic alone could
-- exhaust the daily quota. Once exhausted, every further `RATE_KV.put()`
-- call throws "KV put() limit exceeded for the day" — and because the
-- ticket-issuing helpers had no try/catch around that call (unlike the
-- rate-limit helper, which fails open), the error propagated as an
-- unhandled 500 and blocked admin login entirely for the rest of the day.
--
-- D1's free-plan write allowance is much larger, so these short-lived
-- records move here instead — the same fallback pattern already used for
-- `uploads` (R2 -> D1) elsewhere in this schema.

CREATE TABLE rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL
);

CREATE TABLE admin_login_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  remember INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_admin_login_tickets_expires_at ON admin_login_tickets(expires_at);

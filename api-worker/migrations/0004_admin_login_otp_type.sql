-- Adds 'admin_login' as a valid otp_codes.type, used by the new
-- Super-Admin login verification step (password -> email OTP -> secret
-- key). SQLite can't ALTER a CHECK constraint directly, so this rebuilds
-- the table with the widened constraint, preserving all existing rows.

CREATE TABLE otp_codes_new (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verify','otp_login','forgot_password','admin_login')),
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

INSERT INTO otp_codes_new (id, target, code, type, used, expires_at, created_at)
SELECT id, target, code, type, used, expires_at, created_at FROM otp_codes;

DROP TABLE otp_codes;
ALTER TABLE otp_codes_new RENAME TO otp_codes;

CREATE INDEX IF NOT EXISTS idx_otp_target_type ON otp_codes(target, type);

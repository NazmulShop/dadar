-- Migration 0010: Admin-editable overrides for the real Brevo transactional
-- emails (registration OTP, admin login OTP, email-verify/login OTP,
-- password reset). Previously these subjects/copy were hardcoded in
-- lib/email.ts with no way to change them without a code deploy.

CREATE TABLE auth_email_templates (
  event TEXT PRIMARY KEY,
  subject TEXT,
  greeting TEXT,
  body_text TEXT,
  footer_note TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

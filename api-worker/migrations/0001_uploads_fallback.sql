-- Free-plan note: R2 is not available on the Cloudflare Workers free plan.
-- This table lets /api/uploads/image keep working (stored as base64 in D1)
-- when the UPLOADS (R2) binding is absent. Safe no-op once R2 is bound.
CREATE TABLE IF NOT EXISTS uploads (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

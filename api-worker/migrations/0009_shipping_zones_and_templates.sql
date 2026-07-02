-- Migration 0009: Shipping zones (previously hardcoded, local-state-only on
-- the admin page) and message template overrides (email/SMS template
-- editor previously had no persistence — PUT was a no-op stub).

CREATE TABLE shipping_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  areas TEXT NOT NULL DEFAULT '',
  charge INTEGER NOT NULL DEFAULT 0,
  estimated_days TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Seed the four Bangladesh delivery zones the admin UI previously faked
-- client-side, so the page isn't empty on first load of a fresh database.
INSERT INTO shipping_zones (id, name, areas, charge, estimated_days, active, sort_order) VALUES
  ('inside_dhaka', 'Inside Dhaka', 'Dhaka City Corporation', 60, '1-2', 1, 1),
  ('sub_dhaka', 'Sub-Dhaka / Nearby', 'Gazipur, Narayanganj, Savar, Manikganj', 80, '2-3', 1, 2),
  ('outside_dhaka', 'Outside Dhaka', 'All other districts', 120, '3-5', 1, 3),
  ('outside_bd', 'Outside Bangladesh', 'International shipping', 1200, '7-14', 0, 4);

CREATE TABLE message_templates (
  event TEXT PRIMARY KEY,
  subject TEXT,
  email_body TEXT,
  sms_body TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

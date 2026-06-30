-- Migration: New admin panel tables
-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percent',
  value INTEGER NOT NULL DEFAULT 0,
  min_order INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 999,
  used_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  target TEXT NOT NULL DEFAULT 'all',
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position TEXT NOT NULL DEFAULT 'hero',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Notifications (broadcast history)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target TEXT NOT NULL DEFAULT 'all',
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Flash Sales
CREATE TABLE IF NOT EXISTS flash_sales (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_id TEXT,
  discount_pct INTEGER NOT NULL DEFAULT 0,
  max_qty INTEGER NOT NULL DEFAULT 100,
  start_at TEXT,
  end_at TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Abandoned Carts
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  abandoned_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Wishlist Analytics
CREATE TABLE IF NOT EXISTS wishlist_analytics (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_name TEXT,
  plan TEXT NOT NULL DEFAULT 'Monthly',
  status TEXT NOT NULL DEFAULT 'active',
  monthly_value INTEGER NOT NULL DEFAULT 0,
  next_billing TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Gift Cards
CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL DEFAULT 0,
  used_amount INTEGER NOT NULL DEFAULT 0,
  recipient_email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  action TEXT NOT NULL,
  delay INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Push Notifications
CREATE TABLE IF NOT EXISTS push_notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT 'all',
  url TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT,
  last_status INTEGER,
  last_triggered TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  subject TEXT,
  category TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Live Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_message TEXT,
  unread INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Live Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender TEXT NOT NULL DEFAULT 'customer',
  message TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Customer Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  product_name TEXT,
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- CMS Pages
CREATE TABLE IF NOT EXISTS cms_pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'news',
  published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Media Library
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Admin Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Login Sessions
CREATE TABLE IF NOT EXISTS login_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_name TEXT,
  email TEXT,
  ip TEXT,
  user_agent TEXT,
  device TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Fraud Flags
CREATE TABLE IF NOT EXISTS fraud_flags (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  amount INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  flagged_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Backups
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  size INTEGER NOT NULL DEFAULT 0,
  url TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Search Analytics
CREATE TABLE IF NOT EXISTS search_analytics (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  results INTEGER NOT NULL DEFAULT 0
);

-- Seed default CMS pages
INSERT OR IGNORE INTO cms_pages (id, title, slug, content, published) VALUES
  ('page-about', 'About Us', 'about-us', 'Dadar Shop is Bangladesh''s trusted online marketplace.', 1),
  ('page-privacy', 'Privacy Policy', 'privacy-policy', 'Your privacy is important to us.', 1),
  ('page-terms', 'Terms & Conditions', 'terms-and-conditions', 'By using Dadar Shop you agree to our terms.', 1),
  ('page-faq', 'FAQ', 'faq', 'Frequently asked questions about Dadar Shop.', 1);

-- Seed default admin roles
INSERT OR IGNORE INTO roles (id, name, permissions, is_system) VALUES
  ('role-superadmin', 'Super Admin', '["orders:read","orders:write","products:read","products:write","customers:read","customers:write","sellers:read","sellers:write","analytics:read","settings:write","admins:write","coupons:write","banners:write","refunds:write","reports:read"]', 1),
  ('role-support', 'Support Agent', '["orders:read","customers:read","support-tickets:write","refunds:read"]', 1),
  ('role-content', 'Content Manager', '["products:read","banners:write","coupons:write"]', 1);

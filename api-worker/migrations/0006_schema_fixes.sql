-- Migration 0006: Schema fixes
-- Adds broadcast_notifications table and missing columns

-- Broadcast Notifications (admin-sent announcements, separate from per-user notifications)
CREATE TABLE IF NOT EXISTS broadcast_notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target TEXT NOT NULL DEFAULT 'all',
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Add missing columns to support_tickets (each ALTER is safe - D1 ignores duplicate column errors via Drizzle)
ALTER TABLE support_tickets ADD COLUMN guest_email TEXT;
ALTER TABLE support_tickets ADD COLUMN customer_name TEXT;
ALTER TABLE support_tickets ADD COLUMN customer_email TEXT;
ALTER TABLE support_tickets ADD COLUMN priority TEXT DEFAULT 'Normal';
ALTER TABLE support_tickets ADD COLUMN order_id TEXT;
ALTER TABLE support_tickets ADD COLUMN updated_at INTEGER DEFAULT (unixepoch() * 1000);
ALTER TABLE support_tickets ADD COLUMN message TEXT;

-- Add missing columns to chat_sessions
ALTER TABLE chat_sessions ADD COLUMN guest_email TEXT;
ALTER TABLE chat_sessions ADD COLUMN customer_name TEXT;
ALTER TABLE chat_sessions ADD COLUMN customer_email TEXT;
ALTER TABLE chat_sessions ADD COLUMN topic TEXT;
ALTER TABLE chat_sessions ADD COLUMN agent_name TEXT;
ALTER TABLE chat_sessions ADD COLUMN last_message TEXT;
ALTER TABLE chat_sessions ADD COLUMN unread INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN started_at INTEGER DEFAULT (unixepoch() * 1000);
ALTER TABLE chat_sessions ADD COLUMN ended_at INTEGER;

-- Add missing columns to chat_messages
ALTER TABLE chat_messages ADD COLUMN body TEXT;
ALTER TABLE chat_messages ADD COLUMN message TEXT;
ALTER TABLE chat_messages ADD COLUMN sender_role TEXT DEFAULT 'customer';
ALTER TABLE chat_messages ADD COLUMN sender_name TEXT DEFAULT 'Customer';

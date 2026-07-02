-- Migration 0011: Campaigns previously had no "send" action — a campaign
-- could be created but there was no way to actually dispatch it. Adds
-- columns to record when/how many recipients an email campaign was sent to.

ALTER TABLE campaigns ADD COLUMN sent_at INTEGER;
ALTER TABLE campaigns ADD COLUMN sent_count INTEGER NOT NULL DEFAULT 0;

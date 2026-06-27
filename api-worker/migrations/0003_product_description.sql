-- Adds a `description` column to products so the admin product form can
-- store and edit it. Stock continues to live in the existing `inventory`
-- table (one row per product, on_hand/reserved) — that's the single
-- source of truth for stock, so we don't duplicate it here.

ALTER TABLE products ADD COLUMN description TEXT;

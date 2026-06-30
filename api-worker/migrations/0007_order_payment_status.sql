-- Migration 0007: Payment status tracking for admin "Payments History and requests for payment" page
-- COD orders settle on delivery so they default to Pending; digital wallet/card orders also start Pending
-- until the admin verifies the transaction actually landed.

ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Pending';
ALTER TABLE orders ADD COLUMN payment_reference TEXT;
ALTER TABLE orders ADD COLUMN payment_verified_at INTEGER;

-- Orders already marked Delivered were, in practice, paid (COD collected on delivery, or
-- the prepaid method already cleared) — backfill them as Successful so history isn't empty.
UPDATE orders SET payment_status = 'Successful' WHERE status = 'Delivered';

-- Add imageUrl column to products for admin image upload support
ALTER TABLE products ADD COLUMN image_url TEXT;

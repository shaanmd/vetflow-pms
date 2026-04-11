-- Migration 002: add access_expires_at to user_practices for per-practice locum expiry
ALTER TABLE user_practices ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

-- Migrate existing user-level expiry data to the junction table (for locum role only)
UPDATE user_practices up
SET access_expires_at = u.access_expires_at
FROM users u
WHERE up.user_id = u.id
  AND up.role = 'locum'
  AND u.access_expires_at IS NOT NULL;

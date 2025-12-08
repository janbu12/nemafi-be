-- Add new port columns with defaults
ALTER TABLE "Router"
ADD COLUMN IF NOT EXISTS "portApi" INTEGER NOT NULL DEFAULT 8728,
ADD COLUMN IF NOT EXISTS "portSsh" INTEGER NOT NULL DEFAULT 22;

-- Backfill from old port if present (only when portApi/portSsh are null but columns are NOT NULL so just set explicitly)
UPDATE "Router" SET "portApi" = COALESCE("port", 8728) WHERE "portApi" IS NOT NULL;
-- For SSH, fall back to 22
UPDATE "Router" SET "portSsh" = 22 WHERE "portSsh" IS NOT NULL;

-- Add optional coordinates for user installation location
ALTER TABLE "Profile"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

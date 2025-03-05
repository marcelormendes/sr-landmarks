-- Add geohash column to landmarks table
ALTER TABLE "landmarks" ADD COLUMN "geohash" TEXT;

-- Create index on geohash for faster lookups
CREATE INDEX "landmarks_geohash_idx" ON "landmarks"("geohash");
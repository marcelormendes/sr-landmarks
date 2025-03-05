-- Create a temporary landmarks table without proximity search references
CREATE TABLE "landmarks_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "centerLat" REAL NOT NULL,
  "centerLng" REAL NOT NULL
);

-- Copy existing landmark data without the proximity_search_id and distance
INSERT INTO "landmarks_new" ("id", "name", "type", "centerLat", "centerLng")
SELECT "id", "name", "type", "centerLat", "centerLng" FROM "landmarks";

-- Create a temporary webhook_requests table without proximity search references
CREATE TABLE "webhook_requests_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "requestId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "lat" REAL NOT NULL,
  "lng" REAL NOT NULL,
  "radius" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "error" TEXT
);

-- Copy existing webhook_request data without the proximity_search_id
INSERT INTO "webhook_requests_new" ("id", "requestId", "status", "lat", "lng", "radius", "createdAt", "completedAt", "error")
SELECT "id", "requestId", "status", "lat", "lng", "radius", "createdAt", "completedAt", "error" FROM "webhook_requests";

-- Drop old tables
DROP TABLE "landmarks";
DROP TABLE "webhook_requests";
DROP TABLE "proximity_searches";

-- Rename new tables to original names
ALTER TABLE "landmarks_new" RENAME TO "landmarks";
ALTER TABLE "webhook_requests_new" RENAME TO "webhook_requests";

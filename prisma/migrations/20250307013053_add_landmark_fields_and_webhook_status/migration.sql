/*
  Warnings:

  - Made the column `geohash` on table `landmarks` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_landmarks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "centerLat" REAL NOT NULL,
    "centerLng" REAL NOT NULL,
    "geohash" TEXT NOT NULL,
    "address" TEXT,
    "wiki" TEXT,
    "website" TEXT,
    "openingHours" TEXT,
    "accessibility" TEXT,
    "tourism" TEXT
);
INSERT INTO "new_landmarks" ("centerLat", "centerLng", "geohash", "id", "name", "type") SELECT "centerLat", "centerLng", "geohash", "id", "name", "type" FROM "landmarks";
DROP TABLE "landmarks";
ALTER TABLE "new_landmarks" RENAME TO "landmarks";
CREATE INDEX "landmarks_geohash_idx" ON "landmarks"("geohash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

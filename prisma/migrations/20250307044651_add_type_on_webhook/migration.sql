/*
  Warnings:

  - Added the required column `type` to the `webhook_requests` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_webhook_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "radius" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "error" TEXT,
    "type" TEXT NOT NULL
);
INSERT INTO "new_webhook_requests" ("completedAt", "createdAt", "error", "id", "lat", "lng", "radius", "requestId", "status") SELECT "completedAt", "createdAt", "error", "id", "lat", "lng", "radius", "requestId", "status" FROM "webhook_requests";
DROP TABLE "webhook_requests";
ALTER TABLE "new_webhook_requests" RENAME TO "webhook_requests";
CREATE UNIQUE INDEX "webhook_requests_requestId_key" ON "webhook_requests"("requestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

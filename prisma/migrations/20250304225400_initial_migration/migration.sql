-- CreateTable
CREATE TABLE "landmarks" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "centerLat" REAL NOT NULL,
  "centerLng" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "webhook_requests" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "requestId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "lat" REAL NOT NULL,
  "lng" REAL NOT NULL,
  "radius" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "error" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_requests_requestId_key" ON "webhook_requests"("requestId");
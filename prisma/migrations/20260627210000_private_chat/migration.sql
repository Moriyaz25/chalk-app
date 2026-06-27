ALTER TABLE "boards"
ADD COLUMN "silent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "editedAt" TIMESTAMP(3);

CREATE TABLE "circle_presence" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "typing" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "circle_presence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "circle_presence_circleId_userId_key"
ON "circle_presence"("circleId", "userId");

CREATE INDEX "circle_presence_circleId_lastSeenAt_idx"
ON "circle_presence"("circleId", "lastSeenAt");

ALTER TABLE "circle_presence"
ADD CONSTRAINT "circle_presence_circleId_fkey"
FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "circle_presence"
ADD CONSTRAINT "circle_presence_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

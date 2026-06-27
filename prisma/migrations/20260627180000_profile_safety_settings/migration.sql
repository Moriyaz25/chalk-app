ALTER TABLE "users"
ADD COLUMN "bio" TEXT,
ADD COLUMN "preferences" JSONB;

ALTER TABLE "circle_members"
ADD COLUMN "muted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "safety_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "circleId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safety_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key"
ON "user_blocks"("blockerId", "blockedId");

CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");
CREATE INDEX "safety_reports_targetUserId_idx" ON "safety_reports"("targetUserId");
CREATE INDEX "safety_reports_circleId_idx" ON "safety_reports"("circleId");

ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_blockerId_fkey"
FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_blockedId_fkey"
FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "safety_reports"
ADD CONSTRAINT "safety_reports_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

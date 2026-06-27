ALTER TABLE "circles" ADD COLUMN "vibe" JSONB;

ALTER TABLE "boards"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'chalk',
  ADD COLUMN "deliveryMode" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "unlockAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "viewOnce" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "media" JSONB,
  ADD COLUMN "prompt" TEXT,
  ADD COLUMN "gift" TEXT,
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "replyToId" TEXT;

ALTER TABLE "board_receipts" ADD COLUMN "openedAt" TIMESTAMP(3);

ALTER TABLE "boards"
  ADD CONSTRAINT "boards_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "boards"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "board_reactions" (
  "id" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "board_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "board_reactions_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "board_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "board_reactions_boardId_userId_emoji_key" ON "board_reactions"("boardId", "userId", "emoji");
CREATE INDEX "board_reactions_boardId_idx" ON "board_reactions"("boardId");

CREATE TABLE "circle_drafts" (
  "circleId" TEXT NOT NULL,
  "drawing" JSONB NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "circle_drafts_pkey" PRIMARY KEY ("circleId"),
  CONSTRAINT "circle_drafts_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "circle_drafts_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

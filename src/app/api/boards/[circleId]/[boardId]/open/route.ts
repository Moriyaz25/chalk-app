import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBlockedPair } from "@/lib/safety";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ circleId: string; boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { circleId, boardId } = await params;
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      circleId,
      circle: { members: { some: { userId: session.user.id } } },
      AND: [
        { OR: [{ unlockAt: null }, { unlockAt: { lte: new Date() } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      ],
    },
    select: { id: true, senderId: true, viewOnce: true },
  });
  if (!board) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  if (await isBlockedPair(session.user.id, board.senderId)) {
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  }

  if (board.senderId !== session.user.id) {
    await prisma.boardReceipt.updateMany({
      where: { boardId, userId: session.user.id, openedAt: null },
      data: { openedAt: new Date(), seenAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, viewOnce: board.viewOnce });
}

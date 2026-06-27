import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBlockedPair } from "@/lib/safety";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ circleId: string; boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { circleId, boardId } = await params;
  const now = new Date();
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      circleId,
      circle: { members: { some: { userId: session.user.id } } },
    },
    select: {
      senderId: true,
      media: true,
      unlockAt: true,
      expiresAt: true,
      viewOnce: true,
      deliveryMode: true,
      receipts: {
        where: { userId: session.user.id },
        select: { openedAt: true },
      },
    },
  });

  if (!board?.media) return NextResponse.json({ error: "No media" }, { status: 404 });
  if (await isBlockedPair(session.user.id, board.senderId)) {
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  }
  if ((board.unlockAt && board.unlockAt > now) || (board.expiresAt && board.expiresAt <= now)) {
    return NextResponse.json({ error: "Unavailable" }, { status: 410 });
  }

  const openedAt = board.receipts[0]?.openedAt;
  const viewWindowExpired =
    !!openedAt && now.getTime() - openedAt.getTime() > 5 * 60 * 1000;
  if (board.viewOnce && board.senderId !== session.user.id && viewWindowExpired) {
    return NextResponse.json({ error: "This view-once moment has faded" }, { status: 410 });
  }

  return NextResponse.json(
    { media: board.media },
    {
      headers: {
        "Cache-Control":
          board.viewOnce || board.deliveryMode === "secret"
            ? "private, no-store"
            : "private, max-age=300",
      },
    }
  );
}

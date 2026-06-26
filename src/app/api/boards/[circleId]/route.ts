import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToCircle } from "@/lib/push";

async function assertMembership(circleId: string, userId: string) {
  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  return !!membership;
}

// GET /api/boards/[circleId] — paginated board history for a circle (newest first)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { circleId } = await params;
  if (!(await assertMembership(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 20;

  const boards = await prisma.board.findMany({
    where: { circleId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receipts: { where: { userId: session.user.id } },
    },
  });

  return NextResponse.json({
    boards,
    nextCursor: boards.length === limit ? boards[boards.length - 1].id : null,
  });
}

// POST /api/boards/[circleId] — send a new hand-drawn board to everyone in the circle
export async function POST(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { circleId } = await params;
  if (!(await assertMembership(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { drawing, boardColor, caption } = body;

  if (!drawing?.strokes || !Array.isArray(drawing.strokes)) {
    return NextResponse.json({ error: "Invalid drawing payload" }, { status: 400 });
  }

  const members = await prisma.circleMember.findMany({
    where: { circleId },
    select: { userId: true },
  });

  const board = await prisma.board.create({
    data: {
      circleId,
      senderId: session.user.id,
      drawing,
      boardColor: boardColor ?? "chalkboard-green",
      caption: caption ?? null,
      receipts: {
        create: members
          .filter((m) => m.userId !== session.user.id)
          .map((m) => ({ userId: m.userId })),
      },
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Fire-and-forget push notification to everyone else in the circle.
  sendPushToCircle(circleId, session.user.id, {
    title: `${session.user.name ?? "Someone"} left you a message`,
    body: "Tap to see what's on the board.",
    url: `/board/${circleId}`,
    circleId,
    boardId: board.id,
  }).catch((err) => console.error("Push notification failed:", err));

  return NextResponse.json({ board });
}

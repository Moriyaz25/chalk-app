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
    where: {
      circleId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      circleId: true,
      senderId: true,
      drawing: true,
      boardColor: true,
      caption: true,
      kind: true,
      deliveryMode: true,
      unlockAt: true,
      expiresAt: true,
      viewOnce: true,
      prompt: true,
      gift: true,
      isPinned: true,
      replyToId: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
      receipts: { where: { userId: session.user.id } },
      reactions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const now = new Date();
  const safeBoards = boards.map((board) => {
    const receipt = board.receipts[0];
    const isSender = board.senderId === session.user.id;
    const timeLocked = !!board.unlockAt && board.unlockAt > now;
    const consumed = board.viewOnce && !!receipt?.openedAt && !isSender;
    const locked = timeLocked || consumed;

    return {
      ...board,
      drawing: locked ? { strokes: [], viewBox: { width: 600, height: 600 } } : board.drawing,
      media:
        locked || (board.kind !== "photo" && board.kind !== "voice")
          ? null
          : {
              type: board.kind,
            },
      locked,
      lockReason: timeLocked ? "scheduled" : consumed ? "viewed" : null,
      currentUserId: session.user.id,
    };
  });

  return NextResponse.json({
    boards: safeBoards,
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
  const {
    drawing,
    boardColor,
    caption,
    kind,
    deliveryMode,
    unlockAt,
    expiresAt,
    viewOnce,
    media,
    prompt,
    gift,
    replyToId,
  } = body;

  if (!drawing?.strokes || !Array.isArray(drawing.strokes)) {
    return NextResponse.json({ error: "Invalid drawing payload" }, { status: 400 });
  }

  if (JSON.stringify(body).length > 2_500_000) {
    return NextResponse.json({ error: "Message is too large" }, { status: 413 });
  }

  if (media) {
    const validMedia =
      (media.type === "photo" && String(media.dataUrl).startsWith("data:image/")) ||
      (media.type === "voice" && String(media.dataUrl).startsWith("data:audio/"));
    if (!validMedia || String(media.dataUrl).length > 2_000_000) {
      return NextResponse.json({ error: "Invalid or oversized media" }, { status: 400 });
    }
  }

  const parsedUnlockAt = unlockAt ? new Date(unlockAt) : null;
  const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
  if (parsedUnlockAt && Number.isNaN(parsedUnlockAt.getTime())) {
    return NextResponse.json({ error: "Invalid unlock date" }, { status: 400 });
  }
  if (parsedExpiresAt && Number.isNaN(parsedExpiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
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
      kind: kind ?? "chalk",
      deliveryMode: deliveryMode ?? "normal",
      unlockAt: parsedUnlockAt,
      expiresAt: parsedExpiresAt,
      viewOnce: !!viewOnce,
      media: media ?? undefined,
      prompt: prompt?.slice(0, 180) || null,
      gift: gift?.slice(0, 40) || null,
      replyToId: replyToId || null,
      receipts: {
        create: members
          .filter((m) => m.userId !== session.user.id)
          .map((m) => ({ userId: m.userId })),
      },
    },
    select: {
      id: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Fire-and-forget push notification to everyone else in the circle.
  sendPushToCircle(circleId, session.user.id, {
    title: `${session.user.name ?? "Someone"} left you a message`,
    body:
      deliveryMode === "secret"
        ? "A secret chalk is waiting. Rub to reveal it."
        : parsedUnlockAt && parsedUnlockAt > new Date()
          ? "A time capsule is waiting for you."
          : "Tap to see what's on the board.",
    url: `/board/${circleId}`,
    circleId,
    boardId: board.id,
  }).catch((err) => console.error("Push notification failed:", err));

  return NextResponse.json({ board });
}

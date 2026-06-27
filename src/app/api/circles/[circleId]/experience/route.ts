import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function member(circleId: string, userId: string) {
  return prisma.circleMember.findUnique({ where: { circleId_userId: { circleId, userId } } });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await member(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [circle, boards] = await Promise.all([
    prisma.circle.findUnique({ where: { id: circleId }, select: { vibe: true } }),
    prisma.board.findMany({
      where: { circleId },
      select: { createdAt: true, senderId: true, isPinned: true },
      orderBy: { createdAt: "desc" },
      take: 365,
    }),
  ]);

  const requestedTimeZone = new URL(req.url).searchParams.get("tz") || "UTC";
  let timeZone = requestedTimeZone.slice(0, 64);
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    timeZone = "UTC";
  }
  const dateKey = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  };

  const activeDays = new Set(boards.map((board) => dateKey(board.createdAt)));
  let streak = 0;
  const cursor = new Date();
  if (!activeDays.has(dateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return NextResponse.json({
    vibe: circle?.vibe ?? {},
    streak,
    moments: boards.length,
    pinned: boards.filter((board) => board.isPinned).length,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await member(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const vibe = {
    emoji: String(body.emoji || "🫶").slice(0, 8),
    nickname: String(body.nickname || "").slice(0, 40),
    mood: String(body.mood || "").slice(0, 60),
    song: String(body.song || "").slice(0, 100),
    accent: String(body.accent || "#e89b95").slice(0, 16),
  };
  await prisma.circle.update({ where: { id: circleId }, data: { vibe } });
  return NextResponse.json({ vibe });
}

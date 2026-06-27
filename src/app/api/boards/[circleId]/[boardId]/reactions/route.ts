import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["❤️", "🥹", "😂", "💋", "✨", "🫶"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ circleId: string; boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId, boardId } = await params;
  const { emoji } = await req.json();
  if (!ALLOWED.has(emoji)) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });

  const board = await prisma.board.findFirst({
    where: { id: boardId, circleId, circle: { members: { some: { userId: session.user.id } } } },
    select: { id: true },
  });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = { boardId_userId_emoji: { boardId, userId: session.user.id, emoji } };
  const existing = await prisma.boardReaction.findUnique({ where: key });
  if (existing) {
    await prisma.boardReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.boardReaction.create({ data: { boardId, userId: session.user.id, emoji } });
  }
  return NextResponse.json({ active: !existing });
}

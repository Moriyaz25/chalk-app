import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ circleId: string; boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId, boardId } = await params;
  const board = await prisma.board.findFirst({
    where: { id: boardId, circleId, circle: { members: { some: { userId: session.user.id } } } },
    select: { isPinned: true },
  });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const next = !board.isPinned;
  await prisma.board.update({ where: { id: boardId }, data: { isPinned: next } });
  return NextResponse.json({ isPinned: next });
}

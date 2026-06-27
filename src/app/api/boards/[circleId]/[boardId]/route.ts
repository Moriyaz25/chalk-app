import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownBoard(circleId: string, boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, circleId, senderId: userId, circle: { members: { some: { userId } } } },
    select: { id: true, kind: true, createdAt: true },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ circleId: string; boardId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId, boardId } = await params;
  const board = await ownBoard(circleId, boardId, session.user.id);
  if (!board || board.kind !== "text") return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (Date.now() - board.createdAt.getTime() > 15 * 60 * 1000) {
    return NextResponse.json({ error: "Messages can only be edited for 15 minutes" }, { status: 409 });
  }
  const caption = String((await req.json()).caption || "").trim();
  if (!caption || caption.length > 2_000) return NextResponse.json({ error: "Message must be 1–2000 characters" }, { status: 400 });
  const updated = await prisma.board.update({
    where: { id: boardId },
    data: { caption, editedAt: new Date() },
    select: { id: true, caption: true, editedAt: true },
  });
  return NextResponse.json({ board: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ circleId: string; boardId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId, boardId } = await params;
  if (!(await ownBoard(circleId, boardId, session.user.id))) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  await prisma.board.delete({ where: { id: boardId } });
  return NextResponse.json({ ok: true });
}

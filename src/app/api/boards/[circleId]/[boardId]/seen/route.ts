import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ circleId: string; boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { circleId, boardId } = await params;

  await prisma.boardReceipt.updateMany({
    where: { boardId, userId: session.user.id, board: { circleId } },
    data: { seenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

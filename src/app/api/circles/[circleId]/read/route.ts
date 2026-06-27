import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      memberships: { where: { circleId }, select: { id: true } },
    },
  });
  if (!user?.memberships.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.boardReceipt.updateMany({
    where: { userId: session.user.id, seenAt: null, board: { circleId } },
    data: { seenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

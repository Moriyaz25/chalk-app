import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const invite = await prisma.invite.findUnique({ where: { code: code.toUpperCase() } });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  if (invite.maxUses !== 0 && invite.uses >= invite.maxUses) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }

  if (invite.createdBy === session.user.id) {
    return NextResponse.json({ error: "You can't accept your own invite" }, { status: 400 });
  }

  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: invite.createdBy, blockedId: session.user.id },
        { blockerId: session.user.id, blockedId: invite.createdBy },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "This invite is unavailable" }, { status: 403 });
  }

  let circleId = invite.circleId;

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.invite.updateMany({
      where: {
        id: invite.id,
        OR: [{ maxUses: 0 }, { uses: { lt: invite.maxUses } }],
      },
      data: { uses: { increment: 1 } },
    });
    if (claimed.count === 0) throw new Error("INVITE_USED");

    if (!circleId) {
      // Direct invite — create a new 1-on-1 circle between creator and acceptor.
      const circle = await tx.circle.create({
        data: {
          isDirect: true,
          members: {
            create: [
              { userId: invite.createdBy, role: "OWNER" },
              { userId: session.user.id, role: "MEMBER" },
            ],
          },
        },
      });
      circleId = circle.id;
    } else {
      // Group invite — add the acceptor if not already a member.
      const existing = await tx.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId: session.user.id } },
      });
      if (!existing) {
        await tx.circleMember.create({
          data: { circleId, userId: session.user.id, role: "MEMBER" },
        });
      }
    }

    return circleId;
  }).catch((error) => {
    if (error instanceof Error && error.message === "INVITE_USED") return null;
    throw error;
  });

  if (!result) return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  return NextResponse.json({ circleId: result });
}

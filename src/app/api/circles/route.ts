import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/circles — list all circles (1-on-1 + group) the current user belongs to,
// with the latest board preview for each, sorted by most recent activity.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userBlockDelegate = (prisma as typeof prisma & {
    userBlock?: {
      findMany: typeof prisma.boardReceipt.findMany;
    };
  }).userBlock;

  const [circles, unreadReceipts, blocks] = await Promise.all([
    prisma.circle.findMany({
      where: { members: { some: { userId: session.user.id, hiddenAt: null } } },
      select: {
        id: true,
        name: true,
        isDirect: true,
        boardColor: true,
        members: {
          select: {
            userId: true,
            role: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        boards: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            createdAt: true,
            sender: { select: { name: true } },
          },
        },
      },
    }),
    prisma.boardReceipt.findMany({
      where: { userId: session.user.id, seenAt: null },
      select: { board: { select: { circleId: true } } },
    }),
    userBlockDelegate
      ? userBlockDelegate.findMany({
          where: { OR: [{ blockerId: session.user.id }, { blockedId: session.user.id }] },
          select: { blockerId: true, blockedId: true },
        })
      : Promise.resolve([]),
  ]);
  const blockedPeerIds = new Set(
    blocks.map((block) => block.blockerId === session.user.id ? block.blockedId : block.blockerId)
  );
  const unreadByCircle = new Map<string, number>();
  for (const receipt of unreadReceipts) {
    const id = receipt.board.circleId;
    unreadByCircle.set(id, (unreadByCircle.get(id) || 0) + 1);
  }

  // Sort by most recent board activity (circles with no boards yet go last)
  circles.sort((a, b) => {
    const aTime = a.boards[0]?.createdAt?.getTime() ?? 0;
    const bTime = b.boards[0]?.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const shaped = circles.filter((circle) =>
    !circle.isDirect ||
    !circle.members.some((member) => member.userId !== session.user.id && blockedPeerIds.has(member.userId))
  ).map((circle) => {
    const otherMembers = circle.members.filter((m) => m.userId !== session.user.id);
    const displayName = circle.isDirect
      ? otherMembers[0]?.user.name ?? "Unknown"
      : circle.name ?? otherMembers.map((m) => m.user.name).join(", ");

    return {
      id: circle.id,
      name: displayName,
      isDirect: circle.isDirect,
      boardColor: circle.boardColor,
      memberCount: circle.members.length,
      unreadCount: unreadByCircle.get(circle.id) || 0,
      currentRole: circle.members.find((m) => m.userId === session.user.id)?.role ?? "MEMBER",
      members: circle.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
      })),
      latestBoard: circle.boards[0]
        ? {
            id: circle.boards[0].id,
            senderName: circle.boards[0].sender.name,
            createdAt: circle.boards[0].createdAt,
          }
        : null,
    };
  });

  return NextResponse.json({ circles: shaped });
}

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

  const circles = await prisma.circle.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: true } },
      boards: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: true },
      },
    },
  });

  // Sort by most recent board activity (circles with no boards yet go last)
  circles.sort((a, b) => {
    const aTime = a.boards[0]?.createdAt?.getTime() ?? 0;
    const bTime = b.boards[0]?.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const shaped = circles.map((circle) => {
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

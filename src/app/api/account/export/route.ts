import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      bio: true,
      chalkColor: true,
      preferences: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          muted: true,
          joinedAt: true,
          circle: { select: { id: true, name: true, isDirect: true, createdAt: true } },
        },
      },
      sentBoards: {
        select: {
          id: true,
          circleId: true,
          caption: true,
          kind: true,
          deliveryMode: true,
          createdAt: true,
          drawing: true,
          media: true,
          prompt: true,
          gift: true,
        },
      },
      boardReactions: {
        select: { boardId: true, emoji: true, createdAt: true },
      },
    },
  });

  return new NextResponse(JSON.stringify({ exportedAt: new Date(), user }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="chalk-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

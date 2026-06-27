import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Unambiguous alphabet (no 0/O, 1/I) for codes people type by hand.
const generateCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 6);

// POST /api/invites
// body: { mode: "direct" } -> creates an invite that, when accepted, forms a new 1-on-1 circle
// body: { mode: "group", circleId, maxUses? } -> creates an invite to join an existing/new group circle
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const mode = body.mode === "group" ? "group" : "direct";
  const recentInvites = await prisma.invite.count({
    where: {
      createdBy: session.user.id,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentInvites >= 20) {
    return NextResponse.json({ error: "Invite limit reached. Try again later." }, { status: 429 });
  }

  let circleId: string | null = null;

  if (mode === "group") {
    if (body.circleId) {
      // Adding more invite capacity to an existing circle — verify membership.
      const membership = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId: body.circleId, userId: session.user.id } },
      });
      if (!membership || membership.role !== "OWNER") {
        return NextResponse.json({ error: "Only the circle owner can create invites" }, { status: 403 });
      }
      circleId = body.circleId;
    } else {
      // Brand-new group circle, created by this user as OWNER.
      const circle = await prisma.circle.create({
        data: {
          name: body.name || "New circle",
          isDirect: false,
          members: {
            create: { userId: session.user.id, role: "OWNER" },
          },
        },
      });
      circleId = circle.id;
    }
  }

  const invite = await prisma.invite.create({
    data: {
      code: generateCode(),
      circleId, // null for direct invites — accepting creates a fresh 1-on-1 circle
      createdBy: session.user.id,
      maxUses:
        mode === "group"
          ? Math.max(0, Math.min(100, Number(body.maxUses ?? 0) || 0))
          : 1,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  return NextResponse.json({
    code: invite.code,
    circleId,
    url: `/join/${invite.code}`,
  });
}

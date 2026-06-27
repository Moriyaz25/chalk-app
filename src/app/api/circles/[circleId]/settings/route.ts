import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePreferences } from "@/lib/preferences";

async function membership(circleId: string, userId: string) {
  return prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  const current = await membership(circleId, session.user.id);
  if (!current) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: {
      id: true,
      name: true,
      isDirect: true,
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              name: true,
              username: true,
              image: true,
              bio: true,
              chalkColor: true,
              preferences: true,
            },
          },
        },
      },
      invites: {
        where: { createdBy: session.user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, uses: true, maxUses: true, expiresAt: true },
      },
    },
  });
  if (!circle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocked = await prisma.userBlock.findMany({
    where: { blockerId: session.user.id },
    select: { blockedId: true },
  });
  const blockedIds = new Set(blocked.map((item) => item.blockedId));

  return NextResponse.json({
    circle: {
      id: circle.id,
      name: circle.name,
      isDirect: circle.isDirect,
      muted: current.muted,
      currentRole: current.role,
      currentUserId: session.user.id,
      members: circle.members.map((item) => {
        const publicProfile = parsePreferences(item.user.preferences).profilePublic;
        return {
          id: item.userId,
          name: item.user.name,
          image: item.user.image,
          role: item.role,
          joinedAt: item.joinedAt,
          blocked: blockedIds.has(item.userId),
          ...(publicProfile || item.userId === session.user.id
            ? {
                username: item.user.username,
                bio: item.user.bio,
                chalkColor: item.user.chalkColor,
              }
            : {}),
        };
      }),
      invites: current.role === "OWNER" ? circle.invites : [],
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  const current = await membership(circleId, session.user.id);
  if (!current) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "mute") {
    await prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId: session.user.id } },
      data: { muted: Boolean(body.muted) },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "hide") {
    await prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId: session.user.id } },
      data: { hiddenAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unhide") {
    await prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId: session.user.id } },
      data: { hiddenAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "block" || action === "unblock") {
    const targetUserId = String(body.userId || "");
    if (!targetUserId || targetUserId === session.user.id || !(await membership(circleId, targetUserId))) {
      return NextResponse.json({ error: "Invalid member" }, { status: 400 });
    }
    if (action === "block") {
      await prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: targetUserId } },
        create: { blockerId: session.user.id, blockedId: targetUserId },
        update: {},
      });
    } else {
      await prisma.userBlock.deleteMany({
        where: { blockerId: session.user.id, blockedId: targetUserId },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "report") {
    const targetUserId = String(body.userId || "") || null;
    const reason = String(body.reason || "Safety concern").slice(0, 80);
    const details = String(body.details || "").slice(0, 500);
    const recentReports = await prisma.safetyReport.count({
      where: {
        reporterId: session.user.id,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentReports >= 5) {
      return NextResponse.json({ error: "Report limit reached. Try again later." }, { status: 429 });
    }
    await prisma.safetyReport.create({
      data: { reporterId: session.user.id, targetUserId, circleId, reason, details: details || null },
    });
    return NextResponse.json({ ok: true });
  }

  if (current.role !== "OWNER") {
    return NextResponse.json({ error: "Only the circle owner can do that" }, { status: 403 });
  }

  if (action === "rename") {
    const name = String(body.name || "").trim().slice(0, 50);
    if (name.length < 2) return NextResponse.json({ error: "Name is too short" }, { status: 400 });
    await prisma.circle.update({ where: { id: circleId }, data: { name } });
  } else if (action === "remove") {
    const targetUserId = String(body.userId || "");
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "Transfer ownership or leave instead" }, { status: 400 });
    }
    await prisma.circleMember.deleteMany({ where: { circleId, userId: targetUserId, role: "MEMBER" } });
  } else if (action === "transfer") {
    const targetUserId = String(body.userId || "");
    const target = await membership(circleId, targetUserId);
    if (!target || targetUserId === session.user.id) {
      return NextResponse.json({ error: "Choose another member" }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: session.user.id } },
        data: { role: "MEMBER" },
      }),
      prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { role: "OWNER" },
      }),
    ]);
  } else if (action === "revokeInvite") {
    await prisma.invite.deleteMany({
      where: { id: String(body.inviteId || ""), circleId, createdBy: session.user.id },
    });
  } else if (action === "deleteForever") {
    if (String(body.confirmation || "").trim().toUpperCase() !== "DELETE") {
      return NextResponse.json({ error: "Type DELETE to confirm permanent deletion" }, { status: 400 });
    }
    await prisma.circle.delete({ where: { id: circleId } });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  const current = await membership(circleId, session.user.id);
  if (!current) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const memberCount = await prisma.circleMember.count({ where: { circleId } });

  if (current.role === "OWNER" && memberCount > 1) {
    return NextResponse.json({ error: "Transfer ownership before leaving" }, { status: 400 });
  }
  if (memberCount === 1) {
    await prisma.circle.delete({ where: { id: circleId } });
  } else {
    await prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId: session.user.id } },
    });
  }
  return NextResponse.json({ ok: true });
}

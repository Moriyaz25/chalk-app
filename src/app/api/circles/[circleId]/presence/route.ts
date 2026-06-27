import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isMember(circleId: string, userId: string) {
  return prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { id: true },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ circleId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await isMember(circleId, session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const people = await prisma.circlePresence.findMany({
    where: {
      circleId,
      userId: { not: session.user.id },
      lastSeenAt: { gt: new Date(Date.now() - 45_000) },
    },
    select: {
      typing: true,
      lastSeenAt: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });
  return NextResponse.json({ people });
}

export async function POST(req: Request, { params }: { params: Promise<{ circleId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await isMember(circleId, session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  await prisma.circlePresence.upsert({
    where: { circleId_userId: { circleId, userId: session.user.id } },
    create: { circleId, userId: session.user.id, typing: Boolean(body.typing) },
    update: { typing: Boolean(body.typing), lastSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

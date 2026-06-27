import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isMember(circleId: string, userId: string) {
  return !!(await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await isMember(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const draft = await prisma.circleDraft.findUnique({
    where: { circleId },
    include: { updater: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ draft, currentUserId: session.user.id });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await isMember(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { drawing } = await req.json();
  if (!Array.isArray(drawing?.strokes) || drawing.strokes.length > 1500) {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
  }
  const draft = await prisma.circleDraft.upsert({
    where: { circleId },
    create: { circleId, updatedBy: session.user.id, drawing },
    update: { updatedBy: session.user.id, drawing },
  });
  return NextResponse.json({ draft });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { circleId } = await params;
  if (!(await isMember(circleId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.circleDraft.deleteMany({ where: { circleId } });
  return NextResponse.json({ ok: true });
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DrawScreen } from "@/components/board/DrawScreen";
import type { ChalkDrawing } from "@/types/chalk";

export default async function DrawPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ replyTo?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { circleId } = await params;
  const { replyTo } = await searchParams;

  const [circle, currentUser] = await Promise.all([
    prisma.circle.findUnique({
      where: { id: circleId },
      include: { members: { include: { user: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { chalkColor: true },
    }),
  ]);

  if (!circle) notFound();

  const isMember = circle.members.some((m) => m.userId === session.user.id);
  if (!isMember) notFound();

  const otherMembers = circle.members.filter((m) => m.userId !== session.user.id);
  const displayName = circle.isDirect
    ? otherMembers[0]?.user.name ?? "Unknown"
    : circle.name ?? otherMembers.map((m) => m.user.name).join(", ");

  const source = replyTo
    ? await prisma.board.findFirst({
        where: { id: replyTo, circleId },
        select: { drawing: true },
      })
    : null;

  return (
    <DrawScreen
      circleId={circle.id}
      circleName={displayName ?? "them"}
      initialDrawing={(source?.drawing as ChalkDrawing | undefined) ?? null}
      replyToId={source ? replyTo : undefined}
      initialColor={currentUser?.chalkColor}
    />
  );
}

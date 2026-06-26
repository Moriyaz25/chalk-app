import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BoardScreen } from "@/components/board/BoardScreen";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { circleId } = await params;

  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    include: { members: { include: { user: true } } },
  });

  if (!circle) notFound();

  const isMember = circle.members.some((m) => m.userId === session.user.id);
  if (!isMember) notFound();

  const otherMembers = circle.members.filter((m) => m.userId !== session.user.id);
  const displayName = circle.isDirect
    ? otherMembers[0]?.user.name ?? "Unknown"
    : circle.name ?? otherMembers.map((m) => m.user.name).join(", ");

  return <BoardScreen circleId={circle.id} circleName={displayName ?? "them"} />;
}

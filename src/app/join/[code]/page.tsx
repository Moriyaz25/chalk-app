import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinScreen } from "@/components/board/JoinScreen";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  const invite = await prisma.invite.findUnique({
    where: { code: code.toUpperCase() },
    include: { creator: true, circle: true },
  });

  if (!invite) {
    return <JoinScreen status="not-found" />;
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return <JoinScreen status="expired" />;
  }

  if (invite.maxUses !== 0 && invite.uses >= invite.maxUses) {
    return <JoinScreen status="used-up" />;
  }

  if (!session?.user?.id) {
    redirect(`/login?next=/join/${code}`);
  }

  if (invite.createdBy === session.user.id) {
    return (
      <JoinScreen status="own-invite" inviterName={invite.creator.name} />
    );
  }

  return (
    <JoinScreen
      status="ready"
      code={code}
      inviterName={invite.creator.name}
      isGroup={!!invite.circleId}
      groupName={invite.circle?.name}
    />
  );
}

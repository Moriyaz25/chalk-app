import { prisma } from "@/lib/prisma";

export async function isBlockedPair(firstUserId: string, secondUserId: string) {
  if (firstUserId === secondUserId) return false;
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: firstUserId, blockedId: secondUserId },
        { blockerId: secondUserId, blockedId: firstUserId },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user
    .findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        username: true,
        bio: true,
        chalkColor: true,
        preferences: true,
        image: true,
        email: true,
        createdAt: true,
        blocksCreated: {
          select: {
            blocked: { select: { id: true, name: true, username: true, image: true } },
          },
        },
        _count: { select: { sessions: true } },
      },
    })
    .catch(async () => {
      const fallback = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          username: true,
          chalkColor: true,
          preferences: true,
          image: true,
          email: true,
          createdAt: true,
          _count: { select: { sessions: true } },
        },
      });

      return fallback
        ? {
            ...fallback,
            bio: null,
            blocksCreated: [],
          }
        : null;
    });

  if (!user) redirect("/login");

  return (
    <SettingsClient
      user={{ ...user, createdAt: user.createdAt.toISOString() }}
    />
  );
}

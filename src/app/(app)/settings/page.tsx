import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      image: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return <SettingsClient user={{ ...user, createdAt: user.createdAt.toISOString() }} />;
}

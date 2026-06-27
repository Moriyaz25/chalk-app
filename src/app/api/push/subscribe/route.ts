import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePreferences } from "@/lib/preferences";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const preferences = {
    ...parsePreferences(user?.preferences),
    timeZone: typeof body.timeZone === "string" ? body.timeZone.slice(0, 64) : "UTC",
  };

  await prisma.$transaction([
    prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session.user.id,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { preferences },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

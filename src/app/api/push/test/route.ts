import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPushToUser(session.user.id, {
    title: "Chalk notifications are ready",
    body: "This device can receive new chalk messages.",
    url: "/settings",
    category: "message",
  });
  if (!result?.sent) {
    return NextResponse.json(
      { error: "No notification was delivered. Check quiet hours and browser permission." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT env vars. Generate with `npx web-push generate-vapid-keys`."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type ChalkPushPayload = {
  title: string;
  body: string;
  url?: string;
  circleId?: string;
  boardId?: string;
  image?: string;
};

/**
 * Sends a push notification to every subscription a user has registered
 * (they may have multiple devices). Automatically prunes subscriptions
 * that the push service reports as expired/gone (404/410).
 */
export async function sendPushToUser(userId: string, payload: ChalkPushPayload) {
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  const deadEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadEndpoints.push(subscriptions[i].endpoint);
      }
    }
  });

  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: deadEndpoints } },
    });
  }
}

/** Sends to every member of a circle except the sender. */
export async function sendPushToCircle(
  circleId: string,
  excludeUserId: string,
  payload: ChalkPushPayload
) {
  const members = await prisma.circleMember.findMany({
    where: { circleId, userId: { not: excludeUserId } },
    select: { userId: true },
  });

  await Promise.all(members.map((m) => sendPushToUser(m.userId, payload)));
}

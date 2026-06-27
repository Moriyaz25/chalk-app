import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { isQuietTime, parsePreferences } from "@/lib/preferences";

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
  category?: "message" | "reaction";
};

/**
 * Sends a push notification to every subscription a user has registered
 * (they may have multiple devices). Automatically prunes subscriptions
 * that the push service reports as expired/gone (404/410).
 */
export async function sendPushToUser(userId: string, payload: ChalkPushPayload) {
  ensureConfigured();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true, pushSubscriptions: true },
  });
  if (!user) return { sent: 0, failed: 0 };

  const preferences = parsePreferences(user.preferences);
  if (
    !preferences.notificationsEnabled ||
    isQuietTime(preferences) ||
    (payload.category === "reaction" && !preferences.notifyReactions) ||
    (payload.category !== "reaction" && !preferences.notifyMessages)
  ) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = user.pushSubscriptions;
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };
  const safePayload = preferences.hideNotificationPreview
    ? { ...payload, title: "New activity on Chalk", body: "Open Chalk to see what is new.", image: undefined }
    : payload;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(safePayload)
      )
    )
  );

  const deadEndpoints: string[] = [];
  let failed = 0;
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      failed += 1;
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadEndpoints.push(subscriptions[i].endpoint);
      } else {
        console.error("Push delivery failed", {
          statusCode,
          message: result.reason instanceof Error ? result.reason.message : "Unknown push error",
        });
      }
    }
  });

  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: deadEndpoints } },
    });
  }
  return { sent: results.length - failed, failed };
}

/** Sends to every member of a circle except the sender. */
export async function sendPushToCircle(
  circleId: string,
  excludeUserId: string,
  payload: ChalkPushPayload
) {
  const members = await prisma.circleMember.findMany({
    where: { circleId, userId: { not: excludeUserId }, muted: false },
    select: { userId: true },
  });

  const blocks = await prisma.userBlock.findMany({
    where: {
      OR: [
        { blockerId: excludeUserId, blockedId: { in: members.map((member) => member.userId) } },
        { blockedId: excludeUserId, blockerId: { in: members.map((member) => member.userId) } },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });
  const blockedUserIds = new Set(blocks.flatMap((block) => [block.blockerId, block.blockedId]));

  await Promise.all(
    members
      .filter((member) => !blockedUserIds.has(member.userId))
      .map((member) => sendPushToUser(member.userId, payload))
  );
}

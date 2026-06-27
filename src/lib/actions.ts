"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PREFERENCES, parsePreferences } from "@/lib/preferences";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ProfileState = {
  ok: boolean;
  message: string;
};

const MAX_PROFILE_IMAGE_CHARS = 350_000;

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You need to be signed in to save your profile." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const chalkColor = String(formData.get("chalkColor") ?? "#F2E9D8");
  const image = String(formData.get("image") ?? "").trim();

  if (name.length < 2 || name.length > 40) {
    return { ok: false, message: "Display name must be 2 to 40 characters." };
  }

  if (!/^[a-z0-9_.-]{3,20}$/.test(username)) {
    return { ok: false, message: "Handle must be 3–20 lowercase letters, numbers, dots, dashes, or underscores." };
  }

  if (bio.length > 160) {
    return { ok: false, message: "Bio must be 160 characters or less." };
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(chalkColor)) {
    return { ok: false, message: "Choose a valid chalk color." };
  }

  if (image && !image.startsWith("data:image/") && !/^https?:\/\//.test(image)) {
    return { ok: false, message: "Choose an image file or use a valid image URL." };
  }

  if (image.startsWith("data:image/") && image.length > MAX_PROFILE_IMAGE_CHARS) {
    return {
      ok: false,
      message: "That image is too large. Choose a smaller photo or paste an image URL.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        username,
        bio: bio || null,
        chalkColor,
        image: image || null,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "That username is already taken." };
    }
    return { ok: false, message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true, message: "Profile saved." };
}

export async function updatePreferencesAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const previous = parsePreferences(current?.preferences);
  const section = String(formData.get("section") || "");
  const next = { ...previous };

  if (section === "notifications") {
    next.notificationsEnabled = formData.get("notificationsEnabled") === "on";
    next.notifyMessages = formData.get("notifyMessages") === "on";
    next.notifyReactions = formData.get("notifyReactions") === "on";
    next.quietHoursEnabled = formData.get("quietHoursEnabled") === "on";
    next.hideNotificationPreview = formData.get("hideNotificationPreview") === "on";
    next.quietStart = String(formData.get("quietStart") || DEFAULT_PREFERENCES.quietStart);
    next.quietEnd = String(formData.get("quietEnd") || DEFAULT_PREFERENCES.quietEnd);
  }

  if (section === "privacy") {
    next.profilePublic = formData.get("profilePublic") === "on";
    next.readReceipts = formData.get("readReceipts") === "on";
    next.reducedMotion = formData.get("reducedMotion") === "on";
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferences: next },
  });
  revalidatePath("/settings");
}

export async function deleteAccountAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (String(formData.get("confirmation") || "") !== "DELETE") return;

  const memberships = await prisma.circleMember.findMany({
    where: { userId: session.user.id },
    select: { circleId: true },
  });

  await prisma.user.delete({ where: { id: session.user.id } });
  await prisma.circle.deleteMany({
    where: {
      id: { in: memberships.map((membership) => membership.circleId) },
      members: { none: {} },
    },
  });
  await signOut({ redirectTo: "/login" });
}

export async function unblockUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.userBlock.deleteMany({
    where: {
      blockerId: session.user.id,
      blockedId: String(formData.get("userId") || ""),
    },
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function signOutEverywhereAction() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.session.deleteMany({ where: { userId: session.user.id } });
  await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id } });
  await signOut({ redirectTo: "/login" });
}

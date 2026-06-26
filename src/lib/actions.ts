"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ProfileState = {
  ok: boolean;
  message: string;
};

const MAX_PROFILE_IMAGE_CHARS = 1_200_000;

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "You need to be signed in to save your profile." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();

  if (username.length < 2 || username.length > 24) {
    return { ok: false, message: "Username must be 2 to 24 characters." };
  }

  if (!/^[a-zA-Z0-9_ .-]+$/.test(username)) {
    return { ok: false, message: "Use letters, numbers, spaces, dots, dashes, or underscores." };
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
        name: username,
        username,
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

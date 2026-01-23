"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function updateAvatar(avatarUrl: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    revalidatePath("/profile");
    revalidatePath("/feed");
    revalidatePath("/leaderboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating avatar:", error);
    return { success: false, error: "Failed to update avatar" };
  }
}

export async function updateProfile(data: {
  fullName?: string;
  username?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check if username is taken by another user
    if (data.username) {
      const existingUser = await db.user.findFirst({
        where: {
          username: data.username,
          id: { not: user.id },
        },
      });

      if (existingUser) {
        return { success: false, error: "Username is already taken" };
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        username: data.username || null,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}


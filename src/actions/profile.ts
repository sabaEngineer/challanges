"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function getUserActivityHistory(userId: string, months: number = 6) {
  // Get check-ins from the last N months
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setHours(0, 0, 0, 0);

  const checkins = await db.dailyCheckin.findMany({
    where: {
      userId,
      checkinDate: { gte: startDate },
    },
    select: {
      id: true,
      checkinDate: true,
      isDone: true,
      note: true,
      imageUrl: true,
      createdAt: true,
      challenge: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
        },
      },
      items: {
        select: {
          id: true,
          value: true,
          isDone: true,
          requirement: {
            select: {
              id: true,
              title: true,
              type: true,
              targetValue: true,
              unit: true,
            },
          },
        },
      },
    },
    orderBy: { checkinDate: "desc" },
  });

  return checkins.map((c) => ({
    id: c.id,
    checkinDate: c.checkinDate.toISOString(),
    isDone: c.isDone,
    note: c.note,
    imageUrl: c.imageUrl,
    createdAt: c.createdAt.toISOString(),
    challenge: c.challenge,
    items: c.items.map((item) => ({
      id: item.id,
      value: item.value?.toString() || null,
      isDone: item.isDone,
      requirement: {
        id: item.requirement.id,
        title: item.requirement.title,
        type: item.requirement.type,
        targetValue: item.requirement.targetValue?.toString() || null,
        unit: item.requirement.unit,
      },
    })),
  }));
}

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


"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function getNotifications() {
  const user = await getCurrentUser();
  if (!user) return [];

  return db.notification.findMany({
    where: { userId: user.id },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadNotificationsCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  return db.notification.count({
    where: {
      userId: user.id,
      read: false,
    },
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== user.id) {
    return { success: false, error: "Notification not found" };
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  revalidatePath("/");
  return { success: true };
}

export async function markAllNotificationsAsRead(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  await db.notification.updateMany({
    where: {
      userId: user.id,
      read: false,
    },
    data: { read: true },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteNotification(notificationId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== user.id) {
    return { success: false, error: "Notification not found" };
  }

  await db.notification.delete({
    where: { id: notificationId },
  });

  revalidatePath("/");
  return { success: true };
}

// Helper function to create a notification (used by other actions)
export async function createNotification(data: {
  userId: string;
  type: "challenge_invitation" | "invitation_accepted" | "invitation_rejected" | "challenge_started" | "challenge_ended";
  title: string;
  message: string;
  challengeId?: string;
}) {
  return db.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      challengeId: data.challengeId,
    },
  });
}


"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { sendPushNotification } from "@/lib/firebase-admin";

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
      checkin: {
        select: {
          id: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
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
  type: "challenge_invitation" | "invitation_accepted" | "invitation_rejected" | "challenge_started" | "challenge_ended" | "member_checkin" | "new_comment" | "comment_reply" | "book_request" | "book_request_accepted" | "book_request_rejected" | "book_returned";
  title: string;
  message: string;
  challengeId?: string;
  checkinId?: string;
  bookId?: string;
}) {
  // Create in-app notification
  const notification = await db.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      challengeId: data.challengeId,
      checkinId: data.checkinId,
      bookId: data.bookId,
    },
  });

  // Only send push notifications for comments (new_comment and comment_reply)
  const shouldSendPush = data.type === "new_comment" || data.type === "comment_reply";

  if (shouldSendPush) {
    try {
      const user = await db.user.findUnique({
        where: { id: data.userId },
        select: {
          pushToken: true,
          pushNotificationsEnabled: true,
        },
      });

      if (user?.pushNotificationsEnabled && user.pushToken) {
        // Build URL based on notification type
        let url = "/notifications";
        if (data.challengeId) {
          url = `/challenges/${data.challengeId}`;
        }

        await sendPushNotification(
          user.pushToken,
          data.title,
          data.message,
          { url, notificationId: notification.id }
        );
      }
    } catch (error) {
      console.error("Failed to send push notification:", error);
      // Don't fail the whole operation if push fails
    }
  }

  return notification;
}


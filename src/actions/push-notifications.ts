"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

// Save push notification token for the current user
export async function savePushToken(token: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        pushToken: token,
        pushNotificationsEnabled: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save push token:", error);
    return { success: false, error: "Failed to save notification preferences" };
  }
}

// Disable push notifications for the current user
export async function disablePushNotifications(): Promise<ActionResult> {
  const user = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        pushToken: null,
        pushNotificationsEnabled: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to disable push notifications:", error);
    return { success: false, error: "Failed to update notification preferences" };
  }
}

// Get push notification status for the current user
export async function getPushNotificationStatus(): Promise<{ enabled: boolean; hasToken: boolean; isLoggedIn: boolean }> {
  const user = await getCurrentUser();
  
  if (!user) {
    return { enabled: false, hasToken: false, isLoggedIn: false };
  }

  try {
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        pushToken: true,
        pushNotificationsEnabled: true,
      },
    });

    return {
      enabled: userData?.pushNotificationsEnabled || false,
      hasToken: !!userData?.pushToken,
      isLoggedIn: true,
    };
  } catch (error) {
    console.error("Failed to get push notification status:", error);
    return { enabled: false, hasToken: false, isLoggedIn: true };
  }
}

// Remove invalid push token (called when notification fails)
export async function removeInvalidPushToken(userId: string): Promise<void> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        pushToken: null,
        pushNotificationsEnabled: false,
      },
    });
    console.log("Removed invalid push token for user:", userId);
  } catch (error) {
    console.error("Failed to remove invalid push token:", error);
  }
}

"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type DeviceType = "ios" | "android" | "desktop";
type NotificationAction = "dismiss" | "enable" | "denied";

// Track notification modal interactions
export async function trackNotificationAction(
  action: NotificationAction,
  device: DeviceType,
  userAgent?: string
) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  try {
    await db.notificationAnalytics.create({
      data: {
        userId: user.id,
        action,
        device,
        userAgent,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error tracking notification action:", error);
    return { success: false };
  }
}

// Start a new user session
export async function startSession(device: DeviceType, userAgent?: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, sessionId: null };

  try {
    const session = await db.userSession.create({
      data: {
        userId: user.id,
        device,
        userAgent,
      },
    });
    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Error starting session:", error);
    return { success: false, sessionId: null };
  }
}

// End a user session with duration
export async function endSession(sessionId: string, durationSec: number) {
  try {
    await db.userSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        durationSec,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error ending session:", error);
    return { success: false };
  }
}

// Update session duration (called periodically)
export async function updateSessionDuration(sessionId: string, durationSec: number) {
  try {
    await db.userSession.update({
      where: { id: sessionId },
      data: {
        durationSec,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating session:", error);
    return { success: false };
  }
}

// Admin: Get notification analytics
export async function getNotificationAnalytics() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    // Get dismiss counts per user
    const dismissCounts = await db.notificationAnalytics.groupBy({
      by: ["userId"],
      where: { action: "dismiss" },
      _count: { id: true },
    });

    // Get enable counts by device
    const enablesByDevice = await db.notificationAnalytics.groupBy({
      by: ["device"],
      where: { action: "enable" },
      _count: { id: true },
    });

    // Get total users who enabled notifications
    const totalEnabled = await db.user.count({
      where: { pushNotificationsEnabled: true },
    });

    // Get users with most dismisses
    const userDismissCounts = await Promise.all(
      dismissCounts
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 20)
        .map(async (item) => {
          const userData = await db.user.findUnique({
            where: { id: item.userId },
            select: { id: true, fullName: true, username: true, avatarUrl: true },
          });
          return {
            user: userData,
            dismissCount: item._count.id,
          };
        })
    );

    return {
      success: true,
      data: {
        totalEnabled,
        enablesByDevice: enablesByDevice.map((e) => ({
          device: e.device,
          count: e._count.id,
        })),
        userDismissCounts,
      },
    };
  } catch (error) {
    console.error("Error getting notification analytics:", error);
    return { error: "Failed to fetch analytics" };
  }
}

// Admin: Get session analytics
export async function getSessionAnalytics() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    // Get total time spent per user (sum of all sessions)
    const userSessions = await db.userSession.groupBy({
      by: ["userId"],
      _sum: { durationSec: true },
      _count: { id: true },
    });

    // Get sessions by device
    const sessionsByDevice = await db.userSession.groupBy({
      by: ["device"],
      _count: { id: true },
      _sum: { durationSec: true },
    });

    // Get top users by time spent
    const topUsersByTime = await Promise.all(
      userSessions
        .filter((s) => s._sum.durationSec)
        .sort((a, b) => (b._sum.durationSec || 0) - (a._sum.durationSec || 0))
        .slice(0, 20)
        .map(async (item) => {
          const userData = await db.user.findUnique({
            where: { id: item.userId },
            select: { id: true, fullName: true, username: true, avatarUrl: true },
          });
          return {
            user: userData,
            totalSeconds: item._sum.durationSec || 0,
            sessionCount: item._count.id,
          };
        })
    );

    // Get recent sessions
    const recentSessions = await db.userSession.findMany({
      take: 50,
      orderBy: { startedAt: "desc" },
      include: {
        user: {
          select: { id: true, fullName: true, username: true, avatarUrl: true },
        },
      },
    });

    return {
      success: true,
      data: {
        sessionsByDevice: sessionsByDevice.map((s) => ({
          device: s.device,
          sessionCount: s._count.id,
          totalSeconds: s._sum.durationSec || 0,
        })),
        topUsersByTime,
        recentSessions: recentSessions.map((s) => ({
          id: s.id,
          user: s.user,
          device: s.device,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationSec: s.durationSec,
        })),
      },
    };
  } catch (error) {
    console.error("Error getting session analytics:", error);
    return { error: "Failed to fetch analytics" };
  }
}

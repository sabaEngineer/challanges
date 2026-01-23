"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

/**
 * Notify other challenge members when someone completes their daily check-in
 */
async function notifyChallengeMembersOfCheckin(
  challengeId: string,
  completedByUserId: string,
  completedByName: string,
  challengeTitle: string
) {
  try {
    console.log("Sending checkin notifications for challenge:", challengeId);
    
    // Get all other active members of the challenge
    const otherMembers = await db.challengeMember.findMany({
      where: {
        challengeId,
        status: "active",
        userId: { not: completedByUserId },
      },
      select: { userId: true },
    });

    console.log("Found", otherMembers.length, "other members to notify");

    if (otherMembers.length === 0) return;

    // Create notifications for all other members
    const notifications = otherMembers.map((member) => ({
      userId: member.userId,
      type: "member_checkin" as const,
      title: "🔥 Teammate completed check-in!",
      message: `${completedByName} completed their daily check-in for "${challengeTitle}"`,
      challengeId,
    }));

    await db.notification.createMany({
      data: notifications,
    });
    
    console.log("Successfully created", notifications.length, "notifications");
  } catch (error) {
    console.error("Error sending checkin notifications:", error);
  }
}

interface CheckinItemInput {
  requirementId: string;
  value?: number;
  isDone: boolean;
}

export async function createOrUpdateCheckin(
  challengeId: string,
  date: string,
  items: CheckinItemInput[],
  note?: string,
  imageUrl?: string
): Promise<ActionResult> {
  console.log("createOrUpdateCheckin called with:", { challengeId, date, itemsCount: items.length });
  
  const user = await getCurrentUser();

  if (!user) {
    console.log("No user found");
    return { success: false, error: "Please sign in to check in" };
  }
  
  console.log("User:", user.id);

  // Verify user is an active member
  const membership = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
  });

  if (!membership || membership.status !== "active") {
    return { success: false, error: "You must be an active member to check in" };
  }

  // Verify the challenge exists and date is within range
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { requirements: true },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  // Parse date as UTC for consistent handling in production
  const [year, month, day] = date.split('-').map(Number);
  const checkinDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Compare dates using UTC (handles @db.Date columns properly)
  const start = new Date(challenge.startDate);
  const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  
  const end = new Date(challenge.endDate);
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  // Allow check-in only within challenge dates
  if (checkinDate < startUTC || checkinDate > endUTC) {
    return { success: false, error: `Check-in date must be within challenge dates (${startUTC.toDateString()} - ${endUTC.toDateString()})` };
  }

  // Check if all items are done
  const allDone = items.every((item) => item.isDone);

  try {
    console.log("Creating/updating checkin for date:", checkinDate, "allDone:", allDone);
    
    // Create or update the daily checkin
    const checkin = await db.dailyCheckin.upsert({
      where: {
        challengeId_userId_checkinDate: {
          challengeId,
          userId: user.id,
          checkinDate,
        },
      },
      create: {
        challengeId,
        userId: user.id,
        checkinDate,
        note: note || null,
        imageUrl: imageUrl || null,
        isDone: allDone,
      },
      update: {
        note: note || null,
        imageUrl: imageUrl || null,
        isDone: allDone,
      },
    });
    
    console.log("Checkin created/updated:", checkin.id);

    // Create or update checkin items
    console.log("Creating/updating", items.length, "checkin items");
    for (const item of items) {
      const checkinItem = await db.dailyCheckinItem.upsert({
        where: {
          checkinId_requirementId: {
            checkinId: checkin.id,
            requirementId: item.requirementId,
          },
        },
        create: {
          checkinId: checkin.id,
          requirementId: item.requirementId,
          value: item.value ?? null,
          isDone: item.isDone,
        },
        update: {
          value: item.value ?? null,
          isDone: item.isDone,
        },
      });
      console.log("Item created/updated:", checkinItem.id, "isDone:", checkinItem.isDone);
    }

    // Update streak if all requirements are done for today
    console.log("All requirements done?", allDone);
    if (allDone) {
      console.log("All done! Updating streak and sending notifications...");
      await updateStreak(challengeId, user.id);
      
      // Send notifications to other active members
      await notifyChallengeMembersOfCheckin(challengeId, user.id, user.fullName || user.username || "Someone", challenge.title);
    }

    console.log("Check-in complete! Revalidating paths...");
    revalidatePath(`/challenges/${challengeId}`);
    revalidatePath("/dashboard");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, error: `Failed to save check-in: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function updateStreak(challengeId: string, userId: string) {
  // Get all completed checkins for this user and challenge
  const checkins = await db.dailyCheckin.findMany({
    where: {
      challengeId,
      userId,
      isDone: true,
    },
    orderBy: { checkinDate: "desc" },
    select: { checkinDate: true },
  });

  if (checkins.length === 0) {
    return;
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Sort dates descending
  const sortedDates = checkins
    .map((c) => {
      const d = new Date(c.checkinDate);
      d.setHours(0, 0, 0, 0);
      return d;
    })
    .sort((a, b) => b.getTime() - a.getTime());

  // Check if most recent checkin is today or yesterday
  const mostRecent = sortedDates[0];
  if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
    // Streak is broken
    currentStreak = 0;
  } else {
    // Count consecutive days
    let expectedDate = mostRecent;
    for (const date of sortedDates) {
      if (date.getTime() === expectedDate.getTime()) {
        currentStreak++;
        expectedDate = new Date(expectedDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (date.getTime() < expectedDate.getTime()) {
        // Gap in dates, streak is broken
        break;
      }
    }
  }

  // Get current member record to compare best streak
  const member = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: { challengeId, userId },
    },
    select: { bestStreak: true },
  });

  const newBestStreak = Math.max(member?.bestStreak || 0, currentStreak);

  // Update member streak
  await db.challengeMember.update({
    where: {
      challengeId_userId: { challengeId, userId },
    },
    data: {
      currentStreak,
      bestStreak: newBestStreak,
    },
  });
}

export async function getTodayCheckin(challengeId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Use UTC for consistent date handling in production
  const now = new Date();
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  return db.dailyCheckin.findFirst({
    where: {
      challengeId,
      userId: user.id,
      checkinDate: {
        gte: startOfTodayUTC,
        lte: endOfTodayUTC,
      },
    },
    include: {
      items: {
        include: {
          requirement: true,
        },
      },
    },
  });
}

export async function getCheckinForDate(challengeId: string, date: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Parse date as UTC for consistent handling
  const [year, month, day] = date.split('-').map(Number);
  const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return db.dailyCheckin.findFirst({
    where: {
      challengeId,
      userId: user.id,
      checkinDate: {
        gte: startOfDayUTC,
        lte: endOfDayUTC,
      },
    },
    include: {
      items: {
        include: {
          requirement: true,
        },
      },
    },
  });
}

export async function getMyCheckins(challengeId: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  return db.dailyCheckin.findMany({
    where: {
      challengeId,
      userId: user.id,
    },
    include: {
      items: {
        include: {
          requirement: true,
        },
      },
    },
    orderBy: { checkinDate: "desc" },
  });
}

export async function getMyActiveChallengesForToday() {
  const user = await getCurrentUser();
  if (!user) return [];

  // Use UTC for consistent date handling in production
  const now = new Date();
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Get active challenges where user is a member
  const memberships = await db.challengeMember.findMany({
    where: {
      userId: user.id,
      status: "active",
      challenge: {
        startDate: { lte: endOfTodayUTC },
        endDate: { gte: startOfTodayUTC },
      },
    },
    include: {
      challenge: {
        include: {
          requirements: true,
          dailyCheckins: {
            where: {
              userId: user.id,
              checkinDate: {
                gte: startOfTodayUTC,
                lte: endOfTodayUTC,
              },
            },
            include: {
              items: true,
            },
          },
        },
      },
    },
    orderBy: {
      challenge: { title: "asc" },
    },
  });

  return memberships.map((m) => ({
    ...m.challenge,
    membership: {
      currentStreak: m.currentStreak,
      bestStreak: m.bestStreak,
    },
    todayCheckin: m.challenge.dailyCheckins[0] || null,
  }));
}

export async function getUserCheckins(challengeId: string, userId: string) {
  // Get all check-ins for this user in this challenge
  const checkins = await db.dailyCheckin.findMany({
    where: {
      challengeId,
      userId,
    },
    include: {
      items: {
        include: {
          requirement: true,
        },
      },
    },
    orderBy: { checkinDate: "desc" },
  });

  // Get challenge info
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: {
      requirements: true,
    },
  });

  // Get member info
  const member = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!challenge || !member) {
    return null;
  }

  // Calculate stats
  const totalCheckins = checkins.length;
  const completedCheckins = checkins.filter((c) => c.isDone).length;
  
  // Calculate total days in challenge so far
  const now = new Date();
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const effectiveEnd = now < endDate ? now : endDate;
  const totalDays = Math.max(1, Math.ceil((effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Completion rate
  const completionRate = totalDays > 0 ? Math.round((completedCheckins / totalDays) * 100) : 0;

  return {
    user: member.user,
    membership: {
      currentStreak: member.currentStreak,
      bestStreak: member.bestStreak,
      totalValue: member.totalValue.toString(),
      joinedAt: member.joinedAt,
    },
    challenge: {
      id: challenge.id,
      title: challenge.title,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      requirements: challenge.requirements,
    },
    checkins: checkins.map((c) => ({
      id: c.id,
      checkinDate: c.checkinDate,
      isDone: c.isDone,
      note: c.note,
      imageUrl: c.imageUrl,
      items: c.items.map((item) => ({
        id: item.id,
        requirementId: item.requirementId,
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
    })),
    stats: {
      totalCheckins,
      completedCheckins,
      totalDays,
      completionRate,
    },
  };
}

export async function quickCheckin(
  challengeId: string,
  requirementId: string,
  value?: number
): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Please sign in to check in" };
  }

  // Verify user is an active member
  const membership = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
  });

  if (!membership || membership.status !== "active") {
    return { success: false, error: "You must be an active member to check in" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the requirement to check if value meets target
  const requirement = await db.challengeRequirement.findUnique({
    where: { id: requirementId },
  });

  if (!requirement) {
    return { success: false, error: "Requirement not found" };
  }

  // Determine if done based on type and value
  let isDone = false;
  if (requirement.type === "yes_no") {
    isDone = true;
  } else if (requirement.targetValue && value !== undefined) {
    isDone = value >= Number(requirement.targetValue);
  }

  // Create or get today's checkin
  let checkin = await db.dailyCheckin.findUnique({
    where: {
      challengeId_userId_checkinDate: {
        challengeId,
        userId: user.id,
        checkinDate: today,
      },
    },
  });

  if (!checkin) {
    checkin = await db.dailyCheckin.create({
      data: {
        challengeId,
        userId: user.id,
        checkinDate: today,
        isDone: false,
      },
    });
  }

  // Update or create the item
  await db.dailyCheckinItem.upsert({
    where: {
      checkinId_requirementId: {
        checkinId: checkin.id,
        requirementId,
      },
    },
    create: {
      checkinId: checkin.id,
      requirementId,
      value: value ?? null,
      isDone,
    },
    update: {
      value: value ?? null,
      isDone,
    },
  });

  // Check if all requirements are now done
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { requirements: true },
  });

  if (challenge) {
    const allItems = await db.dailyCheckinItem.findMany({
      where: { checkinId: checkin.id },
    });

    const allDone =
      challenge.requirements.length === allItems.length &&
      allItems.every((item) => item.isDone);

    await db.dailyCheckin.update({
      where: { id: checkin.id },
      data: { isDone: allDone },
    });

    if (allDone) {
      await updateStreak(challengeId, user.id);
    }
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}


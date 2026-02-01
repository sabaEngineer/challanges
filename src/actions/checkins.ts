"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

/**
 * Notify other challenge members when someone completes their daily check-in
 * Note: Push notifications for check-ins are disabled - only in-app notifications
 */
async function notifyChallengeMembersOfCheckin(
  challengeId: string,
  checkinId: string,
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

    // Create in-app notifications only (no push for check-ins)
    const notifications = otherMembers.map((member) => ({
      userId: member.userId,
      type: "member_checkin" as const,
      title: "🔥 Teammate completed check-in!",
      message: `${completedByName} completed their daily check-in for "${challengeTitle}"`,
      challengeId,
      checkinId,
    }));

    await db.notification.createMany({
      data: notifications,
    });
    
    console.log("Successfully created", notifications.length, "in-app notifications");
  } catch (error) {
    console.error("Error sending checkin notifications:", error);
  }
}

interface CheckinItemInput {
  requirementId: string;
  value?: number | string | null; // Allow string for Next.js serialization edge cases
  isDone: boolean;
}

interface MediaItem {
  url: string;
  type: "image" | "video";
}

export async function createOrUpdateCheckin(
  challengeId: string,
  date: string,
  items: CheckinItemInput[],
  note?: string,
  mediaUrls?: MediaItem[],
  sharedToFeed?: boolean
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

  // Parse date string (YYYY-MM-DD) from client - this is the user's local date
  const [year, month, day] = date.split('-').map(Number);
  const checkinDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Get challenge date boundaries
  const start = new Date(challenge.startDate);
  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  
  const end = new Date(challenge.endDate);
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  // Allow check-in within challenge dates (comparing date parts only)
  if (checkinDate < startDay || checkinDate > endDay) {
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { success: false, error: `Check-in date (${formatDate(checkinDate)}) must be within challenge dates (${formatDate(startDay)} - ${formatDate(endDay)})` };
  }

  // Validate and recalculate isDone for each item based on actual values
  const validatedItems = items.map((item) => {
    const requirement = challenge.requirements.find((r) => r.id === item.requirementId);
    if (!requirement) {
      return item;
    }

    // For yes_no type, trust the client's isDone (user explicitly checks the box)
    if (requirement.type === "yes_no") {
      return item;
    }

    // Check if value is missing/invalid
    // Next.js serializes undefined as "$undefined" string
    const hasNoValue = item.value === undefined || 
                       item.value === null || 
                       item.value === "$undefined" ||
                       (typeof item.value === "string" && item.value.trim() === "");
    
    if (hasNoValue) {
      return {
        ...item,
        value: null, // Normalize to null
        isDone: false,
      };
    }

    // Parse the actual numeric value
    const actualValue = Number(item.value);
    
    // If parsing failed (NaN), mark as not done
    if (isNaN(actualValue)) {
      return {
        ...item,
        value: null,
        isDone: false,
      };
    }

    // For types with targetValue, verify that value meets the target
    if (requirement.targetValue) {
      const targetValue = Number(requirement.targetValue);
      const actuallyDone = targetValue > 0 && actualValue >= targetValue;
      
      return {
        ...item,
        value: actualValue,
        isDone: actuallyDone,
      };
    }

    // For types without targetValue but with a value, consider done only if value > 0
    return {
      ...item,
      value: actualValue,
      isDone: actualValue > 0,
    };
  });

  // Check if all items are done (using validated values)
  const allDone = validatedItems.every((item) => item.isDone);

  // Log validation results for debugging (use console.error to ensure visibility)
  console.error("=== CHECKIN DEBUG ===");
  console.error("Validated items:", JSON.stringify(validatedItems.map(item => {
    const req = challenge.requirements.find(r => r.id === item.requirementId);
    return {
      requirementId: item.requirementId,
      type: req?.type,
      targetValue: req?.targetValue?.toString(),
      value: item.value,
      isDone: item.isDone,
    };
  }), null, 2));

  try {
    console.log("Creating/updating checkin for date:", checkinDate, "allDone:", allDone);
    
    // Create or update the daily checkin
    // Store mediaUrls array, and keep first image as imageUrl for backward compatibility
    const firstImageUrl = mediaUrls?.length ? mediaUrls[0].url : null;
    
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
        imageUrl: firstImageUrl,
        mediaUrls: mediaUrls || null,
        isDone: allDone,
        sharedToFeed: sharedToFeed ?? false,
      },
      update: {
        note: note || null,
        imageUrl: firstImageUrl,
        mediaUrls: mediaUrls || null,
        isDone: allDone,
        ...(sharedToFeed !== undefined && { sharedToFeed }),
      },
    });
    
    console.log("Checkin created/updated:", checkin.id);

    // Create or update checkin items (using validated items)
    console.log("Creating/updating", validatedItems.length, "checkin items");
    for (const item of validatedItems) {
      // Ensure value is properly typed for Prisma (number or null)
      const valueToSave = typeof item.value === "number" ? item.value : null;
      
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
          value: valueToSave,
          isDone: item.isDone,
        },
        update: {
          value: valueToSave,
          isDone: item.isDone,
        },
      });
      console.error("Item saved:", checkinItem.id, "| isDone:", checkinItem.isDone, "| value:", valueToSave);
    }

    // Always update streak to ensure it's accurate (handles edits that make check-ins incomplete)
    console.log("All requirements done?", allDone);
    console.log("Updating streak...");
    const newStreak = await updateStreak(challengeId, user.id);
    
    // Send notifications only when completing a check-in (not on edits)
    if (allDone) {
      console.log("All done! Sending notifications...");
      // Send notifications to other active members
      await notifyChallengeMembersOfCheckin(challengeId, checkin.id, user.id, user.fullName || user.username || "Someone", challenge.title);
    }

    console.log("Check-in complete! Revalidating paths...");
    revalidatePath(`/challenges/${challengeId}`);
    revalidatePath("/dashboard");
    revalidatePath("/feed");
    return { success: true, streak: newStreak };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, error: `Failed to save check-in: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function updateStreak(challengeId: string, userId: string): Promise<number> {
  // Get the challenge to check streak mode
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: { streakMode: true },
  });

  const streakMode = challenge?.streakMode || "strict";

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

  console.log(`[updateStreak] Found ${checkins.length} completed check-ins for user ${userId}, streakMode: ${streakMode}`);

  if (checkins.length === 0) {
    // No completed check-ins, reset streak to 0
    await db.challengeMember.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: { currentStreak: 0 },
    });
    return 0;
  }

  // For flexible mode: streak is simply the total count of completed days
  if (streakMode === "flexible") {
    const currentStreak = checkins.length;
    
    // Get current member record to compare best streak
    const member = await db.challengeMember.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      select: { bestStreak: true },
    });

    const newBestStreak = Math.max(member?.bestStreak || 0, currentStreak);

    await db.challengeMember.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: {
        currentStreak,
        bestStreak: newBestStreak,
      },
    });
    
    console.log(`[updateStreak] Flexible mode - streak is total completed: ${currentStreak}`);
    return currentStreak;
  }

  // Strict mode: Calculate current streak with consecutive days logic
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const today = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate()));
  
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Helper to normalize a date to midnight UTC (date only, no time component)
  const normalizeDate = (d: Date): number => {
    // Handle potential timezone issues from Prisma/PostgreSQL
    const date = new Date(d);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };

  // Get unique dates as timestamps, sorted descending (most recent first)
  const uniqueDateTimestamps = [...new Set(checkins.map((c) => normalizeDate(c.checkinDate)))].sort((a, b) => b - a);
  
  console.log(`[updateStreak] Today: ${today.toISOString()}, Yesterday: ${yesterday.toISOString()}`);
  console.log(`[updateStreak] Unique check-in dates: ${uniqueDateTimestamps.map(t => new Date(t).toISOString().split('T')[0]).join(', ')}`);

  const todayTimestamp = today.getTime();
  const yesterdayTimestamp = yesterday.getTime();
  const mostRecentTimestamp = uniqueDateTimestamps[0];

  console.log(`[updateStreak] Most recent check-in: ${new Date(mostRecentTimestamp).toISOString().split('T')[0]}`);

  // Check if most recent checkin is today or yesterday
  let currentStreak = 0;
  if (mostRecentTimestamp !== todayTimestamp && mostRecentTimestamp !== yesterdayTimestamp) {
    // Most recent check-in is older than yesterday - streak is broken
    console.log(`[updateStreak] Streak broken - most recent check-in is not today or yesterday`);
    currentStreak = 0;
  } else {
    // Count consecutive days starting from the most recent
    let expectedTimestamp = mostRecentTimestamp;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    for (const dateTimestamp of uniqueDateTimestamps) {
      if (dateTimestamp === expectedTimestamp) {
        currentStreak++;
        expectedTimestamp = expectedTimestamp - ONE_DAY_MS; // Go back one day
      } else if (dateTimestamp < expectedTimestamp) {
        // There's a gap in dates, streak is broken
        console.log(`[updateStreak] Gap found: expected ${new Date(expectedTimestamp).toISOString().split('T')[0]}, got ${new Date(dateTimestamp).toISOString().split('T')[0]}`);
        break;
      }
      // If dateTimestamp > expectedTimestamp, skip it (shouldn't happen with sorted array)
    }
  }

  console.log(`[updateStreak] Calculated streak: ${currentStreak}`);

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
  
  console.log(`[updateStreak] Updated streak to ${currentStreak}, best: ${newBestStreak}`);
  
  return currentStreak;
}

export async function getTodayCheckin(challengeId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Calculate "today" with timezone offset (UTC+4 for Georgia)
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const startOfToday = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 23, 59, 59, 999));

  return db.dailyCheckin.findFirst({
    where: {
      challengeId,
      userId: user.id,
      checkinDate: {
        gte: startOfToday,
        lte: endOfToday,
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

  // Parse date string to get date components
  const [year, month, day] = date.split('-').map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return db.dailyCheckin.findFirst({
    where: {
      challengeId,
      userId: user.id,
      checkinDate: {
        gte: startOfDay,
        lte: endOfDay,
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

  // Calculate "today" with timezone offset (UTC+4 for Georgia)
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const startOfToday = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate(), 23, 59, 59, 999));

  // Get active challenges where user is a member
  const memberships = await db.challengeMember.findMany({
    where: {
      userId: user.id,
      status: "active",
      challenge: {
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
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
                gte: startOfToday,
                lte: endOfToday,
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

  let newStreak = 0;
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

    // Always update streak to keep it accurate
    newStreak = await updateStreak(challengeId, user.id);
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { success: true, streak: newStreak };
}


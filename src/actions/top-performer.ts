"use server";

import { db } from "@/lib/db";

export interface TopPerformer {
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  checkinCount: number;
  completedCount: number;
  challenges: {
    id: string;
    title: string;
  }[];
  date: Date;
}

export interface TopPerformersResult {
  performers: TopPerformer[];
  isTie: boolean;
  date: Date;
}

export async function getYesterdayTopPerformers(): Promise<TopPerformersResult | null> {
  // Get yesterday's date (midnight to midnight based on checkinDate)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // checkinDate is stored as a Date without time, so we match exactly on that date
  const yesterdayStart = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()));
  const yesterdayEnd = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999));

  console.log("[TopPerformer] Searching for check-ins between:", yesterdayStart.toISOString(), "and", yesterdayEnd.toISOString());

  // Get all check-ins for yesterday based on checkinDate (the actual day of the check-in)
  const checkins = await db.dailyCheckin.findMany({
    where: {
      checkinDate: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      challenge: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  console.log("[TopPerformer] Found", checkins.length, "check-ins for yesterday");

  if (checkins.length === 0) {
    return null;
  }

  // Group by user and count
  const userStats = new Map<string, {
    user: typeof checkins[0]["user"];
    checkinCount: number;
    completedCount: number;
    challenges: Set<string>;
    challengeDetails: Map<string, { id: string; title: string }>;
    score: number;
    earliestCheckin: Date;
  }>();

  checkins.forEach((checkin) => {
    const userId = checkin.userId;
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        user: checkin.user,
        checkinCount: 0,
        completedCount: 0,
        challenges: new Set(),
        challengeDetails: new Map(),
        score: 0,
        earliestCheckin: checkin.createdAt,
      });
    }
    
    const stats = userStats.get(userId)!;
    stats.checkinCount++;
    if (checkin.isDone) {
      stats.completedCount++;
    }
    stats.challenges.add(checkin.challengeId);
    stats.challengeDetails.set(checkin.challengeId, checkin.challenge);
    // Track earliest check-in for tiebreaker
    if (checkin.createdAt < stats.earliestCheckin) {
      stats.earliestCheckin = checkin.createdAt;
    }
  });

  // Calculate scores
  userStats.forEach((stats) => {
    stats.score = stats.completedCount * 2 + stats.checkinCount;
  });

  // Find max score
  let maxScore = -1;
  userStats.forEach((stats) => {
    if (stats.score > maxScore) {
      maxScore = stats.score;
    }
  });

  // Find all users with the max score (ties)
  const topPerformers: TopPerformer[] = [];
  userStats.forEach((stats) => {
    if (stats.score === maxScore) {
      topPerformers.push({
        user: stats.user,
        checkinCount: stats.checkinCount,
        completedCount: stats.completedCount,
        challenges: Array.from(stats.challengeDetails.values()),
        date: yesterday,
      });
    }
  });

  if (topPerformers.length === 0) {
    return null;
  }

  // Sort by: more challenges first, then alphabetically by name
  topPerformers.sort((a, b) => {
    if (b.challenges.length !== a.challenges.length) {
      return b.challenges.length - a.challenges.length;
    }
    return (a.user.fullName || "").localeCompare(b.user.fullName || "");
  });

  return {
    performers: topPerformers,
    isTie: topPerformers.length > 1,
    date: yesterday,
  };
}

// Keep the old function for backward compatibility
export async function getYesterdayTopPerformer(): Promise<TopPerformer | null> {
  const result = await getYesterdayTopPerformers();
  if (!result || result.performers.length === 0) {
    return null;
  }
  return result.performers[0];
}

// Award top performer status and record it (called once per day)
export async function awardTopPerformers(): Promise<boolean> {
  const result = await getYesterdayTopPerformers();
  if (!result || result.performers.length === 0) {
    return false;
  }

  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if awards have already been given for yesterday
  const existingAwards = await db.topPerformerRecord.findFirst({
    where: {
      date: yesterday,
    },
  });

  if (existingAwards) {
    // Awards already given for this day
    return false;
  }

  // Record the awards and increment user counts
  for (const performer of result.performers) {
    // Create record
    await db.topPerformerRecord.create({
      data: {
        date: yesterday,
        userId: performer.user.id,
        checkinCount: performer.checkinCount,
        challengeCount: performer.challenges.length,
        score: performer.completedCount * 2 + performer.checkinCount,
        isTie: result.isTie,
      },
    });

    // Increment user's top performer count
    await db.user.update({
      where: { id: performer.user.id },
      data: {
        topPerformerCount: { increment: 1 },
      },
    });
  }

  return true;
}

// Get user's top performer count
export async function getUserTopPerformerCount(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { topPerformerCount: true },
  });
  return user?.topPerformerCount || 0;
}

// Get user's top performer history
export async function getUserTopPerformerHistory(userId: string) {
  return db.topPerformerRecord.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
  });
}

// Get top performer's check-ins with media for slideshow
export interface CheckinSlide {
  id: string;
  challengeTitle: string;
  challengeId: string;
  note: string | null;
  mediaUrls: { url: string; type: "image" | "video" }[] | null;
  imageUrl: string | null;
  isDone: boolean;
  createdAt: Date;
}

export async function getTopPerformerCheckins(): Promise<{
  performer: TopPerformer;
  checkins: CheckinSlide[];
} | null> {
  const result = await getYesterdayTopPerformers();
  if (!result || result.performers.length === 0) {
    return null;
  }

  const performer = result.performers[0];
  
  // Get yesterday's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()));
  const yesterdayEnd = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999));

  // Get all check-ins for this user from yesterday
  const checkins = await db.dailyCheckin.findMany({
    where: {
      userId: performer.user.id,
      checkinDate: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const slides: CheckinSlide[] = checkins.map((checkin) => ({
    id: checkin.id,
    challengeTitle: checkin.challenge.title,
    challengeId: checkin.challenge.id,
    note: checkin.note,
    mediaUrls: checkin.mediaUrls as { url: string; type: "image" | "video" }[] | null,
    imageUrl: checkin.imageUrl,
    isDone: checkin.isDone,
    createdAt: checkin.createdAt,
  }));

  return {
    performer,
    checkins: slides,
  };
}

// Get top performers for the last N days
export async function getRecentTopPerformers(days: number = 7): Promise<TopPerformer[]> {
  const performers: TopPerformer[] = [];
  
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    
    // Use UTC dates for checkinDate comparison
    const dayStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayEnd = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));

    const checkins = await db.dailyCheckin.findMany({
      where: {
        checkinDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
        challenge: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (checkins.length === 0) continue;

    // Group by user
    const userStats = new Map<string, {
      user: typeof checkins[0]["user"];
      checkinCount: number;
      completedCount: number;
      challengeDetails: Map<string, { id: string; title: string }>;
    }>();

    checkins.forEach((checkin) => {
      const userId = checkin.userId;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user: checkin.user,
          checkinCount: 0,
          completedCount: 0,
          challengeDetails: new Map(),
        });
      }
      
      const stats = userStats.get(userId)!;
      stats.checkinCount++;
      if (checkin.isDone) {
        stats.completedCount++;
      }
      stats.challengeDetails.set(checkin.challengeId, checkin.challenge);
    });

    // Find top performer for this day
    let topPerformer: typeof userStats extends Map<string, infer V> ? V : never = null!;
    let maxScore = -1;

    userStats.forEach((stats) => {
      const score = stats.completedCount * 2 + stats.checkinCount;
      if (score > maxScore) {
        maxScore = score;
        topPerformer = stats;
      }
    });

    if (topPerformer) {
      performers.push({
        user: topPerformer.user,
        checkinCount: topPerformer.checkinCount,
        completedCount: topPerformer.completedCount,
        challenges: Array.from(topPerformer.challengeDetails.values()),
        date,
      });
    }
  }

  return performers;
}

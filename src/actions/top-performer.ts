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

export async function getYesterdayTopPerformer(): Promise<TopPerformer | null> {
  // Get yesterday's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  // Get all check-ins from yesterday grouped by user
  const checkins = await db.dailyCheckin.findMany({
    where: {
      createdAt: {
        gte: yesterday,
        lte: endOfYesterday,
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
      });
    }
    
    const stats = userStats.get(userId)!;
    stats.checkinCount++;
    if (checkin.isDone) {
      stats.completedCount++;
    }
    stats.challenges.add(checkin.challengeId);
    stats.challengeDetails.set(checkin.challengeId, checkin.challenge);
  });

  // Find the top performer (most completed check-ins, then most total check-ins)
  let topPerformer: typeof userStats extends Map<string, infer V> ? V : never = null!;
  let maxScore = -1;

  userStats.forEach((stats) => {
    // Score: completed check-ins * 2 + total check-ins
    const score = stats.completedCount * 2 + stats.checkinCount;
    if (score > maxScore) {
      maxScore = score;
      topPerformer = stats;
    }
  });

  if (!topPerformer) {
    return null;
  }

  return {
    user: topPerformer.user,
    checkinCount: topPerformer.checkinCount,
    completedCount: topPerformer.completedCount,
    challenges: Array.from(topPerformer.challengeDetails.values()),
    date: yesterday,
  };
}

// Get top performers for the last N days
export async function getRecentTopPerformers(days: number = 7): Promise<TopPerformer[]> {
  const performers: TopPerformer[] = [];
  
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const checkins = await db.dailyCheckin.findMany({
      where: {
        createdAt: {
          gte: date,
          lte: endOfDay,
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

"use server";

import { db } from "@/lib/db";
import { POINTS, calculateChallengePoints } from "@/lib/points";

export interface LeaderboardUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  completedChallenges: number;
  totalCheckins: number;
  bestStreak: number;
  rank: number;
}

export async function getLeaderboard(limit: number = 50): Promise<LeaderboardUser[]> {
  const now = new Date();

  // Get all users with their stats
  const users = await db.user.findMany({
    select: {
      id: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      challengeMembers: {
        where: { status: "active" },
        include: {
          challenge: {
            select: {
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      dailyCheckins: {
        where: { isDone: true },
        select: { id: true },
      },
    },
  });

  // Debug logging
  console.log("=== LEADERBOARD DEBUG ===");
  console.log("Total users found:", users.length);
  users.forEach((u) => {
    console.log(`User ${u.fullName || u.username || u.id}: checkins=${u.dailyCheckins.length}, members=${u.challengeMembers.length}`);
  });

  // Calculate points for each user
  const usersWithPoints = users.map((user) => {
    // Count completed challenges (ended challenges where user is active member)
    const completedChallenges = user.challengeMembers.filter(
      (m) => new Date(m.challenge.endDate) < now
    );

    // Calculate challenge points
    let challengePoints = 0;
    completedChallenges.forEach((m) => {
      challengePoints += calculateChallengePoints(
        m.challenge.startDate,
        m.challenge.endDate
      );
    });

    // Calculate check-in points
    const checkinPoints = user.dailyCheckins.length * POINTS.DAILY_CHECKIN;

    // Get best streak
    const bestStreak = user.challengeMembers.reduce(
      (max, m) => Math.max(max, m.bestStreak),
      0
    );

    const totalPoints = challengePoints + checkinPoints;

    console.log(`User ${user.fullName}: checkinPoints=${checkinPoints}, challengePoints=${challengePoints}, totalPoints=${totalPoints}`);

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      totalPoints,
      completedChallenges: completedChallenges.length,
      totalCheckins: user.dailyCheckins.length,
      bestStreak,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by total points descending
  usersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign ranks and filter out users with 0 points
  let rank = 1;
  const rankedUsers = usersWithPoints
    .filter((u) => u.totalPoints > 0)
    .map((user, index, arr) => {
      // Handle ties - same points = same rank
      if (index > 0 && user.totalPoints === arr[index - 1].totalPoints) {
        return { ...user, rank: arr[index - 1].rank };
      }
      const currentRank = rank;
      rank++;
      return { ...user, rank: currentRank };
    })
    .slice(0, limit);

  console.log("Ranked users count:", rankedUsers.length);
  console.log("=========================");

  return rankedUsers;
}

export async function getUserRank(userId: string): Promise<{
  rank: number;
  totalPoints: number;
  totalUsers: number;
} | null> {
  const leaderboard = await getLeaderboard(1000); // Get more users for accurate ranking
  const userEntry = leaderboard.find((u) => u.id === userId);
  
  if (!userEntry) {
    return null;
  }

  return {
    rank: userEntry.rank,
    totalPoints: userEntry.totalPoints,
    totalUsers: leaderboard.length,
  };
}

export async function getUserPoints(userId: string): Promise<{
  totalPoints: number;
  checkinPoints: number;
  challengePoints: number;
  completedChallenges: number;
  totalCheckins: number;
  bestStreak: number;
}> {
  const now = new Date();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      challengeMembers: {
        where: { status: "active" },
        include: {
          challenge: {
            select: {
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      dailyCheckins: {
        where: { isDone: true },
        select: { id: true },
      },
    },
  });

  if (!user) {
    return {
      totalPoints: 0,
      checkinPoints: 0,
      challengePoints: 0,
      completedChallenges: 0,
      totalCheckins: 0,
      bestStreak: 0,
    };
  }

  const completedChallenges = user.challengeMembers.filter(
    (m) => new Date(m.challenge.endDate) < now
  );

  let challengePoints = 0;
  completedChallenges.forEach((m) => {
    challengePoints += calculateChallengePoints(
      m.challenge.startDate,
      m.challenge.endDate
    );
  });

  const checkinPoints = user.dailyCheckins.length * POINTS.DAILY_CHECKIN;
  const bestStreak = user.challengeMembers.reduce(
    (max, m) => Math.max(max, m.bestStreak),
    0
  );

  return {
    totalPoints: challengePoints + checkinPoints,
    checkinPoints,
    challengePoints,
    completedChallenges: completedChallenges.length,
    totalCheckins: user.dailyCheckins.length,
    bestStreak,
  };
}


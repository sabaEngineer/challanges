"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getMultiplePostReactions, type ReactionType } from "./reactions";
import { getMultipleCommentCounts } from "./comments";

// Helper to get completed challenges count for multiple users
async function getUsersCompletedChallenges(userIds: string[]): Promise<Record<string, number>> {
  const now = new Date();
  const uniqueUserIds = [...new Set(userIds)];
  
  const counts = await db.challengeMember.groupBy({
    by: ["userId"],
    where: {
      userId: { in: uniqueUserIds },
      status: "active",
      challenge: { endDate: { lt: now } },
    },
    _count: { id: true },
  });

  const result: Record<string, number> = {};
  uniqueUserIds.forEach((id) => {
    result[id] = 0;
  });
  counts.forEach((c) => {
    result[c.userId] = c._count.id;
  });

  return result;
}

export async function getFeedPosts(limit: number = 20, offset: number = 0) {
  const user = await getCurrentUser();

  // Get recent check-ins with user and challenge info
  const checkins = await db.dailyCheckin.findMany({
    where: {
      isDone: true, // Only show completed check-ins
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
          imageUrl: true,
        },
      },
      items: {
        include: {
          requirement: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  // Get reactions, comment counts, and user badges for all checkins
  const checkinIds = checkins.map((c) => c.id);
  const userIds = checkins.map((c) => c.userId);
  
  const [reactionsMap, commentCounts, userCompletedChallenges] = checkinIds.length > 0 
    ? await Promise.all([
        getMultiplePostReactions(checkinIds),
        getMultipleCommentCounts(checkinIds),
        getUsersCompletedChallenges(userIds),
      ])
    : [{}, {}, {}];

  return checkins.map((checkin) => ({
    id: checkin.id,
    user: {
      ...checkin.user,
      completedChallenges: userCompletedChallenges[checkin.userId] || 0,
    },
    challenge: checkin.challenge,
    checkinDate: checkin.checkinDate,
    note: checkin.note,
    imageUrl: checkin.imageUrl,
    createdAt: checkin.createdAt,
    items: checkin.items.map((item) => ({
      id: item.id,
      value: item.value ? Number(item.value) : null,
      isDone: item.isDone,
      requirement: {
        id: item.requirement.id,
        title: item.requirement.title,
        type: item.requirement.type,
        targetValue: item.requirement.targetValue ? Number(item.requirement.targetValue) : null,
        unit: item.requirement.unit,
      },
    })),
    isOwnPost: user?.id === checkin.userId,
    reactions: reactionsMap[checkin.id] || {
      counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0 } as Record<ReactionType, number>,
      userReacted: [] as ReactionType[],
    },
    commentCount: commentCounts[checkin.id] || 0,
  }));
}

export async function getMyFeedPosts(limit: number = 20) {
  const user = await getCurrentUser();
  if (!user) return [];

  const checkins = await db.dailyCheckin.findMany({
    where: {
      userId: user.id,
      isDone: true,
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
          imageUrl: true,
        },
      },
      items: {
        include: {
          requirement: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return checkins.map((checkin) => ({
    id: checkin.id,
    user: checkin.user,
    challenge: checkin.challenge,
    checkinDate: checkin.checkinDate,
    note: checkin.note,
    imageUrl: checkin.imageUrl,
    createdAt: checkin.createdAt,
    items: checkin.items.map((item) => ({
      id: item.id,
      value: item.value ? Number(item.value) : null,
      isDone: item.isDone,
      requirement: {
        id: item.requirement.id,
        title: item.requirement.title,
        type: item.requirement.type,
        targetValue: item.requirement.targetValue ? Number(item.requirement.targetValue) : null,
        unit: item.requirement.unit,
      },
    })),
    isOwnPost: true,
  }));
}

export async function getChallengeFeed(challengeId: string, limit: number = 20) {
  const user = await getCurrentUser();

  const checkins = await db.dailyCheckin.findMany({
    where: {
      challengeId,
      isDone: true,
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
          imageUrl: true,
        },
      },
      items: {
        include: {
          requirement: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return checkins.map((checkin) => ({
    id: checkin.id,
    user: checkin.user,
    challenge: checkin.challenge,
    checkinDate: checkin.checkinDate,
    note: checkin.note,
    imageUrl: checkin.imageUrl,
    createdAt: checkin.createdAt,
    items: checkin.items.map((item) => ({
      id: item.id,
      value: item.value ? Number(item.value) : null,
      isDone: item.isDone,
      requirement: {
        id: item.requirement.id,
        title: item.requirement.title,
        type: item.requirement.type,
        targetValue: item.requirement.targetValue ? Number(item.requirement.targetValue) : null,
        unit: item.requirement.unit,
      },
    })),
    isOwnPost: user?.id === checkin.userId,
  }));
}


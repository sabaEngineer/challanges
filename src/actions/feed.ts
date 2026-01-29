"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getMultiplePostReactions, type ReactionType, type ReactionWithUsers, type ReactionUser } from "./reactions";
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

// Get recent new challenges for the feed
export async function getNewChallengesForFeed(limit: number = 10) {
  const user = await getCurrentUser();
  
  // Get challenges created in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const challenges = await db.challenge.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      creator: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      requirements: true,
      _count: {
        select: {
          members: { where: { status: "active" } },
          comments: true,
        },
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return challenges.map((challenge) => {
    // Build reaction data
    const reactionCounts: Record<string, number> = { fire: 0, strong: 0, kudos: 0, not_bad: 0 };
    const reactors: Record<string, ReactionUser[]> = { fire: [], strong: [], kudos: [], not_bad: [] };
    const userReacted: string[] = [];

    challenge.reactions.forEach((r) => {
      reactionCounts[r.type]++;
      reactors[r.type].push(r.user);
      if (user && r.userId === user.id && !userReacted.includes(r.type)) {
        userReacted.push(r.type);
      }
    });

    return {
      type: "new_challenge" as const,
      id: `challenge_${challenge.id}`,
      challengeId: challenge.id,
      title: challenge.title,
      description: challenge.description,
      imageUrl: challenge.imageUrl,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      createdAt: challenge.createdAt,
      creator: challenge.creator,
      memberCount: challenge._count.members,
      commentCount: challenge._count.comments,
      requirements: challenge.requirements.map((r) => ({
        title: r.title,
        type: r.type,
        targetValue: r.targetValue ? Number(r.targetValue) : null,
        unit: r.unit,
      })),
      isOwnChallenge: user?.id === challenge.createdBy,
      reactions: {
        counts: reactionCounts as Record<ReactionType, number>,
        userReacted: userReacted as ReactionType[],
        reactors: reactors as Record<ReactionType, ReactionUser[]>,
      },
    };
  });
}

export async function getFeedPosts(limit: number = 20, offset: number = 0) {
  const user = await getCurrentUser();

  // Get recent check-ins with user and challenge info
  // Fetch more to allow for sorting, then slice
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
    take: limit + offset + 50, // Fetch extra for better sorting
  });

  // Sort to prioritize posts with content (image or note), but keep time order within same day
  // This ensures recent posts with content aren't buried by older posts
  const sortedCheckins = checkins.sort((a, b) => {
    // First, group by day (most recent day first)
    const dayA = new Date(a.createdAt).toDateString();
    const dayB = new Date(b.createdAt).toDateString();
    
    if (dayA !== dayB) {
      // Different days: newer day first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    // Same day: check if post has any content (image OR note)
    const hasContentA = a.imageUrl || a.note ? 1 : 0;
    const hasContentB = b.imageUrl || b.note ? 1 : 0;
    
    if (hasContentA !== hasContentB) {
      // Posts with content shown before posts without
      return hasContentB - hasContentA;
    }
    
    // Same content tier on same day: sort by time desc (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(offset, offset + limit);

  // Get reactions, comment counts, and user badges for all checkins
  const checkinIds = sortedCheckins.map((c) => c.id);
  const userIds = sortedCheckins.map((c) => c.userId);
  
  const [reactionsMap, commentCounts, userCompletedChallenges] = checkinIds.length > 0 
    ? await Promise.all([
        getMultiplePostReactions(checkinIds),
        getMultipleCommentCounts(checkinIds),
        getUsersCompletedChallenges(userIds),
      ])
    : [{} as Record<string, ReactionWithUsers>, {} as Record<string, number>, {} as Record<string, number>];

  return sortedCheckins.map((checkin) => ({
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
      reactors: { fire: [], strong: [], kudos: [], not_bad: [] } as Record<ReactionType, ReactionUser[]>,
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

export async function getSinglePost(postId: string) {
  const user = await getCurrentUser();

  const checkin = await db.dailyCheckin.findUnique({
    where: { id: postId },
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
  });

  if (!checkin) return null;

  // Get reactions and comment count
  const [reactionsData, commentCount, completedChallenges] = await Promise.all([
    getMultiplePostReactions([checkin.id]),
    getMultipleCommentCounts([checkin.id]),
    getUsersCompletedChallenges([checkin.userId]),
  ]);

  const reactions = reactionsData[checkin.id] || {
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0 } as Record<ReactionType, number>,
    userReacted: [] as ReactionType[],
    reactors: { fire: [], strong: [], kudos: [], not_bad: [] } as Record<ReactionType, ReactionUser[]>,
  };

  return {
    id: checkin.id,
    user: {
      ...checkin.user,
      completedChallenges: completedChallenges[checkin.userId] || 0,
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
    reactions,
    commentCount: commentCount[checkin.id] || 0,
  };
}


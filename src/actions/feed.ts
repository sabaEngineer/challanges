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
    const reactionCounts: Record<string, number> = { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 };
    const reactors: Record<string, ReactionUser[]> = { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] };
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
      imagePosition: challenge.imagePosition,
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
  // Only show check-ins that user chose to share to feed
  const checkins = await db.dailyCheckin.findMany({
    where: {
      // Show check-ins that are shared to feed
      sharedToFeed: true,
      items: { some: {} },
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
    skip: offset,
    take: limit,
  });

  // All posts now have content, just use them directly
  const sortedCheckins = checkins;

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
    mediaUrls: checkin.mediaUrls as { url: string; type: "image" | "video" }[] | null,
    linkUrl: checkin.linkUrl,
    createdAt: checkin.createdAt,
    isDone: checkin.isDone, // Whether all requirements are completed
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
      counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 } as Record<ReactionType, number>,
      userReacted: [] as ReactionType[],
      reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] } as Record<ReactionType, ReactionUser[]>,
    },
    commentCount: commentCounts[checkin.id] || 0,
  }));
}

// Get feed posts grouped by user + date (for swipeable card stacks)
export async function getGroupedFeedPosts(limit: number = 20, offset: number = 0) {
  const user = await getCurrentUser();

  // Include both complete and partial check-ins
  const checkins = await db.dailyCheckin.findMany({
    where: {
      // Show check-ins that have at least one item recorded
      items: { some: {} },
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
    take: 200, // Fetch more to group properly
  });

  // Group check-ins by user + checkinDate
  const groupedMap = new Map<string, typeof checkins>();

  checkins.forEach((checkin) => {
    const dateKey = new Date(checkin.checkinDate).toISOString().split('T')[0];
    const groupKey = `${checkin.userId}_${dateKey}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, []);
    }
    groupedMap.get(groupKey)!.push(checkin);
  });

  // Helper to check if URL is a video
  const isVideo = (url: string | null) => {
    if (!url) return false;
    return url.includes("/videos/") || 
           url.toLowerCase().includes(".mp4") || 
           url.toLowerCase().includes(".webm") || 
           url.toLowerCase().includes(".mov");
  };

  // Helper to get content priority (lower = higher priority)
  const getContentPriority = (checkin: typeof checkins[0]) => {
    if (isVideo(checkin.imageUrl)) return 1; // Video first
    if (checkin.imageUrl) return 2; // Image second
    if (checkin.note) return 3; // Caption third
    return 4; // Others last
  };

  // Convert to array and sort by most recent checkin in each group
  const groupedArray = Array.from(groupedMap.entries()).map(([key, groupCheckins]) => {
    // Sort checkins within group by content priority, then by createdAt desc
    groupCheckins.sort((a, b) => {
      const priorityA = getContentPriority(a);
      const priorityB = getContentPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower priority number = shown first
      }
      
      // Same priority: sort by time desc (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    const mostRecent = groupCheckins[0];
    return {
      key,
      checkins: groupCheckins,
      mostRecentTime: new Date(mostRecent.createdAt).getTime(),
      hasContent: groupCheckins.some(c => c.imageUrl || c.note),
      user: mostRecent.user,
      checkinDate: mostRecent.checkinDate,
    };
  });

  // Sort groups: by most recent time, prioritize those with content
  groupedArray.sort((a, b) => {
    const dayA = new Date(a.checkinDate).toDateString();
    const dayB = new Date(b.checkinDate).toDateString();

    if (dayA !== dayB) {
      return b.mostRecentTime - a.mostRecentTime;
    }

    if (a.hasContent !== b.hasContent) {
      return a.hasContent ? -1 : 1;
    }

    return b.mostRecentTime - a.mostRecentTime;
  });

  // Paginate
  const paginatedGroups = groupedArray.slice(offset, offset + limit);

  // Get all checkin IDs for reactions and comments
  const allCheckinIds = paginatedGroups.flatMap(g => g.checkins.map(c => c.id));
  const allUserIds = paginatedGroups.map(g => g.user.id);

  const [reactionsMap, commentCounts, userCompletedChallenges] = allCheckinIds.length > 0
    ? await Promise.all([
        getMultiplePostReactions(allCheckinIds),
        getMultipleCommentCounts(allCheckinIds),
        getUsersCompletedChallenges(allUserIds),
      ])
    : [{} as Record<string, ReactionWithUsers>, {} as Record<string, number>, {} as Record<string, number>];

  return paginatedGroups.map((group) => ({
    groupKey: group.key,
    user: {
      ...group.user,
      completedChallenges: userCompletedChallenges[group.user.id] || 0,
    },
    checkinDate: group.checkinDate,
    isOwnPost: user?.id === group.user.id,
    checkins: group.checkins.map((checkin) => ({
      id: checkin.id,
      challenge: checkin.challenge,
      note: checkin.note,
      imageUrl: checkin.imageUrl,
      createdAt: checkin.createdAt,
      isDone: checkin.isDone, // Whether all requirements are completed
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
      reactions: reactionsMap[checkin.id] || {
        counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 } as Record<ReactionType, number>,
        userReacted: [] as ReactionType[],
        reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] } as Record<ReactionType, ReactionUser[]>,
      },
      commentCount: commentCounts[checkin.id] || 0,
    })),
  }));
}

export async function getMyFeedPosts(limit: number = 20) {
  const user = await getCurrentUser();
  if (!user) return [];

  // Include both complete and partial check-ins
  const checkins = await db.dailyCheckin.findMany({
    where: {
      userId: user.id,
      items: { some: {} },
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
    isDone: checkin.isDone,
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

  // Include both complete and partial check-ins
  const checkins = await db.dailyCheckin.findMany({
    where: {
      challengeId,
      items: { some: {} },
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
    isDone: checkin.isDone,
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
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 } as Record<ReactionType, number>,
    userReacted: [] as ReactionType[],
    reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] } as Record<ReactionType, ReactionUser[]>,
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
    mediaUrls: checkin.mediaUrls as { url: string; type: "image" | "video" }[] | null,
    linkUrl: checkin.linkUrl,
    createdAt: checkin.createdAt,
    isDone: checkin.isDone,
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

export async function resolveStravaAppLink(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("strava.app.link")) return null;

    const res = await fetch(url, { redirect: "manual" });
    const location = res.headers.get("location");
    if (location && location.includes("strava.com/activities/")) {
      return location;
    }

    // Some redirects go through multiple hops; try following one more
    if (location) {
      const res2 = await fetch(location, { redirect: "manual" });
      const location2 = res2.headers.get("location");
      if (location2 && location2.includes("strava.com/activities/")) {
        return location2;
      }
    }

    return null;
  } catch {
    return null;
  }
}

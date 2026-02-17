"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

export type ReactionType = "fire" | "strong" | "kudos" | "not_bad" | "heart" | "smile";

const REACTION_EMOJIS: Record<ReactionType, string> = {
  fire: "🔥",
  heart: "❤️",
  strong: "💪",
  kudos: "👏",
  not_bad: "😂",
  smile: "😊",
};

// ============ CHALLENGE REACTIONS ============

export async function toggleChallengeReaction(challengeId: string, type: ReactionType) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to react" };
  }

  try {
    // Check if user already has ANY reaction on this challenge
    const existingReactions = await db.challengeReaction.findMany({
      where: {
        challengeId,
        userId: user.id,
      },
    });

    const sameTypeReaction = existingReactions.find((r) => r.type === type);

    if (sameTypeReaction) {
      // User clicked the same reaction - remove it
      await db.challengeReaction.delete({
        where: { id: sameTypeReaction.id },
      });
    } else {
      // User wants a different reaction
      // First, remove any existing reactions
      if (existingReactions.length > 0) {
        await db.challengeReaction.deleteMany({
          where: {
            challengeId,
            userId: user.id,
          },
        });
      }
      // Then add the new reaction
      await db.challengeReaction.create({
        data: {
          challengeId,
          userId: user.id,
          type,
        },
      });

      // Send notification to challenge creator (if it's not the same user)
      try {
        const challenge = await db.challenge.findUnique({
          where: { id: challengeId },
          select: { createdBy: true, title: true },
        });

        if (challenge && challenge.createdBy !== user.id) {
          const reactorName = user.username ? `@${user.username}` : user.fullName || "Someone";
          const emoji = REACTION_EMOJIS[type] || type;
          await createNotification({
            userId: challenge.createdBy,
            type: "new_reaction",
            title: `${emoji} New Reaction`,
            message: `${reactorName} reacted ${emoji} to your challenge "${challenge.title}"`,
            challengeId,
          });
        }
      } catch (notifError) {
        console.error("Failed to send challenge reaction notification:", notifError);
      }
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error toggling challenge reaction:", error);
    return { error: "Failed to update reaction" };
  }
}

export interface ReactionUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface ReactionWithUsers {
  counts: Record<ReactionType, number>;
  userReacted: ReactionType[];
  reactors: Record<ReactionType, ReactionUser[]>;
}

export async function getChallengeReactions(challengeId: string) {
  const user = await getCurrentUser();

  const reactions = await db.challengeReaction.findMany({
    where: { challengeId },
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
  });

  const result: ReactionWithUsers = {
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 },
    userReacted: [],
    reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] },
  };

  reactions.forEach((r) => {
    const type = r.type as ReactionType;
    result.counts[type]++;
    result.reactors[type].push(r.user);
    
    if (user && r.user.id === user.id) {
      if (!result.userReacted.includes(type)) {
        result.userReacted.push(type);
      }
    }
  });

  return result;
}

export async function getMultipleChallengeReactions(challengeIds: string[]) {
  const user = await getCurrentUser();

  const allReactions = await db.challengeReaction.findMany({
    where: { challengeId: { in: challengeIds } },
    select: {
      challengeId: true,
      type: true,
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  const result: Record<string, ReactionWithUsers> = {};

  challengeIds.forEach((id) => {
    result[id] = {
      counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 },
      userReacted: [],
      reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] },
    };
  });

  allReactions.forEach((r) => {
    const type = r.type as ReactionType;
    if (result[r.challengeId]) {
      result[r.challengeId].counts[type]++;
      result[r.challengeId].reactors[type].push(r.user);
      
      if (user && r.user.id === user.id) {
        if (!result[r.challengeId].userReacted.includes(type)) {
          result[r.challengeId].userReacted.push(type);
        }
      }
    }
  });

  return result;
}

// ============ CHALLENGE COMMENTS ============

export async function createChallengeComment(challengeId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to comment" };
  }

  if (!content.trim()) {
    return { error: "Comment cannot be empty" };
  }

  try {
    // Get the challenge with its creator info
    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });

    if (!challenge) {
      return { error: "Challenge not found" };
    }

    const comment = await db.challengeComment.create({
      data: {
        challengeId,
        userId: user.id,
        content: content.trim(),
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
      },
    });

    // Get all users who have commented on this challenge (except current user)
    const existingCommenters = await db.challengeComment.findMany({
      where: {
        challengeId,
        userId: { not: user.id },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const commenterName = user.username ? `@${user.username}` : user.fullName || "Someone";
    const creatorName = challenge.creator.username ? `@${challenge.creator.username}` : challenge.creator.fullName || "Someone";

    const usersToNotify = new Set<string>();

    // 1. Notify the challenge creator if it's not the commenter
    if (challenge.createdBy !== user.id) {
      usersToNotify.add(challenge.createdBy);
    }

    // 2. Notify other commenters (excluding creator who was already added, and current user)
    existingCommenters.forEach((commenter) => {
      if (commenter.userId !== challenge.createdBy) {
        usersToNotify.add(commenter.userId);
      }
    });

    // Send notifications
    const notificationPromises = [];

    // Notification to challenge creator
    if (usersToNotify.has(challenge.createdBy)) {
      notificationPromises.push(
        createNotification({
          userId: challenge.createdBy,
          type: "new_comment",
          title: "New Comment on Challenge",
          message: `${commenterName} commented on your challenge "${challenge.title}": "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          challengeId: challenge.id,
        })
      );
      usersToNotify.delete(challenge.createdBy);
    }

    // Notifications to other commenters
    for (const userId of usersToNotify) {
      notificationPromises.push(
        createNotification({
          userId,
          type: "comment_reply",
          title: "New Reply on Challenge",
          message: `${commenterName} also commented on ${creatorName}'s challenge "${challenge.title}": "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          challengeId: challenge.id,
        })
      );
    }

    await Promise.all(notificationPromises);

    revalidatePath("/feed");
    return { 
      success: true, 
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: comment.user,
        isOwn: true,
        likeCount: 0,
        isLiked: false,
      }
    };
  } catch (error) {
    console.error("Error creating challenge comment:", error);
    return { error: "Failed to add comment" };
  }
}

export async function deleteChallengeComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in" };
  }

  try {
    const comment = await db.challengeComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return { error: "Comment not found" };
    }

    if (comment.userId !== user.id) {
      return { error: "You can only delete your own comments" };
    }

    await db.challengeComment.delete({
      where: { id: commentId },
    });

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error deleting challenge comment:", error);
    return { error: "Failed to delete comment" };
  }
}

export async function getChallengeComments(challengeId: string) {
  const user = await getCurrentUser();

  const comments = await db.challengeComment.findMany({
    where: { challengeId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      likes: {
        select: {
          userId: true,
        },
      },
      _count: {
        select: {
          likes: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    user: comment.user,
    isOwn: user?.id === comment.userId,
    likeCount: comment._count.likes,
    isLiked: user ? comment.likes.some((like) => like.userId === user.id) : false,
  }));
}

export async function getMultipleChallengeCommentCounts(challengeIds: string[]) {
  const counts = await db.challengeComment.groupBy({
    by: ["challengeId"],
    where: { challengeId: { in: challengeIds } },
    _count: { id: true },
  });

  const result: Record<string, number> = {};
  challengeIds.forEach((id) => {
    result[id] = 0;
  });

  counts.forEach((c) => {
    result[c.challengeId] = c._count.id;
  });

  return result;
}

export async function toggleChallengeCommentLike(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to like comments" };
  }

  try {
    const existingLike = await db.challengeCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      await db.challengeCommentLike.delete({
        where: { id: existingLike.id },
      });
      revalidatePath("/feed");
      return { success: true, liked: false };
    } else {
      await db.challengeCommentLike.create({
        data: {
          commentId,
          userId: user.id,
        },
      });

      // Notify the comment owner
      try {
        const comment = await db.challengeComment.findUnique({
          where: { id: commentId },
          select: {
            userId: true,
            content: true,
            challengeId: true,
          },
        });

        if (comment && comment.userId !== user.id) {
          const likerName = user.username ? `@${user.username}` : user.fullName || "Someone";
          await createNotification({
            userId: comment.userId,
            type: "new_reaction",
            title: "❤️ Comment Liked",
            message: `${likerName} liked your comment: "${comment.content.slice(0, 50)}${comment.content.length > 50 ? "..." : ""}"`,
            challengeId: comment.challengeId,
          });
        }
      } catch (notifError) {
        console.error("Failed to send challenge comment like notification:", notifError);
      }

      revalidatePath("/feed");
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Error toggling challenge comment like:", error);
    return { error: "Failed to update like" };
  }
}

"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

export async function createComment(checkinId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to comment" };
  }

  if (!content.trim()) {
    return { error: "Comment cannot be empty" };
  }

  try {
    // Get the checkin with its owner and challenge info
    const checkin = await db.dailyCheckin.findUnique({
      where: { id: checkinId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
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

    if (!checkin) {
      return { error: "Post not found" };
    }

    const comment = await db.postComment.create({
      data: {
        checkinId,
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

    // Get all users who have commented on this post (except current user)
    const existingCommenters = await db.postComment.findMany({
      where: {
        checkinId,
        userId: { not: user.id },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    const commenterName = user.username ? `@${user.username}` : user.fullName || "Someone";
    const postOwnerName = checkin.user.username ? `@${checkin.user.username}` : checkin.user.fullName || "Someone";
    
    // Collect unique user IDs to notify (excluding current user)
    const usersToNotify = new Set<string>();

    // 1. Notify the post owner if it's not the commenter
    if (checkin.userId !== user.id) {
      usersToNotify.add(checkin.userId);
    }

    // 2. Notify other commenters (excluding post owner who was already added, and current user)
    existingCommenters.forEach((commenter) => {
      if (commenter.userId !== checkin.userId) {
        usersToNotify.add(commenter.userId);
      }
    });

    // Send notifications
    const notifications = [];

    // Notification to post owner
    if (usersToNotify.has(checkin.userId)) {
      notifications.push(
        createNotification({
          userId: checkin.userId,
          type: "new_comment",
          title: "New Comment",
          message: `${commenterName} commented on your check-in: "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          challengeId: checkin.challenge.id,
          checkinId: checkin.id,
        })
      );
      usersToNotify.delete(checkin.userId);
    }

    // Notifications to other commenters
    for (const userId of usersToNotify) {
      notifications.push(
        createNotification({
          userId,
          type: "comment_reply",
          title: "New Reply",
          message: `${commenterName} also commented on ${postOwnerName}'s check-in: "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          challengeId: checkin.challenge.id,
          checkinId: checkin.id,
        })
      );
    }

    // Execute all notifications in parallel
    await Promise.all(notifications);

    revalidatePath("/feed");
    return { 
      success: true, 
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: comment.user,
        isOwn: true,
      }
    };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { error: "Failed to add comment" };
  }
}

export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in" };
  }

  try {
    const comment = await db.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return { error: "Comment not found" };
    }

    if (comment.userId !== user.id) {
      return { error: "You can only delete your own comments" };
    }

    await db.postComment.delete({
      where: { id: commentId },
    });

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { error: "Failed to delete comment" };
  }
}

export async function getPostComments(checkinId: string) {
  const user = await getCurrentUser();

  const comments = await db.postComment.findMany({
    where: { checkinId },
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

export async function getMultiplePostComments(checkinIds: string[]) {
  const user = await getCurrentUser();

  const comments = await db.postComment.findMany({
    where: { checkinId: { in: checkinIds } },
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

  const formattedComments = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    checkinId: comment.checkinId,
    user: comment.user,
    isOwn: user?.id === comment.userId,
    likeCount: comment._count.likes,
    isLiked: user ? comment.likes.some((like) => like.userId === user.id) : false,
  }));

  const result: Record<string, typeof formattedComments> = {};
  checkinIds.forEach((id) => {
    result[id] = [];
  });

  formattedComments.forEach((comment) => {
    if (result[comment.checkinId]) {
      result[comment.checkinId].push(comment);
    }
  });

  return result;
}

export async function getCommentCount(checkinId: string) {
  return db.postComment.count({ where: { checkinId } });
}

export async function getMultipleCommentCounts(checkinIds: string[]) {
  const counts = await db.postComment.groupBy({
    by: ["checkinId"],
    where: { checkinId: { in: checkinIds } },
    _count: { id: true },
  });

  const result: Record<string, number> = {};
  checkinIds.forEach((id) => {
    result[id] = 0;
  });

  counts.forEach((c) => {
    result[c.checkinId] = c._count.id;
  });

  return result;
}

export async function toggleCommentLike(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to like comments" };
  }

  try {
    // Check if already liked
    const existingLike = await db.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await db.commentLike.delete({
        where: { id: existingLike.id },
      });
      revalidatePath("/feed");
      return { success: true, liked: false };
    } else {
      // Like
      await db.commentLike.create({
        data: {
          commentId,
          userId: user.id,
        },
      });
      revalidatePath("/feed");
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Error toggling comment like:", error);
    return { error: "Failed to update like" };
  }
}


"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createComment(checkinId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to comment" };
  }

  if (!content.trim()) {
    return { error: "Comment cannot be empty" };
  }

  try {
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
    },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    user: comment.user,
    isOwn: user?.id === comment.userId,
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
    },
    orderBy: { createdAt: "asc" },
  });

  const result: Record<string, typeof formattedComments> = {};
  checkinIds.forEach((id) => {
    result[id] = [];
  });

  const formattedComments = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    checkinId: comment.checkinId,
    user: comment.user,
    isOwn: user?.id === comment.userId,
  }));

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


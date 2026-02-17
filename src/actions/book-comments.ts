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

// ============ BOOK REACTIONS ============

export async function toggleBookReaction(bookId: string, type: ReactionType) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to react" };
  }

  try {
    const existingReactions = await db.bookReaction.findMany({
      where: {
        bookId,
        userId: user.id,
      },
    });

    const sameTypeReaction = existingReactions.find((r) => r.type === type);

    if (sameTypeReaction) {
      await db.bookReaction.delete({
        where: { id: sameTypeReaction.id },
      });
    } else {
      if (existingReactions.length > 0) {
        await db.bookReaction.deleteMany({
          where: {
            bookId,
            userId: user.id,
          },
        });
      }
      await db.bookReaction.create({
        data: {
          bookId,
          userId: user.id,
          type,
        },
      });

      // Send notification to book owner (if not self)
      try {
        const book = await db.book.findUnique({
          where: { id: bookId },
          select: { userId: true, title: true },
        });

        if (book && book.userId !== user.id) {
          const reactorName = user.username ? `@${user.username}` : user.fullName || "Someone";
          const emoji = REACTION_EMOJIS[type] || type;
          await createNotification({
            userId: book.userId,
            type: "new_reaction",
            title: `${emoji} New Reaction`,
            message: `${reactorName} reacted ${emoji} to your book "${book.title}"`,
            bookId,
          });
        }
      } catch (notifError) {
        console.error("Failed to send book reaction notification:", notifError);
      }
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error toggling book reaction:", error);
    return { error: "Failed to update reaction" };
  }
}

export async function getBookReactions(bookId: string) {
  const user = await getCurrentUser();

  const reactions = await db.bookReaction.findMany({
    where: { bookId },
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

// ============ BOOK COMMENTS ============

export async function createBookComment(bookId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to comment" };
  }

  if (!content.trim()) {
    return { error: "Comment cannot be empty" };
  }

  try {
    const book = await db.book.findUnique({
      where: { id: bookId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });

    if (!book) {
      return { error: "Book not found" };
    }

    const comment = await db.bookComment.create({
      data: {
        bookId,
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

    // Get all users who have commented on this book (except current user)
    const existingCommenters = await db.bookComment.findMany({
      where: {
        bookId,
        userId: { not: user.id },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const commenterName = user.username ? `@${user.username}` : user.fullName || "Someone";
    const ownerName = book.owner.username ? `@${book.owner.username}` : book.owner.fullName || "Someone";

    const usersToNotify = new Set<string>();

    // Notify the book owner if it's not the commenter
    if (book.userId !== user.id) {
      usersToNotify.add(book.userId);
    }

    // Notify other commenters
    existingCommenters.forEach((c) => {
      if (c.userId !== book.userId) {
        usersToNotify.add(c.userId);
      }
    });

    const notificationPromises = [];

    // Notification to book owner
    if (usersToNotify.has(book.userId)) {
      notificationPromises.push(
        createNotification({
          userId: book.userId,
          type: "new_comment",
          title: "New Comment on Book",
          message: `${commenterName} commented on your book "${book.title}": "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          bookId: book.id,
        })
      );
      usersToNotify.delete(book.userId);
    }

    // Notifications to other commenters
    for (const userId of usersToNotify) {
      notificationPromises.push(
        createNotification({
          userId,
          type: "comment_reply",
          title: "New Reply on Book",
          message: `${commenterName} also commented on ${ownerName}'s book "${book.title}": "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
          bookId: book.id,
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
      },
    };
  } catch (error) {
    console.error("Error creating book comment:", error);
    return { error: "Failed to add comment" };
  }
}

export async function deleteBookComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in" };
  }

  try {
    const comment = await db.bookComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return { error: "Comment not found" };
    }

    if (comment.userId !== user.id) {
      return { error: "You can only delete your own comments" };
    }

    await db.bookComment.delete({
      where: { id: commentId },
    });

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error deleting book comment:", error);
    return { error: "Failed to delete comment" };
  }
}

export async function getBookComments(bookId: string) {
  const user = await getCurrentUser();

  const comments = await db.bookComment.findMany({
    where: { bookId },
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

export async function toggleBookCommentLike(commentId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to like comments" };
  }

  try {
    const existingLike = await db.bookCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      await db.bookCommentLike.delete({
        where: { id: existingLike.id },
      });
      revalidatePath("/feed");
      return { success: true, liked: false };
    } else {
      await db.bookCommentLike.create({
        data: {
          commentId,
          userId: user.id,
        },
      });

      // Notify the comment owner
      try {
        const comment = await db.bookComment.findUnique({
          where: { id: commentId },
          select: {
            userId: true,
            content: true,
            bookId: true,
          },
        });

        if (comment && comment.userId !== user.id) {
          const likerName = user.username ? `@${user.username}` : user.fullName || "Someone";
          await createNotification({
            userId: comment.userId,
            type: "new_reaction",
            title: "❤️ Comment Liked",
            message: `${likerName} liked your comment: "${comment.content.slice(0, 50)}${comment.content.length > 50 ? "..." : ""}"`,
            bookId: comment.bookId,
          });
        }
      } catch (notifError) {
        console.error("Failed to send book comment like notification:", notifError);
      }

      revalidatePath("/feed");
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Error toggling book comment like:", error);
    return { error: "Failed to update like" };
  }
}

export async function getBookCommentCount(bookId: string) {
  const count = await db.bookComment.count({
    where: { bookId },
  });
  return count;
}

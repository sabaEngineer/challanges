"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ReactionType = "fire" | "strong" | "kudos" | "not_bad";

export async function toggleReaction(checkinId: string, type: ReactionType) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to react" };
  }

  try {
    // Check if reaction already exists
    const existingReaction = await db.postReaction.findUnique({
      where: {
        checkinId_userId_type: {
          checkinId,
          userId: user.id,
          type,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction
      await db.postReaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      // Add reaction
      await db.postReaction.create({
        data: {
          checkinId,
          userId: user.id,
          type,
        },
      });
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return { error: "Failed to update reaction" };
  }
}

export async function getPostReactions(checkinId: string) {
  const user = await getCurrentUser();

  const reactions = await db.postReaction.groupBy({
    by: ["type"],
    where: { checkinId },
    _count: { type: true },
  });

  const userReactions = user
    ? await db.postReaction.findMany({
        where: { checkinId, userId: user.id },
        select: { type: true },
      })
    : [];

  const reactionCounts: Record<ReactionType, number> = {
    fire: 0,
    strong: 0,
    kudos: 0,
    not_bad: 0,
  };

  reactions.forEach((r) => {
    reactionCounts[r.type as ReactionType] = r._count.type;
  });

  return {
    counts: reactionCounts,
    userReacted: userReactions.map((r) => r.type as ReactionType),
  };
}

export async function getMultiplePostReactions(checkinIds: string[]) {
  const user = await getCurrentUser();

  const reactions = await db.postReaction.groupBy({
    by: ["checkinId", "type"],
    where: { checkinId: { in: checkinIds } },
    _count: { type: true },
  });

  const userReactions = user
    ? await db.postReaction.findMany({
        where: { checkinId: { in: checkinIds }, userId: user.id },
        select: { checkinId: true, type: true },
      })
    : [];

  const result: Record<string, { counts: Record<ReactionType, number>; userReacted: ReactionType[] }> = {};

  checkinIds.forEach((id) => {
    result[id] = {
      counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0 },
      userReacted: [],
    };
  });

  reactions.forEach((r) => {
    if (result[r.checkinId]) {
      result[r.checkinId].counts[r.type as ReactionType] = r._count.type;
    }
  });

  userReactions.forEach((r) => {
    if (result[r.checkinId]) {
      result[r.checkinId].userReacted.push(r.type as ReactionType);
    }
  });

  return result;
}


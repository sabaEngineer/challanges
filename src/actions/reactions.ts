"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ReactionType = "fire" | "strong" | "kudos" | "not_bad" | "heart" | "smile";

export async function toggleReaction(checkinId: string, type: ReactionType) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to react" };
  }

  try {
    // Check if user already has ANY reaction on this post
    const existingReactions = await db.postReaction.findMany({
      where: {
        checkinId,
        userId: user.id,
      },
    });

    const sameTypeReaction = existingReactions.find((r) => r.type === type);

    if (sameTypeReaction) {
      // User clicked the same reaction - remove it
      await db.postReaction.delete({
        where: { id: sameTypeReaction.id },
      });
    } else {
      // User wants a different reaction
      // First, remove any existing reactions
      if (existingReactions.length > 0) {
        await db.postReaction.deleteMany({
          where: {
            checkinId,
            userId: user.id,
          },
        });
      }
      // Then add the new reaction
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
    heart: 0,
    smile: 0,
  };

  reactions.forEach((r) => {
    reactionCounts[r.type as ReactionType] = r._count.type;
  });

  return {
    counts: reactionCounts,
    userReacted: userReactions.map((r) => r.type as ReactionType),
  };
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

export async function getMultiplePostReactions(checkinIds: string[]) {
  const user = await getCurrentUser();

  // Get all reactions with user info
  const allReactions = await db.postReaction.findMany({
    where: { checkinId: { in: checkinIds } },
    select: {
      checkinId: true,
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

  checkinIds.forEach((id) => {
    result[id] = {
      counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 },
      userReacted: [],
      reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] },
    };
  });

  allReactions.forEach((r) => {
    const type = r.type as ReactionType;
    if (result[r.checkinId]) {
      result[r.checkinId].counts[type]++;
      result[r.checkinId].reactors[type].push(r.user);
      
      // Track if current user reacted
      if (user && r.user.id === user.id) {
        if (!result[r.checkinId].userReacted.includes(type)) {
          result[r.checkinId].userReacted.push(type);
        }
      }
    }
  });

  return result;
}


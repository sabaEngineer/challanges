"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { createNotification } from "./notifications";

export async function searchUsers(query: string, excludeUserIds: string[] = []) {
  const user = await getCurrentUser();
  if (!user) return [];

  // Always exclude current user
  const allExcluded = [...excludeUserIds, user.id];

  return db.user.findMany({
    where: {
      id: { notIn: allExcluded },
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      email: true,
    },
    take: 10,
  });
}

export async function getUsers(excludeUserIds: string[] = []) {
  const user = await getCurrentUser();
  if (!user) return [];

  // Always exclude current user
  const allExcluded = [...excludeUserIds, user.id];

  return db.user.findMany({
    where: {
      id: { notIn: allExcluded },
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      email: true,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

export async function inviteUserToChallenge(
  challengeId: string,
  userId: string
): Promise<ActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if challenge exists and current user is the creator
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.createdBy !== currentUser.id) {
    return { success: false, error: "Only the challenge creator can invite members" };
  }

  // Check if user is already a member
  const existingMember = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
  });

  if (existingMember) {
    return { success: false, error: "User is already invited or a member" };
  }

  // Create pending invitation
  await db.challengeMember.create({
    data: {
      challengeId,
      userId,
      status: "pending",
    },
  });

  // Create notification for the invited user
  await createNotification({
    userId,
    type: "challenge_invitation",
    title: "New Challenge Invitation",
    message: `${currentUser.fullName || currentUser.username || "Someone"} invited you to join "${challenge.title}"`,
    challengeId,
  });

  revalidatePath(`/challenges/${challengeId}`);
  return { success: true };
}

export async function inviteMultipleUsers(
  challengeId: string,
  userIds: string[]
): Promise<ActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.createdBy !== currentUser.id) {
    return { success: false, error: "Only the challenge creator can invite members" };
  }

  // Get existing members to exclude
  const existingMembers = await db.challengeMember.findMany({
    where: {
      challengeId,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

  if (newUserIds.length === 0) {
    return { success: false, error: "All selected users are already invited" };
  }

  // Create pending invitations for new users
  await db.challengeMember.createMany({
    data: newUserIds.map((userId) => ({
      challengeId,
      userId,
      status: "pending" as const,
    })),
  });

  // Create notifications for all invited users
  await Promise.all(
    newUserIds.map((userId) =>
      createNotification({
        userId,
        type: "challenge_invitation",
        title: "New Challenge Invitation",
        message: `${currentUser.fullName || currentUser.username || "Someone"} invited you to join "${challenge.title}"`,
        challengeId,
      })
    )
  );

  revalidatePath(`/challenges/${challengeId}`);
  return { success: true, data: { invited: newUserIds.length } };
}

export async function acceptInvitation(challengeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const member = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
    include: {
      challenge: {
        select: {
          title: true,
          createdBy: true,
        },
      },
    },
  });

  if (!member) {
    return { success: false, error: "Invitation not found" };
  }

  if (member.status !== "pending") {
    return { success: false, error: "This invitation is no longer pending" };
  }

  await db.challengeMember.update({
    where: { id: member.id },
    data: { status: "active" },
  });

  // Notify the challenge creator
  await createNotification({
    userId: member.challenge.createdBy,
    type: "invitation_accepted",
    title: "Invitation Accepted",
    message: `${user.fullName || user.username || "Someone"} accepted your invitation to "${member.challenge.title}"`,
    challengeId,
  });

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectInvitation(challengeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const member = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
    include: {
      challenge: {
        select: {
          title: true,
          createdBy: true,
        },
      },
    },
  });

  if (!member) {
    return { success: false, error: "Invitation not found" };
  }

  if (member.status !== "pending") {
    return { success: false, error: "This invitation is no longer pending" };
  }

  await db.challengeMember.delete({
    where: { id: member.id },
  });

  // Notify the challenge creator
  await createNotification({
    userId: member.challenge.createdBy,
    type: "invitation_rejected",
    title: "Invitation Declined",
    message: `${user.fullName || user.username || "Someone"} declined your invitation to "${member.challenge.title}"`,
    challengeId,
  });

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function leaveChallenge(challengeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const member = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
  });

  if (!member) {
    return { success: false, error: "You are not a member of this challenge" };
  }

  await db.challengeMember.update({
    where: { id: member.id },
    data: {
      status: "left",
      leftAt: new Date(),
    },
  });

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyInvitations() {
  const user = await getCurrentUser();
  if (!user) return [];

  return db.challengeMember.findMany({
    where: {
      userId: user.id,
      status: "pending",
    },
    include: {
      challenge: {
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          requirements: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getChallengeMembers(challengeId: string) {
  return db.challengeMember.findMany({
    where: {
      challengeId,
      status: { in: ["active", "pending"] },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
  });
}

export async function joinChallenge(challengeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Please sign in to join this challenge" };
  }

  // Check if challenge exists
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  // Check if challenge has ended
  const now = new Date();
  if (new Date(challenge.endDate) < now) {
    return { success: false, error: "This challenge has already ended" };
  }

  // Check if user is already a member
  const existingMember = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    if (existingMember.status === "active") {
      return { success: false, error: "You are already a member of this challenge" };
    }
    if (existingMember.status === "pending") {
      // User has a pending invitation - accept it instead
      await db.challengeMember.update({
        where: { id: existingMember.id },
        data: { status: "active" },
      });

      // Notify the challenge creator
      await createNotification({
        userId: challenge.createdBy,
        type: "invitation_accepted",
        title: "Member Joined",
        message: `${user.fullName || user.username || "Someone"} joined "${challenge.title}"`,
        challengeId,
      });

      revalidatePath(`/challenges/${challengeId}`);
      revalidatePath("/dashboard");
      return { success: true };
    }
    if (existingMember.status === "left") {
      // User previously left - rejoin
      await db.challengeMember.update({
        where: { id: existingMember.id },
        data: { status: "active", leftAt: null },
      });

      // Notify the challenge creator
      await createNotification({
        userId: challenge.createdBy,
        type: "invitation_accepted",
        title: "Member Rejoined",
        message: `${user.fullName || user.username || "Someone"} rejoined "${challenge.title}"`,
        challengeId,
      });

      revalidatePath(`/challenges/${challengeId}`);
      revalidatePath("/dashboard");
      return { success: true };
    }
    if (existingMember.status === "removed") {
      return { success: false, error: "You have been removed from this challenge" };
    }
  }

  // Create new member as active
  await db.challengeMember.create({
    data: {
      challengeId,
      userId: user.id,
      status: "active",
    },
  });

  // Notify the challenge creator (if not the same person)
  if (challenge.createdBy !== user.id) {
    await createNotification({
      userId: challenge.createdBy,
      type: "invitation_accepted",
      title: "New Member Joined",
      message: `${user.fullName || user.username || "Someone"} joined "${challenge.title}"`,
      challengeId,
    });
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getUserMembershipStatus(challengeId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const member = await db.challengeMember.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: user.id,
      },
    },
    select: {
      status: true,
    },
  });

  return member?.status || null;
}


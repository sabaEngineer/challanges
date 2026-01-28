"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult, Challenge, ChallengeType, ChallengeUnit, StreakMode } from "@/lib/types";
import { ChallengeType as PrismaChallengeType, ChallengeUnit as PrismaChallengeUnit, StreakMode as PrismaStreakMode } from "@prisma/client";

interface RequirementInput {
  title: string;
  type: ChallengeType;
  targetValue: string;
  unit: ChallengeUnit;
}

interface CreateChallengeResult {
  id: string;
  title: string;
}

export async function createChallenge(
  _prevState: ActionResult<CreateChallengeResult> | null,
  formData: FormData
): Promise<ActionResult<CreateChallengeResult>> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const streakMode = (formData.get("streakMode") as StreakMode) || "strict";

  if (!title || !startDate || !endDate) {
    return { success: false, error: "Please fill in all required fields" };
  }

  // Parse dates as UTC midnight for consistent storage
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0, 0));

  if (start > end) {
    return { success: false, error: "End date must be after or same as start date" };
  }

  // Parse requirements from form data
  const requirements: RequirementInput[] = [];
  let index = 0;
  
  while (formData.has(`requirements[${index}][type]`)) {
    const title = formData.get(`requirements[${index}][title]`) as string;
    const type = formData.get(`requirements[${index}][type]`) as ChallengeType;
    const targetValue = formData.get(`requirements[${index}][targetValue]`) as string;
    const unit = formData.get(`requirements[${index}][unit]`) as ChallengeUnit;
    
    // Validate non-yes_no requirements have a target value
    if (type !== "yes_no" && (!targetValue || parseFloat(targetValue) <= 0)) {
      return { success: false, error: `Requirement #${index + 1}: Please enter a valid target value` };
    }
    
    requirements.push({ title, type, targetValue, unit });
    index++;
  }

  // If no requirements provided, add a default "yes/no" requirement
  const finalRequirements = requirements.length > 0 
    ? requirements 
    : [{ title: "Complete daily goal", type: "yes_no" as ChallengeType, targetValue: null, unit: "none" as ChallengeUnit }];

  const challenge = await db.challenge.create({
    data: {
      title,
      description: description || null,
      imageUrl: imageUrl || null,
      startDate: start,
      endDate: end,
      streakMode: streakMode as PrismaStreakMode,
      createdBy: user.id,
      requirements: {
        create: finalRequirements.map((req) => ({
          title: req.title || null,
          type: req.type as PrismaChallengeType,
          targetValue: req.type !== "yes_no" && req.targetValue ? parseFloat(req.targetValue) : null,
          unit: req.unit as PrismaChallengeUnit,
        })),
      },
      // Auto-add creator as active member
      members: {
        create: {
          userId: user.id,
          status: "active",
        },
      },
    },
    include: {
      requirements: true,
    },
  });

  revalidatePath("/challenges");
  
  // Return challenge data instead of redirecting
  return { 
    success: true, 
    data: { 
      id: challenge.id, 
      title: challenge.title 
    } 
  };
}

export async function deleteChallenge(challengeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.createdBy !== user.id) {
    return { success: false, error: "You can only delete your own challenges" };
  }

  await db.challenge.delete({
    where: { id: challengeId },
  });

  revalidatePath("/challenges");
  return { success: true };
}

interface UpdateRequirementInput {
  id?: string;
  title: string;
  type: ChallengeType;
  targetValue: string;
  unit: ChallengeUnit;
}

export async function updateChallenge(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string;

  if (!id || !title) {
    return { success: false, error: "Please fill in all required fields" };
  }

  // Check ownership
  const challenge = await db.challenge.findUnique({
    where: { id },
    include: { requirements: true },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  if (challenge.createdBy !== user.id) {
    return { success: false, error: "You can only edit your own challenges" };
  }

  // Parse requirements from form data
  const requirements: UpdateRequirementInput[] = [];
  let index = 0;
  
  while (formData.has(`requirements[${index}][type]`)) {
    const reqId = formData.get(`requirements[${index}][id]`) as string;
    const reqTitle = formData.get(`requirements[${index}][title]`) as string;
    const type = formData.get(`requirements[${index}][type]`) as ChallengeType;
    const targetValue = formData.get(`requirements[${index}][targetValue]`) as string;
    const unit = formData.get(`requirements[${index}][unit]`) as ChallengeUnit;
    
    if (type !== "yes_no" && (!targetValue || parseFloat(targetValue) <= 0)) {
      return { success: false, error: `Requirement #${index + 1}: Please enter a valid target value` };
    }
    
    requirements.push({ id: reqId || undefined, title: reqTitle, type, targetValue, unit });
    index++;
  }

  // Get existing requirement IDs
  const existingReqIds = challenge.requirements.map((r) => r.id);
  const newReqIds = requirements.filter((r) => r.id).map((r) => r.id);
  const reqsToDelete = existingReqIds.filter((id) => !newReqIds.includes(id));

  // Update challenge
  await db.$transaction(async (tx) => {
    // Update main challenge data
    await tx.challenge.update({
      where: { id },
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    });

    // Delete removed requirements
    if (reqsToDelete.length > 0) {
      await tx.challengeRequirement.deleteMany({
        where: { id: { in: reqsToDelete } },
      });
    }

    // Update existing or create new requirements
    for (const req of requirements) {
      if (req.id) {
        // Update existing
        await tx.challengeRequirement.update({
          where: { id: req.id },
          data: {
            title: req.title || null,
            type: req.type as PrismaChallengeType,
            targetValue: req.type !== "yes_no" && req.targetValue ? parseFloat(req.targetValue) : null,
            unit: req.unit as PrismaChallengeUnit,
          },
        });
      } else {
        // Create new
        await tx.challengeRequirement.create({
          data: {
            challengeId: id,
            title: req.title || null,
            type: req.type as PrismaChallengeType,
            targetValue: req.type !== "yes_no" && req.targetValue ? parseFloat(req.targetValue) : null,
            unit: req.unit as PrismaChallengeUnit,
          },
        });
      }
    }
  });

  revalidatePath(`/challenges/${id}`);
  revalidatePath("/challenges");
  
  return { success: true };
}

export async function getChallenges() {
  const challenges = await db.challenge.findMany({
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
      _count: {
        select: {
          members: {
            where: { status: "active" },
          },
        },
      },
    },
  });

  // Sort: prioritize new challenges (created within 2 days), then by member count
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  return challenges.sort((a, b) => {
    const aIsNew = new Date(a.createdAt) >= twoDaysAgo;
    const bIsNew = new Date(b.createdAt) >= twoDaysAgo;

    // New challenges (< 2 days old) come first, sorted by newest
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;

    // Both are new: sort by newest first
    if (aIsNew && bIsNew) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    // Neither is new: sort by member count (most members first)
    return b._count.members - a._count.members;
  });
}

export async function getMyChallenges() {
  const user = await getCurrentUser();

  if (!user) return [];

  // Get challenges where user is creator or active member
  const challenges = await db.challenge.findMany({
    where: {
      OR: [
        { createdBy: user.id },
        {
          members: {
            some: {
              userId: user.id,
              status: "active",
            },
          },
        },
      ],
    },
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
      members: {
        where: {
          userId: user.id,
        },
        select: {
          status: true,
          currentStreak: true,
          bestStreak: true,
          totalValue: true,
        },
      },
      _count: {
        select: {
          members: {
            where: { status: "active" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return challenges.map((c) => ({
    ...c,
    myMembership: c.members[0] || null,
  }));
}

/**
 * Add a default requirement to a challenge that has no requirements.
 * This fixes existing challenges that were created without requirements.
 */
export async function addDefaultRequirement(challengeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { requirements: true },
  });

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  // Only the creator can add requirements
  if (challenge.createdBy !== user.id) {
    return { success: false, error: "Only the challenge creator can modify this" };
  }

  // Only add if no requirements exist
  if (challenge.requirements.length > 0) {
    return { success: false, error: "Challenge already has requirements" };
  }

  await db.challengeRequirement.create({
    data: {
      challengeId,
      title: "Complete daily goal",
      type: "yes_no",
      targetValue: null,
      unit: "none",
    },
  });

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/challenges");
  revalidatePath("/dashboard");

  return { success: true };
}

"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type FeedbackType = "bug" | "feature" | "improvement" | "other";
export type FeedbackStatus = "pending" | "reviewed" | "planned" | "completed" | "rejected";

export async function submitFeedback(data: {
  type: FeedbackType;
  title: string;
  content: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to submit feedback" };
  }

  try {
    const feedback = await db.feedback.create({
      data: {
        userId: user.id,
        type: data.type,
        title: data.title,
        content: data.content,
      },
    });

    return { success: true, feedback };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { error: "Failed to submit feedback" };
  }
}

export async function getAllFeedback() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    const feedback = await db.feedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { feedback };
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return { error: "Failed to fetch feedback" };
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
  adminNote?: string
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    const feedback = await db.feedback.update({
      where: { id: feedbackId },
      data: {
        status,
        adminNote: adminNote || null,
      },
    });

    revalidatePath("/admin/feedback");
    return { success: true, feedback };
  } catch (error) {
    console.error("Error updating feedback:", error);
    return { error: "Failed to update feedback" };
  }
}

export async function deleteFeedback(feedbackId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  try {
    await db.feedback.delete({
      where: { id: feedbackId },
    });

    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return { error: "Failed to delete feedback" };
  }
}

export async function getMyFeedback() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in" };
  }

  try {
    const feedback = await db.feedback.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return { feedback };
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return { error: "Failed to fetch feedback" };
  }
}

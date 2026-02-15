"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface SurveyData {
  visitorId: string;
  notificationFrequency?: string;
  notificationStyle?: string;
  notificationStyleOther?: string;
  preferredTime?: string;
  customTime?: string;
  motivationType?: string;
  reminderFrequency?: string;
  additionalFeedback?: string;
  userAgent?: string;
}

export async function saveSurveyResponse(data: SurveyData) {
  try {
    const user = await getCurrentUser();
    
    // Check if survey already exists for this visitor
    const existing = await db.surveyResponse.findFirst({
      where: { visitorId: data.visitorId },
    });

    if (existing) {
      // Update existing survey
      await db.surveyResponse.update({
        where: { id: existing.id },
        data: {
          userId: user?.id,
          notificationFrequency: data.notificationFrequency,
          notificationStyle: data.notificationStyle,
          notificationStyleOther: data.notificationStyleOther,
          preferredTime: data.preferredTime,
          customTime: data.customTime,
          motivationType: data.motivationType,
          reminderFrequency: data.reminderFrequency,
          additionalFeedback: data.additionalFeedback,
          completed: true,
        },
      });
    } else {
      // Create new survey response
      await db.surveyResponse.create({
        data: {
          visitorId: data.visitorId,
          userId: user?.id,
          notificationFrequency: data.notificationFrequency,
          notificationStyle: data.notificationStyle,
          notificationStyleOther: data.notificationStyleOther,
          preferredTime: data.preferredTime,
          customTime: data.customTime,
          motivationType: data.motivationType,
          reminderFrequency: data.reminderFrequency,
          additionalFeedback: data.additionalFeedback,
          userAgent: data.userAgent,
          completed: true,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving survey:", error);
    return { success: false, error: "Failed to save survey" };
  }
}

export async function checkSurveyCompleted(visitorId: string) {
  try {
    const existing = await db.surveyResponse.findFirst({
      where: { 
        visitorId,
        completed: true,
      },
    });
    return { completed: !!existing };
  } catch (error) {
    console.error("Error checking survey:", error);
    return { completed: false };
  }
}

export async function checkUserLoggedIn() {
  const user = await getCurrentUser();
  return { isLoggedIn: !!user };
}

export async function dismissSurvey(visitorId: string) {
  try {
    const user = await getCurrentUser();
    
    // Create a record that they dismissed (so we don't show again)
    await db.surveyResponse.upsert({
      where: { 
        id: (await db.surveyResponse.findFirst({ where: { visitorId } }))?.id || "new"
      },
      create: {
        visitorId,
        userId: user?.id,
        completed: false, // Dismissed, not completed
      },
      update: {},
    });

    return { success: true };
  } catch {
    // If no existing record, create one to track dismissal
    const user = await getCurrentUser();
    await db.surveyResponse.create({
      data: {
        visitorId,
        userId: user?.id,
        completed: false,
      },
    });
    return { success: true };
  }
}

// Admin function to get all survey responses
export async function getSurveyResponses() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "admin") {
    return { success: false, error: "Unauthorized", data: [] };
  }

  const responses = await db.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
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
  });

  return { success: true, data: responses };
}

// Admin function to get survey statistics
export async function getSurveyStats() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const total = await db.surveyResponse.count();
  const completed = await db.surveyResponse.count({ where: { completed: true } });
  
  // Get frequency distribution
  const frequencyStats = await db.surveyResponse.groupBy({
    by: ["notificationFrequency"],
    _count: true,
    where: { completed: true },
  });

  // Get style distribution
  const styleStats = await db.surveyResponse.groupBy({
    by: ["notificationStyle"],
    _count: true,
    where: { completed: true },
  });

  // Get preferred time distribution
  const timeStats = await db.surveyResponse.groupBy({
    by: ["preferredTime"],
    _count: true,
    where: { completed: true },
  });

  // Get motivation type distribution
  const motivationStats = await db.surveyResponse.groupBy({
    by: ["motivationType"],
    _count: true,
    where: { completed: true },
  });

  // Get reminder frequency distribution
  const reminderStats = await db.surveyResponse.groupBy({
    by: ["reminderFrequency"],
    _count: true,
    where: { completed: true },
  });

  return {
    success: true,
    stats: {
      total,
      completed,
      dismissed: total - completed,
      frequency: frequencyStats,
      style: styleStats,
      time: timeStats,
      motivation: motivationStats,
      reminder: reminderStats,
    },
  };
}

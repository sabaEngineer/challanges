"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  
  return dbUser?.role === "admin";
}

export async function getAdminStats() {
  const admin = await isAdmin();
  if (!admin) return null;

  const [totalUsers, totalChallenges, totalCheckins] = await Promise.all([
    db.user.count(),
    db.challenge.count(),
    db.dailyCheckin.count(),
  ]);

  return {
    totalUsers,
    totalChallenges,
    totalCheckins,
  };
}

export async function getAllUsersAdmin() {
  const admin = await isAdmin();
  if (!admin) return [];

  const users = await db.user.findMany({
    include: {
      challengeMembers: {
        where: { status: "active" },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      _count: {
        select: {
          dailyCheckins: true,
          challenges: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
    challenges: user.challengeMembers.map((m) => ({
      id: m.challenge.id,
      title: m.challenge.title,
      startDate: m.challenge.startDate,
      endDate: m.challenge.endDate,
      currentStreak: m.currentStreak,
      bestStreak: m.bestStreak,
    })),
    stats: {
      totalCheckins: user._count.dailyCheckins,
      createdChallenges: user._count.challenges,
      activeChallenges: user.challengeMembers.length,
    },
  }));
}

export async function getUserDetailsAdmin(userId: string) {
  const admin = await isAdmin();
  if (!admin) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      challengeMembers: {
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              streakMode: true,
            },
          },
        },
      },
      dailyCheckins: {
        orderBy: { checkinDate: "desc" },
        take: 50,
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
            },
          },
          items: {
            include: {
              requirement: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
    challenges: user.challengeMembers.map((m) => ({
      id: m.challenge.id,
      title: m.challenge.title,
      startDate: m.challenge.startDate,
      endDate: m.challenge.endDate,
      streakMode: m.challenge.streakMode,
      status: m.status,
      currentStreak: m.currentStreak,
      bestStreak: m.bestStreak,
      joinedAt: m.joinedAt,
    })),
    recentCheckins: user.dailyCheckins.map((c) => ({
      id: c.id,
      challengeId: c.challenge.id,
      challengeTitle: c.challenge.title,
      checkinDate: c.checkinDate,
      isDone: c.isDone,
      note: c.note,
      imageUrl: c.imageUrl,
      items: c.items.map((item) => ({
        requirementTitle: item.requirement.title,
        type: item.requirement.type,
        targetValue: item.requirement.targetValue?.toString(),
        unit: item.requirement.unit,
        value: item.value?.toString(),
        isDone: item.isDone,
      })),
    })),
  };
}

export async function getCheckinCalendarAdmin(userId: string, challengeId?: string) {
  const admin = await isAdmin();
  if (!admin) return [];

  const checkins = await db.dailyCheckin.findMany({
    where: {
      userId,
      ...(challengeId ? { challengeId } : {}),
    },
    select: {
      id: true,
      checkinDate: true,
      isDone: true,
      challenge: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { checkinDate: "desc" },
  });

  return checkins.map((c) => ({
    id: c.id,
    date: c.checkinDate,
    isDone: c.isDone,
    challengeId: c.challenge.id,
    challengeTitle: c.challenge.title,
  }));
}

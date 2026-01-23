export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number; // Number of challenges completed
  color: string; // Gradient colors
  rarity: "starter" | "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export const BADGES: Badge[] = [
  {
    id: "starter",
    name: "Newcomer",
    description: "Welcome to the challenge community!",
    icon: "🌱",
    requirement: 0,
    color: "from-slate-400 to-slate-600",
    rarity: "starter",
  },
  {
    id: "first_win",
    name: "First Victory",
    description: "Complete your first challenge",
    icon: "🏅",
    requirement: 1,
    color: "from-amber-400 to-orange-500",
    rarity: "common",
  },
  {
    id: "dedicated",
    name: "Dedicated",
    description: "Complete 3 challenges",
    icon: "⭐",
    requirement: 3,
    color: "from-yellow-400 to-amber-500",
    rarity: "uncommon",
  },
  {
    id: "committed",
    name: "Committed",
    description: "Complete 6 challenges",
    icon: "🔥",
    requirement: 6,
    color: "from-orange-500 to-red-500",
    rarity: "rare",
  },
  {
    id: "champion",
    name: "Champion",
    description: "Complete 10 challenges",
    icon: "🏆",
    requirement: 10,
    color: "from-purple-500 to-pink-500",
    rarity: "epic",
  },
  {
    id: "legend",
    name: "Legend",
    description: "Complete 20 challenges",
    icon: "👑",
    requirement: 20,
    color: "from-amber-300 via-yellow-400 to-amber-500",
    rarity: "legendary",
  },
];

export function getEarnedBadges(completedChallenges: number): Badge[] {
  return BADGES.filter((badge) => completedChallenges >= badge.requirement);
}

export function getNextBadge(completedChallenges: number): Badge | null {
  return BADGES.find((badge) => completedChallenges < badge.requirement) || null;
}

export function getBadgeProgress(completedChallenges: number): {
  current: Badge | null;
  next: Badge | null;
  progress: number;
} {
  const earned = getEarnedBadges(completedChallenges);
  const current = earned.length > 0 ? earned[earned.length - 1] : null;
  const next = getNextBadge(completedChallenges);

  let progress = 100;
  if (next && current) {
    const range = next.requirement - current.requirement;
    const achieved = completedChallenges - current.requirement;
    progress = Math.round((achieved / range) * 100);
  } else if (next && !current) {
    progress = Math.round((completedChallenges / next.requirement) * 100);
  }

  return { current, next, progress };
}

export const RARITY_COLORS = {
  starter: "text-slate-400 border-slate-500/50",
  common: "text-amber-400 border-amber-500/50",
  uncommon: "text-yellow-400 border-yellow-500/50",
  rare: "text-orange-400 border-orange-500/50",
  epic: "text-purple-400 border-purple-500/50",
  legendary: "text-amber-300 border-amber-400/50",
};


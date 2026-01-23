// Points Configuration
export const POINTS = {
  // Points per completed daily check-in
  DAILY_CHECKIN: 10,
  
  // Base points for completing a challenge
  CHALLENGE_COMPLETE_BASE: 50,
  
  // Additional points per day of challenge duration
  CHALLENGE_PER_DAY: 5,
  
  // Bonus for streak milestones
  STREAK_BONUS: {
    7: 25,   // 7-day streak bonus
    14: 50,  // 14-day streak bonus
    30: 100, // 30-day streak bonus
    60: 200, // 60-day streak bonus
    90: 300, // 90-day streak bonus
  } as Record<number, number>,
};

export interface UserPoints {
  totalPoints: number;
  checkinPoints: number;
  challengePoints: number;
  breakdown: {
    completedChallenges: number;
    totalCheckins: number;
    bestStreak: number;
  };
}

/**
 * Calculate points for a challenge based on its duration
 */
export function calculateChallengePoints(startDate: Date, endDate: Date): number {
  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  return POINTS.CHALLENGE_COMPLETE_BASE + (days * POINTS.CHALLENGE_PER_DAY);
}

/**
 * Calculate total points from daily check-ins
 */
export function calculateCheckinPoints(totalCheckins: number): number {
  return totalCheckins * POINTS.DAILY_CHECKIN;
}

/**
 * Get streak bonus points
 */
export function getStreakBonus(streak: number): number {
  let bonus = 0;
  const milestones = Object.keys(POINTS.STREAK_BONUS)
    .map(Number)
    .sort((a, b) => a - b);
  
  for (const milestone of milestones) {
    if (streak >= milestone) {
      bonus = POINTS.STREAK_BONUS[milestone];
    }
  }
  
  return bonus;
}

/**
 * Format points with K suffix for large numbers
 */
export function formatPoints(points: number): string {
  if (points >= 10000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}

// Points label
export const POINTS_LABEL = "apple";
export const POINTS_LABEL_SHORT = "🍏"; // Green apple emoji

/**
 * Get rank title based on points
 */
export function getRankTitle(points: number): { title: string; color: string; icon: string } {
  if (points >= 10000) return { title: "Grandmaster", icon: "💎", color: "text-cyan-400" };
  if (points >= 5000) return { title: "Master", icon: "👑", color: "text-amber-400" };
  if (points >= 2500) return { title: "Expert", icon: "🏆", color: "text-purple-400" };
  if (points >= 1000) return { title: "Advanced", icon: "⭐", color: "text-yellow-400" };
  if (points >= 500) return { title: "Intermediate", icon: "🔥", color: "text-orange-400" };
  if (points >= 100) return { title: "Beginner", icon: "🌱", color: "text-emerald-400" };
  return { title: "Newcomer", icon: "🆕", color: "text-slate-400" };
}


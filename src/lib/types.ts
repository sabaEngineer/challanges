export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
  createdAt: Date;
}

export type ChallengeType = "distance" | "time" | "count" | "yes_no";
export type ChallengeUnit =
  | "reps"
  | "steps"
  | "km"
  | "meters"
  | "minutes"
  | "hours"
  | "pages"
  | "calories"
  | "liters"
  | "workouts"
  | "none";

export interface ChallengeRequirement {
  id: string;
  challengeId: string;
  title?: string | null;
  type: ChallengeType;
  targetValue?: number | string | null; // Decimal from Prisma
  unit: ChallengeUnit;
  createdAt: Date;
}

export interface Challenge {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  createdAt: Date;
  creator?: User;
  requirements?: ChallengeRequirement[];
}

export type MemberStatus = "active" | "left" | "removed" | "pending";

export type NotificationType =
  | "challenge_invitation"
  | "invitation_accepted"
  | "invitation_rejected"
  | "challenge_started"
  | "challenge_ended";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  challengeId?: string | null;
  read: boolean;
  createdAt: Date;
  challenge?: Challenge;
}

export interface ChallengeMember {
  id: string;
  challengeId: string;
  userId: string;
  status: MemberStatus;
  joinedAt: Date;
  leftAt?: Date | null;
  currentStreak: number;
  bestStreak: number;
  totalValue: number;
  user?: User;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  streak?: number;
}

// Helper for challenge type display
export const challengeTypeLabels: Record<ChallengeType, string> = {
  distance: "Distance",
  time: "Time",
  count: "Count",
  yes_no: "Yes/No",
};

export const challengeTypeDescriptions: Record<ChallengeType, string> = {
  distance: "Running, walking, cycling",
  time: "Meditation, workout, reading",
  count: "Push-ups, pages, reps",
  yes_no: "Wake up early, no sugar, habits",
};

// Helper for unit display
export const challengeUnitLabels: Record<ChallengeUnit, string> = {
  reps: "Reps",
  steps: "Steps",
  km: "Kilometers",
  meters: "Meters",
  minutes: "Minutes",
  hours: "Hours",
  pages: "Pages",
  calories: "Calories",
  liters: "Liters",
  workouts: "Workouts",
  none: "None",
};

// Units available for each challenge type
export const unitsForType: Record<ChallengeType, ChallengeUnit[]> = {
  distance: ["km", "meters", "steps"],
  time: ["minutes", "hours"],
  count: ["reps", "pages", "calories", "liters", "workouts"],
  yes_no: ["none"],
};

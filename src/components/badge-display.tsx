"use client";

import { Badge, BADGES, RARITY_COLORS } from "@/lib/badges";

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  size?: "sm" | "md" | "lg";
}

export function BadgeCard({ badge, earned, size = "md" }: BadgeCardProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${!earned ? "opacity-40" : ""}`}>
      <div
        className={`relative ${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${badge.color} p-1 ${
          earned ? "shadow-lg" : "grayscale"
        }`}
      >
        <div
          className={`w-full h-full rounded-xl bg-slate-900 flex items-center justify-center ${
            !earned ? "blur-[2px]" : ""
          }`}
        >
          <span className={iconSizes[size]}>{badge.icon}</span>
        </div>
        {earned && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        {!earned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className={`font-semibold ${earned ? "text-white" : "text-slate-500"} ${textSizes[size]}`}>
          {badge.name}
        </p>
        <p className={`text-xs ${RARITY_COLORS[badge.rarity]} capitalize`}>
          {badge.rarity}
        </p>
      </div>
    </div>
  );
}

interface BadgesGridProps {
  completedChallenges: number;
}

export function BadgesGrid({ completedChallenges }: BadgesGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
      {BADGES.map((badge) => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          earned={completedChallenges >= badge.requirement}
        />
      ))}
    </div>
  );
}

interface BadgeShowcaseProps {
  completedChallenges: number;
}

export function BadgeShowcase({ completedChallenges }: BadgeShowcaseProps) {
  const earnedBadges = BADGES.filter((b) => completedChallenges >= b.requirement);
  const highestBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;
  const nextBadge = BADGES.find((b) => completedChallenges < b.requirement);

  return (
    <div className="space-y-6">
      {/* Current Badge Highlight */}
      {highestBadge && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${highestBadge.color} p-0.5`}>
            <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center">
              <span className="text-3xl">{highestBadge.icon}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Current Rank</p>
            <p className="text-xl font-bold text-white">{highestBadge.name}</p>
            <p className="text-sm text-slate-400">{highestBadge.description}</p>
          </div>
        </div>
      )}

      {/* Progress to Next Badge */}
      {nextBadge && (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Progress to next badge</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{nextBadge.icon}</span>
              <span className="text-sm font-medium text-white">{nextBadge.name}</span>
            </div>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full bg-gradient-to-r ${nextBadge.color} transition-all duration-500`}
              style={{
                width: `${Math.min(100, (completedChallenges / nextBadge.requirement) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">
            {completedChallenges} / {nextBadge.requirement} challenges completed
          </p>
        </div>
      )}

      {/* All Badges */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
          All Badges ({earnedBadges.length}/{BADGES.length})
        </h3>
        <BadgesGrid completedChallenges={completedChallenges} />
      </div>
    </div>
  );
}


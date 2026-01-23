import Link from "next/link";
import {
  ChallengeType,
  ChallengeUnit,
  challengeTypeLabels,
  challengeUnitLabels,
} from "@/lib/types";

interface ChallengeRequirement {
  title?: string | null;
  type: ChallengeType;
  targetValue?: number | string | { toString(): string } | null;
  unit: ChallengeUnit;
}

interface Creator {
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

interface ChallengeListItemProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  startDate: Date;
  endDate: Date;
  creator?: Creator | null;
  requirements?: ChallengeRequirement[];
  memberCount?: number;
}

export function ChallengeListItem({
  id,
  title,
  description,
  imageUrl,
  startDate,
  endDate,
  creator,
  requirements = [],
  memberCount = 0,
}: ChallengeListItemProps) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const isActive = now >= start && now <= end;
  const isUpcoming = now < start;
  const isEnded = now > end;
  const isOneTime = start.toDateString() === end.toDateString();

  // Calculate progress for active challenges
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = isUpcoming
    ? 0
    : Math.min(
        Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        totalDays
      );
  const progressPercent = isOneTime ? (isEnded ? 100 : 0) : Math.round((daysElapsed / totalDays) * 100);

  // Days remaining or until start
  const daysRemaining = isUpcoming
    ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const formatRequirement = (req: ChallengeRequirement) => {
    if (req.type === "yes_no") {
      return req.title || "Daily Check-in";
    }
    return `${req.targetValue} ${challengeUnitLabels[req.unit]}`;
  };

  // Get status color classes
  const getStatusColors = () => {
    if (isActive) return { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400" };
    if (isUpcoming) return { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-400" };
    return { bg: "bg-slate-600/20", border: "border-slate-600/40", text: "text-slate-400" };
  };

  const statusColors = getStatusColors();

  return (
    <Link href={`/challenges/${id}`} className="block group">
      <div className="relative bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-500/40 hover:bg-slate-900/80 transition-all duration-300">
        <div className="flex items-stretch">
          {/* Thumbnail Section */}
          <div className="relative w-32 sm:w-40 md:w-48 flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className={`w-full h-full ${statusColors.bg} flex items-center justify-center`}>
                <span className="text-4xl sm:text-5xl">🎯</span>
              </div>
            )}
            {/* Status indicator dot */}
            <div className={`absolute top-2 left-2 w-3 h-3 rounded-full ${
              isActive ? "bg-emerald-500 animate-pulse" : isUpcoming ? "bg-blue-500" : "bg-slate-500"
            }`} />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/20" />
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                    {title}
                  </h3>
                  {/* Status Badge */}
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
                    {isActive ? "Active" : isUpcoming ? "Upcoming" : "Ended"}
                  </span>
                  {isOneTime && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/40">
                      One-Time
                    </span>
                  )}
                </div>
                {description && (
                  <p className="text-slate-400 text-sm line-clamp-1">
                    {description}
                  </p>
                )}
              </div>
              
              {/* Member count */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 rounded-lg flex-shrink-0">
                <span className="text-sm">👥</span>
                <span className="text-white font-medium text-sm">{memberCount}</span>
              </div>
            </div>

            {/* Requirements */}
            {requirements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {requirements.slice(0, 3).map((req, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs"
                  >
                    <span className="text-amber-400 font-medium">
                      {formatRequirement(req)}
                    </span>
                    {req.title && (
                      <span className="text-amber-400/60 hidden sm:inline">
                        — {req.title}
                      </span>
                    )}
                  </span>
                ))}
                {requirements.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                    +{requirements.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Bottom Row - Stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-auto">
              {/* Date */}
              <span className="flex items-center gap-1">
                <span>📅</span>
                {isOneTime
                  ? formatDate(startDate)
                  : `${formatDate(startDate)} → ${formatDate(endDate)}`}
              </span>

              {/* Duration / Days */}
              {!isOneTime && (
                <span className="flex items-center gap-1">
                  <span>⏱️</span>
                  {isUpcoming
                    ? `Starts in ${daysRemaining}d`
                    : isEnded
                    ? `${totalDays} days`
                    : `${daysRemaining}d left`}
                </span>
              )}

              {/* Creator */}
              {creator && (
                <span className="flex items-center gap-1">
                  {creator.avatarUrl ? (
                    <img
                      src={creator.avatarUrl}
                      alt=""
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <span>👤</span>
                  )}
                  {creator.username ? `@${creator.username}` : creator.fullName || "Anonymous"}
                </span>
              )}

              {/* Progress for active */}
              {isActive && !isOneTime && (
                <span className={`flex items-center gap-1 ${statusColors.text}`}>
                  <span>📊</span>
                  Day {daysElapsed}/{totalDays} ({progressPercent}%)
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden sm:flex items-center px-4">
            <svg
              className="w-5 h-5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

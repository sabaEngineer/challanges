import Link from "next/link";
import { Card } from "./ui/card";
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

interface ChallengeCardProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  startDate: Date;
  endDate: Date;
  creatorUsername?: string | null;
  requirements?: ChallengeRequirement[];
  memberCount?: number;
}

export function ChallengeCard({
  id,
  title,
  description,
  imageUrl,
  startDate,
  endDate,
  creatorUsername,
  requirements = [],
  memberCount = 0,
}: ChallengeCardProps) {
  // Use UTC for consistent date handling in production
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(startDate);
  const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const end = new Date(endDate);
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  
  const isActive = todayUTC >= startUTC && todayUTC <= endUTC;
  const isUpcoming = todayUTC < startUTC;
  const isOneTime = startUTC.getTime() === endUTC.getTime();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const formatRequirement = (req: ChallengeRequirement) => {
    const value = req.type === "yes_no" 
      ? challengeTypeLabels[req.type]
      : `${req.targetValue} ${challengeUnitLabels[req.unit]}`;
    
    if (req.title) {
      return `${value} - ${req.title}`;
    }
    return value;
  };

  return (
    <Link href={`/challenges/${id}`}>
      <Card variant="hover" className="h-full cursor-pointer group overflow-hidden">
        {imageUrl && (
          <div className="relative h-32 -mx-6 -mt-6 mb-4 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          </div>
        )}

        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isUpcoming
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {isActive ? "Active" : isUpcoming ? "Upcoming" : "Ended"}
              </div>
              {isOneTime && (
                <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400">
                  One-Time
                </div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
            {title}
          </h3>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {requirements.slice(0, 3).map((req, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                >
                  {formatRequirement(req)}
                </span>
              ))}
              {requirements.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400">
                  +{requirements.length - 3} more
                </span>
              )}
            </div>
          )}

          {description && (
            <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span>{creatorUsername ? `@${creatorUsername}` : "Anonymous"}</span>
              {memberCount > 0 && (
                <>
                  <span>•</span>
                  <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>
            <span>
              {isOneTime ? (
                <span className="flex items-center gap-1">
                  <span className="text-violet-400">📅</span> {formatDate(startDate)}
                </span>
              ) : (
                `${formatDate(startDate)} - ${formatDate(endDate)}`
              )}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

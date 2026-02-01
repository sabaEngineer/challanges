"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckinModal } from "./checkin-modal";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  ChallengeType,
  ChallengeUnit,
  challengeUnitLabels,
} from "@/lib/types";

interface Requirement {
  id: string;
  title?: string | null;
  type: ChallengeType;
  targetValue?: number | string | null;
  unit: ChallengeUnit;
}

interface TodayCheckin {
  isDone: boolean;
  items: {
    requirementId: string;
    value?: number | string | null;
    isDone: boolean;
  }[];
}

interface TodayChallenge {
  id: string;
  title: string;
  imageUrl?: string | null;
  requirements: Requirement[];
  membership: {
    currentStreak: number;
    bestStreak: number;
  };
  todayCheckin: TodayCheckin | null;
}

interface TodaysChallengesProps {
  challenges: TodayChallenge[];
}

export function TodaysChallenges({ challenges: initialChallenges }: TodaysChallengesProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [selectedChallenge, setSelectedChallenge] = useState<TodayChallenge | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  
  const handleStreakUpdate = (challengeId: string, newStreak: number) => {
    // Update the streak locally for immediate UI feedback
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, membership: { ...c.membership, currentStreak: newStreak } }
          : c
      )
    );
    // Also refresh the page to get latest data
    router.refresh();
  };

  if (challenges.length === 0) {
    return null;
  }

  const pendingChallenges = challenges.filter((c) => !c.todayCheckin?.isDone);
  const completedChallenges = challenges.filter((c) => c.todayCheckin?.isDone);

  // If all challenges are completed for today, show a success message
  if (pendingChallenges.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-lg font-semibold text-emerald-400 mb-1">All Done for Today!</h2>
          <p className="text-sm text-slate-400 mb-4">
            You&apos;ve completed all {completedChallenges.length} challenge{completedChallenges.length !== 1 ? "s" : ""} today
          </p>
          
          {/* Streak summary */}
          <div className="flex justify-center gap-4">
            {completedChallenges.slice(0, 3).map((challenge) => (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
              >
                <span className="text-emerald-400">✓</span>
                <span className="text-emerald-300 truncate max-w-[100px]">{challenge.title}</span>
                {challenge.membership.currentStreak > 0 && (
                  <span className="text-amber-400">🔥{challenge.membership.currentStreak}</span>
                )}
              </Link>
            ))}
            {completedChallenges.length > 3 && (
              <span className="text-xs text-slate-500 self-center">
                +{completedChallenges.length - 3} more
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Today&apos;s Check-ins</h2>
              <p className="text-sm text-slate-400">
                {pendingChallenges.length} challenge{pendingChallenges.length !== 1 ? "s" : ""} pending
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">
              {completedChallenges.length}/{challenges.length}
            </div>
            <div className="text-xs text-slate-500">completed</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedChallenges.length / challenges.length) * 100}%` }}
          />
        </div>

        {/* Pending challenges - always show */}
        <div className="space-y-3">
          {pendingChallenges.map((challenge) => {
            const completedItems = challenge.todayCheckin?.items.filter((i) => i.isDone).length || 0;
            const totalItems = challenge.requirements.length;

            return (
              <div
                key={challenge.id}
                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
              >
                {/* Clickable area for navigation */}
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {challenge.imageUrl ? (
                      <img
                        src={challenge.imageUrl}
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-lg">🎯</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate hover:text-amber-400 transition-colors">{challenge.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{completedItems}/{totalItems} requirements</span>
                      {challenge.membership.currentStreak > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400">🔥 {challenge.membership.currentStreak} streak</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Action */}
                <Button
                  size="sm"
                  onClick={() => setSelectedChallenge(challenge)}
                  className="bg-amber-500 hover:bg-amber-600 flex-shrink-0"
                >
                  {completedItems > 0 ? "Continue" : "Check-in"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Completed challenges - collapsible */}
        {completedChallenges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                {completedChallenges.length} completed today
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showCompleted ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCompleted && (
              <div className="mt-3 space-y-2">
                {completedChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    className="flex items-center gap-3 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                      {challenge.imageUrl ? (
                        <img
                          src={challenge.imageUrl}
                          alt={challenge.title}
                          className="w-full h-full object-cover opacity-80"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center text-sm">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm text-emerald-400 truncate">{challenge.title}</span>
                    {challenge.membership.currentStreak > 0 && (
                      <span className="text-xs text-amber-400">🔥 {challenge.membership.currentStreak}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Checkin Modal */}
      {selectedChallenge && (
        <CheckinModal
          isOpen={!!selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          challengeId={selectedChallenge.id}
          challengeTitle={selectedChallenge.title}
          requirements={selectedChallenge.requirements}
          existingCheckin={selectedChallenge.todayCheckin ? {
            note: null,
            imageUrl: null,
            items: selectedChallenge.todayCheckin.items,
          } : null}
          onStreakUpdate={(newStreak) => handleStreakUpdate(selectedChallenge.id, newStreak)}
        />
      )}
    </>
  );
}

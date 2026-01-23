"use client";

import { useState } from "react";
import { CheckinModal } from "@/components/checkin-modal";
import { Button } from "@/components/ui/button";
import { ChallengeType, ChallengeUnit } from "@/lib/types";

interface Requirement {
  id: string;
  title?: string | null;
  type: ChallengeType;
  targetValue?: number | string | null;
  unit: ChallengeUnit;
}

interface CheckinItem {
  requirementId: string;
  value?: number | string | null;
  isDone: boolean;
}

interface TodayCheckin {
  note?: string | null;
  imageUrl?: string | null;
  isDone: boolean;
  items: {
    requirementId: string;
    value?: number | string | null;
    isDone: boolean;
  }[];
}

interface CheckinButtonProps {
  challengeId: string;
  challengeTitle: string;
  requirements: Requirement[];
  todayCheckin: TodayCheckin | null;
  isActive: boolean;
  isMember: boolean;
  currentStreak?: number;
}

export function CheckinButton({
  challengeId,
  challengeTitle,
  requirements,
  todayCheckin,
  isActive,
  isMember,
  currentStreak = 0,
}: CheckinButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isMember || !isActive) {
    return null;
  }

  const completedCount = todayCheckin?.items.filter((i) => i.isDone).length || 0;
  const totalCount = requirements.length;
  const allDone = todayCheckin?.isDone || false;

  // If all done, show compact completed state
  if (allDone) {
    return (
      <>
        <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xl">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-emerald-400">Today&apos;s Check-in Complete!</h3>
                <p className="text-sm text-slate-400">
                  {currentStreak > 0 ? `🔥 ${currentStreak} day streak` : "Great job!"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
              title="Edit check-in"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        <CheckinModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          challengeId={challengeId}
          challengeTitle={challengeTitle}
          requirements={requirements}
          existingCheckin={todayCheckin ? {
            note: todayCheckin.note,
            imageUrl: todayCheckin.imageUrl,
            items: todayCheckin.items,
          } : null}
        />
      </>
    );
  }

  // Show full check-in prompt for incomplete
  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>📋</span>
              Today&apos;s Check-in
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {completedCount > 0
                ? `${completedCount}/${totalCount} requirements done - keep going!`
                : "Track your progress for today"}
            </p>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <span className="text-amber-400">🔥</span>
              <span className="text-amber-400 font-medium text-sm">{currentStreak}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {completedCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Progress</span>
              <span className="text-amber-400">
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {completedCount > 0 ? (
            <>
              <span className="mr-2">📝</span>
              Continue Check-in
            </>
          ) : (
            <>
              <span className="mr-2">✨</span>
              Start Check-in
            </>
          )}
        </Button>
      </div>

      <CheckinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        challengeId={challengeId}
        challengeTitle={challengeTitle}
        requirements={requirements}
        existingCheckin={todayCheckin ? {
          note: todayCheckin.note,
          imageUrl: todayCheckin.imageUrl,
          items: todayCheckin.items,
        } : null}
      />
    </>
  );
}

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
  frequency?: "daily" | "weekly" | "custom";
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

// Challenge list item component
function ChallengeListItem({ 
  challenge, 
  onCheckin 
}: { 
  challenge: TodayChallenge; 
  onCheckin: (challenge: TodayChallenge) => void;
}) {
  const completedItems = challenge.todayCheckin?.items.filter((i) => i.isDone).length || 0;
  const totalItems = challenge.requirements.length;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
      <Link
        href={`/challenges/${challenge.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
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
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate hover:text-amber-400 transition-colors">
            {challenge.title}
          </h3>
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
      <Button
        size="sm"
        onClick={() => onCheckin(challenge)}
        className="bg-amber-500 hover:bg-amber-600 flex-shrink-0"
      >
        {completedItems > 0 ? "Continue" : "Check-in"}
      </Button>
    </div>
  );
}

// Completed challenge item
function CompletedChallengeItem({ challenge }: { challenge: TodayChallenge }) {
  return (
    <Link
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
  );
}

// Challenge card component
function ChallengeCard({
  title,
  icon,
  colorClasses,
  pending,
  completed,
  showCompleted,
  setShowCompleted,
  onCheckin,
}: {
  title: string;
  icon: string;
  colorClasses: { card: string; icon: string; progress: string };
  pending: TodayChallenge[];
  completed: TodayChallenge[];
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  onCheckin: (challenge: TodayChallenge) => void;
}) {
  const total = pending.length + completed.length;
  
  if (total === 0) return null;

  // All completed state
  if (pending.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-lg font-semibold text-emerald-400 mb-1">{title} - All Done!</h2>
          <p className="text-sm text-slate-400 mb-4">
            You&apos;ve completed all {completed.length} challenge{completed.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {completed.slice(0, 3).map((challenge) => (
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
            {completed.length > 3 && (
              <span className="text-xs text-slate-500 self-center">
                +{completed.length - 3} more
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={colorClasses.card}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colorClasses.icon} flex items-center justify-center`}>
            <span className="text-xl">{icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-slate-400">
              {pending.length} challenge{pending.length !== 1 ? "s" : ""} pending
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-400">
            {completed.length}/{total}
          </div>
          <div className="text-xs text-slate-500">completed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full ${colorClasses.progress} rounded-full transition-all duration-500`}
          style={{ width: `${(completed.length / total) * 100}%` }}
        />
      </div>

      {/* Pending challenges */}
      <div className="space-y-3">
        {pending.map((challenge) => (
          <ChallengeListItem
            key={challenge.id}
            challenge={challenge}
            onCheckin={onCheckin}
          />
        ))}
      </div>

      {/* Completed challenges - collapsible */}
      {completed.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              {completed.length} completed
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
              {completed.map((challenge) => (
                <CompletedChallengeItem key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function TodaysChallenges({ challenges: initialChallenges }: TodaysChallengesProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [selectedChallenge, setSelectedChallenge] = useState<TodayChallenge | null>(null);
  const [showCompletedDaily, setShowCompletedDaily] = useState(false);
  const [showCompletedOther, setShowCompletedOther] = useState(false);
  
  const handleStreakUpdate = (challengeId: string, newStreak: number) => {
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { 
              ...c, 
              membership: { ...c.membership, currentStreak: newStreak },
              todayCheckin: { 
                isDone: true, 
                items: c.requirements.map(r => ({ 
                  requirementId: r.id, 
                  isDone: true, 
                  value: r.targetValue 
                })) 
              }
            }
          : c
      )
    );
    setSelectedChallenge(null);
    router.refresh();
  };

  const handleCheckinClose = () => {
    setSelectedChallenge(null);
    router.refresh();
  };

  if (challenges.length === 0) {
    return null;
  }

  // Split by frequency
  const dailyChallenges = challenges.filter((c) => !c.frequency || c.frequency === "daily");
  const otherChallenges = challenges.filter((c) => c.frequency && c.frequency !== "daily");

  const pendingDaily = dailyChallenges.filter((c) => !c.todayCheckin?.isDone);
  const completedDaily = dailyChallenges.filter((c) => c.todayCheckin?.isDone);
  const pendingOther = otherChallenges.filter((c) => !c.todayCheckin?.isDone);
  const completedOther = otherChallenges.filter((c) => c.todayCheckin?.isDone);

  return (
    <>
      <div className="space-y-6">
        {/* Daily Challenges Card */}
        {dailyChallenges.length > 0 && (
          <ChallengeCard
            title="Daily Check-ins"
            icon="📋"
            colorClasses={{
              card: "bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20",
              icon: "bg-amber-500/20",
              progress: "bg-gradient-to-r from-amber-500 to-emerald-500",
            }}
            pending={pendingDaily}
            completed={completedDaily}
            showCompleted={showCompletedDaily}
            setShowCompleted={setShowCompletedDaily}
            onCheckin={setSelectedChallenge}
          />
        )}

        {/* Other Challenges Card */}
        {otherChallenges.length > 0 && (
          <ChallengeCard
            title="Other Challenges"
            icon="🎯"
            colorClasses={{
              card: "bg-gradient-to-br from-blue-500/5 to-violet-500/5 border-blue-500/20",
              icon: "bg-blue-500/20",
              progress: "bg-gradient-to-r from-blue-500 to-violet-500",
            }}
            pending={pendingOther}
            completed={completedOther}
            showCompleted={showCompletedOther}
            setShowCompleted={setShowCompletedOther}
            onCheckin={setSelectedChallenge}
          />
        )}
      </div>

      {/* Checkin Modal */}
      {selectedChallenge && (
        <CheckinModal
          isOpen={!!selectedChallenge}
          onClose={handleCheckinClose}
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

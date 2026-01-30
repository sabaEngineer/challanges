"use client";

import { useState, useEffect, useTransition } from "react";
import { getUserCheckins } from "@/actions/checkins";
import { Button } from "./ui/button";
import {
  ChallengeType,
  ChallengeUnit,
  challengeTypeLabels,
  challengeUnitLabels,
} from "@/lib/types";

interface UserProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  userId: string;
  userName: string;
}

interface CheckinItem {
  id: string;
  requirementId: string;
  value: string | null;
  isDone: boolean;
  requirement: {
    id: string;
    title: string | null;
    type: string;
    targetValue: string | null;
    unit: string;
  };
}

interface Checkin {
  id: string;
  checkinDate: Date;
  isDone: boolean;
  note: string | null;
  imageUrl: string | null;
  items: CheckinItem[];
}

interface UserProgressData {
  user: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
  membership: {
    currentStreak: number;
    bestStreak: number;
    totalValue: string;
    joinedAt: Date;
  };
  challenge: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    requirements: Array<{
      id: string;
      title: string | null;
      type: string;
      targetValue: unknown;
      unit: string;
    }>;
  };
  checkins: Checkin[];
  stats: {
    totalCheckins: number;
    completedCheckins: number;
    totalDays: number;
    completionRate: number;
  };
}

export function UserProgressModal({
  isOpen,
  onClose,
  challengeId,
  userId,
  userName,
}: UserProgressModalProps) {
  const [data, setData] = useState<UserProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null);

  useEffect(() => {
    if (isOpen && !data) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setIsLoading(true);
    try {
      const result = await getUserCheckins(challengeId, userId);
      setData(result);
    } catch (error) {
      console.error("Failed to load user progress:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const getProgress = (item: CheckinItem) => {
    if (item.requirement.type === "yes_no") {
      return item.isDone ? 100 : 0;
    }
    const value = parseFloat(item.value || "0");
    const target = parseFloat(item.requirement.targetValue || "0");
    if (target === 0) return 0;
    return Math.min(100, Math.round((value / target) * 100));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {data?.user.avatarUrl ? (
                <img
                  src={data.user.avatarUrl}
                  alt={userName}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl">
                  👤
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{userName}</h2>
                <p className="text-sm text-slate-400">Challenge Progress</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
            </div>
          ) : !data ? (
            <div className="text-center py-16 text-slate-400">
              Failed to load progress data
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    🔥 {data.membership.currentStreak}
                  </div>
                  <div className="text-xs text-amber-400/70">Current Streak</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    ⭐ {data.membership.bestStreak}
                  </div>
                  <div className="text-xs text-emerald-400/70">Best Streak</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {data.stats.completedCheckins}/{data.stats.totalDays}
                  </div>
                  <div className="text-xs text-blue-400/70">Days Completed</div>
                </div>
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-violet-400">
                    {data.stats.completionRate}%
                  </div>
                  <div className="text-xs text-violet-400/70">Completion Rate</div>
                </div>
              </div>

              {/* Check-in History */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📅</span> Check-in History
                </h3>

                {data.checkins.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/50 rounded-xl">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-slate-400">No check-ins yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.checkins.map((checkin) => {
                      const isExpanded = selectedCheckin?.id === checkin.id;
                      const completedItems = checkin.items.filter((i) => i.isDone).length;
                      const totalItems = checkin.items.length;
                      const hasPartial = checkin.items.some((i) => {
                        const progress = getProgress(i);
                        return progress > 0 && progress < 100;
                      });

                      return (
                        <div
                          key={checkin.id}
                          className={`rounded-xl border overflow-hidden transition-all ${
                            checkin.isDone
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : hasPartial
                              ? "bg-blue-500/5 border-blue-500/30"
                              : "bg-slate-800/30 border-slate-700"
                          }`}
                        >
                          {/* Checkin Header - Clickable */}
                          <button
                            onClick={() => setSelectedCheckin(isExpanded ? null : checkin)}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  checkin.isDone
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : hasPartial
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {checkin.isDone ? "✓" : hasPartial ? "◐" : "✗"}
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-white">
                                  {formatDate(checkin.checkinDate)}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {completedItems}/{totalItems} requirements
                                  {checkin.isDone && " • Complete"}
                                  {hasPartial && !checkin.isDone && " • In Progress"}
                                </div>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-slate-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                              {/* Requirements */}
                              <div className="pt-3 space-y-2">
                                {checkin.items.map((item) => {
                                  const progress = getProgress(item);
                                  const type = item.requirement.type as ChallengeType;
                                  const unit = item.requirement.unit as ChallengeUnit;

                                  return (
                                    <div
                                      key={item.id}
                                      className={`p-3 rounded-lg ${
                                        item.isDone
                                          ? "bg-emerald-500/10"
                                          : progress > 0
                                          ? "bg-blue-500/10"
                                          : "bg-slate-800/50"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                                              item.isDone
                                                ? "bg-emerald-500 text-white"
                                                : progress > 0
                                                ? "bg-blue-500/50 text-blue-200"
                                                : "bg-red-500/20 text-red-400"
                                            }`}
                                          >
                                            {item.isDone ? "✓" : progress > 0 ? "◐" : "✗"}
                                          </span>
                                          <span className="text-sm text-white">
                                            {type === "yes_no"
                                              ? item.requirement.title || "Daily task"
                                              : `${item.requirement.targetValue} ${challengeUnitLabels[unit]}`}
                                          </span>
                                          {item.requirement.title && type !== "yes_no" && (
                                            <span className="text-xs text-slate-400">
                                              — {item.requirement.title}
                                            </span>
                                          )}
                                        </div>
                                        {type !== "yes_no" && (
                                          <span
                                            className={`text-sm font-medium ${
                                              item.isDone
                                                ? "text-emerald-400"
                                                : progress > 0
                                                ? "text-blue-400"
                                                : "text-slate-500"
                                            }`}
                                          >
                                            {item.value || 0} / {item.requirement.targetValue}
                                            <span className="text-xs ml-1">({progress}%)</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Progress bar for non-yes_no */}
                                      {type !== "yes_no" && (
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all ${
                                              progress >= 100 ? "bg-emerald-500" : "bg-blue-500"
                                            }`}
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Note */}
                              {checkin.note && (
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                  <div className="text-xs text-slate-500 mb-1">Note</div>
                                  <p className="text-sm text-slate-300">{checkin.note}</p>
                                </div>
                              )}

                              {/* Image */}
                              {checkin.imageUrl && (
                                <div className="rounded-lg overflow-hidden">
                                  <img
                                    src={checkin.imageUrl}
                                    alt="Check-in"
                                    className="w-full max-h-48 object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}


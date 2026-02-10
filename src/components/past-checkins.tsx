"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { CheckinModal } from "./checkin-modal";
import { getPastCheckins } from "@/actions/checkins";
import { ChallengeType, ChallengeUnit } from "@/lib/types";

interface Requirement {
  id: string;
  title?: string | null;
  type: ChallengeType;
  targetValue?: number | string | null;
  unit: ChallengeUnit;
  requirementGroup?: number;
}

interface PastCheckin {
  date: string;
  isDone: boolean;
  note?: string | null;
  imageUrl?: string | null;
  mediaUrls?: { url: string; type: "image" | "video" }[] | null;
  items: {
    requirementId: string;
    value?: string | null;
    isDone: boolean;
  }[];
}

interface PastCheckinsProps {
  challengeId: string;
  challengeTitle: string;
  startDate: Date;
  endDate: Date;
  requirements: Requirement[];
}

export function PastCheckinsSection({
  challengeId,
  challengeTitle,
  startDate,
  endDate,
  requirements,
}: PastCheckinsProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pastCheckins, setPastCheckins] = useState<PastCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCheckin, setSelectedCheckin] = useState<PastCheckin | null>(null);

  // Calculate past days (excluding today)
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const today = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate()));
  
  const start = new Date(startDate);
  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const end = new Date(endDate);
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  // Get all dates between start and yesterday (or end date if earlier)
  const getPastDates = () => {
    const dates: Date[] = [];
    const effectiveEnd = today < endDay ? today : endDay;
    let current = new Date(startDay);
    
    while (current < effectiveEnd) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates.reverse(); // Most recent first
  };

  const pastDates = getPastDates();

  // Load past checkins when expanded
  useEffect(() => {
    if (isExpanded && pastCheckins.length === 0) {
      loadPastCheckins();
    }
  }, [isExpanded]);

  const loadPastCheckins = async () => {
    setIsLoading(true);
    try {
      const result = await getPastCheckins(challengeId);
      if (result.success && result.data) {
        setPastCheckins(result.data);
      }
    } catch (error) {
      console.error("Error loading past checkins:", error);
    }
    setIsLoading(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getCheckinForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    return pastCheckins.find((c) => c.date === dateKey);
  };

  const handleDateClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    const existingCheckin = getCheckinForDate(date);
    setSelectedDate(dateKey);
    setSelectedCheckin(existingCheckin || null);
  };

  const handleModalClose = () => {
    setSelectedDate(null);
    setSelectedCheckin(null);
    // Reload past checkins to get updated data
    loadPastCheckins();
    router.refresh();
  };

  // Don't show if no past dates
  if (pastDates.length === 0) {
    return null;
  }

  // Count missed days
  const missedDays = pastDates.filter((date) => !getCheckinForDate(date)?.isDone).length;
  const completedDays = pastDates.length - missedDays;

  return (
    <>
      <Card>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <span className="text-xl">📅</span>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white">Past Check-ins</h3>
              <p className="text-sm text-slate-400">
                {completedDays}/{pastDates.length} days completed
                {missedDays > 0 && (
                  <span className="text-amber-400 ml-1">• {missedDays} missed</span>
                )}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pastDates.map((date) => {
                  const checkin = getCheckinForDate(date);
                  const isDone = checkin?.isDone;
                  
                  return (
                    <div
                      key={formatDateKey(date)}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isDone 
                          ? "bg-emerald-500/10 border border-emerald-500/20" 
                          : "bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDone ? "bg-emerald-500/20" : "bg-slate-700"
                        }`}>
                          {isDone ? (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-slate-500 text-sm">−</span>
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${isDone ? "text-emerald-400" : "text-slate-300"}`}>
                            {formatDate(date)}
                          </p>
                          {checkin?.note && (
                            <p className="text-xs text-slate-500 truncate max-w-[150px]">
                              {checkin.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isDone ? "outline" : "primary"}
                        onClick={() => handleDateClick(date)}
                        className={isDone ? "" : "bg-amber-500 hover:bg-amber-600"}
                      >
                        {isDone ? "Edit" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500 text-center">
              Update past check-ins you may have forgotten. They can be shared to the feed.
            </p>
          </div>
        )}
      </Card>

      {/* Checkin Modal for past date */}
      {selectedDate && (
        <CheckinModal
          isOpen={!!selectedDate}
          onClose={handleModalClose}
          challengeId={challengeId}
          challengeTitle={challengeTitle}
          requirements={requirements}
          existingCheckin={selectedCheckin ? {
            note: selectedCheckin.note,
            imageUrl: selectedCheckin.imageUrl,
            mediaUrls: selectedCheckin.mediaUrls,
            items: selectedCheckin.items,
          } : null}
          date={selectedDate}
          isPastDate={true}
        />
      )}
    </>
  );
}

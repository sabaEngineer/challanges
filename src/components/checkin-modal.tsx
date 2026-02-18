"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrUpdateCheckin, checkDailyShareLimit } from "@/actions/checkins";
import { Button } from "./ui/button";
import { Toast } from "./ui/toast";
import { MultiMediaUpload, MediaItem } from "./media-upload";
import {
  ChallengeType,
  ChallengeUnit,
  challengeTypeLabels,
  challengeUnitLabels,
} from "@/lib/types";

function isValidLinkUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("strava.com") ||
      host.includes("strava.app.link")
    );
  } catch {
    return false;
  }
}

function getLinkType(url: string): "youtube" | "strava" | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("strava.com") || host.includes("strava.app.link")) return "strava";
    return null;
  } catch {
    return null;
  }
}

interface Requirement {
  id: string;
  title?: string | null;
  type: ChallengeType;
  targetValue?: number | string | null;
  unit: ChallengeUnit;
  requirementGroup?: number;
}

interface CheckinItem {
  requirementId: string;
  value?: number | string | null;
  isDone: boolean;
}

interface ExistingCheckin {
  note?: string | null;
  imageUrl?: string | null;
  mediaUrls?: MediaItem[] | null;
  linkUrl?: string | null;
  items: CheckinItem[];
}

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  requirements: Requirement[];
  existingCheckin?: ExistingCheckin | null;
  date?: string;
  isPastDate?: boolean;
  onStreakUpdate?: (newStreak: number) => void;
}

export function CheckinModal({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  requirements,
  existingCheckin,
  date,
  isPastDate,
  onStreakUpdate,
}: CheckinModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedState, setSavedState] = useState<"none" | "partial" | "complete">("none");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [note, setNote] = useState(existingCheckin?.note || "");
  const [mediaUrls, setMediaUrls] = useState<MediaItem[]>(() => {
    // Support both old imageUrl and new mediaUrls
    if (existingCheckin?.mediaUrls && Array.isArray(existingCheckin.mediaUrls)) {
      return existingCheckin.mediaUrls;
    }
    if (existingCheckin?.imageUrl) {
      const isVideo = existingCheckin.imageUrl.includes("/videos/") || 
                      existingCheckin.imageUrl.includes(".mp4") ||
                      existingCheckin.imageUrl.includes(".mov") ||
                      existingCheckin.imageUrl.includes(".webm");
      return [{ url: existingCheckin.imageUrl, type: isVideo ? "video" : "image" }];
    }
    return [];
  });
  const [linkUrl, setLinkUrl] = useState(existingCheckin?.linkUrl || "");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [items, setItems] = useState<Record<string, { value: string; isDone: boolean }>>(() => {
    const initial: Record<string, { value: string; isDone: boolean }> = {};
    requirements.forEach((req) => {
      const existingItem = existingCheckin?.items.find(
        (i) => i.requirementId === req.id
      );
      const value = existingItem?.value?.toString() || "";
      
      // Recalculate isDone based on actual value vs target (don't trust stored isDone)
      let isDone = false;
      if (req.type === "yes_no") {
        isDone = existingItem?.isDone || false;
      } else if (value) {
        const numValue = parseFloat(value) || 0;
        const targetValue = req.targetValue ? Number(req.targetValue) : null;
        if (targetValue !== null && targetValue > 0) {
          isDone = numValue >= targetValue;
        } else {
          isDone = numValue > 0;
        }
      }
      
      initial[req.id] = { value, isDone };
    });
    return initial;
  });

  // Get today's date in local timezone (not UTC) for check-in
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = date || getLocalDateString();

  // Calculate progress percentage for a requirement
  const getProgress = (req: Requirement, item: { value: string; isDone: boolean }) => {
    if (req.type === "yes_no") {
      return item.isDone ? 100 : 0;
    }
    const numValue = parseFloat(item.value) || 0;
    const targetValue = req.targetValue ? Number(req.targetValue) : null;
    if (targetValue === null || targetValue <= 0) return numValue > 0 ? 50 : 0; // No target, show 50% if any value
    return Math.min(100, Math.round((numValue / targetValue) * 100));
  };

  // Get status for a requirement: 'complete', 'partial', 'none'
  const getStatus = (req: Requirement, item: { value: string; isDone: boolean }) => {
    if (item.isDone) return "complete";
    const progress = getProgress(req, item);
    if (progress > 0) return "partial";
    return "none";
  };

  const handleToggle = (reqId: string, req: Requirement) => {
    setItems((prev) => {
      const current = prev[reqId];
      const newIsDone = !current.isDone;
      
      // For yes_no type, just toggle
      if (req.type === "yes_no") {
        return { ...prev, [reqId]: { ...current, isDone: newIsDone } };
      }
      
      const targetValue = req.targetValue ? Number(req.targetValue) : null;
      const currentValue = parseFloat(current.value) || 0;
      
      if (targetValue !== null && targetValue > 0) {
        // For numeric types with targets:
        // - If marking as done, auto-fill the target value
        // - If unmarking, clear the value back to empty
        if (newIsDone) {
          return { ...prev, [reqId]: { value: targetValue.toString(), isDone: true } };
        } else {
          return { ...prev, [reqId]: { value: "", isDone: false } };
        }
      }
      
      // For requirements without a target, allow manual toggle only if value > 0
      if (newIsDone && currentValue <= 0) {
        return prev; // Don't allow marking done without a value
      }
      
      return { ...prev, [reqId]: { ...current, isDone: newIsDone } };
    });
  };

  const handleValueChange = (reqId: string, value: string, req: Requirement) => {
    const numValue = parseFloat(value) || 0;
    const targetValue = req.targetValue ? Number(req.targetValue) : null;
    
    // Only mark as done if there's a target value and the entered value meets it
    // If no target value, require explicit checkbox click to mark as done
    const isDone = targetValue !== null && targetValue > 0 && numValue >= targetValue;
    
    setItems((prev) => ({
      ...prev,
      [reqId]: { value, isDone },
    }));
  };

  const handleSubmit = (forceComplete = false, shouldShareToFeed = false) => {
    // Validate link URL before submitting
    if (linkUrl.trim() && !isValidLinkUrl(linkUrl)) {
      setLinkError("Please enter a valid YouTube or Strava URL");
      return;
    }
    setLinkError(null);

    const checkinItems = requirements.map((req) => {
      const item = items[req.id];
      const numValue = item.value ? parseFloat(item.value) : undefined;
      
      // Calculate isDone based on actual values, not auto-fill
      let isDone = item.isDone;
      if (forceComplete && req.type !== "yes_no") {
        // For forceComplete, verify the value actually meets target
        const targetValue = req.targetValue ? Number(req.targetValue) : null;
        if (targetValue !== null && targetValue > 0) {
          isDone = (numValue ?? 0) >= targetValue;
        } else {
          isDone = (numValue ?? 0) > 0;
        }
      }
      
      return {
        requirementId: req.id,
        value: numValue,
        isDone: forceComplete ? isDone : item.isDone,
      };
    });

    const willBeComplete = forceComplete || checkGroupCompletion();

    startTransition(async () => {
      setErrorMessage(null); // Clear any previous error
      
      const result = await createOrUpdateCheckin(
        challengeId,
        today,
        checkinItems,
        note || undefined,
        mediaUrls.length > 0 ? mediaUrls : undefined,
        shouldShareToFeed,
        linkUrl.trim() || undefined
      );

      if (result.success) {
        // Update streak in parent component if callback provided
        if (onStreakUpdate && result.streak !== undefined) {
          onStreakUpdate(result.streak);
        }
        
        if (willBeComplete) {
          // If complete, close immediately
          onClose();
          router.refresh();
        } else {
          // If partial, show success state with option to complete
          setSavedState("partial");
          router.refresh();
        }
      } else {
        setErrorMessage(result.error || "Something went wrong");
      }
    });
  };

  const handleMarkComplete = () => {
    // Submit the check-in with the shareToFeed preference
    // Each requirement's isDone status is based on actual values, not forced
    handleSubmit(true, shareToFeed);
  };

  const handleClose = () => {
    setSavedState("none");
    setErrorMessage(null);
    onClose();
  };

  // Handle share toggle with daily limit check
  const handleShareToggle = async (checked: boolean) => {
    // If turning off, just allow it
    if (!checked) {
      setShareToFeed(false);
      return;
    }

    // If turning on, check the daily limit first
    const result = await checkDailyShareLimit(challengeId, today);
    
    if (!result.canShare) {
      setErrorMessage("Daily share limit reached! You can only share 2 check-ins to the feed per day.");
      setShareToFeed(false);
    } else {
      setShareToFeed(true);
    }
  };

  // Check if done using group OR logic
  const checkGroupCompletion = () => {
    const groups = [...new Set(requirements.map(r => r.requirementGroup ?? 0))];
    
    // If only one group, use simple AND logic
    if (groups.length <= 1) {
      return requirements.every((req) => items[req.id]?.isDone);
    }
    
    // Check if ANY group is fully complete
    for (const groupNum of groups) {
      const groupReqs = requirements.filter(r => (r.requirementGroup ?? 0) === groupNum);
      if (groupReqs.every(req => items[req.id]?.isDone)) {
        return true;
      }
    }
    
    return false;
  };
  
  const allDone = checkGroupCompletion();
  const completedCount = requirements.filter((req) => items[req.id]?.isDone).length;
  const partialCount = requirements.filter((req) => {
    const status = getStatus(req, items[req.id]);
    return status === "partial";
  }).length;
  
  // Get unique groups for rendering
  const groups = [...new Set(requirements.map(r => r.requirementGroup ?? 0))].sort((a, b) => a - b);
  const hasMultipleGroups = groups.length > 1;
  
  // Check which groups are complete
  const getGroupCompletionStatus = (groupNum: number) => {
    const groupReqs = requirements.filter(r => (r.requirementGroup ?? 0) === groupNum);
    const allComplete = groupReqs.every(req => items[req.id]?.isDone);
    const anyPartial = groupReqs.some(req => {
      const status = getStatus(req, items[req.id]);
      return status === "partial" || status === "complete";
    });
    return { allComplete, anyPartial };
  };

  if (!isOpen) return null;

  // Show success screen after saving partial progress
  if (savedState === "partial") {
    return (
      <>
        {/* Toast Popup for errors */}
        {errorMessage && (
          <Toast
            message={errorMessage}
            type="error"
            onClose={() => setErrorMessage(null)}
          />
        )}
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />
        <div className="relative bg-slate-900 border-t md:border border-slate-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-md overflow-hidden">
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
          </div>
          
          <div className="px-4 py-6 md:p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-3xl md:text-4xl">💪</span>
            </div>
            
            {/* Message */}
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Progress Saved!</h2>
            <p className="text-sm md:text-base text-slate-400 mb-4 md:mb-6">
              {hasMultipleGroups ? (
                <>
                  Great start! Complete any one option to finish.
                  <br />
                  Come back when you&apos;re ready!
                </>
              ) : (
                <>
                  Great start! You&apos;ve logged {completedCount} of {requirements.length} tasks.
                  <br />
                  Come back when you&apos;re ready to finish!
                </>
              )}
            </p>

            {/* Progress Summary */}
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex items-center justify-between text-xs md:text-sm mb-1.5 md:mb-2">
                <span className="text-slate-400">Today&apos;s Progress</span>
                <span className="text-blue-400 font-medium">
                  {hasMultipleGroups 
                    ? `${Math.round(Math.max(...groups.map(g => {
                        const groupReqs = requirements.filter(r => (r.requirementGroup ?? 0) === g);
                        const groupComplete = groupReqs.filter(r => items[r.id]?.isDone).length;
                        return (groupComplete / groupReqs.length) * 100;
                      })))}%`
                    : `${Math.round((completedCount / requirements.length) * 100)}%`
                  }
                </span>
              </div>
              <div className="h-2 md:h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${hasMultipleGroups 
                    ? Math.max(...groups.map(g => {
                        const groupReqs = requirements.filter(r => (r.requirementGroup ?? 0) === g);
                        const groupComplete = groupReqs.filter(r => items[r.id]?.isDone).length;
                        return (groupComplete / groupReqs.length) * 100;
                      }))
                    : (completedCount / requirements.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Share to Feed Toggle */}
            <label className="flex items-center gap-2 md:gap-3 mb-4 p-2.5 md:p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors text-left">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={shareToFeed}
                  onChange={(e) => handleShareToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 md:w-11 h-5 md:h-6 bg-slate-700 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 md:w-5 h-4 md:h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs md:text-sm font-medium text-white">Share to Feed</span>
                <p className="text-[10px] md:text-xs text-slate-400 truncate">
                  {isPastDate ? "Share this update" : "Let others see your progress"}
                </p>
              </div>
              <span className="text-base md:text-lg flex-shrink-0">{shareToFeed ? "📢" : "🔒"}</span>
            </label>

            {/* Actions */}
            <div className="space-y-2 md:space-y-3">
              <Button
                onClick={handleMarkComplete}
                disabled={isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-sm md:text-base py-2.5 md:py-2"
              >
                {isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <span className="mr-1 md:mr-2">✓</span>
                    <span className="hidden sm:inline">I&apos;m Done - Mark as Complete</span>
                    <span className="sm:hidden">Mark as Complete</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full text-sm md:text-base py-2.5 md:py-2"
              >
                Continue Later
              </Button>
            </div>

            {/* Tip */}
            <p className="text-[10px] md:text-xs text-slate-500 mt-3 md:mt-4">
              Tip: Completing all tasks earns you streak points!
            </p>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {/* Toast Popup for errors */}
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-slate-900 border-t md:border border-slate-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-4 py-3 md:p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-white truncate">
                {isPastDate ? "Update Past Check-in" : "Daily Check-in"}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1 truncate">
                {challengeTitle}
                {isPastDate && date && (
                  <span className="ml-2 text-amber-400">
                    • {new Date(date + "T00:00:00").toLocaleDateString("en-US", { 
                      weekday: "short", 
                      month: "short", 
                      day: "numeric" 
                    })}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="ml-2 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-3 md:mt-4">
            <div className="flex items-center justify-between text-xs md:text-sm mb-1.5 md:mb-2">
              <span className="text-slate-400">Progress</span>
              {hasMultipleGroups ? (
                <span className={allDone ? "text-emerald-400" : "text-amber-400"}>
                  {allDone ? "✓ Complete" : `${groups.filter(g => getGroupCompletionStatus(g).allComplete).length} / ${groups.length} options`}
                </span>
              ) : (
                <span className={allDone ? "text-emerald-400" : partialCount > 0 ? "text-blue-400" : "text-amber-400"}>
                  {completedCount} / {requirements.length}
                  {partialCount > 0 && !allDone && <span className="hidden sm:inline"> • {partialCount} in progress</span>}
                </span>
              )}
            </div>
            <div className="h-1.5 md:h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  allDone ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${allDone ? 100 : hasMultipleGroups 
                  ? Math.max(...groups.map(g => {
                      const groupReqs = requirements.filter(r => (r.requirementGroup ?? 0) === g);
                      const groupComplete = groupReqs.filter(r => items[r.id]?.isDone).length;
                      return (groupComplete / groupReqs.length) * 100;
                    }))
                  : (completedCount / requirements.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 md:p-6 space-y-3 md:space-y-4">
          {/* Requirements - grouped by requirementGroup */}
          {groups.map((groupNum, groupIdx) => {
            const groupReqs = requirements.filter(r => (r.requirementGroup ?? 0) === groupNum);
            const { allComplete: groupComplete } = getGroupCompletionStatus(groupNum);
            
            return (
              <div key={groupNum}>
                {/* OR separator between groups */}
                {groupIdx > 0 && (
                  <div className="flex items-center gap-2 my-3 md:my-4">
                    <div className="flex-1 h-px bg-violet-500/30" />
                    <span className="px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-violet-400 bg-violet-500/20 rounded-full">
                      OR
                    </span>
                    <div className="flex-1 h-px bg-violet-500/30" />
                  </div>
                )}
                
                {/* Group container */}
                <div className={`space-y-2 md:space-y-3 ${hasMultipleGroups ? `p-2 md:p-3 rounded-xl border-2 border-dashed ${groupComplete ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600 bg-slate-800/20'}` : ''}`}>
                  {hasMultipleGroups && (
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded ${groupComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        Option {groupIdx + 1} {groupComplete && '✓'}
                      </span>
                      {groupComplete && (
                        <span className="text-[10px] md:text-xs text-emerald-400">Complete!</span>
                      )}
                    </div>
                  )}
                  
                  {groupReqs.map((req) => {
                    const item = items[req.id];
                    const isYesNo = req.type === "yes_no";
                    const status = getStatus(req, item);
                    const progress = getProgress(req, item);

                    // Dynamic styling based on status
                    const getBorderColor = () => {
                      if (status === "complete") return "border-emerald-500/40";
                      if (status === "partial") return "border-blue-500/40";
                      return "border-slate-700";
                    };

                    const getBgColor = () => {
                      if (status === "complete") return "bg-emerald-500/10";
                      if (status === "partial") return "bg-blue-500/10";
                      return "bg-slate-800/50";
                    };

                    const getCheckboxStyle = () => {
                      if (status === "complete") return "bg-emerald-500 border-emerald-500";
                      if (status === "partial") return "bg-blue-500/50 border-blue-500";
                      return "border-slate-600 hover:border-slate-500";
                    };

                    const getTextColor = () => {
                      if (status === "complete") return "text-emerald-400";
                      if (status === "partial") return "text-blue-400";
                      return "text-white";
                    };

                    return (
                      <div
                        key={req.id}
                        className={`p-3 md:p-4 rounded-xl border transition-all ${getBorderColor()} ${getBgColor()}`}
                      >
                        <div className="flex items-start gap-2 md:gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggle(req.id, req)}
                            className={`flex-shrink-0 w-7 h-7 md:w-6 md:h-6 rounded-md border-2 flex items-center justify-center transition-all ${getCheckboxStyle()}`}
                          >
                            {status === "complete" && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {status === "partial" && (
                              <div className="w-2 h-2 bg-blue-400 rounded-sm" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                              <span className={`text-sm md:text-base font-medium ${getTextColor()}`}>
                                {isYesNo
                                  ? req.title || "Complete this task"
                                  : `${req.targetValue} ${challengeUnitLabels[req.unit]}`}
                              </span>
                              <span className="text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                                {challengeTypeLabels[req.type]}
                              </span>
                            </div>
                            {req.title && !isYesNo && (
                              <p className="text-xs md:text-sm text-slate-400">{req.title}</p>
                            )}

                            {/* Value input for non-yes_no types */}
                            {!isYesNo && (
                              <div className="mt-2 md:mt-3">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={item.value}
                                    onChange={(e) => handleValueChange(req.id, e.target.value, req)}
                                    placeholder="0"
                                    className={`w-20 md:w-24 px-2 md:px-3 py-2 md:py-2 bg-slate-900 border rounded-lg text-white text-center text-base focus:outline-none transition-colors ${
                                      status === "complete"
                                        ? "border-emerald-500/50 focus:border-emerald-500"
                                        : status === "partial"
                                        ? "border-blue-500/50 focus:border-blue-500"
                                        : "border-slate-700 focus:border-amber-500"
                                    }`}
                                  />
                                  <span className="text-slate-400 text-xs md:text-sm">
                                    / {req.targetValue} {challengeUnitLabels[req.unit]}
                                  </span>
                                  {/* Progress percentage badge */}
                                  {progress > 0 && progress < 100 && (
                                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                                      {progress}%
                                    </span>
                                  )}
                                  {progress >= 100 && (
                                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                                      ✓ 100%
                                    </span>
                                  )}
                                </div>
                                
                                {/* Progress bar for this requirement */}
                                <div className="h-1 md:h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      progress >= 100 ? "bg-emerald-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Note */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1.5 md:mb-2">
              Notes (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go today?"
              className="w-full px-3 md:px-4 py-2 md:py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm md:text-base placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              rows={2}
            />
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1.5 md:mb-2">
              Add Photos/Videos (optional)
            </label>
            <MultiMediaUpload
              value={mediaUrls}
              onChange={setMediaUrls}
              prefix="checkins"
              maxFiles={10}
              maxVideoSize={100}
            />
          </div>

          {/* External Link */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-400 mb-1.5 md:mb-2">
              Add Strava or YouTube Link (optional)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                🔗
              </div>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError(null);
                }}
                placeholder="YouTube or Strava URL..."
                className={`w-full pl-9 pr-3 md:pr-4 py-2 md:py-3 bg-slate-800 border rounded-xl text-white text-sm md:text-base placeholder-slate-500 focus:outline-none transition-colors ${
                  linkError ? "border-red-500 focus:border-red-500" : "border-slate-700 focus:border-amber-500"
                }`}
              />
            </div>
            {linkError && (
              <p className="text-xs text-red-400 mt-1">{linkError}</p>
            )}
            {linkUrl.trim() && !linkError && getLinkType(linkUrl) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs">
                  {getLinkType(linkUrl) === "youtube" ? "▶️" : "🏃"}
                </span>
                <span className="text-xs text-slate-400">
                  {getLinkType(linkUrl) === "youtube" ? "YouTube video" : "Strava activity"} will be embedded in your post
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 md:p-6 border-t border-slate-800 bg-slate-900/80 safe-area-bottom">
          {/* Share to Feed Toggle */}
          <label className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 p-2.5 md:p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(e) => handleShareToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 md:w-11 h-5 md:h-6 bg-slate-700 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 md:w-5 h-4 md:h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs md:text-sm font-medium text-white">Share to Feed</span>
              <p className="text-[10px] md:text-xs text-slate-400 truncate">
                {isPastDate ? "Share this update" : "Let others see your progress"}
              </p>
            </div>
            <span className="text-base md:text-lg flex-shrink-0">{shareToFeed ? "📢" : "🔒"}</span>
          </label>

          <div className="flex gap-2 md:gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1 text-sm md:text-base py-2.5 md:py-2">
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(allDone, shareToFeed)}
              disabled={isPending}
              className={`flex-1 text-sm md:text-base py-2.5 md:py-2 ${
                allDone
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : partialCount > 0
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {isPending ? (
                "Saving..."
              ) : allDone ? (
                <>
                  <span className="mr-1 md:mr-2">✓</span>
                  <span className="hidden sm:inline">Complete Check-in</span>
                  <span className="sm:hidden">Complete</span>
                </>
              ) : (
                <>
                  <span className="mr-1 md:mr-2">💾</span>
                  <span className="hidden sm:inline">Save Progress</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

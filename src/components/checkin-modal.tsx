"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrUpdateCheckin } from "@/actions/checkins";
import { Button } from "./ui/button";
import { ImageUploadCompact } from "./image-upload";
import {
  ChallengeType,
  ChallengeUnit,
  challengeTypeLabels,
  challengeUnitLabels,
} from "@/lib/types";

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

interface ExistingCheckin {
  note?: string | null;
  imageUrl?: string | null;
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
  onStreakUpdate,
}: CheckinModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(existingCheckin?.note || "");
  const [imageUrl, setImageUrl] = useState(existingCheckin?.imageUrl || "");
  const [items, setItems] = useState<Record<string, { value: string; isDone: boolean }>>(() => {
    const initial: Record<string, { value: string; isDone: boolean }> = {};
    requirements.forEach((req) => {
      const existingItem = existingCheckin?.items.find(
        (i) => i.requirementId === req.id
      );
      initial[req.id] = {
        value: existingItem?.value?.toString() || "",
        isDone: existingItem?.isDone || false,
      };
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
    const targetValue = req.targetValue ? Number(req.targetValue) : 0;
    if (targetValue === 0) return 0;
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
      
      // For other types, set value to target if marking as done
      if (newIsDone && req.targetValue && !current.value) {
        return {
          ...prev,
          [reqId]: { value: req.targetValue.toString(), isDone: true },
        };
      }
      
      return { ...prev, [reqId]: { ...current, isDone: newIsDone } };
    });
  };

  const handleValueChange = (reqId: string, value: string, req: Requirement) => {
    const numValue = parseFloat(value) || 0;
    const targetValue = req.targetValue ? Number(req.targetValue) : 0;
    const isDone = numValue >= targetValue;
    
    setItems((prev) => ({
      ...prev,
      [reqId]: { value, isDone },
    }));
  };

  const handleSubmit = () => {
    const checkinItems = requirements.map((req) => ({
      requirementId: req.id,
      value: items[req.id].value ? parseFloat(items[req.id].value) : undefined,
      isDone: items[req.id].isDone,
    }));

    startTransition(async () => {
      const result = await createOrUpdateCheckin(
        challengeId,
        today,
        checkinItems,
        note || undefined,
        imageUrl || undefined
      );

      if (result.success) {
        // Update streak in parent component if callback provided
        if (onStreakUpdate && result.streak !== undefined) {
          onStreakUpdate(result.streak);
        }
        onClose();
        // Force refresh to update all UI components with new data
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const allDone = requirements.every((req) => items[req.id]?.isDone);
  const completedCount = requirements.filter((req) => items[req.id]?.isDone).length;
  const partialCount = requirements.filter((req) => {
    const status = getStatus(req, items[req.id]);
    return status === "partial";
  }).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Daily Check-in</h2>
              <p className="text-sm text-slate-400 mt-1">{challengeTitle}</p>
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
          
          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Progress</span>
              <span className={allDone ? "text-emerald-400" : partialCount > 0 ? "text-blue-400" : "text-amber-400"}>
                {completedCount} / {requirements.length} complete
                {partialCount > 0 && !allDone && ` • ${partialCount} in progress`}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  allDone ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${(completedCount / requirements.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Requirements */}
          {requirements.map((req) => {
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
                className={`p-4 rounded-xl border transition-all ${getBorderColor()} ${getBgColor()}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(req.id, req)}
                    className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${getCheckboxStyle()}`}
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${getTextColor()}`}>
                        {isYesNo
                          ? req.title || "Complete this task"
                          : `${req.targetValue} ${challengeUnitLabels[req.unit]}`}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                        {challengeTypeLabels[req.type]}
                      </span>
                    </div>
                    {req.title && !isYesNo && (
                      <p className="text-sm text-slate-400">{req.title}</p>
                    )}

                    {/* Value input for non-yes_no types */}
                    {!isYesNo && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number"
                            value={item.value}
                            onChange={(e) => handleValueChange(req.id, e.target.value, req)}
                            placeholder="0"
                            className={`w-24 px-3 py-2 bg-slate-900 border rounded-lg text-white text-center focus:outline-none transition-colors ${
                              status === "complete"
                                ? "border-emerald-500/50 focus:border-emerald-500"
                                : status === "partial"
                                ? "border-blue-500/50 focus:border-blue-500"
                                : "border-slate-700 focus:border-amber-500"
                            }`}
                          />
                          <span className="text-slate-400 text-sm">
                            / {req.targetValue} {challengeUnitLabels[req.unit]}
                          </span>
                          {/* Progress percentage badge */}
                          {progress > 0 && progress < 100 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                              {progress}%
                            </span>
                          )}
                          {progress >= 100 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                              ✓ 100%
                            </span>
                          )}
                        </div>
                        
                        {/* Progress bar for this requirement */}
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
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

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go today?"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Add Photo (optional)
            </label>
            <ImageUploadCompact
              value={imageUrl || undefined}
              onChange={(url) => setImageUrl(url || "")}
              prefix="checkins"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className={`flex-1 ${
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
                  <span className="mr-2">✓</span>
                  Complete Check-in
                </>
              ) : (
                <>
                  <span className="mr-2">💾</span>
                  Save Progress
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

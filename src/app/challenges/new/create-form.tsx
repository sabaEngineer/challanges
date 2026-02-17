"use client";

import { useActionState, useState, useEffect } from "react";
import { createChallenge } from "@/actions/challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InviteModal } from "@/components/invite-modal";
import { ImageUpload } from "@/components/image-upload";
import {
  ChallengeType,
  ChallengeUnit,
  StreakMode,
  challengeTypeLabels,
  challengeUnitLabels,
  unitsForType,
  streakModeLabels,
  streakModeDescriptions,
} from "@/lib/types";

interface Requirement {
  id: string;
  title: string;
  type: ChallengeType;
  targetValue: string;
  unit: ChallengeUnit;
  group: number; // Group index for OR logic (0, 1, 2, etc.)
}

type DurationType = "one_time" | "duration";

export function CreateChallengeForm() {
  const [state, formAction, isPending] = useActionState(createChallenge, null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [durationType, setDurationType] = useState<DurationType>("duration");
  const [streakMode, setStreakMode] = useState<StreakMode>("strict");
  const [oneTimeDate, setOneTimeDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState("50% 50%");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [createdChallenge, setCreatedChallenge] = useState<{ id: string; title: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // Show modal when challenge is created successfully
  useEffect(() => {
    if (state?.success && state.data) {
      setCreatedChallenge(state.data);
      setShowInviteModal(true);
    }
  }, [state]);

  // Get the current maximum group number
  const maxGroup = requirements.length > 0 
    ? Math.max(...requirements.map(r => r.group)) 
    : -1;

  const addRequirement = (group?: number) => {
    setRequirements([
      ...requirements,
      {
        id: crypto.randomUUID(),
        title: "",
        type: "count",
        targetValue: "",
        unit: "reps",
        group: group !== undefined ? group : (maxGroup >= 0 ? maxGroup : 0),
      },
    ]);
  };

  const addNewGroup = () => {
    setRequirements([
      ...requirements,
      {
        id: crypto.randomUUID(),
        title: "",
        type: "count",
        targetValue: "",
        unit: "reps",
        group: maxGroup + 1,
      },
    ]);
  };

  const removeRequirement = (id: string) => {
    setRequirements(requirements.filter((r) => r.id !== id));
  };

  const updateRequirement = (id: string, field: keyof Requirement, value: string) => {
    setRequirements(
      requirements.map((r) => {
        if (r.id !== id) return r;
        
        if (field === "type") {
          const newType = value as ChallengeType;
          const availableUnits = unitsForType[newType];
          return {
            ...r,
            type: newType,
            unit: availableUnits[0],
            targetValue: newType === "yes_no" ? "" : r.targetValue,
          };
        }
        
        return { ...r, [field]: value };
      })
    );
  };

  // Calculate actual dates for form submission
  const actualStartDate = durationType === "one_time" ? oneTimeDate : startDate;
  const actualEndDate = durationType === "one_time" ? oneTimeDate : endDate;

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <form action={formAction} className="space-y-8">
          {state?.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {state.error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
              Challenge Details
            </h3>

            <Input
              id="title"
              name="title"
              type="text"
              label="Challenge Title"
              placeholder="e.g., 30 Days Fitness Challenge"
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-300"
              >
                Description <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Describe your challenge..."
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Cover Media <span className="text-slate-500">(optional)</span>
              </label>
              <ImageUpload
                value={imageUrl || undefined}
                onChange={(url) => setImageUrl(url)}
                onPositionChange={(pos) => setImagePosition(pos)}
                position={imagePosition}
                prefix="challenges"
                acceptVideo
              />
              <input type="hidden" name="imageUrl" value={imageUrl || ""} />
              <input type="hidden" name="imagePosition" value={imagePosition} />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
              Duration
            </h3>

            {/* Duration Type Selector */}
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  durationType === "one_time"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-700 hover:border-slate-600 bg-slate-900/50"
                }`}
              >
                <input
                  type="radio"
                  name="durationType"
                  value="one_time"
                  checked={durationType === "one_time"}
                  onChange={() => setDurationType("one_time")}
                  className="sr-only"
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📅</span>
                  <span className="font-semibold text-white">One-Time</span>
                </div>
                <span className="text-sm text-slate-400">
                  Single day challenge
                </span>
                {durationType === "one_time" && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>

              <label
                className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  durationType === "duration"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-700 hover:border-slate-600 bg-slate-900/50"
                }`}
              >
                <input
                  type="radio"
                  name="durationType"
                  value="duration"
                  checked={durationType === "duration"}
                  onChange={() => setDurationType("duration")}
                  className="sr-only"
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🗓️</span>
                  <span className="font-semibold text-white">Duration</span>
                </div>
                <span className="text-sm text-slate-400">
                  Multi-day challenge
                </span>
                {durationType === "duration" && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            </div>

            {/* Date Inputs */}
            {durationType === "one_time" ? (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Challenge Date
                </label>
                <input
                  type="date"
                  value={oneTimeDate}
                  onChange={(e) => setOneTimeDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-4 py-4 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:p-2"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={today}
                    required
                    className="w-full px-4 py-4 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || today}
                    required
                    className="w-full px-4 py-4 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:p-2"
                  />
                </div>
              </div>
            )}

            {/* Streak Mode - only for duration challenges */}
            {durationType === "duration" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Streak Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["strict", "flexible"] as StreakMode[]).map((mode) => (
                    <label
                      key={mode}
                      className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        streakMode === mode
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-slate-700 hover:border-slate-600 bg-slate-900/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="streakModeRadio"
                        value={mode}
                        checked={streakMode === mode}
                        onChange={() => setStreakMode(mode)}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{mode === "strict" ? "🔥" : "🌊"}</span>
                        <span className="font-semibold text-white">
                          {streakModeLabels[mode]}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {streakModeDescriptions[mode]}
                      </span>
                      {streakMode === mode && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden inputs for actual form submission */}
            <input type="hidden" name="startDate" value={actualStartDate} />
            <input type="hidden" name="endDate" value={actualEndDate} />
            <input type="hidden" name="streakMode" value={durationType === "duration" ? streakMode : "strict"} />
          </div>

          {/* Requirements */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {durationType === "one_time" ? "Requirements" : "Daily Requirements"}
                </h3>
                <p className="text-sm text-slate-400">
                  {durationType === "one_time" 
                    ? "Add goals to complete for this challenge (optional)"
                    : "Add goals participants need to complete each day (optional)"
                  }
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRequirement()}
              >
                + Add
              </Button>
            </div>

            {requirements.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-lg">
                <p className="text-slate-400 mb-2">No requirements added yet</p>
                <p className="text-sm text-slate-500 mb-4">
                  Add requirements like "5 km morning run" or "100 push-ups"
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addRequirement()}
                >
                  + Add First Requirement
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group requirements by group number */}
                {(() => {
                  const groups = [...new Set(requirements.map(r => r.group))].sort((a, b) => a - b);
                  const hasMultipleGroups = groups.length > 1;
                  
                  return groups.map((groupNum, groupIdx) => {
                    const groupReqs = requirements.filter(r => r.group === groupNum);
                    
                    return (
                      <div key={groupNum}>
                        {/* OR separator between groups */}
                        {groupIdx > 0 && (
                          <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                            <span className="px-4 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full text-sm font-bold text-violet-400">
                              OR
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                          </div>
                        )}
                        
                        {/* Group container */}
                        <div className={`space-y-3 ${hasMultipleGroups ? 'p-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/30' : ''}`}>
                          {hasMultipleGroups && (
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-400 px-2 py-1 bg-slate-800 rounded">
                                Option {groupIdx + 1} - Complete ALL below
                              </span>
                            </div>
                          )}
                          
                          {groupReqs.map((req) => {
                            const globalIndex = requirements.findIndex(r => r.id === req.id);
                            
                            return (
                              <div
                                key={req.id}
                                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-300">
                                    {req.title || `Requirement`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeRequirement(req.id)}
                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Title/Description field */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-slate-400">
                                    Title / Description <span className="text-slate-500">(optional)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={req.title}
                                    onChange={(e) => updateRequirement(req.id, "title", e.target.value)}
                                    placeholder="e.g., Morning run, Push-ups before breakfast..."
                                    className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                  {/* Type */}
                                  <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-400">
                                      Type
                                    </label>
                                    <select
                                      value={req.type}
                                      onChange={(e) => updateRequirement(req.id, "type", e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                      {(Object.keys(challengeTypeLabels) as ChallengeType[]).map((type) => (
                                        <option key={type} value={type}>
                                          {challengeTypeLabels[type]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Target Value */}
                                  <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-400">
                                      Target
                                    </label>
                                    {req.type === "yes_no" ? (
                                      <div className="px-3 py-2 rounded-lg bg-slate-900/30 border border-slate-700/50 text-slate-500 text-sm">
                                        N/A
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        value={req.targetValue}
                                        onChange={(e) => updateRequirement(req.id, "targetValue", e.target.value)}
                                        placeholder="e.g., 5"
                                        min="1"
                                        step="any"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                      />
                                    )}
                                  </div>

                                  {/* Unit */}
                                  <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-400">
                                      Unit
                                    </label>
                                    <select
                                      value={req.unit}
                                      onChange={(e) => updateRequirement(req.id, "unit", e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                      {unitsForType[req.type].map((unit) => (
                                        <option key={unit} value={unit}>
                                          {challengeUnitLabels[unit]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Hidden inputs for form submission */}
                                <input type="hidden" name={`requirements[${globalIndex}][title]`} value={req.title} />
                                <input type="hidden" name={`requirements[${globalIndex}][type]`} value={req.type} />
                                <input type="hidden" name={`requirements[${globalIndex}][targetValue]`} value={req.type === "yes_no" ? "" : req.targetValue} />
                                <input type="hidden" name={`requirements[${globalIndex}][unit]`} value={req.unit} />
                                <input type="hidden" name={`requirements[${globalIndex}][group]`} value={req.group} />
                              </div>
                            );
                          })}
                          
                          {/* Add to this group button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addRequirement(groupNum)}
                            className="w-full text-slate-400"
                          >
                            + Add to this {hasMultipleGroups ? 'option' : 'group'}
                          </Button>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Add OR option button */}
                <div className="pt-4 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewGroup}
                    className="w-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  >
                    <span className="mr-2">⚡</span>
                    Add Alternative Option (OR)
                  </Button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Users can complete ANY ONE option to finish the daily requirement
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? "Creating Challenge..." : "Create Challenge 🚀"}
          </Button>
        </form>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && createdChallenge && (
        <InviteModal
          challengeId={createdChallenge.id}
          challengeTitle={createdChallenge.title}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}

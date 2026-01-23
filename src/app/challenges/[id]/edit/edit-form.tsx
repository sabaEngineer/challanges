"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateChallenge, deleteChallenge } from "@/actions/challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/image-upload";
import {
  ChallengeType,
  ChallengeUnit,
  challengeTypeLabels,
  challengeUnitLabels,
  unitsForType,
} from "@/lib/types";

interface Requirement {
  id: string;
  title: string;
  type: ChallengeType;
  targetValue: string;
  unit: ChallengeUnit;
}

interface ChallengeData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  requirements: Requirement[];
}

interface EditChallengeFormProps {
  challenge: ChallengeData;
}

export function EditChallengeForm({ challenge }: EditChallengeFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateChallenge, null);
  const [requirements, setRequirements] = useState<Requirement[]>(
    challenge.requirements.map((r) => ({
      ...r,
      type: r.type as ChallengeType,
      unit: r.unit as ChallengeUnit,
    }))
  );
  const [imageUrl, setImageUrl] = useState<string | null>(challenge.imageUrl);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOneTime = challenge.startDate === challenge.endDate;

  // Redirect after successful update
  useEffect(() => {
    if (state?.success) {
      router.push(`/challenges/${challenge.id}`);
      router.refresh();
    }
  }, [state?.success, challenge.id, router]);

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      {
        id: `new-${crypto.randomUUID()}`,
        title: "",
        type: "count",
        targetValue: "",
        unit: "reps",
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

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteChallenge(challenge.id);
    if (result.success) {
      router.push("/challenges");
    } else {
      alert(result.error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <form action={formAction} className="space-y-8">
          <input type="hidden" name="id" value={challenge.id} />
          
          {state?.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              Challenge updated successfully!
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
              defaultValue={challenge.title}
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
                defaultValue={challenge.description || ""}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Cover Image <span className="text-slate-500">(optional)</span>
              </label>
              <ImageUpload
                value={imageUrl || undefined}
                onChange={(url) => setImageUrl(url)}
                prefix="challenges"
              />
              <input type="hidden" name="imageUrl" value={imageUrl || ""} />
            </div>
          </div>

          {/* Dates - Read only info */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
              Duration
            </h3>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">
                Challenge dates cannot be modified after creation.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Start Date</div>
                  <div className="text-white font-medium">
                    {new Date(challenge.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">End Date</div>
                  <div className="text-white font-medium">
                    {new Date(challenge.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {isOneTime && (
                <div className="mt-2 text-sm text-violet-400">
                  📅 One-Time Challenge
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {isOneTime ? "Requirements" : "Daily Requirements"}
                </h3>
                <p className="text-sm text-slate-400">
                  Update goals for this challenge
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRequirement}
              >
                + Add
              </Button>
            </div>

            {requirements.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-lg">
                <p className="text-slate-400 mb-2">No requirements</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addRequirement}
                >
                  + Add Requirement
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requirements.map((req, index) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        Requirement #{index + 1}
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

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-400">
                        Title / Description
                      </label>
                      <input
                        type="text"
                        value={req.title}
                        onChange={(e) => updateRequirement(req.id, "title", e.target.value)}
                        placeholder="e.g., Morning run..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
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

                    {/* Hidden inputs */}
                    <input type="hidden" name={`requirements[${index}][id]`} value={req.id.startsWith("new-") ? "" : req.id} />
                    <input type="hidden" name={`requirements[${index}][title]`} value={req.title} />
                    <input type="hidden" name={`requirements[${index}][type]`} value={req.type} />
                    <input type="hidden" name={`requirements[${index}][targetValue]`} value={req.type === "yes_no" ? "" : req.targetValue} />
                    <input type="hidden" name={`requirements[${index}][unit]`} value={req.unit} />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addRequirement}
                  className="w-full"
                >
                  + Add Another Requirement
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card className="mt-6 border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-slate-400 mb-4">
          Deleting a challenge will remove all associated data including members and check-ins.
        </p>
        
        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Delete Challenge
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Challenge"}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}


"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addDefaultRequirement } from "@/actions/challenges";

interface AddDefaultRequirementButtonProps {
  challengeId: string;
}

export function AddDefaultRequirementButton({ challengeId }: AddDefaultRequirementButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await addDefaultRequirement(challengeId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to add requirement");
      }
    });
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
      <div className="text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h3 className="font-semibold text-amber-400 mb-2">No Requirements</h3>
        <p className="text-sm text-slate-400 mb-4">
          This challenge has no requirements. Add a default check-in requirement to enable daily check-ins.
        </p>
        <Button
          onClick={handleClick}
          disabled={isPending}
          className="w-full bg-amber-500 hover:bg-amber-600"
        >
          {isPending ? "Adding..." : "Add Daily Check-in"}
        </Button>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>
    </Card>
  );
}


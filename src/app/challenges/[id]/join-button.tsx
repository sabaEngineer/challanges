"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinChallenge, leaveChallenge } from "@/actions/members";
import { Button } from "@/components/ui/button";

interface JoinButtonProps {
  challengeId: string;
  memberStatus: "active" | "pending" | "left" | "removed" | null;
  isOwner: boolean;
  isEnded: boolean;
  size?: "default" | "sm" | "lg";
}

export function JoinButton({ challengeId, memberStatus, isOwner, isEnded, size = "default" }: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (isOwner) {
    // Owner is automatically a member, show member status
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-lg">
        <span className="text-amber-400">👑</span>
        <span className="text-amber-400 font-medium">You created this challenge</span>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
        <span className="text-slate-400">This challenge has ended</span>
      </div>
    );
  }

  if (memberStatus === "active") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-lg">
          <span className="text-emerald-400">✓</span>
          <span className="text-emerald-400 font-medium">You&apos;re a member</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            startTransition(async () => {
              const result = await leaveChallenge(challengeId);
              if (result.success) {
                router.refresh();
              }
            });
          }}
          disabled={isPending}
          className="text-slate-400 hover:text-red-400"
        >
          Leave
        </Button>
      </div>
    );
  }

  if (memberStatus === "pending") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-lg">
        <span className="text-blue-400">⏳</span>
        <span className="text-blue-400 font-medium">Invitation pending</span>
      </div>
    );
  }

  if (memberStatus === "removed") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg">
        <span className="text-red-400">You were removed from this challenge</span>
      </div>
    );
  }

  // Not a member - show join button
  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          const result = await joinChallenge(challengeId);
          if (result.success) {
            router.refresh();
          } else if (result.error) {
            alert(result.error);
          }
        });
      }}
      disabled={isPending}
      size={size}
      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
    >
      {isPending ? (
        <>
          <span className="animate-spin mr-2">⏳</span>
          Joining...
        </>
      ) : (
        <>
          <span className="mr-2">🚀</span>
          Join Challenge
        </>
      )}
    </Button>
  );
}


"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { acceptInvitation, rejectInvitation } from "@/actions/members";

interface InvitationCardProps {
  invitation: {
    id: string;
    challenge: {
      id: string;
      title: string;
      description: string | null;
      startDate: Date;
      endDate: Date;
      creator: {
        username: string | null;
        fullName: string | null;
        avatarUrl: string | null;
      };
    };
  };
}

export function InvitationCard({ invitation }: InvitationCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const handleAccept = () => {
    startTransition(async () => {
      await acceptInvitation(invitation.challenge.id);
      router.refresh();
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await rejectInvitation(invitation.challenge.id);
      router.refresh();
    });
  };

  const isOneTime = new Date(invitation.challenge.startDate).toDateString() === 
                    new Date(invitation.challenge.endDate).toDateString();

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-3 mb-3">
        {invitation.challenge.creator.avatarUrl ? (
          <img
            src={invitation.challenge.creator.avatarUrl}
            alt={invitation.challenge.creator.username || "User"}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
            {(invitation.challenge.creator.username || invitation.challenge.creator.fullName || "U")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-400">
            <span className="text-white font-medium">
              {invitation.challenge.creator.username 
                ? `@${invitation.challenge.creator.username}` 
                : invitation.challenge.creator.fullName}
            </span>{" "}
            invited you to join
          </p>
          <h3 className="font-semibold text-white truncate">
            {invitation.challenge.title}
          </h3>
        </div>
      </div>

      <div className="text-sm text-slate-400 mb-4">
        {isOneTime ? (
          <span>📅 {formatDate(invitation.challenge.startDate)}</span>
        ) : (
          <span>{formatDate(invitation.challenge.startDate)} - {formatDate(invitation.challenge.endDate)}</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isPending}
          className="flex-1"
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReject}
          disabled={isPending}
          className="flex-1"
        >
          Decline
        </Button>
      </div>
    </Card>
  );
}


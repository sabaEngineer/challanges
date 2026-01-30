"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { MembersModal } from "./members-modal";
import { UserProgressModal } from "./user-progress-modal";

interface Member {
  id: string;
  status: string;
  currentStreak: number;
  bestStreak: number;
  totalValue: string | number;
  user: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

interface MembersListProps {
  members: Member[];
  isStarted: boolean;
  isOwner: boolean;
  challengeId: string;
  challengeTitle: string;
}

export function MembersList({ 
  members, 
  isStarted, 
  isOwner, 
  challengeId,
  challengeTitle 
}: MembersListProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  // Sort active members by streak for leaderboard
  const sortedActiveMembers = [...activeMembers].sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) {
      return b.currentStreak - a.currentStreak;
    }
    return b.bestStreak - a.bestStreak;
  });

  // Show max 5 members in the preview
  const previewMembers = isStarted 
    ? sortedActiveMembers.slice(0, 5)
    : [...activeMembers.slice(0, 3), ...pendingMembers.slice(0, 2)];

  const totalCount = activeMembers.length + pendingMembers.length;

  const handleMemberClick = (member: Member) => {
    // Only show progress for active members
    if (member.status === "active") {
      setSelectedMember(member);
    }
  };

  if (totalCount === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Members</h3>
        <p className="text-slate-400 text-center py-4">No members yet</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isStarted ? "🏆 Leaderboard" : "Members"}
          </h3>
          <span className="text-sm text-slate-400">
            {activeMembers.length} active{pendingMembers.length > 0 && `, ${pendingMembers.length} pending`}
          </span>
        </div>

        <div className="space-y-2">
          {previewMembers.map((member, index) => (
            <button
              key={member.id}
              onClick={() => handleMemberClick(member)}
              disabled={member.status !== "active"}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                member.status === "pending" 
                  ? "bg-amber-500/5 border border-amber-500/20 cursor-default" 
                  : "bg-slate-800/50 hover:bg-slate-800 cursor-pointer"
              }`}
            >
              {/* Rank for leaderboard */}
              {isStarted && member.status === "active" && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? "bg-amber-500 text-white" :
                  index === 1 ? "bg-slate-400 text-white" :
                  index === 2 ? "bg-amber-700 text-white" :
                  "bg-slate-700 text-slate-300"
                }`}>
                  {index + 1}
                </div>
              )}

              {/* Avatar */}
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.username || member.user.fullName || "User"}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                  {(member.user.username || member.user.fullName || "U")[0].toUpperCase()}
                </div>
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">
                  {member.user.fullName || member.user.username || "Anonymous"}
                </div>
                {member.user.username && (
                  <div className="text-sm text-slate-400 truncate">
                    @{member.user.username}
                  </div>
                )}
              </div>

              {/* Status or Streak */}
              {member.status === "pending" ? (
                <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400">
                  Pending
                </span>
              ) : isStarted ? (
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <span>🔥</span>
                    <span>{member.currentStreak}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Best: {member.bestStreak}
                  </div>
                </div>
              ) : (
                <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                  Active
                </span>
              )}

              {/* View indicator for active members */}
              {member.status === "active" && (
                <svg
                  className="w-4 h-4 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        {totalCount > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(true)}
            className="w-full mt-4"
          >
            See All ({totalCount})
          </Button>
        )}
      </Card>

      {showModal && (
        <MembersModal
          members={members}
          isStarted={isStarted}
          isOwner={isOwner}
          challengeId={challengeId}
          challengeTitle={challengeTitle}
          onClose={() => setShowModal(false)}
          onMemberClick={handleMemberClick}
        />
      )}

      {selectedMember && (
        <UserProgressModal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          challengeId={challengeId}
          userId={selectedMember.user.id}
          userName={selectedMember.user.fullName || selectedMember.user.username || "User"}
        />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

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

interface MembersModalProps {
  members: Member[];
  isStarted: boolean;
  isOwner: boolean;
  challengeId: string;
  challengeTitle: string;
  onClose: () => void;
  onMemberClick?: (member: Member) => void;
}

export function MembersModal({
  members,
  isStarted,
  isOwner,
  challengeId,
  challengeTitle,
  onClose,
  onMemberClick,
}: MembersModalProps) {
  const [filter, setFilter] = useState<"all" | "active" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  // Sort active members by streak
  const sortedActiveMembers = [...activeMembers].sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) {
      return b.currentStreak - a.currentStreak;
    }
    return b.bestStreak - a.bestStreak;
  });

  // Filter members
  let filteredMembers: Member[] = [];
  if (filter === "all") {
    filteredMembers = [...sortedActiveMembers, ...pendingMembers];
  } else if (filter === "active") {
    filteredMembers = sortedActiveMembers;
  } else {
    filteredMembers = pendingMembers;
  }

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredMembers = filteredMembers.filter((m) =>
      m.user.username?.toLowerCase().includes(query) ||
      m.user.fullName?.toLowerCase().includes(query)
    );
  }

  const handleMemberClick = (member: Member) => {
    if (member.status === "active" && onMemberClick) {
      onClose(); // Close this modal first
      onMemberClick(member);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">
              {isStarted ? "🏆 Leaderboard" : "Members"}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 text-sm">{challengeTitle}</p>
          <p className="text-xs text-slate-500 mt-1">Click on a member to view their progress</p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === "active"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Active ({activeMembers.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Pending ({pendingMembers.length})
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[400px]">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {searchQuery ? "No members found" : "No members in this category"}
            </div>
          ) : (
            filteredMembers.map((member, index) => {
              const rank = filter === "active" || (filter === "all" && member.status === "active")
                ? sortedActiveMembers.findIndex((m) => m.id === member.id) + 1
                : null;

              return (
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
                  {/* Rank for active members when challenge started */}
                  {isStarted && member.status === "active" && rank && (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        rank === 1
                          ? "bg-amber-500 text-white"
                          : rank === 2
                          ? "bg-slate-400 text-white"
                          : rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {rank}
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
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

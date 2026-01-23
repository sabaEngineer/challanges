"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { searchUsers, getUsers, inviteMultipleUsers } from "@/actions/members";

interface User {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  email: string;
}

interface InviteModalProps {
  challengeId: string;
  challengeTitle: string;
  onClose: () => void;
}

export function InviteModal({ challengeId, challengeTitle, onClose }: InviteModalProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch initial users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const result = await getUsers([]);
      setUsers(result);
      setIsLoading(false);
    };
    fetchUsers();
  }, []);

  // Search users when query changes
  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim().length === 0) {
        const result = await getUsers([]);
        setUsers(result);
        return;
      }

      setIsLoading(true);
      const result = await searchUsers(searchQuery, []);
      setUsers(result);
      setIsLoading(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleInvite = () => {
    if (selectedUsers.size === 0) return;

    setError(null);
    startTransition(async () => {
      const result = await inviteMultipleUsers(challengeId, Array.from(selectedUsers));
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          router.push(`/challenges/${challengeId}`);
        }, 1500);
      } else {
        setError(result.error || "Failed to send invitations");
      }
    });
  };

  const handleSkip = () => {
    router.push(`/challenges/${challengeId}`);
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
        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Invitations Sent!</h2>
            <p className="text-slate-400">
              {selectedUsers.size} user{selectedUsers.size > 1 ? "s" : ""} invited to your challenge
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white">Invite Members</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                Invite friends to join <span className="text-amber-400 font-medium">"{challengeTitle}"</span>
              </p>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-700">
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
                  placeholder="Search by username, name, or email..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {searchQuery ? "No users found" : "No users available"}
                </div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedUsers.has(user.id)
                        ? "bg-amber-500/20 border-2 border-amber-500"
                        : "bg-slate-800/50 border-2 border-transparent hover:border-slate-600"
                    }`}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username || user.fullName || "User"}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                        {(user.username || user.fullName || user.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">
                        {user.fullName || user.username || "Anonymous"}
                      </div>
                      <div className="text-sm text-slate-400">
                        {user.username ? `@${user.username}` : user.email}
                      </div>
                    </div>
                    {selectedUsers.has(user.id) && (
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 pb-2">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
              <div className="flex items-center gap-3">
                {selectedUsers.size > 0 && (
                  <span className="text-sm text-slate-400">
                    {selectedUsers.size} selected
                  </span>
                )}
                <Button
                  onClick={handleInvite}
                  disabled={selectedUsers.size === 0 || isPending}
                >
                  {isPending ? "Sending..." : `Invite${selectedUsers.size > 0 ? ` (${selectedUsers.size})` : ""}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}


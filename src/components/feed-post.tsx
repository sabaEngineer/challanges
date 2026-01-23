"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { toggleReaction, type ReactionType } from "@/actions/reactions";
import { createComment, deleteComment, getPostComments } from "@/actions/comments";
import { getEarnedBadges } from "@/lib/badges";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  isOwn: boolean;
}

interface FeedPostProps {
  id: string;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    completedChallenges?: number;
  };
  challenge: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
  checkinDate: Date;
  note: string | null;
  imageUrl: string | null;
  createdAt: Date;
  items: {
    id: string;
    value: number | null;
    isDone: boolean;
    requirement: {
      id: string;
      title: string | null;
      type: string;
      targetValue: number | null;
      unit: string;
    };
  }[];
  isOwnPost: boolean;
  initialReactions?: {
    counts: Record<ReactionType, number>;
    userReacted: ReactionType[];
  };
  initialCommentCount?: number;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire", activeColor: "text-amber-400" },
  { type: "strong", emoji: "💪", label: "Strong", activeColor: "text-emerald-400" },
  { type: "kudos", emoji: "👏", label: "Kudos", activeColor: "text-blue-400" },
  { type: "not_bad", emoji: "👍", label: "Not Bad", activeColor: "text-violet-400" },
];

export function FeedPost({ 
  id,
  user, 
  challenge, 
  checkinDate, 
  note, 
  imageUrl, 
  createdAt, 
  items,
  isOwnPost,
  initialReactions,
  initialCommentCount = 0,
}: FeedPostProps) {
  const [isPending, startTransition] = useTransition();
  const [reactions, setReactions] = useState(initialReactions || {
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0 },
    userReacted: [],
  });
  
  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const completedItems = items.filter((item) => item.isDone).length;
  const totalItems = items.length;
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const formatUnit = (unit: string) => {
    const unitMap: Record<string, string> = {
      reps: "reps",
      steps: "steps",
      km: "km",
      meters: "m",
      minutes: "min",
      hours: "hrs",
      pages: "pages",
      calories: "cal",
      liters: "L",
      workouts: "workouts",
    };
    return unitMap[unit] || unit;
  };

  const handleReaction = (type: ReactionType) => {
    const isCurrentlyReacted = reactions.userReacted.includes(type);
    
    setReactions((prev) => ({
      counts: {
        ...prev.counts,
        [type]: isCurrentlyReacted ? prev.counts[type] - 1 : prev.counts[type] + 1,
      },
      userReacted: isCurrentlyReacted
        ? prev.userReacted.filter((r) => r !== type)
        : [...prev.userReacted, type],
    }));

    startTransition(async () => {
      const result = await toggleReaction(id, type);
      if (result.error) {
        setReactions((prev) => ({
          counts: {
            ...prev.counts,
            [type]: isCurrentlyReacted ? prev.counts[type] + 1 : prev.counts[type] - 1,
          },
          userReacted: isCurrentlyReacted
            ? [...prev.userReacted, type]
            : prev.userReacted.filter((r) => r !== type),
        }));
      }
    });
  };

  const loadComments = async () => {
    if (comments.length > 0) return; // Already loaded
    setLoadingComments(true);
    try {
      const fetchedComments = await getPostComments(id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
    setLoadingComments(false);
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

  const handleCommentClick = async () => {
    if (!showComments) {
      await loadComments();
      setShowComments(true);
    }
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const result = await createComment(id, newComment);
      if (result.success && result.comment) {
        setComments((prev) => [...prev, result.comment as Comment]);
        setCommentCount((prev) => prev + 1);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentCount((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const totalReactions = Object.values(reactions.counts).reduce((a, b) => a + b, 0);

  return (
    <Card className="overflow-hidden">
      {/* Post Header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/profile/${user.id}`} className="shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName || "User"}
              className="w-12 h-12 rounded-full ring-2 ring-slate-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold">
              {(user.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white">
            <span className="font-semibold">{user.fullName || "Anonymous"}</span>
            {/* User Badge */}
            {user.completedChallenges !== undefined && (() => {
              const earnedBadges = getEarnedBadges(user.completedChallenges);
              const highestBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;
              if (highestBadge) {
                return (
                  <span 
                    className="ml-1.5 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600"
                    title={`${highestBadge.name} - ${highestBadge.description}`}
                  >
                    <span>{highestBadge.icon}</span>
                    <span className="text-slate-300 hidden sm:inline">{highestBadge.name}</span>
                  </span>
                );
              }
              return null;
            })()}
            {isOwnPost && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                You
              </span>
            )}
            <span className="text-slate-400">
              {completedItems === totalItems 
                ? " completed daily check-in for " 
                : ` made progress on `}
            </span>
            <Link 
              href={`/challenges/${challenge.id}`}
              className="font-semibold text-amber-400 hover:underline"
            >
              {challenge.title}
            </Link>
            {completedItems === totalItems && <span className="ml-1">🔥</span>}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatTimeAgo(createdAt)}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        {/* Status & Date */}
        <div className="flex items-center gap-2 mb-3 pl-14">
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            completedItems === totalItems 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-blue-500/20 text-blue-400"
          }`}>
            {completedItems === totalItems ? "✓ All done" : `${completedItems}/${totalItems} completed`}
          </div>
          <span className="text-xs text-slate-500">
            {new Date(checkinDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Requirements Progress */}
        <div className="space-y-2 mb-4">
          {items.map((item) => {
            const progress = item.requirement.targetValue && item.value
              ? Math.min((item.value / item.requirement.targetValue) * 100, 100)
              : item.isDone ? 100 : 0;

            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  item.isDone 
                    ? "bg-emerald-500 text-white" 
                    : progress > 0 
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700 text-slate-400"
                }`}>
                  {item.isDone ? "✓" : progress > 0 ? "◐" : "○"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={item.isDone ? "text-white" : "text-slate-400"}>
                      {item.requirement.title || item.requirement.type}
                    </span>
                    {item.requirement.type !== "yes_no" && item.value !== null && (
                      <span className="text-slate-400">
                        {item.value}{item.requirement.targetValue ? `/${item.requirement.targetValue}` : ""} {formatUnit(item.requirement.unit)}
                      </span>
                    )}
                  </div>
                  {item.requirement.type !== "yes_no" && item.requirement.targetValue && (
                    <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          item.isDone ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        {note && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
            <p className="text-slate-300 text-sm">{note}</p>
          </div>
        )}

        {/* Image */}
        {imageUrl && (
          <div className="rounded-lg overflow-hidden mb-4">
            <img
              src={imageUrl}
              alt="Check-in"
              className="w-full max-h-96 object-cover"
            />
          </div>
        )}
      </div>

      {/* Reactions & Comments Summary */}
      {(totalReactions > 0 || commentCount > 0) && (
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
          {totalReactions > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {REACTIONS.filter((r) => reactions.counts[r.type] > 0)
                  .slice(0, 3)
                  .map((r) => (
                    <span key={r.type} className="text-sm">{r.emoji}</span>
                  ))}
              </div>
              <span className="text-sm text-slate-400">{totalReactions}</span>
            </div>
          ) : <div />}
          {commentCount > 0 && (
            <button
              onClick={handleToggleComments}
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              {commentCount} comment{commentCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Post Footer - Reactions & Comment Button */}
      <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {REACTIONS.map((reaction) => {
            const isReacted = reactions.userReacted.includes(reaction.type);
            const count = reactions.counts[reaction.type];
            
            return (
              <button
                key={reaction.type}
                onClick={() => handleReaction(reaction.type)}
                disabled={isPending}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all text-sm ${
                  isReacted
                    ? `bg-slate-700/50 ${reaction.activeColor}`
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                } ${isPending ? "opacity-50" : ""}`}
              >
                <span>{reaction.emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-all text-sm"
        >
          <span>💬</span>
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-slate-700/50">
          {/* Comments List */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {loadingComments ? (
              <div className="text-center py-4 text-slate-400 text-sm">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${comment.user.id}`} className="shrink-0">
                    {comment.user.avatarUrl ? (
                      <img
                        src={comment.user.avatarUrl}
                        alt={comment.user.fullName || "User"}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold">
                        {(comment.user.fullName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">
                          {comment.user.fullName || "Anonymous"}
                        </span>
                        {comment.isOwn && (
                          <span className="text-xs px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 mt-0.5">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                      {comment.isOwn && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="p-4 pt-0">
            <div className="flex gap-2">
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || submittingComment}
                className="rounded-full px-4"
              >
                {submittingComment ? "..." : "Post"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}

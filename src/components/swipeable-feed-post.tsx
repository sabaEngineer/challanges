"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { toggleReaction, type ReactionType } from "@/actions/reactions";
import { createComment, deleteComment, getPostComments, toggleCommentLike } from "@/actions/comments";
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
  likeCount: number;
  isLiked: boolean;
}

interface ReactionUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface CheckinData {
  id: string;
  challenge: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
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
  reactions: {
    counts: Record<ReactionType, number>;
    userReacted: ReactionType[];
    reactors?: Record<ReactionType, ReactionUser[]>;
  };
  commentCount: number;
}

interface SwipeableFeedPostProps {
  groupKey: string;
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    completedChallenges?: number;
  };
  checkinDate: Date;
  isOwnPost: boolean;
  checkins: CheckinData[];
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire", activeColor: "text-amber-400" },
  { type: "strong", emoji: "💪", label: "Strong", activeColor: "text-emerald-400" },
  { type: "kudos", emoji: "👏", label: "Kudos", activeColor: "text-blue-400" },
  { type: "not_bad", emoji: "👍", label: "Not Bad", activeColor: "text-violet-400" },
];

export function SwipeableFeedPost({
  groupKey,
  user,
  checkinDate,
  isOwnPost,
  checkins,
}: SwipeableFeedPostProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  
  const [reactionsState, setReactionsState] = useState<Record<string, {
    counts: Record<ReactionType, number>;
    userReacted: ReactionType[];
    reactors?: Record<ReactionType, ReactionUser[]>;
  }>>(() => {
    const initial: Record<string, typeof checkins[0]["reactions"]> = {};
    checkins.forEach(c => {
      initial[c.id] = c.reactions;
    });
    return initial;
  });

  const [showComments, setShowComments] = useState(false);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentCountMap, setCommentCountMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    checkins.forEach(c => {
      initial[c.id] = c.commentCount;
    });
    return initial;
  });
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const currentCheckin = checkins[currentIndex];
  const currentReactions = reactionsState[currentCheckin.id] || currentCheckin.reactions;
  const currentCommentCount = commentCountMap[currentCheckin.id] || 0;

  const goToNext = () => {
    if (currentIndex < checkins.length - 1 && !isAnimating) {
      setSlideDirection("left");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setShowComments(false);
        setSlideDirection(null);
        setIsAnimating(false);
      }, 200);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0 && !isAnimating) {
      setSlideDirection("right");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setShowComments(false);
        setSlideDirection(null);
        setIsAnimating(false);
      }, 200);
    }
  };

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
      reps: "reps", steps: "steps", km: "km", meters: "m",
      minutes: "min", hours: "hrs", pages: "pages", calories: "cal",
      liters: "L", workouts: "workouts", lari: "₾",
    };
    return unitMap[unit] || unit;
  };

  const handleReaction = (type: ReactionType) => {
    const checkinId = currentCheckin.id;
    const reactions = reactionsState[checkinId];
    const currentReaction = reactions.userReacted[0];
    const isRemovingReaction = currentReaction === type;

    setReactionsState(prev => {
      const newCounts = { ...prev[checkinId].counts };
      if (currentReaction) {
        newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
      }
      if (!isRemovingReaction) {
        newCounts[type] = newCounts[type] + 1;
      }
      return {
        ...prev,
        [checkinId]: {
          ...prev[checkinId],
          counts: newCounts,
          userReacted: isRemovingReaction ? [] : [type],
        },
      };
    });

    startTransition(async () => {
      const result = await toggleReaction(checkinId, type);
      if (result.error) {
        setReactionsState(prev => {
          const newCounts = { ...prev[checkinId].counts };
          if (currentReaction) {
            newCounts[currentReaction] = newCounts[currentReaction] + 1;
          }
          if (!isRemovingReaction) {
            newCounts[type] = Math.max(0, newCounts[type] - 1);
          }
          return {
            ...prev,
            [checkinId]: {
              ...prev[checkinId],
              counts: newCounts,
              userReacted: currentReaction ? [currentReaction] : [],
            },
          };
        });
      }
    });
  };

  const loadComments = async () => {
    const checkinId = currentCheckin.id;
    if (commentsMap[checkinId]) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await getPostComments(checkinId);
      setCommentsMap(prev => ({ ...prev, [checkinId]: fetchedComments }));
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    const checkinId = currentCheckin.id;
    setSubmittingComment(true);
    try {
      const result = await createComment(checkinId, newComment);
      if (result.success && result.comment) {
        const newCommentData: Comment = {
          ...result.comment as Comment,
          likeCount: 0,
          isLiked: false,
        };
        setCommentsMap(prev => ({
          ...prev,
          [checkinId]: [...(prev[checkinId] || []), newCommentData],
        }));
        setCommentCountMap(prev => ({ ...prev, [checkinId]: (prev[checkinId] || 0) + 1 }));
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const checkinId = currentCheckin.id;
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        setCommentsMap(prev => ({
          ...prev,
          [checkinId]: (prev[checkinId] || []).filter(c => c.id !== commentId),
        }));
        setCommentCountMap(prev => ({ ...prev, [checkinId]: Math.max(0, (prev[checkinId] || 0) - 1) }));
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const checkinId = currentCheckin.id;
    setCommentsMap(prev => ({
      ...prev,
      [checkinId]: (prev[checkinId] || []).map(c =>
        c.id === commentId
          ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 }
          : c
      ),
    }));

    try {
      const result = await toggleCommentLike(commentId);
      if (result.error) {
        setCommentsMap(prev => ({
          ...prev,
          [checkinId]: (prev[checkinId] || []).map(c =>
            c.id === commentId
              ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 }
              : c
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to like comment:", error);
    }
  };

  const totalReactions = Object.values(currentReactions.counts).reduce((a, b) => a + b, 0);
  const currentComments = commentsMap[currentCheckin.id] || [];

  const isVideo = (url: string) => {
    return url.includes("/videos/") || 
           url.toLowerCase().includes(".mp4") || 
           url.toLowerCase().includes(".webm") || 
           url.toLowerCase().includes(".mov");
  };

  return (
    <Card className="overflow-hidden">
      {/* Header + Progress bars + Navigation at top - only when multiple check-ins */}
      {checkins.length > 1 && (
        <div className="px-3 pt-3 pb-2 border-b border-slate-700/50">
          {/* Title */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400">🔥</span>
            <span className="text-sm font-medium text-white">
              {user.fullName?.split(' ')[0] || 'User'}'s daily check-ins
            </span>
            <span className="text-xs text-slate-500">
              • {new Date(checkinDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          
          {/* Progress bars - Instagram style */}
          <div className="flex gap-1 mb-2">
            {checkins.map((_, idx) => (
              <div 
                key={idx} 
                className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden cursor-pointer"
                onClick={() => { setCurrentIndex(idx); setShowComments(false); }}
              >
                <div 
                  className={`h-full bg-amber-400 transition-all duration-300 ${
                    idx < currentIndex ? "w-full" : idx === currentIndex ? "w-full" : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
          
          {/* Prev/Next buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className={`flex items-center gap-1 text-sm transition-all ${
                currentIndex === 0 
                  ? "text-slate-600 cursor-not-allowed" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Prev</span>
            </button>
            
            <span className="text-xs text-slate-500">{currentIndex + 1} of {checkins.length}</span>
            
            <button
              onClick={goToNext}
              disabled={currentIndex === checkins.length - 1}
              className={`flex items-center gap-1 text-sm transition-all ${
                currentIndex === checkins.length - 1 
                  ? "text-slate-600 cursor-not-allowed" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Next</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* User Header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/profile/${user.id}`} className="shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName || "User"} className="w-12 h-12 rounded-full ring-2 ring-slate-700" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold">
              {(user.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white">
            <span className="font-semibold">{user.fullName || "Anonymous"}</span>
            {user.completedChallenges !== undefined && (() => {
              const earnedBadges = getEarnedBadges(user.completedChallenges);
              const highestBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;
              if (highestBadge) {
                return (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600" title={`${highestBadge.name} - ${highestBadge.description}`}>
                    <span>{highestBadge.icon}</span>
                  </span>
                );
              }
              return null;
            })()}
            {isOwnPost && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">You</span>
            )}
            <span className="text-slate-400">
              {(() => {
                const completedItems = currentCheckin.items.filter(item => item.isDone).length;
                const totalItems = currentCheckin.items.length;
                return completedItems === totalItems 
                  ? " completed daily check-in for " 
                  : " made progress on ";
              })()}
            </span>
            <Link 
              href={`/challenges/${currentCheckin.challenge.id}`}
              className="font-semibold text-amber-400 hover:underline"
            >
              {currentCheckin.challenge.title}
            </Link>
            {(() => {
              const completedItems = currentCheckin.items.filter(item => item.isDone).length;
              const totalItems = currentCheckin.items.length;
              return completedItems === totalItems ? <span className="ml-1">🔥</span> : null;
            })()}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">{formatTimeAgo(currentCheckin.createdAt)}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className={`transition-opacity duration-200 ${isAnimating ? "opacity-50" : "opacity-100"}`}>
        <div className={`px-4 pb-4 transition-transform duration-200 ${
          slideDirection === "left" ? "-translate-x-4" : 
          slideDirection === "right" ? "translate-x-4" : ""
        }`}>
          {/* Status & Date */}
          {(() => {
            const completedItems = currentCheckin.items.filter(item => item.isDone).length;
            const totalItems = currentCheckin.items.length;
            return (
              <div className="flex items-center gap-2 mb-3">
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
            );
          })()}

          {/* Requirements */}
          <div className="space-y-1.5 mb-4">
            {currentCheckin.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={item.isDone ? "text-emerald-400" : "text-slate-500"}>
                  {item.isDone ? "✓" : "○"}
                </span>
                <span className={item.isDone ? "text-white" : "text-slate-400"}>
                  {item.requirement.title || item.requirement.type}
                </span>
                {item.requirement.type !== "yes_no" && item.value !== null && (
                  <span className="text-slate-500 ml-auto">
                    {item.value}{item.requirement.targetValue ? `/${item.requirement.targetValue}` : ""} {formatUnit(item.requirement.unit)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Note */}
          {currentCheckin.note && (
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
              <p className="text-slate-300 text-sm">{currentCheckin.note}</p>
            </div>
          )}

          {/* Media */}
          {currentCheckin.imageUrl && (
            <div className="rounded-lg overflow-hidden mb-4 bg-slate-800">
              {isVideo(currentCheckin.imageUrl) ? (
                <video src={currentCheckin.imageUrl} controls preload="metadata" className="w-full h-auto" />
              ) : (
                <img src={currentCheckin.imageUrl} alt="Check-in" className="w-full h-auto" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reactions Summary */}
      {(totalReactions > 0 || currentCommentCount > 0) && (
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
          {totalReactions > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {REACTIONS.filter(r => currentReactions.counts[r.type] > 0).slice(0, 3).map(r => (
                  <span key={r.type} className="text-sm">{r.emoji}</span>
                ))}
              </div>
              <span className="text-sm text-slate-400">{totalReactions}</span>
            </div>
          ) : <div />}
          {currentCommentCount > 0 && (
            <button onClick={handleToggleComments} className="text-sm text-slate-400 hover:text-slate-300">
              {currentCommentCount} comment{currentCommentCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Reactions & Comment Button */}
      <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {REACTIONS.map((reaction) => {
            const isReacted = currentReactions.userReacted.includes(reaction.type);
            const count = currentReactions.counts[reaction.type];
            return (
              <button
                key={reaction.type}
                onClick={() => handleReaction(reaction.type)}
                disabled={isPending}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all text-sm ${isReacted ? `bg-slate-700/50 ${reaction.activeColor}` : "text-slate-400 hover:bg-slate-800/50"} ${isPending ? "opacity-50" : ""}`}
              >
                <span>{reaction.emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={handleToggleComments} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 text-sm">
          <span>💬</span>
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-slate-700/50">
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {loadingComments ? (
              <div className="text-center py-4 text-slate-400 text-sm">Loading comments...</div>
            ) : currentComments.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">No comments yet. Be the first!</div>
            ) : (
              currentComments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${comment.user.id}`} className="shrink-0">
                    {comment.user.avatarUrl ? (
                      <img src={comment.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold">
                        {(comment.user.fullName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">{comment.user.fullName || "Anonymous"}</span>
                        {comment.isOwn && <span className="text-xs px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">You</span>}
                      </div>
                      <p className="text-sm text-slate-300 mt-0.5">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-xs text-slate-500">{formatTimeAgo(comment.createdAt)}</span>
                      <button onClick={() => handleLikeComment(comment.id)} className={`flex items-center gap-1 text-xs ${comment.isLiked ? "text-red-400" : "text-slate-500 hover:text-red-400"}`}>
                        <span>{comment.isLiked ? "❤️" : "🤍"}</span>
                        {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                      </button>
                      {comment.isOwn && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmitComment} className="p-4 pt-0">
            <div className="flex gap-2 items-center">
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <Button type="submit" size="sm" disabled={!newComment.trim() || submittingComment} className="rounded-full px-4">
                {submittingComment ? "..." : "Post"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}

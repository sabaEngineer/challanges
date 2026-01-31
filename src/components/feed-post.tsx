"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
    reactors?: Record<ReactionType, ReactionUser[]>;
  };
  initialCommentCount?: number;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire", activeColor: "text-amber-400" },
  { type: "heart", emoji: "❤️", label: "Love", activeColor: "text-red-400" },
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
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 },
    userReacted: [] as ReactionType[],
    reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] } as Record<ReactionType, ReactionUser[]>,
  });
  
  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // State for mobile-friendly reaction tooltip
  const [activeReactionTooltip, setActiveReactionTooltip] = useState<ReactionType | null>(null);
  const [showAllReactorsModal, setShowAllReactorsModal] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Common emojis for quick access
  const EMOJI_LIST = [
    "😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😊",
    "💪", "🔥", "⭐", "🎉", "👏", "🙌", "💯", "❤️",
    "🏆", "🎯", "✨", "🚀", "💥", "👍", "🤝", "🙏",
  ];
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [showEmojiPicker]);
  
  const insertEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    commentInputRef.current?.focus();
  };
  
  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setActiveReactionTooltip(null);
      }
    };
    
    if (activeReactionTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [activeReactionTooltip]);

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
    const currentReaction = reactions.userReacted[0]; // User can only have one reaction
    const isRemovingReaction = currentReaction === type;
    
    // Optimistic update
    setReactions((prev) => {
      const newCounts = { ...prev.counts };
      
      // Remove old reaction if exists
      if (currentReaction) {
        newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
      }
      
      // Add new reaction if not removing
      if (!isRemovingReaction) {
        newCounts[type] = newCounts[type] + 1;
      }
      
      return {
        ...prev,
        counts: newCounts,
        userReacted: isRemovingReaction ? [] : [type],
      };
    });

    startTransition(async () => {
      const result = await toggleReaction(id, type);
      if (result.error) {
        // Revert on error
        setReactions((prev) => {
          const newCounts = { ...prev.counts };
          
          // Undo: re-add old reaction
          if (currentReaction) {
            newCounts[currentReaction] = newCounts[currentReaction] + 1;
          }
          
          // Undo: remove new reaction
          if (!isRemovingReaction) {
            newCounts[type] = Math.max(0, newCounts[type] - 1);
          }
          
          return {
            ...prev,
            counts: newCounts,
            userReacted: currentReaction ? [currentReaction] : [],
          };
        });
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
        const newCommentData: Comment = {
          ...result.comment as Comment,
          likeCount: 0,
          isLiked: false,
        };
        setComments((prev) => [...prev, newCommentData]);
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

  const handleLikeComment = async (commentId: string) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              isLiked: !c.isLiked,
              likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1,
            }
          : c
      )
    );

    try {
      const result = await toggleCommentLike(commentId);
      if (result.error) {
        // Revert on error
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  isLiked: !c.isLiked,
                  likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1,
                }
              : c
          )
        );
      }
    } catch (error) {
      console.error("Failed to like comment:", error);
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
              className="w-12 h-12 rounded-full ring-2 ring-slate-700 object-cover"
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
            const isOverAchieved = item.requirement.type !== "yes_no" && 
              item.value !== null && 
              item.requirement.targetValue !== null && 
              item.value > item.requirement.targetValue;
            const overAmount = isOverAchieved ? item.value! - item.requirement.targetValue! : 0;

            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  item.isDone 
                    ? "bg-emerald-500 text-white" 
                    : progress > 0 
                      ? "bg-blue-500 text-white"
                      : "bg-red-500/20 text-red-400"
                }`}>
                  {item.isDone ? "✓" : progress > 0 ? "◐" : "✗"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={item.isDone ? "text-white" : "text-slate-400"}>
                      {item.requirement.title || item.requirement.type}
                    </span>
                    {item.requirement.type !== "yes_no" && (
                      <span className="flex items-center gap-1 text-slate-400">
                        {item.value ?? 0}{item.requirement.targetValue ? `/${item.requirement.targetValue}` : ""} {formatUnit(item.requirement.unit)}
                        {isOverAchieved && (
                          <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                            +{overAmount}
                          </span>
                        )}
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

        {/* Media (Image or Video) */}
        {imageUrl && (
          <div className="rounded-lg overflow-hidden mb-4 bg-slate-800">
            {imageUrl.includes("/videos/") || 
             imageUrl.toLowerCase().includes(".mp4") || 
             imageUrl.toLowerCase().includes(".webm") || 
             imageUrl.toLowerCase().includes(".mov") ? (
              <video
                src={`${imageUrl}#t=0.1`}
                controls
                preload="metadata"
                className="w-full h-auto"
              />
            ) : (
              <img
                src={imageUrl}
                alt="Check-in"
                className="w-full h-auto"
              />
            )}
          </div>
        )}
      </div>

      {/* Reactions & Comments Summary */}
      {(totalReactions > 0 || commentCount > 0) && (
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
          {totalReactions > 0 ? (
            <button
              onClick={() => setShowAllReactorsModal(true)}
              className="flex items-center gap-2 hover:bg-slate-800/30 rounded-full px-2 py-1 -mx-2 transition-colors"
            >
              <div className="flex -space-x-1">
                {REACTIONS.filter((r) => reactions.counts[r.type] > 0)
                  .slice(0, 3)
                  .map((r) => (
                    <span key={r.type} className="text-sm">{r.emoji}</span>
                  ))}
              </div>
              <span className="text-sm text-slate-400">{totalReactions}</span>
            </button>
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

      {/* All Reactors Modal */}
      {showAllReactorsModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllReactorsModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Reactions</h3>
              <button
                onClick={() => setShowAllReactorsModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(70vh-4rem)]">
              {REACTIONS.map((reaction) => {
                const reactors = reactions.reactors?.[reaction.type] || [];
                if (reactors.length === 0) return null;
                
                return (
                  <div key={reaction.type} className="border-b border-slate-800 last:border-b-0">
                    <div className="px-4 py-2 bg-slate-800/50 flex items-center gap-2">
                      <span className="text-lg">{reaction.emoji}</span>
                      <span className="text-sm font-medium text-slate-300">{reaction.label}</span>
                      <span className="text-xs text-slate-500">({reactors.length})</span>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                      {reactors.map((reactor) => (
                        <Link
                          key={reactor.id}
                          href={`/profile/${reactor.id}`}
                          onClick={() => setShowAllReactorsModal(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors"
                        >
                          {reactor.avatarUrl ? (
                            <img
                              src={reactor.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold">
                              {(reactor.fullName || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-white">
                            {reactor.fullName || reactor.username || "Anonymous"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Post Footer - Reactions & Comment Button */}
      <div className="px-0 sm:px-4 py-2 sm:py-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {REACTIONS.map((reaction) => {
            const isReacted = reactions.userReacted.includes(reaction.type);
            const count = reactions.counts[reaction.type];
            const reactors = reactions.reactors?.[reaction.type] || [];
            const isTooltipActive = activeReactionTooltip === reaction.type;
            
            return (
              <div key={reaction.type} className="relative group" ref={isTooltipActive ? tooltipRef : null}>
                <button
                  onClick={() => handleReaction(reaction.type)}
                  disabled={isPending}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full transition-all text-sm ${
                    isReacted
                      ? `bg-slate-700/50 ${reaction.activeColor}`
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                  } ${isPending ? "opacity-50" : ""}`}
                >
                  <span>{reaction.emoji}</span>
                  {count > 0 && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (reactors.length > 0) {
                          setActiveReactionTooltip(isTooltipActive ? null : reaction.type);
                        }
                      }}
                      className="cursor-pointer hover:underline"
                    >
                      {count}
                    </span>
                  )}
                </button>
                
                {/* Tooltip showing who reacted - desktop hover + mobile tap */}
                {reactors.length > 0 && (
                  <div 
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 ${
                      isTooltipActive ? 'block' : 'hidden group-hover:block'
                    }`}
                  >
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-max max-w-[200px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-slate-400">{reaction.label}</p>
                        {/* Close button for mobile */}
                        {isTooltipActive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveReactionTooltip(null);
                            }}
                            className="text-slate-500 hover:text-slate-300 text-xs ml-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {reactors.slice(0, 5).map((reactor) => (
                          <Link
                            key={reactor.id}
                            href={`/profile/${reactor.id}`}
                            onClick={() => setActiveReactionTooltip(null)}
                            className="flex items-center gap-2 hover:bg-slate-700/50 rounded px-1 py-0.5 -mx-1"
                          >
                            {reactor.avatarUrl ? (
                              <img
                                src={reactor.avatarUrl}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[8px] font-bold">
                                {(reactor.fullName || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs text-white truncate">
                              {reactor.fullName || reactor.username || "Anonymous"}
                            </span>
                          </Link>
                        ))}
                        {reactors.length > 5 && (
                          <p className="text-xs text-slate-500">+{reactors.length - 5} more</p>
                        )}
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                        <div className="border-8 border-transparent border-t-slate-700" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-all text-sm"
        >
          <span>💬</span>
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div>
          {/* Comments List */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {loadingComments ? (
              <div className="text-center py-4 text-slate-400 text-sm">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">
                No comments yet. Be the first!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${comment.user.id}`} className="shrink-0">
                    {comment.user.avatarUrl ? (
                      <img
                        src={comment.user.avatarUrl}
                        alt={comment.user.fullName || "User"}
                        className="w-8 h-8 rounded-full object-cover"
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
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          comment.isLiked
                            ? "text-red-400"
                            : "text-slate-500 hover:text-red-400"
                        }`}
                      >
                        <span>{comment.isLiked ? "❤️" : "🤍"}</span>
                        {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                      </button>
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
            <div className="flex gap-2 items-center relative">
              {/* Emoji Picker */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-slate-400 hover:text-amber-400 transition-colors rounded-full hover:bg-slate-800"
                >
                  <span className="text-lg">😊</span>
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl z-50 w-64">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-700 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
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

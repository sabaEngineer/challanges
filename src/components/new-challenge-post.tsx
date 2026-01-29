"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  toggleChallengeReaction,
  createChallengeComment,
  deleteChallengeComment,
  getChallengeComments,
  toggleChallengeCommentLike,
  type ReactionType,
  type ReactionWithUsers,
} from "@/actions/challenge-interactions";

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

interface NewChallengePostProps {
  id: string;
  challengeId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  creator: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  memberCount: number;
  commentCount?: number;
  requirements: {
    title: string | null;
    type: string;
    targetValue: number | null;
    unit: string;
  }[];
  isOwnChallenge: boolean;
  initialReactions?: ReactionWithUsers;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire", activeColor: "text-amber-400" },
  { type: "strong", emoji: "💪", label: "Strong", activeColor: "text-emerald-400" },
  { type: "kudos", emoji: "👏", label: "Kudos", activeColor: "text-blue-400" },
  { type: "not_bad", emoji: "👍", label: "Not Bad", activeColor: "text-violet-400" },
];

export function NewChallengePost({
  challengeId,
  title,
  description,
  imageUrl,
  startDate,
  endDate,
  createdAt,
  creator,
  memberCount,
  commentCount: initialCommentCount = 0,
  requirements,
  isOwnChallenge,
  initialReactions,
}: NewChallengePostProps) {
  const [isPending, startTransition] = useTransition();
  const [reactions, setReactions] = useState(initialReactions || {
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0 },
    userReacted: [] as ReactionType[],
    reactors: { fire: [], strong: [], kudos: [], not_bad: [] } as Record<ReactionType, ReactionUser[]>,
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
      lari: "₾",
    };
    return unitMap[unit] || unit;
  };

  // Calculate duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const isOneDay = durationDays === 1;

  const handleReaction = (type: ReactionType) => {
    const currentReaction = reactions.userReacted[0];
    const isRemovingReaction = currentReaction === type;

    // Optimistic update
    setReactions((prev) => {
      const newCounts = { ...prev.counts };

      if (currentReaction) {
        newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
      }

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
      const result = await toggleChallengeReaction(challengeId, type);
      if (result.error) {
        // Revert on error
        setReactions((prev) => {
          const newCounts = { ...prev.counts };

          if (currentReaction) {
            newCounts[currentReaction] = newCounts[currentReaction] + 1;
          }

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
    if (comments.length > 0) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await getChallengeComments(challengeId);
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
      const result = await createChallengeComment(challengeId, newComment);
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
      const result = await deleteChallengeComment(commentId);
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
      const result = await toggleChallengeCommentLike(commentId);
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
    <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-slate-900 to-slate-800">
      {/* New Badge */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1.5 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm font-medium">✨ New Challenge</span>
          <span className="text-slate-500 text-xs">·</span>
          <span className="text-slate-400 text-xs">{formatTimeAgo(createdAt)}</span>
        </div>
      </div>

      {/* Creator Info */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
        <Link href={`/profile/${creator.id}`} className="shrink-0">
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.fullName || "User"}
              className="w-10 h-10 rounded-full ring-2 ring-amber-500/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold">
              {(creator.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm">
            <span className="font-semibold">{creator.fullName || "Anonymous"}</span>
            {isOwnChallenge && (
              <span className="ml-1.5 text-[10px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">You</span>
            )}
            <span className="text-slate-400"> created a new challenge</span>
          </p>
        </div>
      </div>

      {/* Challenge Content */}
      <div className="p-3">
        {/* Image */}
        {imageUrl && (
          <div className="rounded-lg overflow-hidden mb-3 bg-slate-800">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        {/* Title */}
        <Link href={`/challenges/${challengeId}`}>
          <h3 className="text-lg font-bold text-white hover:text-amber-400 transition-colors mb-1">
            {title}
          </h3>
        </Link>

        {/* Description */}
        {description && (
          <p className="text-slate-400 text-sm line-clamp-2 mb-3">{description}</p>
        )}

        {/* Stats Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/50 text-xs">
            <span>📅</span>
            <span className="text-slate-300">
              {isOneDay 
                ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : `${durationDays} days`
              }
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/50 text-xs">
            <span>👥</span>
            <span className="text-slate-300">{memberCount} joined</span>
          </div>
          {requirements.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/50 text-xs">
              <span>🎯</span>
              <span className="text-slate-300">{requirements.length} goal{requirements.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Requirements Preview */}
        {requirements.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {requirements.slice(0, 3).map((req, idx) => (
              <div 
                key={idx}
                className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300"
              >
                {req.title || req.type}
                {req.targetValue && req.type !== "yes_no" && (
                  <span className="text-amber-400/70 ml-1">
                    {req.targetValue} {formatUnit(req.unit)}
                  </span>
                )}
              </div>
            ))}
            {requirements.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-slate-500">
                +{requirements.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* CTA Button */}
        <Link href={`/challenges/${challengeId}`}>
          <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            View Challenge
          </Button>
        </Link>
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
                            <img src={reactor.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
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
      <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
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
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all text-sm ${
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
                
                {/* Tooltip showing who reacted */}
                {reactors.length > 0 && (
                  <div 
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 ${
                      isTooltipActive ? 'block' : 'hidden group-hover:block'
                    }`}
                  >
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-max max-w-[200px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-slate-400">{reaction.label}</p>
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
                              <img src={reactor.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-all text-sm"
        >
          <span>💬</span>
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-slate-700/50">
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

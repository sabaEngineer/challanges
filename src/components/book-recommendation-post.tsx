"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { requestBook } from "@/actions/books";
import {
  createBookComment,
  deleteBookComment,
  getBookComments,
  toggleBookCommentLike,
  toggleBookReaction,
  type ReactionType,
  type ReactionWithUsers,
  type ReactionUser,
} from "@/actions/book-comments";
import { BOOK_GENRES } from "@/lib/book-constants";
import { Toast } from "./ui/toast";

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

interface BookRecommendationPostProps {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverUrl: string | null;
  ownershipType: string;
  language: string;
  genres: string[];
  isLent: boolean;
  owner: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  isOwnBook: boolean;
  hasPendingRequest: boolean;
  commentCount?: number;
  initialReactions?: ReactionWithUsers;
}

function getGenreDisplay(code: string) {
  const genre = BOOK_GENRES.find((g) => g.code === code);
  return genre || { code, label: code, emoji: "📕" };
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire", activeColor: "text-amber-400" },
  { type: "heart", emoji: "❤️", label: "Love", activeColor: "text-red-400" },
  { type: "strong", emoji: "💪", label: "Strong", activeColor: "text-emerald-400" },
  { type: "kudos", emoji: "👏", label: "Kudos", activeColor: "text-blue-400" },
  { type: "not_bad", emoji: "👍", label: "Not Bad", activeColor: "text-violet-400" },
];

export function BookRecommendationPost({
  id,
  title,
  author,
  description,
  coverUrl,
  ownershipType,
  language,
  genres,
  isLent,
  owner,
  isOwnBook,
  hasPendingRequest: initialHasPendingRequest,
  commentCount: initialCommentCount = 0,
  initialReactions,
}: BookRecommendationPostProps) {
  const [isPending, startTransition] = useTransition();
  const [hasPendingRequest, setHasPendingRequest] = useState(initialHasPendingRequest);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isDescriptionClamped, setIsDescriptionClamped] = useState(false);

  // Reactions state
  const [reactions, setReactions] = useState(initialReactions || {
    counts: { fire: 0, strong: 0, kudos: 0, not_bad: 0, heart: 0, smile: 0 },
    userReacted: [] as ReactionType[],
    reactors: { fire: [], strong: [], kudos: [], not_bad: [], heart: [], smile: [] } as Record<ReactionType, ReactionUser[]>,
  });
  const [activeReactionTooltip, setActiveReactionTooltip] = useState<ReactionType | null>(null);
  const [showAllReactorsModal, setShowAllReactorsModal] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

  const EMOJI_LIST = [
    "😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😊",
    "💪", "🔥", "⭐", "🎉", "👏", "🙌", "💯", "❤️",
    "📚", "📖", "🎯", "✨", "🚀", "💥", "👍", "🙏",
  ];

  useEffect(() => {
    if (descriptionRef.current) {
      setIsDescriptionClamped(
        descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
      );
    }
  }, [description]);

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

  const insertEmoji = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
    commentInputRef.current?.focus();
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

  const canRequest = ownershipType === "physical" && !isLent && !isOwnBook && !hasPendingRequest;

  const handleRequestBook = () => {
    startTransition(async () => {
      const result = await requestBook(id, requestMessage || undefined);
      if (result.success) {
        setHasPendingRequest(true);
        setShowRequestModal(false);
        setRequestMessage("");
        setToastType("success");
        setToastMessage("Book request sent!");
      } else {
        setToastType("error");
        setToastMessage(result.error || "Failed to request book");
      }
    });
  };

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
      const result = await toggleBookReaction(id, type);
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
      const fetchedComments = await getBookComments(id);
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
      const result = await createBookComment(id, newComment);
      if (result.success && result.comment) {
        const newCommentData: Comment = {
          ...(result.comment as Comment),
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
      const result = await deleteBookComment(commentId);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentCount((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
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
      const result = await toggleBookCommentLike(commentId);
      if (result.error) {
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

  const ownerName = owner.username ? `@${owner.username}` : owner.fullName || "Someone";
  const totalReactions = Object.values(reactions.counts).reduce((a, b) => a + b, 0);

  return (
    <>
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      <Card className="overflow-hidden border-violet-500/30 bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Badge */}
        <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 px-3 py-1.5 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-sm font-medium">📚 Daily Book Recommendation</span>
          </div>
        </div>

        {/* Recommender Info */}
        <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
          <Link href={`/profile/${owner.id}`} className="shrink-0">
            {owner.avatarUrl ? (
              <img
                src={owner.avatarUrl}
                alt={owner.fullName || "User"}
                className="w-10 h-10 rounded-full ring-2 ring-violet-500/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold">
                {(owner.fullName || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm">
              <span className="font-semibold">{owner.fullName || "Anonymous"}</span>
              {isOwnBook && (
                <span className="ml-1.5 text-[10px] px-1 py-0.5 bg-violet-500/20 text-violet-400 rounded">You</span>
              )}
              <span className="text-slate-400"> recommends this book</span>
            </p>
          </div>
        </div>

        {/* Book Content */}
        <div className="p-4">
          <div className="flex gap-4">
            {/* Cover */}
            <Link href={`/books/${id}`} className="shrink-0">
              <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl overflow-hidden bg-slate-800 shadow-lg hover:shadow-violet-500/20 transition-shadow">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-slate-800 to-slate-700">
                    📖
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link href={`/books/${id}`}>
                <h3 className="text-lg font-bold text-white hover:text-violet-400 transition-colors line-clamp-2">
                  {title}
                </h3>
              </Link>
              <p className="text-slate-400 text-sm mt-0.5">by {author}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    ownershipType === "physical"
                      ? isLent
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-emerald-500/20 text-emerald-400"
                      : ownershipType === "digital"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-violet-500/20 text-violet-400"
                  }`}
                >
                  {ownershipType === "physical"
                    ? isLent
                      ? "📤 Lent Out"
                      : "📦 Physical"
                    : ownershipType === "digital"
                    ? "💻 Digital"
                    : "💡 Recommendation"}
                </span>

                {genres.slice(0, 2).map((genreCode) => {
                  const genreInfo = getGenreDisplay(genreCode);
                  return (
                    <span
                      key={genreCode}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300"
                    >
                      {genreInfo.emoji} {genreInfo.label}
                    </span>
                  );
                })}
              </div>

              {canRequest && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
                >
                  📬 Request Book
                </button>
              )}
              {hasPendingRequest && (
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-400 bg-amber-500/10 rounded-lg">
                  ⏳ Request Pending
                </span>
              )}
              {ownershipType === "physical" && isLent && !isOwnBook && (
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-400 bg-orange-500/10 rounded-lg">
                  📤 Currently Lent Out
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p
                ref={descriptionRef}
                className={`text-slate-300 text-sm whitespace-pre-wrap ${!isDescriptionExpanded ? "line-clamp-3" : ""}`}
              >
                {description}
              </p>
              {(isDescriptionClamped || isDescriptionExpanded) && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-violet-400 hover:text-violet-300 text-sm font-medium mt-1 transition-colors"
                >
                  {isDescriptionExpanded ? "See less" : "See more"}
                </button>
              )}
            </div>
          )}

          {/* View Book Button */}
          <div className="mt-3">
            <Link href={`/books/${id}`}>
              <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600">
                View Book Details
              </Button>
            </Link>
          </div>
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
                              <img src={reactor.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold">
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

                  {/* Tooltip showing who reacted */}
                  {reactors.length > 0 && (
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 ${
                        isTooltipActive ? "block" : "hidden group-hover:block"
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
                                <img src={reactor.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[8px] font-bold">
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
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-all text-sm"
          >
            <span>💬</span>
            <span>Comment</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div>
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold">
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
                            <span className="text-xs px-1 py-0.5 bg-violet-500/20 text-violet-400 rounded">
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
                    className="p-2 text-slate-400 hover:text-violet-400 transition-colors rounded-full hover:bg-slate-800"
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
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
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

      {/* Request Modal */}
      {showRequestModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRequestModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Request to Borrow</h3>
              <p className="text-slate-400 text-sm mt-1">
                Send a request to {ownerName} to borrow &quot;{title}&quot;
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm text-slate-300 mb-2">
                Message (optional)
              </label>
              <input
                type="text"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Hi! I'd love to borrow this book..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex gap-2 p-4 pt-0">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestBook}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-medium bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

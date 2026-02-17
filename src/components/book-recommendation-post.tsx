"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { requestBook } from "@/actions/books";
import { BOOK_GENRES } from "@/lib/book-constants";
import { Toast } from "./ui/toast";

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
}

function getGenreDisplay(code: string) {
  const genre = BOOK_GENRES.find((g) => g.code === code);
  return genre || { code, label: code, emoji: "📕" };
}

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

  useEffect(() => {
    if (descriptionRef.current) {
      setIsDescriptionClamped(
        descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
      );
    }
  }, [description]);

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

  const ownerName = owner.username ? `@${owner.username}` : owner.fullName || "Someone";

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
                {/* Type Badge */}
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

                {/* Genre Badges */}
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

              {/* Request Button for physical books */}
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

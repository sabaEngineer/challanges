"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CheckinSlide {
  id: string;
  challengeTitle: string;
  challengeId: string;
  note: string | null;
  mediaUrls: { url: string; type: "image" | "video" }[] | null;
  imageUrl: string | null;
  isDone: boolean;
  createdAt: Date;
}

interface Performer {
  user: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  completedCount: number;
  challenges: {
    id: string;
    title: string;
  }[];
}

interface TopPerformerSlideshowProps {
  performer: Performer;
  checkins: CheckinSlide[];
  date: Date;
}

export function TopPerformerSlideshow({ performer, checkins, date }: TopPerformerSlideshowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<"intro" | "transition" | "challenges" | "closing">("intro");
  const [hasSeenToday, setHasSeenToday] = useState(true);
  const [visibleChallenges, setVisibleChallenges] = useState(0);

  const INTRO_DURATION = 2000; // 2 seconds for intro
  const TRANSITION_DURATION = 2500; // 2.5 seconds for "Now showing challenges" message
  const CHALLENGE_APPEAR_DELAY = 800; // 800ms between each challenge appearing (slower)
  const FINAL_DISPLAY_DURATION = 2500; // 2.5 seconds after all challenges shown

  // Get unique challenges from check-ins
  const uniqueChallenges = checkins.reduce((acc, checkin) => {
    if (!acc.find(c => c.id === checkin.challengeId)) {
      acc.push({ id: checkin.challengeId, title: checkin.challengeTitle, isDone: checkin.isDone });
    }
    return acc;
  }, [] as { id: string; title: string; isDone: boolean }[]);

  useEffect(() => {
    // Check if user has already seen this today
    const lastSeen = localStorage.getItem("topPerformerSlideshowSeen");
    const today = new Date().toDateString();
    
    if (lastSeen !== today) {
      setHasSeenToday(false);
      setIsOpen(true);
      localStorage.setItem("topPerformerSlideshowSeen", today);
      
      // Start with intro, then transition message, then challenges
      setTimeout(() => setStage("transition"), INTRO_DURATION);
    }
  }, []);

  // Transition to challenges after showing the message
  useEffect(() => {
    if (stage === "transition") {
      const timer = setTimeout(() => setStage("challenges"), TRANSITION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Animate challenges appearing one by one
  useEffect(() => {
    if (stage !== "challenges") return;

    if (visibleChallenges < uniqueChallenges.length) {
      const timer = setTimeout(() => {
        setVisibleChallenges(prev => prev + 1);
      }, CHALLENGE_APPEAR_DELAY);
      return () => clearTimeout(timer);
    } else {
      // All challenges shown, close after a delay
      const timer = setTimeout(() => {
        setStage("closing");
        setTimeout(() => setIsOpen(false), 300);
      }, FINAL_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [stage, visibleChallenges, uniqueChallenges.length]);

  const handleClose = useCallback(() => {
    setStage("closing");
    setTimeout(() => setIsOpen(false), 300);
  }, []);

  if (hasSeenToday || !isOpen) {
    return null;
  }

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${
        stage === "closing" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleClose} />
      
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Confetti/Celebration Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stage !== "intro" && (
          <>
            <div className="absolute top-10 left-10 text-4xl animate-bounce" style={{ animationDelay: "0s" }}>🎉</div>
            <div className="absolute top-20 right-20 text-3xl animate-bounce" style={{ animationDelay: "0.2s" }}>✨</div>
            <div className="absolute top-32 left-1/4 text-2xl animate-bounce" style={{ animationDelay: "0.4s" }}>🔥</div>
            <div className="absolute bottom-32 left-20 text-2xl animate-bounce" style={{ animationDelay: "0.3s" }}>⭐</div>
            <div className="absolute bottom-20 right-16 text-4xl animate-bounce" style={{ animationDelay: "0.5s" }}>🏆</div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Intro Stage */}
        {stage === "intro" && (
          <div className="text-center animate-fade-in">
            {/* Trophy */}
            <div className="mb-6">
              <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-6xl shadow-2xl shadow-amber-500/50 animate-pulse">
                🏆
              </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Yesterday&apos;s Top Performer
            </h2>
            
            {/* User Avatar and Name */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {performer.user.avatarUrl ? (
                <img
                  src={performer.user.avatarUrl}
                  alt={performer.user.fullName || "User"}
                  className="w-16 h-16 rounded-full ring-4 ring-amber-500 shadow-xl"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold ring-4 ring-amber-500/50">
                  {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2 animate-pulse">
              {performer.user.fullName || performer.user.username || "Anonymous"}
            </h3>
            
            <p className="text-amber-400 text-lg">
              {performer.completedCount} check-ins completed! 🔥
            </p>
            
            <p className="text-slate-400 text-sm mt-2">
              {formatDate(date)}
            </p>
          </div>
        )}

        {/* Transition Stage - "Now showing challenges" message */}
        {stage === "transition" && (
          <div className="text-center animate-fade-in">
            {/* User Avatar */}
            <div className="mb-6">
              {performer.user.avatarUrl ? (
                <img
                  src={performer.user.avatarUrl}
                  alt={performer.user.fullName || "User"}
                  className="w-24 h-24 mx-auto rounded-full ring-4 ring-amber-500 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-bold ring-4 ring-amber-500/50">
                  {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
              Now showing
            </h2>
            
            <p className="text-2xl sm:text-3xl font-bold text-amber-400 mb-2">
              {performer.user.fullName || performer.user.username || "User"}&apos;s
            </p>
            
            <p className="text-xl text-white">
              yesterday&apos;s completed challenges
            </p>
            
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full">
                <span className="text-amber-400">🎯</span>
                <span className="text-white font-semibold">{uniqueChallenges.length}</span>
                <span className="text-slate-400">challenge{uniqueChallenges.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            
            <p className="text-slate-500 text-sm mt-4 animate-pulse">
              Loading...
            </p>
          </div>
        )}

        {/* Challenges Stage - Single Card with all challenges */}
        {stage === "challenges" && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {performer.user.avatarUrl ? (
                  <img
                    src={performer.user.avatarUrl}
                    alt={performer.user.fullName || "User"}
                    className="w-12 h-12 rounded-full ring-2 ring-amber-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold ring-2 ring-amber-500/50">
                    {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <h3 className="text-lg font-bold text-white">
                      {performer.user.fullName || performer.user.username || "Anonymous"}
                    </h3>
                  </div>
                  <p className="text-sm text-amber-400">Yesterday&apos;s Top Performer</p>
                </div>
              </div>
            </div>

            {/* Challenges List */}
            <div className="p-4">
              <p className="text-slate-400 text-sm mb-3">Completed challenges:</p>
              
              <div className="space-y-2">
                {uniqueChallenges.map((challenge, index) => (
                  <div
                    key={challenge.id}
                    className={`transform transition-all duration-300 ${
                      index < visibleChallenges 
                        ? "opacity-100 translate-x-0" 
                        : "opacity-0 -translate-x-4"
                    }`}
                  >
                    <Link
                      href={`/challenges/${challenge.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors group"
                    >
                      <span className="text-lg">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate group-hover:text-amber-400 transition-colors">
                          {challenge.title}
                        </p>
                      </div>
                      {challenge.isDone && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/20 rounded-full text-emerald-400">
                          ✓
                        </span>
                      )}
                    </Link>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-white font-semibold">{performer.completedCount}</span>
                  <span className="text-slate-400">check-ins</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-400">🎯</span>
                  <span className="text-white font-semibold">{uniqueChallenges.length}</span>
                  <span className="text-slate-400">challenges</span>
                </div>
              </div>

              {/* Congrats message */}
              {visibleChallenges >= uniqueChallenges.length && (
                <p className="text-center text-amber-400 mt-4 animate-pulse">
                  🔥 Amazing work! Keep it up! 🔥
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

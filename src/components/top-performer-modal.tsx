"use client";

import { useState, useEffect } from "react";

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

interface TopPerformerModalProps {
  performers: Performer[];
  isTie: boolean;
  date: Date;
}

export function TopPerformerModal({ performers, isTie, date }: TopPerformerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<"intro" | "reveal" | "stats" | "closing">("intro");
  const [hasSeenToday, setHasSeenToday] = useState(true);

  const firstPerformer = performers[0];

  useEffect(() => {
    // Check if user has already seen this today
    const lastSeen = localStorage.getItem("topPerformerLastSeen");
    const today = new Date().toDateString();
    
    if (lastSeen !== today) {
      setHasSeenToday(false);
      setIsOpen(true);
      localStorage.setItem("topPerformerLastSeen", today);
      
      // Stage 1: Intro (0-2s)
      // Stage 2: Reveal name (2-5s)
      setTimeout(() => setStage("reveal"), 2000);
      // Stage 3: Show stats (5-8s)
      setTimeout(() => setStage("stats"), 5000);
      // Stage 4: Close (8s)
      setTimeout(() => setStage("closing"), 8000);
      // Actually close (9s)
      setTimeout(() => setIsOpen(false), 9000);
    }
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
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-500 ${
        stage === "closing" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      {/* Confetti/Celebration Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stage !== "intro" && (
          <>
            <div className="absolute top-10 left-10 text-4xl animate-bounce" style={{ animationDelay: "0s" }}>🎉</div>
            <div className="absolute top-20 right-20 text-3xl animate-bounce" style={{ animationDelay: "0.2s" }}>✨</div>
            <div className="absolute top-32 left-1/4 text-2xl animate-bounce" style={{ animationDelay: "0.4s" }}>🔥</div>
            <div className="absolute top-16 right-1/3 text-3xl animate-bounce" style={{ animationDelay: "0.6s" }}>💪</div>
            <div className="absolute bottom-32 left-20 text-2xl animate-bounce" style={{ animationDelay: "0.3s" }}>⭐</div>
            <div className="absolute bottom-20 right-16 text-4xl animate-bounce" style={{ animationDelay: "0.5s" }}>🏆</div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md w-full">
        {/* Trophy */}
        <div className={`mb-6 transition-all duration-700 ${
          stage === "intro" ? "scale-150" : "scale-100"
        }`}>
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/50 animate-pulse">
            🏆
          </div>
        </div>

        {/* Intro Text */}
        <div className={`transition-all duration-500 ${
          stage === "intro" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 absolute"
        }`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Yesterday's Top Performer{isTie ? "s" : ""}
          </h2>
          <p className="text-amber-400 text-lg">{isTie ? "are..." : "is..."}</p>
        </div>

        {/* Reveal Name */}
        <div className={`transition-all duration-700 ${
          stage === "reveal" || stage === "stats" || stage === "closing" 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-8"
        }`}>
          {stage !== "intro" && (
            <>
              <p className="text-sm text-slate-400 mb-3">{formatDate(date)}</p>
              
              {/* User Avatars */}
              <div className="flex justify-center mb-4">
                <div className={`flex ${isTie ? "-space-x-3" : ""}`}>
                  {performers.slice(0, 3).map((performer, index) => (
                    <div key={performer.user.id} style={{ zIndex: 10 - index }}>
                      {performer.user.avatarUrl ? (
                        <img
                          src={performer.user.avatarUrl}
                          alt={performer.user.fullName || "User"}
                          className="w-20 h-20 rounded-full ring-4 ring-amber-500 shadow-xl"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-bold ring-4 ring-amber-500/50">
                          {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tie indicator */}
              {isTie && (
                <p className="text-amber-400 text-sm mb-2 animate-pulse">🤝 It's a tie!</p>
              )}

              {/* Names */}
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-1 animate-pulse">
                {isTie ? (
                  <>
                    {performers.slice(0, 2).map((p, i) => (
                      <span key={p.user.id}>
                        {p.user.fullName || p.user.username || "Anonymous"}
                        {i < Math.min(performers.length, 2) - 1 && <span className="text-amber-400"> & </span>}
                      </span>
                    ))}
                    {performers.length > 2 && <span className="text-slate-400 text-xl"> +{performers.length - 2} more</span>}
                  </>
                ) : (
                  firstPerformer.user.fullName || firstPerformer.user.username || "Anonymous"
                )}
              </h2>
              {!isTie && firstPerformer.user.username && firstPerformer.user.fullName && (
                <p className="text-slate-400 text-sm mb-4">@{firstPerformer.user.username}</p>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className={`transition-all duration-700 delay-300 ${
          stage === "stats" || stage === "closing"
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-8"
        }`}>
          {(stage === "stats" || stage === "closing") && (
            <div className="space-y-3 mt-6">
              {/* Check-ins count */}
              <div className="flex items-center justify-center gap-2 text-lg">
                <span className="text-emerald-400">✓</span>
                <span className="text-white font-semibold">{firstPerformer.completedCount}</span>
                <span className="text-slate-300">check-ins completed {isTie ? "each" : ""}</span>
              </div>

              {/* Challenges count */}
              <div className="flex items-center justify-center gap-2 text-lg">
                <span className="text-amber-400">🎯</span>
                <span className="text-white font-semibold">{firstPerformer.challenges.length}</span>
                <span className="text-slate-300">challenge{firstPerformer.challenges.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Challenge names */}
              {firstPerformer.challenges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {firstPerformer.challenges.slice(0, 3).map((challenge) => (
                    <span
                      key={challenge.id}
                      className="text-xs px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-full text-slate-300"
                    >
                      {challenge.title}
                    </span>
                  ))}
                  {firstPerformer.challenges.length > 3 && (
                    <span className="text-xs text-slate-500">+{firstPerformer.challenges.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Congrats message */}
              <p className="text-amber-400 mt-4 animate-pulse">
                🔥 Amazing work! Keep it up! 🔥
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

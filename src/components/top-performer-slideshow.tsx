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
  const [stage, setStage] = useState<"intro" | "slideshow" | "closing">("intro");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasSeenToday, setHasSeenToday] = useState(true);
  const [slideDuration, setSlideDuration] = useState(2500);

  const SLIDE_DURATION_WITH_CONTENT = 2500; // 2.5 seconds for slides with media/note
  const SLIDE_DURATION_EMPTY = 1000; // 1 second for empty slides
  const INTRO_DURATION = 2000; // 2 seconds for intro

  // Check if a check-in has displayable content
  const hasContent = (checkin: CheckinSlide) => {
    const hasMedia = (checkin.mediaUrls && checkin.mediaUrls.length > 0) || checkin.imageUrl;
    const hasNote = checkin.note && checkin.note.trim().length > 0;
    return hasMedia || hasNote;
  };

  // Calculate duration for current slide
  useEffect(() => {
    if (checkins.length > 0 && currentSlide < checkins.length) {
      const currentCheckin = checkins[currentSlide];
      const duration = hasContent(currentCheckin) ? SLIDE_DURATION_WITH_CONTENT : SLIDE_DURATION_EMPTY;
      setSlideDuration(duration);
    }
  }, [currentSlide, checkins]);

  useEffect(() => {
    // Check if user has already seen this today
    const lastSeen = localStorage.getItem("topPerformerSlideshowSeen");
    const today = new Date().toDateString();
    
    if (lastSeen !== today) {
      setHasSeenToday(false);
      setIsOpen(true);
      localStorage.setItem("topPerformerSlideshowSeen", today);
      
      // Start with intro, then move to slideshow
      setTimeout(() => setStage("slideshow"), INTRO_DURATION);
    }
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (stage !== "slideshow" || checkins.length === 0) return;

    const timer = setTimeout(() => {
      if (currentSlide >= checkins.length - 1) {
        // Last slide finished - close immediately
        setStage("closing");
        setTimeout(() => setIsOpen(false), 300);
      } else {
        setCurrentSlide((prev) => prev + 1);
      }
    }, slideDuration);

    return () => clearTimeout(timer);
  }, [stage, checkins.length, currentSlide, slideDuration]);

  const handleClose = useCallback(() => {
    setStage("closing");
    setTimeout(() => setIsOpen(false), 300);
  }, []);

  const handleNextSlide = useCallback(() => {
    if (currentSlide < checkins.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [currentSlide, checkins.length, handleClose]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  if (hasSeenToday || !isOpen || checkins.length === 0) {
    return null;
  }

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const currentCheckin = checkins[currentSlide];
  const mediaUrl = currentCheckin?.mediaUrls?.[0]?.url || currentCheckin?.imageUrl;
  const mediaType = currentCheckin?.mediaUrls?.[0]?.type || "image";

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
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
      <div className="relative z-10 w-full max-w-lg mx-4">
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
            
            <p className="text-slate-500 text-sm mt-4 animate-pulse">
              Loading their journey...
            </p>
          </div>
        )}

        {/* Slideshow Stage */}
        {stage === "slideshow" && currentCheckin && (
          <div className="relative">
            {/* Header - User info */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                {performer.user.avatarUrl ? (
                  <img
                    src={performer.user.avatarUrl}
                    alt={performer.user.fullName || "User"}
                    className="w-10 h-10 rounded-full ring-2 ring-amber-500"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold ring-2 ring-amber-500/50">
                    {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {performer.user.fullName || performer.user.username || "Anonymous"}
                  </p>
                  <p className="text-amber-400 text-xs">🏆 Top Performer</p>
                </div>
                <div className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/30 rounded-full text-emerald-400">
                  ✓ {currentSlide + 1}/{checkins.length}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="flex gap-1 mt-3">
                {checkins.map((_, index) => (
                  <div
                    key={index}
                    className="h-1 flex-1 rounded-full overflow-hidden bg-white/20"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        index < currentSlide 
                          ? "w-full bg-amber-500" 
                          : index === currentSlide 
                          ? "bg-amber-500 animate-progress" 
                          : "w-0"
                      }`}
                      style={index === currentSlide ? {
                        animation: `progress ${slideDuration}ms linear forwards`
                      } : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Media Content */}
            <div 
              className="relative aspect-[4/5] bg-slate-900 rounded-2xl overflow-hidden"
              onClick={handleNextSlide}
            >
              {mediaUrl ? (
                mediaType === "video" ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={currentCheckin.challengeTitle}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <div className="text-center p-6">
                    <span className="text-6xl mb-4 block">
                      {currentCheckin.isDone ? "✅" : "📝"}
                    </span>
                    <p className="text-white/80 text-lg">Check-in completed!</p>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              {currentSlide > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {currentSlide < checkins.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Bottom gradient with info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                {/* Challenge name */}
                <Link
                  href={`/challenges/${currentCheckin.challengeId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-2 transition-colors"
                >
                  🎯 {currentCheckin.challengeTitle}
                </Link>
                
                {/* Note if exists */}
                {currentCheckin.note && (
                  <p className="text-white text-sm line-clamp-2">
                    {currentCheckin.note}
                  </p>
                )}
                
                {/* Status */}
                <div className="flex items-center gap-2 mt-2">
                  {currentCheckin.isDone ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/30 rounded-full text-emerald-400">
                      ✓ Completed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/30 rounded-full text-blue-400">
                      📝 Progress saved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tap hint */}
            <p className="text-center text-slate-500 text-xs mt-3">
              Tap to continue • {currentSlide + 1} of {checkins.length}
            </p>
          </div>
        )}
      </div>

      {/* CSS for progress animation */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
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

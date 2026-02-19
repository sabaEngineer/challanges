"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { toggleReaction, type ReactionType } from "@/actions/reactions";
import { createComment, deleteComment, getPostComments, toggleCommentLike } from "@/actions/comments";
import { resolveStravaAppLink } from "@/actions/feed";
import { getEarnedBadges } from "@/lib/badges";
import { CheckinModal } from "./checkin-modal";
import { ChallengeType, ChallengeUnit } from "@/lib/types";

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

interface MediaItem {
  url: string;
  type: "image" | "video";
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
  mediaUrls?: MediaItem[] | null;
  linkUrl?: string | null;
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

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

function getStravaActivityId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("strava.com")) return null;
    const match = parsed.pathname.match(/\/activities\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function isStravaAppLink(url: string): boolean {
  try {
    return new URL(url).hostname.includes("strava.app.link");
  } catch {
    return false;
  }
}

function StravaEmbed({ activityId, url }: { activityId: string; url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create the placeholder div that the Strava script expects
    const placeholder = document.createElement("div");
    placeholder.className = "strava-embed-placeholder";
    placeholder.dataset.embedType = "activity";
    placeholder.dataset.embedId = activityId;
    placeholder.dataset.style = "standard";
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(placeholder);

    // Load the Strava embed script
    const existingScript = document.querySelector('script[src="https://strava-embeds.com/embed.js"]');
    if (existingScript) {
      // Script already exists, re-trigger it by removing and re-adding
      existingScript.remove();
    }
    const script = document.createElement("script");
    script.src = "https://strava-embeds.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [activityId]);

  return (
    <div>
      <div ref={containerRef} className="rounded-xl overflow-hidden" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-sm text-orange-400 hover:text-orange-300 hover:bg-slate-800/50 transition-colors"
      >
        <span>🏃</span>
        <span>View on Strava</span>
        <svg className="w-3.5 h-3.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

function StravaAppLinkEmbed({ url }: { url: string }) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveStravaAppLink(url).then((resolved) => {
      if (resolved) {
        const match = resolved.match(/\/activities\/(\d+)/);
        if (match) {
          setResolvedId(match[1]);
        }
      }
      setLoading(false);
    });
  }, [url]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Loading Strava activity...</span>
      </div>
    );
  }

  if (resolvedId) {
    return <StravaEmbed activityId={resolvedId} url={url} />;
  }

  // Couldn't resolve — show a branded Strava link card
  return <StravaLinkCard url={url} />;
}

function StravaLinkCard({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xl">🏃</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-orange-400 group-hover:text-orange-300">Strava Activity</p>
        <p className="text-xs text-slate-500 truncate">{url}</p>
      </div>
      <svg className="w-4 h-4 text-orange-400/60 group-hover:text-orange-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function ExternalLinkEmbed({ url }: { url: string }) {
  const youtubeId = getYouTubeVideoId(url);
  const stravaId = getStravaActivityId(url);

  if (youtubeId) {
    return (
      <div className="rounded-xl overflow-hidden bg-black">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    );
  }

  if (stravaId) {
    return <StravaEmbed activityId={stravaId} url={url} />;
  }

  if (isStravaAppLink(url)) {
    return <StravaAppLinkEmbed url={url} />;
  }

  // Fallback: plain link card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors group"
    >
      <span className="text-lg">🔗</span>
      <span className="text-sm text-slate-300 group-hover:text-white truncate flex-1">{url}</span>
      <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; activeColor: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire", activeColor: "text-amber-400" },
  { type: "heart", emoji: "❤️", label: "Love", activeColor: "text-red-400" },
  { type: "strong", emoji: "💪", label: "Strong", activeColor: "text-emerald-400" },
  { type: "kudos", emoji: "👏", label: "Kudos", activeColor: "text-blue-400" },
  { type: "not_bad", emoji: "😂", label: "Haha", activeColor: "text-violet-400" },
];

// Media Lightbox Component for zooming
function MediaLightbox({ 
  media, 
  currentIndex, 
  onClose, 
  onNavigate 
}: { 
  media: MediaItem[]; 
  currentIndex: number; 
  onClose: () => void; 
  onNavigate: (index: number) => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMedia = media[currentIndex];

  // Reset zoom when changing media
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && media.length > 1) onNavigate((currentIndex - 1 + media.length) % media.length);
      if (e.key === "ArrowRight" && media.length > 1) onNavigate((currentIndex + 1) % media.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, media.length, onClose, onNavigate]);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      setLastTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start when zoomed
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches);
      if (distance && lastTouchDistance) {
        const newScale = Math.min(Math.max(scale * (distance / lastTouchDistance), 1), 4);
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
      }
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan when zoomed
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  // Double tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap detected
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2);
      }
    }
    lastTap.current = now;
  };

  // Mouse wheel zoom for desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 1), 4);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        onTouchEnd={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-[60] w-12 h-12 bg-black/70 hover:bg-black/80 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors pointer-events-auto touch-auto"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Media counter */}
      {media.length > 1 && (
        <div className="absolute top-4 left-4 z-[60] px-3 py-1.5 bg-black/70 rounded-full text-white text-sm font-medium pointer-events-none">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] px-3 py-1.5 bg-black/70 rounded-full text-white text-sm pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Navigation arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + media.length) % media.length); }}
            onTouchEnd={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + media.length) % media.length); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-[60] w-12 h-12 md:w-14 md:h-14 bg-black/70 hover:bg-black/80 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors pointer-events-auto touch-auto"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % media.length); }}
            onTouchEnd={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % media.length); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-[60] w-12 h-12 md:w-14 md:h-14 bg-black/70 hover:bg-black/80 active:bg-black/90 rounded-full flex items-center justify-center text-white transition-colors pointer-events-auto touch-auto"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Media container */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-[10] flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={handleDoubleTap}
        style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
      >
        {currentMedia.type === "video" ? (
          <video
            src={currentMedia.url}
            controls
            autoPlay
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={`Media ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Dots indicator */}
      {media.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] flex gap-3 pointer-events-auto">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); onNavigate(index); }}
              onTouchEnd={(e) => { e.stopPropagation(); onNavigate(index); }}
              className={`w-3 h-3 rounded-full transition-all touch-auto ${
                index === currentIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60 active:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      {/* Instructions (show briefly) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[60] text-white/50 text-xs text-center pointer-events-none">
        <span className="hidden md:inline">Scroll to zoom • Double-click to zoom • Arrow keys to navigate</span>
        <span className="md:hidden">Pinch to zoom • Double-tap to zoom</span>
      </div>
    </div>
  );
}

// Slide type: either an uploaded media item or an external link embed
type GallerySlide =
  | { kind: "media"; item: MediaItem }
  | { kind: "embed"; url: string };

// Check if a link is a full embeddable link (YouTube or Strava web link)
function isEmbeddableLink(url: string): boolean {
  return !!getYouTubeVideoId(url) || !!getStravaActivityId(url);
}

// Media Gallery Component with swipe support for mobile and preloading
function MediaGallery({ mediaUrls, imageUrl, linkUrl }: { mediaUrls?: MediaItem[] | null; imageUrl: string | null; linkUrl?: string | null }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [showLightbox, setShowLightbox] = useState(false);
  
  // Build media array from mediaUrls or fallback to imageUrl
  const uploadedMedia: MediaItem[] = (() => {
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      return mediaUrls;
    }
    if (imageUrl) {
      const isVideo = imageUrl.includes("/videos/") || 
                      imageUrl.toLowerCase().includes(".mp4") || 
                      imageUrl.toLowerCase().includes(".webm") || 
                      imageUrl.toLowerCase().includes(".mov");
      return [{ url: imageUrl, type: isVideo ? "video" as const : "image" as const }];
    }
    return [];
  })();

  // Only include fully embeddable links (YouTube, Strava web) in the carousel
  // Strava app links will be shown separately below the gallery
  const embeddableLinkUrl = linkUrl && isEmbeddableLink(linkUrl) ? linkUrl : null;

  const slides: GallerySlide[] = [
    ...(embeddableLinkUrl ? [{ kind: "embed" as const, url: embeddableLinkUrl }] : []),
    ...uploadedMedia.map((item) => ({ kind: "media" as const, item })),
  ];

  // Media-only items for the lightbox (embeds can't be lightboxed)
  const lightboxMedia = uploadedMedia;

  // Preload all images on mount
  useEffect(() => {
    if (uploadedMedia.length <= 1) return;
    
    uploadedMedia.forEach((item, index) => {
      if (item.type === "image") {
        const img = new Image();
        img.src = item.url;
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, index]));
        };
      }
    });
  }, [uploadedMedia]);

  if (slides.length === 0) return null;

  const totalSlides = slides.length;
  const goNext = () => setCurrentIndex((i) => (i + 1) % totalSlides);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + totalSlides) % totalSlides);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('video') || (e.target as HTMLElement).closest('iframe')) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isDragging) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setDragOffset(currentTouch - touchStart);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && totalSlides > 1) goNext();
    if (isRightSwipe && totalSlides > 1) goPrev();

    setIsDragging(false);
    setDragOffset(0);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('video') || (e.target as HTMLElement).closest('iframe')) return;
    const currentSlide = slides[currentIndex];
    if (currentSlide.kind === "embed") return; // Don't lightbox embeds
    // Find the index of this media item in lightboxMedia
    const mediaIndex = uploadedMedia.indexOf(currentSlide.item);
    if (mediaIndex >= 0) {
      setShowLightbox(true);
    }
  };

  // For lightbox, map current gallery index to lightbox media index
  const getLightboxIndex = () => {
    const currentSlide = slides[currentIndex];
    if (currentSlide.kind !== "media") return 0;
    return uploadedMedia.indexOf(currentSlide.item);
  };

  return (
    <>
      <div 
        className={`relative rounded-lg overflow-hidden mb-4 bg-slate-800 touch-pan-y ${slides[currentIndex]?.kind === "media" ? "cursor-zoom-in" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleMediaClick}
      >
        {/* Preload all images in hidden container */}
        <div className="hidden">
          {uploadedMedia.map((item, index) => 
            item.type === "image" ? (
              <img key={item.url} src={item.url} alt="" />
            ) : null
          )}
        </div>

        {/* Zoom hint icon - only for media slides */}
        {slides[currentIndex]?.kind === "media" && (
          <div className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white/70 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        )}

        {/* All slides rendered, only current one visible */}
        <div className="relative">
          {slides.map((slide, index) => (
            <div
              key={slide.kind === "embed" ? `embed-${slide.url}` : `media-${slide.item.url}`}
              className={`${index === currentIndex ? 'block' : 'hidden'} transition-transform duration-200 ease-out`}
              style={{ 
                transform: isDragging && totalSlides > 1 && index === currentIndex 
                  ? `translateX(${dragOffset * 0.3}px)` 
                  : 'translateX(0)',
                opacity: isDragging && index === currentIndex ? 0.9 : 1
              }}
            >
              {slide.kind === "embed" ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <ExternalLinkEmbed url={slide.url} />
                </div>
              ) : slide.item.type === "video" ? (
                <video
                  src={`${slide.item.url}#t=0.1`}
                  controls
                  preload="metadata"
                  className="w-full h-auto"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={slide.item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-auto select-none"
                  draggable={false}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows - visible on all screen sizes */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); goPrev(); }}
              className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 active:bg-black/90 active:scale-95 rounded-full flex items-center justify-center text-white/90 transition-all z-20 touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); goNext(); }}
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 active:bg-black/90 active:scale-95 rounded-full flex items-center justify-center text-white/90 transition-all z-20 touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {totalSlides > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((slide, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={`rounded-full transition-all ${
                  index === currentIndex
                    ? "w-6 h-2.5 bg-white"
                    : "w-2.5 h-2.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      {totalSlides > 1 && (
        <div className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded-full text-xs font-medium text-white z-20">
          {currentIndex + 1} / {totalSlides}
        </div>
      )}
    </div>

    {/* Lightbox - only for uploaded media */}
    {showLightbox && lightboxMedia.length > 0 && (
      <MediaLightbox
        media={lightboxMedia}
        currentIndex={getLightboxIndex()}
        onClose={() => setShowLightbox(false)}
        onNavigate={(index) => {
          // Map lightbox index back to gallery slide index
          const embedCount = embeddableLinkUrl ? 1 : 0;
          setCurrentIndex(index + embedCount);
        }}
      />
    )}
    </>
  );
}

export function FeedPost({ 
  id,
  user, 
  challenge, 
  checkinDate, 
  note, 
  imageUrl, 
  mediaUrls,
  linkUrl,
  createdAt, 
  items,
  isOwnPost,
  initialReactions,
  initialCommentCount = 0,
}: FeedPostProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const postMenuRef = useRef<HTMLDivElement>(null);
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

  // Share menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  
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

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [showShareMenu]);

  // Close post menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
        setShowPostMenu(false);
      }
    };
    if (showPostMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [showPostMenu]);
  
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

  const postUrl = typeof window !== "undefined"
    ? `${window.location.origin}/feed/${id}`
    : `/feed/${id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = postUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    setShowShareMenu(false);
  };

  const handleShareMessenger = () => {
    const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(postUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(postUrl)}`;
    window.open(messengerUrl, "_blank", "width=600,height=500");
    setShowShareMenu(false);
  };

  const handleShareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.fullName || user.username}'s check-in`,
          text: note || `Check-in for ${challenge.title}`,
          url: postUrl,
        });
      } catch {
        // User cancelled or error
      }
      setShowShareMenu(false);
    }
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

        {/* Three-dot menu for own posts */}
        {isOwnPost && (
          <div className="relative flex-shrink-0" ref={postMenuRef}>
            <button
              onClick={() => setShowPostMenu(!showPostMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showPostMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    setShowPostMenu(false);
                    setShowEditModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Check-in
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        {/* Status & Date */}
        <div className="flex items-center gap-2 mb-3 pl-14 flex-wrap">
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
          {/* Past check-in indicator: if checkinDate is different day from createdAt */}
          {new Date(checkinDate).toDateString() !== new Date(createdAt).toDateString() && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-400">
              📝 Updated
            </span>
          )}
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

        {/* Media Gallery (YouTube & Strava web embeds in carousel with photos/videos) */}
        <MediaGallery mediaUrls={mediaUrls} imageUrl={imageUrl} linkUrl={linkUrl} />

        {/* Strava app link shown below media if it's not a full web embed */}
        {linkUrl && !isEmbeddableLink(linkUrl) && (
          <div className="mb-4">
            {isStravaAppLink(linkUrl) ? (
              <StravaAppLinkEmbed url={linkUrl} />
            ) : (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors group"
              >
                <span className="text-lg">🔗</span>
                <span className="text-sm text-slate-300 group-hover:text-white truncate flex-1">{linkUrl}</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
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
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-all text-sm"
          >
            <span>💬</span>
            <span>Comment</span>
          </button>

          {/* Share Button */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>

            {showShareMenu && (
              <div className="absolute bottom-full right-0 mb-2 z-50 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                {/* Native share (mobile) */}
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <span className="text-lg">📤</span>
                    <span className="text-sm text-slate-200">Share via...</span>
                  </button>
                )}

                {/* Messenger */}
                <button
                  onClick={handleShareMessenger}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                >
                  <span className="text-lg">💬</span>
                  <div>
                    <span className="text-sm text-slate-200">Messenger</span>
                  </div>
                </button>

                {/* Instagram */}
                <button
                  onClick={handleShareInstagram}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                >
                  <span className="text-lg">📸</span>
                  <div>
                    <span className="text-sm text-slate-200">Instagram</span>
                    <p className="text-[10px] text-slate-500">Copies link to paste in DM or Story</p>
                  </div>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left border-t border-slate-700/50"
                >
                  <span className="text-lg">{copiedLink ? "✅" : "🔗"}</span>
                  <span className="text-sm text-slate-200">
                    {copiedLink ? "Link Copied!" : "Copy Link"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
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

      {/* Edit Modal */}
      {showEditModal && (
        <CheckinModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            router.refresh();
          }}
          challengeId={challenge.id}
          challengeTitle={challenge.title}
          requirements={items.map(item => ({
            id: item.requirement.id,
            title: item.requirement.title,
            type: item.requirement.type as ChallengeType,
            targetValue: item.requirement.targetValue,
            unit: item.requirement.unit as ChallengeUnit,
            requirementGroup: (item.requirement as { requirementGroup?: number }).requirementGroup,
          }))}
          existingCheckin={{
            note: note,
            imageUrl: imageUrl,
            mediaUrls: mediaUrls,
            linkUrl: linkUrl,
            items: items.map(item => ({
              requirementId: item.requirement.id,
              value: item.value,
              isDone: item.isDone,
            })),
          }}
          date={new Date(checkinDate).toISOString().split('T')[0]}
        />
      )}
    </Card>
  );
}

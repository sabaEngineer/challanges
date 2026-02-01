"use client";

import { useEffect, useRef } from "react";
import { startSession, updateSessionDuration, endSession } from "@/actions/analytics";

function getDeviceType(): "ios" | "android" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function SessionTracker() {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const device = getDeviceType();
    const userAgent = navigator.userAgent;

    // Start session
    startSession(device, userAgent).then((result) => {
      if (result.sessionId) {
        sessionIdRef.current = result.sessionId;
      }
    });

    // Update duration every 30 seconds
    const interval = setInterval(() => {
      if (sessionIdRef.current) {
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateSessionDuration(sessionIdRef.current, durationSec);
        lastUpdateRef.current = Date.now();
      }
    }, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionIdRef.current) {
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        // Use sendBeacon for reliability when page is closing
        navigator.sendBeacon?.(
          "/api/analytics/end-session",
          JSON.stringify({ sessionId: sessionIdRef.current, durationSec })
        );
      }
    };

    // Handle beforeunload
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        endSession(sessionIdRef.current, durationSec);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      // End session on unmount
      if (sessionIdRef.current) {
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        endSession(sessionIdRef.current, durationSec);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

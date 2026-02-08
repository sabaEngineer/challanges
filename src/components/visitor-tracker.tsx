"use client";

import { useEffect, useRef } from "react";
import { trackVisitor } from "@/actions/analytics";

// Parse user agent to get device, OS, and browser info
function parseUserAgent(ua: string) {
  const uaLower = ua.toLowerCase();
  
  // Device Type
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = "tablet";
  }
  
  // OS
  let os = "other";
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = "ios";
  } else if (/android/i.test(ua)) {
    os = "android";
  } else if (/windows/i.test(ua)) {
    os = "windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macos";
  } else if (/linux/i.test(ua)) {
    os = "linux";
  }
  
  // Browser
  let browser = "other";
  if (/edg/i.test(ua)) {
    browser = "edge";
  } else if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
    // Check for Samsung browser
    if (/samsungbrowser/i.test(ua)) {
      browser = "samsung";
    } else {
      browser = "chrome";
    }
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "safari";
  } else if (/firefox/i.test(ua)) {
    browser = "firefox";
  } else if (/opera|opr/i.test(ua)) {
    browser = "opera";
  }
  
  return { deviceType, os, browser };
}

// Generate or get visitor ID from localStorage
function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  
  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
}

export function VisitorTracker() {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return;
    hasTracked.current = true;

    const track = async () => {
      try {
        const visitorId = getVisitorId();
        const ua = navigator.userAgent;
        const { deviceType, os, browser } = parseUserAgent(ua);
        
        await trackVisitor({
          visitorId,
          deviceType,
          os,
          browser,
          userAgent: ua,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          language: navigator.language,
          referrer: document.referrer || undefined,
          page: window.location.pathname,
        });
      } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.error("Error tracking visitor:", error);
      }
    };

    // Small delay to not block initial render
    setTimeout(track, 1000);
  }, []);

  return null;
}

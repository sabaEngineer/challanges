"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { requestNotificationPermission, initializeFirebase, onForegroundMessage } from "@/lib/firebase";
import { savePushToken, getPushNotificationStatus } from "@/actions/push-notifications";

// Check if running in PWA mode (added to home screen)
function isRunningAsPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error - iOS specific property
    window.navigator.standalone === true
  );
}

// Check if iOS device (any browser) - iOS doesn't support push in browser
function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // If running as PWA, push notifications can work
  if (isRunningAsPWA()) return false;
  return isIOS;
}

export function PushNotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false);
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  useEffect(() => {
    const init = async () => {
      console.log("[Push] Init - UA:", navigator.userAgent);
      console.log("[Push] isIOSDevice:", isIOSDevice());
      console.log("[Push] isRunningAsPWA:", isRunningAsPWA());
      
      // Check if iOS device (needs PWA for push notifications)
      if (isIOSDevice()) {
        console.log("[Push] iOS detected - showing PWA instructions");
        setIsIOSBrowser(true);
        const dismissed = localStorage.getItem("push-notification-ios-dismissed");
        console.log("[Push] iOS dismissed:", dismissed);
        if (!dismissed) setShowBanner(true);
        return;
      }

      // Check if notifications are supported
      const hasNotification = typeof window !== "undefined" && "Notification" in window;
      const hasServiceWorker = "serviceWorker" in navigator;
      console.log("[Push] hasNotification:", hasNotification, "hasServiceWorker:", hasServiceWorker);
      
      if (hasNotification && hasServiceWorker) {
        setIsSupported(true);
        initializeFirebase();
        
        // Register service worker
        try {
          await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
        
        // Check current status
        const status = await getPushNotificationStatus();
        setIsEnabled(status.enabled);
        
        // Show banner if not enabled and not denied
        if (!status.enabled && Notification.permission !== "denied") {
          const dismissed = localStorage.getItem("push-notification-dismissed");
          if (!dismissed) setShowBanner(true);
        }
        
        // Listen for foreground messages
        onForegroundMessage(() => {});
      }
    };

    init();
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    setHasAsked(true);
    
    try {
      const token = await requestNotificationPermission();
      if (token) {
        const result = await savePushToken(token);
        if (result.success) {
          setIsEnabled(true);
          setShowBanner(false);
        }
      } else {
        setShowBanner(false);
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
    }
    
    setIsLoading(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(
      isIOSBrowser ? "push-notification-ios-dismissed" : "push-notification-dismissed",
      "true"
    );
  };

  // Show iOS-specific banner
  if (isIOSBrowser && showBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">🔔</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Enable Notifications</h3>
              <p className="text-sm text-slate-400 mb-3">
                To get the most out of Challenges, we need to send you reminders about your daily check-ins. Please follow these steps to enable notifications:
              </p>
              <div className="text-sm text-slate-300 mb-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs shrink-0">1</span>
                  <span>Open this website in <span className="text-white font-medium">Safari</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs shrink-0">2</span>
                  <span>Tap <span className="text-white font-medium">aA</span> in the address bar</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs shrink-0">3</span>
                  <span>Tap <span className="text-white font-medium">&quot;Add to Home Screen&quot;</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs shrink-0">4</span>
                  <span>Tap <span className="text-white font-medium">&quot;Add&quot;</span> in the top right</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs shrink-0">5</span>
                  <span>Open the app from your home screen</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Maybe later
              </Button>
            </div>
            <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not supported
  if (!isSupported) return null;

  // Show enable banner
  if (showBanner && !isEnabled && !hasAsked) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50">
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">🔔</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Stay Updated!</h3>
              <p className="text-sm text-slate-400 mb-3">
                Get notified when someone comments on your posts.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {isLoading ? "..." : "Enable"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismiss} disabled={isLoading}>
                  Not now
                </Button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

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

// Check if iOS Safari (regular browser, not PWA)
function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  return isIOS && isWebkit && !isChrome && !isFirefox && !isRunningAsPWA();
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
      // Check if iOS Safari (needs PWA)
      if (isIOSSafari()) {
        setIsIOSBrowser(true);
        const dismissed = localStorage.getItem("push-notification-ios-dismissed");
        if (!dismissed) setShowBanner(true);
        return;
      }

      // Check if notifications are supported
      const hasNotification = typeof window !== "undefined" && "Notification" in window;
      const hasServiceWorker = "serviceWorker" in navigator;
      
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
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">📱</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Get Notifications on iOS</h3>
              <p className="text-sm text-slate-400 mb-2">
                To receive push notifications on your iPhone:
              </p>
              <ol className="text-sm text-slate-400 mb-3 space-y-1 list-decimal list-inside">
                <li>Tap the <span className="text-white">Share</span> button ⬆️</li>
                <li>Tap <span className="text-white">&quot;Add to Home Screen&quot;</span></li>
                <li>Open the app from your home screen</li>
              </ol>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Got it
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

"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { requestNotificationPermission, initializeFirebase, onForegroundMessage } from "@/lib/firebase";
import { savePushToken, disablePushNotifications, getPushNotificationStatus } from "@/actions/push-notifications";

interface PushNotificationPromptProps {
  // Show as a banner prompt (true) or just handle silently (false)
  showPrompt?: boolean;
}

export function PushNotificationPrompt({ showPrompt = true }: PushNotificationPromptProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true);
      
      // Initialize Firebase
      initializeFirebase();
      
      // Check current status
      checkStatus();
      
      // Register service worker
      registerServiceWorker();
      
      // Listen for foreground messages
      const unsubscribe = onForegroundMessage((payload) => {
        console.log("Foreground message received:", payload);
        // Show a toast or in-app notification for foreground messages
        // The browser won't show a system notification for foreground messages automatically
      });
      
      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("Service Worker registered:", registration);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  };

  const checkStatus = async () => {
    const status = await getPushNotificationStatus();
    setIsEnabled(status.enabled);
    
    // Show banner if not yet enabled and not denied
    if (!status.enabled && Notification.permission !== "denied") {
      const dismissed = localStorage.getItem("push-notification-dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    }
  };

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
        // Permission denied or error
        setShowBanner(false);
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
    }
    
    setIsLoading(false);
  };

  const handleDisable = async () => {
    setIsLoading(true);
    
    try {
      const result = await disablePushNotifications();
      if (result.success) {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Error disabling notifications:", error);
    }
    
    setIsLoading(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("push-notification-dismissed", "true");
  };

  // Don't render anything if not supported
  if (!isSupported) return null;

  // If showPrompt is false, just handle the logic silently
  if (!showPrompt) return null;

  // Show banner prompt
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
                Get notified when your teammates complete check-ins, comment on your posts, and more.
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  disabled={isLoading}
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
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

// Settings component for managing push notifications
export function PushNotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermissionStatus(Notification.permission);
      checkStatus();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkStatus = async () => {
    const status = await getPushNotificationStatus();
    setIsEnabled(status.enabled);
    setIsLoading(false);
  };

  const handleToggle = async () => {
    setIsLoading(true);
    
    if (isEnabled) {
      const result = await disablePushNotifications();
      if (result.success) {
        setIsEnabled(false);
      }
    } else {
      const token = await requestNotificationPermission();
      if (token) {
        const result = await savePushToken(token);
        if (result.success) {
          setIsEnabled(true);
          setPermissionStatus("granted");
        }
      } else {
        setPermissionStatus(Notification.permission);
      }
    }
    
    setIsLoading(false);
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-slate-800/50 rounded-xl">
        <p className="text-sm text-slate-400">
          Push notifications are not supported in your browser.
        </p>
      </div>
    );
  }

  if (permissionStatus === "denied") {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔕</span>
          <div>
            <p className="text-sm text-red-400 font-medium">Notifications Blocked</p>
            <p className="text-xs text-slate-400 mt-1">
              You&apos;ve blocked notifications. To enable them, click the lock icon in your browser&apos;s address bar and allow notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{isEnabled ? "🔔" : "🔕"}</span>
          <div>
            <p className="text-sm text-white font-medium">Push Notifications</p>
            <p className="text-xs text-slate-400">
              {isEnabled ? "You'll receive notifications" : "Enable to get updates"}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isEnabled ? "bg-amber-500" : "bg-slate-700"
          } ${isLoading ? "opacity-50" : ""}`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              isEnabled ? "left-[26px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

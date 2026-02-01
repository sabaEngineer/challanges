// Firebase client-side configuration
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

// Firebase config - these values are safe to expose (client-side)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;

// Initialize Firebase (client-side only)
export function initializeFirebase() {
  if (typeof window === "undefined") return null;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  return app;
}

// Get Firebase Messaging instance
export function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  
  if (!app) {
    initializeFirebase();
  }
  
  if (!messaging && app) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error("Failed to initialize Firebase Messaging:", error);
      return null;
    }
  }
  
  return messaging;
}

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }
    
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;
    
    // Get the FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    
    return token;
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: unknown) => void) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  
  return onMessage(messaging, callback);
}

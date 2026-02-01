// Firebase client-side configuration for push notifications
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

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

export function initializeFirebase() {
  if (typeof window === "undefined") return null;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  return app;
}

function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  
  if (!app) initializeFirebase();
  
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

export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    
    const msg = getFirebaseMessaging();
    if (!msg) return null;
    
    return await getToken(msg, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
  const msg = getFirebaseMessaging();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}

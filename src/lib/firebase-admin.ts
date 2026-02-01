// Firebase Admin SDK for server-side push notifications
import admin from "firebase-admin";

// Initialize Firebase Admin SDK (singleton)
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Check for required environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin SDK not configured. Push notifications will be disabled.");
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

// Send push notification to a single user
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const app = getFirebaseAdmin();
  if (!app) return false;

  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        },
        fcmOptions: {
          link: data?.url || "/",
        },
      },
    };

    await admin.messaging().send(message);
    console.log("Push notification sent successfully to token:", token.substring(0, 20) + "...");
    return true;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    // Handle invalid/expired tokens
    if (firebaseError.code === "messaging/registration-token-not-registered" ||
        firebaseError.code === "messaging/invalid-registration-token") {
      console.log("Invalid push token, should be removed from database");
      return false;
    }
    console.error("Failed to send push notification:", error);
    return false;
  }
}

// Send push notification to multiple users
export async function sendPushNotificationToMany(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failedTokens: string[] }> {
  const app = getFirebaseAdmin();
  if (!app) return { successCount: 0, failedTokens: [] };

  if (tokens.length === 0) {
    return { successCount: 0, failedTokens: [] };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        },
        fcmOptions: {
          link: data?.url || "/",
        },
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
      }
    });

    console.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
    return { successCount: response.successCount, failedTokens };
  } catch (error) {
    console.error("Failed to send push notifications:", error);
    return { successCount: 0, failedTokens: tokens };
  }
}

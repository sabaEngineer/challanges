// Firebase Admin SDK for server-side push notifications
import admin from "firebase-admin";

function getFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin not configured - push notifications disabled");
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const app = getFirebaseAdmin();
  if (!app) return false;

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: { icon: "/favicon.ico" },
        fcmOptions: { link: data?.url || "/" },
      },
    });
    return true;
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "messaging/registration-token-not-registered" ||
        err.code === "messaging/invalid-registration-token") {
      console.log("Invalid push token");
    } else {
      console.error("Failed to send push notification:", error);
    }
    return false;
  }
}

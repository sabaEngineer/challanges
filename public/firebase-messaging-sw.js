// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Your Firebase config (same as in Firebase Console)
firebase.initializeApp({
  apiKey: "AIzaSyA6xm4Gj6j6pCtvaBqumTOTMqU-TJRU69U",
  authDomain: "challanges-3f55c.firebaseapp.com",
  projectId: "challanges-3f55c",
  storageBucket: "challanges-3f55c.firebasestorage.app",
  messagingSenderId: "781027111092",
  appId: "1:781027111092:web:22d26028c99670aa9f27e1",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'New Notification';
  self.registration.showNotification(title, {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    data: payload.data,
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

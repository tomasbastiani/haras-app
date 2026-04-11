importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// TODO: Colocar aquí la MISMA configuración que pusiste en src/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBfv5epvltQVgVrtn6Zbl6pGK3m5KTuUKc",
  authDomain: "harassantamaria-9ebc7.firebaseapp.com",
  projectId: "harassantamaria-9ebc7",
  storageBucket: "harassantamaria-9ebc7.firebasestorage.app",
  messagingSenderId: "815079543136",
  appId: "1:815079543136:web:b0736e0f3b5ca83d710e05",
  measurementId: "G-T9PDV6MME8"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve instance of Firebase Messaging
const messaging = firebase.messaging();

// Opcional: Personalizar como se muestra la notificacion cuando el navegador corre en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificacion recibida en Background ', payload);
  
  // Avisar a todas las pestañas abiertas de la app
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload: payload
      });
    });
  });

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

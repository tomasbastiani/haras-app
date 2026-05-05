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
  
  // Avisar a todas las pestañas abiertas de la app (para historial o badges)
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload: payload
      });
    });
  });

  // Como enviamos mensajes "Data-only", extraemos de payload.data
  const notificationTitle = payload.data.title || "Haras Santa María";
  const notificationOptions = {
    body: payload.data.body || "",
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: payload.data.url || 'https://harassantamaria.com.ar/login'
    },
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar el CLICK en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Cerrar la notificación

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Si hay una pestaña abierta con esa URL, enfocarla
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. Si no hay, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

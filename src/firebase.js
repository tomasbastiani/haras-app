// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import api from "@/axios";

// TODO: Replace with your app's Firebase project configuration
// Ve a la consola de Firebase -> Project Settings -> General -> Your apps -> Web app
const firebaseConfig = {
  apiKey: "AIzaSyBfv5epvltQVgVrtn6Zbl6pGK3m5KTuUKc",
  authDomain: "harassantamaria-9ebc7.firebaseapp.com",
  projectId: "harassantamaria-9ebc7",
  storageBucket: "harassantamaria-9ebc7.firebasestorage.app",
  messagingSenderId: "815079543136",
  appId: "1:815079543136:web:b0736e0f3b5ca83d710e05",
  measurementId: "G-T9PDV6MME8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Pedir permisos de notificacion a este navegador
export const requestPushNotificationPermission = async (userEmail) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Necesitarás obtener la VAPID Key (Public Key) desde:
      // Project Settings -> Cloud Messaging -> Web Push certificates -> Generate key pair
      const currentToken = await getToken(messaging, { 
          vapidKey: "BG8EsnZ7EOy4gGjm_HF03L8xWNIPwBTYs-v7rID_mmWExCKC9ljRgvsZUyqF331HMpWJN-mR94zIJNOWZ81jAoI" 
      });

      if (currentToken) {
        console.log("Token FCM obtenido:", currentToken);
        // Enviar token al backend de Laravel
        await sendTokenToServer(currentToken, userEmail);
      } else {
        console.log("No resulto obtener el token FCM.");
      }
    } else {
      console.log("Permiso para notificaciones denegado.");
    }
  } catch (error) {
    console.error("Error pidiendo permiso / obteniendo token FCM", error);
  }
};

const sendTokenToServer = async (token, userEmail) => {
  try {
    // Usa la instancia de axios configurada en @/axios (baseURL ya incluye /api)
    await api.post('/fcm-token', {
      email: userEmail,
      token: token
    });
    console.log("FCM Token registrado en la Base de Datos!");
  } catch (error) {
    console.error("Error enviando FCM token al backend:", error);
  }
};

// Escuchar notificaciones cuando la app está ABIERTA / ACTIVA
export const listenForegroundMessages = () => {
  // Caso 1: FCM entrega directamente al "Front"
  onMessage(messaging, (payload) => {
    console.log("Notificación recibida en foreground (onMessage): ", payload);
    dispatchPushEvent(payload);
  });

  // Caso 2: El Service Worker la recibe y nos la reenvía por postMessage
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.onmessage = (event) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        console.log("Notificación recibida desde Service Worker: ", event.data.payload);
        dispatchPushEvent(event.data.payload);
      }
    };
  }
};

const dispatchPushEvent = (payload) => {
  const event = new CustomEvent('push-notification', { 
    detail: {
      title: payload.notification.title,
      body: payload.notification.body
    }
  });
  window.dispatchEvent(event);
};

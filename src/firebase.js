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

// Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "BG8EsnZ7EOy4gGjm_HF03L8xWNIPwBTYs-v7rID_mmWExCKC9ljRgvsZUyqF331HMpWJN-mR94zIJNOWZ81jAoI";

// El mismo scope que usa Firebase por defecto: así se reutiliza el registro
// que ya tienen los dispositivos existentes en vez de crear un segundo SW.
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

/**
 * Registra firebase-messaging-sw.js y espera a que esté ACTIVO.
 *
 * Si se deja que getToken() lo registre solo, en un navegador recién instalado
 * (o con los datos del sitio borrados) el SW todavía se está instalando cuando
 * getToken() intenta suscribirse, y falla con "Subscription failed - no active
 * Service Worker". El error quedaba en la consola, el token nunca llegaba al
 * backend, y el dispositivo sólo quedaba registrado al loguearse por segunda vez.
 *
 * register() además hace que el navegador busque una versión nueva del SW, que
 * de otro modo no ocurre nunca: el scope no es una página a la que se navegue.
 */
const registrarServiceWorker = async () => {
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: SW_SCOPE });
  if (reg.active) return reg;

  const sw = reg.installing || reg.waiting;
  if (sw) {
    await new Promise((resolve) => {
      // Tope por si el SW falla al instalarse y nunca llega a "activated".
      const tope = setTimeout(resolve, 15000);
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated' || sw.state === 'redundant') {
          clearTimeout(tope);
          resolve();
        }
      });
    });
  }
  return reg;
};

/**
 * Obtiene el token de este navegador y lo manda al backend. Con un reintento:
 * la primera suscripción de un dispositivo nuevo es justo la que suele fallar.
 */
const registrarDispositivo = async () => {
  const reg = await registrarServiceWorker();

  let token = null;
  for (let intento = 1; intento <= 2 && !token; intento++) {
    try {
      token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    } catch (error) {
      if (intento === 2) throw error;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (token) {
    await sendTokenToServer(token);
  } else {
    console.log("No resulto obtener el token FCM.");
  }
};

// Pedir permisos de notificacion a este navegador (se llama al loguearse)
export const requestPushNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registrarDispositivo();
    } else {
      console.log("Permiso para notificaciones denegado.");
    }
  } catch (error) {
    console.error("Error pidiendo permiso / obteniendo token FCM", error);
  }
};

/**
 * Re-registro silencioso en cada apertura de la app, sin pedir nada al usuario.
 *
 * Cubre lo que el registro en el login no alcanza: FCM rota los tokens cada
 * tanto, y quien quedó sin registrar por una falla (ver registrarServiceWorker)
 * se arregla solo la próxima vez que abre la app, sin tener que volver a
 * loguearse. El backend lo trata como idempotente.
 */
const sincronizarDispositivo = () => {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  registrarDispositivo().catch((error) => {
    console.error("Error sincronizando el token FCM", error);
  });
};

const sendTokenToServer = async (token) => {
  try {
    // Usa la instancia de axios configurada en @/axios (baseURL ya incluye /api)
    // El usuario se identifica por el Bearer token del request, no hace falta enviar el email.
    await api.post('/fcm-token', { token: token });
    console.log("FCM Token registrado en la Base de Datos!");
  } catch (error) {
    console.error("Error enviando FCM token al backend:", error);
  }
};

// Escuchar notificaciones cuando la app está ABIERTA / ACTIVA
export const listenForegroundMessages = () => {
  // De paso actualiza el SW si hay versión nueva (ver registrarServiceWorker).
  sincronizarDispositivo();

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
  // FcmService manda los pushes como "data-only": arma message.data y nunca
  // message.notification. O sea que `payload.notification` viene undefined, y
  // leerlo directo tiraba un TypeError acá adentro: cada push que llegaba con la
  // app abierta rompía en esta línea y el snackbar no aparecía nunca. Se notaba
  // poco porque la notificación del sistema (la que se ve con la app cerrada) la
  // dibuja el service worker, que sí lee payload.data.
  //
  // Afecta a todos los módulos que mandan push, no sólo a la mensajería.
  // Se deja el fallback a `notification` por si alguna vez se manda de las dos
  // formas.
  const datos = payload?.data || {};
  const notif = payload?.notification || {};

  const event = new CustomEvent('push-notification', {
    detail: {
      title: datos.title || notif.title || 'Haras Santa María',
      body: datos.body || notif.body || '',
      url: datos.url || null,
      // Lo usa App.vue para decidir si el aviso va al historial de la campana.
      tipo: datos.tipo || null,
    }
  });
  window.dispatchEvent(event);
};

<template>
  <v-app>
    <!--
      La mensajería interna se sale del chrome de la app a propósito: ocupa la
      altura completa sin scroll de página y trae su propio encabezado, así que
      navbar, footer, el fondo con textura y el widget del bot de reclamos no van.
      Se resuelve con `meta.layout` en la ruta en vez de con layouts anidados
      para no tener que refactorizar el router entero por un solo módulo.
    -->
    <template v-if="!pantallaCompleta">
      <Navbar />
      <main class="main-content">
        <router-view />
      </main>
      <Footer />

      <!-- Asistente de reclamos (solo propietarios logueados) -->
      <ChatWidget />
    </template>

    <router-view v-else />

    <!-- Snackbar Global para Notificaciones Push -->
    <v-snackbar
      v-model="snackbar.show"
      :timeout="5000"
      color="primary"
      elevation="24"
      location="top right"
    >
      <div class="d-flex align-center">
        <v-icon color="white" class="mr-3">mdi-bell-ring</v-icon>
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ snackbar.title }}</div>
          <div class="text-body-2">{{ snackbar.body }}</div>
        </div>
      </div>
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="snackbar.show = false">
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import ChatWidget from './components/ChatWidget.vue'
import { listenForegroundMessages } from '@/firebase';
import { useNotifications } from '@/composables/useNotifications'
import { useAuth } from '@/composables/useAuth'

const { user } = useAuth();
const route = useRoute();

// Rutas que se dibujan solas, sin el chrome de la app (ver el template).
const pantallaCompleta = computed(() => route.meta?.layout === 'completo');
const { addNotification } = useNotifications();
const snackbar = reactive({
  show: false,
  title: '',
  body: ''
});

onMounted(() => {
  if (user.value) {
    try {
      listenForegroundMessages();
    } catch (e) {
      console.log('Firebase todavia no inicializado o sin permiso.', e);
    }
  }

  // Listener para el evento de notificación push que disparamos desde firebase.js
  window.addEventListener('push-notification', (event) => {
    snackbar.title = event.detail.title;
    snackbar.body = event.detail.body;
    snackbar.show = true;
    
    // Lo agregamos al historial en tiempo real
    addNotification(event.detail);
  });
});
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Oswald', sans-serif;
  background-color: #f4f4f4;
  scroll-behavior: smooth;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;

  /* Fondo 100% CSS. Las capas se pintan de arriba hacia abajo:
     la primera de la lista queda al frente. */
  background-color: #e9ece5;
  background-image:
    /* 1. Trama en rombos: dos juegos de lineas finas a +-45 grados */
    repeating-linear-gradient(45deg,
      rgba(44, 62, 80, 0.055) 0 1px, transparent 1px 16px),
    repeating-linear-gradient(-45deg,
      rgba(44, 62, 80, 0.055) 0 1px, transparent 1px 16px),
    /* 2. Halo verde de marca, arriba a la derecha */
    radial-gradient(900px 600px at 88% -5%, rgba(39, 174, 96, 0.14), transparent 62%),
    /* 3. Profundidad navy, abajo a la izquierda */
    radial-gradient(800px 600px at 0% 105%, rgba(44, 62, 80, 0.12), transparent 65%),
    /* 4. Degradado base (tomado de los colores de la foto original) */
    linear-gradient(160deg, #d9dcd5 0%, #e9ece5 48%, #f2f4ee 100%);
}

@media (max-width: 480px) {
  /* Asegurar que el texto de los inputs se vea */
  input,
  textarea,
  select,
  td {
    color: #111 !important;             /* color del texto */
    background-color: #ffffff;          /* fondo blanco */
    caret-color: #111;                  /* color del cursor */
  }

  /* Placeholder visible también */
  input::placeholder,
  textarea::placeholder {
    color: #6b7280;                     /* gris visible */
    opacity: 1;
  }

  /* Botón back visible */
  .back-button {
    background: transparent;
    border: none;
    color: #111;                        /* que no quede blanco sobre blanco */
    font-size: 20px;
  }
  
  .back-arrow {
    background: transparent;
    border: none;
    color: #111;                        /* que no quede blanco sobre blanco */
    font-size: 20px;
  }
  
  .arrow {
    background: transparent;
    border: none;
    color: #111;                        /* que no quede blanco sobre blanco */
    font-size: 20px;
  }
}

</style>

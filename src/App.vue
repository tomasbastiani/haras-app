<template>
  <v-app>
    <Navbar />
    <main class="main-content">
      <router-view />
    </main>
    <Footer />
    
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
import { onMounted, reactive } from 'vue';
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import { listenForegroundMessages } from '@/firebase';
import { useNotifications } from '@/composables/useNotifications'

const { addNotification } = useNotifications();
const snackbar = reactive({
  show: false,
  title: '',
  body: ''
});

const checkSession = () => {
  const loginTime = localStorage.getItem('loginTime');
  const sessionDuration = localStorage.getItem('sessionDuration');

  if (!loginTime || !sessionDuration) return false;

  const now = new Date().getTime();
  if (now - parseInt(loginTime) > parseInt(sessionDuration)) {
    // Sesión expirada
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('sessionDuration');
    router.push('/login'); // redirigir al login
    return false;
  }

  return true; // sesión válida
};

onMounted(() => {
  if (checkSession()) {
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
  background: url('@/assets/img/fondo.jpg') no-repeat center center fixed;
  background-size: cover;
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
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

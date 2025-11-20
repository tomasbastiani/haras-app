<template>
  <div id="app">
    <Navbar />
    <main class="main-content">
      <router-view />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import { onMounted} from 'vue';
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'

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
  checkSession();
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

<template>
  <div class="login-container">
    <div class="login-header">
      <button @click="goBack" class="back-button">←</button>
      <h1>Iniciar sesión</h1>
    </div>

    <form @submit.prevent="handleLogin" class="login-form">
      <label for="email">Correo electrónico</label>
      <input v-model="email" type="email" id="email" required />

      <label for="password">Contraseña</label>
      <input v-model="password" type="password" id="password" required />

      <button type="submit" :disabled="loading">
        <span v-if="loading" class="spinner"></span>
        <span v-else>Iniciar sesión</span>
      </button>
    </form>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/axios';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);
const router = useRouter();
const userExists = ref('');

onMounted(() => {
  checkUser();
});

const handleLogin = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.post('/login', {
      email: email.value,
      password: password.value,
    });

    const userEmail = response.data.user.email;

    // ⬇ Guardamos usuario y tiempo de login
    const now = new Date().getTime();
    const sessionDuration = 30 * 60 * 1000; // 30 minutos
    localStorage.setItem('user', userEmail);
    localStorage.setItem('loginTime', now);
    localStorage.setItem('sessionDuration', sessionDuration);

    // ⬇ Guardamos admin si corresponde
    if (userEmail === 'admin@hsm.com') {
      localStorage.setItem('admin', userEmail);
    } else {
      localStorage.removeItem('admin');
    }

    // ⬇ Configuramos auto-logout
    setTimeout(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('admin');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('sessionDuration');
      router.push('/login'); // redirigir al login
    }, sessionDuration);

    // ⬇ Redirigir al menú
    router.push('/menu').then(() => {
      window.location.reload();
    });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
};

const checkUser = () => {
  userExists.value = !!localStorage.getItem('user');
};

const goBack = () => {
  router.push('/');
};
</script>

<style scoped>
.login-container {
  width: 40%;
  margin: 5rem auto;
  padding: 3rem; /* Más padding interno */
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.login-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
  color: #2c3e50;
}

h1 {
  font-size: 2rem; /* Más grande el título */
  margin: 0;
  color: #2c3e50;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.login-form label {
  margin: 1rem 0 0.5rem;
  font-size: 1.1rem;
  color: #444;
}

.login-form input {
  padding: 0.75rem;
  font-size: 1.1rem;
  border: 1px solid #ccc;
  border-radius: 10px;
}

.login-form button {
    margin-top: 2rem;
    padding: 0.5rem;
    font-size: 1rem;
    background-color: #27ae60;
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s ease;
    width: 30%;
    margin-right: auto;
    margin-left: auto;
}

.login-form button:hover {
  background-color: #219150;
}

.error {
  text-align: center;
  color: red;
  margin-top: 1rem;
}

.spinner {
  border: 3px solid #fff;
  border-top: 3px solid #2c3e50;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .login-container {
      width: 90%;
  }
}
</style>

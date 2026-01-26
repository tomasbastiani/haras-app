<template>
  <div class="forgot-container">
    <div class="forgot-header">
      <button @click="goBack" class="back-button">←</button>
      <h1>Recuperar contraseña</h1>
    </div>

    <p class="subtitle">
      Ingresá el correo electrónico con el que te registraste.  
      Si existe en el sistema, te vamos a enviar un enlace para restablecer tu contraseña.
    </p>

    <form @submit.prevent="handleSubmit" class="forgot-form">
      <label for="email">Correo electrónico</label>
      <input
        v-model="email"
        type="email"
        id="email"
        required
        placeholder="tu-correo@ejemplo.com"
      />

      <button type="submit" :disabled="loading || !email">
        <span v-if="loading" class="spinner"></span>
        <span v-else>Enviar e-mail</span>
      </button>
    </form>

    <p v-if="successMessage" class="success">{{ successMessage }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/axios';

const router = useRouter();
const email = ref('');
const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const handleSubmit = async () => {
  loading.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const res = await api.post('/password/forgot', {
      email: email.value,
    });

    successMessage.value =
      res.data?.message ||
      'Si el correo existe, vas a recibir un email con instrucciones para recuperar tu contraseña.';
  } catch (error) {
    // Igual dejamos mensaje genérico
    errorMessage.value =
      error.response?.data?.message ||
      'Ocurrió un error al solicitar la recuperación de contraseña.';
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/login');
};
</script>

<style scoped>
.forgot-container {
  width: 40%;
  margin: 5rem auto;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.forgot-header {
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
  font-size: 2rem;
  margin: 0;
  color: #2c3e50;
}

.subtitle {
  margin-bottom: 1.5rem;
  color: #555;
  font-size: 0.95rem;
}

.forgot-form {
  display: flex;
  flex-direction: column;
}

.forgot-form label {
  margin: 1rem 0 0.5rem;
  font-size: 1.1rem;
  color: #444;
}

.forgot-form input {
  padding: 0.75rem;
  font-size: 1.1rem;
  border: 1px solid #ccc;
  border-radius: 10px;
}

.forgot-form button {
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
  width: 60%;
  margin-right: auto;
  margin-left: auto;
}

.forgot-form button:hover {
  background-color: #219150;
}

.success {
  text-align: center;
  color: #27ae60;
  margin-top: 1rem;
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
  .forgot-container {
    width: 90%;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 1.3rem;
  }

  .forgot-form {
    padding: 0.4rem;
    font-size: 0.8rem;
  }

  .forgot-form button {
    width: 80%;
  }
}
</style>

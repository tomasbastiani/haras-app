<template>
  <div class="change-password-container">
    <div class="header">
      <span class="back-arrow" @click="goBack">←</span>
      <h1>Cambiar Contraseña</h1>
    </div>

    <form @submit.prevent="handleChangePassword" class="form">
      <div class="form-group">
        <label for="currentPassword">Contraseña actual</label>
        <input type="password" id="currentPassword" v-model="currentPassword" required />
      </div>

      <div class="form-group">
        <label for="newPassword">Nueva contraseña</label>
        <input type="password" id="newPassword" v-model="newPassword" required />
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirmar nueva contraseña</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" required />
      </div>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

      <div class="form-group">
        <button type="submit" class="submit-button" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>Cambiar contraseña</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';

const router = useRouter();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const goBack = () => {
  router.push('/menu');
};

const handleChangePassword = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  isLoading.value = true;

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Las nuevas contraseñas no coinciden.';
    isLoading.value = false;
    return;
  }

  try {
    const token = localStorage.getItem('token');

    const response = await axios.post(
      '/change-password',
      {
        email: localStorage.getItem('user'),
        current_password: currentPassword.value,
        new_password: newPassword.value,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    successMessage.value = response.data.message;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';

    // Espera 2 segundos y redirige
    setTimeout(() => {
      router.push('/menu');
    }, 2000);
  } catch (error) {
    console.log('error', error);
    if (error.response?.data?.message === 'The new password must be at least 8 characters.') {
      errorMessage.value = 'La contraseña debe tener al menos 8 caracteres.';
    } else {
      errorMessage.value = error.response?.data?.message || 'Error al cambiar la contraseña.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.change-password-container {
  width: 40%;
  margin: 4rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
align-items: center;
margin-bottom: 2rem;
justify-content: center;
}

.back-arrow {
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
}

h1 {
  font-size: 1.8rem;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 1.5rem;
text-align: center;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

input {
  width: 80%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.submit-button {
width: 35%;
padding: 0.7rem;
background-color: #27ae60;
color: white;
border: none;
border-radius: 8px;
font-size: 1rem;
cursor: pointer;
transition: background-color 0.3s ease;
}

.submit-button:hover {
  background-color: #219150;
}

.error-message {
  background-color: #f8d7da;
    color: #842029;
    padding: 0.8rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    width: 80%;
    text-align: center;
    margin-right: auto;
    margin-left: auto;
}

.success-message {
  background-color: #d1e7dd;
  color: #0f5132;
  padding: 0.8rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  width: 80%;
text-align: center;
margin-right: auto;
margin-left: auto;
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
</style>

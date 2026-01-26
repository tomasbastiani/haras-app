<template>
  <div class="reset-container">
    <div class="reset-header">
      <button @click="goBack" class="back-button">←</button>
      <h1>Restablecer contraseña</h1>
    </div>

    <p class="subtitle">
      Ingresá tu nueva contraseña para la cuenta <strong>{{ email }}</strong>.
    </p>

    <form @submit.prevent="handleSubmit" class="reset-form">
      <label for="password">Nueva contraseña</label>
      <input
        v-model="password"
        type="password"
        id="password"
        required
      />

      <!-- ✅ Checklist de requisitos (copiado del cambio de contraseña) -->
      <ul class="password-rules">
        <li :class="{ valid: passwordValidation.hasMinLength }">
          <span class="icon">
            {{ passwordValidation.hasMinLength ? '✔' : '✖' }}
          </span>
          Mínimo 8 caracteres
        </li>
        <li :class="{ valid: passwordValidation.hasUppercase }">
          <span class="icon">
            {{ passwordValidation.hasUppercase ? '✔' : '✖' }}
          </span>
          Al menos una letra mayúscula
        </li>
        <li :class="{ valid: passwordValidation.hasNumber }">
          <span class="icon">
            {{ passwordValidation.hasNumber ? '✔' : '✖' }}
          </span>
          Al menos un número
        </li>
      </ul>

      <label for="password_confirmation">Confirmar contraseña</label>
      <input
        v-model="passwordConfirmation"
        type="password"
        id="password_confirmation"
        required
      />

      <button type="submit" :disabled="loading">
        <span v-if="loading" class="spinner"></span>
        <span v-else>Cambiar contraseña</span>
      </button>
    </form>

    <p v-if="successMessage" class="success">{{ successMessage }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/axios';

const route = useRoute();
const router = useRouter();

const email = ref('');
const token = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// ✅ estado derivado para la checklist (igual que en change-password pero usando "password")
const passwordValidation = computed(() => {
  const value = password.value || '';
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);

  return { hasMinLength, hasUppercase, hasNumber };
});

// ✅ función para armar mensajes de error al enviar
const getPasswordErrors = (pwd) => {
  const errors = [];

  if (pwd.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres.');
  }

  if (!/[A-Z]/.test(pwd)) {
    errors.push('La contraseña debe incluir al menos una letra mayúscula.');
  }

  if (!/\d/.test(pwd)) {
    errors.push('La contraseña debe incluir al menos un número.');
  }

  return errors;
};

onMounted(() => {
  email.value = route.query.email || '';
  token.value = route.query.token || '';

  if (!email.value || !token.value) {
    errorMessage.value = 'El enlace de recuperación no es válido.';
  }
});

const handleSubmit = async () => {
  if (!email.value || !token.value) return;

  // 1) Validar que coincidan
  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = 'Las contraseñas no coinciden.';
    return;
  }

  // 2) Validar requisitos de la nueva contraseña
  const passwordErrors = getPasswordErrors(password.value || '');
  if (passwordErrors.length > 0) {
    errorMessage.value = passwordErrors.join(' ');
    return;
  }

  loading.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const res = await api.post('/password/reset', {
      email: email.value,
      token: token.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    });

    successMessage.value =
      res.data?.message || 'Contraseña actualizada correctamente.';

    // Redirigir al login después de unos segundos
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      'Ocurrió un error al actualizar la contraseña.';
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/login');
};
</script>

<style scoped>
/* lo que ya tenías, más estilos mínimos para password-rules */

.reset-container {
  width: 40%;
  margin: 5rem auto;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.reset-header {
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

.reset-form {
  display: flex;
  flex-direction: column;
}

.reset-form label {
  margin: 1rem 0 0.5rem;
  font-size: 1.1rem;
  color: #444;
}

.reset-form input {
  padding: 0.75rem;
  font-size: 1.1rem;
  border: 1px solid #ccc;
  border-radius: 10px;
}

/* ✅ checklist de reglas */
.password-rules {
  list-style: none;
  padding-left: 0;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.password-rules li {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}

.password-rules li .icon {
  display: inline-block;
  width: 20px;
  margin-right: 0.25rem;
}

.password-rules li.valid {
  color: #27ae60;
}

.reset-form button {
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

.reset-form button:hover {
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
  .reset-container {
    width: 90%;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 1.3rem;
  }

  .reset-form {
    padding: 0.4rem;
    font-size: 0.8rem;
  }

  .reset-form button {
    width: 80%;
  }
}
</style>

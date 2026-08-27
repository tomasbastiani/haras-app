import axios from 'axios';
import { useAuth } from '@/composables/useAuth';

const api = axios.create({
  // baseURL: 'https://harassantamaria.com.ar/api/public/index.php/api',
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true
});

// Adjunta el token de sesión (Sanctum) a cada request autenticado.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend rechaza la sesión (token/cookie inválido o revocado), deslogueamos
// para que el navbar y el resto de la app se sincronicen de inmediato.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { logout } = useAuth();
      logout();
    }
    return Promise.reject(error);
  }
);

export default api;

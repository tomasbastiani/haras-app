import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Asegurate que coincida con tu backend
  withCredentials: true
});

export default api;

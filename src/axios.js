import axios from 'axios';

const api = axios.create({
  // baseURL: 'https://harassantamaria.com.ar/test/api',
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true
});

export default api;

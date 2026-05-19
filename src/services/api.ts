import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuración de la IP según el entorno
const BASE_URL = 'http://192.168.0.104:3333/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json', // Requerido por Laravel para responder en JSON ante errores
  },
  timeout: 15000,
});

// Interceptor para inyectar el Token de Sanctum en cada petición
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error al recuperar el token de autenticación', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores globales (ej. token expirado / 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Aquí podrías disparar una lógica para limpiar el estado si la sesión expira
      await SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
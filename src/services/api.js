import axios from "axios";
import { useAuthStore } from "../store/auth";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://backend-elecciones2025lp.vercel.app/";
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// si el backend devuelve 401, cerramos sesión
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export { api, API_URL };

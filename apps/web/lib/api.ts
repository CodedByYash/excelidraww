import axios from "axios";
import { useAuthStore } from "./auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/signin";
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  signup: (data: { email: string; name: string; password: string }) =>
    api.post("/auth/signup", data),
  signin: (data: { email: string; password: string }) =>
    api.post("/auth/signin", data),
  me: () => api.get("/auth/me"),
};

export const roomsApi = {
  list: () => api.get("/rooms"),
  create: (data: { name: string }) => api.post("/rooms", data),
  join: (roomId: string) => api.post(`/rooms/${roomId}/join`),
  getCanvas: (roomId: string) => api.get(`/rooms/${roomId}/canvas/latest`),
  saveCanvas: (roomId: string, design: any) =>
    api.post(`/rooms/${roomId}/canvas`, { design }),
};

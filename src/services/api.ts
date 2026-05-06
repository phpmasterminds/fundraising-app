/**
 * api.ts — Central Axios instance for PeerFund
 * - Attaches Bearer token automatically
 * - Handles 401 → clears session & redirects to /login
 * - Standardised error shape for all consumers
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';

// ─── Instance ─────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach token ──────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 globally ──────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid → clear session
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Redirect to login (works with Ionic router)
      window.location.href = '/login';
    }
    return Promise.reject(normaliseError(error));
  },
);

// ─── Error normaliser ─────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>; // Laravel validation errors
  status: number;
}

function normaliseError(error: AxiosError): ApiError {
  const data = error.response?.data as any;
  return {
    message: data?.message ?? error.message ?? 'Something went wrong',
    errors: data?.errors ?? undefined,
    status: error.response?.status ?? 0,
  };
}

export default api;
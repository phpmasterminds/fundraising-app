/**
 * api.ts — Central Axios instance for PeerFund
 * - Attaches Bearer token automatically
 * - Handles 401 → clears session & redirects to /login
 * - Standardised error shape for all consumers
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Preferences } from '@capacitor/preferences';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';

// ─── Instance ─────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
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
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Remember the current page so we can return here after re-login
      // (skip auth / entry pages — no point returning to those).
      const path = window.location.pathname + window.location.search;
      if (!/^\/(join|login|register|forgot-password|reset-password|qr)(\/|\?|$)/.test(path)) {
        localStorage.setItem('return_to', path);
      }
      // Token expired or invalid → clear session
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Drop the durable native copy too, so the dead token is not
      // restored on the next boot (which would loop straight back to 401).
      try {
        await Preferences.remove({ key: 'auth_token' });
        await Preferences.remove({ key: 'auth_user' });
      } catch { /* native store unavailable (web) — ignore */ }
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
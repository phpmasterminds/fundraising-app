/**
 * auth.ts — Authentication service for PeerFund
 * - Login / Register / Logout
 * - Secure token storage (localStorage — swap to Capacitor SecureStorage for native)
 * - Role helpers: getRole(), getUser(), isAuthenticated()
 */

import api, { ApiError } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'host' | 'donor';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

// ─── Core auth calls ──────────────────────────────────────────────────────────

/**
 * Login with email + password.
 * Stores token and user in localStorage on success.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  persistSession(data);
  return data;
}

/**
 * Register a new host or donor account.
 * Stores token and user in localStorage on success.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  persistSession(data);
  return data;
}

/**
 * Logout — revokes token on server, clears local session.
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearSession();
  }
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function persistSession(data: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getRole(): UserRole | null {
  return getUser()?.role ?? null;
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

/**
 * Re-fetch current user from server (useful after profile update).
 * Overwrites cached user in localStorage.
 */
export async function refreshUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/user');
  localStorage.setItem(USER_KEY, JSON.stringify(data));
  return data;
}

export function setRole(role: string): void {
  localStorage.setItem('pending_role', role);
}

export function getPendingRole(): string | null {
  return localStorage.getItem('pending_role');
}
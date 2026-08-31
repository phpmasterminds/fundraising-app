/**
 * admin.ts — Admin-only service calls for PeerFund
 * - Create Host accounts (see AdminController::createHost on the backend)
 * - List existing Host accounts (search + pagination)
 * - Platform-wide summary stats
 */

import api from './api';
import type { AuthUser } from './auth';

export interface CreateHostPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface CreateHostResponse {
  user: AuthUser;
  mail_sent: boolean;
}

export interface AdminStats {
  total_events: number;
  total_hosts: number;
  total_donors: number;
}

export interface ListHostsParams {
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Shape of Laravel's default paginate() response — only the fields the
 * dashboard actually uses are typed here.
 */
export interface PaginatedHosts {
  data: AuthUser[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

/**
 * POST /admin/hosts
 * Creates a new Host account with the password the admin set. `mail_sent`
 * reflects whether the backend was also able to email the credentials
 * (false until SMTP is configured in .env — see backend notes).
 */
export async function createHostAccount(payload: CreateHostPayload): Promise<CreateHostResponse> {
  const { data } = await api.post<CreateHostResponse>('/admin/hosts', payload);
  return data;
}

/**
 * GET /admin/hosts?search=&page=&per_page=
 * Lists host accounts, optionally filtered by name/email and paginated.
 */
export async function listHostAccounts(params: ListHostsParams = {}): Promise<PaginatedHosts> {
  const { data } = await api.get<PaginatedHosts>('/admin/hosts', { params });
  return data;
}

/**
 * GET /admin/stats
 * Platform-wide counts for the dashboard's summary cards.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}
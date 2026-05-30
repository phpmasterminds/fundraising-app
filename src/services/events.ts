import api from './api';

const STORAGE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace('/api', '') + '/storage/';


export interface CreateEventPayload {
  name:          string;
  charity_name:  string;
  description?:  string;
  target_amount: number;
  rounds_count:  number;
  group_size:    number;
  started_at?:   string;   // YYYY-MM-DD HH:MM:00
  duration?:     string;   // HH:MM
  round_time?:   number;   // seconds — waiting period between rounds (0 = manual)
  charity_link?: string;
  logo?:         File | null;
  images?:       File[];
}

export interface Event {
  id:                    number;
  name:                  string;
  charity_name:          string;
  description?:          string;
  target_amount:         number;
  rounds_count:          number;
  group_size:            number;
  started_at?:           string;
  charity_link?:         string;
  logo?:                 string;
  images?:               string[];
  join_code:             string;
  status:                'draft' | 'live' | 'finished' | 'unlisted';
  created_at:            string;
  total_raised?:         number;
  donors_count?:         number;
  is_member?:            boolean;
  duration?:             string;
  round_time?:           number;   // seconds — waiting period between rounds
  ignore_zero_bids?:     boolean;
  // Round state
  current_round_number?: number;
  completed_rounds?:     number;
  current_round_timer: { human: string; seconds: number } | null;
  round_progress?:       string;
  active_alert?:         string | null;
  // Live data
  current_groups?:       ApiGroup[];
  rounds_overview?:      ApiRound[];
  all_donors?:           ApiDonor[];
  qr_code?: string | null;
}

export interface ApiDonor {
  pseudonym:        string;
  initial:          string;
  bid_amount:       string | null;
  is_quit:          boolean;
  total_committed:  string | null;
  group_member_id?: number;
  emoji?:           string | null;
}

export interface ApiGroup {
  id?:        number;
  name:       string;
  bids:       number;
  total_bids: number;
  min?:       string | null;
  alert:      boolean;
  status:     'done' | 'pending' | 'waiting';
  donors:     ApiDonor[];
}

export interface ApiRound {
  id:           number;
  round_number: number;
  status:       'waiting' | 'open' | 'closed';
  raised:       string | null;
  alerts:       number | null;
  groups_done:  string;
  group_rows:   ApiGroupRow[];
  opened_at:    string | null;
  closed_at:    string | null;
}

export interface ApiGroupRow {
  name:         string;
  status:       'done' | 'pending' | 'waiting';
  alert:        boolean;
  detail:       string | null;
  detail_color: string;
}

export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return STORAGE_URL + path;
}

// ── Host event tab type ───────────────────────────────────────────

export type HostEventTab = 'upcoming' | 'finished' | 'unlisted';

/**
 * GET /host/events?tab=upcoming|finished|unlisted
 *
 * Backend filters by status per tab:
 *   upcoming  → draft + live
 *   finished  → finished
 *   unlisted  → unlisted
 */
export async function getEvents(tab: HostEventTab = 'upcoming'): Promise<Event[]> {
  const { data } = await api.get<Event[]>('/host/events', { params: { tab } });
  return data;
}

export async function getEvent(id: number): Promise<Event> {
  const { data } = await api.get<Event>(`/host/events/${id}`);
  return data;
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const form = new FormData();

  form.append('name',          payload.name);
  form.append('charity_name',  payload.charity_name);
  form.append('target_amount', String(payload.target_amount));
  form.append('rounds_count',  String(payload.rounds_count));
  form.append('group_size',    String(payload.group_size));

  if (payload.description)  form.append('description',  payload.description);
  if (payload.started_at)   form.append('started_at',   payload.started_at);
  if (payload.duration)     form.append('duration',     payload.duration);
  if (payload.charity_link) form.append('charity_link', payload.charity_link);
  if (payload.logo)         form.append('logo',         payload.logo);

  // Always send round_time — even 0 is a valid value (means host launches manually)
  if (payload.round_time !== undefined) {
    form.append('round_time', String(payload.round_time));
  }

  if (payload.images?.length) {
    payload.images.forEach((img) => form.append('images[]', img));
  }

  const { data } = await api.post<Event>('/host/events', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export async function updateEvent(id: number, data: {
  name?:             string;
  charity_name?:     string;
  target_amount?:    number;
  round_time?:       number;   // seconds — can be updated after creation
  ignore_zero_bids?: boolean;
}): Promise<Event> {
  const { data: result } = await api.put<Event>(`/host/events/${id}`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return result;
}

/**
 * POST /host/events/:id/unlist
 * Move a draft or live event to the unlisted tab.
 */
export async function unlistEvent(id: number): Promise<void> {
  await api.post(`/host/events/${id}/unlist`);
}

// ── Donor endpoints ───────────────────────────────────────────────

export type DonorEventTab = 'upcoming' | 'finished';

export async function getDonorEvents(tab: DonorEventTab): Promise<Event[]> {
  const { data } = await api.get<Event[]>('/donor/events', { params: { tab } });
  return Array.isArray(data) ? data : [];
}

// ── Host event lifecycle ──────────────────────────────────────────

export async function startEvent(id: number): Promise<Event> {
  const { data } = await api.post<Event>(`/host/events/${id}/start`);
  return data;
}

export async function endEvent(id: number): Promise<Event> {
  const { data } = await api.post<Event>(`/host/events/${id}/end`);
  return data;
}

export async function startRound(id: number): Promise<{ round_id: number }> {
  const { data } = await api.post(`/host/events/${id}/rounds/start`);
  return data;
}

export async function endRound(eventId: number, roundId: number): Promise<void> {
  await api.post(`/host/events/${eventId}/rounds/${roundId}/end`);
}

// ── Group management ─────────────────────────────────────────────

export async function moveGroupMembers(
  eventId: number,
  fromGroupId: number,
  toGroupId: number,
  groupMemberIds: number[],
): Promise<{ message: string; moved_count: number }> {
  const { data } = await api.post(
    `/host/events/${eventId}/groups/${fromGroupId}/move-members`,
    { to_group_id: toGroupId, group_member_ids: groupMemberIds },
  );
  return data;
}

export async function rebalanceGroups(
  eventId: number,
): Promise<{ message: string; group_count: number; total_members: number }> {
  const { data } = await api.post(`/host/events/${eventId}/groups/rebalance`);
  return data;
}

// DELETE /api/host/events/{eventId}/groups/{groupId}/members  (bulk delete)
export const deleteGroupMembers = async (
  eventId: number,
  groupId: number,
  groupMemberIds: number[]
): Promise<void> => {
  await api.delete(
    `/host/events/${eventId}/groups/${groupId}/members`,
    { data: { group_member_ids: groupMemberIds } }
  );
};
 
// POST /api/host/events/{eventId}/groups  (create new empty group)
export const createGroup = async (
  eventId: number
): Promise<{ message: string; group: { id: number; name: string; [key: string]: any } }> => {
  const res = await api.post(`/host/events/${eventId}/groups`);
  return res.data;
};
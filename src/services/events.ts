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
  status:                'draft' | 'live' | 'finished';
  created_at:            string;
  total_raised?:         number;
  donors_count?:         number;
  is_member?:            boolean;   // whether this donor has already joined
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
  pseudonym:       string;
  initial:         string;
  bid_amount:      string | null;
  is_quit:         boolean;
  total_committed: string | null;
}

export interface ApiGroup {
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

export async function getEvents(): Promise<Event[]> {
  const { data } = await api.get<Event[]>('/host/events');
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
  if (payload.charity_link) form.append('charity_link', payload.charity_link);
  if (payload.logo)         form.append('logo',         payload.logo);

  if (payload.images?.length) {
    payload.images.forEach((img) => form.append('images[]', img));
  }

  const { data } = await api.post<Event>('/host/events', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export async function updateEvent(id: number, data: {
  name?: string;
  charity_name?: string;
  target_amount?: number;
}): Promise<Event> {
  const { data: result } = await api.put<Event>(`/host/events/${id}`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return result;
}

// ── Donor endpoints ───────────────────────────────────────────────

export type DonorEventTab = 'upcoming' | 'finished';

/**
 * GET /donor/events?tab=upcoming|finished
 *
 * Returns ALL platform events (not just joined ones) filtered by tab:
 *   upcoming  → live + draft events  (donor can join)
 *   finished  → finished events
 *
 * Each event includes `is_member: boolean` so the UI can show
 * "Already Joined" vs "Join Event" in the preview sheet.
 *
 * Backend returns a plain JSON array (not wrapped in { events: [] }).
 */
export async function getDonorEvents(tab: DonorEventTab): Promise<Event[]> {
  const { data } = await api.get<Event[]>('/donor/events', { params: { tab } });
  return Array.isArray(data) ? data : [];
}

// ── Host event lifecycle ──────────────────────────────────────────

/** POST /host/events/:id/start — change status draft → live */
export async function startEvent(id: number): Promise<Event> {
  const { data } = await api.post<Event>(`/host/events/${id}/start`);
  return data;
}

/** POST /host/events/:id/end — change status live → finished */
export async function endEvent(id: number): Promise<Event> {
  const { data } = await api.post<Event>(`/host/events/${id}/end`);
  return data;
}

/** POST /host/events/:id/rounds/start — open a new round */
export async function startRound(id: number): Promise<{ round_id: number }> {
  const { data } = await api.post(`/host/events/${id}/rounds/start`);
  return data;
}

/** POST /host/events/:id/rounds/:rid/end — close the open round */
export async function endRound(eventId: number, roundId: number): Promise<void> {
  await api.post(`/host/events/${eventId}/rounds/${roundId}/end`);
}
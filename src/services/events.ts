import api from './api';

//const STORAGE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace('/api', '') + '/storage/';
const STORAGE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/api\/?$/, '') + '/storage/';

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
  // Group size used from round 2 onward. Null until round 1 closes, at which point
  // the backend stores the doubled value and the host may override it exactly once.
  group_size_after_r1?:  number | null;
  // True only while round 1 is closed and round 2 has not opened yet.
  can_change_group_size?: boolean;
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
  // Next round's OWN groups — reflects a PGA group-size change instantly.
  // current_groups shows the last CLOSED round while a round is 'waiting'.
  next_round_groups?:    ApiGroup[];
  rounds_overview?:      ApiRound[];
  all_donors?:           ApiDonor[];
  qr_code?: string | null;
  // PGA waiting-period countdown (remaining seconds) and pause state
  waiting_seconds_left?: number;
  pga_paused?:           boolean;
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

/*export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return STORAGE_URL + path;
}*/

export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // already a full URL (e.g. backend's `url` field) → use as-is
  if (/^https?:\/\//.test(path)) return path;
  // strip any leading slash or "storage/" so we never double it
  const clean = path.replace(/^\/?(storage\/)?/, '');
  return STORAGE_URL + clean;
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

/**
 * PATCH /host/events/:id/group-size
 *
 * Only valid while `can_change_group_size` is true (round 1 closed, round 2 not yet
 * open). Rebuilds round 2's groups from round 1's bid ranking at the new size.
 * Returns 422 outside that window.
 */
export async function updateGroupSize(
  eventId: number,
  groupSize: number,
): Promise<{ group_size_after_r1: number; groups: ApiGroup[] }> {
  const { data } = await api.patch(`/host/events/${eventId}/group-size`, {
    group_size: groupSize,
  });
  return data;
}

/**
 * POST /host/events/:id/rounds/pause-timer
 *
 * Pauses the donor-facing waiting countdown while the host reviews/adjusts
 * groups in the Proposed Group Allocations sheet. Idempotent.
 */
export async function pauseTimer(eventId: number): Promise<{ paused: boolean }> {
  const { data } = await api.post(`/host/events/${eventId}/rounds/pause-timer`);
  return data;
}

/**
 * POST /host/events/:id/rounds/resume-timer
 *
 * Reverses pauseTimer. The donor's remaining wait time is preserved — the
 * backend shifts the countdown forward by however long it was paused, rather
 * than losing that time. Safe to call when not currently paused (no-op).
 */
export async function resumeTimer(eventId: number): Promise<{ paused: boolean }> {
  const { data } = await api.post(`/host/events/${eventId}/rounds/resume-timer`);
  return data;
}

// ── Group management ─────────────────────────────────────────────

export async function moveGroupMembers(
  eventId: number,
  fromGroupId: number,
  toGroupId: number,
  groupMemberIds: number[],
  overrideCapacity: boolean = false,
): Promise<{ message: string; moved_count: number }> {
  const { data } = await api.post(
    `/host/events/${eventId}/groups/${fromGroupId}/move-members`,
    { to_group_id: toGroupId, group_member_ids: groupMemberIds, override_capacity: overrideCapacity },
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

// ── Waiting room (donors who viewed but haven't joined) ───────────

export interface WaitingRoomDonor {
  user_id:    number;
  name:       string;
  initial:    string;
  photo_url:  string | null;
  viewed_at:  string | null;
}

/**
 * GET /host/events/:id/waiting-room
 *
 * Donors who have opened the event detail page (donor EventController::show
 * logs the view) but are not yet on the roster (haven't joined). Shown to the
 * host on the Launch Event screen, before the first round starts.
 */
export async function getWaitingRoom(
  eventId: number,
): Promise<{ count: number; donors: WaitingRoomDonor[] }> {
  const { data } = await api.get(`/host/events/${eventId}/waiting-room`);
  return data;
}

// ── Host notifications ────────────────────────────────────────────

export interface HostNotification {
  id:         number;
  event_id:   number | null;
  type:       string;
  title:      string;
  event_name: string | null;
  read:       boolean;
  created_at: string;
}

export async function getNotifications(): Promise<{ data: HostNotification[]; unread: number }> {
  const { data } = await api.get<{ data: HostNotification[]; unread: number }>('/host/notifications');
  return data;
}

export async function markNotificationsRead(): Promise<void> {
  await api.post('/host/notifications/read');
}

// ── Donor messaging (host → donor, one-way) ───────────────────

export interface DonorMessage {
  id:           number;
  body:         string;
  from:         'host' | 'donor';
  status:       'sent' | 'delivered' | 'seen';
  delivered_at: string | null;
  read_at:      string | null;
  created_at:   string;
}

export interface PendingMessage {
  id:         number;
  event_id:   number;
  event_name: string | null;
  body:       string;
  created_at: string;
}

/** Reply sent from a donor back to the host (one-way response, no thread view on the donor side yet). */
export interface DonorReply {
  id:         number;
  body:       string;
  from:       'donor';
  created_at: string;
}

/** Host: thread of messages sent to one donor (oldest → newest). */
export async function getDonorMessages(
  eventId: number,
  groupMemberId: number,
): Promise<DonorMessage[]> {
  const { data } = await api.get<{ messages: DonorMessage[] }>(
    `/host/events/${eventId}/donors/${groupMemberId}/messages`,
  );
  return data.messages;
}

/** Host: send a message to one donor. Returns the created message. */
export async function sendDonorMessage(
  eventId: number,
  groupMemberId: number,
  body: string,
): Promise<DonorMessage> {
  const { data } = await api.post<{ message: DonorMessage }>(
    `/host/events/${eventId}/donors/${groupMemberId}/messages`,
    { body },
  );
  return data.message;
}

/** Donor: undelivered messages for the logged-in donor, FIFO across events. */
export async function getPendingMessages(): Promise<PendingMessage[]> {
  const { data } = await api.get<{ messages: PendingMessage[] }>(
    '/donor/messages/pending',
  );
  return data.messages;
}

/** Donor: mark messages seen once viewed/dismissed. */
export async function ackMessages(ids: number[]): Promise<void> {
  await api.post('/donor/messages/ack', { ids });
}

/** Donor: reply to the host within one event. */
export async function replyToHost(eventId: number, body: string): Promise<DonorReply> {
  const { data } = await api.post<{ message: DonorReply }>(
    `/donor/events/${eventId}/messages/reply`,
    { body },
  );
  return data.message;
}

/** Host: which donors (group_member_id) have an unread reply, for the All Donors unread dot. */
export async function getUnreadDonorMessageIds(eventId: number): Promise<number[]> {
  const { data } = await api.get<{ group_member_ids: number[] }>(
    `/host/events/${eventId}/donors/unread-messages`,
  );
  return data.group_member_ids;
}

// ★ NEW: donor's persistent "message the host" icon (BidFlow) - full two-way
// thread for one event, distinct from getPendingMessages()/ackMessages() above
// (that pair is the account-wide FIFO queue feeding the global notification
// modal; this is a plain per-event thread the donor can open any time).

export interface DonorThreadMessage {
  id:         number;
  body:       string;
  from:       'host' | 'donor';
  status:     'sent' | 'delivered' | 'seen';
  created_at: string;
}

/** Donor: full thread with the host for one event, oldest → newest. Opening it also clears the unread dot server-side. */
export async function getMyMessageThread(eventId: number): Promise<DonorThreadMessage[]> {
  const { data } = await api.get<{ messages: DonorThreadMessage[] }>(
    `/donor/events/${eventId}/messages`,
  );
  return data.messages;
}

/** Donor: unread host-message count for one event, for the message icon's red dot. Safe to poll — doesn't mark anything read. */
export async function getUnreadHostMessageCount(eventId: number): Promise<number> {
  const { data } = await api.get<{ unread: number }>(
    `/donor/events/${eventId}/messages/unread-count`,
  );
  return data.unread;
}
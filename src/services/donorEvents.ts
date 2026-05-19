/**
 * donorEvents.ts
 * Donor-side API calls — matches exact Laravel routes in api.php:
 *
 *  GET  /donor/events
 *  GET  /donor/events/{id}
 *  GET  /donor/events/{id}/group   ← round state + group info
 *  POST /donor/events/{id}/bid
 *  POST /donor/events/{id}/quit
 *  GET  /events/join/{code}        ← public, no auth
 */
import api from './api';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface DonorEventDetail {
  id:             number;
  name:           string;
  charity_name:   string;
  description:    string;
  started_at:     string | null;
  status:         'draft' | 'live' | 'finished';
  logo:           string | null;
  images:         string[];
  charity_link:   string | null;
  rounds_count:   number;
  group_size:     number;
  donors_count:   number;
  join_code:      string;
  /** null if not yet joined */
  my_pseudonym:   string | null;
  my_initial:     string | null;
  my_emoji:       string | null;
  /** true if donor has a group_members row for this event */
  is_member:      boolean;
}

export interface RoundState {
  id:             number | null;
  round_number:   number;
  status:         'waiting' | 'open' | 'closed';
  seconds_left:   number | null;
  matched_amount: number | null;
  match_ratio:    string | null;
  group_total:    number | null;
  group_size:     number | null;
  my_group:       MyGroup | null;
  my_bid:         number | null;
  my_cumulative:  number;
  round_bids:     RoundBid[];
}

export interface MyGroup {
  id:      number;
  name:    string;
  members: GroupMember[];
}

export interface GroupMember {
  pseudonym:  string;
  initial:    string;
  emoji:      string | null;
  is_you:     boolean;
  bid_status: 'bidding' | 'submitted' | 'waiting';
}

export interface RoundBid {
  pseudonym:  string;
  initial:    string;
  amount:     number;
  is_you:     boolean;
  is_minimum: boolean;
}

export interface PaymentSummary {
  donor_name:     string;
  total_amount:   number;
  event_name:     string;
  charity_name:   string;
  charity_link:   string | null;
  reference:      string;
  date:           string;
  rounds_detail:  { round: number; matched: number }[];
  payment_status: 'paid' | 'unpaid'; // whether donor has already paid
}

// ─────────────────────────────────────────────────────────────────
// Storage URL helper
// ─────────────────────────────────────────────────────────────────

const STORAGE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace('/api', '') + '/storage/';

export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return STORAGE_URL + path;
}

// ─────────────────────────────────────────────────────────────────
// API functions — exactly matching Laravel routes
// ─────────────────────────────────────────────────────────────────

/** GET /donor/events?tab=upcoming|finished */
export async function getDonorEvents(tab: 'upcoming' | 'finished'): Promise<DonorEventDetail[]> {
  const { data } = await api.get('/donor/events', { params: { tab } });
  return data;
}

/** GET /donor/events/:id */
export async function getDonorEventDetail(eventId: number): Promise<DonorEventDetail> {
  const { data } = await api.get<DonorEventDetail>(`/donor/events/${eventId}`);
  return data;
}

/** GET /donor/events/:id/group — current round + group state */
export async function getCurrentRound(eventId: number): Promise<RoundState> {
  const { data } = await api.get<RoundState>(`/donor/events/${eventId}/group`);
  return data;
}

/** POST /donor/events/:id/bid — submit bid for currently open round */
export async function submitBid(eventId: number, amount: number): Promise<{
  success: boolean;
  bid_id: number;
  round_id: number;
  round_number: number;
  amount: number;
  bid_status: 'active';
  message: string;
}> {
  const { data } = await api.post(`/donor/events/${eventId}/bid`, { amount });
  return data;
}

/** POST /donor/events/:id/join */
export async function joinEvent(
  eventId: number,
  code: string,
  pseudonym: string
): Promise<{ success: boolean }> {
	console.log(code+'--');
  const { data } = await api.post(`/donor/events/${eventId}/join`, {
    code,
    pseudonym,
  });
  return data;
}

/** POST /donor/events/:id/quit — donor opts out */
export async function quitEvent(eventId: number): Promise<{ success: boolean }> {
  const { data } = await api.post(`/donor/events/${eventId}/quit`);
  return data;
}

/** GET /events/join/:code — public, validates join code */
export async function getEventByCode(code: string): Promise<DonorEventDetail> {
  const { data } = await api.get<DonorEventDetail>(`/events/join/${code}`);
  return data;
}

/** GET /donor/events/:id/payment — after event finishes */
export async function getPaymentSummary(eventId: number): Promise<PaymentSummary> {
  const { data } = await api.get<PaymentSummary>(`/donor/events/${eventId}/payment`);
  return data;
}

/** POST /donor/events/:id/payment/mark-paid */
export async function markPaid(eventId: number): Promise<{ success: boolean }> {
  const { data } = await api.post(`/donor/events/${eventId}/payment/mark-paid`);
  return data;
}

/** GET /donor/events/:id/round-status — lightweight polling between rounds */
export interface RoundStatus {
  event_status:       string;
  current_round:      number;
  round_status:       'open' | 'waiting' | 'finished';
  seconds_left:       number | null;
  seconds_until_next: number | null;
  payment_status?:    'paid' | 'unpaid'; // present when donor has paid
}

export async function getRoundStatus(eventId: number): Promise<RoundStatus> {
  const { data } = await api.get<RoundStatus>(`/donor/events/${eventId}/round-status`);
  return data;
}

/** POST /donor/events/:id/rounds/advance
 *
 * Called when donor's waiting timer hits 0, or donor clicks "Continue to Round N".
 * Backend will:
 *   - Close current round if duration expired
 *   - Open next round if round_time has elapsed (or is 0 = manual)
 *   - Release pending bids for new round
 */
export interface AdvanceRoundResult {
  advanced:          boolean;
  event_status:      string;
  round_number?:     number;
  seconds_remaining?: number;
  message:           string;
}

export async function advanceRound(eventId: number): Promise<AdvanceRoundResult> {
  const { data } = await api.post<AdvanceRoundResult>(`/donor/events/${eventId}/rounds/advance`);
  return data;
}
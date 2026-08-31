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
  rounds_detail:  {
    round:       number;
    matched:     number;
    group_name?: string | null;
    group_bids?: RoundBid[];
  }[];
  payment_status: 'paid' | 'unpaid'; // whether donor has already paid
}

// ─────────────────────────────────────────────────────────────────
// Storage URL helper
// ─────────────────────────────────────────────────────────────────

const STORAGE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/api\/?$/, '') + '/storage/';

export function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.replace(/^\/?(storage\/)?/, '');
  return STORAGE_URL + clean;
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

/**
 * POST /donor/events/:id/join
 *
 * If round 1 has already closed for this event, the backend does not join
 * the donor immediately — it returns `pending_approval: true` instead, and
 * the donor sits on a "waiting for host approval" screen (see getJoinStatus
 * below) until the host approves/rejects from the Pending Join Requests
 * sheet.
 */
export async function joinEvent(
  eventId: number,
  code: string,
  pseudonym: string
): Promise<{ success: boolean; pending_approval?: boolean; message?: string }> {
	console.log(code+'--');
  const { data } = await api.post(`/donor/events/${eventId}/join`, {
    code,
    pseudonym,
  });
  return data;
}

export interface JoinStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected';
}

/**
 * GET /donor/events/:id/join-status — poll while on the "waiting for host
 * approval" screen. 'approved' means the roster row now exists and the
 * donor can proceed into /bid exactly like a normal joiner.
 */
export async function getJoinStatus(eventId: number): Promise<JoinStatus> {
  const { data } = await api.get<JoinStatus>(`/donor/events/${eventId}/join-status`);
  return data;
}

/** POST /donor/events/:id/quit — donor opts out */
export async function quitEvent(eventId: number): Promise<{ success: boolean }> {
  const { data } = await api.post(`/donor/events/${eventId}/quit`);
  return data;
}

/**
 * Shape actually returned by GET /events/join/:code. Callers already read
 * `.event`, so this only makes the existing behaviour typed — `lock` is new
 * and lets the join / QR screens see the lock before attempting a join.
 */
export interface EventByCodeResult {
  event:          DonorEventDetail;
  already_joined: boolean;
  lock:           ActiveEventLock;
}

/** GET /events/join/:code — public, validates join code */
export async function getEventByCode(code: string): Promise<any> {
  const { data } = await api.get<EventByCodeResult>(`/events/join/${code}`);
  return data;
}

/** GET /donor/events/:id/payment — after event finishes */
export async function getPaymentSummary(eventId: number): Promise<PaymentSummary> {
  const { data } = await api.get<PaymentSummary>(`/donor/events/${eventId}/payment`);
  return data;
}

/** POST /donor/events/:id/payment/mark-paid */
export async function markPaid(eventId: number): Promise<{ success: boolean }> {
	console.log('came');
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
  /** true while the host has paused the PGA waiting timer to review/adjust groups */
  paused?:            boolean;
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

export interface RoundHistoryEntry {
  round_number:   number;
  your_bid:       number | null;  // null = did not bid this round, 0 = bid zero
  group_name:     string | null;
  group_size:     number;
  matched_amount: number;         // lowest non-zero bid in your group that round
  you_owe:        number;         // matched_amount, or 0 if your own bid was zero
  counted:        boolean;        // whether this round counts toward your payment
}
 
export interface RoundHistory {
  event_name:   string;
  charity_name: string;
  rounds:       RoundHistoryEntry[];
  payment_due:  number;           // sum of you_owe across all rounds
}
 
// GET /donor/events/:id/history
export async function getRoundHistory(eventId: number): Promise<RoundHistory> {
  const { data } = await api.get<RoundHistory>(`/donor/events/${eventId}/history`);
  return data;
}

// ─────────────────────────────────────────────────────────────────
// Global payment gate — oldest finished event still owing money
// ─────────────────────────────────────────────────────────────────

export interface PendingPayment {
  has_pending: boolean;
  event_id?:   number;
  event_name?: string;
  amount?:     number;
}

/** GET /donor/pending-payment — drives the app-wide payment lock */
export async function getPendingPayment(): Promise<PendingPayment> {
  const { data } = await api.get<PendingPayment>('/donor/pending-payment');
  return data;
}

// ─────────────────────────────────────────────────────────────────
// Single active event lock — a donor may take part in one event at a time
// ─────────────────────────────────────────────────────────────────

export interface ActiveEventLock {
  locked:    boolean;
  event_id:  number | null;
  join_code: string | null;
  /**
   * 'in_event'    — the event is still running; the donor stays inside it.
   * 'payment_due' — the event finished but is unpaid. PaymentGate owns this
   *                 state; EventLockGuard defers so the two don't fight over
   *                 the redirect.
   */
  reason: 'in_event' | 'payment_due' | null;
}

/** GET /donor/active-event — the event this donor is currently locked to */
export async function getActiveEvent(): Promise<ActiveEventLock> {
  const { data } = await api.get<ActiveEventLock>('/donor/active-event');
  return data;
}
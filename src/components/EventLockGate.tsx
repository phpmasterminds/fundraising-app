import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { isAuthenticated, getRole } from '../services/auth';
import { getActiveEvent, ActiveEventLock } from '../services/donorEvents';

/**
 * App-wide single-event lock.
 *
 * A donor may take part in one event at a time. EventLockProvider polls
 * /donor/active-event (donor sessions only); EventLockGuard watches navigation
 * and confines the donor to that one event, bouncing every other route — and
 * every back-button press — back to it.
 *
 * This is the cosmetic half of the rule. The half that actually holds is
 * EnsureDonorEventAccess on the API, which refuses event-scoped requests for
 * any other event regardless of what the client does.
 *
 * Division of labour with PaymentGate: when the lock reason is 'payment_due'
 * the donor owes money on a finished event, and PaymentGuard already confines
 * them to /payment/:id. This guard steps aside in that case — two guards
 * calling history.replace on the same navigation would fight each other.
 *
 * The lock releases when the donor quits (BidFlow's "Quit Event"), or when the
 * event has finished and payment is settled.
 */

interface LockValue {
  lock: ActiveEventLock | null;
  refresh: () => Promise<void>;
}

const EventLockContext = createContext<LockValue>({
  lock: null,
  refresh: async () => {},
});

export const useEventLock = () => useContext(EventLockContext);

const POLL_MS = 15000;

export const EventLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lock, setLock] = useState<ActiveEventLock | null>(null);

  const refresh = useCallback(async () => {
    // Donor-only. Hosts and logged-out users are never locked.
    if (!isAuthenticated() || getRole() !== 'donor') {
      setLock(null);
      return;
    }
    try {
      const data = await getActiveEvent();
      setLock(data && data.locked ? data : null);
    } catch {
      // Never lock on a failed check — leave the last known state untouched.
      // A donor should not be trapped by a dropped request.
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);

    // Re-check on foreground: the host may have ended the round, ended the
    // event, or removed the donor while the app was backgrounded.
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) refresh();
    });

    return () => {
      clearInterval(t);
      sub.then(h => h.remove()).catch(() => {});
    };
  }, [refresh]);

  return (
    <EventLockContext.Provider value={{ lock, refresh }}>
      {children}
    </EventLockContext.Provider>
  );
};

/* The one route a locked donor belongs on. BidFlow reads its event from the
   `id` query param when no router state is present, so this is safe to reach
   by replace() alone. */
const lockedPathFor = (eventId: number) => `/bid?id=${eventId}`;

/* Routes a locked donor may still reach:
   - /profile      — account screen, also allowed by PaymentGate
   - /payment/...  — PaymentGate's territory, never hijacked here
   - /bid?id=<the locked event>
   Everything else bounces. A /bid with no id, or the wrong id, is rewritten
   to the canonical locked path so BidFlow loads the right event. */
const isAllowedWhileLocked = (pathname: string, search: string, eventId: number): boolean => {
  if (pathname === '/profile') return true;
  if (pathname.startsWith('/payment/')) return true;
  if (pathname === '/bid') {
    return Number(new URLSearchParams(search).get('id') ?? 0) === eventId;
  }
  return false;
};

export const EventLockGuard: React.FC = () => {
  const { lock, refresh } = useEventLock();
  const location = useLocation();
  const history  = useHistory();
  const lastKey  = useRef<string>('');

  // Re-check on every navigation so the lock reacts instantly, not only on the
  // poll timer. Mirrors PaymentGuard's behaviour.
  useEffect(() => {
    const key = location.pathname + location.search;
    if (key !== lastKey.current) {
      lastKey.current = key;
      refresh();
    }
  }, [location.pathname, location.search, refresh]);

  const active =
    !!lock && lock.locked && lock.event_id !== null && lock.reason !== 'payment_due';

  // Enforce on navigation. history.replace (not push) is what neutralises the
  // browser back button: the bounced route never enters the history stack, so
  // there is nothing behind the donor to go back to.
  useEffect(() => {
    if (!active || !lock || lock.event_id === null) return;
    if (!isAuthenticated() || getRole() !== 'donor') return;
    if (isAllowedWhileLocked(location.pathname, location.search, lock.event_id)) return;
    history.replace(lockedPathFor(lock.event_id));
  }, [active, lock, location.pathname, location.search, history]);

  // Android hardware back / in-app back button. Registered above Ionic's own
  // handler so it runs first and Ionic never gets to pop the route. Leaving an
  // event is done through "Quit Event", not by backing out of it.
  useEffect(() => {
    if (!active || !lock || lock.event_id === null) return;

    const eventId = lock.event_id;
    const onBack = (ev: any) => {
      ev.detail.register(999, () => {
        history.replace(lockedPathFor(eventId));
      });
    };

    document.addEventListener('ionBackButton', onBack);
    return () => document.removeEventListener('ionBackButton', onBack);
  }, [active, lock, history]);

  return null;
};

/**
 * Back handler for in-page back arrows (the chevron a page draws in its own
 * header), as opposed to the platform back button.
 *
 * EventLockGuard cannot intercept router.back() / history.goBack():
 *
 *   - the ionBackButton event is raised only for the platform hardware or app
 *     back button, never for a programmatic back() call from an onClick, so
 *     the guard's priority-999 handler is never consulted; and
 *   - when the history stack is empty — a fresh tab, a deep link, an incognito
 *     session, a hard refresh — goBack() is a silent no-op. No navigation
 *     happens, so the guard's location effect never runs either and the button
 *     appears dead.
 *
 * Pages reachable while locked (/profile, /payment/:id, /bid) should call this
 * instead of router.back(). When locked it routes to the locked event; when
 * free it behaves like a normal back, falling back to `fallback` if there is
 * nothing to go back to.
 */
export function useLockedBack(fallback: string = '/devents') {
  const { lock } = useEventLock();
  const history  = useHistory();

  return useCallback(() => {
    if (lock && lock.locked && lock.event_id !== null && lock.reason !== 'payment_due') {
      history.replace(lockedPathFor(lock.event_id));
      return;
    }
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace(fallback);
  }, [lock, history, fallback]);
}
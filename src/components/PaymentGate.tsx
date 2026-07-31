import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { isAuthenticated, getRole } from '../services/auth';
import { getPendingPayment, PendingPayment } from '../services/donorEvents';

/**
 * App-wide payment lock.
 *
 * PaymentGateProvider polls /donor/pending-payment (donor sessions only) and holds the
 * oldest finished event the donor still owes money on. PaymentGuard watches navigation
 * and, whenever a payment is pending, confines the donor to /profile and /payment/:id,
 * bouncing every other route back to the payment page with a branded modal.
 *
 * The lock releases the instant the poll (or a manual refresh() after "Mark as paid")
 * returns has_pending=false.
 */

interface GateValue {
  pending: PendingPayment | null;
  refresh: () => Promise<void>;
}

const PaymentGateContext = createContext<GateValue>({
  pending: null,
  refresh: async () => {},
});

export const usePaymentGate = () => useContext(PaymentGateContext);

const POLL_MS = 20000;

export const PaymentGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingPayment | null>(null);

  const refresh = useCallback(async () => {
    // Donor-only gate. Hosts and logged-out users are never locked.
    if (!isAuthenticated() || getRole() !== 'donor') {
      setPending(null);
      return;
    }
    try {
      const data = await getPendingPayment();
      setPending(data && data.has_pending ? data : null);
    } catch {
      // Never lock on a failed check: leave the last known state untouched.
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <PaymentGateContext.Provider value={{ pending, refresh }}>
      {children}
    </PaymentGateContext.Provider>
  );
};

const isAllowedWhileLocked = (path: string) =>
  path === '/profile' || path.startsWith('/payment/');

export const PaymentGuard: React.FC = () => {
  const { pending, refresh } = usePaymentGate();
  const location = useLocation();
  const history  = useHistory();
  const lastPath = useRef<string>('');

  // Re-check on every navigation so the lock reacts instantly, not only on the timer.
  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      refresh();
    }
  }, [location.pathname, refresh]);

  // Enforce: a donor who owes on a finished event may only sit on profile or payment.
  // Silent redirect — no modal, no interstitial.
  useEffect(() => {
    if (!pending || !pending.has_pending) return;
    if (!isAuthenticated() || getRole() !== 'donor') return;
    if (isAllowedWhileLocked(location.pathname)) return;
    history.replace(`/payment/${pending.event_id}`);
  }, [pending, location.pathname, history]);

  return null;
};
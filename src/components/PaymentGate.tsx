import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { IonModal } from '@ionic/react';
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
  const [showModal, setShowModal] = useState(false);
  const lastPath = useRef<string>('');

  // Re-check on every navigation so the lock reacts instantly, not only on the timer.
  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      refresh();
    }
  }, [location.pathname, refresh]);

  // Enforce: a donor who owes on a finished event may only sit on profile or payment.
  useEffect(() => {
    if (!pending || !pending.has_pending) return;
    if (!isAuthenticated() || getRole() !== 'donor') return;
    if (isAllowedWhileLocked(location.pathname)) return;
    setShowModal(true);
    history.replace(`/payment/${pending.event_id}`);
  }, [pending, location.pathname, history]);

  return (
    <IonModal
      isOpen={showModal}
      onDidDismiss={() => setShowModal(false)}
      className="pg-modal"
    >
      <div className="pg-modal-card">
        <div className="pg-modal-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a7 7 0 0 0-7 7v3l-2 4h18l-2-4V9a7 7 0 0 0-7-7z" stroke="#C4811F" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="pg-modal-title">Payment required</h2>
        <p className="pg-modal-text">
          Please complete your donation for
          {pending?.event_name ? <strong> {pending.event_name}</strong> : ' your event'} before
          continuing. Your profile stays reachable at any time.
        </p>
        <button className="pg-modal-btn" onClick={() => setShowModal(false)}>
          Continue to payment
        </button>
      </div>

      <style>{`
        .pg-modal::part(content){
          --width:88%; --max-width:360px; --height:auto;
          --border-radius:16px; --background:transparent; --box-shadow:none;
        }
        .pg-modal-card{
          background:#fff; border-radius:16px; padding:26px 22px;
          text-align:center; font-family:'Outfit',sans-serif;
        }
        .pg-modal-icon{
          width:60px; height:60px; border-radius:50%; background:#FDF3E2;
          display:flex; align-items:center; justify-content:center; margin:0 auto 14px;
        }
        .pg-modal-title{ font-size:19px; font-weight:700; color:#1A1A2E; margin:0 0 8px; }
        .pg-modal-text{ font-size:14px; line-height:1.5; color:#5B6068; margin:0 0 20px; }
        .pg-modal-btn{
          width:100%; border:none; border-radius:65px; padding:14px;
          background:#FCB040; color:#25201D; font-family:'Outfit',sans-serif;
          font-weight:600; font-size:15px;
        }
      `}</style>
    </IonModal>
  );
};
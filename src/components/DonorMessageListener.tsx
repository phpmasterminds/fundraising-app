import { useEffect, useRef, useState, useCallback } from 'react';
import { getPendingMessages, ackMessages } from '../services/events';
import type { PendingMessage } from '../services/events';
import { isAuthenticated, getRole } from '../services/auth';
import './DonorMessageListener.css';

const POLL_MS = 15000;

/**
 * Global, app-wide listener for host → donor messages.
 *
 * Mounted once at the app root so it paints over whatever screen the
 * donor is on. Polls the account-wide pending queue; a donor is "active"
 * exactly when this poll runs, so undelivered messages surface the moment
 * they come online, oldest-first (FIFO). One modal shows at a time and is
 * acknowledged on dismiss before the next appears. Runs only for a
 * logged-in donor; everyone else renders nothing.
 */
const DonorMessageListener: React.FC = () => {
  const [queue, setQueue]   = useState<PendingMessage[]>([]);
  const seenIds             = useRef<Set<number>>(new Set());
  const acking              = useRef(false);

  const poll = useCallback(async () => {
    if (!isAuthenticated() || getRole() !== 'donor') return;
    try {
      const msgs = await getPendingMessages();
      if (!msgs.length) return;
      setQueue(prev => {
        const fresh = msgs.filter(m => !seenIds.current.has(m.id) && !prev.some(p => p.id === m.id));
        fresh.forEach(m => seenIds.current.add(m.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    } catch {
      /* offline / not authed — ignore, retry next tick */
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [poll]);

  const current = queue[0] ?? null;

  const dismiss = useCallback(async () => {
    if (!current || acking.current) return;
    acking.current = true;
    const id = current.id;
    setQueue(prev => prev.slice(1));           // advance immediately
    try { await ackMessages([id]); } catch { /* resurfaces next poll if unacked */ }
    finally { acking.current = false; }
  }, [current]);

  if (getRole() !== 'donor' || !current) return null;

  return (
    <div className="dm-overlay" role="dialog" aria-modal="true">
      <div className="dm-backdrop" onClick={dismiss} />
      <div className="dm-card">
        <div className="dm-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M4 5.5h16a1 1 0 011 1V16a1 1 0 01-1 1H9l-4 3.2V17H4a1 1 0 01-1-1V6.5a1 1 0 011-1z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="dm-title">Message from the host</span>
        {current.event_name && <span className="dm-event">{current.event_name}</span>}
        <p className="dm-body">{current.body}</p>
        <button className="dm-btn" onClick={dismiss}>
          {queue.length > 1 ? `Next (${queue.length - 1} more)` : 'Got it'}
        </button>
      </div>
    </div>
  );
};

export default DonorMessageListener;
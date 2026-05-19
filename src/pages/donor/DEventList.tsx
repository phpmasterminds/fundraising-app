import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect, useRef } from 'react';
import './DEventList.css';
import DonorHeader from '../../components/DonorHeader';
import { getDonorEvents, logoUrl, Event, DonorEventTab } from '../../services/events';
import { getEventByCode } from '../../services/donorEvents';

// ── Helpers ───────────────────────────────────────────────────────

function secondsUntil(startedAt?: string): number {
  if (!startedAt) return 0;
  const diff = Math.floor((new Date(startedAt).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

function formatCountdown(sec: number): string {
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function bgClass(event: Event): string {
  if (event.status === 'live')  return 'teal';
  if (event.status === 'draft') return 'orange';
  return 'light';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// ── Tabs config ───────────────────────────────────────────────────

const TABS: { key: DonorEventTab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'finished', label: 'Finished' },
];

// ── Component ─────────────────────────────────────────────────────

const DEventList: React.FC = () => {
  const router = useIonRouter();
  const [activeTab, setActiveTab]         = useState<DonorEventTab>('upcoming');
  const [events, setEvents]               = useState<Event[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode]                   = useState('');
  const [codeLoading, setCodeLoading]     = useState(false);
  const [codeError, setCodeError]         = useState<string | null>(null);
  // tick state — increments every second to force re-render of countdowns
  const [tick, setTick]                   = useState(0);
  const codeInputRef                      = useRef<HTMLInputElement>(null);

  // ── Fetch events ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getDonorEvents(activeTab)
      .then(data => { if (!cancelled) { setEvents(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError('Could not load events.'); setLoading(false); } });

    return () => { cancelled = true; };
  }, [activeTab]);

  // ── Global countdown ticker ───────────────────────────────────
  // Runs once the events are loaded; ticks every second so all
  // countdown badges re-render simultaneously.
  useEffect(() => {
    const hasCountdown = events.some(
      e => e.status === 'draft' && secondsUntil(e.started_at) > 0
    );
    if (!hasCountdown) return;

    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [events]);

  // ── Focus input when modal opens ──────────────────────────────
  useEffect(() => {
    if (showCodeModal) {
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } else {
      setCode('');
      setCodeError(null);
    }
  }, [showCodeModal]);

  const handleJoinWithCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setCodeError(null);
    setCodeLoading(true);

    try {
      const result = await getEventByCode(trimmed);
      localStorage.setItem('event_code', trimmed);
      setShowCodeModal(false);
      router.push(`/join-event?id=${result.event.id}`);
    } catch (err: any) {
      setCodeError(err?.response?.data?.message ?? 'Invalid event code. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="event-page">
        <div className="container delist-container">

          {/* ── Header ── */}
          <DonorHeader
            variant="main"
            username="John Doe 🐰"
            onUsernameClick={() => router.push('/profile')}
          />

          {/* ── Tabs ── */}
          <div className="tabs">
            {TABS.map(tab => (
              <div
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* ── Loading skeletons ── */}
          {loading && [1, 2, 3].map(i => (
            <div className="ecard" key={i}>
              <div className="card-left light" style={{ opacity: 0.4 }} />
              <div className="card-body" style={{ gap: 8 }}>
                <div style={{ height: 14, width: '60%', background: '#F1F2F6', borderRadius: 6 }} />
                <div style={{ height: 11, width: '40%', background: '#F1F2F6', borderRadius: 6, marginTop: 4 }} />
                <div style={{ height: 11, width: '30%', background: '#F1F2F6', borderRadius: 6, marginTop: 4 }} />
              </div>
            </div>
          ))}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="empty">{error}</div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && events.length === 0 && (
            <div className="empty">No events yet</div>
          )}

          {/* ── Event cards ── */}
          {!loading && !error && events.map(event => {
            const logo = logoUrl(event.logo);
            // `tick` is referenced so this re-evaluates every second
            const secs = secondsUntil(event.started_at);

            return (
              <div
                className="ecard"
                key={event.id}
                onClick={() => router.push(`/join-event?id=${event.id}`)}
              >
                <div className={`card-left ${bgClass(event)}`}>
                  {logo
                    ? <img src={logo} alt={event.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    : <img src="/assets/img/Event1.png" alt="" />
                  }
                </div>

                <div className="card-body">
                  <div className="card-header-row">
                    <h3>{event.name}</h3>
                  </div>

                  <p>{event.charity_name}</p>

                  <div className="meta">
                    <span>
                      <img src="/assets/img/users.svg" className="meta-icon" alt="" />
                      {event.donors_count ?? 0} donors
                    </span>
                    <span>
                      <img src="/assets/img/time.svg" className="meta-icon" alt="" />
                      {event.rounds_count} rounds
                    </span>
                  </div>

                  {event.status === 'live' && (
                    <div className="badge live">Live Event</div>
                  )}

                  {event.status === 'draft' && secs > 0 && (
                    <div className="badge upcoming">Live in ⏱ {formatCountdown(secs)}</div>
                  )}

                  {event.status === 'draft' && secs === 0 && (
                    <div className="badge scheduled">
                      Scheduled · {formatDate(event.started_at)}
                    </div>
                  )}

                  {event.status === 'finished' && (
                    <div className="badge scheduled">
                      Finished · {formatDate(event.started_at)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>

        {/* ── Join Event Bottom Bar ── 
        <div className="join-bottom-bar">
          <button
            className="join-code-btn"
            onClick={() => setShowCodeModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 9C2 7.89543 2.89543 7 4 7H20C21.1046 7 22 7.89543 22 9V10C21.1046 10 20 10.8954 20 12C20 13.1046 21.1046 14 22 14V15C22 16.1046 21.1046 17 20 17H4C2.89543 17 2 16.1046 2 15V14C2.89543 14 3 13.1046 3 12C3 10.8954 2.89543 10 2 10V9Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
            Join with Code
          </button>

          <button
            className="join-qr-btn"
            onClick={() => router.push('/qr')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="#2BA7A0" strokeWidth="1.8"/>
              <rect x="5" y="5" width="3" height="3" fill="#2BA7A0"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="#2BA7A0" strokeWidth="1.8"/>
              <rect x="16" y="5" width="3" height="3" fill="#2BA7A0"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="#2BA7A0" strokeWidth="1.8"/>
              <rect x="5" y="16" width="3" height="3" fill="#2BA7A0"/>
              <path d="M14 14H17V17" stroke="#2BA7A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 17H14.01" stroke="#2BA7A0" strokeWidth="2" strokeLinecap="round"/>
              <path d="M17 20H20V17" stroke="#2BA7A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 14H20.01" stroke="#2BA7A0" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>*/}

        {/* ── Code Entry Modal ── */}
        {showCodeModal && (
          <>
            {/* Backdrop */}
            <div
              className="code-modal-backdrop"
              onClick={() => setShowCodeModal(false)}
            />

            {/* Sheet */}
            <div className="code-modal-sheet">
              {/* Drag handle */}
              <div className="code-modal-handle" />

              <h2 className="code-modal-title">Enter Event Code</h2>
              <p className="code-modal-subtitle">
                Ask your host for the event code to join
              </p>

              <div className="code-modal-input-row">
                <input
                  ref={codeInputRef}
                  className="code-modal-input"
                  placeholder="e.g. HOPE2026"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
                  maxLength={20}
                  disabled={codeLoading}
                />
                {codeError && (
                  <span className="code-modal-error">{codeError}</span>
                )}
              </div>

              <button
                className={`code-modal-join-btn ${(!code.trim() || codeLoading) ? 'disabled' : ''}`}
                onClick={handleJoinWithCode}
                disabled={!code.trim() || codeLoading}
              >
                {codeLoading ? 'Checking...' : 'Join Event'}
              </button>

              <button
                className="code-modal-qr-link"
                onClick={() => { setShowCodeModal(false); router.push('/qr'); }}
              >
                {/* QR mini icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="#2BA7A0" strokeWidth="1.8"/>
                  <rect x="5" y="5" width="3" height="3" fill="#2BA7A0"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="#2BA7A0" strokeWidth="1.8"/>
                  <rect x="16" y="5" width="3" height="3" fill="#2BA7A0"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="#2BA7A0" strokeWidth="1.8"/>
                  <rect x="5" y="16" width="3" height="3" fill="#2BA7A0"/>
                  <path d="M14 14H17V17M17 17H20V20H14V17" stroke="#2BA7A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Scan QR Code instead
              </button>
            </div>
          </>
        )}

      </IonContent>
    </IonPage>
  );
};

export default DEventList;
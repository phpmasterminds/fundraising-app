import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './BidFlow.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

import {
  getDonorEventDetail,
  getCurrentRound,
  submitBid,
  quitEvent,
  getPaymentSummary,
  markPaidOffline,
  storageUrl,
  DonorEventDetail,
  RoundState,
  PaymentSummary,
} from '../../services/donorEvents';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
type Screen =
  | 'loading'
  | 'waiting'      // ← new: host hasn't opened round yet
  | 'starting'     // round just opened — show 2.5s animation then bid-entry
  | 'bid-entry'
  | 'confirm-bid'
  | 'submitted'
  | 'results'
  | 'payment-intro'
  | 'payment-form'
  | 'receipt';

interface Particle {
  x: number; y: number; w: number; h: number;
  color: string; angle: number; vx: number; vy: number; va: number; opacity: number;
}

const CONFETTI_COLORS = [
  '#2BA7A0','#2BA7A0','#2BA7A0',
  '#1A5C58','#1A5C58',
  '#0D3835','#0D3835',
  '#A8E6E2','#fff','#fff',
];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

/* ─────────────────────────────────────
   Main Component
───────────────────────────────────── */
const BidFlow: React.FC = () => {
  const router  = useIonRouter();
  const query   = useQuery();
  const eventId = Number(query.get('id'));

  // ── API data ──────────────────────────────────────────────────
  const [event,   setEvent]   = useState<DonorEventDetail | null>(null);
  const [round,   setRound]   = useState<RoundState | null>(null);
  const [payment, setPayment] = useState<PaymentSummary | null>(null);

  // ── UI state ──────────────────────────────────────────────────
  const [screen,        setScreen]        = useState<Screen>('loading');
  const [bidAmount,     setBidAmount]     = useState(0);
  const [inputVal,      setInputVal]      = useState('0');
  const [groupBidsOpen, setGroupBidsOpen] = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [slideImages,   setSlideImages]   = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const pollRef   = useRef<any>(null);

  // ─────────────────────────────────────────────────────────────
  // Polling helpers
  // ─────────────────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const rd = await getCurrentRound(eventId);
        setRound(rd);
        if (rd.status === 'open') {
          stopPolling();
          // Round just opened → show starting animation then bid-entry
          setScreen('starting');
        } else if (rd.status === 'closed') {
          stopPolling();
          setScreen('results');
        }
        // status === 'waiting' → keep polling silently, don't change screen
      } catch (_) {}
    }, 3000);
  }, [eventId]);

  // ─────────────────────────────────────────────────────────────
  // Initial load
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    Promise.all([
      getDonorEventDetail(eventId),
      getCurrentRound(eventId),
    ]).then(([ev, rd]) => {
      setEvent(ev);
      setRound(rd);

      const imgs = ev.images?.length
        ? ev.images.map(p => storageUrl(p) ?? '/assets/img/Slide1.jpg')
        : ['/assets/img/Slide1.jpg', '/assets/img/Slide2.jpg', '/assets/img/Slide3.jpg'];
      setSlideImages(imgs);

      const defaultBid = rd.my_bid ?? 0;
      setBidAmount(defaultBid);
      setInputVal(String(defaultBid));

      if (rd.status === 'open') {
        // Round is already open → show starting animation
        setScreen('starting');
      } else if (rd.status === 'closed') {
        setScreen('results');
      } else {
        // status === 'waiting' → wait for host to open round
        setScreen('waiting');
        startPolling();
      }
    }).catch(async () => {
      // getCurrentRound failed — no round exists yet
      try {
        const ev = await getDonorEventDetail(eventId);
        setEvent(ev);

        const imgs = ev.images?.length
          ? ev.images.map(p => storageUrl(p) ?? '/assets/img/Slide1.jpg')
          : ['/assets/img/Slide1.jpg', '/assets/img/Slide2.jpg', '/assets/img/Slide3.jpg'];
        setSlideImages(imgs);

        // No round yet — show waiting screen and poll
        setScreen('waiting');
        startPolling();
      } catch {
        setScreen('waiting');
      }
    });

    return () => stopPolling();
  }, [eventId]);

  // ─────────────────────────────────────────────────────────────
  // 'starting' → 'bid-entry' after 2.5s
  // Only fires when screen is 'starting' (round is open)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'starting') return;
    const t = setTimeout(() => setScreen('bid-entry'), 2500);
    return () => clearTimeout(t);
  }, [screen]);

  // ─────────────────────────────────────────────────────────────
  // 'submitted' → show for 2s then poll for round to close
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'submitted') return;
    const t = setTimeout(() => {
      startPolling();
      setScreen('results');
    }, 2000);
    return () => clearTimeout(t);
  }, [screen]);

  // ─────────────────────────────────────────────────────────────
  // 'results' → poll until next round or event finishes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'results') return;
    startPolling();
    return () => stopPolling();
  }, [screen]);

  // ─────────────────────────────────────────────────────────────
  // When round data updates on results screen
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!round || screen !== 'results') return;
    if (event?.status === 'finished') {
      stopPolling();
      getPaymentSummary(eventId).then(setPayment);
    }
    if (round.status === 'open' && screen === 'results') {
      stopPolling();
      const defaultBid = round.my_bid ?? 0;
      setBidAmount(defaultBid);
      setInputVal(String(defaultBid));
      setScreen('starting');
    }
  }, [round, screen]);

  // ─────────────────────────────────────────────────────────────
  // Confetti
  // ─────────────────────────────────────────────────────────────
  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width;
    particles.current = Array.from({ length: 180 }, () => ({
      x: Math.random() * W, y: -20 - Math.random() * 320,
      w: 4 + Math.random() * 11, h: 9 + Math.random() * 20,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      angle: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 3, vy: 2.5 + Math.random() * 4,
      va: (Math.random() - 0.5) * 0.2, opacity: 0.8 + Math.random() * 0.2,
    }));
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles.current) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.angle += p.va;
      if (p.y < canvas.height + 40) alive = true;
      ctx.save(); ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    }
    if (alive) rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const startConfetti = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    spawnParticles(); rafRef.current = requestAnimationFrame(drawFrame);
    const t1 = setTimeout(spawnParticles, 700);
    const t2 = setTimeout(spawnParticles, 1400);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(t1); clearTimeout(t2); };
  }, [spawnParticles, drawFrame]);

  useEffect(() => {
    if (screen === 'results') return startConfetti() ?? undefined;
  }, [screen, startConfetti]);

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  const adjustBid = (delta: number) =>
    setBidAmount(prev => { const n = Math.max(0, prev + delta); setInputVal(String(n)); return n; });

  const fmt = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const handleSubmitBid = async () => {
    if (!round || submitting) return;
    setSubmitting(true);
    try {
      await submitBid(eventId, bidAmount);
      setScreen('submitted');
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    await markPaidOffline(eventId);
    setScreen('receipt');
  };

  // Derived values
  const myPseudonym      = event?.my_pseudonym ?? 'You';
  const myInitial        = event?.my_initial   ?? 'Y';
  const myEmoji          = event?.my_emoji     ?? '🐰';
  const eventName        = event?.name         ?? 'Event';
  const charityName      = event?.charity_name ?? '';
  const roundNumber      = round?.round_number ?? 1;
  const totalRounds      = event?.rounds_count ?? 1;
  const roundLabel       = `Round ${roundNumber}`;
  const myCumulative     = round?.my_cumulative ?? 0;
  const matchedAmount    = round?.matched_amount ?? 0;
  const groupTotal       = round?.group_total ?? 0;
  const matchRatio       = round?.match_ratio ?? '1:3';
  const groupSize        = round?.group_size ?? 4;
  const groupMembers     = round?.my_group?.members ?? [];
  const groupName        = round?.my_group?.name ?? 'Group';
  const roundBids        = round?.round_bids ?? [];
  const roundSecondsLeft = round?.seconds_left ?? 0;
  const isLastRound      = roundNumber >= totalRounds;
  const totalDonation    = payment?.total_amount ?? myCumulative;
  const charityLink      = payment?.charity_link ?? event?.charity_link ?? '#';
  const paymentRef       = payment?.reference ?? '';
  const paymentDate      = payment?.date ?? '';

  /* ══════════════════════════════════════════════════
     SCREEN: Loading
  ══════════════════════════════════════════════════ */
  if (screen === 'loading') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-submitted">
        <p style={{ color: '#9AA0A6', marginTop: 40 }}>Loading round...</p>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN: Waiting (host hasn't opened round yet)
  ══════════════════════════════════════════════════ */
  if (screen === 'waiting') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-s1">
        <div className="bf-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3C7 3 4.5 5.5 4.5 8.5c0 2.2 1.3 4.2 3.2 5.3L10 18l2.3-4.2c1.9-1.1 3.2-3.1 3.2-5.3C15.5 5.5 13 3 10 3z" stroke="#F4A43A" strokeWidth="1.6"/>
          </svg>
          <span className="bf-logo-text">PeerFund</span>
        </div>
        <div className="bf-s1-center">
          <div className="bf-clock-ring">
            <div className="bf-clock-circle">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" stroke="#fff" strokeWidth="2.5"/>
                <path d="M22 13v9l6 4.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="bf-s1-title">Waiting for Host</h1>
          <p className="bf-s1-sub">The host will start the round shortly...</p>
        </div>
        <div className="bf-joining-bar">
          <p className="bf-joining-label">You're joining as</p>
          <p className="bf-joining-name">{myEmoji} {myPseudonym}</p>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 1 — Round Starting (round just opened)
  ══════════════════════════════════════════════════ */
  if (screen === 'starting') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div className="bf-s1">
        <div className="bf-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3C7 3 4.5 5.5 4.5 8.5c0 2.2 1.3 4.2 3.2 5.3L10 18l2.3-4.2c1.9-1.1 3.2-3.1 3.2-5.3C15.5 5.5 13 3 10 3z" stroke="#F4A43A" strokeWidth="1.6"/>
          </svg>
          <span className="bf-logo-text">PeerFund</span>
        </div>
        <div className="bf-s1-center">
          <div className="bf-clock-ring">
            <div className="bf-clock-circle">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" stroke="#fff" strokeWidth="2.5"/>
                <path d="M22 13v9l6 4.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="bf-s1-title">{roundLabel} Starting!</h1>
          <p className="bf-s1-sub">Get ready to place your bid...</p>
        </div>
        <div className="bf-joining-bar">
          <p className="bf-joining-label">You're joining as</p>
          <p className="bf-joining-name">{myEmoji} {myPseudonym}</p>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 2 — Bid Entry
  ══════════════════════════════════════════════════ */
  if (screen === 'bid-entry') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div className="bf-s2">
        <EventCard
          eventName={eventName}
          timer={fmt(roundSecondsLeft)}
          timerOrange={false}
          roundLabel={roundLabel}
        />
        <div className="bf-amount-zone">
          <p className="bf-amount-hint">Type your bid</p>
          <div className="bf-amount-display">
            <span className="bf-pound">£</span>
            <input className="bf-amount-input" type="number" value={inputVal}
              onChange={e => { setInputVal(e.target.value); const n = parseInt(e.target.value,10); if(!isNaN(n)) setBidAmount(n); }}
              inputMode="numeric" style={{ width: `${Math.max(inputVal.length, 1)}ch` }}/>
          </div>
          <p className="bf-amount-sub">Enter your preferred bid amount</p>
        </div>
        <div className="bf-impact-card">
          <div className="bf-impact-head"><TrendIcon /><span className="bf-impact-title">Impact Preview</span></div>
          <hr className="bf-impact-hr"/>
          <div className="bf-impact-cols">
            <div className="bf-impact-col">
              <span className="bf-ic-label">Potential Match</span>
              <span className="bf-ic-big">£{bidAmount} × {groupSize}</span>
              <span className="bf-ic-small">= £{bidAmount * groupSize} group total</span>
            </div>
            <div className="bf-impact-col">
              <span className="bf-ic-label">Your Cumulative</span>
              <span className="bf-ic-big">£{bidAmount + myCumulative}</span>
              <span className="bf-ic-small">incl. this round</span>
            </div>
          </div>
          <hr className="bf-impact-hr"/>
          <div className="bf-ratio-row"><TrendIcon small /><span className="bf-ratio-label">{matchRatio} ratio match</span></div>
          <p className="bf-ratio-desc">If £10 is the lowest, the group donates £{10 * groupSize} total ({matchRatio} match)</p>
        </div>
        <div className="bf-cta-wrap">
          <button className="bf-orange-btn" onClick={() => setScreen('confirm-bid')}>
            <BoltIcon /> Place Your Bid
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 3 — Confirm Bid
  ══════════════════════════════════════════════════ */
  if (screen === 'confirm-bid') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white"  scrollY>
      <div className="bf-s3">
        <div className="bf-s3-nav">
          <button className="bf-back-circle" onClick={() => setScreen('bid-entry')}>
           
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.99967 12.6666L3.33301 7.99998L7.99967 3.33331" stroke="#25201D" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.6663 8H3.33301" stroke="#25201D" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span className="bf-s3-nav-title">Waiting for others to bid</span>
        </div>
        <EventCard
          eventName={eventName}
          timer={fmt(roundSecondsLeft)}
          timerOrange
          roundLabel={roundLabel}
        />
        <GroupCard
          groupName={groupName}
          members={groupMembers}
          myPseudonym={myPseudonym}
        />
        <div className="bf-adj-section">
          <p className="bf-adj-label">Your bid</p>
          <div className="bf-adj-row">
            <button className="bf-adj-btn bf-adj-btn--minus" onClick={() => adjustBid(-50)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12" stroke="#1A1A2E" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
            <span className="bf-adj-amount">£{bidAmount}</span>
            <button className="bf-adj-btn bf-adj-btn--plus" onClick={() => adjustBid(50)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="bf-chips">
            {(['+£100','+£200','+double'] as const).map((c,i) => (
              <button key={c} className={`bf-chip ${i===1?'bf-chip--active':''}`}
                onClick={() => {
                  if(c==='+£100') adjustBid(100);
                  if(c==='+£200') adjustBid(200);
                  if(c==='+double'){const n=bidAmount*2;setBidAmount(n);setInputVal(String(n));}
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <p className="bf-update-note">You can update your bid anytime<br/>until another user places theirs.</p>
        <div className="bf-cta-wrap bf-cta-wrap--bottom">
          <button className="bf-orange-btn" onClick={handleSubmitBid} disabled={submitting}>
            <BoltIcon /> {submitting ? 'Submitting...' : `Place Final Bid – £${bidAmount}`}
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 4 — Bid Submitted
  ══════════════════════════════════════════════════ */
  if (screen === 'submitted') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div className="bf-submitted">
        <div className="bf-check-ring">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="23" stroke="#2BA7A0" strokeWidth="2"/>
            <path d="M14 24l7 7 13-14" stroke="#2BA7A0" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="bf-sub-title">Bid Submitted!</h2>
        <p className="bf-sub-desc">Your bid of <strong className="bf-teal">£{bidAmount}</strong> has been placed.</p>
        <p style={{ color: '#9AA0A6', fontSize: 14, marginTop: 8 }}>Waiting for the round to close...</p>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 5 — Round Results
  ══════════════════════════════════════════════════ */
  if (screen === 'results-r1') return (
    <IonPage><IonContent fullscreen className="bf-page" scrollY>
      <canvas ref={canvasRef} className="bf-canvas" />
      <div className="bf-results-wrap">
        {/* Hero */}
        <div className="bf-hero">
          <div className="bf-hero-trophy"><img src="/assets/img/trophy.svg" alt="" /></div>
          <h2 className="bf-hero-title">{roundLabel} Complete!</h2>
          <p className="bf-hero-sub">{groupName} results are in</p>
        </div>

        {/* Matched amount */}
        <div className="bf-matched-wrap">
          <p className="bf-matched-label">Matched Amount (Per Donor)</p>
          <p className="bf-matched-val">£{matchedAmount}</p>
        </div>

        {/* Stats 3-col */}
        <div className="bf-stats3">
          <div className="bf-stat3"><TrendIcon /><span className="bf-stat3-val">{matchRatio}</span><span className="bf-stat3-lbl">Match Ratio</span></div>
          <div className="bf-stat3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 18v-1.5A3 3 0 0010 13.5H7A3 3 0 004 17v1" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8.5" cy="7" r="2.5" stroke="#2BA7A0" strokeWidth="1.5"/>
              <path d="M17 18v-1.5a3 3 0 00-2-2.8M14 4.2a3 3 0 010 5.6" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="bf-stat3-val">{groupSize}</span><span className="bf-stat3-lbl">In Group</span>
          </div>
          <div className="bf-stat3">
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.6243 10.3333C6.56478 10.1026 6.44453 9.89203 6.27605 9.72355C6.10757 9.55507 5.89702 9.43481 5.6663 9.3753L1.5763 8.32063C1.50652 8.30082 1.44511 8.2588 1.40138 8.20093C1.35765 8.14306 1.33398 8.0725 1.33398 7.99996C1.33398 7.92743 1.35765 7.85687 1.40138 7.799C1.44511 7.74113 1.50652 7.6991 1.5763 7.6793L5.6663 6.62396C5.89693 6.5645 6.10743 6.44435 6.2759 6.27599C6.44438 6.10763 6.56468 5.89722 6.6243 5.66663L7.67897 1.57663C7.69857 1.50657 7.74056 1.44486 7.79851 1.40089C7.85647 1.35693 7.92722 1.33313 7.99997 1.33313C8.07271 1.33313 8.14346 1.35693 8.20142 1.40089C8.25938 1.44486 8.30136 1.50657 8.32097 1.57663L9.37497 5.66663C9.43449 5.89734 9.55474 6.10789 9.72322 6.27637C9.8917 6.44486 10.1023 6.56511 10.333 6.62463L14.423 7.67863C14.4933 7.69803 14.5553 7.73997 14.5995 7.79801C14.6437 7.85606 14.6677 7.927 14.6677 7.99996C14.6677 8.07292 14.6437 8.14387 14.5995 8.20191C14.5553 8.25996 14.4933 8.3019 14.423 8.3213L10.333 9.3753C10.1023 9.43481 9.8917 9.55507 9.72322 9.72355C9.55474 9.89203 9.43449 10.1026 9.37497 10.3333L8.3203 14.4233C8.3007 14.4934 8.25871 14.5551 8.20075 14.599C8.1428 14.643 8.07205 14.6668 7.9993 14.6668C7.92656 14.6668 7.85581 14.643 7.79785 14.599C7.73989 14.5551 7.69791 14.4934 7.6783 14.4233L6.6243 10.3333Z" stroke="#2BA7A0" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.333 2V4.66667" stroke="#2BA7A0" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14.6667 3.33337H12" stroke="#2BA7A0" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.66699 11.3334V12.6667" stroke="#2BA7A0" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3.33333 12H2" stroke="#2BA7A0" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<span className="bf-stat3-val">£720</span><span className="bf-stat3-lbl">Group Total</span></div>
        </div>

        {/* Your Contribution */}
        <div className="bf-card bf-tealbg">
          <p className="bf-card-title">Your Contribution</p>
          <div className="bf-card-row"><span className="bf-card-lbl">Your Bid</span><span className="bf-card-val">£{round?.my_bid ?? bidAmount}</span></div>
          <div className="bf-card-row"><span className="bf-card-lbl">Matched Amount</span><span className="bf-card-val bf-teal">£{matchedAmount}</span></div>
          <p className="bf-card-note">
            {(round?.my_bid ?? bidAmount) > matchedAmount
              ? `Your higher bid helped create leverage! The match was set at £${matchedAmount} by another donor.`
              : `You set the minimum! Your bid of £${round?.my_bid ?? bidAmount} determined the group match.`}
          </p>
        </div>

        {/* Group Bids */}
        <div className="bf-card bf-group-bids-card">
          <button className="bf-group-bids-toggle" onClick={() => setGroupBidsOpen(o => !o)}>
            <span className="bf-card-title" style={{ margin: 0 }}>View Group Bids (Anonymous)</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
              style={{ transform: groupBidsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 8l4 4 4-4" stroke="#9AA0A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {groupBidsOpen && (
            <div className="bf-group-bids-list">
              {roundBids.map((b, i) => (
                <div key={i} className={`bf-bid-row ${b.is_minimum?'bf-bid-row--min':''} ${b.is_you?'bf-bid-row--you':''}`}>
                  <div className={`bf-bid-avatar ${b.is_you?'bf-bid-avatar--you':b.is_minimum?'bf-bid-avatar--min':''}`}>{b.initial}</div>
                  <span className="bf-bid-name">{b.is_you ? 'You' : b.pseudonym}</span>
                  <span className={`bf-bid-amount ${b.is_minimum?'bf-bid-amount--min':''}`}>£{b.amount}</span>
                  {b.is_minimum && <span className="bf-min-badge">min</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cumulative */}
        <div className="bf-card bf-card--row bf-card--cumul">
          <div>
            <p className="bf-card-title bf-card-title--sm">Your Cumulative Total</p>
            <p className="bf-card-lbl" style={{ marginTop: 2 }}>Including all rounds so far</p>
          </div>
          <span className="bf-cumul-val">£{myCumulative}</span>
        </div>

        {/* CTA */}
        {isLastRound || event?.status === 'finished' ? (
          <button className="bf-orange-btn bf-full-btn" onClick={() => {
            getPaymentSummary(eventId).then(p => { setPayment(p); setScreen('payment-intro'); });
          }}>
            Make Payment <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
              <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        ) : (
          <button
            className={`bf-orange-btn bf-full-btn ${round?.status !== 'open' ? 'bf-btn-disabled' : ''}`}
            disabled={round?.status !== 'open'}
            onClick={() => {
              setBidAmount(0); setInputVal('0');
              setScreen('starting');
            }}>
            {round?.status === 'open'
              ? <>Continue to Round {roundNumber + 1} <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
                  <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
                </svg></>
              : <>Waiting for Round {roundNumber + 1}... ⏱</>
            }
          </button>
        )}

        <button className="bf-quit" onClick={async () => { await quitEvent(eventId); router.goBack(); }}>Quit Event</button>
        <div style={{ height: 48 }} />
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 9 — Payment Intro
  ══════════════════════════════════════════════════ */
  if (screen === 'payment-intro') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-pay-intro">
        <div className="bf-pay-intro-nav">
          <button className="bf-back-circle" onClick={() => setScreen('results')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L7 9l4-5" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="bf-pay-intro-event">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.3 2.6 2.9.4-2.1 2.1.5 2.9L7 8.2l-2.6 1.3.5-2.9L2.8 4.5l2.9-.4L7 1.5z" stroke="#9AA0A6" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            <span>{eventName}</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        <div className="bf-pay-intro-body">
          <div className="bf-heart-circle">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 28s-12-7.5-12-15a7 7 0 0114 0 7 7 0 0114 0c0 7.5-12 15-16 15z" fill="#fff"/>
            </svg>
          </div>
          <h2 className="bf-pay-intro-title">Thank you, <strong>{payment?.donor_name ?? myPseudonym}</strong></h2>
          <p className="bf-pay-intro-sub">The event has concluded. Your final pledge is:</p>
          <p className="bf-pay-intro-amount">£{totalDonation}</p>

          <Swiper slidesPerView={1.2} centeredSlides={true} spaceBetween={14} loop={slideImages.length > 1} initialSlide={0}>
            {slideImages.map((img, i) => (
              <SwiperSlide key={i}><img src={img} className="slide" alt="" /></SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="bf-pay-intro-ctas">
          <button className="bf-orange-btn" onClick={() => setScreen('payment-form')}>
            Make Your Payment <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
              <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="bf-teal-btn" onClick={handleMarkPaid}>
            Mark as Paid Offline <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
              <path d="M4.16699 10H15.8337" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="bf-payment-status">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#2BA7A0" strokeWidth="1.2"/>
              <path d="M7 4v3l2 1.5" stroke="#2BA7A0" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>Payment status: Recorded</span>
          </div>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 10 — Payment Form
  ══════════════════════════════════════════════════ */
  if (screen === 'payment-form') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-pay-form">
        <div className="bf-pay-form-nav">
          <button className="bf-back-circle" onClick={() => setScreen('payment-intro')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L7 9l4-5" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="bf-pay-form-nav-title">Payment</span>
          <div style={{ width: 36 }} />
        </div>

        <div className="bf-pay-summary-card">
          <div className="bf-pay-summary-event">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.3 2.6 2.9.4-2.1 2.1.5 2.9L7 8.2l-2.6 1.3.5-2.9L2.8 4.5l2.9-.4L7 1.5z" stroke="#2BA7A0" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="bf-pay-summary-event-name">{eventName}</span>
          </div>
          <p className="bf-pay-summary-label">Your Total Donation</p>
          <p className="bf-pay-summary-amount">£{totalDonation}</p>
          <p className="bf-pay-summary-desc">Based on matched minimum bids across all rounds</p>
          <div className="bf-pay-summary-divider" />
          {payment?.rounds_detail?.map((r, i) => (
            <div key={i} className="bf-pay-summary-row">
              <span className="bf-pay-summary-row-lbl">Round {r.round}</span>
              <span className="bf-pay-summary-row-val">£{r.matched}</span>
            </div>
          ))}
          <div className="bf-pay-summary-divider" />
          <div className="bf-pay-summary-row">
            <span className="bf-pay-summary-row-lbl">Processing fee</span>
            <span className="bf-pay-summary-row-val bf-teal">Free</span>
          </div>
          <div className="bf-pay-summary-divider" />
          <div className="bf-pay-summary-row bf-pay-summary-row--total">
            <span>Total</span>
            <span>£{totalDonation}</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div className="bf-pay-form-footer">
          <div className="bf-pay-redirect-note">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#C5C8CC" strokeWidth="1.2"/>
              <path d="M7 4v3l2 1.5" stroke="#C5C8CC" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>We will redirect you to {charityLink} where you can make payment.</span>
          </div>
          <button className="bf-orange-btn" onClick={() => {
            window.open(charityLink, '_blank');
            setScreen('receipt');
          }}>
            Continue →
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 11 — Receipt / Thank You
  ══════════════════════════════════════════════════ */
  return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-receipt">
        <div className="bf-receipt-hero">
          <div className="bf-receipt-check">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#fff" strokeWidth="2.5"/>
              <path d="M12 20l6 6 12-12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="bf-receipt-hero-title">Thank You!</h2>
          <p className="bf-receipt-hero-sub">Your donation has been confirmed</p>
        </div>

        <div className="bf-receipt-card">
          <div className="bf-receipt-card-header">
            <div className="bf-receipt-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="3" stroke="#2BA7A0" strokeWidth="1.5"/>
                <path d="M5 7h8M5 10h5" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="bf-receipt-card-title">Donation Receipt</span>
          </div>
          {[
            { label: 'Amount',    val: `£${totalDonation}`,                teal: true  },
            { label: 'Charity',   val: payment?.charity_name ?? charityName },
            { label: 'Event',     val: payment?.event_name  ?? eventName    },
            { label: 'Donor',     val: myPseudonym                          },
            { label: 'Method',    val: 'Bank Transfer'                      },
            { label: 'Reference', val: paymentRef                           },
            { label: 'Date',      val: paymentDate                          },
          ].map((r, i) => (
            <div key={i} className="bf-receipt-row">
              <span className="bf-receipt-lbl">{r.label}</span>
              <span className={`bf-receipt-val ${r.teal ? 'bf-teal' : ''}`}>{r.val}</span>
            </div>
          ))}
          <p className="bf-receipt-note">A confirmation email will be sent to your registered address. This receipt can be used for tax-deduction purposes.</p>
        </div>

        <div className="bf-difference-card">
          <div className="bf-difference-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5l1.2 2.4 2.7.4-1.95 1.9.46 2.7L8 7.7 5.57 8.9l.46-2.7L4.1 4.3l2.7-.4L8 1.5z" fill="#2BA7A0" stroke="#2BA7A0" strokeWidth="0.3" strokeLinejoin="round"/>
            </svg>
            <span className="bf-difference-title">You made a difference</span>
          </div>
          <p className="bf-difference-desc">
            Through peer matching, your contribution helped raise £{groupTotal} for {payment?.charity_name ?? charityName}.
          </p>
        </div>

        <button className="bf-teal-btn bf-teal-btn--full" onClick={() => router.push('/devents')}>
          Back to lobby
        </button>

        <div style={{ height: 48 }} />
      </div>
    </IonContent></IonPage>
  );
};

/* ─────────────────────────────────────
   Shared Sub-Components
───────────────────────────────────── */
interface EventCardProps {
  eventName: string;
  timer: string;
  timerOrange: boolean;
  roundLabel?: string;
}

const EventCard: React.FC<EventCardProps> = ({ eventName, timer, timerOrange, roundLabel }) => (
  <div className="bf-event-card">
    <div className="bf-ec-top">
      <div className="bf-ec-name">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2C5.8 2 4 3.8 4 6c0 1.8 1.1 3.3 2.6 4.2L8 14l1.4-3.8C10.9 9.3 12 7.8 12 6c0-2.2-1.8-4-4-4z" stroke="#F4A43A" strokeWidth="1.5"/>
        </svg>
        <span>{eventName}{roundLabel ? ` · ${roundLabel}` : ''}</span>
      </div>
      <span className="bf-live-badge"><span className="bf-live-dot" />Live</span>
    </div>
    <div className={`bf-ec-timer ${timerOrange ? 'bf-ec-timer--orange' : ''}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke={timerOrange ? '#F4A43A' : '#C5C8CC'} strokeWidth="1.3"/>
        <path d="M7 4v3l2 1.5" stroke={timerOrange ? '#F4A43A' : '#C5C8CC'} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <span>{timer}</span>
    </div>
  </div>
);

interface GroupCardProps {
  groupName: string;
  members: import('../../services/donorEvents').GroupMember[];
  myPseudonym: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ groupName, members, myPseudonym }) => (
  <div className="bf-group-card">
    <div className="bf-gc-top">
      <div className="bf-gc-label-row">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M12 16v-1.5A3 3 0 009 11.5H6A3 3 0 003 15v1" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7.5" cy="6" r="2.5" stroke="#1A1A2E" strokeWidth="1.5"/>
          <path d="M15 16v-1.5a3 3 0 00-1.8-2.75M12 3.25a3 3 0 010 5.5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="bf-gc-name">{groupName}</span>
      </div>
    </div>
    <p className="bf-gc-sub">
      {members.length > 1
        ? `You're matched with ${members.length - 1} other donor${members.length !== 2 ? 's' : ''}`
        : `Waiting for others to join your group`}
    </p>
    <div className="bf-avatars">
      {members.map((m, i) => (
        <div key={i} className="bf-avatar-col">
          <div className={`bf-avatar-box ${m.is_you ? 'bf-avatar-box--you' : ''}`}>
            <span className="bf-avatar-em">{m.emoji ?? m.initial}</span>
          </div>
          <span className={`bf-avatar-name ${m.is_you ? 'bf-avatar-name--you' : ''}`}>
            {m.is_you ? 'You' : m.pseudonym}
          </span>
          <span className="bf-avatar-status">
            {m.bid_status === 'submitted' ? 'Bid placed' : m.bid_status === 'bidding' ? 'Bidding' : 'Waiting'}
          </span>
          <div className="bf-avatar-dots">
            <span className={`bf-avatar-dot ${m.bid_status === 'bidding' || m.bid_status === 'submitted' ? 'bf-avatar-dot--on' : ''}`} />
            <span className="bf-avatar-dot" /><span className="bf-avatar-dot" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TrendIcon: React.FC<{ small?: boolean }> = ({ small }) => (
  <svg width={small ? 14 : 18} height={small ? 14 : 18} viewBox="0 0 18 18" fill="none">
    <path d="M2 13l4-4.5 3.5 3.5 7-9" stroke="#2BA7A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M10 2L4 10h6l-2 6 8-9h-6l2-5z" fill="#000" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
  </svg>
);

export default BidFlow;
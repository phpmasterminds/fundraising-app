import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import './BidFlow.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const images = [
  '/assets/img/Slide1.jpg',
  '/assets/img/Slide2.jpg',
  '/assets/img/Slide3.jpg'
];
/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
type Screen =
  | 'starting'
  | 'bid-entry'
  | 'confirm-bid'
  | 'submitted'
  | 'results-r1'    // Round 1 complete (Continue to Round 2)
  | 'bid-entry-r2'  // Round 2 bid entry (same UI, different round)
  | 'confirm-bid-r2'
  | 'submitted-r2'
  | 'results-r2'    // Round 2 complete (Make Payment)
  | 'payment-intro' // Thank you, Alex M. + Make Payment / Mark as Paid
  | 'payment-form'  // Payment breakdown screen
  | 'receipt';      // Thank You + Donation Receipt

interface Particle {
  x: number; y: number;
  w: number; h: number;
  color: string;
  angle: number;
  vx: number; vy: number;
  va: number;
  opacity: number;
}

const CONFETTI_COLORS = [
  '#2BA7A0','#2BA7A0','#2BA7A0',
  '#1A5C58','#1A5C58',
  '#0D3835','#0D3835',
  '#A8E6E2','#fff','#fff',
];

/* ─────────────────────────────────────
   Main Component
───────────────────────────────────── */
const BidFlow: React.FC = () => {
  const router = useIonRouter();
  const [screen, setScreen]             = useState<Screen>('starting');
  const [bidAmount, setBidAmount]       = useState(455);
  const [inputVal, setInputVal]         = useState('455');
  const [r1Timer, setR1Timer]           = useState(45);   // countdown before Round 2 unlocks
  const [r2BidAmount, setR2BidAmount]   = useState(455);
  const [r2InputVal, setR2InputVal]     = useState('455');
  const [groupBidsOpen, setGroupBidsOpen] = useState(false);

  const timerRef  = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  /* Screen 1 → bid-entry after 2.5 s */
  useEffect(() => {
    if (screen !== 'starting') return;
    const t = setTimeout(() => setScreen('bid-entry'), 2500);
    return () => clearTimeout(t);
  }, [screen]);

  /* submitted → results-r1 after 2 s */
  useEffect(() => {
    if (screen !== 'submitted') return;
    const t = setTimeout(() => setScreen('results-r1'), 2000);
    return () => clearTimeout(t);
  }, [screen]);

  /* submitted-r2 → results-r2 after 2 s */
  useEffect(() => {
    if (screen !== 'submitted-r2') return;
    const t = setTimeout(() => setScreen('results-r2'), 2000);
    return () => clearTimeout(t);
  }, [screen]);

  /* Round 1 results — countdown for Round 2 button */
  useEffect(() => {
    if (screen !== 'results-r1') return;
    timerRef.current = setInterval(() =>
      setR1Timer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  /* ── Canvas confetti (fires on both results screens) ── */
  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width;
    particles.current = Array.from({ length: 180 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * 320,
      w: 4 + Math.random() * 11,
      h: 9 + Math.random() * 20,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      angle: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 3,
      vy: 2.5 + Math.random() * 4,
      va: (Math.random() - 0.5) * 0.2,
      opacity: 0.8 + Math.random() * 0.2,
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
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const startConfetti = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    spawnParticles();
    rafRef.current = requestAnimationFrame(drawFrame);
    const t1 = setTimeout(spawnParticles, 700);
    const t2 = setTimeout(spawnParticles, 1400);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(t1); clearTimeout(t2); };
  }, [spawnParticles, drawFrame]);

  useEffect(() => {
    if (screen === 'results-r1' || screen === 'results-r2') return startConfetti() ?? undefined;
  }, [screen, startConfetti]);

  /* ── Helpers ── */
  const adjustBid = (delta: number) =>
    setBidAmount(prev => { const n = Math.max(0, prev + delta); setInputVal(String(n)); return n; });

  const adjustR2Bid = (delta: number) =>
    setR2BidAmount(prev => { const n = Math.max(0, prev + delta); setR2InputVal(String(n)); return n; });

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const r1TimerDone = r1Timer === 0;

  /* ══════════════════════════════════════════════════
     SCREEN 1 — Round Starting
  ══════════════════════════════════════════════════ */
  if (screen === 'starting') return (
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
          <h1 className="bf-s1-title">Round Starting!</h1>
          <p className="bf-s1-sub">Get ready to place your bid...</p>
        </div>
        <div className="bf-joining-bar">
          <p className="bf-joining-label">You're joining as</p>
          <p className="bf-joining-name">Alex M.</p>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 2 — Bid Entry (Round 1)
  ══════════════════════════════════════════════════ */
  if (screen === 'bid-entry') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-s2">
        <EventCard timer="00:00" timerOrange={false} />
        <div className="bf-amount-zone">
          <p className="bf-amount-hint">Type your bid</p>
          <div className="bf-amount-display">
            <span className="bf-pound">£</span>
            <input className="bf-amount-input" type="number" value={inputVal}
              onChange={e => { setInputVal(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) setBidAmount(n); }}
              inputMode="numeric"/>
          </div>
          <p className="bf-amount-sub">Enter your preferred bid amount</p>
        </div>
        <div className="bf-impact-card">
          <div className="bf-impact-head"><TrendIcon /><span className="bf-impact-title">Impact Preview</span></div>
          <hr className="bf-impact-hr"/>
          <div className="bf-impact-cols">
            <div className="bf-impact-col">
              <span className="bf-ic-label">Potential Match</span>
              <span className="bf-ic-big">£{bidAmount} × 4</span>
              <span className="bf-ic-small">= £{bidAmount * 4} group total</span>
            </div>
            <div className="bf-impact-col">
              <span className="bf-ic-label">Your Cumulative</span>
              <span className="bf-ic-big">£{bidAmount + 455}</span>
              <span className="bf-ic-small">incl. this round</span>
            </div>
          </div>
          <hr className="bf-impact-hr"/>
          <div className="bf-ratio-row"><TrendIcon small /><span className="bf-ratio-label">1:3 ratio match</span></div>
          <p className="bf-ratio-desc">If £10 is the lowest, the group donates £40 total (1:3 match)</p>
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
     SCREEN 3 — Confirm Bid (Round 1)
  ══════════════════════════════════════════════════ */
  if (screen === 'confirm-bid') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-s3">
        <div className="bf-s3-nav">
          <button className="bf-back-circle" onClick={() => setScreen('bid-entry')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L7 9l4-5" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="bf-s3-nav-title">Waiting for others to bid</span>
        </div>
        <EventCard timer="00:45" timerOrange />
        <GroupCard />
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
                onClick={() => { if(c==='+£100') adjustBid(100); if(c==='+£200') adjustBid(200); if(c==='+double'){const n=bidAmount*2;setBidAmount(n);setInputVal(String(n));} }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <p className="bf-update-note">You can update your bid anytime<br/>until another user places theirs.</p>
        <div className="bf-cta-wrap bf-cta-wrap--bottom">
          <button className="bf-orange-btn" onClick={() => setScreen('submitted')}>
            <BoltIcon /> Place Final Bid – £{bidAmount}
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 4 — Bid Submitted (R1 & R2 shared)
  ══════════════════════════════════════════════════ */
  if (screen === 'submitted' || screen === 'submitted-r2') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-submitted">
        <div className="bf-check-ring">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="23" stroke="#2BA7A0" strokeWidth="2"/>
            <path d="M14 24l7 7 13-14" stroke="#2BA7A0" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="bf-sub-title">Bid Submitted!</h2>
        <p className="bf-sub-desc">Your bid of <strong className="bf-teal">£{screen === 'submitted' ? bidAmount : r2BidAmount}</strong> has been placed.</p>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 5 — Round 1 Results (with confetti)
  ══════════════════════════════════════════════════ */
  if (screen === 'results-r1') return (
    <IonPage><IonContent fullscreen className="bf-page" scrollY>
      <canvas ref={canvasRef} className="bf-canvas" />
      <div className="bf-results-wrap">
        {/* Hero */}
        <div className="bf-hero">
          <div className="bf-hero-trophy"><img src="/assets/img/trophy.svg" alt="" /></div>
          <h2 className="bf-hero-title">Round 1 Complete!</h2>
          <p className="bf-hero-sub">Group A results are in</p>
        </div>

        {/* Matched amount */}
        <div className="bf-matched-wrap">
          <p className="bf-matched-label">Matched Amount (Per Donor)</p>
          <p className="bf-matched-val">£180</p>
        </div>

        {/* Stats 3-col */}
        <div className="bf-stats3">
          <div className="bf-stat3"><TrendIcon /><span className="bf-stat3-val">1:3</span><span className="bf-stat3-lbl">Match Ratio</span></div>
          <div className="bf-stat3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 18v-1.5A3 3 0 0010 13.5H7A3 3 0 004 17v1" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8.5" cy="7" r="2.5" stroke="#2BA7A0" strokeWidth="1.5"/>
              <path d="M17 18v-1.5a3 3 0 00-2-2.8M14 4.2a3 3 0 010 5.6" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="bf-stat3-val">4</span><span className="bf-stat3-lbl">In Group</span>
          </div>
          <div className="bf-stat3"><TrendIcon /><span className="bf-stat3-val">£720</span><span className="bf-stat3-lbl">Group Total</span></div>
        </div>

        {/* Your Contribution */}
        <div className="bf-card bf-tealbg">
          <p className="bf-card-title">Your Contribution</p>
          <div className="bf-card-row"><span className="bf-card-lbl">Your Bid</span><span className="bf-card-val">£800</span></div>
          <div className="bf-card-row"><span className="bf-card-lbl">Matched Amount</span><span className="bf-card-val bf-teal">£180</span></div>
          <p className="bf-card-note">Your higher bid helped create leverage! The match was set at £180 by another donor.</p>
        </div>

        {/* View Group Bids — expandable */}
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
              {[
                { initial: 'A', name: 'Atlas',   amount: '£350', min: false, you: false },
                { initial: 'C', name: 'Cedar',   amount: '£280', min: false, you: false },
                { initial: 'P', name: 'Phoenix', amount: '£180', min: true,  you: false },
                { initial: 'C', name: 'You',     amount: '£800', min: false, you: true  },
              ].map((b, i) => (
                <div key={i} className={`bf-bid-row ${b.min ? 'bf-bid-row--min' : ''} ${b.you ? 'bf-bid-row--you' : ''}`}>
                  <div className={`bf-bid-avatar ${b.you ? 'bf-bid-avatar--you' : b.min ? 'bf-bid-avatar--min' : ''}`}>{b.initial}</div>
                  <span className="bf-bid-name">{b.name}</span>
                  <span className={`bf-bid-amount ${b.min ? 'bf-bid-amount--min' : ''}`}>{b.amount}</span>
                  {b.min && <span className="bf-min-badge">min</span>}
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
          <span className="bf-cumul-val">£635</span>
        </div>

        {/* Continue to Round 2 — active only when timer hits 0 */}
        <button
          className={`bf-orange-btn bf-full-btn ${!r1TimerDone ? 'bf-btn-disabled' : ''}`}
          disabled={!r1TimerDone}
          onClick={() => { setR2BidAmount(455); setR2InputVal('455'); setScreen('bid-entry-r2'); }}>
          {r1TimerDone
            ? <> Continue to Round 2 <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
            <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
          </svg> </>
            : <>Round 2 &nbsp;<span className="bf-btn-timer">⏱ {fmt(r1Timer)}</span></>
          }
        </button>

        <button className="bf-quit" onClick={() => router.goBack()}>Quit Event</button>
        <div style={{ height: 48 }} />
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 6 — Bid Entry Round 2
  ══════════════════════════════════════════════════ */
  if (screen === 'bid-entry-r2') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-s2">
        <EventCard timer="00:00" timerOrange={false} roundLabel="Round 2" />
        <div className="bf-amount-zone">
          <p className="bf-amount-hint">Type your bid</p>
          <div className="bf-amount-display">
            <span className="bf-pound">£</span>
            <input className="bf-amount-input" type="number" value={r2InputVal}
              onChange={e => { setR2InputVal(e.target.value); const n = parseInt(e.target.value,10); if(!isNaN(n)) setR2BidAmount(n); }}
              inputMode="numeric"/>
          </div>
          <p className="bf-amount-sub">Enter your preferred bid amount</p>
        </div>
        <div className="bf-impact-card">
          <div className="bf-impact-head"><TrendIcon /><span className="bf-impact-title">Impact Preview</span></div>
          <hr className="bf-impact-hr"/>
          <div className="bf-impact-cols">
            <div className="bf-impact-col">
              <span className="bf-ic-label">Potential Match</span>
              <span className="bf-ic-big">£{r2BidAmount} × 4</span>
              <span className="bf-ic-small">= £{r2BidAmount * 4} group total</span>
            </div>
            <div className="bf-impact-col">
              <span className="bf-ic-label">Your Cumulative</span>
              <span className="bf-ic-big">£{r2BidAmount + 635}</span>
              <span className="bf-ic-small">incl. this round</span>
            </div>
          </div>
          <hr className="bf-impact-hr"/>
          <div className="bf-ratio-row"><TrendIcon small /><span className="bf-ratio-label">1:3 ratio match</span></div>
          <p className="bf-ratio-desc">If £10 is the lowest, the group donates £40 total (1:3 match)</p>
        </div>
        <div className="bf-cta-wrap">
          <button className="bf-orange-btn" onClick={() => setScreen('confirm-bid-r2')}>
            <BoltIcon /> Place Your Bid
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 7 — Confirm Bid Round 2
  ══════════════════════════════════════════════════ */
  if (screen === 'confirm-bid-r2') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-s3">
        <div className="bf-s3-nav">
          <button className="bf-back-circle" onClick={() => setScreen('bid-entry-r2')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L7 9l4-5" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="bf-s3-nav-title">Waiting for others to bid</span>
        </div>
        <EventCard timer="00:45" timerOrange roundLabel="Round 2" />
        <GroupCard />
        <div className="bf-adj-section">
          <p className="bf-adj-label">Your bid</p>
          <div className="bf-adj-row">
            <button className="bf-adj-btn bf-adj-btn--minus" onClick={() => adjustR2Bid(-50)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12" stroke="#1A1A2E" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
            <span className="bf-adj-amount">£{r2BidAmount}</span>
            <button className="bf-adj-btn bf-adj-btn--plus" onClick={() => adjustR2Bid(50)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="bf-chips">
            {(['+£100','+£200','+double'] as const).map((c,i) => (
              <button key={c} className={`bf-chip ${i===1?'bf-chip--active':''}`}
                onClick={() => { if(c==='+£100') adjustR2Bid(100); if(c==='+£200') adjustR2Bid(200); if(c==='+double'){const n=r2BidAmount*2;setR2BidAmount(n);setR2InputVal(String(n));} }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <p className="bf-update-note">You can update your bid anytime<br/>until another user places theirs.</p>
        <div className="bf-cta-wrap bf-cta-wrap--bottom">
          <button className="bf-orange-btn" onClick={() => setScreen('submitted-r2')}>
            <BoltIcon /> Place Final Bid – £{r2BidAmount}
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 8 — Round 2 Results (Make Payment)
  ══════════════════════════════════════════════════ */
  if (screen === 'results-r2') return (
    <IonPage><IonContent fullscreen className="bf-page" scrollY>
      <canvas ref={canvasRef} className="bf-canvas" />
      <div className="bf-results-wrap">
        <div className="bf-hero">
          <div className="bf-hero-trophy"><img src="/assets/img/trophy.svg" alt="" /></div>
          <h2 className="bf-hero-title">Round 2 Complete!</h2>
          <p className="bf-hero-sub">Group A results are in</p>
        </div>
        <div className="bf-matched-wrap">
          <p className="bf-matched-label">Matched Amount (Per Donor)</p>
          <p className="bf-matched-val">£214</p>
        </div>
        <div className="bf-stats3">
          <div className="bf-stat3"><TrendIcon /><span className="bf-stat3-val">1:3</span><span className="bf-stat3-lbl">Match Ratio</span></div>
          <div className="bf-stat3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 18v-1.5A3 3 0 0010 13.5H7A3 3 0 004 17v1" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8.5" cy="7" r="2.5" stroke="#2BA7A0" strokeWidth="1.5"/>
              <path d="M17 18v-1.5a3 3 0 00-2-2.8M14 4.2a3 3 0 010 5.6" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="bf-stat3-val">4</span><span className="bf-stat3-lbl">In Group</span>
          </div>
          <div className="bf-stat3"><TrendIcon /><span className="bf-stat3-val">£1324</span><span className="bf-stat3-lbl">Group Total</span></div>
        </div>
        <div className="bf-card bf-tealbg">
          <p className="bf-card-title">Your Contribution</p>
          <div className="bf-card-row"><span className="bf-card-lbl">Your Bid</span><span className="bf-card-val">£740</span></div>
          <div className="bf-card-row"><span className="bf-card-lbl">Matched Amount</span><span className="bf-card-val bf-teal">£214</span></div>
          <p className="bf-card-note">Your higher bid helped create leverage! The match was set at £214 by another donor.</p>
        </div>

        {/* View Group Bids R2 */}
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
              {[
                { initial: 'A', name: 'Atlas',   amount: '£400', min: false, you: false },
                { initial: 'C', name: 'Cedar',   amount: '£547', min: false, you: false },
                { initial: 'P', name: 'Phoenix', amount: '£214', min: true,  you: false },
                { initial: 'C', name: 'You',     amount: '£740', min: false, you: true  },
              ].map((b, i) => (
                <div key={i} className={`bf-bid-row ${b.min ? 'bf-bid-row--min' : ''} ${b.you ? 'bf-bid-row--you' : ''}`}>
                  <div className={`bf-bid-avatar ${b.you ? 'bf-bid-avatar--you' : b.min ? 'bf-bid-avatar--min' : ''}`}>{b.initial}</div>
                  <span className="bf-bid-name">{b.name}</span>
                  <span className={`bf-bid-amount ${b.min ? 'bf-bid-amount--min' : ''}`}>{b.amount}</span>
                  {b.min && <span className="bf-min-badge">min</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bf-card bf-card--row bf-card--cumul">
          <div>
            <p className="bf-card-title bf-card-title--sm">Your Cumulative Total</p>
            <p className="bf-card-lbl" style={{ marginTop: 2 }}>Including all rounds so far</p>
          </div>
          <span className="bf-cumul-val">£2470</span>
        </div>

        <button className="bf-orange-btn bf-full-btn" onClick={() => setScreen('payment-intro')}>
           Make Payment <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
            <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="bf-quit" onClick={() => router.goBack()}>Quit Event</button>
        <div style={{ height: 48 }} />
      </div>
    </IonContent></IonPage>
  );

  /* ══════════════════════════════════════════════════
     SCREEN 9 — Payment Intro (Thank you, Alex M.)
  ══════════════════════════════════════════════════ */
  if (screen === 'payment-intro') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div className="bf-pay-intro">
        {/* Top nav */}
        <div className="bf-pay-intro-nav">
          <button className="bf-back-circle" onClick={() => setScreen('results-r2')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L7 9l4-5" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="bf-pay-intro-event">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.3 2.6 2.9.4-2.1 2.1.5 2.9L7 8.2l-2.6 1.3.5-2.9L2.8 4.5l2.9-.4L7 1.5z" stroke="#9AA0A6" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            <span>Hope Gala 2026</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        <div className="bf-pay-intro-body">
          {/* Heart icon */}
          <div className="bf-heart-circle">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 28s-12-7.5-12-15a7 7 0 0114 0 7 7 0 0114 0c0 7.5-12 15-16 15z" fill="#fff"/>
            </svg>
          </div>

          <h2 className="bf-pay-intro-title">Thank you, <strong>Alex M.</strong></h2>
          <p className="bf-pay-intro-sub">The event has concluded. Your final pledge is:</p>
          <p className="bf-pay-intro-amount">£2470</p>

          {/* Image carousel (static placeholder) */}
              <Swiper
            slidesPerView={1.2}
            centeredSlides={true}
            spaceBetween={14}
            loop={true}
            initialSlide={2} 
            onSlideChange={(swiper) => setCurrentSlide(swiper.realIndex)}
          >
            {images.map((img, index) => (
              <SwiperSlide key={index}>
                <img src={img} className="slide" />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* CTAs */}
        <div className="bf-pay-intro-ctas">
          <button className="bf-orange-btn" onClick={() => setScreen('payment-form')}>
            Make Your Payment <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
            <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          </button>
          <button className="bf-teal-btn" onClick={() => setScreen('receipt')}>
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

        {/* Donation summary card */}
        <div className="bf-pay-summary-card">
          <div className="bf-pay-summary-event">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.3 2.6 2.9.4-2.1 2.1.5 2.9L7 8.2l-2.6 1.3.5-2.9L2.8 4.5l2.9-.4L7 1.5z" stroke="#2BA7A0" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="bf-pay-summary-event-name">Hope Gala 2026</span>
          </div>
          <p className="bf-pay-summary-label">Your Total Donation</p>
          <p className="bf-pay-summary-amount">£2470</p>
          <p className="bf-pay-summary-desc">Based on matched minimum bids across all rounds</p>
          <div className="bf-pay-summary-divider" />
          <div className="bf-pay-summary-row">
            <span className="bf-pay-summary-row-lbl">Subtotal</span>
            <span className="bf-pay-summary-row-val">£2470</span>
          </div>
          <div className="bf-pay-summary-row">
            <span className="bf-pay-summary-row-lbl">Processing fee</span>
            <span className="bf-pay-summary-row-val bf-teal">Free</span>
          </div>
          <div className="bf-pay-summary-divider" />
          <div className="bf-pay-summary-row bf-pay-summary-row--total">
            <span>Total</span>
            <span>£2470</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div className="bf-pay-form-footer">
          <div className="bf-pay-redirect-note">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#C5C8CC" strokeWidth="1.2"/>
              <path d="M7 4v3l2 1.5" stroke="#C5C8CC" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>We will redirect you to https://www.justgiving.com/ where you can make payment.</span>
          </div>
          <button className="bf-orange-btn" onClick={() => setScreen('receipt')}>
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
        {/* Hero */}
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

        {/* Receipt card */}
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
            { label: 'Amount',    val: '£2470',             teal: true  },
            { label: 'Charity',   val: 'EduReach Foundation' },
            { label: 'Event',     val: 'Spring Gala 2026'   },
            { label: 'Donor',     val: 'Cascade'            },
            { label: 'Method',    val: 'Bank Transfer'      },
            { label: 'Reference', val: 'PF-2026-0417-AXKR'  },
            { label: 'Date',      val: '3 Mar 2026'         },
          ].map((r, i) => (
            <div key={i} className="bf-receipt-row">
              <span className="bf-receipt-lbl">{r.label}</span>
              <span className={`bf-receipt-val ${r.teal ? 'bf-teal' : ''}`}>{r.val}</span>
            </div>
          ))}
          <p className="bf-receipt-note">A confirmation email will be sent to your registered address. This receipt can be used for tax-deduction purposes.</p>
        </div>

        {/* You made a difference */}
        <div className="bf-difference-card">
          <div className="bf-difference-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5l1.2 2.4 2.7.4-1.95 1.9.46 2.7L8 7.7 5.57 8.9l.46-2.7L4.1 4.3l2.7-.4L8 1.5z" fill="#2BA7A0" stroke="#2BA7A0" strokeWidth="0.3" strokeLinejoin="round"/>
            </svg>
            <span className="bf-difference-title">You made a difference</span>
          </div>
          <p className="bf-difference-desc">Through peer matching, your £0 donation helped raise £2,840 for EduReach Foundation.</p>
        </div>

        <button className="bf-teal-btn bf-teal-btn--full" onClick={() => router.goBack()}>
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
const EventCard: React.FC<{ timer: string; timerOrange: boolean; roundLabel?: string }> = ({ timer, timerOrange, roundLabel }) => (
  <div className="bf-event-card">
    <div className="bf-ec-top">
      <div className="bf-ec-name">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2C5.8 2 4 3.8 4 6c0 1.8 1.1 3.3 2.6 4.2L8 14l1.4-3.8C10.9 9.3 12 7.8 12 6c0-2.2-1.8-4-4-4z" stroke="#F4A43A" strokeWidth="1.5"/>
        </svg>
        <span>Hope Gala 2026</span>
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

const GroupCard: React.FC = () => (
  <div className="bf-group-card">
    <div className="bf-gc-top">
      <div className="bf-gc-label-row">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M12 16v-1.5A3 3 0 009 11.5H6A3 3 0 003 15v1" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7.5" cy="6" r="2.5" stroke="#1A1A2E" strokeWidth="1.5"/>
          <path d="M15 16v-1.5a3 3 0 00-1.8-2.75M12 3.25a3 3 0 010 5.5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="bf-gc-name">Group C</span>
      </div>
      <button className="bf-gc-collapse">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="#D1D5DB" strokeWidth="1.4"/>
          <path d="M6 10.5L9 7.5l3 3" stroke="#9AA0A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
    <p className="bf-gc-sub">You're matched with 3 other donors</p>
    <div className="bf-avatars">
      {[
        { emoji: '🍎', name: 'Stellar', you: false },
        { emoji: '🍒', name: 'Hannah',  you: false },
        { emoji: '🐰', name: 'You',     you: true  },
        { emoji: '🌸', name: 'Phoenix', you: false },
      ].map((a, i) => (
        <div key={i} className="bf-avatar-col">
          <div className={`bf-avatar-box ${a.you ? 'bf-avatar-box--you' : ''}`}>
            <span className="bf-avatar-em">{a.emoji}</span>
          </div>
          <span className={`bf-avatar-name ${a.you ? 'bf-avatar-name--you' : ''}`}>{a.name}</span>
          <span className="bf-avatar-status">Bidding</span>
          <div className="bf-avatar-dots">
            <span className="bf-avatar-dot bf-avatar-dot--on" />
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
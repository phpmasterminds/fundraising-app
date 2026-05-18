import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getDonorEventDetail,
  getCurrentRound,
  getRoundStatus,
  submitBid,
  quitEvent,
  getPaymentSummary,
  type RoundState,
  type PaymentSummary,
} from '../../services/donorEvents';
import './BidFlow.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination, EffectCoverflow } from 'swiper/modules';
import 'swiper/css/effect-coverflow';

const slideImages = [
  '/assets/img/Slide1.jpg',
  '/assets/img/Slide2.jpg',
  '/assets/img/Slide1.jpg',
  '/assets/img/Slide2.jpg',
  '/assets/img/Slide3.jpg',
];

type Screen =
  | 'starting'
  | 'bid-entry'
  | 'confirm-bid'
  | 'submitted'
  | 'round-results'
  | 'waiting'
  | 'payment-intro'
  | 'payment-form'
  | 'receipt';

interface Particle { x: number; y: number; w: number; h: number; color: string; angle: number; vx: number; vy: number; va: number; opacity: number; }
interface LocationState { eventId: number; totalRounds: number; roundTime: number; eventName: string; myPseudonym: string; }

const CONFETTI_COLORS = ['#2BA7A0','#2BA7A0','#2BA7A0','#1A5C58','#1A5C58','#0D3835','#0D3835','#A8E6E2','#fff','#fff'];

const BidFlow: React.FC = () => {
  const router   = useIonRouter();
  const location = useLocation<LocationState>();

  const searchParams   = new URLSearchParams(location.search);
  const eventIdFromUrl = parseInt(searchParams.get('id') ?? '0', 10);
  const stateEventId   = location.state?.eventId ?? eventIdFromUrl;

  const [eventId,     setEventId]     = useState(stateEventId);
  const [totalRounds, setTotalRounds] = useState(location.state?.totalRounds ?? 0);
  const [eventName,   setEventName]   = useState(location.state?.eventName   ?? '');
  const [myPseudonym, setMyPseudonym] = useState(location.state?.myPseudonym ?? 'You');

  const [screen,        setScreen]       = useState<Screen>('starting');
  const [checking,      setChecking]     = useState(true); // checking event status on mount
  const [bidAmount,     setBidAmount]    = useState(0);
  const [inputVal,      setInputVal]     = useState('0');
  const [submitting,    setSubmitting]   = useState(false);
  const [submitError,   setSubmitError]  = useState('');
  const [currentRound,  setCurrentRound] = useState(1);
  const [roundData,     setRoundData]    = useState<RoundState | null>(null);
  const [groupBidsOpen, setGroupBidsOpen]= useState(false);

  // Server-seeded timers
  const [roundSecsLeft,   setRoundSecsLeft]   = useState<number | null>(null);
  const [waitingSecsLeft, setWaitingSecsLeft] = useState<number | null>(null);

  const [paymentData,  setPaymentData]  = useState<PaymentSummary | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const roundTimerRef = useRef<any>(null);
  const waitTimerRef  = useRef<any>(null);
  const pollRef       = useRef<any>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number>(0);
  const particles     = useRef<Particle[]>([]);

  /* ══════ EFFECTS ══════ */

  // 1. Fetch event meta on mount + check if event already finished
  useEffect(() => {
    if (!stateEventId) return;

    // Always check round status first to handle finished events immediately
    getRoundStatus(stateEventId).then(res => {
      if (res.event_status === 'finished' || res.round_status === 'finished') {
        setScreen('payment-intro');
        getPaymentSummary(stateEventId).then(d => setPaymentData(d)).catch(() => {});
      } else if (res.current_round > 0) {
        setCurrentRound(res.current_round);
      }
    }).catch(() => {}).finally(() => setChecking(false));

    // Fetch event meta
    if (location.state?.totalRounds) {
      setTotalRounds(location.state.totalRounds);
      setEventName(location.state.eventName ?? '');
      setMyPseudonym(location.state.myPseudonym ?? 'You');
      return;
    }
    getDonorEventDetail(stateEventId).then(d => {
      setTotalRounds(d.rounds_count ?? 2);
      setEventName(d.name ?? '');
      setMyPseudonym(d.my_pseudonym ?? 'You');
    }).catch(() => setTotalRounds(2));
  }, [stateEventId]);

  // 2. starting → bid-entry after 2.5s
  useEffect(() => {
    if (screen !== 'starting') return;
    const t = setTimeout(() => setScreen('bid-entry'), 2500);
    return () => clearTimeout(t);
  }, [screen]);

  // 3. Fetch round data on bid screens — always re-fetch to get fresh seconds_left
  useEffect(() => {
    if (screen !== 'bid-entry' && screen !== 'confirm-bid') return;
    if (!eventId) return;
    // Reset timer before fetching
    setRoundSecsLeft(null);
    clearInterval(roundTimerRef.current);
    // First check if event is still active
    getRoundStatus(eventId).then(res => {
      if (res.event_status === 'finished' || res.round_status === 'finished') {
        // Event already finished — go to payment
        setScreen('payment-intro');
        getPaymentSummary(eventId).then(d => setPaymentData(d)).catch(() => {});
        return;
      }
      // Fetch round data
      return getCurrentRound(eventId).then(d => {
        setRoundData(d);
        setCurrentRound(prev => d.round_number > prev ? d.round_number : prev);
        if (d.seconds_left !== null && d.seconds_left > 0) {
          setRoundSecsLeft(d.seconds_left);
        }
      });
    }).catch(() => {
      // Fallback — just fetch round data
      getCurrentRound(eventId).then(d => {
        setRoundData(d);
        setCurrentRound(prev => d.round_number > prev ? d.round_number : prev);
        if (d.seconds_left !== null && d.seconds_left > 0) setRoundSecsLeft(d.seconds_left);
      }).catch(() => {});
    });
  }, [screen, eventId]);

  // 4. Round countdown (ticks once seeded from server)
  useEffect(() => {
    if (screen !== 'bid-entry' && screen !== 'confirm-bid') return;
    if (!roundSecsLeft || roundSecsLeft <= 0) return;
    clearInterval(roundTimerRef.current);
    roundTimerRef.current = setInterval(() => {
      setRoundSecsLeft(t => {
        if (!t || t <= 1) { clearInterval(roundTimerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(roundTimerRef.current);
  }, [screen, !!roundSecsLeft && roundSecsLeft > 0]);

  // 5. submitted → fetch results → round-results
  useEffect(() => {
    if (screen !== 'submitted') return;
    const roundWhenSubmitted = currentRound;
    const t = setTimeout(async () => {
      try {
        const d = await getCurrentRound(eventId);
        setRoundData(d);
        setCurrentRound(prev => Math.max(prev, d.round_number, roundWhenSubmitted));
        setGroupBidsOpen(false);
        setScreen('round-results');
      } catch (_) {
        setCurrentRound(roundWhenSubmitted);
        setScreen('round-results');
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [screen]);

  // 6. round-results: poll every 3s for next round, waiting, or finished
  useEffect(() => {
    if (screen !== 'round-results') return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await getRoundStatus(eventId);

        // Event finished → payment screen
        if (res.round_status === 'finished' || res.event_status === 'finished') {
          clearInterval(pollRef.current);
          setScreen('payment-intro');
          getPaymentSummary(eventId).then(d => setPaymentData(d)).catch(() => {});
          return;
        }

        // Last round just closed → event should be finishing soon
        // Keep polling until event_status = finished
        if (currentRound >= totalRounds) return;

        // Next round opened (not last round)
        if (res.round_status === 'open' && res.current_round > currentRound) {
          clearInterval(pollRef.current);
          try {
            const d = await getCurrentRound(eventId);
            setRoundData(d);
            setCurrentRound(d.round_number);
            setRoundSecsLeft(d.seconds_left);
          } catch (_) {
            setCurrentRound(res.current_round);
            setRoundSecsLeft(res.seconds_left);
          }
          setBidAmount(0); setInputVal('0');
          setScreen('bid-entry');
          return;
        }

        // Between rounds — go to waiting screen
        if (res.round_status === 'waiting') {
          clearInterval(pollRef.current);
          setWaitingSecsLeft(res.seconds_until_next);
          setScreen('waiting');
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [screen, eventId, currentRound, totalRounds]);

  // 7. waiting: tick countdown (seeded from server seconds_until_next)
  useEffect(() => {
    if (screen !== 'waiting') return;
    if (!waitingSecsLeft || waitingSecsLeft <= 0) return;
    clearInterval(waitTimerRef.current);
    waitTimerRef.current = setInterval(() => {
      setWaitingSecsLeft(t => {
        if (!t || t <= 1) { clearInterval(waitTimerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(waitTimerRef.current);
  }, [screen, !!waitingSecsLeft && waitingSecsLeft > 0]);

  // 8. waiting: poll every 5s for next round opening
  useEffect(() => {
    if (screen !== 'waiting') return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await getRoundStatus(eventId);
        if (res.round_status === 'open') {
          clearInterval(pollRef.current); clearInterval(waitTimerRef.current);
          // Fetch fresh round data to get correct seconds_left for the new round
          try {
            const d = await getCurrentRound(eventId);
            setRoundData(d);
            setCurrentRound(d.round_number);
            setRoundSecsLeft(d.seconds_left);
          } catch (_) {
            setCurrentRound(res.current_round);
            setRoundSecsLeft(res.seconds_left);
          }
          setBidAmount(0); setInputVal('0');
          setScreen('bid-entry');
        } else if (res.round_status === 'finished') {
          clearInterval(pollRef.current); clearInterval(waitTimerRef.current);
          setScreen('payment-intro');
          getPaymentSummary(eventId).then(d => setPaymentData(d)).catch(() => {});
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [screen, eventId]);

  // ── Confetti ──────────────────────────────────────────────────────────
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

  // 9. Confetti on round-results
  useEffect(() => {
    if (screen === 'round-results') return startConfetti() ?? undefined;
  }, [screen, startConfetti]);

  /* ══════ HANDLERS ══════ */

  const handlePlaceBid = async () => {
    if (submitting) return;
    setSubmitError('');
    if (!bidAmount || bidAmount <= 0) { setSubmitError('Please enter a bid amount.'); return; }
    setSubmitting(true);
    try {
      await submitBid(eventId, bidAmount);
      setScreen('submitted');
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? 'Failed to submit bid. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleQuit = async () => {
    try { await quitEvent(eventId); } catch (_) {}
    router.goBack();
  };

  const adjustBid = (delta: number) => {
    setBidAmount(prev => { const n = Math.max(0, prev + delta); setInputVal(String(n)); return n; });
  };

  /* ── Derived ─────────────────────────────────────────────────────── */
  const fmt = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const roundTimerDisplay = roundSecsLeft !== null && roundSecsLeft > 0 ? fmt(roundSecsLeft) : '00:00';
  const roundTimerOrange  = roundSecsLeft !== null && roundSecsLeft > 0;
  const isLastRound       = currentRound >= totalRounds;
  const matchedAmount     = roundData?.matched_amount ?? 0;
  const myCumulative      = roundData?.my_cumulative  ?? 0;
  const roundBids         = roundData?.round_bids      ?? [];
  const myBid             = roundData?.my_bid          ?? bidAmount;
  const myGroup           = roundData?.my_group        ?? null;
  const groupSize         = roundData?.group_size       ?? 4;
  const groupTotal        = roundData?.group_total      ?? 0;
  const matchRatio        = roundData?.match_ratio      ?? '1:3';

  /* ══════ GUARD ══════ */
  if (!stateEventId) return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <p style={{ color:'#9AA0A6', fontSize:14 }}>Loading event...</p>
      </div>
    </IonContent></IonPage>
  );

  // Show nothing while checking event status (prevents flash of bid screen for finished events)
  if (checking) return (
    <IonPage><IonContent fullscreen className="bf-page bf-white">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ color:'#9AA0A6', fontSize:14 }}>Loading...</p>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S1: Starting ══════ */
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
          <div className="bf-clock-ring"><div className="bf-clock-circle">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="20" stroke="#fff" strokeWidth="2.5"/>
              <path d="M22 13v9l6 4.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div></div>
          <h1 className="bf-s1-title">Round {currentRound} Starting!</h1>
          <p className="bf-s1-sub">Get ready to place your bid...</p>
        </div>
        <div className="bf-joining-bar">
          <p className="bf-joining-label">You're joining as</p>
          <p className="bf-joining-name">{myPseudonym}</p>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S2: Bid Entry ══════ */
  if (screen === 'bid-entry') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div className="bf-s2">
        <EventCard timer={roundTimerDisplay} timerOrange={roundTimerOrange} roundLabel={`Round ${currentRound}`} eventName={eventName} />
        <div className="bf-amount-zone">
          <p className="bf-amount-hint">Type your bid</p>
          <div className="bf-amount-display">
            <span className="bf-pound">£</span>
            <input className="bf-amount-input" type="number" value={inputVal}
              onChange={e => { setInputVal(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) setBidAmount(n); }}
              inputMode="numeric" style={{ width: `${Math.max(inputVal.length, 1)}ch` }} />
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
        {submitError && <p style={{ color:'#E87040', fontSize:13, textAlign:'center', marginBottom:8 }}>{submitError}</p>}
        <div className="bf-cta-wrap">
          <button className="bf-orange-btn" onClick={() => setScreen('confirm-bid')}>
            <BoltIcon /> Place Your Bid
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S3: Confirm Bid ══════ */
  if (screen === 'confirm-bid') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div className="bf-s3">
        <div className="bf-s3-nav">
          <button className="bf-back-circle" onClick={() => setScreen('bid-entry')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.99967 12.6666L3.33301 7.99998L7.99967 3.33331" stroke="#25201D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.6663 8H3.33301" stroke="#25201D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="bf-s3-nav-title">Waiting for others to bid</span>
        </div>
        <EventCard timer={roundTimerDisplay} timerOrange={roundTimerOrange} roundLabel={`Round ${currentRound}`} eventName={eventName} />
        <GroupCard myGroup={myGroup} groupSize={groupSize} />
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
        {submitError && <p style={{ color:'#E87040', fontSize:13, textAlign:'center', marginBottom:8 }}>{submitError}</p>}
        <div className="bf-cta-wrap bf-cta-wrap--bottom">
          <button className="bf-orange-btn" onClick={handlePlaceBid} disabled={submitting} style={submitting?{opacity:0.6}:{}}>
            <BoltIcon /> {submitting ? 'Placing...' : `Place Final Bid – £${bidAmount}`}
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S4: Submitted ══════ */
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
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S5: Round Results ══════ */
  if (screen === 'round-results') return (
    <IonPage><IonContent fullscreen className="bf-page" scrollY>
      <canvas ref={canvasRef} className="bf-canvas" />
      <div className="bf-results-wrap">
        <div className="bf-hero">
          <div className="bf-hero-trophy"><img src="/assets/img/trophy.svg" alt="" /></div>
          <h2 className="bf-hero-title">Round {currentRound} Complete!</h2>
          <p className="bf-hero-sub">{myGroup ? `${myGroup.name} results are in` : 'Results are in'}</p>
        </div>
        <div className="bf-matched-wrap">
          <p className="bf-matched-label">Matched Amount (Per Donor)</p>
          <p className="bf-matched-val">£{matchedAmount}</p>
        </div>
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.6243 10.3333C6.56478 10.1026 6.44453 9.89203 6.27605 9.72355C6.10757 9.55507 5.89702 9.43481 5.6663 9.3753L1.5763 8.32063C1.50652 8.30082 1.44511 8.2588 1.40138 8.20093C1.35765 8.14306 1.33398 8.0725 1.33398 7.99996C1.33398 7.92743 1.35765 7.85687 1.40138 7.799C1.44511 7.74113 1.50652 7.6991 1.5763 7.6793L5.6663 6.62396C5.89693 6.5645 6.10743 6.44435 6.2759 6.27599C6.44438 6.10763 6.56468 5.89722 6.6243 5.66663L7.67897 1.57663C7.69857 1.50657 7.74056 1.44486 7.79851 1.40089C7.85647 1.35693 7.92722 1.33313 7.99997 1.33313C8.07271 1.33313 8.14346 1.35693 8.20142 1.40089C8.25938 1.44486 8.30136 1.50657 8.32097 1.57663L9.37497 5.66663C9.43449 5.89734 9.55474 6.10789 9.72322 6.27637C9.8917 6.44486 10.1023 6.56511 10.333 6.62463L14.423 7.67863C14.4933 7.69803 14.5553 7.73997 14.5995 7.79801C14.6437 7.85606 14.6677 7.927 14.6677 7.99996C14.6677 8.07292 14.6437 8.14387 14.5995 8.20191C14.5553 8.25996 14.4933 8.3019 14.423 8.3213L10.333 9.3753C10.1023 9.43481 9.8917 9.55507 9.72322 9.72355C9.55474 9.89203 9.43449 10.1026 9.37497 10.3333L8.3203 14.4233C8.3007 14.4934 8.25871 14.5551 8.20075 14.599C8.1428 14.643 8.07205 14.6668 7.9993 14.6668C7.92656 14.6668 7.85581 14.643 7.79785 14.599C7.73989 14.5551 7.69791 14.4934 7.6783 14.4233L6.6243 10.3333Z" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.333 2V4.66667" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.6667 3.33337H12" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.66699 11.3334V12.6667" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.33333 12H2" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="bf-stat3-val">£{groupTotal}</span><span className="bf-stat3-lbl">Group Total</span>
          </div>
        </div>
        <div className="bf-card bf-tealbg">
          <p className="bf-card-title">Your Contribution</p>
          <div className="bf-card-row"><span className="bf-card-lbl">Your Bid</span><span className="bf-card-val">£{myBid}</span></div>
          <div className="bf-card-row"><span className="bf-card-lbl">Matched Amount</span><span className="bf-card-val bf-teal">£{matchedAmount}</span></div>
          {myBid > matchedAmount && matchedAmount > 0 && (
            <p className="bf-card-note">Your higher bid helped create leverage! The match was set at £{matchedAmount} by another donor.</p>
          )}
        </div>
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
        <div className="bf-card bf-card--row bf-card--cumul">
          <div>
            <p className="bf-card-title bf-card-title--sm">Your Cumulative Total</p>
            <p className="bf-card-lbl" style={{ marginTop: 2 }}>Including all rounds so far</p>
          </div>
          <span className="bf-cumul-val">£{myCumulative}</span>
        </div>
        <p style={{ textAlign:'center', color:'#9AA0A6', fontSize:13, margin:'16px 0 8px' }}>
          {currentRound >= totalRounds
            ? 'All rounds complete — preparing payment...'
            : 'Waiting for next round...'}
        </p>
        {/* Show Make Payment immediately on last round */}
        {currentRound >= totalRounds && (
          <button className="bf-orange-btn bf-full-btn"
            onClick={() => { getPaymentSummary(eventId).then(d => setPaymentData(d)).catch(() => {}); setScreen('payment-intro'); }}>
            Make Payment →
          </button>
        )}
        <button className="bf-quit" onClick={handleQuit}>Quit Event</button>
        <div style={{ height: 48 }} />
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S6: Waiting Between Rounds ══════ */
  if (screen === 'waiting') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:20, padding:'0 24px' }}>
        <div className="bf-clock-ring"><div className="bf-clock-circle">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="#fff" strokeWidth="2.5"/>
            <path d="M22 13v9l6 4.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div></div>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:22, fontWeight:600, color:'#1A1A2E', margin:'0 0 8px' }}>Round {currentRound} Complete!</h2>
          <p style={{ fontSize:14, color:'#9AA0A6', margin:'0 0 16px' }}>
            {waitingSecsLeft !== null && waitingSecsLeft > 0
              ? `Round ${currentRound + 1} starts in`
              : `Waiting for host to open Round ${currentRound + 1}...`}
          </p>
          {waitingSecsLeft !== null && waitingSecsLeft > 0 && (
            <p style={{ fontSize:64, fontWeight:500, color:'#1A1A2E', margin:0, letterSpacing:-3, fontFamily:'monospace' }}>
              {fmt(waitingSecsLeft)}
            </p>
          )}
        </div>
        <div className="bf-event-card" style={{ width:'100%', maxWidth:420 }}>
          <div className="bf-ec-top">
            <div className="bf-ec-name">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12.6663 9.33333C13.6597 8.36 14.6663 7.19333 14.6663 5.66667C14.6663 4.69421 14.28 3.76158 13.5924 3.07394C12.9048 2.38631 11.9721 2 10.9997 2C9.82634 2 8.99967 2.33333 7.99967 3.33333C6.99967 2.33333 6.17301 2 4.99967 2C4.02721 2 3.09458 2.38631 2.40695 3.07394C1.71932 3.76158 1.33301 4.69421 1.33301 5.66667C1.33301 7.2 2.33301 8.36667 3.33301 9.33333L7.99967 14L12.6663 9.33333Z" stroke="#FCB040" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{eventName}</span>
            </div>
            <span className="bf-live-badge"><span className="bf-live-dot" />Live</span>
          </div>
          <div className="bf-ec-timer bf-ec-timer--orange">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6.66699 1.33337H9.33366" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 9.33337L10 7.33337" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.00033 14.6667C10.9458 14.6667 13.3337 12.2789 13.3337 9.33333C13.3337 6.38781 10.9458 4 8.00033 4C5.05481 4 2.66699 6.38781 2.66699 9.33333C2.66699 12.2789 5.05481 14.6667 8.00033 14.6667Z" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Round {currentRound + 1} {waitingSecsLeft !== null && waitingSecsLeft > 0 ? fmt(waitingSecsLeft) : ''}</span>
          </div>
        </div>
        <button className="bf-quit" style={{ marginTop:8 }} onClick={handleQuit}>Quit Event</button>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S7: Payment Intro ══════ */
  if (screen === 'payment-intro') return (
    <IonPage><IonContent fullscreen scrollY={true} className="bf-page bf-white">
      <div className="bf-pay-intro">
        <div className="bf-pay-intro-nav">
          <button className="bf-back-circle" onClick={() => setScreen('round-results')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.99967 12.6666L3.33301 7.99998L7.99967 3.33331" stroke="#25201D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.6663 8H3.33301" stroke="#25201D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="bf-pay-intro-event">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5l1.3 2.6 2.9.4-2.1 2.1.5 2.9L7 8.2l-2.6 1.3.5-2.9L2.8 4.5l2.9-.4L7 1.5z" stroke="#9AA0A6" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            <span>{paymentData?.event_name ?? eventName}</span>
          </div>
          <div style={{ width: 36 }} />
        </div>
        <div className="bf-pay-intro-body">
          <div className="bf-heart-circle">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 28s-12-7.5-12-15a7 7 0 0114 0 7 7 0 0114 0c0 7.5-12 15-16 15z" fill="#fff"/>
            </svg>
          </div>
          <h2 className="bf-pay-intro-title">Thank you, <strong>{paymentData?.donor_name ?? myPseudonym}</strong></h2>
          <p className="bf-pay-intro-sub">The event has concluded. Your final pledge is:</p>
          <p className="bf-pay-intro-amount">£{paymentData?.total_amount ?? myCumulative}</p>
          <div className="bf-carousel" style={{ width:'100%' }}>
            <Swiper modules={[Pagination, EffectCoverflow]} effect="coverflow" grabCursor centeredSlides slidesPerView="auto"
              coverflowEffect={{ rotate:0, stretch:0, depth:100, modifier:2.5, slideShadows:false }}
              pagination={{ clickable: true }} className="stack-carousel"
              onSlideChange={s => setCurrentSlide(s.activeIndex)}>
              {slideImages.map((src, i) => (
                <SwiperSlide key={i} className="stack-slide"><img src={src} className="stack-img" alt="" /></SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
        <div className="bf-pay-intro-ctas">
          <button className="bf-orange-btn" onClick={() => setScreen('payment-form')}>
            Make Your Payment
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/><path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
          <button className="bf-teal-btn" onClick={() => setScreen('receipt')}>
            Mark as Paid Offline
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4.16699 10H15.8337" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/><path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
          <div className="bf-payment-status">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3332 8.66664C13.3332 12 10.9998 13.6666 8.2265 14.6333C8.08128 14.6825 7.92353 14.6802 7.77984 14.6266C4.99984 13.6666 2.6665 12 2.6665 8.66664V3.99997C2.6665 3.82316 2.73674 3.65359 2.86177 3.52857C2.98679 3.40355 3.15636 3.33331 3.33317 3.33331C4.6665 3.33331 6.33317 2.53331 7.49317 1.51997C7.63441 1.39931 7.81407 1.33301 7.99984 1.33301C8.1856 1.33301 8.36527 1.39931 8.5065 1.51997C9.67317 2.53997 11.3332 3.33331 12.6665 3.33331C12.8433 3.33331 13.0129 3.40355 13.1379 3.52857C13.2629 3.65359 13.3332 3.82316 13.3332 3.99997V8.66664Z" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Payment status: Recorded</span>
          </div>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S8: Payment Form ══════ */
  if (screen === 'payment-form') return (
    <IonPage><IonContent fullscreen className="bf-page bf-white" scrollY>
      <div className="bf-pay-form">
        <div className="bf-pay-form-nav">
          <button className="bf-back-circle" onClick={() => setScreen('payment-intro')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.99967 12.6666L3.33301 7.99998L7.99967 3.33331" stroke="#25201D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.6663 8H3.33301" stroke="#25201D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="bf-pay-form-nav-title">Payment</span>
          <div style={{ width: 36 }} />
        </div>
        <div className="bf-pay-summary-card">
          <p className="bf-pay-summary-label">Your Total Donation</p>
          <p className="bf-pay-summary-amount">£{paymentData?.total_amount ?? myCumulative}</p>
          <p className="bf-pay-summary-desc">Based on matched minimum bids across all rounds</p>
          <div className="bf-pay-summary-divider" />
          {(paymentData?.rounds_detail ?? []).map((r, i: number) => (
            <div key={i} className="bf-pay-summary-row">
              <span className="bf-pay-summary-row-lbl">Round {r.round}</span>
              <span className="bf-pay-summary-row-val">£{r.matched}</span>
            </div>
          ))}
          <div className="bf-pay-summary-row"><span className="bf-pay-summary-row-lbl">Processing fee</span><span className="bf-pay-summary-row-val bf-teal1">Free</span></div>
          <div className="bf-pay-summary-divider" />
          <div className="bf-pay-summary-row bf-pay-summary-row--total"><span>Total</span><span>£{paymentData?.total_amount ?? myCumulative}</span></div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="bf-pay-form-footer">
          <div className="bf-pay-redirect-note">
            <span>We will redirect you to {paymentData?.charity_link ?? 'the charity page'} to complete payment.</span>
          </div>
          <button className="bf-orange-btn" onClick={() => setScreen('receipt')}>
            Continue <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none"><path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/><path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
    </IonContent></IonPage>
  );

  /* ══════ S9: Receipt ══════ */
  return (
    <IonPage><IonContent fullscreen scrollY={true} className="bf-page bf-white">
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
            <span className="bf-receipt-card-title">Donation Receipt</span>
          </div>
          {[
            { label: 'Amount',    val: `£${paymentData?.total_amount ?? myCumulative}`, teal: true },
            { label: 'Charity',   val: paymentData?.charity_name ?? '—' },
            { label: 'Event',     val: paymentData?.event_name   ?? eventName },
            { label: 'Donor',     val: paymentData?.donor_name   ?? myPseudonym },
            { label: 'Reference', val: paymentData?.reference    ?? '—' },
            { label: 'Date',      val: paymentData?.date         ?? '—' },
          ].map((r, i) => (
            <div key={i} className="bf-receipt-row">
              <span className="bf-receipt-lbl">{r.label}</span>
              <span className={`bf-receipt-val ${r.teal ? 'bf-teal' : ''}`}>{r.val}</span>
            </div>
          ))}
          <p className="bf-receipt-note">A confirmation email will be sent to your registered address.</p>
        </div>
        <div className="bf-difference-card">
          <div className="bf-difference-header">
            <span className="bf-difference-title">You made a difference</span>
          </div>
          <p className="bf-difference-desc">Through peer matching, your £{paymentData?.total_amount ?? myCumulative} donation helped raise funds for {paymentData?.charity_name ?? 'the charity'}.</p>
        </div>
        <button className="bf-teal-btn bf-teal-btn--full" onClick={() => router.goBack()}>Back to lobby</button>
        <div style={{ height: 48 }} />
      </div>
    </IonContent></IonPage>
  );
};

/* ── Sub-Components ── */
const EventCard: React.FC<{ timer: string; timerOrange: boolean; roundLabel?: string; eventName?: string }> = ({ timer, timerOrange, roundLabel, eventName }) => (
  <div className="bf-event-card">
    <div className="bf-ec-top">
      <div className="bf-ec-name">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12.6663 9.33333C13.6597 8.36 14.6663 7.19333 14.6663 5.66667C14.6663 4.69421 14.28 3.76158 13.5924 3.07394C12.9048 2.38631 11.9721 2 10.9997 2C9.82634 2 8.99967 2.33333 7.99967 3.33333C6.99967 2.33333 6.17301 2 4.99967 2C4.02721 2 3.09458 2.38631 2.40695 3.07394C1.71932 3.76158 1.33301 4.69421 1.33301 5.66667C1.33301 7.2 2.33301 8.36667 3.33301 9.33333L7.99967 14L12.6663 9.33333Z" stroke="#FCB040" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{eventName || 'Event'}</span>
      </div>
      <span className="bf-live-badge"><span className="bf-live-dot" />Live</span>
    </div>
    <div className={`bf-ec-timer ${timerOrange ? 'bf-ec-timer--orange' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g opacity={timerOrange ? '1' : '0.2'}>
          <path d="M6.66699 1.33337H9.33366" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 9.33337L10 7.33337" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8.00033 14.6667C10.9458 14.6667 13.3337 12.2789 13.3337 9.33333C13.3337 6.38781 10.9458 4 8.00033 4C5.05481 4 2.66699 6.38781 2.66699 9.33333C2.66699 12.2789 5.05481 14.6667 8.00033 14.6667Z" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
      {/* Show round label + timer together: "Round 1  ⏱ 08:42" */}
      <span>
        {roundLabel && <span style={{ marginRight: 8 }}>{roundLabel}</span>}
        {timerOrange && <span>{timer}</span>}
      </span>
    </div>
  </div>
);

const GroupCard: React.FC<{ myGroup: { name: string; members: any[] } | null; groupSize: number }> = ({ myGroup, groupSize }) => {
  const members = myGroup?.members ?? [];
  const slots = Array.from({ length: groupSize }, (_, i) => members[i] ?? null);
  return (
    <div className="bf-group-card">
      <div className="bf-gc-top">
        <div className="bf-gc-label-row">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M12 16v-1.5A3 3 0 009 11.5H6A3 3 0 003 15v1" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="7.5" cy="6" r="2.5" stroke="#1A1A2E" strokeWidth="1.5"/>
            <path d="M15 16v-1.5a3 3 0 00-1.8-2.75M12 3.25a3 3 0 010 5.5" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="bf-gc-name">{myGroup?.name ?? 'Your Group'}</span>
        </div>
      </div>
      <p className="bf-gc-sub">You're matched with {groupSize - 1} other donors</p>
      <div className="bf-avatars">
        {slots.map((m, i) => {
          const isYou = m?.is_you ?? false;
          const name  = isYou ? 'You' : (m?.pseudonym ?? '?');
          const emoji = m?.emoji ?? null;
          const initial = m?.initial ?? '?';
          const status = m?.bid_status === 'submitted' ? 'Submitted' : 'Bidding';
          return (
            <div key={i} className={`bf-avatar-col ${isYou ? 'bf-avatar-box--you' : ''}`}>
              <div className="bf-avatar-box">
                {emoji ? <span className="bf-avatar-em">{emoji}</span>
                  : <span className="bf-avatar-em" style={{ fontSize:18, fontWeight:600 }}>{m ? initial : '—'}</span>}
              </div>
              <span className={`bf-avatar-name ${isYou ? 'bf-avatar-name--you' : ''}`}>{m ? name : '...'}</span>
              <span className="bf-avatar-status">{m ? status : ''}</span>
              <div className="bf-avatar-dots">
                <span className={`bf-avatar-dot ${m ? 'bf-avatar-dot--on' : ''}`} />
                <span className="bf-avatar-dot" /><span className="bf-avatar-dot" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TrendIcon: React.FC<{ small?: boolean }> = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14.6663 4.66663L8.99967 10.3333L5.66634 6.99996L1.33301 11.3333" stroke="#16837E" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.667 4.66663H14.667V8.66663" stroke="#16837E" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M10 2L4 10h6l-2 6 8-9h-6l2-5z" fill="#000" stroke="#000" strokeWidth="0.5" strokeLinejoin="round"/>
  </svg>
);

export default BidFlow;
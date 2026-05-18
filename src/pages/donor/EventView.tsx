import { IonPage, IonContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import './EventView.css';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import DonorHeader from '../../components/DonorHeader';

import {
  getDonorEventDetail,
  getEventByCode,
  storageUrl,
  DonorEventDetail,
} from '../../services/donorEvents';

// ─── helpers ────────────────────────────────────────────────────

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function countdownSeconds(startedAt: string | null): number {
  if (!startedAt) return 0;
  const diff = Math.floor((new Date(startedAt).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// ─── component ──────────────────────────────────────────────────

const EventView: React.FC = () => {
  const router  = useIonRouter();
  const query   = useQuery();
  const eventId = Number(query.get('id'));

  const [event, setEvent]       = useState<DonorEventDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [seconds, setSeconds]   = useState(0);
  const [isActive, setIsActive] = useState(false);

  const isLoggedIn = !!localStorage.getItem('auth_token');

  // ── Fetch event detail ────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      try {
        let data: DonorEventDetail;

        if (isLoggedIn) {
          data = await getDonorEventDetail(eventId);
        } else {
          const code = localStorage.getItem('event_code') ?? '';
          if (!code) {
            setLoading(false);
            return;
          }
          data = await getEventByCode(code);
          data = data.event;
        }

        setEvent(data);
        const s = countdownSeconds(data.started_at);
        setSeconds(s);
        if (s === 0 || data.status === 'live') setIsActive(true);
      } catch {
        // silent — shows "Event not found"
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  // ── Countdown timer ───────────────────────────────────────────
  useEffect(() => {
    if (isActive || seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(timer); setIsActive(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, seconds]);

  // ── Join handler ─────────────────────────────────────────────
  const handleJoin = () => {
    if (!event) return;

    localStorage.setItem('event_id', String(event.id));

    const code  = event.join_code ?? localStorage.getItem('event_code') ?? '';
    const token = localStorage.getItem('auth_token');

    if (!token) {
      router.push(`/register?from=qr&code=${code}`);
      return;
    }

    router.push(`/profile?mode=join`);
  };

  // ── Start funding (already a member) ─────────────────────────
  const handleStart = () => {
    if (event?.is_member && isActive) {
      router.push(
        `/bid?id=${eventId}`,
        'forward',
        'push',
        {
          eventId:     event.id,
          totalRounds: event.rounds_count,
          roundTime:   (event as any).round_time ?? 0,
          eventName:   event.name,
          myPseudonym: event.my_pseudonym ?? 'You',
        }
      );
    }
  };

  // ── Resolve image URLs ────────────────────────────────────────
  const slideImages = event?.images?.length
    ? event.images.map(p => storageUrl(p) ?? '/assets/img/Slide1.jpg')
    : ['/assets/img/Slide1.jpg', '/assets/img/Slide2.jpg', '/assets/img/Slide3.jpg'];

  const logoSrc  = storageUrl(event?.logo) ?? '/assets/img/Heart.svg';
  const isMember   = event?.is_member ?? false;
  const isFinished = event?.status === 'finished';

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="event-view">
          <div className="container" style={{ paddingTop: 40, textAlign: 'center', color: '#9AA0A6' }}>
            Loading event...
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!event) {
    return (
      <IonPage>
        <IonContent fullscreen className="event-view">
          <div className="container" style={{ paddingTop: 40, textAlign: 'center', color: '#9AA0A6' }}>
            Event not found.
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="event-view">
        <div className="container">

          {/* ── Header ── */}
          <DonorHeader
            variant="back"
            title={`✨ ${event.name}`}
            onBack={() => router.back()}
          />

          {/* ICON */}
          <div className="center-icon">
            <img src={logoSrc} alt={event.name} />
          </div>

          {/* TITLE */}
          <h2>{event.name}</h2>

          <p className="desc">{event.description}</p>

          {/* TIMER — only shown if event hasn't started yet and donor has joined */}
          {isMember && !isActive && (
            <>
              <p className="starts">Event starts in</p>
              <div className="timer">⏱ {formatTime(seconds)}</div>
            </>
          )}

          {/* IMAGE SLIDER */}
          {slideImages.length > 0 && (
            <Swiper
              slidesPerView={1.2}
              centeredSlides={true}
              spaceBetween={14}
              loop={slideImages.length > 1}
              initialSlide={0}
            >
              {slideImages.map((img, index) => (
                <SwiperSlide key={index}>
                  <img src={img} className="slide" alt="" />
                </SwiperSlide>
              ))}
            </Swiper>
          )}

        </div>

        {/* ── BOTTOM BUTTON — hidden for finished events ── */}
        {!isFinished && (
          !isMember ? (
            <div className="bottom-btn active" onClick={handleJoin}>
              Join Event
              <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
                <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
          ) : (
            <div className={`bottom-btn ${isActive ? 'active' : ''}`} onClick={handleStart}>
              Start Funding
              <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
                <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
          )
        )}

      </IonContent>
    </IonPage>
  );
};

export default EventView;
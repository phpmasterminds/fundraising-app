import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useEffect, useState } from 'react';
import './EventView.css';
import { useIonRouter } from '@ionic/react';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const images = [
  '/assets/img/Slide1.jpg',
  '/assets/img/Slide2.jpg',
  '/assets/img/Slide3.jpg'
];

const EventView: React.FC = () => {

  const [seconds, setSeconds] = useState(45);
  const [isActive, setIsActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const router = useIonRouter();

  // 🔥 TIMER
  useEffect(() => {
    if (seconds <= 0) {
      setIsActive(true);
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <IonPage>
      <IonContent fullscreen className="event-view">

        <div className="container">

          {/* HEADER */}
          <div className="top-bar">
            <div className="back-btn" onClick={() => router.back()}>
              <img src="/assets/img/Back.svg" />
            </div>
            <div className="title-chip">✨ Hope Gala 2026</div>
          </div>

          {/* ICON */}
          <div className="center-icon">
            <img src="/assets/img/Heart.svg" />
          </div>

          {/* TITLE */}
          <h2>Hope Gala 2026</h2>

          <p className="desc">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit,
            sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>

          {/* TIMER */}
          {!isActive && (
            <>
              <p className="starts">Event starts in</p>
              <div className="timer">⏱ {formatTime(seconds)}</div>
            </>
          )}

          {/* 🔥 SWIPER SLIDER */}
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

        {/* BUTTON */}
        <div className={`bottom-btn ${isActive ? 'active' : ''}`}>
          Start Funding
          <svg width="20" height="20" className="start-arrow" viewBox="0 0 20 20" fill="none">
            <path d="M4.16699 10H15.8337" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M10 4.16663L15.8333 9.99996L10 15.8333" stroke="#25201D" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default EventView;
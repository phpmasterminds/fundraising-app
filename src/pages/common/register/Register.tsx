import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getRole } from '../../../services/auth';
import './Register.css';

const Register: React.FC = () => {

  const router = useIonRouter();
  const location = useLocation();

  const [role, setRoleState] = useState<string | null>(null);

  // 🔥 QR detection
  const params = new URLSearchParams(location.search);
  const fromQR = params.get('from') === 'qr';
  const eventCode = params.get('code');

  useEffect(() => {
    const r = getRole();
    setRoleState(r);
  }, []);

  // 🔥 Submit
  const handleRegister = () => {

    if (fromQR) {
      // store event code
      localStorage.setItem('event_code', eventCode || '');

      router.push('/donor-dashboard', 'root');
      return;
    }

    if (role === 'host') {
      router.push('/host-dashboard', 'root');
    } else {
      router.push('/donor-dashboard', 'root');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="register-page">

        <div className="container">

          {/* Back */}
          <div className="back-btn" onClick={() => router.back()}>
            <img src="/assets/img/Back.svg" />
          </div>

          {/* 🔥 QR TITLE ONLY */}
          {fromQR && (
            <>
              <h2 className="title">Join the Event</h2>

              <p className="subtitle">
                Ocean Guardian Gala 2026 by Clean Oceans Initiative
              </p>
            </>
          )}

          {/* Profile */}
          <div className="profile">
            <div className="avatar">
              <img src="/assets/img/user.svg" />
            </div>
            <span>Upload Photo</span>
          </div>

          {/* Form */}
          <div className="form-area">

            <div className="input-group">
              <label>Email Address</label>
              <div className="input-box">
                <img src="/assets/img/Email.svg" />
                <input type="email" placeholder="john@example.com" />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <img src="/assets/img/Lock.svg" />
                <input type="password" />
                <img src="/assets/img/Eye.svg" className="eye" />
              </div>
            </div>

            <div className="input-group">
              <label>Re-enter Password</label>
              <div className="input-box">
                <img src="/assets/img/Lock.svg" />
                <input type="password" />
                <img src="/assets/img/Eye.svg" className="eye" />
              </div>
            </div>

          </div>

          {/* Bottom */}
          <div className="bottom">

            <button
              className={`primary-btn ${role}`}
              onClick={handleRegister}
            >
              {fromQR ? 'Enter Events Room' : 'Create Account'}
            </button>

            <div
              className="secondary"
              onClick={() => router.push('/login')}
            >
              Log in
            </div>

          </div>

        </div>

      </IonContent>
    </IonPage>
  );
};

export default Register;
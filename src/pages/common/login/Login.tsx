import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { getRole } from '../../../services/auth';
import { useEffect, useState } from 'react';
import './Login.css';

const Login: React.FC = () => {
  const router = useIonRouter();
  const [role, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const r = getRole();
    setUserRole(r);
  }, []);

  const handleLogin = () => {
    if (role === 'host') {
      router.push('/events', 'root');
    } else {
      router.push('/devents', 'root');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="login-page">

        <div className="container">

          {/* Back */}
          <div className="back-btn" onClick={() => router.back()}>
            <img src="/assets/img/Back.svg" className="eye" />
          </div>

          {/* Title */}
          <h1 className="title">Enter Dashboard</h1>

          <p className="subtitle">
            {role === 'host'
              ? 'Manage your event & control bidding'
              : 'Join event and start bidding'}
          </p>
          <div className="form-area">
            {/* Email */}
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-box">
                <img src="/assets/img/Email.svg" />
                <input type="email" placeholder="john@example.com" />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <img src="/assets/img/Lock.svg" />
                <input type="password" placeholder="••••••••" />
                <img src="/assets/img/Eye.svg" className="eye" />
              </div>
            </div>

            {/* Forgot */}
            <div className="forgot">
              Forgot Password
            </div>

            {/* Bottom */}


          </div>
          <div className="bottom">

            <button className="login-btn" onClick={handleLogin}>
              Log in
            </button>

            <div
              className="create"
              onClick={() => router.push('/register')}
            >
              Create Account
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
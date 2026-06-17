import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import './ForgotPassword.css';

const imgBase = import.meta.env.VITE_ASSETS_URL;

const ForgotPassword: React.FC = () => {
  const router = useIonRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState(''); // 🔧 TESTING ONLY

  const handleSubmit = async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ email: trimmed })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      // 🔧 TESTING ONLY — backend returns reset_url while APP_DEBUG is on
      if (data?.reset_url) {
        setResetUrl(data.reset_url);
      }

      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="forgot-page">

        <div className="container">

          {/* Back */}
          <div className="back-btn" onClick={() => router.back()}>
            <img src={`${imgBase}/Back.svg`} className="eye" />
          </div>

          {!sent ? (
            <>
              {/* Title */}
              <h1 className="title">Forgot Password</h1>

              <p className="subtitle">
                Enter your registered email and we'll
                <br />
                send you a link to reset your password.
              </p>

              <div className="form-area">
                {/* Email */}
                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-box">
                    <img src={`${imgBase}/Email.svg`} alt="Email"/>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {error && <div className="error-text">{error}</div>}
              </div>

              {/* Bottom */}
              <div className="bottom">
                <button
                  className="login-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>

                <div className="create" onClick={() => router.push('/login')}>
                  Back to Login
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Success */}
              <div className="success-icon">
                <img src={`${imgBase}/Email.svg`} alt="Email" />
              </div>

              <h1 className="title">Check Your Email</h1>

              <p className="subtitle">
                We've sent a password reset link to
                <br />
                <strong>{email.trim()}</strong>
              </p>

              {/* 🔧 TESTING ONLY — remove once email delivery is live */}
              {resetUrl && (
                <div className="test-link">
                  <span className="test-link-label">Dev reset link</span>
                  <a href={resetUrl}>{resetUrl}</a>
                </div>
              )}

              <div className="form-area" />

              {/* Bottom */}
              <div className="bottom">
                <button
                  className="login-btn"
                  onClick={() => router.push('/login')}
                >
                  Back to Login
                </button>

                <div className="create" onClick={() => setSent(false)}>
                  Try another email
                </div>
              </div>
            </>
          )}

        </div>

      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;
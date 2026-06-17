import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './ResetPassword.css';

const imgBase = import.meta.env.VITE_ASSETS_URL;

const ResetPassword: React.FC = () => {
  const router = useIonRouter();
  const location = useLocation();

  // Pull token + email from the reset link.
  // URLSearchParams auto-decodes (e.g. %40 -> @).
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkValid = token !== '' && email !== '';

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: confirm
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const firstError =
          data?.errors && Object.values(data.errors)[0]
            ? (Object.values(data.errors)[0] as string[])[0]
            : null;
        throw new Error(
          firstError ||
            data.message ||
            'This reset link is invalid or has expired.'
        );
      }

      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="reset-page">

        <div className="container">

          {/* Back */}
          <div className="back-btn" onClick={() => router.push('/login')}>
            <img src={`${imgBase}/Back.svg`} className="eye" />
          </div>

          {!linkValid ? (
            <>
              <h1 className="title">Invalid Link</h1>
              <p className="subtitle">
                This password reset link is missing or broken.
                <br />
                Please request a new one.
              </p>

              <div className="form-area" />

              <div className="bottom">
                <button
                  className="login-btn"
                  onClick={() => router.push('/forgot-password')}
                >
                  Request New Link
                </button>
              </div>
            </>
          ) : !done ? (
            <>
              <h1 className="title">Reset Password</h1>

              <p className="subtitle">
                Create a new password for
                <br />
                <strong>{email}</strong>
              </p>

              <div className="form-area">
                {/* New password */}
                <div className="input-group">
                  <label>New Password</label>
                  <div className="input-box">
                    <img src={`${imgBase}/Lock.svg`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <img
                      src={`${imgBase}/Eye.svg`}
                      className="eye toggle"
                      onClick={() => setShowPassword((v) => !v)}
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div className="input-group">
                  <label>Re-enter Password</label>
                  <div className="input-box">
                    <img src={`${imgBase}/Lock.svg`} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                    <img
                      src={`${imgBase}/Eye.svg`}
                      className="eye toggle"
                      onClick={() => setShowConfirm((v) => !v)}
                    />
                  </div>
                </div>

                {error && <div className="error-text">{error}</div>}
              </div>

              <div className="bottom">
                <button
                  className="login-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Updating…' : 'Reset Password'}
                </button>

                <div className="create" onClick={() => router.push('/login')}>
                  Back to Login
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="success-icon">
                <img src={`${imgBase}/Lock.svg`} />
              </div>

              <h1 className="title">Password Updated</h1>

              <p className="subtitle">
                Your password has been reset.
                <br />
                You can now log in with your new password.
              </p>

              <div className="form-area" />

              <div className="bottom">
                <button
                  className="login-btn"
                  onClick={() => router.push('/login', 'root')}
                >
                  Go to Login
                </button>
              </div>
            </>
          )}

        </div>

      </IonContent>
    </IonPage>
  );
};

export default ResetPassword;
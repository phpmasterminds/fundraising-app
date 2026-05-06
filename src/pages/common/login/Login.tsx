import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { login } from '../../../services/auth';
import type { ApiError } from '../../../services/api';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import './Login.css';

const Login: React.FC = () => {
  const router   = useIonRouter();
  const location = useLocation();

  const { checking } = useAuthRedirect();

  // ─── QR flow params ───────────────────────────────────────────────────────
  const params    = new URLSearchParams(location.search);
  const fromQR    = params.get('from') === 'qr';
  const eventCode = params.get('code') ?? '';

  // ─── Form state ───────────────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (checking) return null;

  // ─── Validation ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim())            errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password)                errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Minimum 6 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const { user } = await login({ email, password });

      // If came from QR/code flow → go back to event view
      if (fromQR && eventCode) {
        router.push(`/join-event?code=${eventCode}`, 'root', 'replace');
        return;
      }

      // Normal flow — route by role
      if (user.role === 'host') {
        router.push('/events', 'root', 'replace');
      } else {
        router.push('/devents', 'root', 'replace');
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const mapped: Record<string, string> = {};
        for (const [field, msgs] of Object.entries(apiErr.errors)) {
          mapped[field] = msgs[0];
        }
        setFieldErrors(mapped);
      } else {
        setError(apiErr.message ?? 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="login-page">
        <div className="container">

          {/* Back */}
          <div className="back-btn" onClick={() => router.back()}>
            <img src="/assets/img/Back.svg" alt="back" />
          </div>

          {/* Title */}
          <h1 className="title">Enter Dashboard</h1>
          <p className="subtitle">Sign in to continue</p>

          {/* Global error banner */}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}

          <div className="form-area">

            {/* Email */}
            <div className="input-group">
              <label>Email Address</label>
              <div className={`input-box ${fieldErrors.email ? 'input-error' : ''}`}>
                <img src="/assets/img/Email.svg" alt="" />
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="input-group">
              <label>Password</label>
              <div className={`input-box ${fieldErrors.password ? 'input-error' : ''}`}>
                <img src="/assets/img/Lock.svg" alt="" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <img
                  src="/assets/img/Eye.svg"
                  className="eye"
                  alt="toggle password"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ cursor: 'pointer', opacity: showPw ? 1 : 0.5 }}
                />
              </div>
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>

            {/* Forgot */}
            <div className="forgot" onClick={() => router.push('/forgot-password')}>
              Forgot Password?
            </div>

          </div>

          <div className="bottom">
            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Log in'}
            </button>

            {/* Carry code forward if in QR flow */}
            <div
              className="create"
              onClick={() =>
                fromQR && eventCode
                  ? router.push(`/register?from=qr&code=${eventCode}`)
                  : router.push('/register')
              }
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
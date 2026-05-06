import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { register, getRole, getPendingRole } from '../../../services/auth';
import type { ApiError } from '../../../services/api';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import './Register.css';

const Register: React.FC = () => {
  const router   = useIonRouter();
  const location = useLocation();

  const { checking } = useAuthRedirect();

  // ─── QR flow params ───────────────────────────────────────────────────────
  const params    = new URLSearchParams(location.search);
  const fromQR    = params.get('from') === 'qr';
  const eventCode = params.get('code') ?? '';

  // Determine role: QR always = donor, otherwise from localStorage
  //const role: UserRole = fromQR ? 'donor' : (getRole() as UserRole) ?? 'donor';
  const role: UserRole = fromQR ? 'donor' : (getPendingRole() as UserRole) ?? 'donor';
console.log(role+'--');
  // ─── Form state ───────────────────────────────────────────────────────────
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPw] = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (checking) return null;

  // ─── Validation ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!name.trim())              errs.name     = 'Full name is required';
    if (!email.trim())             errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password)                 errs.password = 'Password is required';
    else if (password.length < 8)  errs.password = 'Minimum 8 characters';
    if (!confirmPassword)          errs.password_confirmation = 'Please confirm your password';
    else if (password !== confirmPassword) errs.password_confirmation = 'Passwords do not match';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }	 
const handleInputChange = (e: any) => {
  const parent = e.target.closest('.input-box');
  if (e.target.value.trim() !== '') {
    parent.classList.add('has-value');
  } else {
    parent.classList.remove('has-value');
  }
}

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: confirmPassword,
        role,
      });

      // If came from QR/code flow → go back to event view with code
      if (fromQR && eventCode) {
        router.push(`/join-event?code=${eventCode}`, 'root', 'replace');
        return;
      }

      // Normal flow
      if (role === 'host') {
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
        setError(apiErr.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen scrollY={true} className="register-page">
        <div className="container">

          {/* Back */}
          <div className="back-btn" onClick={() => router.back()}>
            <img src="/assets/img/Back.svg" alt="back" />
          </div>

          {/* Title */}
          {fromQR ? (
            <>
              <h2 className="title">Join the Event</h2>
              <p className="subtitle">Create an account to start bidding</p>
            </>
          ) : (
            <>
              <h2 className="title">Create Account</h2>
              <p className="subtitle">
                {role === 'host' ? 'Set up your host profile' : 'Join as a donor'}
              </p>
            </>
          )}

          {/* Global error */}
          {error && <div className="error-banner"><span>{error}</span></div>}

          {/* Avatar */}
          <div className="profile">
            <div className="avatar">
              <img src="/assets/img/user.svg" alt="avatar" />
            </div>
            <span>Upload Photo</span>
          </div>

          {/* Form */}
          <div className="form-area">

            {/* Name */}
            <div className="input-group">
              <label>Full Name</label>
              <div className={`input-box ${fieldErrors.name ? 'input-error' : ''}`}>
                <img src="/assets/img/user.svg" alt="" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>

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
                  autoComplete="email"	   onInput={handleInputChange}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {/* Password */}
            <div className="input-group">
              <label>Password</label>
              <div className={`input-box ${fieldErrors.password ? 'input-error' : ''}`}>
                <img src="/assets/img/Lock.svg" alt="" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}	 onInput={handleInputChange}
                />
                <img
                  src="/assets/img/Eye.svg"
                  className="eye"
                  alt="toggle"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ cursor: 'pointer', opacity: showPw ? 1 : 0.5 }}
                />
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="input-group">
              <label>Re-enter Password</label>
              <div className={`input-box ${fieldErrors.password_confirmation ? 'input-error' : ''}`}>
                <img src="/assets/img/Lock.svg" alt="" />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}   onInput={handleInputChange}
                />
                <img
                  src="/assets/img/Eye.svg"
                  className="eye"
                  alt="toggle"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  style={{ cursor: 'pointer', opacity: showConfirmPw ? 1 : 0.5 }}
                />
              </div>
              {fieldErrors.password_confirmation && (
                <span className="field-error">{fieldErrors.password_confirmation}</span>
              )}
            </div>

          </div>

          {/* Bottom */}
          <div className="bottom">
            <button
              className={`primary-btn ${role}`}
              onClick={handleRegister}
              disabled={loading}
            >
              {loading
                ? 'Creating account…'
                : fromQR
                ? 'Enter Events Room'
                : 'Create Account'}
            </button>

            {/* Carry code forward if in QR flow */}
            <div
              className="secondary"
              onClick={() =>
                fromQR && eventCode
                  ? router.push(`/login?from=qr&code=${eventCode}`)
                  : router.push('/login')
              }
            >
              Already have an account? Log in
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
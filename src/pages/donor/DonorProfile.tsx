import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './DonorProfile.css';
import DonorHeader from '../../components/DonorHeader';
import { joinEvent, getDonorEventDetail } from '../../services/donorEvents';
import { updateProfile, changePassword } from '../../services/profileService';
import usePhotoUpload from '../../hooks/usePhotoUpload';

const RANDOM_NAMES = [
  'Brave Panda', 'Silent Fox', 'Cosmic Bear', 'Lucky Tiger',
  'Noble Wolf', 'Swift Eagle', 'Calm Otter', 'Wild Lynx',
];
const imgBase = import.meta.env.VITE_ASSETS_URL;

const DonorProfile: React.FC = () => {

  const router   = useIonRouter();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const isJoin = params.get('mode') === 'join';

  // ── Load from localStorage ────────────────────────
  const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');

  const [fullName,    setFullName]    = useState<string>(storedUser.name      ?? '');
  const [displayName, setDisplayName] = useState<string>(storedUser.pseudonym ?? '');

  // Email is read-only — never editable
  const email = storedUser.email ?? '';

  // ── Photo upload (same as HostProfile) ───────────
  const { preview, uploading, error: uploadError, handleFileChange } = usePhotoUpload(
    ({ url, path }) => {
      localStorage.setItem('donor_avatar_path', path);
      localStorage.setItem('donor_avatar_url',  url);
      // Sync into auth_user so it persists on reload
      const stored = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
      localStorage.setItem('auth_user', JSON.stringify({ ...stored, avatar: path }));
    }
  );

  // Build avatar URL from: fresh upload preview → stored URL → auth_user.avatar path
  const buildStorageUrl = (path: string) => {
    const base = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    return `${base}/storage/${path}`;
  };

  const avatarUrl =
    preview ??
    (storedUser.avatar ? buildStorageUrl(storedUser.avatar) : null);

  // ── Event info (for join subtitle) ───────────────
  const [eventInfo, setEventInfo] = useState<{ title?: string; charity_name?: string } | null>(null);

  useEffect(() => {
    if (!isJoin) return;
    const eventId = Number(localStorage.getItem('event_id'));
    if (!eventId) return;
    getDonorEventDetail(eventId).then(data => setEventInfo(data)).catch(() => {});
  }, [isJoin]);

  // ── Save state ────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk,    setSaveOk]    = useState(false);

  // ── Password modal state ──────────────────────────
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [pwError,     setPwError]     = useState<string | null>(null);
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwSuccess,   setPwSuccess]   = useState(false);

  // ── Email tooltip ─────────────────────────────────
  const [showEmailTip, setShowEmailTip] = useState(false);

const handleEmailInfoClick = () => {
  setShowEmailTip(true);

  window.clearTimeout((window as any).emailTipTimer);

  (window as any).emailTipTimer = window.setTimeout(() => {
    setShowEmailTip(false);
  }, 3000);
};

  const handleRandomName = () => {
    const pick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setDisplayName(pick);
  };

  // ── Save / Join ───────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);

    try {
      await updateProfile({ name: fullName, pseudonym: displayName });

      if (isJoin) {
        const eventId = Number(localStorage.getItem('event_id'));

        // Check event is still live before joining
        if (eventId) {
          const eventData = await getDonorEventDetail(eventId);
          if (eventData.status !== 'live') {
            setSaveError('This event is not live yet. Please wait for the host to start it.');
            setSaving(false);
            return;
          }
        }
        if (eventId && displayName.trim()) {
          try {
            const code = localStorage.getItem('event_code') ?? '';
            await joinEvent(eventId, code, displayName.trim());
          } catch {
            // already joined — continue
          }
        }
        router.push(`/bid?id=${eventId}`, 'root');
      } else {
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 2500);
      }
    } catch (err: any) {
      setSaveError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // ── Sign out ──────────────────────────────────────
  const handleSignOut = () => {
    localStorage.clear();
    router.push('/join', 'root');
  };

  // ── Password modal ────────────────────────────────
  const openPwModal = () => {
    setShowPwModal(true);
    setPwError(null);
    setPwSuccess(false);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  const handlePasswordChange = async () => {
    setPwError(null);
    if (!currentPw || !newPw || !confirmPw) { setPwError('Please fill in all fields.'); return; }
    if (newPw !== confirmPw)                { setPwError('New passwords do not match.'); return; }
    if (newPw.length < 8)                  { setPwError('Minimum 8 characters.'); return; }

    setPwSaving(true);
    try {
      await changePassword({
        current_password:      currentPw,
        password:              newPw,
        password_confirmation: confirmPw,
      });
      setPwSuccess(true);
      setTimeout(() => setShowPwModal(false), 1500);
    } catch (err: any) {
      setPwError(err.message ?? 'Something went wrong');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="profile-page">

        <div className="container">

          {/* ── Header ── */}
          <DonorHeader
            variant="back"
            title={!isJoin ? 'Donor Profile' : undefined}
            rightSlot={!isJoin ? <span className="logout">Sign Out</span> : undefined}
            onRightSlotClick={!isJoin ? handleSignOut : undefined}
            onBack={() => router.back()}
          />

          {/* Subtitle (JOIN ONLY) */}
          {isJoin && (
            <>
              <h2 className="title">Join the Event</h2>
              <p className="subtitle">
                {eventInfo
                  ? `${eventInfo.name ?? ''} by ${eventInfo.charity_name ?? ''}`.trim()
                  : 'Loading event…'}
              </p>
            </>
          )}

          {/* ── Avatar — same pattern as HostProfile ── */}
          <div className="profile">
            <label htmlFor="dp-file">
              <div className="avatar">
                {avatarUrl
                  ? <img src={avatarUrl} className="preview" alt="avatar" />
                  : <img src={`${imgBase}/user.svg`} alt="User" />
                }
              </div>
            </label>

            <input
              type="file"
              id="dp-file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
            />

            <label htmlFor="dp-file" className="upload-holder">
              <span  className="upload">
                {uploading ? 'Uploading…' : 'Upload Photo'}
              </span>
              <div className="optional">
                {uploadError ?? 'Tap to change · JPG, PNG, WEBP'}
              </div>
            </label>
          </div>

          {/* ── Form ── */}
          <div className="form">

            {/* Full Name */}
            <div className="input-group">
              <label>Your Full Name</label>
              <div className="input-box">
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <small>Only the host sees your real identity.</small>
            </div>

            {/* Email — read only */}
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-box input-box--readonly">
                <input value={email} readOnly />
                <div className="email-tip-wrap">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                  onClick={handleEmailInfoClick}
                    style={{ cursor: 'default', flexShrink: 0 }}
                  >
                    <path
                      d="M12 17V11M12 7H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                      stroke="#BDBDBD" strokeWidth="1.8" strokeLinecap="round"
                    />
                  </svg>
                  {showEmailTip && (
                    <div className="email-tooltip">Email cannot be changed.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div className="input-group">
              <label>Your Display Name</label>
              <div className="input-box">
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Brave Panda"
                />
              </div>
            </div>

            {isJoin && (
              <>
                <div className="random" onClick={handleRandomName}>
                  Give me a random name
                </div>
                <small className="center">
                  This is how other donors will see you.
                </small>
              </>
            )}

            {/* Password — only outside join mode */}
            {!isJoin && (
				<div className="input-group">
				  <label className="hp-label">Password</label>
				  <div className="hp-input-box hp-input-box--action" onClick={openPwModal}>
					<span className="hp-pw-dots">••••••••</span>
					<span className="hp-change-pw">Change</span>
				  </div>
				</div>
            )}

            {saveError && <p className="msg msg--error">{saveError}</p>}
            {saveOk    && <p className="msg msg--ok">Profile saved!</p>}

          </div>

        </div>

        {/* ── Bottom ── */}
        <div className="bottom">
          <button
            className={`btn ${isJoin ? 'join' : 'save'}`}
            onClick={handleSubmit}
            disabled={uploading || saving}
          >
            {isJoin
              ? (saving ? 'Joining…'  : 'Enter Events Room')
              : (saving ? 'Saving…'   : 'Save')
            }
          </button>
        </div>

        {/* ── Password Modal ── */}
        {showPwModal && (
          <div className="pw-modal-overlay" onClick={() => setShowPwModal(false)}>
            <div className="pw-modal" onClick={e => e.stopPropagation()}>

              <div className="pw-modal-handle" />
              <h3 className="pw-modal-title">Change Password</h3>

              {[
                { label: 'Current Password', val: currentPw, set: setCurrentPw },
                { label: 'New Password',     val: newPw,     set: setNewPw     },
                { label: 'Confirm Password', val: confirmPw, set: setConfirmPw },
              ].map(({ label, val, set }) => (
                <div key={label} className="input-group">
                  <label>{label}</label>
                  <div className="input-box">
                    <input
                      type="password"
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              ))}

              {pwError   && <p className="msg msg--error">{pwError}</p>}
              {pwSuccess && <p className="msg msg--ok">Password updated!</p>}

              <button
                className="btn save"
                onClick={handlePasswordChange}
                disabled={pwSaving}
              >
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>

            </div>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default DonorProfile;
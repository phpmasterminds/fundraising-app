import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import './HostProfile.css';
import HostHeader from '../../components/HostHeader';
import usePhotoUpload from '../../hooks/usePhotoUpload';
import { updateProfile, changePassword } from '../../services/profileService';

const HostProfile: React.FC = () => {
  const router = useIonRouter();

  // ── Read auth_user from localStorage once on mount ────
  const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');

  // Editable fields
  const [name,        setName]        = useState<string>(storedUser.name       ?? '');
  const [displayName, setDisplayName] = useState<string>(storedUser.pseudonym  ?? '');

  // Read-only
  const email = storedUser.email ?? '';

  // ── Save state ────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk,    setSaveOk]    = useState(false);

  // ── Password modal state ──────────────────────────────
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [pwError,     setPwError]     = useState<string | null>(null);
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwSuccess,   setPwSuccess]   = useState(false);

  // ── Photo upload ──────────────────────────────────────
  const { preview, uploading, error: uploadError, handleFileChange } = usePhotoUpload(
    ({ url, path }) => {
      localStorage.setItem('host_avatar_path', path);
      localStorage.setItem('host_avatar_url',  url);
    }
  );

  // Build avatar URL from auth_user.avatar (e.g. "avatars/1/Eof…")
  // falling back to a separately stored URL, then to the fresh upload preview
  const buildStorageUrl = (path: string) => {
    const base = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    return `${base}/storage/${path}`;
  };

  const avatarUrl =
    preview ??
    (storedUser.avatar ? buildStorageUrl(storedUser.avatar) : null);

  // ── Sign out ──────────────────────────────────────────
  const handleSignOut = () => {
    localStorage.clear();
    router.push('/join', 'root');
  };

  // ── Save profile ──────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await updateProfile({ name, pseudonym: displayName });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (err: any) {
      setSaveError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────
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
        current_password: currentPw,
        password: newPw,
        password_confirmation: confirmPw,
      });
      setPwSuccess(true);
      setTimeout(() => { setShowPwModal(false); }, 1500);
    } catch (err: any) {
      setPwError(err.message ?? 'Something went wrong');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="hp-page">

        <div className="hp-container">

          {/* ── Header ── */}
          <HostHeader
            variant="back"
            title="Host Profile"
            onBack={() => router.back()}
            rightSlot={
              <span className="hp-signout" onClick={handleSignOut}>
                Sign Out
              </span>
            }
          />

          {/* ── Avatar Row ── */}
          <div className="hp-avatar-row">
            <label htmlFor="hp-file" className="hp-avatar-wrap">
              <div className="hp-avatar-circle">
                {avatarUrl
                  ? <img src={avatarUrl} className="hp-avatar-img" alt="avatar" />
                  : (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.06 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.06 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z"
                        stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  )
                }
              </div>
            </label>

            <input
              type="file"
              id="hp-file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
            />

            <div className="hp-avatar-info">
              <span className="hp-avatar-title">
                {uploading ? 'Uploading…' : 'Profile Photo'}
              </span>
              <span className="hp-avatar-sub">
                {uploadError ?? 'Tap to change · JPG, PNG, WEBP'}
              </span>
            </div>
          </div>

          {/* ── Stats Card ── */}
          <div className="hp-stats">
            <div className="hp-stat">
              <span className="hp-stat-num">12</span>
              <span className="hp-stat-label">Events</span>
            </div>
            <div className="hp-stat-divider" />
            <div className="hp-stat">
              <span className="hp-stat-num">£48,200</span>
              <span className="hp-stat-label">Total Raised</span>
            </div>
            <div className="hp-stat-divider" />
            <div className="hp-stat">
              <span className="hp-stat-num">340</span>
              <span className="hp-stat-label">Donors</span>
            </div>
          </div>

          {/* ── Form ── */}
          <div className="hp-form">

            {/* Full Name */}
            <div className="hp-field">
              <label className="hp-label">Full Name</label>
              <div className="hp-input-box">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email — read only */}
            <div className="hp-field">
              <label className="hp-label">Email Address</label>
              <div className="hp-input-box hp-input-box--readonly">
                <input value={email} readOnly />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 17V11M12 7H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                    stroke="#BDBDBD" strokeWidth="1.8" strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="hp-hint">Email cannot be changed.</span>
            </div>

            {/* Display Name */}
            <div className="hp-field">
              <label className="hp-label">Display Name</label>
              <div className="hp-input-box">
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Ocean Initiative"
                />
              </div>
            </div>

            {/* Password */}
            <div className="hp-field">
              <label className="hp-label">Password</label>
              <div className="hp-input-box hp-input-box--action" onClick={openPwModal}>
                <span className="hp-pw-dots">••••••••</span>
                <span className="hp-change-pw">Change</span>
              </div>
            </div>

            {saveError && <p className="hp-msg hp-msg--error">{saveError}</p>}
            {saveOk    && <p className="hp-msg hp-msg--ok">Profile saved!</p>}

          </div>
        </div>

        {/* ── Bottom Save Button ── */}
        <div className="hp-bottom">
          <button
            className="hp-save-btn"
            onClick={handleSave}
            disabled={uploading || saving}
          >
            {saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save Changes'}
          </button>
        </div>

        {/* ── Password Modal ── */}
        {showPwModal && (
          <div className="hp-modal-overlay" onClick={() => setShowPwModal(false)}>
            <div className="hp-modal" onClick={e => e.stopPropagation()}>

              <div className="hp-modal-handle" />
              <h3 className="hp-modal-title">Change Password</h3>

              {[
                { label: 'Current Password', val: currentPw, set: setCurrentPw },
                { label: 'New Password',     val: newPw,     set: setNewPw     },
                { label: 'Confirm Password', val: confirmPw, set: setConfirmPw },
              ].map(({ label, val, set }) => (
                <div key={label} className="hp-field">
                  <label className="hp-label">{label}</label>
                  <div className="hp-input-box">
                    <input
                      type="password"
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              ))}

              {pwError   && <p className="hp-msg hp-msg--error">{pwError}</p>}
              {pwSuccess && <p className="hp-msg hp-msg--ok">Password updated!</p>}

              <button
                className="hp-save-btn"
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

export default HostProfile;
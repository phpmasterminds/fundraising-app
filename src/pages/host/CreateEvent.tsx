import {
  IonPage,
  IonContent,
  IonModal,
  IonDatetime
} from '@ionic/react';
import { useState } from 'react';
import { useIonRouter } from '@ionic/react';
import './CreateEvent.css';
import HostHeader from '../../components/HostHeader';
import { createEvent } from '../../services/events';
import type { ApiError } from '../../services/api';

const CreateEvent: React.FC = () => {

  const router = useIonRouter();

  // ─── Logo (avatar) ────────────────────────────────────────────────────────
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [imageFiles, setImageFiles]   = useState<File[]>([]);

  // ─── Date / time picker ───────────────────────────────────────────────────
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [date, setDate]         = useState('');  // DD-MM-YYYY display
  const [time, setTime]         = useState('');  // HH:MM display
  const [rawDate, setRawDate]   = useState('');  // YYYY-MM-DD for backend
  const [rawTime, setRawTime]   = useState('');  // HH:MM for backend

  // ─── Form fields ──────────────────────────────────────────────────────────
  const [name, setName]                 = useState('');
  const [charityName, setCharityName]   = useState('');
  const [description, setDescription]   = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [roundsCount, setRoundsCount]   = useState(2);
  const [groupSize, setGroupSize]       = useState(4);
  const [charityLink, setCharityLink]   = useState('');

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 10) {
      setFieldErrors(prev => ({ ...prev, images: 'Maximum 10 images allowed' }));
      return;
    }
    setImageFiles(files);
    setFieldErrors(prev => ({ ...prev, images: '' }));
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim())        errs.name          = 'Event name is required';
    if (!charityName.trim()) errs.charity_name  = 'Institution name is required';
    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) < 1)
                             errs.target_amount = 'Enter a valid target amount';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setError(null);
    if (!validate()) return;

    // Combine date + time into started_at timestamp
    // Both rawDate (YYYY-MM-DD) and rawTime (HH:MM) are parsed directly
    // from ISO strings — no timezone shift
    const startedAt = rawDate && rawTime
      ? `${rawDate} ${rawTime}:00`
      : rawDate
      ? `${rawDate} 00:00:00`
      : undefined;

    setLoading(true);
    try {
      await createEvent({
        name,
        charity_name:  charityName,
        description:   description || undefined,
        target_amount: Number(targetAmount),
        rounds_count:  roundsCount,
        group_size:    groupSize,
        started_at:    startedAt,
        charity_link:  charityLink || undefined,
        logo:          logoFile,
        images:        imageFiles.length ? imageFiles : undefined,
      });

      window.location.href = '/events';
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const mapped: Record<string, string> = {};
        for (const [field, msgs] of Object.entries(apiErr.errors)) {
          mapped[field] = msgs[0];
        }
        setFieldErrors(mapped);
      } else {
        setError(apiErr.message ?? 'Failed to create event. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="create-page">

        <div className="container">

          {/* ── Shared Header ── */}
          <HostHeader
            variant="back"
            title="Create Event"
            onBack={() => router.back()}
          />

          {/* Global error */}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}

          {/* Avatar */}
          <div className="avatar-section">
            <label className="avatar-circle">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" />
              ) : (
                <img src="/assets/img/avatar.svg" alt="logo" />
              )}
              <input type="file" hidden accept="image/*" onChange={handleLogo} />
            </label>
            <span>Choose Event Avatar</span>
          </div>

          {/* Title */}
          <label>Title</label>
          <input
            placeholder="Event Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}

          {/* Institution */}
          <label>Fund Raiser Institution</label>
          <input
            placeholder="Institution Name"
            value={charityName}
            onChange={(e) => setCharityName(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.charity_name && <span className="field-error">{fieldErrors.charity_name}</span>}

          {/* Description */}
          <label>Description (optional)</label>
          <textarea
            placeholder="Tell donors about this event..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '25px',
              border: 'none',
              background: '#F5F6F8',
              marginTop: '6px',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'none'
            }}
          />

          {/* Target Amount */}
          <label>Target Amount</label>
          <input
            type="number"
            placeholder="e.g. 5000"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            disabled={loading}
            min={1}
          />
          {fieldErrors.target_amount && <span className="field-error">{fieldErrors.target_amount}</span>}

          {/* Date & Time */}
          <div className="row">

            {/* DATE */}
            <div className="col">
              <label>Start Date</label>
              <div className="fake-input" onClick={() => setShowDate(true)}>
                {date || 'DD-MM-YYYY'}
                <img src="/assets/img/calendar.svg" alt="" />
              </div>
            </div>

            {/* TIME */}
            <div className="col">
              <label>Start Time</label>
              <div className="fake-input" onClick={() => setShowTime(true)}>
                {time || 'HH:MM'}
                <img src="/assets/img/clock.svg" alt="" />
              </div>
            </div>

          </div>

          {/* Rounds */}
          <label>Round</label>
          <div className="round-box">
            <button onClick={() => setRoundsCount(prev => Math.max(1, prev - 1))} disabled={loading}>
              <img src="/assets/img/minus.svg" alt="-" />
            </button>
            <span>{roundsCount}</span>
            <button className="plus" onClick={() => setRoundsCount(prev => Math.min(10, prev + 1))} disabled={loading}>
              <img src="/assets/img/plus.svg" alt="+" />
            </button>
          </div>

          {/* Group Size */}
          <label>Group Size</label>
          <div className="round-box">
            <button onClick={() => setGroupSize(prev => Math.max(2, prev - 1))} disabled={loading}>
              <img src="/assets/img/minus.svg" alt="-" />
            </button>
            <span>{groupSize}</span>
            <button className="plus" onClick={() => setGroupSize(prev => Math.min(10, prev + 1))} disabled={loading}>
              <img src="/assets/img/plus.svg" alt="+" />
            </button>
          </div>

          {/* Upload */}
          <label>Images</label>
          <label className="upload-box">
            <img src="/assets/img/upload.svg" alt="" />
            <p>Upload {imageFiles.length > 0 ? `(${imageFiles.length} selected)` : ''}</p>
            <small>Max 10 Images</small>
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={handleImages}
            />
          </label>
          {fieldErrors.images && <span className="field-error">{fieldErrors.images}</span>}

          {/* Payment */}
          <label>Charity payment link</label>
          <input
            placeholder="https://..."
            value={charityLink}
            onChange={(e) => setCharityLink(e.target.value)}
            disabled={loading}
          />

          {/* Buttons */}
          <button
            className="create-btn"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>

          <div className="cancel" onClick={() => !loading && router.back()}>
            Cancel
          </div>

        </div>

        {/* ── DATE MODAL ── */}
        <IonModal
          isOpen={showDate}
          onDidDismiss={() => setShowDate(false)}
          keepContentsMounted={true}
        >
          <div className="picker-header">
            <span onClick={() => setShowDate(false)}>←</span>
            <h3>Select Date</h3>
          </div>
          <IonDatetime
            presentation="date"
            onIonChange={(e) => {
              const val = e.detail.value as string;
              if (!val) return;

              // Parse date directly from ISO string — no timezone shift
              const datePart = val.split('T')[0]; // "YYYY-MM-DD"
              const [yyyy, mm, dd] = datePart.split('-');

              setRawDate(datePart);               // YYYY-MM-DD → sent to backend
              setDate(`${dd}-${mm}-${yyyy}`);     // DD-MM-YYYY → display only
            }}
          />
          <div style={{ padding: '0 16px 32px' }}>
            <button
              className="create-btn"
              onClick={() => setShowDate(false)}
            >
              Confirm
            </button>
          </div>
        </IonModal>

        {/* ── TIME MODAL ── */}
        <IonModal
          isOpen={showTime}
          onDidDismiss={() => setShowTime(false)}
          keepContentsMounted={true}
        >
          <div className="picker-header">
            <span onClick={() => setShowTime(false)}>←</span>
            <h3>Select Time</h3>
          </div>
          <IonDatetime
            presentation="time"
            onIonChange={(e) => {
              const val = e.detail.value as string;
              if (!val) return;

              // Parse HH:MM directly from ISO string — no timezone shift
              const timePart = val.includes('T') ? val.split('T')[1] : val;
              const [hh, mm] = timePart.split(':');

              setRawTime(`${hh}:${mm}`);          // HH:MM → used in startedAt
              setTime(`${hh}:${mm}`);             // HH:MM → display
            }}
          />
          <div style={{ padding: '0 16px 32px' }}>
            <button
              className="create-btn"
              onClick={() => setShowTime(false)}
            >
              Confirm
            </button>
          </div>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default CreateEvent;
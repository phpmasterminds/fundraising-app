import {
  IonPage,
  IonContent,
  IonModal,
  IonDatetime
} from '@ionic/react';
import { useState, useMemo } from 'react';
import { useIonRouter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './CreateEvent.css';
import HostHeader from '../../components/HostHeader';
import { createEvent } from '../../services/events';
import type { ApiError } from '../../services/api';

const imgBase = import.meta.env.VITE_ASSETS_URL;

// Returns current date/time in London timezone
const getLondonNow = () => {
  const now = new Date();
  const londonStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London' });
  // en-GB format: "DD/MM/YYYY, HH:MM:SS"
  const [datePart, timePart] = londonStr.split(', ');
  const [dd, mm, yyyy] = datePart.split('/');
  const [hh, mins] = timePart.split(':');
  return {
    dateISO: `${yyyy}-${mm}-${dd}`,
    hours: parseInt(hh),
    minutes: parseInt(mins),
    totalMins: parseInt(hh) * 60 + parseInt(mins),
  };
};

const CreateEvent: React.FC = () => {

  const router = useIonRouter();
  const history = useHistory();

  // ─── Logo (avatar) ────────────────────────────────────────────────────────
  const [logoFile, setLogoFile]           = useState<File | null>(null);
  const [logoPreview, setLogoPreview]     = useState<string | null>(null);
  const [imageFiles, setImageFiles]       = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // ─── Date / time / duration ───────────────────────────────────────────────
  const [showDate, setShowDate]         = useState(false);
  const [showTime, setShowTime]         = useState(false);
  const [date, setDate]                 = useState('');   // DD-MM-YYYY display
  const [time, setTime]                 = useState('');   // HH:MM display
  const [rawDate, setRawDate]           = useState('');   // YYYY-MM-DD for backend
  const [rawTime, setRawTime]           = useState('');   // HH:MM for backend
  const [durationMins, setDurationMins] = useState(5);   // round duration, min 5 min
  const [roundTimeMins, setRoundTimeMins] = useState(2); // wait between rounds, 0 = manual

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

  // ─── Create button active when required fields are filled ─────────────────
  const isReady = useMemo(() =>
    name.trim() !== '' &&
    charityName.trim() !== '' &&
    targetAmount !== '' &&
    !isNaN(Number(targetAmount)) &&
    Number(targetAmount) >= 1,
    [name, charityName, targetAmount]
  );

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatMins = (mins: number) => {
    if (mins === 0) return 'Manual';
    if (mins < 60) return `${String(mins).padStart(2, '0')}:00`;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
		 // Allow only images
		if (!file.type.startsWith('image/')) {
		  setFieldErrors(prev => ({
			...prev,
			logo: 'Please upload a valid image (JPG, PNG, WEBP)'
		  }));
		  e.target.value = '';
		  return;
		}
      if (file.size > 2 * 1024 * 1024) {
        setFieldErrors(prev => ({ ...prev, logo: 'Avatar must be under 2MB' }));
        e.target.value = '';
        return;
      }
      setFieldErrors(prev => ({ ...prev, logo: '' }));
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const combined = [...imageFiles, ...files];
    if (combined.length > 10) {
      setFieldErrors(prev => ({ ...prev, images: 'Maximum 10 images allowed' }));
      return;
    }
    const oversized = files.some(f => f.size > 2 * 1024 * 1024);
    if (oversized) {
      setFieldErrors(prev => ({ ...prev, images: 'Each image must be under 2MB' }));
      e.target.value = '';
      return;
    }
    const totalSize = combined.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 8 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, images: 'Total upload size must be under 8MB' }));
      e.target.value = '';
      return;
    }
    const previews = files.map(f => URL.createObjectURL(f));
    setImageFiles(combined);
    setImagePreviews(prev => [...prev, ...previews]);
    setFieldErrors(prev => ({ ...prev, images: '' }));
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
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
        duration: (() => {
          const h = String(Math.floor(durationMins / 60)).padStart(2, '0');
          const m = String(durationMins % 60).padStart(2, '0');
          return `${h}:${m}`;
        })(),
        round_time:    roundTimeMins * 60,  // convert minutes → seconds
        charity_link:  charityLink || undefined,
        logo:          logoFile,
        images:        imageFiles.length ? imageFiles : undefined,
      });

      history.replace('/events');
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

  <label
    className="avatar-upload-wrapper"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer'
    }}
  >

    <div className="avatar-circle">
      {logoPreview ? (
        <img src={logoPreview} alt="logo" />
      ) : (
        <img src={`${imgBase}/avatar.svg`} alt="avatar" />
      )}
    </div>

    <span
      style={{
        color: '#18A0A6',
        fontWeight: 500
      }}
    >
      Choose Event Avatar
	  {fieldErrors.logo && <span className="field-error">{fieldErrors.logo}</span>}
    </span>
	

    <input
      type="file"
      hidden
      accept="image/*"
      onChange={handleLogo}
    />

  </label>

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
              resize: 'none',
              boxSizing: 'border-box',
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
{/* Date & Time */}
<div className="row">

  {/* DATE */}
  <div className="col">
    <label>Start Date</label>

    <div className="fake-input premium-picker">

      <span
        style={{
          color: rawDate ? '#25201D' : '#ccc'
        }}
      >
        {date || 'DD-MM-YYYY'}
      </span>

      <img
        src={`${imgBase}/calendar.svg`}
        alt="calendar"
      />

      <input
        type="date"
        className="hidden-date-input"
        min={getLondonNow().dateISO}
        value={rawDate}
        onChange={(e) => {

          const selectedDate = e.target.value;

          if (!selectedDate) return;

          setRawDate(selectedDate);

          const [yyyy, mm, dd] =
            selectedDate.split('-');

          setDate(`${dd}-${mm}-${yyyy}`);

          // reset time when date changes
          setRawTime('');
          setTime('');
        }}
      />
    </div>
  </div>

  {/* TIME */}
  <div className="col">
    <label>Start Time</label>

    <div
      className={`fake-input premium-picker ${
        !rawDate ? 'disabled-picker' : ''
      }`}
    >

      <span
        style={{
          color: rawTime ? '#25201D' : '#ccc'
        }}
      >
        {time || 'HH:MM'}
      </span>

      <img
        src={`${imgBase}/clock.svg`}
        alt="clock"
      />

      <input
        type="time"
        className="hidden-date-input"
        step="300"
        disabled={!rawDate}
        value={rawTime}
        min={
          rawDate === getLondonNow().dateISO
            ? (() => {
                const london = getLondonNow();
                const totalMins = london.totalMins + 5;
                const h = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
                const m = String(totalMins % 60).padStart(2, '0');
                return `${h}:${m}`;
              })()
            : undefined
        }
        onChange={(e) => {

          const selectedTime =
            e.target.value;

          if (!selectedTime) return;

          // prevent past time for today
          if (
            rawDate === getLondonNow().dateISO
          ) {

            const london = getLondonNow();

            const currentTotal = london.totalMins;

            const [hh, mm] =
              selectedTime.split(':');

            const selectedTotal =
              parseInt(hh) * 60 +
              parseInt(mm);

            if (
              selectedTotal <= currentTotal
            ) {
              return;
            }
          }

          setRawTime(selectedTime);
          setTime(selectedTime);
        }}
      />
    </div>
  </div>
</div>

          {/* Duration — how long each round lasts, stepper in 5-min increments */}
          <label>Round Duration</label>
          <div className="round-box">
            <button
              onClick={() => setDurationMins(prev => Math.max(5, prev - 5))}
              disabled={loading || durationMins <= 5}
            >
              <img src={`${imgBase}/minus.svg`} alt="-" />
            </button>
            <span>
              {durationMins < 60
                ? `${String(durationMins).padStart(2, '0')}:00`
                : `${String(Math.floor(durationMins / 60)).padStart(2, '0')}:${String(durationMins % 60).padStart(2, '0')}`
              }
            </span>
            <button
              className="plus"
              onClick={() => setDurationMins(prev => Math.min(2880, prev + 5))}
              disabled={loading}
            >
              <img src={`${imgBase}/plus.svg`} alt="+" />
            </button>
          </div>

          {/* Wait Time Between Rounds — 0 = Manual (host launches next round) */}
          <label>Wait Time Between Rounds</label>
          <div className="round-box">
            <button
              onClick={() => setRoundTimeMins(prev => Math.max(0, prev - 1))}
              disabled={loading || roundTimeMins <= 0}
            >
              <img src={`${imgBase}/minus.svg`} alt="-" />
            </button>
            <span style={{ color: roundTimeMins === 0 ? '#9AA0A6' : '#25201D' }}>
              {formatMins(roundTimeMins)}
            </span>
            <button
              className="plus"
              onClick={() => setRoundTimeMins(prev => Math.min(60, prev + 1))}
              disabled={loading}
            >
              <img src={`${imgBase}/plus.svg`} alt="+" />
            </button>
          </div>
          <small style={{ color: '#9AA0A6', fontSize: 12, marginTop: 4, display: 'block' }}>
            {roundTimeMins === 0
              ? 'You will launch each round manually.'
              : `Next round auto-starts ${roundTimeMins} min after the previous round ends.`}
          </small>

          {/* Round & Group Size — side by side */}
          <div className="row gap-20">
            <div className="col">
              <label>Round</label>
              <div className="round-box">
                <button onClick={() => setRoundsCount(prev => Math.max(1, prev - 1))} disabled={loading}>
                  <img src={`${imgBase}/minus.svg`} alt="-" />
                </button>
                <span>{roundsCount}</span>
                <button className="plus" onClick={() => setRoundsCount(prev => Math.min(10, prev + 1))} disabled={loading}>
                  <img src={`${imgBase}/plus.svg`} alt="+" />
                </button>
              </div>
            </div>
            <div className="col">
              <label>No. of people in group</label>
              <div className="round-box">
                <button onClick={() => setGroupSize(prev => Math.max(2, prev - 1))} disabled={loading}>
                  <img src={`${imgBase}/minus.svg`} alt="-" />
                </button>
                <span>{groupSize}</span>
                <button className="plus" onClick={() => setGroupSize(prev => Math.min(25, prev + 1))} disabled={loading}>
                  <img src={`${imgBase}/plus.svg`} alt="+" />
                </button>
              </div>
            </div>
          </div>

          {/* Images */}
          <label>Images</label>

          {imagePreviews.length === 0 ? (
            /* ── Empty: original upload box ── */
            <label className="upload-box">
              <img src={`${imgBase}/upload.svg`} alt="upload" />
              <p>Upload</p>
              <small>Max 10 Images · 2MB per image · 8MB total</small>
              <input type="file" hidden multiple accept="image/*" onChange={handleImages} />
            </label>
          ) : (
            /* ── Filled: thumbnail row ── */
            <div className="image-preview-grid">
         {imagePreviews.map((src, i) => (
    <div key={i} className="image-preview-thumb">
      <img src={src} alt={`img-${i}`} />

      <button
        type="button"
        className="image-preview-remove"
        onClick={() => removeImage(i)}
      >
        ✕
      </button>
    </div>
  ))}
               {imagePreviews.length < 10 && (
    <label className="image-preview-add">
      <input
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={handleImages}
      />

      <img
	  className='addimg'
        src={`${imgBase}/upload.svg`}
        alt="upload"
        style={{ width: 20, height: 20, }}
      />

      <span>Add</span>
    </label>
  )}
            </div>
          )}
          {fieldErrors.images && <span className="field-error">{fieldErrors.images}</span>}

          {/* Payment */}
          <label>Charity payment link</label>
          <input
            placeholder="https://..."
            value={charityLink}
            onChange={(e) => setCharityLink(e.target.value)}
            disabled={loading}
          />

          {/* Create Button */}
          <button
            className={`create-btn${isReady ? ' create-btn--active' : ''}`}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>

          <div className="cancel" onClick={() => !loading && router.back()}>
            Cancel
          </div>

        </div>

<IonModal
  isOpen={showDate}
  onDidDismiss={() => setShowDate(false)}
  className="premium-date-modal"
  backdropDismiss={true}
>
  <div className="modern-picker-header">
    <button onClick={() => setShowDate(false)}>Cancel</button>
    <h3>Select Date</h3>
    <button onClick={() => setShowDate(false)}>Done</button>
  </div>

<IonDatetime
  presentation="date"
  preferWheel={true}
  showDefaultButtons={false}
  min={getLondonNow().dateISO}
  value={rawDate}
  onIonChange={(e) => {

    const val = e.detail.value as string;

    if (!val) return;

    const datePart = val.split('T')[0];

    const [yyyy, mm, dd] = datePart.split('-');

    setRawDate(datePart);
    setDate(`${dd}-${mm}-${yyyy}`);
  }}
/>
</IonModal>


<IonModal
  isOpen={showTime}
  onDidDismiss={() => setShowTime(false)}
  className="premium-date-modal"
  backdropDismiss={true}
>
  <div className="modern-picker-header">
    <button onClick={() => setShowTime(false)}>Cancel</button>
    <h3>Select Time</h3>
    <button onClick={() => setShowTime(false)}>Done</button>
  </div>

 <IonDatetime
  presentation="time"
  preferWheel={true}
  showDefaultButtons={false}
  minuteValues="0,5,10,15,20,25,30,35,40,45,50,55"
  value={rawTime}
  min={
    rawDate === getLondonNow().dateISO
      ? (() => {
          const london = getLondonNow();
          const h = String(london.hours).padStart(2, '0');
          const m = String(london.minutes).padStart(2, '0');
          return `${getLondonNow().dateISO}T${h}:${m}:00`;
        })()
      : undefined
  }
  onIonChange={(e) => {

    const val = e.detail.value as string;

    if (!val) return;

    const timePart = val.includes('T')
      ? val.split('T')[1]
      : val;

    const [hh, mm] = timePart.split(':');

    const selectedTime = `${hh}:${mm}`;

    // If selected date is today (London),
    // block past time
    if (rawDate === getLondonNow().dateISO) {

      const london = getLondonNow();

      const selectedTotal =
        parseInt(hh) * 60 + parseInt(mm);

      // Prevent selecting elapsed time
      if (selectedTotal <= london.totalMins) {

        setRawTime('');
        setTime('');

        return;
      }
    }

    setRawTime(selectedTime);
    setTime(selectedTime);
  }}
/>
</IonModal>

      </IonContent>
    </IonPage>
  );
};

export default CreateEvent;
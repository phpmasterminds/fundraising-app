import {
  IonPage,
  IonContent,
  IonModal,
  IonDatetime
} from '@ionic/react';
import { useState } from 'react';
import { useIonRouter } from '@ionic/react';
import './CreateEvent.css';

const CreateEvent: React.FC = () => {

  const router = useIonRouter();

  const [round, setRound] = useState(2);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Avatar preview
  const handleAvatar = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
    }
  };

  
  return (
    <IonPage>
      <IonContent fullscreen className="create-page">

        <div className="container">

          {/* Header */}
          <div className="header">
            <div className="dback-btn" onClick={() => router.back()}>
              <img src="/assets/img/Back.svg" />
            </div>
            <div className="header-title">Create Event</div>
          </div>

          {/* Avatar */}
          <div className="avatar-section">
            <label className="avatar-circle">
              {avatar ? (
                <img src={avatar} />
              ) : (
                <img src="/assets/img/avatar.svg" />
              )}
              <input type="file" hidden onChange={handleAvatar} />
            </label>
            <span>Choose Event Avatar</span>
          </div>

          {/* Title */}
          <label>Title</label>
          <input placeholder="Event Title" />

          {/* Institution */}
          <label>Fund Riser Institution</label>
          <input placeholder="Institution Name" />

          {/* Date & Time */}
          <div className="row">

            {/* DATE */}
            <div className="col">
              <label>Start Date</label>
              <div className="fake-input" onClick={() => setShowDate(true)}>
                {date || 'DD-MM-YYYY'}
                <img src="/assets/img/calendar.svg" />
              </div>
            </div>

            {/* TIME */}
            <div className="col">
              <label>Start Time</label>
              <div className="fake-input" onClick={() => setShowTime(true)}>
                {time || 'HH:MM'}
                <img src="/assets/img/clock.svg" />
              </div>
            </div>

          </div>

          {/* Round */}
          <label>Round</label>
          <div className="round-box">

            <button
              onClick={() => setRound(prev => prev > 1 ? prev - 1 : 1)}
            >
             <img src="/assets/img/minus.svg" />
            </button>

            <span>{round}</span>

            <button
              className="plus"
              onClick={() => setRound(prev => prev + 1)}
            >
              <img src="/assets/img/plus.svg" />
            </button>

          </div>

          {/* Upload */}
          <label>Images</label>
          <label className="upload-box">
            <img src="/assets/img/upload.svg" />
            <p>Upload</p>
            <small>Max 10 Images</small>
            <input type="file" hidden multiple />
          </label>

          {/* Payment */}
          <label>Charity payment link</label>
          <input />

          {/* Buttons */}
          <button className="create-btn">Create</button>
          <div className="cancel" onClick={() => router.goBack()}>
            Cancel
          </div>

        </div>

        {/* DATE MODAL */}
        <IonModal isOpen={showDate} onDidDismiss={() => setShowDate(false)}>
          <div className="picker-header">
            <span onClick={() => setShowDate(false)}>←</span>
            <h3>Select Date</h3>
          </div>

          <IonDatetime
            presentation="date"
            onIonChange={(e) => {
              const val = e.detail.value!;
              const d = new Date(val);
              const formatted =
                String(d.getDate()).padStart(2, '0') + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                d.getFullYear();

              setDate(formatted);
              setShowDate(false);
            }}
          />
        </IonModal>

        {/* TIME MODAL */}
        <IonModal isOpen={showTime} onDidDismiss={() => setShowTime(false)}>
          <div className="picker-header">
            <span onClick={() => setShowTime(false)}>←</span>
            <h3>Select Time</h3>
          </div>

          <IonDatetime
            presentation="time"
            onIonChange={(e) => {
              const val = e.detail.value!;
              const t = new Date(val);

              const formatted = t.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              setTime(formatted);
              setShowTime(false);
            }}
          />
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default CreateEvent;
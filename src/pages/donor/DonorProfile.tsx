import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import './DonorProfile.css';

const DonorProfile: React.FC = () => {

  const router = useIonRouter();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const isJoin = params.get('mode') === 'join';

  const [image, setImage] = useState<string | null>(null);

  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (isJoin) {
      router.push('/bid', 'root');
    } else {
      console.log('Saved');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="profile-page">

        <div className="container">

          {/* ================= HEADER ================= */}

          <div className="header">

            <div className="dback-btn" onClick={() => router.back()}>
              <img src="/assets/img/Back.svg" />
            </div>
{!isJoin && (
  <>
    <div className="header-title">User Profile</div>
    <div className="logout">Sign Out</div>
  </>
)}

          </div>

          {/* Subtitle (JOIN ONLY) */}
          {isJoin && (
            <>
            <h2 className="title">Join the Event</h2>
            <p className="subtitle">
              Ocean Guardian Gala 2026 by Clean Oceans Initiative
            </p>
            </>
          )}

          {/* ================= PROFILE ================= */}

          <div className="profile">

            <label htmlFor="fileUpload">
              <div className="avatar">
                {image ? (
                  <img src={image} className="preview" />
                ) : (
                  <img src="/assets/img/user.svg" />
                )}
              </div>
            </label>

            <input type="file" id="fileUpload" hidden onChange={handleImage} />

            <div>
              <span className="upload">Upload Emoji</span>
              <div className="optional">Optional</div>
            </div>

          </div>

          {/* ================= FORM ================= */}

          <div className="form">

            <div className="input-group">
              <label>Your Full Name</label>
              <div className="input-box">
                <input defaultValue="John Doe" />
              </div>
              <small>Only the host sees your real identity.</small>
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <div className="input-box">
                <input defaultValue="john@example.com" />
              </div>
            </div>

            <div className="input-group">
              <label>Your Display Name</label>
              <div className="input-box">
                <input defaultValue="Brave Panda" />
              </div>
            </div>

            {isJoin && (
              <>
                <div className="random">Give me a random name</div>
                <small className="center">
                  This is how other donors will see you.
                </small>
              </>
            )}

          </div>

        </div>

        {/* ================= BOTTOM ================= */}

        <div className="bottom">
          <button
            className={`btn ${isJoin ? 'join' : 'save'}`}
            onClick={handleSubmit}
          >
            {isJoin ? 'Enter Events Room' : 'Save'}
          </button>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default DonorProfile;
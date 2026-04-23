import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { setRole } from '../../../services/auth';
import './Join.css';

const Join: React.FC = () => {
  const router = useIonRouter();

  const goLogin = (role: string) => {
    setRole(role);
    router.push('/login');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="join-page">

        <div className="container">

          {/* Logo */}
          <div className="logo-circle">
            <img src="/assets/img/logo.svg" alt="logo" />
          </div>

          <h1 className="title">PeerFund</h1>

          <p className="subtitle">
            Peer-to-peer fundraising where
            <br />
            every bid multiplies impact.
          </p>

          {/* Host */}
          <div className="card host" onClick={() => goLogin('host')}>
            <div className="left">
              <div className="icon-wrap">
                <img src="/assets/img/host.svg" />
              </div>
              <div>
                <h3>Host</h3>
                <p>Command center & controls</p>
              </div>
            </div>
            <img src="/assets/img/arrow-orange.svg" className="arrow" />
          </div>

          {/* Donor */}
          <div className="card donor" onClick={() => goLogin('donor')}>
            <div className="left">
              <div className="icon-wrap">
                <img src="/assets/img/donor.svg" />
              </div>
              <div>
                <h3>Donor</h3>
                <p>Bid & match with peers</p>
              </div>
            </div>
            <img src="/assets/img/arrow-teal.svg" className="arrow" />
          </div>
          <div className="bottom-section">
            {/* Join */}
            <div className="join-section">
              <span>Join Event</span>

              <div className="join-box">
                <input placeholder="Enter code" />
                <button onClick={() => router.push('/event-about')}>
                  Join
                </button>
              </div>
            </div>

            {/* QR */}
            <div className="qr-btn" onClick={() => router.push('/qr')}>
              Join using QR Code
            </div>
          </div>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Join;
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton
} from '@ionic/react';
import './Home.css';

const imgBase = import.meta.env.VITE_ASSETS_URL;

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonContent className="home">

        {/* Logo */}
        <div className="logo-box">
          <img src={`${imgBase}/logo_bg.svg`} alt="logo" />
        </div>

        <h1 className="title">Fundraising</h1>

        <p className="subtitle">
          Peer-to-peer fundraising where
          <br /> every bid multiplies impact.
        </p>

        {/* Host Card */}
        <div className="card host">
          <div className="icon-circle"><img src={`${imgBase}/host.png`} alt="host" /></div>
          <div className="card-text">
            <h3>Host</h3>
            <p>Command center & controls</p>
          </div>
          <span className="arrow">→</span>
        </div>

        {/* Donor Card */}
        <div className="card donor">
          <div className="icon-circle"><img src={`${imgBase}/donor.png`} alt="donor" /></div>
          <div className="card-text">
            <h3>Donor</h3>
            <p>Bid & match with peers</p>
          </div>
          <span className="arrow">→</span>
        </div>

        {/* Join Section */}
        <h4 className="join-title">Join Event</h4>

        <div className="join-row">
          <IonInput placeholder="Enter code" className="input" />
          <IonButton className="join-btn">Join</IonButton>
        </div>

        <IonButton expand="block" className="qr-btn">
          Join using QR Code
        </IonButton>

      </IonContent>
    </IonPage>
  );
};

export default Home;
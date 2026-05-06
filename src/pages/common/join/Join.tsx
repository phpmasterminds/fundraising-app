import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { setRole } from '../../../services/auth';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import { getEventByCode } from '../../../services/donorEvents';
import './Join.css';

const Join: React.FC = () => {
  const router = useIonRouter();
  const { checking } = useAuthRedirect();

  // ─── State must be before any early return ────────────────────────────────
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (checking) return null;

  const goLogin = (role: string) => {
    setRole(role);
    router.push('/login');
  };

  const handleJoin = async () => {
	  const trimmed = code.trim();
	  if (!trimmed) return;

	  setError(null);
	  setLoading(true);

	  try {
		const event = await getEventByCode(trimmed);
		// Store code so EventView can use it for guest flow
		localStorage.setItem('event_code', trimmed);

		router.push(`/join-event?id=${event.event.id}`);
	  } catch (err: any) {
		setError(err?.response?.data?.message ?? 'Invalid event code. Please try again.');
	  } finally {
		setLoading(false);
	  }
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
                <input
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  disabled={loading}
                />
                <button onClick={handleJoin} disabled={loading}>
                  {loading ? '...' : 'Join'}
                </button>
              </div>

              {/* Error */}
              {error && (
                <span style={{ fontSize: 12, color: '#E53E3E', marginTop: 6, display: 'block' }}>
                  {error}
                </span>
              )}
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


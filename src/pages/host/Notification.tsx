import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import './Notification.css';
import HostHeader from '../../components/HostHeader';

interface NotifItem {
  title: string;
  sub: string;
  time: string;
  alert?: boolean;
}

interface NotifSection {
  label: string;
  items: NotifItem[];
}

const notifications: NotifSection[] = [
  {
    label: 'Today',
    items: [
      {
        title: 'Group B: Co-equal minimum bids detected',
        sub: 'Spring Gala 2026',
        time: '1 min ago',
        alert: true,
      },
      {
        title: 'Group C: Nebula - Bid £0',
        sub: 'Spring Gala 2026',
        time: '2 min ago',
        alert: true,
      },
      {
        title: 'Inspire Gala 2026 will Live in 10 min',
        sub: 'Inspire Gala',
        time: '13 min ago',
      },
    ],
  },
  {
    label: 'Yesterday',
    items: [
      {
        title: '3 New donor added',
        sub: 'Radiance Gala 2026',
        time: '12 May, 2025',
      },
      {
        title: '2 New donor added',
        sub: 'Inspire Gala',
        time: '12 May, 2025',
      },
    ],
  },
];

const Notification: React.FC = () => {
  const router = useIonRouter();

  return (
    <IonPage>
      <IonContent fullscreen className="notification-page">
        <div className="notif-container">

          {/* ── Shared Header ── */}
          <HostHeader
            variant="back"
            title="Notifications"
            onBack={() => router.goBack()}
          />

          {/* ── Sections ── */}
          {notifications.map((section, si) => (
            <div key={si}>
              {si > 0 && <div className="notif-section-gap" />}

              <div className="notif-section-label">{section.label}</div>

              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`notif-card ${item.alert ? 'notif-card--alert' : ''}`}
                  onClick={() => console.log('open:', item.title)}
                >
                  <div className="notif-card-content">
                    <span className="notif-card-title">{item.title}</span>
                    <span className="notif-card-sub">{item.sub}</span>
                    <span className="notif-card-time">{item.time}</span>
                  </div>
                  <span className="notif-chevron">›</span>
                </div>
              ))}
            </div>
          ))}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Notification;
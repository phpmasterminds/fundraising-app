import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import './Notification.css';
import HostHeader from '../../components/HostHeader';
import { useState, useEffect } from 'react';
import { getNotifications, markNotificationsRead, type HostNotification } from '../../services/events';

interface NotifItem {
  title: string;
  sub: string;
  time: string;
  alert?: boolean;
  eventId?: number | null;
}

interface NotifSection {
  label: string;
  items: NotifItem[];
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "Today" / "Yesterday" / "12 May 2025" bucket label for a date
const bucketLabel = (d: Date): string => {
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Relative time for today's items, absolute date for older ones
const relTime = (d: Date): string => {
  if (startOfDay(d) >= startOfDay(new Date())) {
    const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Group a newest-first list into ordered date sections
const groupNotifications = (items: HostNotification[]): NotifSection[] => {
  const sections: NotifSection[] = [];
  for (const item of items) {
    const d = new Date(item.created_at);
    const label = bucketLabel(d);
    let section = sections[sections.length - 1];
    if (!section || section.label !== label) {
      section = { label, items: [] };
      sections.push(section);
    }
    section.items.push({
      title:   item.title,
      sub:     item.event_name ?? '',
      time:    relTime(d),
      alert:   item.type === 'donor_quit',
      eventId: item.event_id,
    });
  }
  return sections;
};

const Notification: React.FC = () => {
  const router = useIonRouter();

  const [sections, setSections] = useState<NotifSection[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let active = true;
    getNotifications()
      .then((res) => {
        if (!active) return;
        setSections(groupNotifications(res.data));
        // Mark read so the bell badge clears once the host opens this page
        if (res.unread > 0) markNotificationsRead().catch(() => {});
      })
      .catch(() => { if (active) setSections([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
          {!loading && sections.length === 0 && (
            <div className="notif-section-label" style={{ color: '#9AA0A6', fontWeight: 400 }}>
              No notifications yet
            </div>
          )}
          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && <div className="notif-section-gap" />}

              <div className="notif-section-label">{section.label}</div>

              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`notif-card ${item.alert ? 'notif-card--alert' : ''}`}
                  onClick={() => { if (item.eventId) router.push(`/view-event?id=${item.eventId}`); }}
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
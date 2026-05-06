import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect } from 'react';
import './EventList.css';
import HostHeader from '../../components/HostHeader';
import { getEvents, logoUrl } from '../../services/events';
import type { Event } from '../../services/events';

const EventList: React.FC = () => {
  const router = useIonRouter();

  const [activeTab, setActiveTab]   = useState('upcoming');
  const [openMenu, setOpenMenu]     = useState<number | null>(null);
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // ─── Fetch events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (err) {
        setError('Failed to load events.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // ─── Filter by tab ────────────────────────────────────────────────────────
  const filteredEvents = events.filter((e) => {
    if (activeTab === 'upcoming')  return e.status === 'draft' || e.status === 'live';
    if (activeTab === 'finished')  return e.status === 'finished';
    if (activeTab === 'unlisted')  return false; // future feature
    return false;
  });

  // ─── Card background by index ─────────────────────────────────────────────
  const bgColors = ['teal', 'orange', 'light'];
  const getBg = (index: number) => bgColors[index % bgColors.length];

  // ─── Format started_at for display ───────────────────────────────────────
  const formatStartedAt = (val?: string) => {
    if (!val) return null;
    const d = new Date(val);
    return d.toLocaleString([], {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="event-page">

        <div className="container">

          {/* ── Shared Header ── */}
          <HostHeader
            variant="main"
            onLogoClick={() => router.push('/join')}
            rightSlot={
              <>
                <img
                  src="/assets/img/Bell.svg"
                  className="bell"
                  onClick={() => router.push('/notification')}
                />
                <img
                  src="/assets/img/profile.svg"
                  className="profile_img"
                  onClick={() => router.push('/host-profile')}
                />
              </>
            }
          />

          {/* Tabs */}
          <div className="tabs">

            <div
              className={`tab ${activeTab === 'unlisted' ? 'active' : ''}`}
              onClick={() => setActiveTab('unlisted')}
            >
              <img src={activeTab === 'unlisted'
                ? '/assets/img/unlisted-active.svg'
                : '/assets/img/unlisted.svg'} />
              Unlisted
            </div>

            <div
              className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <img src={activeTab === 'upcoming'
                ? '/assets/img/upcoming-active.svg'
                : '/assets/img/upcoming.svg'} />
              Upcoming
            </div>

            <div
              className={`tab ${activeTab === 'finished' ? 'active' : ''}`}
              onClick={() => setActiveTab('finished')}
            >
              <img src={activeTab === 'finished'
                ? '/assets/img/finished-active.svg'
                : '/assets/img/finished.svg'} />
              Finished
            </div>

          </div>

          {/* Loading */}
          {loading && (
            <div className="empty">Loading events…</div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="empty">{error}</div>
          )}

          {/* Empty */}
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="empty">No Events</div>
          )}

          {/* Cards */}
          {!loading && !error && filteredEvents.map((event, index) => (
            <div
              className="ecard"
              key={event.id}
              onClick={() => router.push(`/view-event?id=${event.id}`)}
            >

              <div className={`card-left ${getBg(index)}`}>
                {logoUrl(event.logo) ? (
                  <img src={logoUrl(event.logo)!} alt={event.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <img src="/assets/img/Event1.png" alt="" />
                )}
              </div>

              <div className="card-body">

                {/* Title + menu */}
                <div className="card-header-row">
                  <h3>{event.name}</h3>

                  <div
                    className="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === index ? null : index);
                    }}
                  >
                    <img src="/assets/img/Option.svg" />
                  </div>

                  {openMenu === index && (
                    <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                      <div className="dropdown-item">Unlist</div>
                    </div>
                  )}
                </div>

                {/* Org */}
                <p>{event.charity_name}</p>

                {/* Meta */}
                <div className="meta">
                  <span>
                    <img src="/assets/img/users.svg" className="meta-icon" />
                    {event.donors_count ?? 0} donors
                  </span>

                  <span>
                    <img src="/assets/img/time.svg" className="meta-icon" />
                    {event.rounds_count} rounds
                  </span>
                </div>

                {/* Badge */}
                {event.status === 'live' && (
                  <div className="badge live">Live Event</div>
                )}

                {event.status === 'draft' && event.started_at && (
                  <div className="badge upcoming">
                    Live in ⏱ {formatStartedAt(event.started_at)}
                  </div>
                )}

                {event.status === 'draft' && !event.started_at && (
                  <div className="badge scheduled">Draft</div>
                )}

                {event.status === 'finished' && (
                  <div className="badge scheduled">
                    Finished · {formatStartedAt(event.started_at)}
                  </div>
                )}

              </div>

            </div>
          ))}

        </div>

        {/* Bottom Button */}
        <div
          className="bottom-btn"
          onClick={() => router.push('/create-event')}
        >
          Create New Events
        </div>

      </IonContent>
    </IonPage>
  );
};

export default EventList;
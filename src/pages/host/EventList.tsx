import {
  IonPage,
  IonContent,
  useIonViewDidEnter
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect } from 'react';
import './EventList.css';
import HostHeader from '../../components/HostHeader';
import { getEvents, unlistEvent, logoUrl } from '../../services/events';
import type { Event, HostEventTab } from '../../services/events';
const imgBase = import.meta.env.VITE_ASSETS_URL;

const EventList: React.FC = () => {
  const router = useIonRouter();

  const [activeTab, setActiveTab] = useState<HostEventTab>('upcoming');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ─── Core fetch ───────────────────────────────────────────────────────────
  const fetchEvents = async (tab: HostEventTab) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvents(tab);
      setEvents(data);
    } catch (err) {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  // Fires after page transition completes — works even on cached/back-nav pages
  useIonViewDidEnter(() => {
    fetchEvents(activeTab);
  });

  // Re-fetch when user switches tabs
  // Re-fetch when user switches tabs
  useEffect(() => {
    fetchEvents(activeTab);
  }, [activeTab]);

  // Auto refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents(activeTab);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeTab]);
  // ─── Unlist handler ───────────────────────────────────────────────────────
  const handleUnlist = async (e: React.MouseEvent, eventId: number) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await unlistEvent(eventId);
      // Remove from current list immediately, then re-fetch
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    } catch {
      alert('Failed to unlist event. Please try again.');
    }
  };

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
                  src={`${imgBase}/Bell.svg`}
                  className="bell"
                  onClick={() => router.push('/notification')}
                />
                <img
                  src={`${imgBase}/profile.svg`}
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
                ? `${imgBase}/unlisted-active.svg`
                : `${imgBase}/unlisted.svg` } />
              Unlisted
            </div>

            <div
              className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <img src={activeTab === 'upcoming'
                ? `${imgBase}/upcoming-active.svg`
                : `${imgBase}/upcoming.svg`} />
              Upcoming
            </div>

            <div
              className={`tab ${activeTab === 'finished' ? 'active' : ''}`}
              onClick={() => setActiveTab('finished')}
            >
              <img src={activeTab === 'finished'
                ? `${imgBase}/finished-active.svg`
                : `${imgBase}/finished.svg` } />
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
          {!loading && !error && events.length === 0 && (
            <div className="empty">No Events</div>
          )}

          {/* Cards */}
          {!loading && !error && events.map((event, index) => (
            <div
              className="ecard"
              key={event.id}
              onClick={() => router.push(`/view-event?id=${event.id}`)}
            >

              <div className={`card-left ${getBg(index)}`}>
                {logoUrl(event.logo) ? (
                  <img src={logoUrl(event.logo)!} alt={event.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <img src={`${imgBase}/Event1.png`} alt="" />
                )}
              </div>

              <div className="card-body">

                {/* Title + menu */}
                <div className="card-header-row">
                  <h3>{event.name}</h3>

                  {event.status !== 'finished' && event.status !== 'unlisted' && (
                    <div
                      className="menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === index ? null : index);
                      }}
                    >
                      <img src={`${imgBase}/Option.svg`} />
                    </div>
                  )}

                  {openMenu === index && (
                    <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                      {event.status !== 'unlisted' && event.status !== 'finished' && (
                        <div
                          className="dropdown-item"
                          onClick={(e) => handleUnlist(e, event.id)}
                        >
                          Unlist
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Org */}
                <p>{event.charity_name}</p>

                {/* Meta */}
                <div className="meta">
                  <span>
                    <img src={`${imgBase}/users.svg`} className="meta-icon" />
                    {event.donors_count ?? 0} donors
                  </span>

                  <span>
                    <img src={`${imgBase}/time.svg`} className="meta-icon" />
                    {event.rounds_count} rounds
                  </span>
                </div>

                {/* Badge */}
                {event.status === 'live' && (
                  <div className="badge live">Live Event</div>
                )}

                {event.status === 'draft' && event.started_at && (
                  <div className="badge upcoming">
                    Live in <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.66699 1.3335H9.33366" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 9.3335L10 7.3335" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8.00033 14.6667C10.9458 14.6667 13.3337 12.2789 13.3337 9.33333C13.3337 6.38781 10.9458 4 8.00033 4C5.05481 4 2.66699 6.38781 2.66699 9.33333C2.66699 12.2789 5.05481 14.6667 8.00033 14.6667Z" stroke="#25201D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg> {formatStartedAt(event.started_at)}
                  </div>
                )}

                {event.status === 'draft' && !event.started_at && (
                  <div className="badge scheduled">Draft</div>
                )}

                {event.status === 'finished' && (
                  <div className="badge scheduled">
                    Finished on· {formatStartedAt(event.started_at)}
                  </div>
                )}

                {event.status === 'unlisted' && (
                  <div className="badge scheduled">Unlisted</div>
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
          Create New Event
        </div>

      </IonContent>
    </IonPage>
  );
};

export default EventList;
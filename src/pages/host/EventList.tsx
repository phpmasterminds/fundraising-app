import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import './EventList.css';

const EventList: React.FC = () => {
  const router = useIonRouter();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const events = {
    upcoming: [
      {
        title: 'Hope Gala 2026',
        org: 'Shelter Tomorrow Foundation',
        donors: 8,
        rounds: 3,
        type: 'live',
        icon: '/assets/img/Event1.png',
        bg: 'teal'
      },
      {
        title: 'Inspire Gala 2026',
        org: 'Shelter Tomorrow Foundation',
        donors: 0,
        rounds: 5,
        type: 'upcoming',
        time: '12:25',
        icon: '/assets/img/Event2.png',
        bg: 'orange'
      }
    ],
    unlisted: [],
    finished: [
      {
        title: 'Radiance Gala 2026',
        org: 'Shelter Tomorrow Foundation',
        donors: 2,
        rounds: 3,
        type: 'scheduled',
        date: '12 May 2026',
        icon: '/assets/img/Event3.png',
        bg: 'light'
      }
    ]
  };

  const currentEvents = events[activeTab];

  return (
    <IonPage>
      <IonContent fullscreen className="event-page">

        <div className="container">

          {/* Header */}
          <div className="header">
            <div className="logo" onClick={() => router.push('/join')}>
              <img src="/assets/img/logo_bg.svg" />
              <span>PeerFund</span>
            </div>

            <div className="header-right">
              <img src="/assets/img/Bell.svg" className="bell" onClick={() => router.push('/notification')} />
              <img src="/assets/img/profile.svg" className="profile_img" onClick={() => router.push('/join')}/>
            </div>
          </div>

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

          {/* Cards */}
          {currentEvents.length === 0 && (
            <div className="empty">No Events</div>
          )}

          {currentEvents.map((event, index) => (
            <div className="ecard" key={index}  onClick={() => router.push('/view-event')}>

              <div className={`card-left ${event.bg}`}>
                <img src={event.icon} />
              </div>

              <div className="card-body">

                {/* Title + menu */}
                <div className="card-header-row">
                  <h3>{event.title}</h3>

                  <div
                    className="menu"
                    onClick={() => setOpenMenu(openMenu === index ? null : index)}
                  >
                    <img src="/assets/img/Option.svg" />
                  </div>

                  {openMenu === index && (
                    <div className="dropdown">
                      <div className="dropdown-item">Unlist</div>
                    </div>
                  )}
                </div>

                {/* Org */}
                <p>{event.org}</p>

                {/* Meta */}
                <div className="meta">
                  <span>
                    <img src="/assets/img/users.svg" className="meta-icon" />
                    {event.donors} donors
                  </span>

                  <span>
                    <img src="/assets/img/time.svg" className="meta-icon" />
                    {event.rounds} rounds
                  </span>
                </div>

                {/* Badge LEFT */}
                {event.type === 'live' && (
                  <div className="badge live">Live Event</div>
                )}

                {event.type === 'upcoming' && (
                  <div className="badge upcoming">
                    Live in ⏱ {event.time}
                  </div>
                )}

                {event.type === 'scheduled' && (
                  <div className="badge scheduled">
                    Scheduled on {event.date}
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
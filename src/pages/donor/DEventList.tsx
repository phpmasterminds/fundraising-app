import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import './DEventList.css';

const DEventList: React.FC = () => {
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
            <div className="logo">
              <img src="/assets/img/logo_bg.svg" />
              <span>PeerFund</span>
            </div>

            <div className="header-right"  onClick={() => router.push('/profile')}>
  <span className="username">John Doe 🐰</span>
</div>
          </div>

       

          {/* Cards */}
          {currentEvents.length === 0 && (
            <div className="empty">No Events</div>
          )}

          {currentEvents.map((event, index) => (
            <div className="ecard" key={index}  onClick={() => router.push('/profile?mode=join')}>

              <div className={`card-left ${event.bg}`}>
                <img src={event.icon} />
              </div>

              <div className="card-body">

                {/* Title + menu */}
                <div className="card-header-row">
                  <h3>{event.title}</h3>                 
                </div>

                {/* Org */}
                <p>{event.org}</p>

                {/* Meta */}
                <div className="meta">
                  <span>
                    <img src="/assets/img/users.svg" className="meta-icon" />
                    {event.donors} donors
                  </span>

                  
                </div>

               

              </div>

            </div>
          ))}

        </div>

        {/* Bottom Button */}


      </IonContent>
    </IonPage>
  );
};

export default DEventList;
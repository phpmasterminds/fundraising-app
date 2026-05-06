import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

import AuthGuard    from './components/AuthGuard';
import Join         from './pages/common/join/Join';
import Login        from './pages/common/login/Login';
import Register     from './pages/common/register/Register';
import QrScan       from './pages/common/qr/QrScan';
import DonorProfile from './pages/donor/DonorProfile';
import EventList    from './pages/host/EventList';
import CreateEvent  from './pages/host/CreateEvent';
import ViewEvent    from './pages/host/ViewEvent';
import Notification from './pages/host/Notification';
import HostProfile  from './pages/host/HostProfile';
import DEventList   from './pages/donor/DEventList';
import EventView    from './pages/donor/EventView';
import BidFlow      from './pages/donor/BidFlow';
import { isAuthenticated, getRole } from './services/auth';

setupIonicReact();

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter basename={BASE}>
        <IonRouterOutlet>

          {/* ── Default redirect ── */}
          <Route exact path="/">
            {isAuthenticated()
              ? <Redirect to={getRole() === 'host' ? '/events' : '/devents'} />
              : <Redirect to="/join" />}
          </Route>

          {/* ── Public routes ── */}
          <Route path="/join"     component={Join}     exact />
          <Route path="/login"    component={Login}    exact />
          <Route path="/register" component={Register} exact />
          <Route path="/qr"       component={QrScan}   exact />
		  <Route path="/join-event" component={EventView} exact />
           

          {/* ── Host protected routes ── */}
          <Route path="/events" exact>
            <AuthGuard role="host"><EventList /></AuthGuard>
          </Route>
          <Route path="/create-event" exact>
            <AuthGuard role="host"><CreateEvent /></AuthGuard>
          </Route>
          <Route path="/view-event" exact>
            <AuthGuard role="host"><ViewEvent /></AuthGuard>
          </Route>
          <Route path="/notification" exact>
            <AuthGuard role="host"><Notification /></AuthGuard>
          </Route>
		  <Route path="/host-profile" exact>
            <AuthGuard role="host"><HostProfile /></AuthGuard>
          </Route>

          {/* ── Donor protected routes ── */}
          <Route path="/devents" exact>
            <AuthGuard role="donor"><DEventList /></AuthGuard>
          </Route>
          <Route path="/profile" exact>
            <AuthGuard role="donor"><DonorProfile /></AuthGuard>
          </Route>
         
          <Route path="/bid" exact>
            <AuthGuard role="donor"><BidFlow /></AuthGuard>
          </Route>

        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
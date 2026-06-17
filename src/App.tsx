import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact, useIonRouter } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';

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
import ForgotPassword from './pages/common/forgot/ForgotPassword';
import ResetPassword from './pages/common/reset/ResetPassword';
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

/* Public app URL from env (e.g. https://app.getninesoft.com) */
const APP_HOST = (() => {
  try { return new URL(import.meta.env.VITE_APP_URL).host; }
  catch { return ''; }
})();

/* ── Deep link handler: opens app on App Link / Universal Link tap ── */
const DeepLinkHandler: React.FC = () => {
  const router = useIonRouter();
  useEffect(() => {
    const handle = CapApp.addListener('appUrlOpen', ({ url }) => {
      // url e.g. https://app.getninesoft.com/join?code=BWWD5X7B
      try {
        const u = new URL(url);
        if (APP_HOST && u.host !== APP_HOST) return; // ignore other domains
        const path = u.pathname + u.search;          // -> /join?code=...
        if (path) router.push(path);
      } catch { /* malformed url — ignore */ }
    });
    return () => { handle.then(h => h.remove()); };
  }, [router]);
  return null;
};

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter basename={BASE}>
        <DeepLinkHandler />
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
          <Route exact path="/forgot-password" component={ForgotPassword} />
		  <Route path="/reset-password" component={ResetPassword} exact />

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
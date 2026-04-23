import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* Core CSS required for Ionic components to work properly */
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
//import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

import Join         from './pages/common/join/Join';
import Login        from './pages/common/login/Login';
import Register     from './pages/common/register/Register';
import QrScan       from './pages/common/qr/QrScan';
import DonorProfile from './pages/donor/DonorProfile';
import EventList    from './pages/host/EventList';
import CreateEvent  from './pages/host/CreateEvent';
import ViewEvent    from './pages/host/ViewEvent';
import Notification from './pages/host/Notification';
import DEventList   from './pages/donor/DEventList';
import EventView    from './pages/donor/EventView';
import BidFlow      from './pages/donor/BidFlow';

setupIonicReact();

// Read base from vite — falls back to '/' for local root dev
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

const App: React.FC = () => {
  return (
    <IonApp>
      {/* basename must NOT have trailing slash */}
      <IonReactRouter basename={BASE}>
        <IonRouterOutlet>

          <Route exact path="/">
            <Redirect to="/join" />
          </Route>

          <Route path="/join"         component={Join}         exact />
          <Route path="/login"        component={Login}        exact />
          <Route path="/register"     component={Register}     exact />
          <Route path="/qr"           component={QrScan}       exact />
          <Route path="/profile"      component={DonorProfile} exact />
          <Route path="/events"       component={EventList}    exact />
          <Route path="/devents"      component={DEventList}   exact />
          <Route path="/create-event" component={CreateEvent}  exact />
          <Route path="/view-event"   component={ViewEvent}    exact />
          <Route path="/notification" component={Notification} exact />
          <Route path="/join-event"   component={EventView}    exact />
          <Route path="/bid"          component={BidFlow}      exact />

        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
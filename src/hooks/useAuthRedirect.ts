import { useEffect, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { getRole } from '../services/auth';

const useAuthRedirect = () => {
  const router   = useIonRouter();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const role      = getRole();
    const authToken = localStorage.getItem('auth_token');

    // Don't redirect if coming from QR/code flow — let the page handle it
    const params  = new URLSearchParams(location.search);
    const fromQR  = params.get('from') === 'qr';
    const hasCode = !!params.get('code');

    if (authToken && role && !fromQR && !hasCode) {
      if (role === 'host') {
        router.push('/events', 'root');
      } else {
        router.push('/devents', 'root');
      }
    } else {
      setChecking(false);
    }
  }, []);

  return { checking };
};

export default useAuthRedirect;
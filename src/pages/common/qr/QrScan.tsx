import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useEffect } from 'react';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import './QrScan.css';

const QrScan: React.FC = () => {
  const router = useIonRouter();

  const { checking } = useAuthRedirect();

  // All hooks must come before any early return
  useEffect(() => {
    if (checking) return;
    startScan();
  }, [checking]);

  if (checking) return null;

  const startScan = async () => {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted') {
        alert('Camera permission required');
        return;
      }

      const result = await BarcodeScanner.scan();

      if (result.barcodes.length > 0) {
        const code = result.barcodes[0].rawValue;
        router.push(`/join-event?code=${code}`, 'root');
      }

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="qr-page">

        {/* Header */}
        <div className="qr-header">
          <div className="back" onClick={() => router.back()}>
            <img src="/assets/img/Back.svg" />
          </div>
          <h2>Scan QR Code</h2>
        </div>

        {/* Overlay UI */}
        <div className="qr-overlay">

          {/* Scanner Frame */}
          <div className="qr-frame">

            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>

          </div>

        </div>

      </IonContent>
    </IonPage>
  );
};

export default QrScan;
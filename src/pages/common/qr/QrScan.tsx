import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Html5QrcodeScanner } from 'html5-qrcode';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import './QrScan.css';
import { Html5Qrcode } from "html5-qrcode";
import { getEventByCode } from '../../../services/donorEvents';
const QrScan: React.FC = () => {
  const router = useIonRouter();
  const { checking } = useAuthRedirect();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (checking) return;

    if (Capacitor.getPlatform() === 'web') {
      startWebScanner();
    } else {
      startNativeScanner();
    }

    return () => {
      try {
        scannerRef.current?.clear();
      } catch (e) {}
    };
  }, [checking]);

  const goToJoinEvent = (code: string) => {
    router.push(`/join-event?code=${encodeURIComponent(code)}`, 'root');
  };

  const startNativeScanner = async () => {
    try {
      document.body.classList.add('scanner-active');

      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted') {
        alert('Camera permission required');
        return;
      }

     const result = await BarcodeScanner.scan();

document.body.classList.remove('scanner-active');

if (result.barcodes.length > 0) {

  const qrValue = result.barcodes[0].rawValue || '';

  let eventCode = qrValue;

  try {
    const url = new URL(qrValue);

    if (url.searchParams.has('code')) {
      eventCode = url.searchParams.get('code') || '';
    }
  } catch (e) {
    // QR contains plain code, use it directly
  }

  if (!eventCode) {
    alert('Invalid QR Code');
    return;
  }

  try {
    const event = await getEventByCode(eventCode);

    localStorage.setItem('event_code', eventCode);

    router.push(`/join-event?id=${event.event.id}`, 'root');

  } catch (err: any) {

    alert(
      err?.response?.data?.message ||
      'Invalid event code. Please try again.'
    );

  }
}
    } catch (err) {
      document.body.classList.remove('scanner-active');
      console.error(err);
    }
  };



const startWebScanner = async () => {
  try {
    const cameras = await Html5Qrcode.getCameras();

    console.log("Cameras:", cameras);

    if (!cameras.length) {
      alert("No camera detected");
      return;
    }

    const html5QrCode = new Html5Qrcode("qr-reader");

    await html5QrCode.start(
      cameras[0].id,
      {
        fps: 10,
        qrbox: 250,
      },
      async (decodedText) => {

        await html5QrCode.stop();

        let eventCode = decodedText;

        try {
          const url = new URL(decodedText);

          if (url.searchParams.has('code')) {
            eventCode = url.searchParams.get('code') || '';
          }
        } catch (e) {
          // Plain code QR
        }

        if (!eventCode) {
          alert('Invalid QR Code');
          return;
        }

        try {
          const event = await getEventByCode(eventCode);

          localStorage.setItem('event_code', eventCode);

          router.push(`/join-event?id=${event.event.id}`, 'root');

        } catch (err: any) {

          alert(
            err?.response?.data?.message ||
            'Invalid event code. Please try again.'
          );

        }
      },
      () => {}
    );

  } catch (err) {
    console.error("QR Error:", err);
  }
};
  if (checking) return null;

  return (
    <IonPage>
      <IonContent fullscreen className="qr-page">

        <div className="qr-header">
          <div className="back" onClick={() => router.back()}>
            <img src="/assets/img/Back.svg" alt="Back" />
          </div>
          <h2>Scan QR Code</h2>
        </div>

        {Capacitor.getPlatform() === 'web' ? (
          <div className="web-scanner-container">
            <div id="qr-reader"></div>
          </div>
        ) : (
          <div className="qr-overlay">
            <div className="qr-frame">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default QrScan;
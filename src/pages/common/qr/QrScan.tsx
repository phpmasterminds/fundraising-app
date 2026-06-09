import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Html5QrcodeScanner } from 'html5-qrcode';
import useAuthRedirect from '../../../hooks/useAuthRedirect';
import './QrScan.css';
import { Html5Qrcode } from "html5-qrcode";
import { getEventByCode } from '../../../services/donorEvents';
const QrScan: React.FC = () => {
  const router = useIonRouter();
  const { checking } = useAuthRedirect();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const [nativeFacing, setNativeFacing] = useState<LensFacing>(LensFacing.Back);
  const [webFacing, setWebFacing] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (checking) return;

    if (Capacitor.getPlatform() === 'web') {
      startWebScanner('environment');
    } else {
      startNativeScanner(LensFacing.Back);
    }

    return () => {
      try {
        scannerRef.current?.clear();
        if (html5QrRef.current) {
          html5QrRef.current.stop().catch(() => {});
        }
      } catch (e) {}
    };
  }, [checking]);

  const goToJoinEvent = (code: string) => {
    router.push(`/join-event?code=${encodeURIComponent(code)}`, 'root');
  };

  // Shared handler for both native and web scan results
  const handleScannedCode = async (qrValue: string) => {
    let eventCode = qrValue;
    try {
      const url = new URL(qrValue);
      if (url.searchParams.has('code')) {
        eventCode = url.searchParams.get('code') || '';
      }
    } catch (e) {}

    if (!eventCode) {
      alert('Invalid QR Code');
      return;
    }
    try {
      const event = await getEventByCode(eventCode);
      localStorage.setItem('event_code', eventCode);
      router.push(`/join-event?id=${event.event.id}`, 'root');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Invalid event code. Please try again.');
    }
  };

  const startNativeScanner = async (facing: LensFacing) => {
    try {
      document.body.classList.add('scanner-active');

      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted') {
        alert('Camera permission required');
        return;
      }

      const result = await BarcodeScanner.scan({ lensFacing: facing });

      document.body.classList.remove('scanner-active');

      if (result.barcodes.length > 0) {
        const qrValue = result.barcodes[0].rawValue || '';
        await handleScannedCode(qrValue);
      }
    } catch (err) {
      document.body.classList.remove('scanner-active');
      console.error(err);
    }
  };

  const switchNativeCamera = async () => {
    const newFacing = nativeFacing === LensFacing.Back ? LensFacing.Front : LensFacing.Back;
    setNativeFacing(newFacing);
    try { await BarcodeScanner.stopScan(); } catch (e) {}
    startNativeScanner(newFacing);
  };

  const startWebScanner = async (facingMode: 'environment' | 'user') => {
    try {
      if (html5QrRef.current) {
        try { await html5QrRef.current.stop(); } catch (e) {}
        html5QrRef.current = null;
      }
      // Clear container so new instance starts clean
      const container = document.getElementById('qr-reader');
      if (container) container.innerHTML = '';

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await html5QrCode.stop();
          html5QrRef.current = null;
          await handleScannedCode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('QR Error:', err);
    }
  };

  const switchWebCamera = async () => {
    const newFacing = webFacing === 'environment' ? 'user' : 'environment';
    setWebFacing(newFacing);
    await startWebScanner(newFacing);
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
            <button
              onClick={switchWebCamera}
              style={{ marginTop: 12, padding: '8px 20px', borderRadius: 65, background: '#2BA7A0', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              Switch Camera
            </button>
          </div>
        ) : (
          <div className="qr-overlay">
            <div className="qr-frame">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>
            <button
              onClick={switchNativeCamera}
              style={{ marginTop: 24, padding: '10px 24px', borderRadius: 65, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}
            >
              Switch Camera
            </button>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default QrScan;
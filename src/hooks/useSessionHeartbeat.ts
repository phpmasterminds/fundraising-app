/**
 * useSessionHeartbeat.ts — keeps a logged-in device's session honest, and
 * (Slide 17) detects when the device has actually lost connectivity.
 *
 * When a user logs in elsewhere, the backend revokes this device's token
 * (single active session). Token auth has no server push, so without this
 * hook the revoked device only discovers it on its NEXT request — i.e. the
 * user's next tap. This hook quietly pings the protected /user endpoint on
 * an interval; the moment the token is gone that ping returns 401 and the
 * existing response interceptor in api.ts clears the session and redirects
 * to /login. Result: the kicked device logs out within HEARTBEAT_MS instead
 * of waiting for user action.
 *
 * It also re-checks immediately when the app returns to the foreground,
 * because mobile OSes pause/throttle JS timers while the app is backgrounded,
 * and the instant the browser/WebView reports connectivity back (the 'online'
 * event) rather than waiting for the next interval tick.
 *
 * Slide 17 — auto-reconnect + disconnect notice: the interval below never
 * stops retrying on failure, so recovery is already automatic the moment a
 * ping succeeds again — there's no separate "retry" mechanism needed. What
 * this hook adds is telling the rest of the app when that's happening, via
 * connectionStatus.setOffline(), by counting consecutive failures where the
 * request never got a response at all (a real connectivity problem) — as
 * opposed to a 401/403/5xx, which means the server WAS reached and is
 * api.ts's concern, not a disconnection.
 *
 * No new logout logic lives here — it only nudges; api.ts owns the 401 path.
 */

import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import api from '../services/api';
import { isAuthenticated } from '../services/auth';
import { setOffline } from '../services/connectionStatus';

// How quickly a revoked session is detected. Lower = snappier, more requests.
const HEARTBEAT_MS = 10_000; // 10s

// Consecutive failed pings (no response at all) before flagging the donor as
// disconnected — avoids flagging on a single dropped packet.
const OFFLINE_AFTER_MISSES = 2; // ~20s of failed pings

export default function useSessionHeartbeat(): void {
  useEffect(() => {
    let misses = 0;

    const check = () => {
      if (!isAuthenticated()) return; // nothing to verify when logged out
      api.get('/user')
        .then(() => {
          misses = 0;
          setOffline(false); // reachable again — this IS the auto-reconnect
        })
        .catch((err: any) => {
          // A response (401/403/5xx, etc.) means the server WAS reached —
          // that's a session/auth concern api.ts's interceptor already
          // handles, not a connectivity problem. No response at all is the
          // actual "can't reach the server" case.
          if (err?.response) return;
          misses += 1;
          if (misses >= OFFLINE_AFTER_MISSES) setOffline(true);
        });
    };

    // Pulse while the app is open.
    const id = setInterval(check, HEARTBEAT_MS);

    // Re-check the instant the app comes back to the foreground.
    const listener = CapApp.addListener('resume', check);

    // Re-check the instant the browser/WebView reports connectivity back,
    // instead of waiting up to HEARTBEAT_MS for the next interval tick.
    window.addEventListener('online', check);

    return () => {
      clearInterval(id);
      listener.then((handle) => handle.remove());
      window.removeEventListener('online', check);
    };
  }, []);
}
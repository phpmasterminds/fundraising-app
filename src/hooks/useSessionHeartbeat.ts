/**
 * useSessionHeartbeat.ts — keeps a logged-in device's session honest.
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
 * because mobile OSes pause/throttle JS timers while the app is backgrounded.
 *
 * No new logout logic lives here — it only nudges; api.ts owns the 401 path.
 */

import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import api from '../services/api';
import { isAuthenticated } from '../services/auth';

// How quickly a revoked session is detected. Lower = snappier, more requests.
const HEARTBEAT_MS = 10_000; // 10s

export default function useSessionHeartbeat(): void {
  useEffect(() => {
    const check = () => {
      if (!isAuthenticated()) return; // nothing to verify when logged out
      // 401 (revoked/expired) is handled globally by api.ts's interceptor.
      // Network errors / 5xx reject here harmlessly and never log the user out.
      api.get('/user').catch(() => { /* intentionally ignored */ });
    };

    // Pulse while the app is open.
    const id = setInterval(check, HEARTBEAT_MS);

    // Re-check the instant the app comes back to the foreground.
    const listener = CapApp.addListener('resume', check);

    return () => {
      clearInterval(id);
      listener.then((handle) => handle.remove());
    };
  }, []);
}
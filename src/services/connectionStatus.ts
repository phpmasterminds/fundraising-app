/**
 * connectionStatus.ts — tiny shared "can we currently reach the server?" flag
 * (Slide 17: notify the donor they've disconnected).
 *
 * Not a state-management library — just a small module-level flag plus the
 * browser's built-in CustomEvent, so any screen can react without prop-drilling.
 * Persisted to localStorage so a screen mounted after the flag flips still
 * reads the current value on load, not just on the next change.
 *
 * useSessionHeartbeat.ts is the only thing that should call setOffline() — it's
 * the one actually pinging the server. Everything else should only read
 * isOffline() and/or subscribe with onConnectionChange().
 */

const EVENT_NAME  = 'peerfund:connection-changed';
const STORAGE_KEY = 'peerfund_connection_offline';

export function isOffline(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function setOffline(offline: boolean): void {
  if (isOffline() === offline) return; // no change — don't spam listeners
  localStorage.setItem(STORAGE_KEY, offline ? '1' : '0');
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { offline } }));
}

export function onConnectionChange(cb: (offline: boolean) => void): () => void {
  const handler = (e: Event) => cb(Boolean((e as CustomEvent).detail?.offline));
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
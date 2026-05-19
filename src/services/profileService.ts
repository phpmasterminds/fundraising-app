// src/services/profileService.ts

const API = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  'Content-Type':  'application/json',
  'Accept':        'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token') ?? ''}`,
});


// ── Types ────────────────────────────────────────────────
export interface ProfilePayload {
  name: string;
  pseudonym: string;   // display name stored as pseudonym in DB
}

export interface PasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface HostStats {
  events_count: number;
  total_raised: number;
  donors_count: number;
}

// ── Update profile (name + pseudonym) ───────────────────
export const updateProfile = async (payload: ProfilePayload): Promise<void> => {
  const res = await fetch(`${API}/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to update profile');
  }

  // Sync localStorage
  const stored = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
  localStorage.setItem('auth_user', JSON.stringify({
    ...stored,
    name: payload.name,
    pseudonym: payload.pseudonym,
  }));
};

// ── Change password ──────────────────────────────────────
export const changePassword = async (payload: PasswordPayload): Promise<void> => {
  const res = await fetch(`${API}/profile/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to change password');
  }
};

// ── Get host stats (events, total raised, donors) ───────
export const getHostStats = async (): Promise<HostStats> => {
  const res = await fetch(`${API}/profile/stats`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to load stats');
  }

  return res.json();
};
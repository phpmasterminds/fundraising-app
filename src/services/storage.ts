const BASE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/api\/?$/, '');

/**
 * Converts a Laravel storage relative path → full public URL.
 * e.g. "avatars/1/abc.jpg" → "https://api.onehive.world/storage/avatars/1/abc.jpg"
 * Already-absolute URLs (backend's `url` field) pass through unchanged.
 */
export const storageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.replace(/^\/?(storage\/)?/, '');
  return `${BASE_URL}/storage/${clean}`;
};

/**
 * Reads auth_user from localStorage and returns the parsed object.
 */
export const getAuthUser = (): Record<string, any> => {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || '{}');
  } catch {
    return {};
  }
};
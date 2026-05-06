const BASE_URL =
  (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace('/api', '');

/**
 * Converts a Laravel storage relative path → full public URL.
 * e.g. "avatars/1/abc.jpg" → "https://yourserver.com/storage/avatars/1/abc.jpg"
 */
export const storageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  console.log(`${BASE_URL}/storage/${path}`+'BASE_URL');
  return `${BASE_URL}/storage/${path}`;
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
import { useState } from 'react';
import api from '../services/api';
import type { ApiError } from '../services/api';
import { normalizeImageForUpload } from './imageConvert';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadResult {
  url:  string;   // full public URL returned by server
  path: string;   // relative storage path (for saving to DB)
}

interface UsePhotoUpload {
  preview:          string | null;
  uploading:        boolean;
  error:            string | null;
  fieldErrors:      Record<string, string>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  reset:            () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const usePhotoUpload = (
  onSuccess?: (result: UploadResult) => void
): UsePhotoUpload => {

  const [preview,     setPreview]     = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Client-side validation ──────────────────────────────────────────────
    if (file.size > 50 * 1024 * 1024) {
      setError('Image must be smaller than 50 MB.');
      return;
    }

    setError(null);
    setFieldErrors({});
    setUploading(true);

    // ── Normalize any picked format (incl. HEIC/HEIF) to JPEG before upload ──
    let normalizedFile: File;
    try {
      normalizedFile = await normalizeImageForUpload(file);
    } catch {
      setError('Please choose a valid image file.');
      setUploading(false);
      return;
    }

    // ── Instant local preview ───────────────────────────────────────────────
    setPreview(URL.createObjectURL(normalizedFile));

    try {
      const formData = new FormData();
      formData.append('avatar', normalizedFile);

      // Token attached automatically by api.ts interceptor
      const { data } = await api.post<UploadResult>(
        '/upload-avatar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // ── Update localStorage so avatar persists ──────────────────────────
      const stored = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
      localStorage.setItem('auth_user', JSON.stringify({ ...stored, avatar: data.path }));

      onSuccess?.(data);

    } catch (err) {
      const e = err as ApiError;

      if (e.errors) {
        // Laravel field-level validation (file size, mime type…)
        const mapped: Record<string, string> = {};
        Object.entries(e.errors).forEach(([field, msgs]) => {
          mapped[field] = msgs[0];
        });
        setFieldErrors(mapped);
        setError(mapped.avatar ?? 'Upload failed');
      } else {
        // Network / 401 / server error
        setError(e.message ?? 'Upload failed. Please try again.');
      }
      // Keep local preview so the user still sees their choice
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setError(null);
    setFieldErrors({});
    setUploading(false);
  };

  return { preview, uploading, error, fieldErrors, handleFileChange, reset };
};

export default usePhotoUpload;
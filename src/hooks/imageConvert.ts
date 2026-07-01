import heic2any from 'heic2any';

// Formats every WebView / browser can already decode natively via <img>/canvas.
// Anything already in this list is passed through untouched.
const DIRECT_PASS_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    HEIC_TYPES.includes(file.type.toLowerCase()) ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

function withJpgExtension(originalName: string): string {
  const base = originalName && originalName.includes('.')
    ? originalName.replace(/\.[^.]+$/, '')
    : (originalName || 'image');
  return `${base}.jpg`;
}

async function canvasToJpegFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas conversion failed'))),
      'image/jpeg',
      0.92
    );
  });
  return new File([blob], withJpgExtension(file.name), { type: 'image/jpeg' });
}

/**
 * Normalizes any picked image file into a JPEG File ready for upload.
 * - JPG/PNG/WEBP: returned as-is (no wasted work).
 * - HEIC/HEIF: converted via heic2any (the one format WebViews can't decode natively).
 * - Anything else the browser can open (GIF, BMP, AVIF, etc.): normalized via canvas.
 * Throws if the file cannot be decoded as an image at all.
 */
export async function normalizeImageForUpload(file: File): Promise<File> {
  if (DIRECT_PASS_TYPES.includes(file.type.toLowerCase())) {
    return file;
  }

  if (isHeic(file)) {
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], withJpgExtension(file.name), { type: 'image/jpeg' });
  }

  return canvasToJpegFile(file);
}
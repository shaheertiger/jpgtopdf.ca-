// HEIC/HEIF (iPhone photos) -> JPEG/PNG blob. Uses the browser's own decoder when it has one
// (Safari), otherwise heic2any (libheif compiled to JavaScript, self-hosted).
import { loadHeic, loadImage, imageToCanvas, canvasBlob } from './core.js';

export const isHeic = (f) => /image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

export async function decodeHeic(file, type = 'image/jpeg', quality = 0.92) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const c = imageToCanvas(img);
    return await canvasBlob(c, type, quality);
  } catch { /* no native decoder: fall through */ } finally { URL.revokeObjectURL(url); }
  const heic2any = await loadHeic();
  try {
    let out = await heic2any({ blob: file, toType: type, quality });
    return Array.isArray(out) ? out[0] : out;
  } catch (e) {
    throw new Error(`${file.name}: this HEIC file could not be decoded (${(e && e.message) || e}).`);
  }
}

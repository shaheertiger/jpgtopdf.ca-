// JPG to PDF (homepage tool, English and French): JPG, JPEG, PNG, WebP, GIF, BMP and HEIC.
import { isImage } from '../core.js';
import { mountImageTool } from '../images-to-pdf.js';
import { isHeic, decodeHeic } from '../heic.js';

mountImageTool({
  filter: isImage,
  decode: async (file) => (isHeic(file) ? { blob: await decodeHeic(file, 'image/jpeg', 0.92), kind: 'jpeg' } : { blob: file }),
});

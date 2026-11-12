// HEIC to PDF: iPhone photos straight to one PDF (HEIC decoded in the browser, then embedded).
import { mountImageTool } from '../images-to-pdf.js';
import { isImage } from '../core.js';
import { isHeic, decodeHeic } from '../heic.js';

mountImageTool({
  filter: isImage,
  reject: 'Please choose HEIC photos (JPG and PNG can be mixed in).',
  decode: async (file) => (isHeic(file) ? { blob: await decodeHeic(file, 'image/jpeg', 0.92), kind: 'jpeg' } : { blob: file }),
  fileName: 'photos',
});

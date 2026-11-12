// Scan to PDF: take photos of paper with the phone camera (or pick photos), clean them up
// (greyscale or black & white) and save one PDF.
import { $, el, isImage } from '../core.js';
import { mountImageTool } from '../images-to-pdf.js';
import { isHeic, decodeHeic } from '../heic.js';

const letter = /^(en-(us|ca)|fr-ca|es-(mx|us)|en-ph)$/i.test(navigator.language || '') ;
const tool = mountImageTool({
  filter: isImage,
  scan: true,
  reject: 'Please take a photo or choose image files.',
  decode: async (file) => (isHeic(file) ? { blob: await decodeHeic(file, 'image/jpeg', 0.92), kind: 'jpeg' } : { blob: file }),
  defaults: { size: letter ? 'letter' : 'a4', quality: 'balanced', filter: 'gray', margin: '0' },
  fileName: 'scan',
});
// A second input that opens the rear camera directly on phones.
const cam = el('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'visually-hidden', id: 'camera', 'aria-label': 'Take a photo with the camera' });
cam.addEventListener('change', () => { if (cam.files.length) tool.addFiles(Array.from(cam.files)); cam.value = ''; });
const btn = el('button', { type: 'button', class: 'btn btn-primary camera-btn', text: '📷 Take a photo', onclick: (e) => { e.preventDefault(); e.stopPropagation(); cam.click(); } });
$('#drop').after(el('div', { class: 'camera-row' }, btn, cam));

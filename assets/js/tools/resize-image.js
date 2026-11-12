// Resize image: exact pixels, a percentage, or a preset for a platform (Instagram, YouTube,
// passport/visa photo). Fit inside or crop to fill.
import { $, el, isImage, loadImage, canvasBlob } from '../core.js';
import { mountBatch, outName } from '../image-batch.js';
import { isHeic, decodeHeic } from '../heic.js';

const PRESETS = [['', 'Custom size'], ['1080x1080', 'Instagram post — 1080×1080'], ['1080x1350', 'Instagram portrait — 1080×1350'], ['1080x1920', 'Story / Reel / TikTok — 1080×1920'],
  ['1280x720', 'YouTube thumbnail — 1280×720'], ['1500x500', 'X (Twitter) header — 1500×500'], ['1584x396', 'LinkedIn banner — 1584×396'], ['1200x630', 'Link preview (Open Graph) — 1200×630'],
  ['600x600', 'US visa / passport photo — 600×600'], ['128x128', 'Discord / Slack avatar — 128×128']];

mountBatch({
  filter: isImage,
  reject: 'Please choose image files (JPG, PNG, WebP, HEIC).',
  button: 'Resize images',
  zipName: 'resized-images.zip',
  options: () => {
    const box = el('div', { class: 'controls' },
      el('div', { class: 'control wide' }, el('label', { for: 'preset', text: 'Preset' }), el('select', { id: 'preset' }, PRESETS.map(([v, t]) => el('option', { value: v, text: t })))),
      el('div', { class: 'control' }, el('label', { for: 'w', text: 'Width (px)' }), el('input', { type: 'number', id: 'w', min: 1, max: 16000, placeholder: 'auto', class: 'num-input wide' })),
      el('div', { class: 'control' }, el('label', { for: 'h', text: 'Height (px)' }), el('input', { type: 'number', id: 'h', min: 1, max: 16000, placeholder: 'auto', class: 'num-input wide' })),
      el('div', { class: 'control' }, el('label', { for: 'pct', text: 'Or scale (%)' }), el('input', { type: 'number', id: 'pct', min: 1, max: 400, placeholder: '—', class: 'num-input wide' })),
      el('div', { class: 'control' }, el('label', { for: 'fit', text: 'When both sides are set' }),
        el('select', { id: 'fit' }, el('option', { value: 'crop', text: 'Crop to fill (exact size)' }), el('option', { value: 'contain', text: 'Fit inside (no crop)' }), el('option', { value: 'pad', text: 'Fit inside + white bars (exact size)' }))));
    box.querySelector('#preset').addEventListener('change', (e) => { const [w, h] = e.target.value.split('x'); if (w) { $('#w').value = w; $('#h').value = h; $('#pct').value = ''; $('#fit').value = 'crop'; } });
    return box;
  },
  process: async (file) => {
    const src = isHeic(file) ? await decodeHeic(file) : file;
    const url = URL.createObjectURL(src);
    let img;
    try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let W = +$('#w').value || 0, H = +$('#h').value || 0;
    const pct = +$('#pct').value || 0;
    if (pct) { W = Math.round(iw * pct / 100); H = Math.round(ih * pct / 100); }
    else if (W && !H) H = Math.round(ih * W / iw);
    else if (H && !W) W = Math.round(iw * H / ih);
    if (!W || !H) throw new Error('Set a width, a height, a percentage or a preset first.');
    const fit = pct ? 'contain' : $('#fit').value;
    let sx = 0, sy = 0, sw = iw, sh = ih, dx = 0, dy = 0, dw = W, dh = H, cw = W, ch = H;
    if (fit === 'crop') { const k = Math.max(W / iw, H / ih); sw = W / k; sh = H / k; sx = (iw - sw) / 2; sy = (ih - sh) / 2; }
    else if (fit === 'contain' && !pct) { const k = Math.min(W / iw, H / ih); cw = dw = Math.round(iw * k); ch = dh = Math.round(ih * k); }
    else if (fit === 'pad') { const k = Math.min(W / iw, H / ih); dw = Math.round(iw * k); dh = Math.round(ih * k); dx = Math.round((W - dw) / 2); dy = Math.round((H - dh) / 2); }
    const c = el('canvas', { width: cw, height: ch });
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const png = /png/i.test(src.type);
    if (!png || fit === 'pad') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    const type = png ? 'image/png' : /webp/i.test(src.type) ? 'image/webp' : 'image/jpeg';
    const blob = await canvasBlob(c, type, 0.9);
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    return { blob, name: outName(file.name, ext, `-${cw}x${ch}`), dims: `${cw}×${ch}`, note: cw > iw * 1.01 || ch > ih * 1.01 ? 'enlarged beyond the original, so it may look soft.' : '' };
  },
});

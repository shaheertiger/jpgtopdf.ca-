// Compress image: re-encode JPG, PNG or WebP smaller in the browser, optionally to a target
// size (e.g. under 200 KB) or a maximum width. Re-encoding also strips EXIF data such as GPS.
import { $, el, isImage, loadImage, canvasBlob } from '../core.js';
import { mountBatch, outName, hasAlpha } from '../image-batch.js';
import { isHeic, decodeHeic } from '../heic.js';

const sel = (id, label, opts, val) => el('div', { class: 'control' }, el('label', { for: id, text: label }), el('select', { id }, opts.map(([v, t]) => el('option', { value: v, text: t, selected: v === val }))));

mountBatch({
  filter: isImage,
  reject: 'Please choose image files (JPG, PNG, WebP, HEIC).',
  button: 'Compress images',
  zipName: 'compressed-images.zip',
  options: () => el('div', { class: 'controls' },
    sel('q', 'Quality', [['0.85', 'High (85)'], ['0.72', 'Recommended (72)'], ['0.55', 'Small (55)'], ['target', 'Target size…']], '0.72'),
    el('div', { class: 'control' }, el('label', { for: 'target', text: 'Target size (KB)' }), el('input', { type: 'number', id: 'target', min: 10, step: 10, value: 200, class: 'num-input wide' })),
    sel('maxw', 'Max width or height', [['0', 'Keep size'], ['3840', '3840 px (4K)'], ['2048', '2048 px'], ['1920', '1920 px'], ['1440', '1440 px'], ['1080', '1080 px (Instagram)'], ['800', '800 px']], '0'),
    sel('fmt', 'Format', [['auto', 'Auto (JPG; WebP if transparent)'], ['jpg', 'JPG'], ['webp', 'WebP'], ['png', 'PNG (lossless, rarely smaller)']], 'auto')),
  process: async (file) => {
    const src = isHeic(file) ? await decodeHeic(file) : file;
    const url = URL.createObjectURL(src);
    let img;
    try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
    const maxw = +$('#maxw').value;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (maxw && Math.max(w, h) > maxw) { const k = maxw / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
    const c = el('canvas', { width: w, height: h });
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    let fmt = $('#fmt').value;
    if (fmt === 'auto') fmt = hasAlpha(c) ? 'webp' : 'jpg';
    if (fmt === 'jpg') { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    const type = { jpg: 'image/jpeg', webp: 'image/webp', png: 'image/png' }[fmt];
    let blob, note = '';
    if ($('#q').value === 'target' && fmt !== 'png') {
      const limit = (+$('#target').value || 200) * 1024;
      let lo = 0.1, hi = 0.95, best = null;
      for (let i = 0; i < 8; i++) {
        const q = (lo + hi) / 2;
        const b = await canvasBlob(c, type, q);
        if (b.size <= limit) { best = b; lo = q; } else hi = q;
      }
      blob = best || await canvasBlob(c, type, 0.1);
      if (blob.size > limit) note = `could not reach ${$('#target').value} KB at this size — choose a smaller max width.`;
    } else blob = await canvasBlob(c, type, fmt === 'png' ? undefined : +$('#q').value || 0.72);
    if (blob.type !== type) fmt = blob.type === 'image/png' ? 'png' : fmt; // browsers without WebP encoding fall back to PNG
    if (blob.size >= file.size && !maxw && src === file && $('#q').value !== 'target') { blob = file; note = 'already compact; kept the original.'; fmt = file.name.split('.').pop(); }
    return { blob, name: outName(file.name, fmt === 'jpg' ? 'jpg' : fmt, '-compressed'), dims: `${w}×${h}`, note };
  },
});

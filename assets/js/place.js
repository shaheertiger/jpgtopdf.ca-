// Place images (a signature, a logo, a photo) on PDF pages: tap to drop, drag to move,
// drag the corner to resize. Saved with pdf-lib, upright on rotated pages too.
import { el, $, status, renderPage, loadPdfLib } from './core.js';
import { pageGeom } from './pdf-tool.js';

export function placer(ctx, { emptyHint = 'Tap the page where it should go.' } = {}) {
  const n = ctx.pdf.numPages;
  let pageNo = 1, stamp = null, scale = 1, size = null; // size: visual page size in points
  const placements = []; // { page, x, y, w, h, stamp } in visual points, origin top-left
  const stage = el('div', { class: 'place-stage' });
  const pageSel = el('select', { id: 'placePage', 'aria-label': 'Page' }, Array.from({ length: n }, (_, i) => el('option', { value: i + 1, text: `Page ${i + 1} of ${n}` })));
  const nav = el('div', { class: 'place-nav' },
    el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: '← Prev', onclick: () => go(pageNo - 1) }), pageSel,
    el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: 'Next →', onclick: () => go(pageNo + 1) }));
  const hint = el('p', { class: 'hint', text: emptyHint });
  pageSel.addEventListener('change', () => go(+pageSel.value));
  const root = el('div', { class: 'placer' }, nav, stage, hint);

  async function go(p) {
    if (p < 1 || p > n) return;
    pageNo = p; pageSel.value = String(p);
    const width = Math.min(760, (stage.clientWidth || ctx.work.clientWidth || 600));
    const canvas = await renderPage(ctx.pdf, p, { maxWidth: width * Math.min(2, devicePixelRatio || 1) });
    const page = await ctx.pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    size = { w: vp.width, h: vp.height };
    canvas.className = 'place-canvas';
    stage.innerHTML = '';
    stage.append(canvas);
    scale = canvas.getBoundingClientRect().width / size.w || width / size.w;
    draw();
  }
  function draw() {
    stage.querySelectorAll('.stamp').forEach((s) => s.remove());
    scale = (stage.querySelector('canvas')?.getBoundingClientRect().width || 600) / size.w;
    placements.filter((pl) => pl.page === pageNo).forEach((pl) => {
      const box = el('div', { class: 'stamp', style: `left:${pl.x * scale}px;top:${pl.y * scale}px;width:${pl.w * scale}px;height:${pl.h * scale}px` },
        el('img', { src: pl.stamp.url, alt: '', draggable: 'false' }),
        el('button', { type: 'button', class: 'stamp-del', 'aria-label': 'Remove', text: '✕', onclick: (e) => { e.stopPropagation(); placements.splice(placements.indexOf(pl), 1); draw(); update(); } }),
        el('span', { class: 'stamp-handle', 'aria-hidden': 'true' }));
      let mode = null, sx, sy, ox, oy, ow, oh;
      box.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('stamp-del')) return;
        mode = e.target.classList.contains('stamp-handle') ? 'resize' : 'move';
        sx = e.clientX; sy = e.clientY; ox = pl.x; oy = pl.y; ow = pl.w; oh = pl.h;
        box.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
      });
      box.addEventListener('pointermove', (e) => {
        if (!mode) return;
        const dx = (e.clientX - sx) / scale, dy = (e.clientY - sy) / scale;
        if (mode === 'move') { pl.x = Math.max(0, Math.min(size.w - pl.w, ox + dx)); pl.y = Math.max(0, Math.min(size.h - pl.h, oy + dy)); }
        else { const w = Math.max(12, Math.min(size.w - pl.x, ow + dx)); pl.w = w; pl.h = w * (oh / ow); }
        Object.assign(box.style, { left: pl.x * scale + 'px', top: pl.y * scale + 'px', width: pl.w * scale + 'px', height: pl.h * scale + 'px' });
      });
      box.addEventListener('pointerup', () => { mode = null; });
      stage.append(box);
    });
  }
  function update() {
    const c = placements.length;
    hint.textContent = !stamp ? emptyHint : c ? `${c} placed. Drag to move, drag the corner to resize, ✕ to remove. Tap again to add another.` : emptyHint;
  }
  stage.addEventListener('click', (e) => {
    if (!stamp || e.target.closest('.stamp')) return;
    const r = stage.querySelector('canvas').getBoundingClientRect();
    const w = Math.min(size.w * 0.35, stamp.defaultWidth || 160), h = w / stamp.aspect;
    const x = Math.max(0, Math.min(size.w - w, (e.clientX - r.left) / scale - w / 2));
    const y = Math.max(0, Math.min(size.h - h, (e.clientY - r.top) / scale - h / 2));
    placements.push({ page: pageNo, x, y, w, h, stamp });
    draw(); update();
  });
  window.addEventListener('resize', () => size && draw());

  return {
    root,
    start: () => go(1),
    setStamp(s) { stamp = s; update(); },
    placements,
    // Writes every placement into a copy of the PDF and returns the bytes.
    async save() {
      const PDFLib = await loadPdfLib();
      const { PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = PDFLib;
      if (!placements.length) throw new Error('Nothing placed yet. Tap the page to place it.');
      const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const pages = doc.getPages();
      const embedded = new Map();
      for (const pl of placements) {
        let img = embedded.get(pl.stamp);
        if (!img) {
          img = pl.stamp.type === 'jpg' ? await doc.embedJpg(pl.stamp.bytes) : await doc.embedPng(pl.stamp.bytes);
          embedded.set(pl.stamp, img);
        }
        const page = pages[pl.page - 1];
        const g = pageGeom(page);
        // visual (top-left origin) -> visual (bottom-left origin) -> user space
        const bl = g.toUser(pl.x, g.vh - pl.y - pl.h), br = g.toUser(pl.x + pl.w, g.vh - pl.y - pl.h), tl = g.toUser(pl.x, g.vh - pl.y);
        const name = page.node.newXObject('Image', img.ref);
        page.pushOperators(pushGraphicsState(), concatTransformationMatrix(br[0] - bl[0], br[1] - bl[1], tl[0] - bl[0], tl[1] - bl[1], bl[0], bl[1]), drawObject(name), popGraphicsState());
      }
      doc.setProducer('JPGtoPDF.ca');
      return doc.save({ useObjectStreams: true });
    },
  };
}

// Trims transparent (or near-white, when whiteToAlpha) borders and returns PNG bytes + url.
export async function canvasToStamp(canvas, { whiteToAlpha = false, defaultWidth } = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (whiteToAlpha) {
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      // soft edge between 200 and 235 keeps anti-aliased strokes smooth
      d[i + 3] = lum >= 235 ? 0 : lum <= 200 ? d[i + 3] : Math.round(d[i + 3] * (235 - lum) / 35);
    }
    if (d[i + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new Error('The signature is empty. Draw, type or upload one first.');
  ctx.putImageData(img, 0, 0);
  const pad = 4, cw = x1 - x0 + 1 + pad * 2, ch = y1 - y0 + 1 + pad * 2;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(canvas, x0 - pad, y0 - pad, cw, ch, 0, 0, cw, ch);
  const blob = await new Promise((r) => out.toBlob(r, 'image/png'));
  return { type: 'png', bytes: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob), aspect: cw / ch, defaultWidth };
}

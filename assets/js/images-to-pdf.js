// Images -> PDF, used by the homepage (JPG to PDF), HEIC to PDF and Scan to PDF.
// JPEGs are embedded byte-for-byte (no recompression) unless a smaller size is chosen;
// EXIF rotation is applied losslessly with a page transform.
import { $, el, setupDrop, showWork, resetTool, status, progress, run, result, clearResult, loadPdfLib, readBytes,
  jpegOrientation, loadImage, imageToCanvas, canvasBytes, PAGE_SIZES, MM, fmtBytes, tick } from './core.js';

const FR = /^fr/i.test(document.documentElement.lang);
const S = FR ? {
  pageSize: 'Format de page', fit: 'Ajusté à l’image', orientation: 'Orientation', auto: 'Auto', portrait: 'Portrait', landscape: 'Paysage',
  margin: 'Marge', none: 'Aucune', small: 'Petite', medium: 'Moyenne', quality: 'Qualité', original: 'Originale (sans recompression)',
  balanced: 'Équilibrée (plus léger)', smallFile: 'Petit fichier (courriel, portails)', convert: 'Télécharger le PDF', clear: 'Tout effacer',
  add: 'Ajouter des images', rotate: 'Pivoter', remove: 'Retirer', left: 'Avant', right: 'Après', page: 'Page',
  loading: (n) => `Lecture de ${n} image${n > 1 ? 's' : ''}…`, ready: (n) => `${n} image${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''}. Glissez pour changer l’ordre.`,
  building: (i, n) => `Création du PDF… page ${i} sur ${n}`, done: (n) => `Terminé : ${n} page${n > 1 ? 's' : ''}.`,
  skipped: (n) => `${n} image(s) illisible(s) ignorée(s).`, filter: 'Filtre', color: 'Couleur', gray: 'Niveaux de gris', bw: 'Noir et blanc (document)',
  reject: 'Choisissez des images (JPG, PNG, WebP, GIF, BMP).', name: 'images',
} : {
  pageSize: 'Page size', fit: 'Fit to image', orientation: 'Orientation', auto: 'Auto', portrait: 'Portrait', landscape: 'Landscape',
  margin: 'Margin', none: 'None', small: 'Small', medium: 'Medium', quality: 'Quality', original: 'Original (no recompression)',
  balanced: 'Balanced (smaller)', smallFile: 'Small file (email, upload portals)', convert: 'Download PDF', clear: 'Clear all',
  add: 'Add images', rotate: 'Rotate', remove: 'Remove', left: 'Move earlier', right: 'Move later', page: 'Page',
  loading: (n) => `Reading ${n} image${n > 1 ? 's' : ''}…`, ready: (n) => `${n} image${n > 1 ? 's' : ''} ready. Drag to change the order.`,
  building: (i, n) => `Building PDF… page ${i} of ${n}`, done: (n) => `Done: ${n} page${n > 1 ? 's' : ''}.`,
  skipped: (n) => `${n} image(s) could not be read and were skipped.`, filter: 'Filter', color: 'Colour', gray: 'Greyscale', bw: 'Black & white (document)',
  reject: 'Please choose image files (JPG, PNG, WebP, GIF, BMP).', name: 'images',
};

// Quality presets: maxEdge in pixels (0 = keep), JPEG quality. Measured on phone photos:
// balanced is typically 60–80% smaller than original, small 85–95% smaller.
export const QUALITY = { original: { maxEdge: 0, q: 0.92 }, balanced: { maxEdge: 2480, q: 0.82 }, small: { maxEdge: 1600, q: 0.7 } };

const ORIENT_ROT = { 1: 0, 3: 180, 6: 90, 8: 270 }; // lossless cases; 2,4,5,7 are mirrored

function select(id, label, options, value) {
  return el('div', { class: 'control' },
    el('label', { for: id, text: label }),
    el('select', { id }, options.map(([v, t]) => el('option', { value: v, text: t, selected: v === value }))));
}

/**
 * Mounts the image-to-PDF tool.
 * opts.filter(file) -> bool        which files to accept
 * opts.decode(file) -> {blob, kind} optional: convert a file to a browser-readable image (HEIC)
 * opts.scan                         show the colour / greyscale / black & white filter
 * opts.defaults                     { size, quality, filter }
 * opts.fileName                     output name
 */
export function mountImageTool(opts = {}) {
  const items = []; // { id, file, url, w, h, rot, kind, orient, blob }
  let nextId = 1;
  const d = Object.assign({ size: 'fit', quality: 'original', filter: 'color', margin: '0' }, opts.defaults);
  let work, list, actions;

  async function addFiles(files) {
    status(S.loading(files.length));
    if (!work) build();
    let bad = 0;
    for (let k = 0; k < files.length; k++) {
      const file = files[k];
      try {
        progress(k / files.length);
        let blob = file, kind;
        if (opts.decode) ({ blob, kind } = await opts.decode(file));
        const t = (blob.type || '').toLowerCase();
        kind ||= /jpe?g/.test(t) || (!t && /\.jpe?g$/i.test(file.name)) ? 'jpeg' : /png/.test(t) || (!t && /\.png$/i.test(file.name)) ? 'png' : 'other';
        const url = URL.createObjectURL(blob);
        const img = await loadImage(url);
        let orient = 1;
        if (kind === 'jpeg') orient = jpegOrientation(new Uint8Array(await blob.slice(0, 131072).arrayBuffer()));
        items.push({ id: nextId++, file, blob, url, w: img.naturalWidth, h: img.naturalHeight, rot: 0, kind, orient });
        await tick();
      } catch (e) {
        console.warn(file.name, e);
        bad++;
        if (files.length === 1) status(e.message || String(e), 'error');
      }
    }
    progress(null);
    render();
    if (items.length) status(S.ready(items.length) + (bad ? ' ' + S.skipped(bad) : ''), bad ? 'warn' : '');
    else if (bad && files.length > 1) status(S.skipped(bad), 'error');
  }

  function build() {
    work = showWork();
    const controls = el('div', { class: 'controls' },
      select('pageSize', S.pageSize, [['fit', S.fit], ['a4', 'A4'], ['letter', 'Letter'], ['legal', 'Legal']], d.size),
      select('orientation', S.orientation, [['auto', S.auto], ['portrait', S.portrait], ['landscape', S.landscape]], 'auto'),
      select('margin', S.margin, [['0', S.none], ['10', S.small], ['20', S.medium]], d.margin),
      select('quality', S.quality, [['original', S.original], ['balanced', S.balanced], ['small', S.smallFile]], d.quality),
      opts.scan ? select('filter', S.filter, [['color', S.color], ['gray', S.gray], ['bw', S.bw]], d.filter) : null,
    );
    list = el('ul', { class: 'thumbs', 'aria-label': S.name });
    const convert = el('button', { class: 'btn btn-primary', type: 'button', id: 'convertBtn', text: S.convert });
    convert.addEventListener('click', () => run(convert, makePdf));
    actions = el('div', { class: 'actions' }, convert,
      el('button', { class: 'btn btn-ghost', type: 'button', text: S.clear, onclick: () => { items.splice(0).forEach((i) => URL.revokeObjectURL(i.url)); work = null; resetTool(); clearResult(); } }));
    work.append(list, controls, actions);
  }

  function render() {
    list.innerHTML = '';
    items.forEach((it, i) => {
      const li = el('li', { class: 'thumb', draggable: 'true', 'data-id': it.id });
      const img = el('img', { src: it.url, alt: `${S.page} ${i + 1}`, style: `transform:rotate(${it.rot}deg)` });
      li.append(img, el('span', { class: 'num', text: String(i + 1) }),
        el('div', { class: 'thumb-bar' },
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': `${S.left}: ${S.page} ${i + 1}`, text: '←', onclick: () => move(it.id, -1) }),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': `${S.rotate}: ${S.page} ${i + 1}`, text: '↻', onclick: () => { it.rot = (it.rot + 90) % 360; render(); } }),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': `${S.right}: ${S.page} ${i + 1}`, text: '→', onclick: () => move(it.id, 1) }),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': `${S.remove}: ${S.page} ${i + 1}`, text: '✕', onclick: () => remove(it.id) })));
      li.addEventListener('dragstart', (e) => { li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(it.id)); });
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        const order = Array.from(list.children).map((c) => +c.dataset.id);
        items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        render();
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = list.querySelector('.dragging');
        if (!dragging || dragging === li) return;
        const r = li.getBoundingClientRect();
        list.insertBefore(dragging, e.clientX > r.left + r.width / 2 ? li.nextSibling : li);
      });
      list.append(li);
    });
    if (!items.length && work) { work = null; resetTool(); }
  }
  function move(id, dir) {
    const i = items.findIndex((x) => x.id === id), j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    render();
  }
  function remove(id) {
    const i = items.findIndex((x) => x.id === id);
    if (i >= 0) { URL.revokeObjectURL(items[i].url); items.splice(i, 1); }
    render();
    if (items.length) status(S.ready(items.length));
  }

  async function makePdf() {
    if (!items.length) return;
    clearResult();
    const PDFLib = await loadPdfLib();
    const { PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = PDFLib;
    const size = $('#pageSize').value, orientation = $('#orientation').value, margin = (+$('#margin').value || 0) * MM;
    const quality = QUALITY[$('#quality').value] || QUALITY.original;
    const filter = opts.scan ? $('#filter').value : 'color';
    const reencode = quality.maxEdge > 0 || filter !== 'color';
    const doc = await PDFDocument.create();
    doc.setProducer('JPGtoPDF.ca'); doc.setCreator('JPGtoPDF.ca');
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      status(S.building(k + 1, items.length));
      progress(k / items.length);
      await tick();
      let image, rot = it.rot, w = it.w, h = it.h; // w,h = upright (EXIF-applied) size
      const lossless = !reencode && (it.kind === 'png' || (it.kind === 'jpeg' && ORIENT_ROT[it.orient] != null));
      if (lossless) {
        const bytes = await readBytes(it.blob);
        if (it.kind === 'png') image = await doc.embedPng(bytes);
        else {
          image = await doc.embedJpg(bytes);
          rot = (rot + ORIENT_ROT[it.orient]) % 360;
          if (it.orient === 6 || it.orient === 8) [w, h] = [h, w]; // stored size
        }
      } else {
        const img = await loadImage(it.url);
        const canvas = imageToCanvas(img, quality.maxEdge);
        if (filter !== 'color') applyFilter(canvas, filter);
        w = canvas.width; h = canvas.height;
        const keepPng = !reencode && it.kind !== 'jpeg' && /gif|bmp/i.test(it.blob.type || it.file.name);
        if (filter === 'bw') image = await embedBitonal(doc, canvas);
        else image = keepPng ? await doc.embedPng(await canvasBytes(canvas, 'image/png')) : await doc.embedJpg(await canvasBytes(canvas, 'image/jpeg', reencode ? quality.q : 0.92));
        canvas.width = canvas.height = 0;
      }
      // Displayed size after rotation.
      const turned = rot === 90 || rot === 270;
      const dw = turned ? h : w, dh = turned ? w : h;
      let pw, ph, x, y, bw, bh;
      if (size === 'fit') {
        pw = dw * 0.75; ph = dh * 0.75; // 96 px per inch
        x = 0; y = 0; bw = pw; bh = ph;
      } else {
        [pw, ph] = PAGE_SIZES[size];
        const land = orientation === 'auto' ? dw > dh : orientation === 'landscape';
        if (land) [pw, ph] = [ph, pw];
        const aw = pw - 2 * margin, ah = ph - 2 * margin;
        const s = Math.min(aw / dw, ah / dh);
        bw = dw * s; bh = dh * s; x = (pw - bw) / 2; y = (ph - bh) / 2;
      }
      const page = doc.addPage([pw, ph]);
      const name = page.node.newXObject('Image', image.ref);
      const m = rot === 0 ? [bw, 0, 0, bh, x, y]
        : rot === 90 ? [0, -bh, bw, 0, x, y + bh]
        : rot === 180 ? [-bw, 0, 0, -bh, x + bw, y + bh]
        : [0, bh, -bw, 0, x + bw, y];
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...m), drawObject(name), popGraphicsState());
    }
    status(FR ? 'Enregistrement…' : 'Saving…');
    progress(1);
    const bytes = await doc.save();
    progress(null);
    const base = opts.fileName || (items.length === 1 ? items[0].file.name.replace(/\.[^.]+$/, '') : (FR ? 'images' : 'images'));
    result(bytes, base + '.pdf');
    status(S.done(items.length) + ' ' + fmtBytes(bytes.length), 'ok');
  }

  setupDrop({ filter: opts.filter, onFiles: addFiles, reject: opts.reject || S.reject });
  return { addFiles };
}

// Black & white pages are stored as 1-bit images (Flate), typically 5–10x smaller than JPEG.
async function embedBitonal(doc, canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const row = Math.ceil(w / 8);
  const bits = new Uint8Array(row * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4] >= 128) bits[y * row + (x >> 3)] |= 0x80 >> (x & 7);
  const flate = new Uint8Array(await new Response(new Blob([bits]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const stream = doc.context.stream(flate, { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceGray', BitsPerComponent: 1, Filter: 'FlateDecode' });
  return { ref: doc.context.register(stream) };
}

// Greyscale or black & white (adaptive threshold) for scanned paper.
export function applyFilter(canvas, mode) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; p < g.length; i += 4, p++) g[p] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  if (mode === 'gray') {
    // Stretch contrast: map the 2nd..98th percentile to 0..255.
    const hist = new Uint32Array(256); for (const v of g) hist[v]++;
    let lo = 0, hi = 255, acc = 0; const n = g.length;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.02) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.02) { hi = v; break; } }
    const k = 255 / Math.max(1, hi - lo);
    for (let i = 0, p = 0; p < g.length; i += 4, p++) { const v = (g[p] - lo) * k; d[i] = d[i + 1] = d[i + 2] = v; }
  } else {
    // Bradley adaptive threshold with an integral image: removes shadows and uneven light.
    const ii = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += g[y * w + x]; ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row; } }
    const r = Math.max(8, Math.round(Math.max(w, h) / 32)), t = 0.15;
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
        const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
        const sum = ii[(y1 + 1) * (w + 1) + x1 + 1] - ii[y0 * (w + 1) + x1 + 1] - ii[(y1 + 1) * (w + 1) + x0] + ii[y0 * (w + 1) + x0];
        const v = g[y * w + x] * cnt < sum * (1 - t) ? 0 : 255;
        const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

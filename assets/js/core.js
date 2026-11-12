// Shared runtime for every tool page. Everything runs in the browser: files are read with
// the File API, processed with self-hosted libraries under /vendor/, and saved with a
// download link. Nothing is sent to a server.

export const LANG = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
// L({ en, es, fr }) picks the string for the page language (English fallback).
export const L = (m) => (typeof m === 'string' ? m : m[LANG] ?? m.en);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k in n && typeof v !== 'string') n[k] = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

// ---------- libraries (loaded on first use) ----------
const once = (fn) => { let p; return () => (p ||= fn().catch((e) => { p = null; throw e; })); };
function script(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error(L({ en: 'Could not load ' + src + '. Check your connection and reload the page.', es: 'No se pudo cargar ' + src + '. Revisa tu conexión y recarga la página.' })));
    document.head.append(s);
  });
}
export const loadPdfLib = once(async () => { if (!window.PDFLib) await script('/vendor/pdf-lib/pdf-lib.min.js'); return window.PDFLib; });
export const loadPdfjs = once(async () => {
  const lib = await import('/vendor/pdfjs/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
  return lib;
});
export const loadTesseract = once(async () => { if (!window.Tesseract) await script('/vendor/tesseract/tesseract.min.js'); return window.Tesseract; });
export const loadHeic = once(async () => { if (!window.heic2any) await script('/vendor/heic2any/heic2any.min.js'); return window.heic2any; });

// Opens a PDF with pdf.js for rendering or text. Pass a copy of the bytes: pdf.js transfers them.
export async function openPdfjs(bytes, password) {
  const lib = await loadPdfjs();
  const task = lib.getDocument({
    data: bytes.slice(0), password,
    cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
    wasmUrl: '/vendor/pdfjs/wasm/',
    isEvalSupported: false,
  });
  try { return await task.promise; } catch (e) { throw friendlyPdfError(e); }
}

// Opens a PDF with pdf-lib for editing.
export async function openPdfLib(bytes) {
  const { PDFDocument } = await loadPdfLib();
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    throw friendlyPdfError(e);
  }
}

export function friendlyPdfError(e) {
  const m = String((e && (e.message || e.name)) || e);
  if (/encrypt|password/i.test(m)) return new Error(L({ en: 'This PDF is password-protected. Open it in a PDF reader, remove the password (print or save a copy), then try again.', es: 'Este PDF está protegido con contraseña. Ábrelo en un lector de PDF, quita la contraseña (imprime o guarda una copia) y vuelve a intentarlo.' }));
  if (/invalid pdf|failed to parse|no pdf header|unexpected|xref/i.test(m)) return new Error(L({ en: 'This file does not look like a valid PDF, or it is damaged. Try re-saving it from the app that made it.', es: 'Este archivo no parece un PDF válido o está dañado. Prueba a guardarlo de nuevo desde la aplicación que lo creó.' }));
  return e instanceof Error ? e : new Error(m);
}

// ---------- status, progress, busy ----------
let statusEl, barEl;
export function status(msg, kind = '') {
  statusEl ||= $('#status');
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}
export function progress(frac) {
  barEl ||= $('#progress');
  if (!barEl) return;
  if (frac == null) { barEl.hidden = true; return; }
  barEl.hidden = false;
  barEl.value = Math.max(0, Math.min(1, frac));
}
export const tick = () => new Promise((r) => setTimeout(r, 0));

// Runs an async job with the action button disabled and errors shown in the status line.
export async function run(btn, job) {
  const buttons = $$('#tool button');
  buttons.forEach((b) => (b.disabled = true));
  if (btn) btn.setAttribute('aria-busy', 'true');
  try {
    await tick();
    return await job();
  } catch (e) {
    console.error(e);
    status((e && e.message) || String(e), 'error');
    progress(null);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
    if (btn) btn.removeAttribute('aria-busy');
  }
}

// ---------- files ----------
export function readBytes(file) {
  return file.arrayBuffer().then((b) => new Uint8Array(b));
}
export const isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
export const isImage = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(f.name);
export const baseName = (name) => String(name || 'document').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'document';
export function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  return (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
}

// Wires the drop zone (#drop, #file). onFiles receives an array of File.
export function setupDrop({ filter, onFiles, reject = L({ en: 'That file type is not supported here.', es: 'Ese tipo de archivo no es compatible aquí.' }) }) {
  const drop = $('#drop');
  const input = $('#file');
  const take = (list) => {
    const all = Array.from(list || []);
    const ok = filter ? all.filter(filter) : all;
    if (!ok.length) { status(all.length ? reject : '', all.length ? 'error' : ''); return; }
    if (ok.length < all.length) status(L({ en: `${all.length - ok.length} file(s) skipped: wrong type.`, es: `${all.length - ok.length} archivo(s) omitido(s): tipo incorrecto.` }), 'warn');
    else status('');
    onFiles(ok);
  };
  input.addEventListener('change', () => { take(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'dragend'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('drag')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); take(e.dataTransfer && e.dataTransfer.files); });
  // Allow dropping anywhere on the tool section, not only on the box.
  const tool = $('#tool');
  tool.addEventListener('dragover', (e) => e.preventDefault());
  tool.addEventListener('drop', (e) => { if (!drop.contains(e.target)) { e.preventDefault(); take(e.dataTransfer && e.dataTransfer.files); } });
  return { input, drop };
}

// Shows the work area and collapses the drop zone to a small "add more" bar.
export function showWork() {
  const w = $('#work');
  w.hidden = false;
  $('#drop').classList.add('compact');
  return w;
}
export function resetTool() {
  const w = $('#work');
  w.hidden = true;
  w.innerHTML = '';
  $('#drop').classList.remove('compact');
  status('');
  progress(null);
}

// ---------- download ----------
export function download(data, filename, type = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return blob.size;
}

// Shows a result card with the file name, size, and a download button (a second chance
// to save if the browser blocked the automatic download).
export function result(data, filename, type = 'application/pdf', note = '') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const box = $('#result') || $('#tool').appendChild(el('div', { id: 'result', class: 'result' }));
  const url = URL.createObjectURL(blob);
  box.innerHTML = '';
  box.append(
    el('div', { class: 'result-info' }, el('strong', { text: filename }), el('span', { text: fmtBytes(blob.size) + (note ? ' · ' + note : '') })),
    el('a', { class: 'btn btn-primary', href: url, download: filename, text: L({ en: 'Download', es: 'Descargar', fr: 'Télécharger' }) }),
  );
  box.hidden = false;
  download(blob, filename, type);
  track();
  return blob.size;
}
export function clearResult() { const r = $('#result'); if (r) { r.hidden = true; r.innerHTML = ''; } }

// Vercel Web Analytics custom event (no cookies, no file data: only the tool name).
export function track(name = 'tool_complete') {
  try {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('event', { name, data: { tool: $('#tool')?.dataset.tool || location.pathname } });
  } catch { /* analytics is optional */ }
}

// ---------- zip (store only; PDFs and JPEGs are already compressed) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(d) { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function zip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const used = new Set();
  for (const f of files) {
    let name = f.name, k = 2;
    while (used.has(name)) name = f.name.replace(/(\.[^.]+)?$/, ` (${k++})$1`);
    used.add(name);
    const nameB = enc.encode(name);
    const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
    const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nameB.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nameB, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true); c.setUint16(28, nameB.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}

// ---------- page ranges ----------
// "1-3, 5, 8-" -> [0,1,2,4,7,8,...] (0-based, in the order typed, duplicates removed)
export function parseRanges(text, total) {
  const out = [];
  const seen = new Set();
  const src = String(text || '').replace(/\s+/g, '');
  if (!src) throw new Error(L({ en: 'Type the pages you want, for example 1-3, 5.', es: 'Escribe las páginas que quieres, por ejemplo 1-3, 5.' }));
  for (const part of src.split(',')) {
    if (!part) continue;
    const m = part.match(/^(\d*)(?:-(\d*))?$/i);
    if (!m || (!m[1] && !m[2] && !part.includes('-'))) throw new Error(L({ en: `“${part}” is not a page or range. Use numbers like 2 or 4-7.`, es: `«${part}» no es una página ni un intervalo. Usa números como 2 o 4-7.` }));
    let a = m[1] ? +m[1] : 1;
    let b = part.includes('-') ? (m[2] ? +m[2] : total) : a;
    if (a < 1 || b < 1) throw new Error(L({ en: 'Page numbers start at 1.', es: 'Las páginas empiezan en 1.' }));
    if (a > total || b > total) throw new Error(L({ en: `This PDF has ${total} page${total === 1 ? '' : 's'}; “${part}” is outside it.`, es: `Este PDF tiene ${total} página${total === 1 ? '' : 's'}; «${part}» queda fuera.` }));
    const step = a <= b ? 1 : -1;
    for (let p = a; step > 0 ? p <= b : p >= b; p += step) if (!seen.has(p)) { seen.add(p); out.push(p - 1); }
  }
  if (!out.length) throw new Error(L({ en: 'No pages selected.', es: 'No hay páginas seleccionadas.' }));
  return out;
}
export function rangesText(indices) {
  const s = [...new Set(indices)].sort((a, b) => a - b).map((i) => i + 1);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}-${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(', ');
}

// ---------- rendering ----------
export async function renderPage(pdf, pageNo, { scale, maxWidth, maxPixels = 16e6, rotation = 0, background = '#fff' } = {}) {
  const page = await pdf.getPage(pageNo);
  let vp = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 });
  let s = scale || (maxWidth ? maxWidth / vp.width : 1);
  if (vp.width * vp.height * s * s > maxPixels) s = Math.sqrt(maxPixels / (vp.width * vp.height));
  vp = page.getViewport({ scale: s, rotation: (page.rotate + rotation) % 360 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  const ctx = canvas.getContext('2d', { alpha: background == null });
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  await page.render({ canvasContext: ctx, viewport: vp, background: background || undefined }).promise;
  page.cleanup();
  return canvas;
}
export function canvasBlob(canvas, type = 'image/jpeg', quality = 0.9) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error(L({ en: 'The browser could not encode the image (it may be too large).', es: 'El navegador no pudo codificar la imagen (puede ser demasiado grande).' })))), type, quality));
}
export async function canvasBytes(canvas, type, quality) {
  return new Uint8Array(await (await canvasBlob(canvas, type, quality)).arrayBuffer());
}

// Grid of page thumbnails with lazy rendering. Returns { root, cards } where each card has
// .dataset.index (0-based original page). Options decide which controls each card gets.
export function pageGrid(pdf, { selectable = false, rotatable = false, removable = false, sortable = false, onChange = () => {}, label = (i) => `Page ${i + 1}` } = {}) {
  const root = el('ol', { class: 'pages', 'aria-label': 'Pages' });
  const state = [];
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      const i = +en.target.dataset.index;
      renderPage(pdf, i + 1, { maxWidth: 220 }).then((c) => {
        c.className = 'page-canvas';
        en.target.querySelector('.page-img').append(c);
      }).catch(() => { en.target.querySelector('.page-img').textContent = '?'; });
    }
  }, { rootMargin: '400px' });
  for (let i = 0; i < pdf.numPages; i++) {
    const s = { index: i, rotation: 0, selected: false, removed: false };
    state.push(s);
    const card = el('li', { class: 'page', 'data-index': i, draggable: sortable ? 'true' : null });
    const img = el('div', { class: 'page-img' });
    const bar = el('div', { class: 'page-bar' }, el('span', { class: 'page-no', text: String(i + 1) }));
    card.append(img, bar);
    if (selectable) {
      const cb = el('input', { type: 'checkbox', class: 'page-check', 'aria-label': `Select ${label(i)}` });
      cb.addEventListener('change', () => { s.selected = cb.checked; card.classList.toggle('selected', cb.checked); onChange(); });
      img.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });
      bar.append(cb);
    }
    if (rotatable) {
      bar.append(el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Rotate ${label(i)}`, title: 'Rotate 90°', text: '↻', onclick: () => {
        s.rotation = (s.rotation + 90) % 360;
        img.style.setProperty('--rot', s.rotation + 'deg');
        onChange();
      } }));
    }
    if (removable) {
      bar.append(el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Delete ${label(i)}`, title: 'Delete page', text: '✕', onclick: () => {
        s.removed = !s.removed;
        card.classList.toggle('removed', s.removed);
        onChange();
      } }));
    }
    if (sortable) {
      bar.append(
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${label(i)} earlier`, title: 'Move left', text: '←', onclick: () => { if (card.previousElementSibling) { root.insertBefore(card, card.previousElementSibling); renumber(); onChange(); } } }),
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${label(i)} later`, title: 'Move right', text: '→', onclick: () => { if (card.nextElementSibling) { root.insertBefore(card.nextElementSibling, card); renumber(); onChange(); } } }),
      );
      card.addEventListener('dragstart', (e) => { card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); });
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); renumber(); onChange(); });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = root.querySelector('.dragging');
        if (!dragging || dragging === card) return;
        const r = card.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;
        root.insertBefore(dragging, after ? card.nextSibling : card);
      });
    }
    io.observe(card);
    root.append(card);
  }
  function renumber() { $$('.page', root).forEach((c, k) => { c.querySelector('.page-no').textContent = String(k + 1); }); }
  return {
    root,
    state,
    order: () => $$('.page', root).map((c) => state[+c.dataset.index]),
    selected: () => state.filter((s) => s.selected).map((s) => s.index),
    setSelected(indices) {
      const set = new Set(indices);
      for (const s of state) {
        s.selected = set.has(s.index);
        const card = root.children[0] && root.querySelector(`.page[data-index="${s.index}"]`);
        if (card) { card.classList.toggle('selected', s.selected); const cb = card.querySelector('.page-check'); if (cb) cb.checked = s.selected; }
      }
      onChange();
    },
    destroy: () => io.disconnect(),
  };
}

// ---------- images ----------
// Reads the EXIF orientation of a JPEG (1 = upright). Returns 1 for anything else.
export function jpegOrientation(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return 1;
  let o = 2;
  while (o + 4 < v.byteLength) {
    const marker = v.getUint16(o);
    const len = v.getUint16(o + 2);
    if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) {
      const t = o + 10;
      const le = v.getUint16(t) === 0x4949;
      const ifd = t + v.getUint32(t + 4, le);
      const n = v.getUint16(ifd, le);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (e + 10 > v.byteLength) break;
        if (v.getUint16(e, le) === 0x0112) return v.getUint16(e + 8, le) || 1;
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    o += 2 + len;
  }
  return 1;
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('This image could not be read. It may be damaged or in a format this browser cannot open.'));
    img.src = src;
  });
}

// Draws an image (already EXIF-rotated by the browser) to a canvas, optionally scaled so
// the long edge is at most maxEdge pixels.
export function imageToCanvas(img, maxEdge = 0) {
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if (maxEdge && Math.max(w, h) > maxEdge) { const k = maxEdge / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

// Page sizes in PDF points (1 pt = 1/72 inch).
export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };
export const MM = 72 / 25.4;

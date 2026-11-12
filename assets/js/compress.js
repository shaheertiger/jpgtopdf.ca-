// PDF compression engine. It recompresses the images inside a PDF (photos, scans) and leaves
// text, fonts and vector drawings untouched, so text stays sharp and selectable. Works on
// JPEG (DCTDecode) and 8-bit Flate images in grey or RGB; CMYK, JPEG 2000, JBIG2, CCITT,
// masks and unusual colour spaces are kept as they are.
import { loadPdfLib, tick } from './core.js';

export const LEVELS = {
  light: { maxEdge: 3000, q: 0.82 },
  recommended: { maxEdge: 2000, q: 0.7 },
  strong: { maxEdge: 1400, q: 0.55 },
  extreme: { maxEdge: 1000, q: 0.42 },
};

function nameOf(o) { return o && o.asString ? o.asString() : o && o.toString ? o.toString() : ''; }
function num(dict, key, PDFName, def) {
  const v = dict.lookup(PDFName.of(key));
  return v && v.asNumber ? v.asNumber() : def;
}

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate');
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}

// Undo PNG predictors (Predictor >= 10) row by row.
function unpredict(data, colors, columns) {
  const bpp = colors, row = colors * columns, out = new Uint8Array(row * Math.floor(data.length / (row + 1)));
  let prev = new Uint8Array(row);
  for (let r = 0, i = 0, o = 0; i + row < data.length + 1 && o < out.length; r++) {
    const type = data[i++];
    const cur = out.subarray(o, o + row);
    for (let x = 0; x < row; x++) {
      const raw = data[i + x];
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v;
      if (type === 0) v = raw;
      else if (type === 1) v = raw + a;
      else if (type === 2) v = raw + b;
      else if (type === 3) v = raw + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
    prev = cur;
    i += row; o += row;
  }
  return out;
}

function components(cs, PDFName, PDFArray) {
  if (!cs) return 0;
  const n = nameOf(cs);
  if (n === '/DeviceGray' || n === '/CalGray' || n === '/G') return 1;
  if (n === '/DeviceRGB' || n === '/CalRGB' || n === '/RGB') return 3;
  if (cs instanceof PDFArray) {
    const kind = nameOf(cs.lookup(0));
    if (kind === '/ICCBased') { const s = cs.lookup(1); const nn = s && s.dict ? num(s.dict, 'N', PDFName, 0) : 0; return nn === 1 || nn === 3 ? nn : 0; }
    if (kind === '/CalRGB') return 3;
    if (kind === '/CalGray') return 1;
  }
  return 0; // CMYK, Indexed, Lab, Separation, DeviceN: leave alone
}

function toGray(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000; d[i] = d[i + 1] = d[i + 2] = v; }
  ctx.putImageData(img, 0, 0);
}

/**
 * Compresses a PDF. Returns { bytes, images, changed }.
 * opts: { maxEdge, q, gray, onProgress(frac, text) }
 */
export async function compressPdf(input, opts) {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, PDFName, PDFRawStream, PDFArray, PDFDict, PDFRef } = PDFLib;
  const doc = await PDFDocument.load(input, { updateMetadata: false });
  const ctx = doc.context;
  const all = ctx.enumerateIndirectObjects();
  // Images used as soft masks or stencil masks must not be touched.
  const maskRefs = new Set();
  for (const [, obj] of all) {
    const d = obj instanceof PDFRawStream ? obj.dict : null;
    if (!d) continue;
    for (const k of ['SMask', 'Mask']) { const v = d.get(PDFName.of(k)); if (v instanceof PDFRef) maskRefs.add(v.toString()); }
  }
  const images = all.filter(([ref, obj]) => obj instanceof PDFRawStream && nameOf(obj.dict.get(PDFName.of('Subtype'))) === '/Image' && !maskRefs.has(ref.toString()));
  let changed = 0, k = 0;
  for (const [ref, obj] of images) {
    k++;
    if (opts.onProgress && (k % 3 === 0 || k === images.length)) { opts.onProgress(k / images.length, k, images.length); await tick(); }
    try {
      const d = obj.dict;
      const w = num(d, 'Width', PDFName, 0), h = num(d, 'Height', PDFName, 0);
      if (w < 48 || h < 48 || obj.contents.length < 6000) continue;
      if (d.get(PDFName.of('ImageMask')) && nameOf(d.lookup(PDFName.of('ImageMask'))) === 'true') continue;
      if (d.lookup(PDFName.of('Mask')) instanceof PDFArray) continue; // colour-key masks break with lossy JPEG
      if (d.get(PDFName.of('Decode'))) continue;
      let f = d.lookup(PDFName.of('Filter'));
      if (f instanceof PDFArray) { if (f.size() !== 1) continue; f = f.lookup(0); }
      const filter = nameOf(f);
      const comps = components(d.lookup(PDFName.of('ColorSpace')), PDFName, PDFArray);
      if (!comps) continue;
      const bpc = num(d, 'BitsPerComponent', PDFName, 8);
      let source; // ImageBitmap or ImageData
      if (filter === '/DCTDecode') {
        const bmp = await createImageBitmap(new Blob([obj.contents], { type: 'image/jpeg' }), { imageOrientation: 'none' }).catch(() => null);
        if (!bmp || bmp.width !== w || bmp.height !== h) { if (bmp) bmp.close(); continue; }
        source = bmp;
      } else if (filter === '/FlateDecode') {
        if (bpc !== 8) continue;
        let raw = await inflate(obj.contents).catch(() => null);
        if (!raw) continue;
        let parms = d.lookup(PDFName.of('DecodeParms'));
        if (parms instanceof PDFArray) parms = parms.lookup(0);
        const pred = parms instanceof PDFDict ? num(parms, 'Predictor', PDFName, 1) : 1;
        if (pred >= 10) raw = unpredict(raw, num(parms, 'Colors', PDFName, 1), num(parms, 'Columns', PDFName, 1));
        else if (pred !== 1) continue;
        if (raw.length < w * h * comps) continue;
        const rgba = new Uint8ClampedArray(w * h * 4);
        for (let p = 0, s = 0, o = 0; p < w * h; p++, o += 4) {
          if (comps === 3) { rgba[o] = raw[s++]; rgba[o + 1] = raw[s++]; rgba[o + 2] = raw[s++]; } else { rgba[o] = rgba[o + 1] = rgba[o + 2] = raw[s++]; }
          rgba[o + 3] = 255;
        }
        source = new ImageData(rgba, w, h);
      } else continue;

      const scale = Math.min(1, opts.maxEdge / Math.max(w, h));
      const nw = Math.max(1, Math.round(w * scale)), nh = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = nw; canvas.height = nh;
      const c2 = canvas.getContext('2d');
      c2.imageSmoothingQuality = 'high';
      if (source instanceof ImageData) {
        const full = document.createElement('canvas');
        full.width = w; full.height = h;
        full.getContext('2d').putImageData(source, 0, 0);
        c2.drawImage(full, 0, 0, nw, nh);
        full.width = full.height = 0;
      } else { c2.drawImage(source, 0, 0, nw, nh); source.close(); }
      const gray = opts.gray || comps === 1;
      if (gray) toGray(c2, nw, nh);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', opts.q));
      canvas.width = canvas.height = 0;
      if (!blob) continue;
      const jpg = new Uint8Array(await blob.arrayBuffer());
      if (jpg.length >= obj.contents.length * 0.92) continue;
      const nd = { Type: 'XObject', Subtype: 'Image', Width: nw, Height: nh, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode' };
      const smask = d.get(PDFName.of('SMask')); if (smask) nd.SMask = smask;
      const mask = d.get(PDFName.of('Mask')); if (mask instanceof PDFRef) nd.Mask = mask;
      ctx.assign(ref, ctx.stream(jpg, nd));
      changed++;
    } catch (e) {
      console.warn('image skipped', e);
    }
  }
  // Drop the embedded XMP metadata and page thumbnails: they can be large and are rarely needed.
  try { doc.catalog.delete(PDFName.of('Metadata')); } catch { /* ignore */ }
  for (const p of doc.getPages()) { try { p.node.delete(PDFName.of('Thumb')); p.node.delete(PDFName.of('PieceInfo')); } catch { /* ignore */ } }
  doc.setProducer('JPGtoPDF.ca');
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, images: images.length, changed };
}

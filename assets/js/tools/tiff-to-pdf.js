// TIFF to PDF: every page of a (multi-page) TIFF becomes a PDF page. Decoding is done by
// UTIF.js (none, LZW, PackBits, Deflate, CCITT G3/G4, JPEG). Pages are stored losslessly:
// black-and-white pages as 1-bit images (CCITT G4 pages are copied as they are), greyscale,
// RGB and CMYK as Flate. "Fit to image" keeps the size from the TIFF's resolution tags.
import { isImage, isTiff, loadUtif, canvasBlob, canvasBytes } from '../core.js';
import { mountImageTool } from '../images-to-pdf.js';

const ROT = { 3: 180, 6: 90, 8: 270 }; // TIFF Orientation tag; mirrored values are ignored
const THUMB = 360;

const deflate = async (bytes) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
const tag = (ifd, n, k = 0) => (ifd['t' + n] ? ifd['t' + n][k] : undefined);

// Resolution in dots per inch from XResolution/YResolution and ResolutionUnit (2 inch, 3 cm).
function dpi(ifd) {
  const unit = tag(ifd, 296) ?? 2;
  const x = +tag(ifd, 282), y = +(tag(ifd, 283) ?? x);
  if (unit === 1 || !(x > 0) || !(y > 0)) return null;
  const k = unit === 3 ? 2.54 : 1;
  const d = [x * k, y * k];
  return d.every((v) => v >= 20 && v <= 10000) ? d : null;
}

// Turns UTIF's decoded bytes into one of four PDF-ready forms:
//   bw   1 bit per pixel, 0 = black (PDF DeviceGray convention)
//   gray / rgb / cmyk   8 bits per sample (16-bit input keeps the high byte)
function pixels(ifd) {
  const w = ifd.width, h = ifd.height, d = ifd.data;
  const bps = tag(ifd, 258) ?? 1, spp = tag(ifd, 277) ?? 1;
  const photo = tag(ifd, 262) ?? (spp >= 3 ? 2 : 1);
  if ((tag(ifd, 339) ?? 1) === 3) throw new Error('Floating-point TIFFs (HDR, scientific data) are not supported.');
  if (spp > 1 && tag(ifd, 284) === 2) throw new Error('This TIFF stores colour planes separately (planar), which is not supported. Re-save it as "interleaved" or "chunky".');
  if (![1, 2, 4, 8, 16].includes(bps)) throw new Error(`${bps}-bit TIFFs are not supported.`);
  const rowBytes = Math.ceil((w * bps * spp) / 8);
  // One sample as 0–255.
  const sample = (row, i) => {
    if (bps === 8) return d[row + i];
    if (bps === 16) return d[row + 2 * i + 1]; // UTIF leaves 16-bit samples little-endian
    const v = (d[row + ((i * bps) >> 3)] >> (8 - bps - ((i * bps) & 7))) & ((1 << bps) - 1);
    return Math.round((v * 255) / ((1 << bps) - 1));
  };
  if ((photo === 0 || photo === 1) && bps === 1 && spp === 1) {
    const row = Math.ceil(w / 8), out = new Uint8Array(row * h);
    const mask = w % 8 ? (0xff << (8 - (w % 8))) & 0xff : 0xff;
    for (let y = 0; y < h; y++) for (let x = 0; x < row; x++) {
      let b = d[y * rowBytes + x] ?? 0;
      if (photo === 0) b = ~b & 0xff; // WhiteIsZero: flip so 0 = black
      if (x === row - 1) b = (b & mask) | (~mask & 0xff); // padding bits white
      out[y * row + x] = b;
    }
    return { mode: 'bw', w, h, data: out };
  }
  const alpha = spp > ({ 0: 1, 1: 1, 2: 3, 3: 1, 5: 4 }[photo] ?? spp); // extra sample = alpha, flattened on white
  // Palette images stay indexed (the PDF keeps the colour table), up to 8 bits per index.
  if (photo === 3 && spp === 1 && bps <= 8 && ifd.t320) {
    const n = 1 << bps, lut = new Uint8Array(3 * n);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) lut[i * 3 + c] = ifd.t320[c * n + i] >> 8;
    return { mode: 'indexed', w, h, bps, rowBytes, lut, data: d.slice(0, rowBytes * h) };
  }
  const comps = photo === 2 ? 3 : photo === 5 ? 4 : 1;
  const out = new Uint8Array(w * h * (photo === 3 ? 3 : comps));
  const map = tag(ifd, 320) != null ? ifd.t320 : null, n = 1 << bps;
  for (let y = 0, o = 0; y < h; y++) {
    const row = y * rowBytes;
    for (let x = 0; x < w; x++) {
      const s = x * spp;
      const a = alpha ? sample(row, s + spp - 1) / 255 : 1;
      const flat = (v) => Math.round(v * a + 255 * (1 - a));
      if (photo === 0 || photo === 1) { const v = sample(row, s); out[o++] = flat(photo === 0 ? 255 - v : v); }
      else if (photo === 2) { for (let c = 0; c < 3; c++) out[o++] = flat(sample(row, s + c)); }
      else if (photo === 5) { for (let c = 0; c < 4; c++) out[o++] = Math.round(sample(row, s + c) * a); }
      else if (photo === 3 && map) {
        const raw = bps === 16 ? d[row + 2 * s] | (d[row + 2 * s + 1] << 8) : bps === 8 ? d[row + s] : (d[row + ((s * bps) >> 3)] >> (8 - bps - ((s * bps) & 7))) & (n - 1);
        for (let c = 0; c < 3; c++) out[o++] = map[c * n + raw] >> 8;
      } else throw new Error(`This TIFF uses a colour type (${photo}) that is not supported. Re-save it as RGB or greyscale.`);
    }
  }
  return { mode: photo === 3 || photo === 2 ? 'rgb' : photo === 5 ? 'cmyk' : 'gray', w, h, data: out };
}

// JPEG-compressed TIFFs: each strip or tile is a small JPEG (sharing the JPEGTables tag).
// The browser's own decoder handles YCbCr, subsampling and RGB-tagged JPEGs correctly.
async function jpegCanvas(ifd, bytes) {
  const w = ifd.width, h = ifd.height, tiled = !!ifd.t322;
  const tw = tiled ? tag(ifd, 322) : w, th = tiled ? tag(ifd, 323) : Math.min(tag(ifd, 278) ?? h, h);
  const offs = tiled ? ifd.t324 : ifd.t273, lens = tiled ? ifd.t325 : ifd.t279;
  let tables = ifd.t347 ? Uint8Array.from(ifd.t347) : null;
  if (tables) { let e = tables.length - 1; while (e > 0 && !(tables[e - 1] === 0xff && tables[e] === 0xd9)) e--; if (e > 0) tables = tables.subarray(0, e - 1); }
  const across = Math.ceil(w / tw);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let i = 0; i < offs.length; i++) {
    let part = bytes.subarray(offs[i], offs[i] + lens[i]);
    if (tables) { if (part[0] === 0xff && part[1] === 0xd8) part = part.subarray(2); part = new Blob([tables, part]); }
    const bmp = await createImageBitmap(new Blob([part], { type: 'image/jpeg' }));
    ctx.drawImage(bmp, (i % across) * tw, Math.floor(i / across) * th);
    bmp.close();
  }
  return c;
}

// RGBA for the preview and for the Balanced/Small presets.
function toCanvas(px, maxEdge = 0) {
  const k = maxEdge ? Math.min(1, maxEdge / Math.max(px.w, px.h)) : 1;
  if (px.mode === 'canvas') return k === 1 ? px.canvas : scaled(px.canvas, k);
  const full = document.createElement('canvas');
  full.width = px.w; full.height = px.h;
  const ctx = full.getContext('2d');
  // Draw in bands so a 600 dpi A3 scan doesn't need one huge ImageData.
  const band = Math.max(1, Math.floor(4e6 / px.w));
  for (let y0 = 0; y0 < px.h; y0 += band) {
    const bh = Math.min(band, px.h - y0), img = ctx.createImageData(px.w, bh), o = img.data, d = px.data;
    for (let y = 0; y < bh; y++) for (let x = 0; x < px.w; x++) {
      const i = ((y * px.w) + x) * 4, p = (y0 + y) * px.w + x;
      let r, g, b;
      if (px.mode === 'bw') r = g = b = (d[(y0 + y) * Math.ceil(px.w / 8) + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
      else if (px.mode === 'indexed') { const k = 3 * ((d[(y0 + y) * px.rowBytes + ((x * px.bps) >> 3)] >> (8 - px.bps - ((x * px.bps) & 7))) & ((1 << px.bps) - 1)); r = px.lut[k]; g = px.lut[k + 1]; b = px.lut[k + 2]; }
      else if (px.mode === 'gray') r = g = b = d[p];
      else if (px.mode === 'rgb') { r = d[p * 3]; g = d[p * 3 + 1]; b = d[p * 3 + 2]; }
      else { const K = 1 - d[p * 4 + 3] / 255; r = (255 - d[p * 4]) * K; g = (255 - d[p * 4 + 1]) * K; b = (255 - d[p * 4 + 2]) * K; }
      o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255;
    }
    ctx.putImageData(img, 0, y0);
  }
  if (k === 1) return full;
  const c = scaled(full, k);
  full.width = full.height = 0;
  return c;
}
function scaled(src, k) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
  const cx = c.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// PNG "Up" predictor per row: scans and screenshots compress much better with it.
function upFilter(data, rowLen, h) {
  const out = new Uint8Array((rowLen + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (rowLen + 1), r = y * rowLen;
    out[o] = 2;
    for (let x = 0; x < rowLen; x++) out[o + 1 + x] = (data[r + x] - (y ? data[r - rowLen + x] : 0)) & 0xff;
  }
  return out;
}

async function embedPixels(doc, px) {
  // JPEG in, JPEG out: re-saved at quality 92 (Flate would make a lossy source 3–4 times bigger).
  if (px.mode === 'canvas') { const img = await doc.embedJpg(await canvasBytes(px.canvas, 'image/jpeg', 0.92)); px.canvas.width = px.canvas.height = 0; return img; }
  const ctx = doc.context;
  if (px.mode === 'bw') {
    const s = ctx.stream(await deflate(px.data), { Type: 'XObject', Subtype: 'Image', Width: px.w, Height: px.h, ColorSpace: 'DeviceGray', BitsPerComponent: 1, Filter: 'FlateDecode' });
    return { ref: ctx.register(s) };
  }
  if (px.mode === 'indexed') {
    const { PDFName, PDFHexString } = window.PDFLib;
    const hex = Array.from(px.lut, (v) => v.toString(16).padStart(2, '0')).join('');
    const s = ctx.stream(await deflate(px.data), {
      Type: 'XObject', Subtype: 'Image', Width: px.w, Height: px.h, BitsPerComponent: px.bps, Filter: 'FlateDecode',
      ColorSpace: ctx.obj([PDFName.of('Indexed'), PDFName.of('DeviceRGB'), px.lut.length / 3 - 1, PDFHexString.of(hex)]),
    });
    return { ref: ctx.register(s) };
  }
  const colors = { gray: 1, rgb: 3, cmyk: 4 }[px.mode];
  const s = ctx.stream(await deflate(upFilter(px.data, px.w * colors, px.h)), {
    Type: 'XObject', Subtype: 'Image', Width: px.w, Height: px.h, BitsPerComponent: 8, Filter: 'FlateDecode',
    ColorSpace: { gray: 'DeviceGray', rgb: 'DeviceRGB', cmyk: 'DeviceCMYK' }[px.mode],
    DecodeParms: { Predictor: 12, Colors: colors, BitsPerComponent: 8, Columns: px.w },
  });
  return { ref: ctx.register(s) };
}

// A single-strip CCITT Group 4 page is copied into the PDF unchanged (PDF reads G4 natively).
function g4Passthrough(ifd, bytes) {
  if (tag(ifd, 259) !== 4 || (tag(ifd, 266) ?? 1) !== 1 || (tag(ifd, 293) ?? 0) !== 0 || ifd.t322) return null;
  const offs = ifd.t273, lens = ifd.t279;
  if (!offs || !lens || offs.length !== 1) return null;
  const photo = tag(ifd, 262) ?? 0;
  if (photo > 1) return null;
  return { bytes: bytes.subarray(offs[0], offs[0] + lens[0]), photo };
}

async function expand(file) {
  if (!isTiff(file)) return null;
  const UTIF = await loadUtif();
  const buf = await file.arrayBuffer(), bytes = new Uint8Array(buf);
  let ifds;
  try { ifds = UTIF.decode(buf); } catch (e) { throw new Error(`${file.name}: not a readable TIFF file (${e.message || e}).`); }
  // Top-level IFDs are the pages; skip reduced-resolution previews (NewSubfileType bit 0).
  const pageIfds = ifds.filter((f) => f.t256 && f.t257 && !((tag(f, 254) ?? 0) & 1));
  if (!pageIfds.length) throw new Error(`${file.name}: no pages found in this TIFF.`);
  const pages = [];
  for (const ifd of pageIfds) {
    const g4 = g4Passthrough(ifd, bytes);
    const decode = async () => {
      if (tag(ifd, 259) === 7) {
        ifd.width = tag(ifd, 256); ifd.height = tag(ifd, 257);
        try { return { mode: 'canvas', w: ifd.width, h: ifd.height, canvas: await jpegCanvas(ifd, bytes) }; } catch (e) { throw new Error(`${file.name}: the JPEG data in this TIFF could not be decoded.`); }
      }
      UTIF.decodeImage(buf, ifd, ifds);
      if (!ifd.data || !ifd.data.length) throw new Error(`${file.name}: this TIFF's compression (${tag(ifd, 259)}) could not be decoded.`);
      try { return pixels(ifd); } catch (e) { throw new Error(`${file.name}: ${e.message}`); } finally { delete ifd.data; } // keep memory down on long multi-page files
    };
    const px = await decode();
    const thumb = toCanvas(px, THUMB);
    const url = URL.createObjectURL(await canvasBlob(thumb, 'image/png'));
    thumb.width = thumb.height = 0;
    pages.push({
      url, w: px.w, h: px.h, dpi: dpi(ifd), rot: ROT[tag(ifd, 274)] || 0,
      embed: async (doc) => {
        if (g4) {
          const s = doc.context.stream(g4.bytes, {
            Type: 'XObject', Subtype: 'Image', Width: px.w, Height: px.h, ColorSpace: 'DeviceGray', BitsPerComponent: 1, Filter: 'CCITTFaxDecode',
            DecodeParms: { K: -1, Columns: px.w, Rows: px.h, BlackIs1: g4.photo === 1 },
          });
          return { ref: doc.context.register(s) };
        }
        return embedPixels(doc, await decode());
      },
      toCanvas: async () => toCanvas(await decode()),
    });
  }
  return pages;
}

mountImageTool({
  filter: (f) => isTiff(f) || isImage(f),
  reject: 'Please choose TIFF files (.tif or .tiff). JPG and PNG can be mixed in.',
  expand,
  fileName: 'tiff',
});

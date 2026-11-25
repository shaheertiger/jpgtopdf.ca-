// SVG to PDF: each SVG becomes one vector PDF page (svg2pdf.js + jsPDF draw the shapes and
// text as PDF paths and text; the page is then placed with pdf-lib, so SVGs can be mixed with
// photos and laid out on A4 or Letter). "Image" output renders the SVG with the browser at
// 300 dpi instead, for files that use web fonts, filters or scripts the vector path can't draw.
import { $, el, isImage, isSvg, loadSvg2pdf, loadImage } from '../core.js';
import { mountImageTool } from '../images-to-pdf.js';

const NS = 'http://www.w3.org/2000/svg';
const PX = { '': 1, px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, q: 96 / 101.6, in: 96, em: 16, ex: 8 };
const RASTER_DPI = 300, MAX_PIXELS = 50e6;
// Characters the standard PDF fonts (WinAnsi encoding) can show. Text with anything else is drawn as an image.
const WIN_ANSI = /^[\s\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]*$/;

// A length in CSS px, or null for percentages, missing or invalid values.
function len(v) {
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(v || '');
  const u = m && m[2].toLowerCase();
  if (!m || !(u in PX)) return null;
  const n = +m[1] * PX[u];
  return n > 0 ? n : null;
}

async function svgText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) { // .svgz
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  return new TextDecoder().decode(bytes);
}

// Measures an SVG with neither size nor viewBox by its drawn content.
function bbox(svg) {
  const holder = offscreen();
  const copy = document.importNode(svg, true);
  holder.append(copy);
  try { const b = copy.getBBox(); return [Math.max(1, b.x + b.width), Math.max(1, b.y + b.height)]; } catch { return [300, 150]; } finally { holder.remove(); }
}

// Holder that keeps the SVG in the document (svg2pdf reads computed styles) but off screen.
function offscreen() {
  const d = el('div', { 'aria-hidden': 'true', style: 'position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden' });
  document.body.append(d);
  return d;
}

async function expand(file) {
  if (!isSvg(file)) return null;
  const text = await svgText(file);
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (doc.querySelector('parsererror') || svg.localName !== 'svg' || svg.namespaceURI !== NS) throw new Error(`${file.name}: not a valid SVG file (the XML could not be read).`);
  // Scripts and event handlers never run here.
  doc.querySelectorAll('script').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name); });
  // Linked pictures (a file next to the SVG or a web address) can't be reached: only pictures stored inside the SVG are kept.
  let linked = 0;
  doc.querySelectorAll('image').forEach((n) => {
    const href = n.getAttribute('href') || n.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
    if (!/^\s*data:/i.test(href)) { n.remove(); linked++; }
  });
  // Web fonts can't be fetched (and must not load into this page): drop @font-face and @import.
  let webFonts = false;
  doc.querySelectorAll('style').forEach((st) => {
    st.textContent = st.textContent.replace(/@import[^;]*;?|@font-face\s*\{[^}]*\}/gi, () => { webFonts = true; return ''; });
  });
  const otherScript = !WIN_ANSI.test([...doc.querySelectorAll('text')].map((t) => t.textContent).join(''));
  // svg2pdf.js skips masks, filters and HTML, and draws see-through gradient stops as solid.
  const fade = [...doc.querySelectorAll('stop')].some((st) => { const v = st.getAttribute('stop-opacity') ?? (/stop-opacity\s*:\s*([\d.]+)/.exec(st.getAttribute('style') || '') || [])[1]; return v != null && +v < 1; });
  const effects = fade || doc.querySelector('mask, filter, foreignObject') != null;

  // Page size: width/height (any unit) win, then viewBox, then the drawing's own extent.
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const hasVb = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  let w = len(svg.getAttribute('width')), h = len(svg.getAttribute('height'));
  if (!(w && h)) {
    if (hasVb) {
      if (w) h = (w * vb[3]) / vb[2];
      else if (h) w = (h * vb[2]) / vb[3];
      else [w, h] = [vb[2], vb[3]];
    } else {
      const [bw, bh] = bbox(svg);
      w ||= bw; h ||= bh;
    }
  }
  if (!hasVb) svg.setAttribute('viewBox', `0 0 ${w} ${h}`); // user units are px when there is no viewBox
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  const source = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));

  const warn = [
    linked ? `${file.name}: ${linked} linked picture${linked > 1 ? 's are' : ' is'} not stored inside the SVG and ${linked > 1 ? 'were' : 'was'} left out.` : '',
    webFonts ? `${file.name}: its web font is not inside the file, so a standard font is used.` : '',
    otherScript ? `${file.name}: its text uses characters the standard PDF fonts can't show, so this page is saved as a 300 dpi image.` : '',
    effects && !otherScript ? `${file.name}: it uses masks, filters, see-through gradients or HTML, which vector output can't draw exactly; choose Output: Image to keep the exact look.` : '',
  ].filter(Boolean).join(' ');

  return [{
    url, w, h, warn,
    embed: async (pdfDoc) => {
      if ($('#svgOut')?.value === 'image' || otherScript) {
        const canvas = await raster(url, w, h);
        const png = await pdfDoc.embedPng(new Uint8Array(await (await new Promise((r) => canvas.toBlob(r, 'image/png'))).arrayBuffer()));
        canvas.width = canvas.height = 0;
        return png;
      }
      const jsPDF = await loadSvg2pdf();
      const pw = w * 0.75, ph = h * 0.75; // px -> pt
      const pdf = new jsPDF({ unit: 'pt', format: [pw, ph], orientation: pw > ph ? 'landscape' : 'portrait', compress: true, putOnlyUsedFonts: true });
      const holder = offscreen();
      const live = document.importNode(new DOMParser().parseFromString(source, 'image/svg+xml').documentElement, true);
      holder.append(live);
      try { await pdf.svg(live, { x: 0, y: 0, width: pw, height: ph }); } finally { holder.remove(); }
      const [page] = await pdfDoc.embedPdf(pdf.output('arraybuffer'), [0]);
      return { ref: page.ref, form: [page.width, page.height] };
    },
    toCanvas: () => raster(url, w, h),
  }];
}

// The browser draws the SVG at 300 dpi (capped at 50 megapixels) on white.
async function raster(url, w, h) {
  let k = RASTER_DPI / 96;
  if (w * h * k * k > MAX_PIXELS) k = Math.sqrt(MAX_PIXELS / (w * h));
  const img = await loadImage(url);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

mountImageTool({
  filter: (f) => isSvg(f) || isImage(f),
  reject: 'Please choose SVG files (.svg). JPG and PNG can be mixed in.',
  expand,
  quality: false,
  controls: [['svgOut', 'Output', [['vector', 'Vector (sharp, selectable text)'], ['image', 'Image (exact look, 300 dpi)']], 'vector']],
  fileName: 'svg',
});

// Watermark PDF: stamp text (e.g. CONFIDENTIAL, DRAFT, COPY) on every page.
import { $, el, status, run, result, clearResult, loadPdfLib, parseRanges } from '../core.js';
import { mountSinglePdf, saveDoc, pageGeom } from '../pdf-tool.js';

const sel = (id, label, opts, val) => el('div', { class: 'control' }, el('label', { for: id, text: label }), el('select', { id }, opts.map(([v, t]) => el('option', { value: v, text: t, selected: v === val }))));
const COLORS = { grey: [0.5, 0.5, 0.5], red: [0.8, 0.1, 0.1], blue: [0.1, 0.25, 0.75], black: [0, 0, 0] };

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Add watermark' });
    ctx.work.append(
      el('div', { class: 'controls' },
        el('div', { class: 'control wide' }, el('label', { for: 'wm', text: 'Watermark text' }), el('input', { type: 'text', id: 'wm', class: 'text-input', value: 'CONFIDENTIAL', maxlength: 80 })),
        sel('layout', 'Layout', [['diag', 'Diagonal, centred'], ['horiz', 'Horizontal, centred'], ['tile', 'Tiled (repeat)']], 'diag'),
        sel('size', 'Size', [['auto', 'Fit the page'], ['36', '36 pt'], ['60', '60 pt'], ['90', '90 pt']], 'auto'),
        sel('opacity', 'Opacity', [['0.12', 'Light (12%)'], ['0.25', 'Medium (25%)'], ['0.45', 'Strong (45%)']], '0.25'),
        sel('color', 'Colour', [['grey', 'Grey'], ['red', 'Red'], ['blue', 'Blue'], ['black', 'Black']], 'grey'),
        el('div', { class: 'control' }, el('label', { for: 'pages', text: 'Pages' }), el('input', { type: 'text', id: 'pages', class: 'text-input', value: `1-${n}` }))),
      el('p', { class: 'hint', text: 'The watermark is drawn on top of the page as real text, so it prints sharply. Letters outside Western European alphabets are not supported.' }),
      el('div', { class: 'actions' }, go));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const { PDFDocument, StandardFonts, rgb, degrees } = await loadPdfLib();
      const text = $('#wm').value.trim();
      if (!text) throw new Error('Type the watermark text first.');
      const pick = new Set(parseRanges($('#pages').value, n));
      const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const charset = new Set(font.getCharacterSet());
      const safe = [...text].map((c) => (charset.has(c.codePointAt(0)) ? c : '?')).join('');
      if (safe !== text) status('Some characters are not supported by the built-in font and were replaced with “?”.', 'warn');
      const layout = $('#layout').value, sizeOpt = $('#size').value, opacity = +$('#opacity').value;
      const color = rgb(...COLORS[$('#color').value]);
      doc.getPages().forEach((page, i) => {
        if (!pick.has(i)) return;
        const g = pageGeom(page);
        const angle = layout === 'horiz' ? 0 : layout === 'tile' ? 30 : Math.atan2(g.vh, g.vw) * 180 / Math.PI;
        const unit = font.widthOfTextAtSize(safe, 1);
        let size = sizeOpt === 'auto' ? (layout === 'tile' ? Math.min(g.vw, g.vh) / 10 : (Math.hypot(g.vw, g.vh) * (layout === 'horiz' ? 0.55 : 0.6)) / unit) : +sizeOpt;
        if (layout === 'horiz' && sizeOpt === 'auto') size = Math.min(size, (g.vw * 0.85) / unit);
        size = Math.max(8, Math.min(size, 200));
        const w = unit * size, h = size * 0.7;
        const rad = angle * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        const stamp = (cx, cy) => {
          // start point so the text's centre lands on (cx, cy) in visual space
          const vx = cx - (w / 2) * cos + (h / 2) * sin, vy = cy - (w / 2) * sin - (h / 2) * cos;
          const [x, y] = g.toUser(vx, vy);
          page.drawText(safe, { x, y, size, font, color, opacity, rotate: degrees(g.R + angle) });
        };
        if (layout === 'tile') {
          const stepX = w + size * 2, stepY = size * 4;
          for (let cy = -g.vh * 0.2; cy < g.vh * 1.2; cy += stepY) for (let cx = -g.vw * 0.2 + ((cy / stepY) % 2) * stepX / 2; cx < g.vw * 1.2; cx += stepX) stamp(cx, cy);
        } else stamp(g.vw / 2, g.vh / 2);
      });
      status('Saving…');
      result(await saveDoc(doc), `${ctx.name}-watermarked.pdf`);
      status(`Watermarked ${pick.size} page${pick.size === 1 ? '' : 's'}.`, 'ok');
    }));
  },
});

// Add page numbers: draws "1", "Page 1 of 9" etc. on each page, upright even on rotated pages.
import { $, el, status, run, result, clearResult, loadPdfLib, MM } from '../core.js';
import { mountSinglePdf, saveDoc, pageGeom } from '../pdf-tool.js';

const sel = (id, label, opts, val) => el('div', { class: 'control' }, el('label', { for: id, text: label }), el('select', { id }, opts.map(([v, t]) => el('option', { value: v, text: t, selected: v === val }))));

mountSinglePdf({
  needsPdfjs: true,
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Add page numbers' });
    const sample = el('p', { class: 'hint' });
    ctx.work.append(
      el('div', { class: 'controls' },
        sel('pos', 'Position', [['bc', 'Bottom centre'], ['br', 'Bottom right'], ['bl', 'Bottom left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['tl', 'Top left'], ['bo', 'Bottom outside (book)']], 'bc'),
        sel('fmt', 'Format', [['n', '1'], ['page', 'Page 1'], ['of', 'Page 1 of N'], ['slash', '1 / N'], ['dash', '- 1 -']], 'n'),
        sel('size', 'Size', [['9', 'Small (9 pt)'], ['11', 'Medium (11 pt)'], ['14', 'Large (14 pt)']], '11'),
        sel('margin', 'Distance from edge', [['8', '8 mm'], ['12', '12 mm'], ['18', '18 mm']], '12'),
        el('div', { class: 'control' }, el('label', { for: 'from', text: 'Start on page' }), el('input', { type: 'number', id: 'from', min: 1, max: n, value: 1, class: 'num-input wide' })),
        el('div', { class: 'control' }, el('label', { for: 'start', text: 'First number' }), el('input', { type: 'number', id: 'start', min: 0, value: 1, class: 'num-input wide' }))),
      sample, el('div', { class: 'actions' }, go));
    const label = (k, total, f) => f === 'page' ? `Page ${k}` : f === 'of' ? `Page ${k} of ${total}` : f === 'slash' ? `${k} / ${total}` : f === 'dash' ? `- ${k} -` : String(k);
    const preview = () => {
      const from = Math.min(n, Math.max(1, +$('#from').value || 1)), start = +$('#start').value || 0;
      const total = start + (n - from);
      sample.textContent = `Page ${from} will show “${label(start, total, $('#fmt').value)}”` + (from > 1 ? `; pages 1–${from - 1} get no number.` : '.');
    };
    ctx.work.addEventListener('input', preview);
    preview();
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const { PDFDocument, StandardFonts, rgb, degrees } = await loadPdfLib();
      const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pos = $('#pos').value, f = $('#fmt').value, size = +$('#size').value, m = +$('#margin').value * MM;
      const from = Math.min(n, Math.max(1, +$('#from').value || 1)), start = +$('#start').value || 0;
      const total = start + (n - from);
      doc.getPages().forEach((page, i) => {
        if (i + 1 < from) return;
        const k = start + (i + 1 - from);
        const text = label(k, total, f);
        const w = font.widthOfTextAtSize(text, size);
        const g = pageGeom(page);
        let p = pos;
        if (p === 'bo') p = (i + 1) % 2 === 0 ? 'bl' : 'br';
        const vx = p[1] === 'c' ? (g.vw - w) / 2 : p[1] === 'r' ? g.vw - m - w : m;
        const vy = p[0] === 't' ? g.vh - m - size * 0.75 : m;
        const [x, y] = g.toUser(vx, vy);
        page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0), rotate: degrees(g.R) });
      });
      status('Saving…');
      result(await saveDoc(doc), `${ctx.name}-numbered.pdf`);
      status(`Numbered ${n - from + 1} page${n - from + 1 === 1 ? '' : 's'}.`, 'ok');
    }));
  },
});

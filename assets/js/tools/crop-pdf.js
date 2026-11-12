// Crop PDF: drag a box on the preview (or type margins) and apply it to every page.
import { $, el, status, run, result, clearResult, loadPdfLib, renderPage, parseRanges, MM } from '../core.js';
import { mountSinglePdf, saveDoc, pageGeom } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const first = await ctx.pdf.getPage(1);
    const vp = first.getViewport({ scale: 1 });
    const pw = vp.width, ph = vp.height; // visual size of page 1 in points
    const m = { t: 0, r: 0, b: 0, l: 0 }; // margins in points (visual)
    const stage = el('div', { class: 'crop-stage' });
    const box = el('div', { class: 'crop-box', 'aria-hidden': 'true' });
    const num = (id, label) => el('div', { class: 'control' }, el('label', { for: id, text: label }), el('input', { type: 'number', id, min: 0, step: 1, value: 0, class: 'num-input wide' }));
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Crop PDF' });
    ctx.work.append(
      el('p', { class: 'hint', text: 'Drag on the page to draw the area to keep, or type the margins to cut (in millimetres).' }),
      stage,
      el('div', { class: 'controls' }, num('mt', 'Top (mm)'), num('mr', 'Right (mm)'), num('mb', 'Bottom (mm)'), num('ml', 'Left (mm)'),
        el('div', { class: 'control' }, el('label', { for: 'pages', text: 'Pages' }), el('input', { type: 'text', id: 'pages', class: 'text-input', value: `1-${n}` }))),
      el('p', { class: 'hint', text: 'Cropping hides the area outside the box in every PDF reader. The hidden content is still inside the file — to remove it for good, use Flatten PDF (page to image) after cropping.' }),
      el('div', { class: 'actions' }, go));
    const canvas = await renderPage(ctx.pdf, 1, { maxWidth: Math.min(640, ctx.work.clientWidth || 640) });
    canvas.className = 'crop-canvas';
    stage.append(canvas, box);
    const k = () => canvas.getBoundingClientRect().width / pw; // css px per point
    const draw = () => {
      const s = k();
      Object.assign(box.style, { left: m.l * s + 'px', top: m.t * s + 'px', width: Math.max(0, (pw - m.l - m.r) * s) + 'px', height: Math.max(0, (ph - m.t - m.b) * s) + 'px' });
      for (const [id, key] of [['mt', 't'], ['mr', 'r'], ['mb', 'b'], ['ml', 'l']]) if (document.activeElement !== $('#' + id)) $('#' + id).value = (m[key] / MM).toFixed(1).replace(/\.0$/, '');
    };
    for (const [id, key] of [['mt', 't'], ['mr', 'r'], ['mb', 'b'], ['ml', 'l']]) $('#' + id).addEventListener('input', (e) => { m[key] = Math.max(0, (+e.target.value || 0) * MM); draw(); });
    let start = null;
    stage.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      start = [(e.clientX - r.left) / k(), (e.clientY - r.top) / k()];
      stage.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!start) return;
      const r = canvas.getBoundingClientRect();
      const x = Math.min(pw, Math.max(0, (e.clientX - r.left) / k())), y = Math.min(ph, Math.max(0, (e.clientY - r.top) / k()));
      m.l = Math.min(start[0], x); m.r = pw - Math.max(start[0], x); m.t = Math.min(start[1], y); m.b = ph - Math.max(start[1], y);
      draw();
    });
    stage.addEventListener('pointerup', () => { start = null; });
    window.addEventListener('resize', draw);
    draw();
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      if (pw - m.l - m.r < 10 || ph - m.t - m.b < 10) throw new Error('The crop box is too small. Draw a bigger area.');
      if (!m.t && !m.r && !m.b && !m.l) throw new Error('Nothing to crop yet. Drag a box on the page or type margins.');
      const pick = new Set(parseRanges($('#pages').value, n));
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      doc.getPages().forEach((page, i) => {
        if (!pick.has(i)) return;
        const g = pageGeom(page);
        // Same margins (in points) on every page, measured from the visual edges.
        const r = g.rectToUser(Math.min(m.l, g.vw - 10), Math.min(m.b, g.vh - 10), Math.max(10, g.vw - m.l - m.r), Math.max(10, g.vh - m.t - m.b));
        page.setCropBox(r.x, r.y, r.width, r.height);
      });
      status('Saving…');
      result(await saveDoc(doc), `${ctx.name}-cropped.pdf`);
      status(`Cropped ${pick.size} page${pick.size === 1 ? '' : 's'}.`, 'ok');
    }));
  },
});

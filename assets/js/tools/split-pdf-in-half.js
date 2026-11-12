// Split PDF pages in half: turns each two-page spread (a scanned book or booklet) into two pages.
import { $, el, status, run, result, clearResult, loadPdfLib, tick, progress } from '../core.js';
import { mountSinglePdf, saveDoc, pageGeom } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Split pages in half' });
    ctx.work.append(
      el('div', { class: 'controls stack' },
        el('fieldset', { class: 'radios' }, el('legend', { text: 'Cut direction' }),
          el('label', {}, el('input', { type: 'radio', name: 'dir', value: 'v', checked: true }), ' Vertical — left and right halves (book spreads)'),
          el('label', {}, el('input', { type: 'radio', name: 'dir', value: 'h' }), ' Horizontal — top and bottom halves')),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'rtl' }), ' Right half first (right-to-left books, or bottom first)'),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'keepFirst' }), ' Keep the first page whole (cover)'),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'keepLast' }), ' Keep the last page whole (back cover)')),
      el('p', { class: 'hint', text: `${n} page${n === 1 ? '' : 's'} in, up to ${n * 2} pages out. Pages are cut exactly in the middle; nothing is re-rendered, so text stays sharp.` }),
      el('div', { class: 'actions' }, go));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const { PDFDocument } = await loadPdfLib();
      const dir = $('input[name=dir]:checked').value;
      const rtl = $('#rtl').checked, keepFirst = $('#keepFirst').checked, keepLast = $('#keepLast').checked;
      const src = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const out = await PDFDocument.create();
      const total = src.getPageCount();
      for (let i = 0; i < total; i++) {
        if (i % 10 === 0) { status(`Page ${i + 1} of ${total}…`); progress(i / total); await tick(); }
        const whole = (keepFirst && i === 0) || (keepLast && i === total - 1 && total > 1);
        if (whole) { const [p] = await out.copyPages(src, [i]); out.addPage(p); continue; }
        const [a, b] = await out.copyPages(src, [i, i]);
        const g = pageGeom(a);
        const halves = dir === 'v'
          ? [g.rectToUser(0, 0, g.vw / 2, g.vh), g.rectToUser(g.vw / 2, 0, g.vw / 2, g.vh)]
          : [g.rectToUser(0, g.vh / 2, g.vw, g.vh / 2), g.rectToUser(0, 0, g.vw, g.vh / 2)];
        if (rtl) halves.reverse();
        [a, b].forEach((p, k) => {
          const r = halves[k];
          p.setCropBox(r.x, r.y, r.width, r.height);
          p.setMediaBox(r.x, r.y, r.width, r.height);
          p.setTrimBox(r.x, r.y, r.width, r.height);
          p.setBleedBox(r.x, r.y, r.width, r.height);
          out.addPage(p);
        });
      }
      progress(null);
      status('Saving…');
      result(await saveDoc(out), `${ctx.name}-split-half.pdf`);
      status(`Done: ${total} pages became ${out.getPageCount()}.`, 'ok');
    }));
  },
});

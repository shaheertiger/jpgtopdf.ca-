// Split PDF by size: cut a PDF into parts that each stay under a size limit (e.g. 4 MB portals).
import { $, el, status, progress, run, result, clearResult, loadPdfLib, zip, fmtBytes, tick } from '../core.js';
import { mountSinglePdf, saveDoc } from '../pdf-tool.js';

async function build(PDFDocument, src, indices) {
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return saveDoc(doc);
}

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Split by size' });
    ctx.work.append(
      el('div', { class: 'controls' },
        el('div', { class: 'control' }, el('label', { for: 'limit', text: 'Max size per file (MB)' }), el('input', { type: 'number', id: 'limit', min: 0.1, step: 0.1, value: 4, class: 'num-input wide' })),
        el('div', { class: 'control' }, el('label', { for: 'presets', text: 'Common limits' }),
          el('select', { id: 'presets', onchange: (e) => { if (e.target.value) $('#limit').value = e.target.value; } },
            [['', 'Choose…'], ['1', '1 MB'], ['2', '2 MB'], ['4', '4 MB (IRCC)'], ['5', '5 MB'], ['10', '10 MB'], ['20', '20 MB (Outlook)'], ['25', '25 MB (Gmail)']].map(([v, t]) => el('option', { value: v, text: t }))))),
      el('p', { class: 'hint', text: `This PDF is ${fmtBytes(ctx.file.size)} with ${n} pages. Pages are never cut: each part holds whole pages, in order.` }),
      el('div', { class: 'actions' }, go));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const limit = Math.floor((+$('#limit').value || 0) * 1024 * 1024);
      if (limit < 50 * 1024) throw new Error('Choose a limit of at least 0.1 MB.');
      if (ctx.file.size <= limit) { status(`This PDF is already under ${fmtBytes(limit)} — no need to split it.`, 'ok'); return; }
      const { PDFDocument } = await loadPdfLib();
      const src = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const parts = [];
      let cur = [], curBytes = null, oversize = [];
      for (let i = 0; i < n; i++) {
        status(`Checking page ${i + 1} of ${n}… (${parts.length} part${parts.length === 1 ? '' : 's'} so far)`);
        progress(i / n);
        await tick();
        const trial = await build(PDFDocument, src, [...cur, i]);
        if (trial.length <= limit || !cur.length) {
          cur.push(i); curBytes = trial;
          if (cur.length === 1 && trial.length > limit) oversize.push(i + 1);
        } else {
          parts.push({ pages: cur, data: curBytes });
          cur = [i];
          curBytes = await build(PDFDocument, src, cur);
          if (curBytes.length > limit) oversize.push(i + 1);
        }
      }
      if (cur.length) parts.push({ pages: cur, data: curBytes });
      progress(null);
      const files = parts.map((p, k) => ({ name: `${ctx.name}-part-${k + 1}-of-${parts.length}.pdf`, data: p.data }));
      result(zip(files), `${ctx.name}-parts.zip`, 'application/zip', `${files.length} PDFs in a ZIP`);
      const sizes = parts.map((p, k) => `part ${k + 1}: pages ${p.pages[0] + 1}–${p.pages[p.pages.length - 1] + 1}, ${fmtBytes(p.data.length)}`).join('; ');
      status(`Split into ${parts.length} parts — ${sizes}.` + (oversize.length ? ` Page ${oversize.join(', ')} is bigger than the limit on its own; compress the PDF first to get it under.` : ''), oversize.length ? 'warn' : 'ok');
    }));
  },
});

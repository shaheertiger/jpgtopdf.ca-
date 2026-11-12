// Extract PDF pages: pick pages and save them as a new PDF (or one PDF per page).
import { $, el, status, run, result, clearResult, loadPdfLib, pageGrid, parseRanges, rangesText, zip, tick } from '../core.js';
import { mountSinglePdf, copyPages, saveDoc } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const input = el('input', { type: 'text', id: 'ranges', class: 'text-input', placeholder: 'e.g. 1, 3-5', 'aria-label': 'Pages to extract' });
    const info = el('p', { class: 'hint' });
    let syncing = false, typed = null;
    const grid = pageGrid(ctx.pdf, { selectable: true, label: (i) => `page ${i + 1} to extract`, onChange: () => {
      const sel = grid.selected();
      if (!syncing) { input.value = rangesText(sel); typed = null; }
      info.textContent = sel.length ? `${sel.length} page${sel.length === 1 ? '' : 's'} selected.` : 'Tick the pages to extract.';
    } });
    input.addEventListener('input', () => {
      try { syncing = true; typed = input.value.trim() ? parseRanges(input.value, n) : null; grid.setSelected(typed || []); status(''); } catch (e) { status(e.message, 'warn'); } finally { syncing = false; }
    });
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Extract pages' });
    ctx.work.append(
      el('div', { class: 'controls' },
        el('div', { class: 'control wide' }, el('label', { for: 'ranges', text: 'Pages to extract' }), input),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'separate' }), ' Save each page as a separate PDF')),
      grid.root, info, el('div', { class: 'actions sticky' }, go));
    info.textContent = 'Tick the pages to extract, or type them above (typed order is kept).';
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const pick = typed || grid.selected().sort((a, b) => a - b);
      if (!pick.length) throw new Error('No pages selected.');
      const { PDFDocument } = await loadPdfLib();
      const src = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      if ($('#separate').checked && pick.length > 1) {
        const files = [];
        for (let k = 0; k < pick.length; k++) {
          status(`Page ${k + 1} of ${pick.length}…`); await tick();
          files.push({ name: `${ctx.name}-page-${pick[k] + 1}.pdf`, data: await saveDoc(await copyPages(src, [pick[k]])) });
        }
        result(zip(files), `${ctx.name}-pages.zip`, 'application/zip', `${files.length} PDFs in a ZIP`);
      } else {
        result(await saveDoc(await copyPages(src, pick)), `${ctx.name}-extract.pdf`);
      }
      status(`Extracted ${pick.length} page${pick.length === 1 ? '' : 's'}.`, 'ok');
    }));
  },
});

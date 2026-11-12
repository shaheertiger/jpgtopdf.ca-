// Delete PDF pages: tick pages (or type ranges) to remove, save the rest.
import { $, el, status, run, result, clearResult, loadPdfLib, pageGrid, parseRanges, rangesText } from '../core.js';
import { mountSinglePdf, copyPages, saveDoc } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const input = el('input', { type: 'text', id: 'ranges', class: 'text-input', placeholder: 'e.g. 2, 5-7', 'aria-label': 'Pages to delete' });
    const info = el('p', { class: 'hint' });
    let syncing = false;
    const grid = pageGrid(ctx.pdf, { selectable: true, label: (i) => `page ${i + 1} for deletion`, onChange: () => {
      const sel = grid.selected();
      if (!syncing) input.value = rangesText(sel);
      info.textContent = sel.length ? `${sel.length} page${sel.length === 1 ? '' : 's'} will be deleted; ${n - sel.length} will remain.` : 'Tick the pages to delete.';
    } });
    input.addEventListener('input', () => {
      try { syncing = true; grid.setSelected(input.value.trim() ? parseRanges(input.value, n) : []); status(''); } catch (e) { status(e.message, 'warn'); } finally { syncing = false; }
    });
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Delete pages' });
    ctx.work.append(el('div', { class: 'controls' }, el('div', { class: 'control wide' }, el('label', { for: 'ranges', text: 'Pages to delete' }), input)), grid.root, info, el('div', { class: 'actions sticky' }, go));
    info.textContent = 'Tick the pages to delete, or type them above.';
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const del = new Set(grid.selected());
      if (!del.size) throw new Error('No pages selected. Tick the pages you want to delete.');
      if (del.size >= n) throw new Error('You can’t delete every page. Leave at least one.');
      const { PDFDocument } = await loadPdfLib();
      status('Saving…');
      const src = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const keep = src.getPageIndices().filter((i) => !del.has(i));
      result(await saveDoc(await copyPages(src, keep)), `${ctx.name}-edited.pdf`);
      status(`Deleted ${del.size} page${del.size === 1 ? '' : 's'}. ${keep.length} remain.`, 'ok');
    }));
  },
});

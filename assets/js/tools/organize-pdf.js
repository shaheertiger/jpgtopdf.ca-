// Organize PDF: reorder (drag or arrows), rotate and delete pages, then save.
import { el, status, run, result, clearResult, loadPdfLib, pageGrid } from '../core.js';
import { mountSinglePdf, copyPages, saveDoc } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const info = el('p', { class: 'hint' });
    const grid = pageGrid(ctx.pdf, { sortable: true, rotatable: true, removable: true, onChange: () => update() });
    function update() {
      const order = grid.order();
      const kept = order.filter((s) => !s.removed);
      const moved = order.some((s, k) => s.index !== k);
      info.textContent = `${kept.length} of ${order.length} pages kept` + (moved ? ' · order changed' : '') + (order.some((s) => s.rotation) ? ' · some pages rotated' : '');
    }
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Save PDF' });
    ctx.work.append(el('p', { class: 'hint', text: 'Drag pages to reorder (or use ← →). ↻ rotates a page, ✕ deletes it (tap again to restore).' }), grid.root, info, el('div', { class: 'actions sticky' }, go));
    update();
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const { PDFDocument } = await loadPdfLib();
      const kept = grid.order().filter((s) => !s.removed);
      if (!kept.length) throw new Error('Every page is marked for deletion. Restore at least one page.');
      status('Saving…');
      const src = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const doc = await copyPages(src, kept.map((s) => s.index), kept.map((s) => s.rotation));
      result(await saveDoc(doc), `${ctx.name}-organized.pdf`);
      status(`Saved ${kept.length} pages.`, 'ok');
    }));
  },
});

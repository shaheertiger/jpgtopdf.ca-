// Rotate PDF: rotate every page or single pages by 90/180/270 degrees and save.
import { el, status, run, result, clearResult, loadPdfLib, pageGrid, $$ } from '../core.js';
import { mountSinglePdf, saveDoc } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const info = el('p', { class: 'hint' });
    const grid = pageGrid(ctx.pdf, { rotatable: true, onChange: () => update() });
    function update() {
      const r = grid.state.filter((s) => s.rotation).length;
      info.textContent = r ? `${r} page${r === 1 ? '' : 's'} will be rotated.` : 'Tap ↻ on a page, or rotate all pages at once.';
    }
    function rotateAll(deg) {
      grid.state.forEach((s) => { s.rotation = (s.rotation + deg) % 360; });
      $$('.page', grid.root).forEach((c) => c.querySelector('.page-img').style.setProperty('--rot', grid.state[+c.dataset.index].rotation + 'deg'));
      update();
    }
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Save rotated PDF' });
    ctx.work.append(
      el('div', { class: 'controls' },
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: '↺ All left', onclick: () => rotateAll(270) }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: '↻ All right', onclick: () => rotateAll(90) }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: '180° All', onclick: () => rotateAll(180) }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: 'Reset', onclick: () => { grid.state.forEach((s) => { s.rotation = 0; }); rotateAll(0); } })),
      grid.root, info, el('div', { class: 'actions sticky' }, go));
    update();
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const changed = grid.state.filter((s) => s.rotation);
      if (!changed.length) throw new Error('Nothing to rotate yet. Tap ↻ on a page or use the “All” buttons.');
      const { PDFDocument, degrees } = await loadPdfLib();
      status('Saving…');
      const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const pages = doc.getPages();
      for (const s of changed) pages[s.index].setRotation(degrees((pages[s.index].getRotation().angle + s.rotation) % 360));
      result(await saveDoc(doc), `${ctx.name}-rotated.pdf`);
      status(`Rotated ${changed.length} page${changed.length === 1 ? '' : 's'}. Nothing else in the file changed.`, 'ok');
    }));
  },
});

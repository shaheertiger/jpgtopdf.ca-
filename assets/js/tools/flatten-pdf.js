// Flatten PDF: bake form fields into the page, or turn every page into an image
// (which also flattens comments, stamps, signatures and layers).
import { $, el, status, progress, run, result, clearResult, loadPdfLib, renderPage, canvasBytes, tick } from '../core.js';
import { mountSinglePdf, saveDoc } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const { PDFDocument } = await loadPdfLib();
    let fields = 0;
    try { fields = (await PDFDocument.load(ctx.bytes, { updateMetadata: false })).getForm().getFields().length; } catch { /* ignore */ }
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Flatten PDF' });
    ctx.work.append(
      el('div', { class: 'controls stack' },
        el('fieldset', { class: 'radios' }, el('legend', { text: 'What to flatten' }),
          el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'forms', checked: fields > 0 }), ` Form fields only — text stays selectable (${fields} field${fields === 1 ? '' : 's'} found)`),
          el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'image', checked: fields === 0 }), ' Everything — each page becomes an image (comments, stamps, layers included)')),
        el('div', { class: 'control' }, el('label', { for: 'dpi', text: 'Image resolution (Everything mode)' }),
          el('select', { id: 'dpi' }, [['150', '150 DPI (smaller)'], ['200', '200 DPI (recommended)'], ['300', '300 DPI (print)']].map(([v, t]) => el('option', { value: v, text: t, selected: v === '200' }))))),
      el('div', { class: 'actions' }, go));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const mode = $('input[name=mode]:checked').value;
      if (mode === 'forms') {
        if (!fields) throw new Error('This PDF has no fillable form fields. Choose “Everything” to flatten comments and other layers.');
        const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
        try { doc.getForm().flatten(); } catch (e) { throw new Error('This form could not be flattened field by field (' + (e.message || e) + '). Choose “Everything” instead.'); }
        status('Saving…');
        result(await saveDoc(doc), `${ctx.name}-flat.pdf`);
        status(`Flattened ${fields} form field${fields === 1 ? '' : 's'}. The values are now part of the page.`, 'ok');
        return;
      }
      const scale = +$('#dpi').value / 72;
      const out = await PDFDocument.create();
      for (let i = 1; i <= n; i++) {
        status(`Rendering page ${i} of ${n}…`); progress((i - 1) / n); await tick();
        const page = await ctx.pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const canvas = await renderPage(ctx.pdf, i, { scale, maxPixels: 30e6 });
        const img = await out.embedJpg(await canvasBytes(canvas, 'image/jpeg', 0.88));
        canvas.width = canvas.height = 0;
        const p = out.addPage([vp.width, vp.height]);
        p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      }
      progress(null);
      status('Saving…');
      result(await saveDoc(out), `${ctx.name}-flat.pdf`);
      status(`Flattened ${n} page${n === 1 ? '' : 's'} to images. Text is no longer selectable; run OCR PDF if you need it searchable.`, 'ok');
    }));
  },
});

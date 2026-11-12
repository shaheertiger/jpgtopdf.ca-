// Split PDF: every page, every N pages, or custom ranges. Several files download as a ZIP.
import { L, $, el, status, progress, run, result, clearResult, loadPdfLib, parseRanges, zip, tick } from '../core.js';
import { mountSinglePdf, copyPages, saveDoc } from '../pdf-tool.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const mode = el('div', { class: 'controls stack' },
      el('fieldset', { class: 'radios' }, el('legend', { text: L({ en: 'How to split', es: 'Cómo dividir' }) }),
        el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'each', checked: true }), ' ' + L({ en: 'Every page into its own PDF', es: 'Cada página en un PDF' })),
        el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'every' }), ' ' + L({ en: 'Every', es: 'Cada' }) + ' ', el('input', { type: 'number', id: 'everyN', min: 1, max: n, value: Math.min(2, n), class: 'num-input', 'aria-label': L({ en: 'Pages per file', es: 'Páginas por archivo' }) }), ' ' + L({ en: 'pages', es: 'páginas' })),
        el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'ranges' }), ' ' + L({ en: 'Custom ranges, one file each:', es: 'Intervalos propios, un archivo cada uno:' }) + ' ', el('input', { type: 'text', id: 'ranges', placeholder: L({ en: 'e.g. ', es: 'p. ej. ' }) + `1-3, 4-${Math.max(4, Math.min(n, 8))}, ${Math.min(n, 9)}-`, class: 'text-input', 'aria-label': L({ en: 'Page ranges', es: 'Intervalos de páginas' }) }))));
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: L({ en: 'Split PDF', es: 'Dividir PDF' }) });
    ctx.work.append(mode, el('p', { class: 'hint', text: L({ en: `This PDF has ${n} pages. Ranges use commas between files: “1-3, 4-6” gives two files.`, es: `Este PDF tiene ${n} páginas. Separa los archivos con comas: «1-3, 4-6» da dos archivos.` }) }), el('div', { class: 'actions' }, go));
    $('#ranges').addEventListener('focus', () => { $('input[name=mode][value=ranges]').checked = true; });
    $('#everyN').addEventListener('focus', () => { $('input[name=mode][value=every]').checked = true; });
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const { PDFDocument } = await loadPdfLib();
      const m = $('input[name=mode]:checked').value;
      let groups = [];
      if (m === 'each') groups = Array.from({ length: n }, (_, i) => [i]);
      else if (m === 'every') {
        const k = Math.max(1, Math.floor(+$('#everyN').value || 1));
        for (let i = 0; i < n; i += k) groups.push(Array.from({ length: Math.min(k, n - i) }, (_, j) => i + j));
      } else {
        const txt = $('#ranges').value.trim();
        if (!txt) throw new Error(L({ en: 'Type at least one range, for example 1-3, 4-6.', es: 'Escribe al menos un intervalo, por ejemplo 1-3, 4-6.' }));
        groups = txt.split(',').filter((s) => s.trim()).map((part) => parseRanges(part, n));
      }
      if (groups.length === 1 && groups[0].length === n) throw new Error(L({ en: 'That would give back the same PDF. Choose smaller ranges.', es: 'Eso devolvería el mismo PDF. Elige intervalos más pequeños.' }));
      const src = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const outFiles = [];
      const pad = String(n).length;
      for (let g = 0; g < groups.length; g++) {
        status(L({ en: `Creating file ${g + 1} of ${groups.length}…`, es: `Creando archivo ${g + 1} de ${groups.length}…` }));
        progress(g / groups.length);
        await tick();
        const doc = await copyPages(src, groups[g]);
        const a = groups[g][0] + 1, b = groups[g][groups[g].length - 1] + 1;
        const label = groups[g].length === 1 ? L({ en: 'page', es: 'pagina' }) + `-${String(a).padStart(pad, '0')}` : L({ en: 'pages', es: 'paginas' }) + `-${String(a).padStart(pad, '0')}-${String(b).padStart(pad, '0')}`;
        outFiles.push({ name: `${ctx.name}-${label}.pdf`, data: await saveDoc(doc) });
      }
      progress(null);
      if (outFiles.length === 1) result(outFiles[0].data, outFiles[0].name);
      else result(zip(outFiles), `${ctx.name}-${L({ en: 'split', es: 'dividido' })}.zip`, 'application/zip', L({ en: `${outFiles.length} PDFs in a ZIP`, es: `${outFiles.length} PDF en un ZIP` }));
      status(L({ en: `Split into ${outFiles.length} PDF${outFiles.length === 1 ? '' : 's'}.`, es: `Dividido en ${outFiles.length} PDF.` }), 'ok');
    }));
  },
});

// Shared by PDF to JPG and PDF to PNG: renders pages with pdf.js and saves images (ZIP for many).
import { $, el, status, progress, run, result, clearResult, renderPage, canvasBytes, parseRanges, zip, tick } from '../core.js';
import { mountSinglePdf } from '../pdf-tool.js';

export function mountPdfToImage(fmt) {
  const jpg = fmt === 'jpg';
  mountSinglePdf({
    onLoad: async (ctx) => {
      const n = ctx.pdf.numPages;
      const go = el('button', { class: 'btn btn-primary', type: 'button', text: `Convert to ${jpg ? 'JPG' : 'PNG'}` });
      ctx.work.append(
        el('div', { class: 'controls' },
          el('div', { class: 'control' }, el('label', { for: 'dpi', text: 'Resolution' }),
            el('select', { id: 'dpi' }, [['72', '72 DPI (screen, small)'], ['150', '150 DPI (recommended)'], ['200', '200 DPI'], ['300', '300 DPI (print)']].map(([v, t]) => el('option', { value: v, text: t, selected: v === '150' })))),
          jpg ? el('div', { class: 'control' }, el('label', { for: 'q', text: 'JPG quality' }),
            el('select', { id: 'q' }, [['0.95', 'Maximum'], ['0.85', 'High (recommended)'], ['0.7', 'Medium (smaller)']].map(([v, t]) => el('option', { value: v, text: t, selected: v === '0.85' })))) : null,
          el('div', { class: 'control' }, el('label', { for: 'pages', text: 'Pages' }), el('input', { type: 'text', id: 'pages', class: 'text-input', value: n > 1 ? `1-${n}` : '1', 'aria-describedby': 'pages-hint' }))),
        el('p', { class: 'hint', id: 'pages-hint', text: `${n} page${n === 1 ? '' : 's'}. One image per page; several images download as a ZIP.` + (jpg ? '' : ' PNG is lossless and bigger than JPG.') }),
        el('div', { class: 'actions' }, go));
      go.addEventListener('click', () => run(go, async () => {
        clearResult();
        const pick = parseRanges($('#pages').value, n);
        const scale = +$('#dpi').value / 72;
        const q = jpg ? +$('#q').value : undefined;
        const files = [];
        const pad = String(n).length;
        for (let k = 0; k < pick.length; k++) {
          status(`Rendering page ${pick[k] + 1} (${k + 1} of ${pick.length})…`);
          progress(k / pick.length);
          await tick();
          const canvas = await renderPage(ctx.pdf, pick[k] + 1, { scale, maxPixels: 40e6, background: jpg ? '#ffffff' : '#ffffff' });
          files.push({ name: `${ctx.name}-page-${String(pick[k] + 1).padStart(pad, '0')}.${fmt}`, data: await canvasBytes(canvas, jpg ? 'image/jpeg' : 'image/png', q) });
          canvas.width = canvas.height = 0;
        }
        progress(null);
        if (files.length === 1) result(files[0].data, files[0].name, jpg ? 'image/jpeg' : 'image/png');
        else result(zip(files), `${ctx.name}-${fmt}.zip`, 'application/zip', `${files.length} images in a ZIP`);
        status(`Converted ${files.length} page${files.length === 1 ? '' : 's'} to ${jpg ? 'JPG' : 'PNG'}.`, 'ok');
      }));
    },
  });
}

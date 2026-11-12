// PDF to text: pulls the text layer out of a PDF with pdf.js (no OCR) into a .txt file.
import { $, el, status, progress, run, result, clearResult, tick } from '../core.js';
import { mountSinglePdf } from '../pdf-tool.js';
import { pageText } from '../text.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Extract text' });
    const out = el('textarea', { id: 'out', class: 'text-out', rows: 12, readonly: true, 'aria-label': 'Extracted text', hidden: true });
    const copy = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Copy text', hidden: true, onclick: async () => { try { await navigator.clipboard.writeText(out.value); status('Copied to the clipboard.', 'ok'); } catch { out.select(); document.execCommand('copy'); } } });
    ctx.work.append(
      el('div', { class: 'controls' }, el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'markers', checked: true }), ' Mark where each page starts')),
      el('div', { class: 'actions' }, go, copy), out);
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const parts = [];
      let empty = 0;
      for (let i = 1; i <= n; i++) {
        if (i % 5 === 1) { status(`Reading page ${i} of ${n}…`); progress(i / n); await tick(); }
        const page = await ctx.pdf.getPage(i);
        const t = await pageText(page);
        page.cleanup();
        if (!t) empty++;
        parts.push(($('#markers').checked ? `--- Page ${i} ---\n` : '') + t);
      }
      progress(null);
      const text = parts.join('\n\n');
      out.value = text; out.hidden = false; copy.hidden = false;
      if (empty === n) {
        status('No text found: this PDF is probably a scan (pictures of pages). Use OCR PDF to read the text from the images.', 'warn');
        const a = el('a', { href: '/ocr-pdf/', text: 'Open OCR PDF →', class: 'btn btn-ghost' });
        $('.actions', ctx.work).append(a);
        return;
      }
      result(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${ctx.name}.txt`, 'text/plain');
      status(`Extracted ${text.length.toLocaleString()} characters from ${n - empty} of ${n} pages.` + (empty ? ` ${empty} page(s) had no text layer (likely scanned) — use OCR PDF for those.` : ''), empty ? 'warn' : 'ok');
    }));
  },
});

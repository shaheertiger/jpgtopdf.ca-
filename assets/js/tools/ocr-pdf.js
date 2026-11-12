// OCR PDF: makes a scanned PDF searchable. Each page is read with Tesseract and an invisible
// text layer is laid over the original page, which is kept exactly as it was.
import { $, el, status, progress, run, result, clearResult, loadPdfLib, renderPage, tick } from '../core.js';
import { mountSinglePdf, saveDoc, pageGeom } from '../pdf-tool.js';
import { getWorker, langPicker, linesOf } from '../ocr.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const n = ctx.pdf.numPages;
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Make searchable (OCR)' });
    const out = el('textarea', { class: 'text-out', rows: 8, readonly: true, hidden: true, 'aria-label': 'Recognised text' });
    ctx.work.append(
      el('div', { class: 'controls' }, langPicker(),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'skip', checked: true }), ' Skip pages that already have text')),
      el('p', { class: 'hint', text: `${n} page${n === 1 ? '' : 's'}. Expect roughly 3–10 seconds per page on a laptop, longer on a phone. Keep this tab open.` }),
      el('div', { class: 'actions' }, go), out);
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const PDFLib = await loadPdfLib();
      const { PDFDocument, StandardFonts, pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextRenderingMode, TextRenderingMode, setTextMatrix, setCharacterSqueeze, showText } = PDFLib;
      const worker = await getWorker($('#lang').value);
      const doc = await PDFDocument.load(ctx.bytes, { updateMetadata: false });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const charset = new Set(font.getCharacterSet());
      const clean = (s) => [...s.normalize('NFC')].map((c) => (charset.has(c.codePointAt(0)) ? c : charset.has(c.normalize('NFD').codePointAt(0)) ? c.normalize('NFD')[0] : '?')).join('');
      const pages = doc.getPages();
      const texts = [];
      let done = 0, skipped = 0, words = 0;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) {
        const pjs = await ctx.pdf.getPage(i + 1);
        if ($('#skip').checked) {
          const tc = await pjs.getTextContent();
          if (tc.items.filter((it) => it.str && it.str.trim()).length > 10) { skipped++; texts.push(''); continue; }
        }
        const eta = done ? ` · about ${Math.ceil(((performance.now() - t0) / done) * (n - i) / 1000)} s left` : '';
        status(`Reading page ${i + 1} of ${n}…${eta}`);
        progress(i / n);
        await tick();
        const vp1 = pjs.getViewport({ scale: 1 });
        const canvas = await renderPage(ctx.pdf, i + 1, { scale: 300 / 72, maxPixels: 14e6 });
        const s = canvas.width / vp1.width; // canvas px per visual point
        const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
        canvas.width = canvas.height = 0;
        texts.push(data.text || '');
        const page = pages[i];
        const g = pageGeom(page);
        const key = page.node.newFontDictionary(font.name, font.ref);
        const rad = (g.R * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
        for (const line of linesOf(data)) {
          const bl = line.baseline && line.baseline.has_baseline !== false ? line.baseline : null;
          line.words.forEach((w, k) => {
            const text = clean(w.text.trim());
            if (!text) return;
            const x0 = w.bbox.x0, x1 = w.bbox.x1, hpx = Math.max(4, w.bbox.y1 - w.bbox.y0);
            let by = w.bbox.y1 - hpx * 0.18;
            if (bl && bl.x1 !== bl.x0) by = bl.y0 + ((bl.y1 - bl.y0) * (x0 - bl.x0)) / (bl.x1 - bl.x0);
            const size = Math.max(3, (hpx / s) * 0.95);
            const widthPts = (x1 - x0) / s;
            const str = text + (k < line.words.length - 1 ? ' ' : '');
            const natural = font.widthOfTextAtSize(text, size);
            const squeeze = natural > 0 ? Math.max(10, Math.min(500, (100 * widthPts) / natural)) : 100;
            const [ux, uy] = g.toUser(x0 / s, g.vh - by / s);
            ops.push(setFontAndSize(key, size), setCharacterSqueeze(squeeze), setTextMatrix(cos, sin, -sin, cos, ux, uy), showText(font.encodeText(str)));
            words++;
          });
        }
        ops.push(endText(), popGraphicsState());
        page.pushOperators(...ops);
        done++;
      }
      progress(null);
      if (!done) { status('Every page already has text, so there is nothing to OCR. Untick “Skip pages that already have text” to OCR them anyway.', 'warn'); return; }
      status('Saving…');
      result(await saveDoc(doc), `${ctx.name}-searchable.pdf`);
      out.value = texts.map((t, i) => (t ? `--- Page ${i + 1} ---\n${t.trim()}` : '')).filter(Boolean).join('\n\n');
      out.hidden = false;
      status(`Done: ${words.toLocaleString()} words recognised on ${done} page${done === 1 ? '' : 's'}` + (skipped ? ` (${skipped} already had text and were skipped)` : '') + '. The pages look the same; the text can now be searched and copied.', 'ok');
    }));
  },
});

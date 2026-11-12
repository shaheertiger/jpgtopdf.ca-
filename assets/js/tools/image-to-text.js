// Image to text (OCR): reads the text in photos, scans and screenshots with Tesseract.
import { $, el, setupDrop, showWork, resetTool, status, progress, run, result, clearResult, isImage, loadImage, imageToCanvas, tick } from '../core.js';
import { getWorker, langPicker } from '../ocr.js';

const files = [];
let work, list;

function build() {
  work = showWork();
  list = el('ul', { class: 'file-list' });
  const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Extract text' });
  const out = el('textarea', { id: 'out', class: 'text-out', rows: 12, readonly: true, hidden: true, 'aria-label': 'Extracted text' });
  const copy = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Copy text', hidden: true, onclick: async () => { try { await navigator.clipboard.writeText(out.value); status('Copied to the clipboard.', 'ok'); } catch { out.select(); document.execCommand('copy'); } } });
  work.append(list, el('div', { class: 'controls' }, langPicker()), el('div', { class: 'actions' }, go, copy,
    el('button', { class: 'btn btn-ghost', type: 'button', text: 'Clear', onclick: () => { files.length = 0; work = null; resetTool(); clearResult(); } })), out);
  go.addEventListener('click', () => run(go, async () => {
    clearResult();
    const worker = await getWorker($('#lang').value);
    const parts = [];
    let conf = 0;
    for (let k = 0; k < files.length; k++) {
      status(`Reading image ${k + 1} of ${files.length}…`);
      progress(k / files.length);
      await tick();
      const url = URL.createObjectURL(files[k]);
      try {
        const img = await loadImage(url);
        const canvas = imageToCanvas(img, 4000);
        const { data } = await worker.recognize(canvas);
        conf += data.confidence || 0;
        parts.push((files.length > 1 ? `--- ${files[k].name} ---\n` : '') + (data.text || '').trim());
      } finally { URL.revokeObjectURL(url); }
    }
    progress(null);
    const text = parts.join('\n\n');
    out.value = text; out.hidden = false; copy.hidden = false;
    const avg = Math.round(conf / files.length);
    if (!text.replace(/---.*---/g, '').trim()) { status('No text was found. Try a sharper, brighter photo taken straight on, or pick the right language.', 'warn'); return; }
    result(new Blob([text], { type: 'text/plain;charset=utf-8' }), files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') + '.txt' : 'image-text.txt', 'text/plain', `average confidence ${avg}%`);
    status(`Done. Average confidence ${avg}%` + (avg < 70 ? ' — low: check the text carefully, or retake the photo in better light.' : '.'), avg < 70 ? 'warn' : 'ok');
  }));
}

function render() {
  list.innerHTML = '';
  files.forEach((f, i) => list.append(el('li', { class: 'file-row' }, el('span', { class: 'file-no', text: String(i + 1) }),
    el('div', { class: 'file-meta' }, el('strong', { text: f.name })),
    el('div', { class: 'row-btns' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${f.name}`, text: '✕', onclick: () => { files.splice(i, 1); if (!files.length) { work = null; resetTool(); } else render(); } })))));
}

setupDrop({
  filter: (f) => isImage(f) && !/\.(heic|heif)$/i.test(f.name),
  reject: 'Please choose image files (JPG, PNG, WebP, screenshots). For a PDF, use OCR PDF.',
  onFiles: (fs) => { if (!work) build(); files.push(...fs); render(); status(`${files.length} image${files.length === 1 ? '' : 's'} ready.`); },
});

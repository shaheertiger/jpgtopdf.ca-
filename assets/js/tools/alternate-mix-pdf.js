// Alternate & mix PDF: interleave pages from two or more PDFs (A1, B1, A2, B2, …).
// The usual job: front sides and back sides scanned separately on a one-sided scanner.
import { el, setupDrop, showWork, resetTool, status, progress, run, result, clearResult, loadPdfLib, readBytes, isPdf, fmtBytes, friendlyPdfError, tick } from '../core.js';
import { saveDoc } from '../pdf-tool.js';

const files = []; // { id, file, bytes, pages, reverse }
let nextId = 1, list, work;

async function add(newFiles) {
  const { PDFDocument } = await loadPdfLib();
  if (!work) build();
  for (const file of newFiles) {
    try {
      const bytes = await readBytes(file);
      const doc = await PDFDocument.load(bytes, { updateMetadata: false }).catch((e) => { throw friendlyPdfError(e); });
      files.push({ id: nextId++, file, bytes, pages: doc.getPageCount(), reverse: files.length === 1 && false });
    } catch (e) { status(`${file.name}: ${e.message}`, 'error'); await tick(); }
  }
  render();
  if (files.length === 1) status('Add the second PDF (for example, the back sides).');
  else if (files.length > 1) status(preview());
}

function preview() {
  const seq = [];
  const max = Math.max(...files.map((f) => f.pages));
  const L = 'ABCDEFGHIJ';
  for (let i = 0; i < max && seq.length < 8; i++) files.forEach((f, k) => { if (i < f.pages) seq.push(`${L[k] || k + 1}${f.reverse ? f.pages - i : i + 1}`); });
  return `Order: ${seq.join(', ')}${files.reduce((a, f) => a + f.pages, 0) > 8 ? ', …' : ''}`;
}

function build() {
  work = showWork();
  list = el('ol', { class: 'file-list', 'aria-label': 'PDFs to mix, in order' });
  const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Mix PDFs' });
  go.addEventListener('click', () => run(go, mix));
  work.append(list, el('p', { class: 'hint', text: 'Pages are taken one at a time from each file in turn. If one file runs out, the rest of the other file is added at the end.' }),
    el('div', { class: 'actions' }, go, el('button', { class: 'btn btn-ghost', type: 'button', text: 'Clear all', onclick: () => { files.length = 0; work = null; resetTool(); clearResult(); } })));
}

function render() {
  list.innerHTML = '';
  const L = 'ABCDEFGHIJ';
  files.forEach((f, i) => {
    const rev = el('input', { type: 'checkbox', checked: f.reverse, onchange: (e) => { f.reverse = e.target.checked; status(preview()); } });
    list.append(el('li', { class: 'file-row' },
      el('span', { class: 'file-no', text: L[i] || String(i + 1) }),
      el('div', { class: 'file-meta' }, el('strong', { text: f.file.name }), el('span', { text: `${f.pages} page${f.pages === 1 ? '' : 's'} · ${fmtBytes(f.file.size)}` }),
        el('label', { class: 'check small' }, rev, ' Reverse order (last page first)')),
      el('div', { class: 'row-btns' },
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${f.file.name} up`, text: '↑', disabled: i === 0, onclick: () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; render(); status(preview()); } }),
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${f.file.name}`, text: '✕', onclick: () => { files.splice(i, 1); if (!files.length) { work = null; resetTool(); } else { render(); } } }))));
  });
}

async function mix() {
  if (files.length < 2) throw new Error('Add at least two PDFs to mix.');
  clearResult();
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  const srcs = [];
  for (const f of files) srcs.push(await PDFDocument.load(f.bytes, { updateMetadata: false }));
  const copied = [];
  for (let k = 0; k < files.length; k++) {
    status(`Reading ${files[k].file.name}…`); progress(k / files.length); await tick();
    const idx = srcs[k].getPageIndices();
    if (files[k].reverse) idx.reverse();
    copied.push(await out.copyPages(srcs[k], idx));
  }
  const max = Math.max(...copied.map((c) => c.length));
  for (let i = 0; i < max; i++) for (const c of copied) if (i < c.length) out.addPage(c[i]);
  progress(null);
  status('Saving…');
  result(await saveDoc(out), 'mixed.pdf');
  status(`Mixed ${files.length} files into ${out.getPageCount()} pages.`, 'ok');
}

setupDrop({ filter: isPdf, onFiles: add, reject: 'Please choose PDF files.' });

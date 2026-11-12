// Merge PDF: combine several PDFs into one, in the order shown.
import { L, el, setupDrop, showWork, resetTool, status, progress, run, result, clearResult, loadPdfLib, readBytes, isPdf, fmtBytes, friendlyPdfError, tick } from '../core.js';
import { saveDoc } from '../pdf-tool.js';

const files = []; // { id, file, bytes, pages }
let nextId = 1, list, work;

async function add(newFiles) {
  const { PDFDocument } = await loadPdfLib();
  if (!work) build();
  for (const file of newFiles) {
    status(L({ en: 'Reading ', es: 'Leyendo ' }) + file.name + '…');
    try {
      const bytes = await readBytes(file);
      const doc = await PDFDocument.load(bytes, { updateMetadata: false }).catch((e) => { throw friendlyPdfError(e); });
      files.push({ id: nextId++, file, bytes, pages: doc.getPageCount() });
    } catch (e) {
      status(`${file.name}: ${e.message}`, 'error');
      await tick();
    }
  }
  render();
  if (files.length) status(files.length < 2 ? L({ en: 'Add at least one more PDF to merge.', es: 'Añade al menos un PDF más para unir.' }) : L({ en: `${files.length} PDFs, ${files.reduce((a, f) => a + f.pages, 0)} pages in total. Change the order if needed, then merge.`, es: `${files.length} PDF, ${files.reduce((a, f) => a + f.pages, 0)} páginas en total. Cambia el orden si hace falta y únelos.` }));
}

function build() {
  work = showWork();
  list = el('ol', { class: 'file-list', 'aria-label': L({ en: 'PDFs to merge, in order', es: 'PDF que se unirán, en orden' }) });
  const go = el('button', { class: 'btn btn-primary', type: 'button', text: L({ en: 'Merge PDF', es: 'Unir PDF' }) });
  go.addEventListener('click', () => run(go, merge));
  work.append(list,
    el('div', { class: 'controls' }, el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'sortName' }), ' ' + L({ en: 'Sort by file name', es: 'Ordenar por nombre de archivo' }))),
    el('div', { class: 'actions' }, go, el('button', { class: 'btn btn-ghost', type: 'button', text: L({ en: 'Clear all', es: 'Quitar todo' }), onclick: () => { files.length = 0; work = null; resetTool(); clearResult(); } })));
  work.querySelector('#sortName').addEventListener('change', (e) => { if (e.target.checked) { files.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true })); render(); } });
}

function render() {
  list.innerHTML = '';
  files.forEach((f, i) => {
    list.append(el('li', { class: 'file-row' },
      el('span', { class: 'file-no', text: String(i + 1) }),
      el('div', { class: 'file-meta' }, el('strong', { text: f.file.name }), el('span', { text: L({ en: `${f.pages} page${f.pages === 1 ? '' : 's'}`, es: `${f.pages} página${f.pages === 1 ? '' : 's'}` }) + ` · ${fmtBytes(f.file.size)}` })),
      el('div', { class: 'row-btns' },
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': L({ en: `Move ${f.file.name} up`, es: `Subir ${f.file.name}` }), text: '↑', disabled: i === 0, onclick: () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; render(); } }),
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': L({ en: `Move ${f.file.name} down`, es: `Bajar ${f.file.name}` }), text: '↓', disabled: i === files.length - 1, onclick: () => { [files[i + 1], files[i]] = [files[i], files[i + 1]]; render(); } }),
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': L({ en: `Remove ${f.file.name}`, es: `Quitar ${f.file.name}` }), text: '✕', onclick: () => { files.splice(i, 1); if (!files.length) { work = null; resetTool(); } else render(); } }))));
  });
}

async function merge() {
  if (files.length < 2) { status(L({ en: 'Add at least two PDFs to merge.', es: 'Añade al menos dos PDF para unir.' }), 'warn'); return; }
  clearResult();
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (let k = 0; k < files.length; k++) {
    status(L({ en: `Merging ${k + 1} of ${files.length}: `, es: `Uniendo ${k + 1} de ${files.length}: ` }) + files[k].file.name);
    progress(k / files.length);
    await tick();
    const src = await PDFDocument.load(files[k].bytes, { updateMetadata: false });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  status(L({ en: 'Saving…', es: 'Guardando…' }));
  const bytes = await saveDoc(out);
  progress(null);
  result(bytes, L({ en: 'merged.pdf', es: 'unido.pdf' }));
  status(L({ en: `Merged ${files.length} files into one PDF with ${out.getPageCount()} pages.`, es: `Se unieron ${files.length} archivos en un PDF de ${out.getPageCount()} páginas.` }), 'ok');
}

setupDrop({ filter: isPdf, onFiles: add, reject: L({ en: 'Please choose PDF files.', es: 'Elige archivos PDF.' }) });

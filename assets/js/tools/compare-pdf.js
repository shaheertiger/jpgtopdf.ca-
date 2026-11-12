// Compare PDF: finds every text difference between two versions of a document and flags
// changed numbers, dates and negations ("not", "no", "never"). Text only: layout, images and
// formatting are not compared.
import { el, setupDrop, showWork, resetTool, status, progress, run, clearResult, readBytes, isPdf, openPdfjs, download, track, tick } from '../core.js';
import { pageText } from '../text.js';

const slots = [null, null]; // { file, lines: [{t, page}] , pages, empty }
let work, view;

// Myers diff on two arrays of strings. Returns [['=', a, b] | ['-', a] | ['+', b]] index ops.
function diff(a, b, maxD = 4000) {
  const n = a.length, m = b.length, max = n + m;
  const off = max + 1;
  let v = new Int32Array(2 * max + 3);
  const trace = [];
  for (let d = 0; d <= max; d++) {
    if (d > maxD) return null;
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, a, b, d);
    }
  }
  return [];
}
function backtrack(trace, a, b, D) {
  const ops = [];
  let x = a.length, y = b.length;
  for (let d = D; d > 0; d--) {
    const v = trace[d]; // covers k in [-d-1, d+1] -> index k + d + 1
    const get = (k) => v[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
    const prevX = get(prevK), prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push(['=', --x, --y]); }
    if (x === prevX) ops.push(['+', --y]); else ops.push(['-', --x]);
    x = prevX; y = prevY;
  }
  while (x > 0 && y > 0) ops.push(['=', --x, --y]);
  return ops.reverse();
}

const NEG = /^(not|no|never|none|nor|cannot|can't|won't|shall not|without|except|excluding|unless|n't)$/i;
const isNum = (w) => /\d/.test(w);
const isDate = (w) => /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b|^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?$/i.test(w);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function readDoc(file) {
  const bytes = await readBytes(file);
  const pdf = await openPdfjs(bytes);
  const lines = [];
  let empty = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const t = await pageText(page);
    page.cleanup();
    if (!t.trim()) empty++;
    for (const l of t.split('\n')) { const s = l.replace(/\s+/g, ' ').trim(); if (s) lines.push({ t: s, page: i }); }
  }
  const pages = pdf.numPages;
  pdf.destroy();
  return { file, lines, pages, empty };
}

function build() {
  work = showWork();
  view = el('div', { class: 'diff', id: 'diff' });
  const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Compare' });
  const swap = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Swap', onclick: () => { slots.reverse(); render(); } });
  work.append(el('ol', { class: 'file-list', id: 'slots' }), el('div', { class: 'actions' }, go, swap,
    el('button', { class: 'btn btn-ghost', type: 'button', text: 'Clear', onclick: () => { slots[0] = slots[1] = null; work = null; resetTool(); clearResult(); } })), view);
  go.addEventListener('click', () => run(go, compare));
}

function render() {
  const ol = work.querySelector('#slots');
  ol.innerHTML = '';
  ['Original (old version)', 'Changed (new version)'].forEach((label, i) => {
    const s = slots[i];
    ol.append(el('li', { class: 'file-row' }, el('span', { class: 'file-no', text: i ? 'B' : 'A' }),
      el('div', { class: 'file-meta' }, el('strong', { text: label }), el('span', { text: s ? `${s.file.name} · ${s.pages} page${s.pages === 1 ? '' : 's'}` : 'Add a PDF' }))));
  });
}

async function add(files) {
  if (!work) build();
  for (const f of files) {
    const i = slots[0] ? 1 : 0;
    status(`Reading ${f.name}…`);
    try { slots[i] = await readDoc(f); } catch (e) { status(`${f.name}: ${e.message}`, 'error'); return; }
    render();
  }
  if (!slots[1]) status('Now add the second version.');
  else {
    const scanned = slots.filter((s) => s.empty === s.pages);
    status(scanned.length ? 'One file has no text layer (it is a scan). Run OCR PDF on it first, then compare.' : 'Both files ready. Press Compare.', scanned.length ? 'warn' : '');
  }
}

async function compare() {
  if (!slots[0] || !slots[1]) throw new Error('Add two PDFs: the original and the changed version.');
  clearResult();
  const A = slots[0].lines, B = slots[1].lines;
  if (!A.length || !B.length) throw new Error('One of the PDFs has no text to compare (probably a scan). Run OCR PDF on it first.');
  status('Comparing…'); progress(0.3); await tick();
  const ops = diff(A.map((l) => l.t), B.map((l) => l.t));
  progress(null);
  if (!ops) throw new Error('These two documents are too different to compare line by line. Check that you picked two versions of the same document.');
  // Group into blocks of changes with their surrounding context.
  const blocks = [];
  let cur = null;
  ops.forEach((op, k) => {
    if (op[0] === '=') { cur = null; return; }
    if (!cur) { cur = { del: [], ins: [], at: k }; blocks.push(cur); }
    if (op[0] === '-') cur.del.push(A[op[1]]); else cur.ins.push(B[op[1]]);
  });
  let added = 0, removed = 0;
  const flags = [];
  const html = [];
  for (const b of blocks) {
    const wa = b.del.map((l) => l.t).join(' ').split(' ').filter(Boolean);
    const wb = b.ins.map((l) => l.t).join(' ').split(' ').filter(Boolean);
    const wops = diff(wa, wb, 2000) || [...wa.map((_, i) => ['-', i]), ...wb.map((_, i) => ['+', i])];
    const out = [];
    const dels = [], inss = [];
    for (const op of wops) {
      if (op[0] === '=') out.push(esc(wa[op[1]]));
      else if (op[0] === '-') { out.push(`<del>${esc(wa[op[1]])}</del>`); dels.push(wa[op[1]]); removed++; }
      else { out.push(`<ins>${esc(wb[op[1]])}</ins>`); inss.push(wb[op[1]]); added++; }
    }
    const page = (b.ins[0] || b.del[0]).page;
    const where = b.ins.length ? `page ${b.ins[0].page} of B` : `page ${b.del[0].page} of A`;
    const nd = dels.filter(isNum), ni = inss.filter(isNum);
    const tags = [];
    if (nd.length || ni.length) { tags.push('number'); flags.push(`<li><strong>Number</strong> (${where}): ${nd.map(esc).join(' ') || '—'} → ${ni.map(esc).join(' ') || '—'}</li>`); }
    if (dels.some(isDate) || inss.some(isDate)) tags.push('date');
    const negD = dels.filter((w) => NEG.test(w.replace(/[^\w']/g, ''))), negI = inss.filter((w) => NEG.test(w.replace(/[^\w']/g, '')));
    if (negD.length || negI.length) { tags.push('negation'); flags.push(`<li><strong>Negation</strong> (${where}): ${negD.length ? 'removed “' + negD.map(esc).join(' ') + '”' : ''}${negD.length && negI.length ? ', ' : ''}${negI.length ? 'added “' + negI.map(esc).join(' ') + '”' : ''}</li>`); }
    html.push(`<div class="diff-block${tags.length ? ' flagged' : ''}"><div class="diff-where">${esc(where)}${tags.map((t) => ` <span class="tag">${t}</span>`).join('')}</div><p>${out.join(' ')}</p></div>`);
  }
  const summary = blocks.length
    ? `<p class="diff-sum"><strong>${blocks.length} change${blocks.length === 1 ? '' : 's'}</strong>: ${added} word${added === 1 ? '' : 's'} added, ${removed} removed. <ins>Green</ins> = new in B, <del>red</del> = removed from A.</p>`
    : '<p class="diff-sum"><strong>No text differences found.</strong> The words are identical (layout, images and formatting are not compared).</p>';
  const flagHtml = flags.length ? `<div class="diff-flags"><h3>Check these first</h3><ul>${flags.slice(0, 60).join('')}</ul></div>` : '';
  view.innerHTML = summary + flagHtml + html.join('');
  view.scrollIntoView({ behavior: 'smooth', block: 'start' });
  track();
  status(blocks.length ? `Found ${blocks.length} change${blocks.length === 1 ? '' : 's'}.` : 'No differences in the text.', 'ok');
  if (blocks.length) {
    const save = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Download report (HTML)', onclick: () => {
      const doc = `<!doctype html><meta charset="utf-8"><title>Comparison: ${esc(slots[0].file.name)} vs ${esc(slots[1].file.name)}</title><style>body{font:15px/1.6 system-ui,sans-serif;max-width:820px;margin:24px auto;padding:0 16px}ins{background:#d9f7d9;text-decoration:none}del{background:#fbdada}.diff-block{border-top:1px solid #ccc;padding:8px 0}.diff-where{font-size:12px;color:#555}.tag{background:#000;color:#fff;padding:0 5px;border-radius:3px;font-size:11px}</style><h1>Comparison report</h1><p>A: ${esc(slots[0].file.name)}<br>B: ${esc(slots[1].file.name)}<br>Made with JPGtoPDF.ca on ${new Date().toLocaleString()}</p>${view.innerHTML}`;
      download(new Blob([doc], { type: 'text/html' }), 'pdf-comparison.html', 'text/html');
    } });
    view.prepend(el('div', { class: 'actions' }, save));
  }
}

setupDrop({ filter: isPdf, onFiles: add, reject: 'Please choose PDF files.' });

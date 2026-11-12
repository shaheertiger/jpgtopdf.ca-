// Batch image tools (compress, resize, HEIC to JPG): add files, set options, process each
// one in the browser, download one file or a ZIP.
import { el, setupDrop, showWork, resetTool, status, progress, run, result, clearResult, fmtBytes, zip, tick } from './core.js';

export function mountBatch({ filter, reject, options, process, button, zipName }) {
  const files = [];
  let work, table;
  function build() {
    work = showWork();
    table = el('ul', { class: 'file-list' });
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: button });
    work.append(table, options(), el('div', { class: 'actions' }, go,
      el('button', { class: 'btn btn-ghost', type: 'button', text: 'Clear all', onclick: () => { files.length = 0; work = null; resetTool(); clearResult(); } })));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const outs = [];
      let before = 0, after = 0, notes = [];
      for (let k = 0; k < files.length; k++) {
        const f = files[k];
        status(`Processing ${k + 1} of ${files.length}: ${f.file.name}`);
        progress(k / files.length);
        await tick();
        try {
          const r = await process(f.file);
          outs.push({ name: r.name, data: new Uint8Array(await r.blob.arrayBuffer()) });
          f.out = r;
          before += f.file.size; after += r.blob.size;
          if (r.note) notes.push(`${f.file.name}: ${r.note}`);
        } catch (e) { f.error = e.message || String(e); notes.push(`${f.file.name}: ${f.error}`); }
        render();
      }
      progress(null);
      if (!outs.length) throw new Error(notes[0] || 'Nothing could be processed.');
      if (outs.length === 1) result(outs[0].data, outs[0].name, files.find((f) => f.out).out.blob.type);
      else result(zip(outs), zipName, 'application/zip', `${outs.length} images in a ZIP`);
      const pct = before ? Math.round((1 - after / before) * 100) : 0;
      status(`Done: ${fmtBytes(before)} → ${fmtBytes(after)}${pct > 0 ? ` (${pct}% smaller)` : pct < 0 ? ` (${-pct}% bigger)` : ''}.` + (notes.length ? ' ' + notes.join(' ') : ''), notes.length ? 'warn' : 'ok');
    }));
  }
  function render() {
    table.innerHTML = '';
    files.forEach((f, i) => table.append(el('li', { class: 'file-row' }, el('span', { class: 'file-no', text: String(i + 1) }),
      el('div', { class: 'file-meta' }, el('strong', { text: f.file.name }),
        el('span', { text: fmtBytes(f.file.size) + (f.out ? ` → ${fmtBytes(f.out.blob.size)}${f.out.dims ? ' · ' + f.out.dims : ''}` : '') + (f.error ? ' · ' + f.error : '') })),
      el('div', { class: 'row-btns' }, el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${f.file.name}`, text: '✕', onclick: () => { files.splice(i, 1); if (!files.length) { work = null; resetTool(); } else render(); } })))));
  }
  setupDrop({ filter, reject, onFiles: (fs) => { if (!work) build(); fs.forEach((file) => files.push({ file })); render(); status(`${files.length} file${files.length === 1 ? '' : 's'} ready.`); } });
}

export const outName = (name, ext, suffix = '') => name.replace(/\.[^.]+$/, '') + suffix + '.' + ext;
export function hasAlpha(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true;
  return false;
}

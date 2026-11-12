// Helpers for tools that work on PDFs.
import { L, $, el, setupDrop, showWork, resetTool, status, progress, readBytes, isPdf, openPdfjs, openPdfLib, fmtBytes, clearResult, baseName } from './core.js';

// One PDF in, tool UI out. onLoad({ file, bytes, pdf (pdf.js doc), work, name }) builds the options.
export function mountSinglePdf({ onLoad, needsPdfjs = true }) {
  let current = null;
  setupDrop({
    filter: isPdf,
    reject: L({ en: 'Please choose a PDF file.', es: 'Elige un archivo PDF.' }),
    onFiles: async (files) => {
      const file = files[0];
      if (files.length > 1) status(L({ en: 'This tool works on one PDF at a time; using the first file.', es: 'Esta herramienta trabaja con un PDF a la vez; se usa el primero.' }), 'warn');
      try {
        status(L({ en: 'Opening ', es: 'Abriendo ' }) + file.name + '…');
        progress(0.1);
        const bytes = await readBytes(file);
        const pdf = needsPdfjs ? await openPdfjs(bytes) : null;
        if (current && current.pdf) current.pdf.destroy();
        clearResult();
        const work = showWork();
        work.innerHTML = '';
        const pages = pdf ? pdf.numPages : null;
        work.append(el('div', { class: 'file-head' },
          el('div', {}, el('strong', { text: file.name }), el('span', { text: [fmtBytes(file.size), pages != null ? L({ en: `${pages} page${pages === 1 ? '' : 's'}`, es: `${pages} página${pages === 1 ? '' : 's'}` }) : ''].filter(Boolean).join(' · ') })),
          el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: L({ en: 'Change file', es: 'Cambiar archivo' }), onclick: () => { if (current && current.pdf) current.pdf.destroy(); current = null; resetTool(); clearResult(); $('#file').click(); } })));
        current = { file, bytes, pdf, work, name: baseName(file.name) };
        progress(null);
        status('');
        await onLoad(current);
      } catch (e) {
        console.error(e);
        progress(null);
        status(e.message || String(e), 'error');
      }
    },
  });
  return () => current;
}

// Copies the given 0-based pages (in order) from a pdf-lib document into a new document.
export async function copyPages(src, indices, rotations) {
  const { PDFDocument, degrees } = window.PDFLib;
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p, k) => {
    if (rotations && rotations[k]) p.setRotation(degrees((p.getRotation().angle + rotations[k]) % 360));
    out.addPage(p);
  });
  return out;
}

export async function saveDoc(doc) {
  doc.setProducer('JPGtoPDF.ca');
  return doc.save({ useObjectStreams: true });
}

// ---- geometry: "visual" coordinates are as the page is displayed (after /Rotate),
// origin bottom-left, in points. Converts to the page's own user space.
export function pageGeom(page) {
  const box = page.getCropBox();
  const R = ((page.getRotation().angle % 360) + 360) % 360;
  const { x: x0, y: y0, width: W, height: H } = box;
  const turned = R === 90 || R === 270;
  return {
    R, x0, y0, W, H,
    vw: turned ? H : W,
    vh: turned ? W : H,
    toUser(vx, vy) {
      if (R === 90) return [x0 + W - vy, y0 + vx];
      if (R === 180) return [x0 + W - vx, y0 + H - vy];
      if (R === 270) return [x0 + vy, y0 + H - vx];
      return [x0 + vx, y0 + vy];
    },
    // Visual rectangle -> user-space rectangle {x, y, width, height}
    rectToUser(vx, vy, w, h) {
      const a = this.toUser(vx, vy), b = this.toUser(vx + w, vy + h);
      return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(a[0] - b[0]), height: Math.abs(a[1] - b[1]) };
    },
  };
}

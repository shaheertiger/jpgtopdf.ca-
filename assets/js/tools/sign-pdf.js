// Sign PDF: draw, type or upload a signature and place it on any page. This is a visual
// (electronic) signature, not a certificate-based digital signature.
import { $, el, status, run, result, clearResult, loadImage, readBytes } from '../core.js';
import { mountSinglePdf } from '../pdf-tool.js';
import { placer, canvasToStamp } from '../place.js';

const FONTS = [['"Segoe Script","Brush Script MT","Snell Roundhand",cursive', 'Script'], ['"Lucida Handwriting","Bradley Hand","Apple Chancery",cursive', 'Handwriting'], ['Georgia,"Times New Roman",serif', 'Classic italic']];

mountSinglePdf({
  onLoad: async (ctx) => {
    const P = placer(ctx, { emptyHint: 'Create your signature above, then tap the page where it goes.' });
    const pad = el('canvas', { class: 'sig-pad', width: 600, height: 200, 'aria-label': 'Signature pad: draw with your finger, pen or mouse' });
    const ink = el('select', { id: 'ink', 'aria-label': 'Ink colour' }, el('option', { value: '#111111', text: 'Black ink' }), el('option', { value: '#1a3fa8', text: 'Blue ink' }));
    const typed = el('input', { type: 'text', id: 'typed', class: 'text-input', placeholder: 'Type your name', maxlength: 60, 'aria-label': 'Your name' });
    const font = el('select', { id: 'font', 'aria-label': 'Style' }, FONTS.map(([v, t]) => el('option', { value: v, text: t })));
    const upload = el('input', { type: 'file', id: 'sigFile', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Signature image' });
    const panes = {
      draw: el('div', { class: 'sig-pane' }, pad, el('div', { class: 'controls' }, ink, el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: 'Clear pad', onclick: () => clearPad() }))),
      type: el('div', { class: 'sig-pane', hidden: true }, el('div', { class: 'controls' }, typed, font)),
      upload: el('div', { class: 'sig-pane', hidden: true }, upload, el('p', { class: 'hint', text: 'A photo of your signature on white paper works: the white background is removed.' })),
    };
    let tab = 'draw';
    const tabs = el('div', { class: 'tabs', role: 'tablist' }, ...[['draw', 'Draw'], ['type', 'Type'], ['upload', 'Upload']].map(([k, t]) =>
      el('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(k === 'draw'), text: t, onclick: (e) => {
        tab = k; Object.entries(panes).forEach(([n, p]) => (p.hidden = n !== k));
        tabs.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === e.target)));
      } })));
    const useBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Use this signature' });
    const dateBtn = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Add today’s date' });
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Save signed PDF' });
    ctx.work.append(el('div', { class: 'sig-box' }, tabs, ...Object.values(panes), el('div', { class: 'actions' }, useBtn, dateBtn)), P.root,
      el('p', { class: 'hint', text: 'This adds a visible electronic signature (like signing a printout). It is not a certificate-based digital signature; if a form asks for one, use the signer’s own certificate tool.' }),
      el('div', { class: 'actions sticky' }, go));

    // drawing pad
    const pctx = pad.getContext('2d');
    let drawing = false, last = null, dirty = false;
    const pos = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * (pad.width / r.width), (e.clientY - r.top) * (pad.height / r.height)]; };
    function clearPad() { pctx.clearRect(0, 0, pad.width, pad.height); dirty = false; }
    pad.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId); e.preventDefault(); });
    pad.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      pctx.strokeStyle = ink.value; pctx.lineCap = 'round'; pctx.lineJoin = 'round';
      pctx.lineWidth = 2.2 + (e.pressure && e.pointerType === 'pen' ? e.pressure * 3 : 1.6);
      pctx.beginPath(); pctx.moveTo(...last); pctx.lineTo(...p); pctx.stroke();
      last = p; dirty = true;
    });
    ['pointerup', 'pointercancel'].forEach((ev) => pad.addEventListener(ev, () => { drawing = false; }));

    async function makeStamp() {
      if (tab === 'draw') { if (!dirty) throw new Error('Draw your signature in the box first.'); const c = el('canvas', { width: pad.width, height: pad.height }); c.getContext('2d').drawImage(pad, 0, 0); return canvasToStamp(c, { defaultWidth: 150 }); }
      if (tab === 'type') {
        const name = typed.value.trim();
        if (!name) throw new Error('Type your name first.');
        const c = el('canvas', { width: 900, height: 240 });
        const x = c.getContext('2d');
        x.fillStyle = ink.value; x.font = `italic 110px ${font.value}`; x.textBaseline = 'middle';
        x.fillText(name, 20, 120, 860);
        return canvasToStamp(c, { defaultWidth: 150 });
      }
      const f = upload.files[0];
      if (!f) throw new Error('Choose an image of your signature first.');
      const url = URL.createObjectURL(f);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = el('canvas', { width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return canvasToStamp(c, { whiteToAlpha: true, defaultWidth: 150 });
    }
    useBtn.addEventListener('click', () => run(useBtn, async () => { P.setStamp(await makeStamp()); status('Signature ready. Tap the page where it should go.', 'ok'); }));
    dateBtn.addEventListener('click', () => run(dateBtn, async () => {
      const c = el('canvas', { width: 600, height: 120 });
      const x = c.getContext('2d');
      x.fillStyle = '#111'; x.font = '64px Helvetica, Arial, sans-serif'; x.textBaseline = 'middle';
      x.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), 10, 60);
      P.setStamp(await canvasToStamp(c, { defaultWidth: 110 }));
      status('Date ready. Tap the page where it should go.', 'ok');
    }));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      status('Saving…');
      result(await P.save(), `${ctx.name}-signed.pdf`);
      status(`Signed: ${P.placements.length} item${P.placements.length === 1 ? '' : 's'} placed.`, 'ok');
    }));
    await P.start();
  },
});

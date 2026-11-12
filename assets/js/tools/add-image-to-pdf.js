// Add image to PDF: place a photo, logo or stamp on any page of an existing PDF.
import { el, status, run, result, clearResult, loadImage, readBytes, jpegOrientation, canvasBytes } from '../core.js';
import { mountSinglePdf } from '../pdf-tool.js';
import { placer } from '../place.js';

mountSinglePdf({
  onLoad: async (ctx) => {
    const P = placer(ctx, { emptyHint: 'Choose an image above, then tap the page where it goes.' });
    const pick = el('input', { type: 'file', id: 'imgFile', accept: 'image/jpeg,image/png,image/webp,image/gif', 'aria-label': 'Image to add' });
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Save PDF' });
    ctx.work.append(el('div', { class: 'controls' }, el('div', { class: 'control wide' }, el('label', { for: 'imgFile', text: 'Image to add (JPG, PNG, WebP)' }), pick)),
      P.root, el('div', { class: 'actions sticky' }, go));
    pick.addEventListener('change', () => run(null, async () => {
      const f = pick.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      const img = await loadImage(url);
      const aspect = img.naturalWidth / img.naturalHeight;
      let stamp;
      const bytes = await readBytes(f);
      if (/jpe?g/i.test(f.type) && jpegOrientation(bytes) === 1) stamp = { type: 'jpg', bytes, url, aspect };
      else if (/png/i.test(f.type)) stamp = { type: 'png', bytes, url, aspect };
      else {
        const c = el('canvas', { width: img.naturalWidth, height: img.naturalHeight });
        c.getContext('2d').drawImage(img, 0, 0);
        const transparent = /png|webp|gif/i.test(f.type);
        stamp = { type: transparent ? 'png' : 'jpg', bytes: await canvasBytes(c, transparent ? 'image/png' : 'image/jpeg', 0.92), url, aspect };
      }
      stamp.defaultWidth = 200;
      P.setStamp(stamp);
      status('Image ready. Tap the page where it should go. Transparent PNG backgrounds stay transparent.', 'ok');
    }));
    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      status('Saving…');
      result(await P.save(), `${ctx.name}-with-image.pdf`);
      status(`Saved with ${P.placements.length} image${P.placements.length === 1 ? '' : 's'} added. The image is embedded at full resolution.`, 'ok');
    }));
    await P.start();
  },
});

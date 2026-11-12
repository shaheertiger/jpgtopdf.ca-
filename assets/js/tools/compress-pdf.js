// Compress PDF: choose a level, or a target size (e.g. under 1 MB) and let it try each level.
import { L, $, el, status, progress, run, result, clearResult, fmtBytes } from '../core.js';
import { mountSinglePdf } from '../pdf-tool.js';
import { LEVELS, compressPdf } from '../compress.js';

const T = {
  level: { en: 'Compression level', es: 'Nivel de compresión' },
  light: { en: 'Light — best quality, smaller file', es: 'Ligera — máxima calidad, archivo menor' },
  recommended: { en: 'Recommended — good quality, much smaller', es: 'Recomendada — buena calidad, mucho menor' },
  strong: { en: 'Strong — smallest file, softer images', es: 'Fuerte — archivo mínimo, imágenes más suaves' },
  target: { en: 'Target size — get under a limit', es: 'Tamaño objetivo — quedar por debajo de un límite' },
  max: { en: 'Maximum size', es: 'Tamaño máximo' },
  gray: { en: 'Convert images to greyscale (smaller, good for text scans)', es: 'Pasar imágenes a escala de grises (más ligero, ideal para escaneos de texto)' },
  go: { en: 'Compress PDF', es: 'Comprimir PDF' },
  hint: { en: 'Text, fonts and drawings are kept as they are; only the pictures inside the PDF are made smaller.', es: 'El texto, las fuentes y los dibujos se mantienen; solo se reducen las imágenes del PDF.' },
  working: { en: (k, n) => `Compressing image ${k} of ${n}…`, es: (k, n) => `Comprimiendo imagen ${k} de ${n}…` },
  trying: { en: (l) => `Trying the ${l} level…`, es: (l) => `Probando el nivel ${l}…` },
  saving: { en: 'Saving…', es: 'Guardando…' },
  done: { en: (a, b, p) => `Done: ${a} → ${b} (${p}% smaller).`, es: (a, b, p) => `Listo: ${a} → ${b} (${p}% menos).` },
  noImages: { en: 'This PDF has no photos or scanned images to shrink — it is mostly text, so it is already about as small as it gets. If it is still over your limit, split it into parts.', es: 'Este PDF no tiene fotos ni imágenes escaneadas que reducir: es casi todo texto y ya es prácticamente lo más pequeño posible. Si sigue superando tu límite, divídelo en partes.' },
  noGain: { en: 'We could not make this PDF meaningfully smaller at this level. Try Strong, tick greyscale, or split it into parts.', es: 'No pudimos reducir este PDF de forma notable con este nivel. Prueba Fuerte, marca escala de grises o divídelo en partes.' },
  under: { en: (t) => `It is already under ${t}; no need to compress.`, es: (t) => `Ya pesa menos de ${t}; no hace falta comprimirlo.` },
  missed: { en: (t, b) => ` Still over ${t} at the strongest setting (${b}). Split the PDF into parts, or remove pages you don’t need.`, es: (t, b) => ` Sigue por encima de ${t} con el ajuste más fuerte (${b}). Divide el PDF en partes o quita páginas que no necesites.` },
  hit: { en: (t, l) => ` Under ${t} using the ${l} level.`, es: (t, l) => ` Por debajo de ${t} con el nivel ${l}.` },
  names: { en: { light: 'light', recommended: 'recommended', strong: 'strong', extreme: 'extra-strong' }, es: { light: 'ligero', recommended: 'recomendado', strong: 'fuerte', extreme: 'extrafuerte' } },
  suffix: { en: 'compressed', es: 'comprimido' },
};

mountSinglePdf({
  onLoad: async (ctx) => {
    const radio = (v, checked) => el('label', {}, el('input', { type: 'radio', name: 'level', value: v, checked }), ' ' + L(T[v]));
    const go = el('button', { class: 'btn btn-primary', type: 'button', text: L(T.go) });
    const targetBox = el('span', { class: 'inline-inputs' },
      el('input', { type: 'number', id: 'tval', min: 0.05, step: 0.1, value: 1, class: 'num-input', 'aria-label': L(T.max) }),
      el('select', { id: 'tunit', 'aria-label': 'MB / KB' }, el('option', { value: 'MB', text: 'MB', selected: true }), el('option', { value: 'KB', text: 'KB' })),
      el('select', { id: 'tpreset', 'aria-label': 'Presets', onchange: (e) => { if (!e.target.value) return; const [v, u] = e.target.value.split(' '); $('#tval').value = v; $('#tunit').value = u; $('input[name=level][value=target]').checked = true; } },
        [['', '…'], ['200 KB', '200 KB'], ['500 KB', '500 KB'], ['1 MB', '1 MB'], ['2 MB', '2 MB'], ['4 MB', '4 MB (IRCC)'], ['10 MB', '10 MB'], ['20 MB', '20 MB (Outlook)'], ['25 MB', '25 MB (Gmail)']].map(([v, t]) => el('option', { value: v, text: t }))));
    ctx.work.append(
      el('div', { class: 'controls stack' },
        el('fieldset', { class: 'radios' }, el('legend', { text: L(T.level) }),
          radio('light'), radio('recommended', true), radio('strong'),
          el('label', {}, el('input', { type: 'radio', name: 'level', value: 'target' }), ' ' + L(T.target) + ': ', targetBox)),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', id: 'gray' }), ' ' + L(T.gray))),
      el('p', { class: 'hint', text: L(T.hint) }),
      el('div', { class: 'actions' }, go));
    $('#tval').addEventListener('focus', () => { $('input[name=level][value=target]').checked = true; });

    go.addEventListener('click', () => run(go, async () => {
      clearResult();
      const before = ctx.bytes.length;
      const mode = $('input[name=level]:checked').value;
      const gray = $('#gray').checked;
      const onProgress = (f, k, n) => { progress(f); status(L(T.working)(k, n)); };
      let out, used = mode, extra = '', kind = 'ok';
      if (mode !== 'target') {
        out = await compressPdf(ctx.bytes, { ...LEVELS[mode], gray, onProgress });
      } else {
        const limit = Math.round((+$('#tval').value || 0) * ($('#tunit').value === 'KB' ? 1024 : 1048576));
        const label = fmtBytes(limit);
        if (limit < 10240) throw new Error('Choose a target of at least 10 KB.');
        if (before <= limit) { status(L(T.under)(label), 'ok'); return; }
        for (const lv of ['light', 'recommended', 'strong', 'extreme']) {
          status(L(T.trying)(L(T.names)[lv]));
          used = lv;
          out = await compressPdf(ctx.bytes, { ...LEVELS[lv], gray, onProgress });
          if (out.bytes.length <= limit || !out.images) break;
        }
        if (out.bytes.length > limit && !gray && out.images) {
          used = 'extreme';
          out = await compressPdf(ctx.bytes, { ...LEVELS.extreme, gray: true, onProgress });
        }
        if (out.bytes.length <= limit) extra = L(T.hit)(label, L(T.names)[used]);
        else { extra = L(T.missed)(label, fmtBytes(Math.min(out.bytes.length, before))); kind = 'warn'; }
      }
      progress(null);
      const after = out.bytes.length;
      if (!out.images && after >= before * 0.97) { status(L(T.noImages), 'warn'); return; }
      if (after >= before * 0.97) { status(L(T.noGain) + (mode === 'target' ? extra : ''), 'warn'); return; }
      const pct = Math.round((1 - after / before) * 100);
      result(out.bytes, `${ctx.name}-${L(T.suffix)}.pdf`, 'application/pdf', `−${pct}%`);
      status(L(T.done)(fmtBytes(before), fmtBytes(after), pct) + extra, kind);
    }));
  },
});

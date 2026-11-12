// Tesseract (self-hosted under /vendor/tesseract) shared by OCR PDF and Image to Text.
import { loadTesseract, el, status, progress } from './core.js';

export const LANGS = [['eng', 'English'], ['fra', 'French'], ['spa', 'Spanish'], ['por', 'Portuguese'], ['deu', 'German']];
const abs = (p) => new URL(p, location.href).href;
let cached = null;

export async function getWorker(langs) {
  if (cached && cached.langs === langs) return cached.worker;
  if (cached) { await cached.worker.terminate(); cached = null; }
  const T = await loadTesseract();
  status('Loading the text-recognition engine (first time: about 4–7 MB, then cached)…');
  const worker = await T.createWorker(langs.split('+'), 1, {
    workerPath: abs('/vendor/tesseract/worker.min.js'),
    corePath: abs('/vendor/tesseract/core'),
    langPath: abs('/vendor/tesseract/lang'),
    gzip: true,
    workerBlobURL: false,
    logger: (m) => { if (m.status && /loading|initializ/.test(m.status) && typeof m.progress === 'number') progress(m.progress); },
  });
  progress(null);
  cached = { langs, worker };
  return worker;
}

export function langPicker() {
  const def = /^fr/i.test(navigator.language || '') ? 'fra' : 'eng';
  return el('div', { class: 'control' },
    el('label', { for: 'lang', text: 'Document language' }),
    el('select', { id: 'lang' },
      LANGS.map(([v, t]) => el('option', { value: v, text: t, selected: v === def })),
      el('option', { value: 'eng+fra', text: 'English + French' }),
      el('option', { value: 'eng+spa', text: 'English + Spanish' })));
}

// Flattens tesseract blocks into lines of words with pixel boxes.
export function linesOf(data) {
  const lines = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
    const words = (l.words || []).filter((w) => w.text && w.text.trim());
    if (words.length) lines.push({ bbox: l.bbox, baseline: l.baseline, words });
  }
  return lines;
}

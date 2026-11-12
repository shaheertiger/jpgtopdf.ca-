// HEIC to JPG: convert iPhone photos (HEIC/HEIF) to JPG or PNG in the browser.
import { $, el } from '../core.js';
import { mountBatch, outName } from '../image-batch.js';
import { isHeic, decodeHeic } from '../heic.js';

mountBatch({
  filter: isHeic,
  reject: 'Please choose HEIC or HEIF files (iPhone photos).',
  button: 'Convert to JPG',
  zipName: 'heic-to-jpg.zip',
  options: () => el('div', { class: 'controls' },
    el('div', { class: 'control' }, el('label', { for: 'fmt', text: 'Format' }), el('select', { id: 'fmt' }, el('option', { value: 'jpg', text: 'JPG (smaller, works everywhere)' }), el('option', { value: 'png', text: 'PNG (lossless, much bigger)' }))),
    el('div', { class: 'control' }, el('label', { for: 'q', text: 'JPG quality' }), el('select', { id: 'q' }, el('option', { value: '0.95', text: 'Maximum (95)' }), el('option', { value: '0.9', text: 'High (90)', selected: true }), el('option', { value: '0.8', text: 'Medium (80)' })))),
  process: async (file) => {
    const png = $('#fmt').value === 'png';
    const blob = await decodeHeic(file, png ? 'image/png' : 'image/jpeg', +$('#q').value);
    return { blob, name: outName(file.name, png ? 'png' : 'jpg') };
  },
});

#!/usr/bin/env node
// Content linter for tool pages:   node scripts/check-content.mjs
// Enforces the tool-page template (see content/README.md). Errors fail the build.
import fs from 'node:fs';
import path from 'node:path';
import { parse, md, plain, words } from './lib.mjs';
import { TOOLS, TRANSLATIONS, toolPath } from './tools.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FLAGSHIP = new Set(['compress-pdf']);
const SMALL = new Set(['split-pdf-in-half', 'alternate-mix-pdf', 'add-page-numbers', 'flatten-pdf', 'crop-pdf', 'heic-to-jpg', 'pdf-to-png', 'delete-pdf-pages', 'extract-pdf-pages', 'rotate-pdf', 'watermark-pdf', 'add-image-to-pdf', 'split-pdf-by-size', 'heic-to-pdf']);
const BANNED = /no file size limit|unlimited file size|no size limit|military[- ]grade|bank[- ]level|ai[- ]powered|100\s?% accurate|#1\b|best in the world|completely secure|sin límite de tamaño/i;
const PROMISE = /\d|free|gratis|gratuit|no upload|no sign|no watermark|sin subir|sin registro|sans/i;
const ENGLISH_H2 = /\b(the|how|what|why|when|your|with|does|can i|is it)\b/i;

function known() {
  const set = new Set(['/', '/fr/', '/blog/', '/fr/blog/', '/how-it-works/', '/about.html', '/contact.html', '/privacy.html', '/terms.html', '/blog/how-to-convert-jpg-to-pdf.html', '/blog/best-free-jpg-to-pdf-converter.html']);
  TOOLS.forEach((t) => set.add(toolPath(t)));
  TRANSLATIONS.forEach((x) => set.add(`/${x.lang}/${x.slug}/`));
  for (const lang of ['en', 'fr']) for (const f of fs.readdirSync(path.join(ROOT, 'posts', lang))) if (f.endsWith('.md')) set.add(`${lang === 'en' ? '/blog/' : '/fr/blog/'}${f.replace(/\.md$/, '')}/`);
  for (const f of fs.existsSync(path.join(ROOT, 'content/pages')) ? fs.readdirSync(path.join(ROOT, 'content/pages')) : []) set.add(`/${f.replace(/\.md$/, '')}/`);
  return set;
}

function checkPage(file, { slug, name, lang = 'en', related: relatedSet }) {
  const errors = [], warns = [];
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return { errors: [`missing file ${file}`], warns };
  let data, body;
  try { ({ data, body } = parse(fs.readFileSync(full, 'utf8'), file)); } catch (e) { return { errors: [e.message], warns }; }
  const r = md(body, { sections: true });
  for (const k of ['title', 'description', 'h1', 'lead', 'dateModified']) if (!data[k]) errors.push(`front matter: missing ${k}`);
  if (data.title) {
    const n = [...data.title].length;
    if (n > 62) errors.push(`title is ${n} chars (max 62): "${data.title}"`);
    if (!PROMISE.test(data.title)) errors.push('title has no promise (a number, "Free", "No upload"…)');
    if (!data.title.toLowerCase().includes(name.toLowerCase().split(' ')[0])) warns.push(`title does not start from the tool name "${name}"`);
  }
  if (data.description) { const n = [...data.description].length; if (n < 110 || n > 160) errors.push(`description is ${n} chars (110–160)`); }
  if (data.h1 && !data.h1.toLowerCase().includes(name.toLowerCase())) errors.push(`H1 should contain the tool name "${name}"`);
  if (data.lead && data.lead.length > 200) errors.push(`lead is ${data.lead.length} chars (one line, max 200)`);
  if (data.dateModified && !/^\d{4}-\d{2}-\d{2}$/.test(data.dateModified)) errors.push('dateModified must be YYYY-MM-DD');
  // structure
  if (!r.heads.length || !/^(quick answer|respuesta rápida|réponse rapide)$/i.test(r.heads[0][1])) errors.push('the first H2 must be "Quick answer"');
  if (r.answer == null) errors.push('Quick answer has no paragraph');
  else { const n = words(r.answer); if (n < 40 || n > 70) errors.push(`Quick answer is ${n} words (40–70)`); }
  if (!r.limits) errors.push('no Limits table (H2 "Limits…" followed by a 2-column table)');
  else if (r.limits.rows.length < 6 || r.limits.rows.length > 9) errors.push(`Limits table has ${r.limits.rows.length} rows (6–9)`);
  if (!r.howto) errors.push('no How-to: an H2 starting "How to…" followed by a numbered list');
  else if (r.howto.steps.length < 3) errors.push('How-to needs at least 3 steps');
  if (r.faq.length < 6 || r.faq.length > 8) errors.push(`FAQ has ${r.faq.length} questions (6–8)`);
  r.faq.forEach(([q, a]) => { if (!a) errors.push(`FAQ "${q}" has no answer`); });
  if (!r.tables.some((t) => /troubleshoot|problem|solución|problema/i.test(t.h2 || '') || /problem|problema/i.test(t.head[0]))) warns.push('no troubleshooting table');
  const searchH2 = r.heads.filter(([, t]) => /\?$/.test(t)).length;
  if (searchH2 < 2) warns.push(`only ${searchH2} H2s phrased as searches (aim for 3–4)`);
  // length
  const n = r.words;
  const [min, max] = lang !== 'en' ? [700, 2300] : FLAGSHIP.has(slug) ? [1500, 2300] : SMALL.has(slug) ? [500, 1500] : [800, 1600];
  if (n < min || n > max) errors.push(`body is ${n} words (${min}–${max})`);
  // claims and links
  const all = `${data.title} ${data.description} ${data.h1} ${data.lead} ${body}`;
  const banned = all.match(BANNED);
  if (banned) errors.push(`banned claim: "${banned[0]}"`);
  const k = known();
  for (const [, h] of body.matchAll(/\]\((\/[^)#\s]*)/g)) if (!k.has(h)) errors.push(`broken internal link ${h}`);
  const related = data.related || [];
  const minRel = lang === 'en' ? 3 : 2;
  if (!Array.isArray(related) || related.length < minRel || related.length > 4) errors.push(`related: list ${minRel}–4 tool slugs`);
  else related.forEach((s) => { if (!relatedSet.has(s)) errors.push(`related: unknown tool "${s}"`); if (s === slug) errors.push('related: lists itself'); });
  if (lang !== 'en') r.heads.forEach(([, t]) => { if (ENGLISH_H2.test(t)) errors.push(`H2 looks English on a ${lang} page: "${t}"`); });
  if (lang === 'en' && !/\]\(\//.test(body)) warns.push('no internal links in the body');
  return { errors, warns, words: n };
}

export function lint({ quiet = false } = {}) {
  let failed = 0, warned = 0;
  const toolSlugs = new Set(TOOLS.map((t) => t.slug));
  const report = [];
  for (const t of TOOLS) report.push([`content/tools/${t.slug}.md`, checkPage(`content/tools/${t.slug}.md`, { slug: t.slug, name: t.name, related: toolSlugs })]);
  for (const x of TRANSLATIONS) report.push([`content/tools/${x.lang}/${x.slug}.md`, checkPage(`content/tools/${x.lang}/${x.slug}.md`, { slug: x.tool, name: x.name, lang: x.lang, related: new Set(TRANSLATIONS.filter((y) => y.lang === x.lang).map((y) => y.slug)) })]);
  for (const [file, res] of report) {
    if (res.errors.length) failed++;
    if (res.warns.length) warned++;
    if (res.errors.length || (!quiet && res.warns.length)) {
      console.log(`${res.errors.length ? '✗' : '!'} ${file}${res.words ? ` (${res.words} words)` : ''}`);
      res.errors.forEach((e) => console.log(`    error: ${e}`));
      if (!quiet) res.warns.forEach((w) => console.log(`    warn:  ${w}`));
    }
  }
  if (!quiet || failed) console.log(`${report.length} pages checked: ${failed} with errors, ${warned} with warnings`);
  return failed === 0;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) process.exit(lint() ? 0 : 1);

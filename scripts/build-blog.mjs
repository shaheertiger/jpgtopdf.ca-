#!/usr/bin/env node
// Builds the guides from posts/<lang>/*.md into static HTML (no dependencies).
//   node scripts/build-blog.mjs
// Output: /blog/<slug>/index.html, /fr/blog/<slug>/index.html, the two blog indexes,
// sitemap.xml and llms.txt. The generated HTML is committed; the site has no build step.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = 'https://jpgtopdf.ca';
const YEAR = new Date().getFullYear();

const T = {
  en: {
    htmlLang: 'en-CA', og: 'en_CA', blog: '/blog/', home: '/', homeName: 'JPG to PDF', blogName: 'Guides',
    blogTitle: 'JPG to PDF Guides: Photos, Scans and Screenshots to PDF | JPGtoPDF.ca',
    blogDesc: 'Step-by-step guides to turn photos, screenshots, scans and PNG files into PDF on iPhone, Android, Windows and Mac, plus file-size and quality fixes.',
    blogH1: 'JPG to PDF Guides', blogLead: 'Short, tested guides for turning pictures into PDF on every device, and fixing the file when a form rejects it.',
    toc: 'On this page', updated: 'Updated', by: 'By the JPGtoPDF.ca team', minutes: (n) => `${n} min read`,
    ctaTitle: 'Convert your images now', ctaText: 'Free, no sign-up, and nothing is uploaded: the PDF is made in your browser.', ctaBtn: 'Open the JPG to PDF converter',
    related: 'Related guides', other: 'Lire en français', skip: 'Skip to content',
    nav: [['/', 'Converter'], ['/blog/', 'Guides'], ['/fr/blog/', 'FR']],
    foot: 'Free JPG to PDF converter. All conversions happen in your browser.', footNav: [['/about.html', 'About'], ['/contact.html', 'Contact'], ['/privacy.html', 'Privacy'], ['/terms.html', 'Terms']],
    project: 'A project of', pdfca: 'https://www.pdfcanada.ca/en',
  },
  fr: {
    htmlLang: 'fr-CA', og: 'fr_CA', blog: '/fr/blog/', home: '/fr/', homeName: 'JPG en PDF', blogName: 'Guides',
    blogTitle: 'Guides JPG en PDF : photos, scans et captures en PDF | JPGtoPDF.ca',
    blogDesc: 'Guides pas à pas pour transformer une photo, une capture d’écran, un scan ou un PNG en PDF sur iPhone, Android et PC, et pour envoyer le fichier.',
    blogH1: 'Guides JPG en PDF', blogLead: 'Des guides courts et testés pour transformer vos images en PDF sur chaque appareil.',
    toc: 'Sur cette page', updated: 'Mis à jour le', by: 'Par l’équipe JPGtoPDF.ca', minutes: (n) => `${n} min de lecture`,
    ctaTitle: 'Convertissez vos images maintenant', ctaText: 'Gratuit, sans compte, et rien n’est téléversé : le PDF est créé dans votre navigateur.', ctaBtn: 'Ouvrir le convertisseur JPG en PDF',
    related: 'Guides liés', other: 'Read in English', skip: 'Aller au contenu',
    nav: [['/fr/', 'Convertisseur'], ['/fr/blog/', 'Guides'], ['/blog/', 'EN']],
    foot: 'Convertisseur JPG en PDF gratuit. Tout se passe dans votre navigateur.', footNav: [['/about.html', 'À propos'], ['/contact.html', 'Contact'], ['/privacy.html', 'Confidentialité'], ['/terms.html', 'Conditions']],
    project: 'Un projet de', pdfca: 'https://www.pdfcanada.ca/fr',
  },
};

// ---------- tiny front matter + markdown ----------
function parse(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no front matter`);
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (/^[[{"]/.test(v)) v = JSON.parse(v);
    data[k] = v;
  }
  return { data, body: m[2] };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h.replace(/&amp;/g, '&')}"${/^https?:/.test(h) && !h.startsWith(SITE) ? ' rel="noopener"' : ''}>${t}</a>`);
}
function md(body) {
  const lines = body.split('\n');
  const out = [];
  const heads = [];
  const faq = [];
  let inFaq = false;
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.trim() === '<!-- cta -->') { out.push('%%CTA%%'); i++; continue; }
    if (l.trim() === '<!-- card -->') { out.push('%%CARD%%'); i++; continue; }
    let h = l.match(/^(#{2,3}) (.+)$/);
    if (h) {
      const level = h[1].length, text = h[2], id = slugify(text);
      if (level === 2) { heads.push([id, text]); inFaq = /frequently asked|questions fréquentes|foire aux questions/i.test(text); }
      if (level === 3 && inFaq) {
        const ans = [];
        let j = i + 1;
        while (j < lines.length && !/^#{2,3} /.test(lines[j])) { if (lines[j].trim()) ans.push(lines[j].trim()); j++; }
        faq.push([text, ans.join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1')]);
      }
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++; continue;
    }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const bodyRows = rows.slice(2).map(cells);
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (l.startsWith('> ')) {
      const q = [];
      while (i < lines.length && lines[i].startsWith('> ')) { q.push(lines[i].slice(2)); i++; }
      out.push(`<aside class="callout"><p>${inline(q.join(' '))}</p></aside>`);
      continue;
    }
    if (/^(\d+\.|-) /.test(l)) {
      const ordered = /^\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^(\d+\.|-) /.test(lines[i])) { items.push(lines[i].replace(/^(\d+\.|-) /, '')); i++; }
      out.push(`<${ordered ? 'ol' : 'ul'} class="${ordered ? 'steps' : 'list'}">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |\||> |\d+\. |- |<!--)/.test(lines[i])) { p.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(p.join(' '))}</p>`);
  }
  return { html: out.join('\n'), heads, faq, words: body.split(/\s+/).filter(Boolean).length };
}

// Illustration: a step card drawn as inline SVG (black and white, follows the site theme).
function card(c, lang) {
  const steps = c.steps.slice(0, 4);
  const h = 130 + steps.length * 110;
  const wrap = (t, n) => { const w = t.split(' '); const lines = ['']; for (const x of w) { if ((lines.at(-1) + ' ' + x).trim().length > n) lines.push(x); else lines[lines.length - 1] = (lines.at(-1) + ' ' + x).trim(); } return lines; };
  const rows = steps.map((s, k) => {
    const y = 112 + k * 110;
    const t = wrap(s, 34);
    return `<g><rect x="32" y="${y}" width="72" height="72" rx="8" fill="currentColor"/><text x="68" y="${y + 49}" text-anchor="middle" font-size="36" font-weight="800" style="fill:var(--bg)">${k + 1}</text>${t.map((ln, j) => `<text x="130" y="${y + 32 + j * 36}" font-size="31" fill="currentColor">${esc(ln)}</text>`).join('')}</g>`;
  }).join('');
  return `<figure class="card"><svg viewBox="0 0 760 ${h}" role="img" aria-labelledby="card-t card-d" xmlns="http://www.w3.org/2000/svg"><title id="card-t">${esc(c.title)}</title><desc id="card-d">${esc(c.alt)}</desc><rect x="2" y="2" width="756" height="${h - 4}" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><text x="32" y="72" font-size="40" font-weight="800" fill="currentColor">${esc(c.title)}</text>${rows}</svg><figcaption>${esc(c.alt)}</figcaption></figure>`;
}

// ---------- page shell ----------
function shell(lang, { title, description, canonical, alternates = [], schema, body, ogType = 'article' }) {
  const L = T[lang];
  return `<!DOCTYPE html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="light dark">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2963693328827195" crossorigin="anonymous"></script>
<link rel="canonical" href="${canonical}">
${alternates.map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${href}">`).join('\n')}
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title.replace(/ \| JPGtoPDF\.ca$/, ''))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="JPGtoPDF.ca">
<meta property="og:locale" content="${L.og}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='black'/><text x='50' y='68' font-size='52' text-anchor='middle' fill='white' font-family='Arial'>PDF</text></svg>">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<a class="skip-link" href="#main">${L.skip}</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${L.home}" aria-label="JPGtoPDF.ca">JPG<span>→</span>PDF</a>
    <nav aria-label="Primary">${L.nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>&copy; ${YEAR} JPGtoPDF.ca — ${L.foot}</p>
    <p class="project-of">${L.project} <a href="${L.pdfca}" rel="noopener">pdfcanada.ca</a></p>
    <nav aria-label="Footer">${L.footNav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- load posts ----------
const posts = [];
for (const lang of ['en', 'fr']) {
  const dir = path.join(ROOT, 'posts', lang);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const file = path.join('posts', lang, f);
    const { data, body } = parse(fs.readFileSync(path.join(dir, f), 'utf8'), file);
    for (const k of ['title', 'h1', 'description', 'date', 'card']) if (!data[k]) throw new Error(`${file}: missing ${k}`);
    const slug = f.replace(/\.md$/, '');
    const url = `${SITE}${T[lang].blog}${slug}/`;
    const r = md(body);
    if ([...data.title].length > 70) console.warn(`! ${file}: title ${[...data.title].length} chars`);
    const dl = [...data.description].length;
    if (dl < 110 || dl > 165) console.warn(`! ${file}: description ${dl} chars`);
    if (r.faq.length < 3) console.warn(`! ${file}: only ${r.faq.length} FAQ questions`);
    if ((body.match(/<!-- cta -->/g) || []).length !== 1) console.warn(`! ${file}: needs exactly one <!-- cta -->`);
    posts.push({ ...data, lang, slug, url, path: `${T[lang].blog}${slug}/`, ...r });
  }
}
// Hand-written English posts from before the generator (blog/*.html), kept as-is.
const LEGACY = [
  { path: '/blog/how-to-convert-jpg-to-pdf.html', h1: 'How to Convert JPG to PDF Online in Canada', description: 'The full step-by-step guide to turning JPG and JPEG files into one PDF, free and private.' },
  { path: '/blog/best-free-jpg-to-pdf-converter.html', h1: 'Best Free JPG to PDF Converter Tools in Canada', description: 'The free JPG to PDF converters compared: privacy, limits, watermarks and which to pick.' },
];
const bySlug = (lang, slug) => posts.find((p) => p.lang === lang && p.slug === slug);

// Internal links must resolve.
const known = new Set([...LEGACY.map((l) => l.path), '/', '/fr/', '/blog/', '/fr/blog/', '/about.html', '/contact.html', '/privacy.html', '/terms.html', ...posts.map((p) => p.path)]);
let bad = 0;
for (const p of posts) for (const [, h] of p.html.matchAll(/href="(\/[^"#]*)/g)) if (!known.has(h)) { console.error(`✗ ${p.lang}/${p.slug}: broken link ${h}`); bad++; }
if (bad) process.exit(1);

// ---------- write posts ----------
for (const p of posts) {
  const L = T[p.lang];
  const pair = p.pair ? bySlug(p.lang === 'en' ? 'fr' : 'en', p.pair) : null;
  const alternates = pair
    ? [[p.lang === 'en' ? 'en-ca' : 'fr-ca', p.url], [pair.lang === 'en' ? 'en-ca' : 'fr-ca', pair.url], ['x-default', p.lang === 'en' ? p.url : pair.url]]
    : [];
  const related = (p.related || []).map((s) => bySlug(p.lang, s)).filter(Boolean);
  const minutes = Math.max(2, Math.round(p.words / 230));
  const cta = `<aside class="cta-box"><strong>${L.ctaTitle}</strong><p>${L.ctaText}</p><a class="btn btn-primary" href="${L.home}">${L.ctaBtn}</a></aside>`;
  const body = `<article class="post wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${L.home}">${L.homeName}</a> › <a href="${L.blog}">${L.blogName}</a></nav>
  <h1>${esc(p.h1)}</h1>
  <p class="meta">${L.by} · ${L.updated} <time datetime="${p.date}">${p.date}</time> · ${L.minutes(minutes)}${pair ? ` · <a href="${pair.path}" hreflang="${pair.lang}-ca">${L.other}</a>` : ''}</p>
  ${p.html.replace('%%CTA%%', cta).replace('%%CARD%%', card(p.card, p.lang)).replace(/<h2 /, `<nav class="toc" aria-label="${L.toc}"><strong>${L.toc}</strong><ol>${p.heads.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>\n<h2 `)}
  ${related.length ? `<section class="related"><h2>${L.related}</h2><ul class="list">${related.map((r) => `<li><a href="${r.path}">${esc(r.h1)}</a></li>`).join('')}</ul></section>` : ''}
</article>`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: p.h1, description: p.description, inLanguage: L.htmlLang, datePublished: p.date, dateModified: p.date, mainEntityOfPage: p.url, image: `${SITE}/og-image.png`, author: { '@type': 'Organization', name: 'JPGtoPDF.ca', url: `${SITE}/about.html` }, publisher: { '@type': 'Organization', name: 'JPGtoPDF.ca', url: SITE } },
      ...(p.faq.length ? [{ '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
      { '@type': 'BreadcrumbList', itemListElement: [[L.homeName, `${SITE}${L.home}`], [L.blogName, `${SITE}${L.blog}`], [p.h1, p.url]].map(([name, item], k) => ({ '@type': 'ListItem', position: k + 1, name, item })) },
    ],
  };
  const out = path.join(ROOT, p.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, shell(p.lang, { title: (p.title + ' | JPGtoPDF.ca').length <= 70 ? p.title + ' | JPGtoPDF.ca' : p.title, description: p.description, canonical: p.url, alternates, schema, body }));
}

// ---------- blog indexes ----------
for (const lang of ['en', 'fr']) {
  const L = T[lang];
  const list = [...posts.filter((p) => p.lang === lang), ...(lang === 'en' ? LEGACY.map((l) => ({ ...l, url: SITE + l.path })) : [])];
  const url = `${SITE}${L.blog}`;
  const body = `<section class="hero wrap"><h1>${L.blogH1}</h1><p class="lead">${L.blogLead}</p></section>
<section class="content wrap"><ul class="post-list">${list.map((p) => `<li><a href="${p.path}"><strong>${esc(p.h1)}</strong></a><p>${esc(p.description)}</p></li>`).join('')}</ul></section>`;
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: L.blogH1, url, inLanguage: L.htmlLang, hasPart: list.map((p) => ({ '@type': 'Article', headline: p.h1, url: p.url })) };
  const alternates = [['en-ca', `${SITE}/blog/`], ['fr-ca', `${SITE}/fr/blog/`], ['x-default', `${SITE}/blog/`]];
  fs.mkdirSync(path.join(ROOT, L.blog), { recursive: true });
  fs.writeFileSync(path.join(ROOT, L.blog, 'index.html'), shell(lang, { title: L.blogTitle, description: L.blogDesc, canonical: url, alternates, schema, body, ogType: 'website' }));
}

// ---------- sitemap + llms.txt ----------
const today = new Date().toISOString().slice(0, 10);
const url = (loc, lastmod, pr, alts = []) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${pr}</priority>\n${alts.map(([hl, h]) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${h}"/>\n`).join('')}  </url>`;
const homeAlts = [['en-ca', `${SITE}/`], ['fr-ca', `${SITE}/fr/`]];
const blogAlts = [['en-ca', `${SITE}/blog/`], ['fr-ca', `${SITE}/fr/blog/`]];
const entries = [
  url(`${SITE}/`, today, '1.0', homeAlts), url(`${SITE}/fr/`, today, '0.9', homeAlts),
  url(`${SITE}/blog/`, today, '0.7', blogAlts), url(`${SITE}/fr/blog/`, today, '0.7', blogAlts),
  ...posts.map((p) => {
    const pair = p.pair ? bySlug(p.lang === 'en' ? 'fr' : 'en', p.pair) : null;
    return url(p.url, p.date, '0.6', pair ? [[`${p.lang}-ca`, p.url], [`${pair.lang}-ca`, pair.url]] : []);
  }),
  ...LEGACY.map((l) => url(SITE + l.path, today, '0.6')),
  ...['about', 'contact', 'privacy', 'terms'].map((n) => url(`${SITE}/${n}.html`, '2026-06-10', '0.3')),
];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);

const llmsPath = path.join(ROOT, 'llms.txt');
let llms = fs.readFileSync(llmsPath, 'utf8').replace(/\n## Guides[\s\S]*?(?=\n## |$)/, '');
const guides = `\n## Guides\n${posts.map((p) => `- [${p.h1}](${p.url}): ${p.description}`).join('\n')}\n`;
llms = llms.replace(/\n## Optional/, `${guides}\n## Optional`);
fs.writeFileSync(llmsPath, llms);

console.log(`built ${posts.length} guides (${posts.filter((p) => p.lang === 'en').length} EN, ${posts.filter((p) => p.lang === 'fr').length} FR), avg ${Math.round(posts.reduce((a, p) => a + p.words, 0) / Math.max(1, posts.length))} words`);

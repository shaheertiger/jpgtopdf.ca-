#!/usr/bin/env node
// Builds the whole static site (no dependencies):   node scripts/build.mjs
//   content/tools/*.md      -> /<slug>/index.html (and / for jpg-to-pdf)
//   content/tools/es/*.md   -> /es/<slug>/index.html
//   content/pages/*.md      -> /<slug>/index.html
//   posts/<lang>/*.md       -> /blog/<slug>/, /fr/blog/<slug>/ and the two guide indexes
//   plus sitemap.xml and llms.txt.
// The content linter runs first; the build stops on any error. The generated HTML is
// committed: Vercel serves the files as they are, with no build step.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, parse, md, esc } from './lib.mjs';
import { TOOLS, GROUPS, TRANSLATIONS, toolPath, bySlug } from './tools.mjs';
import { lint } from './check-content.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const YEAR = new Date().getFullYear();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => { const f = path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

if (!lint({ quiet: true })) { console.error('Content check failed. Run: node scripts/check-content.mjs'); process.exit(1); }

// The page sizes, dpi and file-size tables in the copy (homepage, PNG and combine guides, /fr/) are
// computed from these engine constants. If the converter changes, the build stops so the tables get redone.
{
  const core = read('assets/js/core.js'), conv = read('assets/js/images-to-pdf.js');
  const expect = [
    [core, 'PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] }'],
    [core, 'MM = 72 / 25.4'],
    [conv, "QUALITY = { original: { maxEdge: 0, q: 0.92 }, balanced: { maxEdge: 2480, q: 0.82 }, small: { maxEdge: 1600, q: 0.7 } }"],
    [conv, 'pw = dw * 0.75; ph = dh * 0.75; // 96 px per inch'],
  ];
  for (const [src, needle] of expect) if (!src.includes(needle)) { console.error(`Converter constant changed: "${needle}". Recompute the tables that quote it.`); process.exit(1); }
}

const T = {
  en: {
    htmlLang: 'en', og: 'en_US', skip: 'Skip to content', home: '/', homeName: 'Home',
    nav: [['/', 'JPG to PDF'], ['/heic-to-pdf/', 'HEIC to PDF'], ['/tiff-to-pdf/', 'TIFF to PDF'], ['/svg-to-pdf/', 'SVG to PDF'], ['/scan-to-pdf/', 'Scan to PDF'], ['/blog/', 'Guides'], ['/fr/', 'FR']],
    foot: 'Free JPG, PNG and photo to PDF converter that runs in your browser. Files never leave your device.',
    footNav: [['/how-it-works/', 'How it works'], ['/about.html', 'About'], ['/contact.html', 'Contact'], ['/privacy.html', 'Privacy'], ['/terms.html', 'Terms'], ['/es/jpg-a-pdf/', 'Español'], ['/fr/', 'Français']],
    project: 'A project of', pdfca: 'https://www.pdfcanada.ca/en', private: 'Files stay on your device — nothing is uploaded',
    noscript: 'This tool runs entirely in your browser and needs JavaScript turned on.', related: 'Related tools', allTools: 'All tools', seeAll: (n) => `See all ${n} free tools`,
    updated: 'Updated', crumbsTools: 'Tools',
  },
  fr: {
    htmlLang: 'fr-CA', og: 'fr_CA', skip: 'Aller au contenu', home: '/fr/', homeName: 'JPG en PDF',
    nav: [['/fr/', 'Convertisseur'], ['/fr/blog/', 'Guides'], ['/#tools', 'Outils (EN)'], ['/blog/', 'EN']],
    foot: 'Convertisseur JPG en PDF gratuit. Tout se passe dans votre navigateur.',
    footNav: [['/about.html', 'À propos'], ['/contact.html', 'Contact'], ['/privacy.html', 'Confidentialité'], ['/terms.html', 'Conditions']],
    project: 'Un projet de', pdfca: 'https://www.pdfcanada.ca/fr', private: 'Vos fichiers restent sur votre appareil — rien n’est téléversé',
    noscript: 'Cet outil fonctionne dans votre navigateur et nécessite JavaScript.',
  },
  es: {
    htmlLang: 'es', og: 'es_ES', skip: 'Ir al contenido', home: '/es/jpg-a-pdf/', homeName: 'Inicio',
    nav: [['/es/jpg-a-pdf/', 'JPG a PDF'], ['/es/blog/', 'Guías'], ['/', 'English']],
    foot: 'Conversor de JPG, PNG y fotos a PDF gratis que funciona en tu navegador. Tus archivos no salen de tu dispositivo.',
    footNav: [['/how-it-works/', 'Cómo funciona (EN)'], ['/about.html', 'Acerca de (EN)'], ['/privacy.html', 'Privacidad (EN)'], ['/', 'English']],
    project: 'Un proyecto de', pdfca: 'https://www.pdfcanada.ca/en', private: 'Tus archivos no salen de tu dispositivo: no se sube nada',
    noscript: 'Esta herramienta funciona en tu navegador y necesita JavaScript activado.', related: 'Herramientas relacionadas', updated: 'Actualizado',
  },
};

const ADSENSE = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2963693328827195" crossorigin="anonymous"></script>';
const ICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='black'/><text x='50' y='68' font-size='52' text-anchor='middle' fill='white' font-family='Arial'>PDF</text></svg>">`;
const ORG = { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'JPGtoPDF.ca', url: `${SITE}/`, logo: `${SITE}/og-image.png`, email: 'contact@jpgtopdf.ca', parentOrganization: { '@type': 'Organization', name: 'pdfcanada.ca', url: 'https://www.pdfcanada.ca/' } };

// Sitewide link box: the image-to-PDF pages, each linked with the wording people search
// (queries from Search Console, Nov 2026). One anchor per page; the current page is left out.
const LINKS = {
  en: { title: 'Images to PDF: more ways', links: [
    ['/', 'JPG to PDF converter'],
    ['/blog/png-to-pdf/', 'Convert PNG to PDF without losing quality'],
    ['/blog/combine-jpg-into-one-pdf/', 'Combine images into one PDF'],
    ['/blog/photo-to-pdf/', 'Convert a photo to PDF'],
    ['/heic-to-pdf/', 'HEIC to PDF'],
    ['/tiff-to-pdf/', 'Tagged image file format (TIFF) to PDF'],
    ['/svg-to-pdf/', 'SVG converter to PDF'],
    ['/scan-to-pdf/', 'Scan to PDF'],
    ['/blog/scan-document-to-pdf-phone/', 'How to scan a document to PDF on your phone'],
    ['/blog/jpg-to-pdf-windows/', 'JPG to PDF on Windows 10 and 11'],
    ['/blog/jpg-to-pdf-iphone/', 'Picture to PDF on iPhone'],
    ['/blog/jpg-to-pdf-android/', 'JPG to PDF on Android'],
    ['/blog/jpg-to-pdf-without-losing-quality/', 'JPG to PDF in high quality'],
    ['/blog/jpg-to-pdf-file-size/', 'PDF from photos too big?'],
    ['/fr/', 'JPG en PDF (français)', 'fr'],
  ] },
  fr: { title: 'Images en PDF : autres pages utiles', links: [
    ['/fr/', 'Convertir JPG en PDF'],
    ['/fr/blog/photo-en-pdf/', 'Mettre une photo en PDF'],
    ['/fr/blog/photo-en-pdf-android/', 'Photo en PDF sur Android'],
    ['/fr/blog/photo-en-pdf-iphone/', 'Photo en PDF sur iPhone'],
    ['/fr/blog/photo-en-pdf-pc-windows/', 'Photo en PDF sur PC'],
    ['/fr/blog/scanner-document-pdf-telephone/', 'Scanner un document en PDF avec son téléphone'],
    ['/fr/blog/regrouper-images-un-seul-pdf/', 'Regrouper plusieurs images en un seul PDF'],
    ['/fr/blog/png-en-pdf/', 'Convertir un PNG en PDF sans perte'],
    ['/fr/blog/reduire-taille-pdf-photo/', 'Réduire la taille d’un PDF de photos'],
    ['/fr/blog/envoyer-photo-en-pdf/', 'Envoyer une photo en PDF'],
    ['/', 'JPG to PDF (English)', 'en'],
  ] },
  es: { title: 'Imágenes a PDF: más guías', links: [
    ['/es/jpg-a-pdf/', 'Convertir JPG a PDF'],
    ['/es/blog/foto-a-pdf/', 'Convertir una foto a PDF'],
    ['/es/blog/unir-imagenes-en-un-pdf/', 'Unir imágenes en un PDF'],
    ['/es/blog/escanear-documento-pdf-celular/', 'Escanear un documento a PDF con el celular'],
    ['/es/blog/jpg-a-pdf-android/', 'JPG a PDF en Android'],
    ['/es/blog/jpg-a-pdf-iphone/', 'Foto a PDF en iPhone'],
    ['/', 'JPG to PDF (English)', 'en'],
  ] },
};
function linkBox(lang, current) {
  const B = LINKS[lang];
  const here = current.replace(SITE, '');
  return `<nav class="link-box wrap" aria-label="${esc(B.title)}"><h2>${esc(B.title)}</h2><ul>${B.links.filter(([h]) => h !== here).map(([h, t, hl]) => `<li><a href="${h}"${hl ? ` lang="${hl}" hreflang="${hl === 'fr' ? 'fr-ca' : hl}"` : ''}>${esc(t)}</a></li>`).join('')}</ul></nav>`;
}

function footerTools(lang) {
  if (lang !== 'en') return '';
  return `<nav class="foot-tools" aria-label="All tools">${GROUPS.map((g) => `<div><strong>${esc(g.name)}</strong>${TOOLS.filter((t) => t.group === g.id).map((t) => `<a href="${toolPath(t)}">${esc(t.name)}</a>`).join('')}</div>`).join('')}</nav>`;
}

function shell(lang, { title, description, canonical, alternates = [], schema, body, ogType = 'website', ads = false, scripts = '', extraHead = '' }) {
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
${ads ? ADSENSE + '\n' : ''}<link rel="canonical" href="${canonical}">
${alternates.map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${href}">`).join('\n')}
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title.replace(/ \| JPGtoPDF\.ca$/, ''))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="JPGtoPDF.ca">
<meta property="og:locale" content="${L.og}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${ICON}
<link rel="manifest" href="/site.webmanifest">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<link rel="stylesheet" href="/style.css">
${extraHead}<script defer src="https://cdn.vercel-insights.com/v1/script.js"></script>
</head>
<body>
<a class="skip-link" href="#main">${L.skip}</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" aria-label="JPGtoPDF.ca home">JPG<span>→</span>PDF</a>
    <nav aria-label="Primary">${L.nav.map(([h, t]) => `<a href="${h}"${h === '/fr/' ? ' lang="fr" hreflang="fr-ca"' : ''}>${t}</a>`).join('')}</nav>
  </div>
</header>
<main id="main">
${body}
${linkBox(lang, canonical)}
</main>
<footer class="site-footer">
  <div class="wrap">
    ${footerTools(lang)}
    <p>&copy; ${YEAR} JPGtoPDF.ca — ${L.foot}</p>
    <p class="project-of">${L.project} <a href="${L.pdfca}" rel="noopener">pdfcanada.ca</a></p>
    <nav aria-label="Footer">${L.footNav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
  </div>
</footer>
${scripts}</body>
</html>
`;
}

function toolBox(lang, t, ui) {
  const L = T[lang];
  return `<section class="tool wrap" id="tool" data-tool="${t.slug}" aria-labelledby="tool-h">
  <h2 id="tool-h" class="visually-hidden">${esc(ui.name)}</h2>
  <label class="dropzone" id="drop" for="file">
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>
    <strong>${esc(ui.drop)}</strong>
    <span>${esc(ui.dropSub)}</span>
    <span class="private">${L.private}</span>
    <input id="file" type="file" accept="${esc(t.accept)}"${t.multiple ? ' multiple' : ''} class="visually-hidden">
  </label>
  <div id="work" class="work" hidden></div>
  <progress id="progress" max="1" value="0" hidden></progress>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <noscript><p class="status error">${L.noscript}</p></noscript>
</section>`;
}

function toolSchema(lang, { url, name, data, r, crumbs, extra = [] }) {
  const graph = [
    { '@type': 'WebApplication', '@id': `${url}#app`, name, url, description: data.description, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in a web browser)', browserRequirements: 'Requires JavaScript. Current Chrome, Edge, Firefox or Safari.', isAccessibleForFree: true, inLanguage: T[lang].htmlLang, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, ...(data.features ? { featureList: data.features } : {}), dateModified: data.dateModified, publisher: { '@id': ORG['@id'] } },
    ...(r.howto ? [{ '@type': 'HowTo', name: r.howto.name, step: r.howto.steps.map((s, k) => ({ '@type': 'HowToStep', position: k + 1, name: s.name, text: s.text, url: `${url}#${r.heads.find(([, t]) => t === r.howto.name)?.[0] || ''}` })) }] : []),
    ...(r.faq.length ? [{ '@type': 'FAQPage', mainEntity: r.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([n, item], k) => ({ '@type': 'ListItem', position: k + 1, name: n, item })) },
    ORG,
    ...extra,
  ];
  return { '@context': 'https://schema.org', '@graph': graph };
}

function relatedBlock(lang, slugs, translated) {
  const L = T[lang];
  const items = (slugs || []).map((s) => (translated ? TRANSLATIONS.find((x) => x.slug === s) : bySlug[s])).filter(Boolean);
  if (!items.length) return '';
  return `<section class="related-tools wrap"><h2>${L.related}</h2><ul class="tool-grid">${items.map((t) => {
    const reg = bySlug[t.tool || t.slug];
    const href = translated ? `/${t.lang}/${t.slug}/` : toolPath(t);
    return `<li><a href="${href}"><strong>${esc(t.name)}</strong><span>${esc(translated ? '' : reg.blurb)}</span></a></li>`;
  }).join('')}</ul>${lang === 'en' ? `<p><a href="/#tools">${L.seeAll(TOOLS.length)} →</a></p>` : ''}</section>`;
}

function hub() {
  return `<section id="tools" class="hub wrap" aria-labelledby="tools-h">
  <h2 id="tools-h">Images to PDF: all ${TOOLS.length} free tools</h2>
  <p class="hub-lead">Every tool runs in your browser: no upload, no sign-up, no watermark.</p>
  ${GROUPS.map((g) => `<div class="hub-group" id="${g.id}"><h3>${esc(g.name)}</h3><ul class="tool-grid">${TOOLS.filter((t) => t.group === g.id).map((t) => `<li><a href="${toolPath(t)}"><strong>${esc(t.name)}</strong><span>${esc(t.blurb)}</span></a></li>`).join('')}</ul></div>`).join('\n  ')}
</section>`;
}

// ---------- tool pages ----------
const built = []; // for the sitemap: { url, lastmod, priority, alts }
const toolPages = [];
for (const t of TOOLS) {
  const file = `content/tools/${t.slug}.md`;
  const { data, body } = parse(read(file), file);
  const r = md(body, { sections: true });
  const url = SITE + toolPath(t);
  const isHome = t.slug === 'jpg-to-pdf';
  const group = GROUPS.find((g) => g.id === t.group);
  const crumbs = isHome ? [['Home', `${SITE}/`], [t.name, `${SITE}/`]] : [['Home', `${SITE}/`], [group.name, `${SITE}/#${group.id}`], [t.name, url]];
  const es = TRANSLATIONS.find((x) => x.tool === t.slug);
  const alternates = isHome
    ? [['en', `${SITE}/`], ['fr-ca', `${SITE}/fr/`], ['es', `${SITE}/es/jpg-a-pdf/`], ['x-default', `${SITE}/`]]
    : es ? [['en', url], ['es', `${SITE}/es/${es.slug}/`], ['x-default', url]] : [];
  const extra = isHome ? [
    { '@type': 'WebSite', '@id': `${SITE}/#site`, name: 'JPGtoPDF.ca', url: `${SITE}/`, inLanguage: 'en', publisher: { '@id': ORG['@id'] } },
    { '@type': 'ItemList', name: 'Free image to PDF tools', itemListElement: TOOLS.map((x, k) => ({ '@type': 'ListItem', position: k + 1, name: x.name, url: SITE + toolPath(x) })) },
  ] : [];
  const guides = isHome ? `<section class="wrap content" id="guides"><h2>Guides: photos, scans and screenshots to PDF</h2><ul class="list home-guides">${fs.readdirSync(path.join(ROOT, 'posts/en')).filter((f) => f.endsWith('.md')).sort().map((f) => { const p = parse(read(`posts/en/${f}`), f).data; return `<li><a href="${p.path || `/blog/${f.replace(/\.md$/, '')}/`}">${esc(p.h1)}</a></li>`; }).join('')}</ul></section>` : '';
  const html = r.html.replace('%%TOOLS%%', '</article>' + hub() + '<article class="tool-content wrap">').replace('%%GUIDES%%', '</article>' + guides + '<article class="tool-content wrap">');
  const crumbNav = isHome ? '' : `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/#${group.id}">${esc(group.name)}</a> › <span aria-current="page">${esc(t.name)}</span></nav>`;
  const page = `<section class="hero wrap">
  ${crumbNav}
  <h1>${esc(data.h1)}</h1>
  <p class="lead">${esc(data.lead)}</p>${isHome ? '\n  <p class="lead" lang="fr"><small><a href="/fr/" hreflang="fr-ca">Convertir JPG en PDF en français →</a> · <a href="/es/jpg-a-pdf/" hreflang="es" lang="es">JPG a PDF en español →</a></small></p>' : ''}${es && !isHome ? `\n  <p class="lang-switch"><a href="/es/${es.slug}/" hreflang="es" lang="es">En español</a></p>` : ''}
</section>
${toolBox('en', t, { name: t.name, drop: t.drop, dropSub: t.dropSub })}
<article class="tool-content wrap">
${html}
<p class="meta">${T.en.updated} <time datetime="${data.dateModified}">${data.dateModified}</time> · Runs in your browser · <a href="/how-it-works/">How it works</a></p>
</article>
${relatedBlock('en', data.related)}`.replace(/<article class="tool-content wrap">\s*<\/article>/g, '');
  write(isHome ? 'index.html' : `${t.slug}/index.html`, shell('en', {
    title: data.title, description: data.description, canonical: url, alternates,
    schema: toolSchema('en', { url, name: t.name, data, r, crumbs, extra }), body: page, ads: isHome,
    scripts: `<script type="module" src="/assets/js/tools/${t.slug}.js"></script>\n`,
  }));
  toolPages.push({ t, data, url, r });
  built.push({ url, lastmod: data.dateModified, priority: isHome ? '1.0' : '0.8', alts: alternates.filter(([h]) => h !== 'x-default') });
}

// ---------- translated tool pages ----------
for (const x of TRANSLATIONS) {
  const file = `content/tools/${x.lang}/${x.slug}.md`;
  const { data, body } = parse(read(file), file);
  const r = md(body, { sections: true });
  const t = bySlug[x.tool];
  const url = `${SITE}/${x.lang}/${x.slug}/`;
  const enUrl = SITE + toolPath(t);
  const alternates = [['en', enUrl], ...(x.tool === 'jpg-to-pdf' ? [['fr-ca', `${SITE}/fr/`]] : []), [x.lang, url], ['x-default', enUrl]];
  const crumbs = [['JPGtoPDF.ca', `${SITE}/`], [x.name, url]];
  const page = `<section class="hero wrap">
  <nav class="crumbs" aria-label="Ruta"><a href="/" hreflang="en">JPGtoPDF.ca</a> › <span aria-current="page">${esc(x.name)}</span></nav>
  <h1>${esc(data.h1)}</h1>
  <p class="lead">${esc(data.lead)}</p>
  <p class="lang-switch"><a href="${toolPath(t)}" hreflang="en" lang="en">In English</a></p>
</section>
${toolBox(x.lang, t, { name: x.name, drop: x.drop, dropSub: x.dropSub })}
<article class="tool-content wrap">
${r.html}
<p class="meta">${T[x.lang].updated} <time datetime="${data.dateModified}">${data.dateModified}</time></p>
</article>
${x.tool === 'jpg-to-pdf' && fs.existsSync(path.join(ROOT, `posts/${x.lang}`)) ? `<section class="wrap content" id="guias"><h2>Guías: fotos, escaneos e imágenes a PDF</h2><ul class="list home-guides">${fs.readdirSync(path.join(ROOT, `posts/${x.lang}`)).filter((f) => f.endsWith('.md')).sort().map((f) => `<li><a href="/${x.lang}/blog/${f.replace(/\.md$/, '')}/">${esc(parse(read(`posts/${x.lang}/${f}`), f).data.h1)}</a></li>`).join('')}</ul></section>\n` : ''}${relatedBlock(x.lang, data.related, true)}`;
  write(`${x.lang}/${x.slug}/index.html`, shell(x.lang, {
    title: data.title, description: data.description, canonical: url, alternates,
    schema: toolSchema(x.lang, { url, name: x.name, data, r, crumbs }), body: page,
    scripts: `<script type="module" src="/assets/js/tools/${x.tool}.js"></script>\n`,
  }));
  built.push({ url, lastmod: data.dateModified, priority: '0.8', alts: alternates.filter(([h]) => h !== 'x-default') });
}

// ---------- plain pages ----------
const pages = [];
for (const f of fs.readdirSync(path.join(ROOT, 'content/pages')).filter((f) => f.endsWith('.md'))) {
  const { data, body } = parse(read(`content/pages/${f}`), f);
  const slug = f.replace(/\.md$/, '');
  const r = md(body);
  const url = `${SITE}/${slug}/`;
  const schema = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: data.h1, url, description: data.description, dateModified: data.dateModified, publisher: { '@id': ORG['@id'] } }, ...(r.faq.length ? [{ '@type': 'FAQPage', mainEntity: r.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []), ORG] };
  write(`${slug}/index.html`, shell('en', { title: data.title, description: data.description, canonical: url, schema, body: `<article class="post wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a></nav><h1>${esc(data.h1)}</h1><p class="meta">Updated <time datetime="${data.dateModified}">${data.dateModified}</time></p>${r.html}</article>` }));
  pages.push({ slug, data, url });
  built.push({ url, lastmod: data.dateModified, priority: '0.5', alts: [] });
}

// ---------- guides (posts/<lang>/*.md) ----------
const G = {
  en: { blog: '/blog/', home: '/', homeName: 'JPG to PDF', blogName: 'Guides', blogTitle: 'JPG to PDF Guides: Photos, Scans and Screenshots to PDF | JPGtoPDF.ca', blogDesc: 'Step-by-step guides to turn photos, screenshots, scans and PNG files into PDF on iPhone, Android, Windows and Mac, plus file-size and quality fixes.', blogH1: 'JPG to PDF Guides', blogLead: 'Short, tested guides for turning pictures into PDF on every device, and fixing the file when a form rejects it.', toc: 'On this page', updated: 'Updated', by: 'By the JPGtoPDF.ca team', minutes: (n) => `${n} min read`, ctaTitle: 'Convert your images now', ctaText: 'Free, no sign-up, and nothing is uploaded: the PDF is made in your browser.', ctaBtn: 'Open the JPG to PDF converter', related: 'Related guides', other: 'Lire en français' },
  es: { blog: '/es/blog/', home: '/es/jpg-a-pdf/', homeName: 'JPG a PDF', blogName: 'Guías', blogTitle: 'Guías JPG a PDF: fotos, escaneos y capturas a PDF | JPGtoPDF.ca', blogDesc: 'Guías paso a paso para convertir fotos, documentos escaneados e imágenes JPG en PDF en iPhone, Android y la computadora, y para juntar varias en un solo archivo.', blogH1: 'Guías JPG a PDF', blogLead: 'Guías cortas y probadas para convertir tus imágenes en PDF en cada dispositivo.', toc: 'En esta página', updated: 'Actualizado el', by: 'Por el equipo de JPGtoPDF.ca', minutes: (n) => `${n} min de lectura`, ctaTitle: 'Convierte tus imágenes ahora', ctaText: 'Gratis, sin registro y sin subir nada: el PDF se crea en tu navegador.', ctaBtn: 'Abrir el conversor JPG a PDF', related: 'Guías relacionadas' },
  fr: { blog: '/fr/blog/', home: '/fr/', homeName: 'JPG en PDF', blogName: 'Guides', blogTitle: 'Guides JPG en PDF : photos, scans et captures en PDF | JPGtoPDF.ca', blogDesc: 'Guides pas à pas pour transformer une photo, une capture d’écran, un scan ou un PNG en PDF sur iPhone, Android et PC, et pour envoyer le fichier.', blogH1: 'Guides JPG en PDF', blogLead: 'Des guides courts et testés pour transformer vos images en PDF sur chaque appareil.', toc: 'Sur cette page', updated: 'Mis à jour le', by: 'Par l’équipe JPGtoPDF.ca', minutes: (n) => `${n} min de lecture`, ctaTitle: 'Convertissez vos images maintenant', ctaText: 'Gratuit, sans compte, et rien n’est téléversé : le PDF est créé dans votre navigateur.', ctaBtn: 'Ouvrir le convertisseur JPG en PDF', related: 'Guides liés', other: 'Read in English' },
};
const ghtml = (lang) => ({ fr: 'fr-CA', es: 'es' })[lang] || 'en-CA';
const HL = { en: 'en-ca', fr: 'fr-ca', es: 'es' };
const LANG_NAME = { en: 'English', fr: 'Français', es: 'Español' };
const BLOG_LANGS = ['en', 'fr', 'es'];
const blogAlts = BLOG_LANGS.map((l) => [HL[l], `${SITE}${G[l].blog}`]);
function card(c) {
  const steps = c.steps.slice(0, 4);
  const h = 130 + steps.length * 110;
  const wrap = (t, n) => { const w = t.split(' '); const lines = ['']; for (const x of w) { if ((lines.at(-1) + ' ' + x).trim().length > n) lines.push(x); else lines[lines.length - 1] = (lines.at(-1) + ' ' + x).trim(); } return lines; };
  const rows = steps.map((s, k) => {
    const y = 112 + k * 110;
    return `<g><rect x="32" y="${y}" width="72" height="72" rx="8" fill="currentColor"/><text x="68" y="${y + 49}" text-anchor="middle" font-size="36" font-weight="800" style="fill:var(--bg)">${k + 1}</text>${wrap(s, 34).map((ln, j) => `<text x="130" y="${y + 32 + j * 36}" font-size="31" fill="currentColor">${esc(ln)}</text>`).join('')}</g>`;
  }).join('');
  return `<figure class="card"><svg viewBox="0 0 760 ${h}" role="img" aria-labelledby="card-t card-d" xmlns="http://www.w3.org/2000/svg"><title id="card-t">${esc(c.title)}</title><desc id="card-d">${esc(c.alt)}</desc><rect x="2" y="2" width="756" height="${h - 4}" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><text x="32" y="72" font-size="40" font-weight="800" fill="currentColor">${esc(c.title)}</text>${rows}</svg><figcaption>${esc(c.alt)}</figcaption></figure>`;
}
const posts = [];
for (const lang of BLOG_LANGS) {
  for (const f of (fs.existsSync(path.join(ROOT, 'posts', lang)) ? fs.readdirSync(path.join(ROOT, 'posts', lang)) : []).filter((f) => f.endsWith('.md')).sort()) {
    const { data, body } = parse(read(`posts/${lang}/${f}`), f);
    const slug = f.replace(/\.md$/, '');
    // `path` in front matter keeps an old URL (e.g. /blog/x.html) for a page moved onto this template.
    const p = data.path || `${G[lang].blog}${slug}/`;
    // `date` is the publication date; `updated` (optional) is the last real content change.
    posts.push({ ...data, lang, slug, url: SITE + p, path: p, modified: data.updated || data.date, ...md(body) });
  }
}
const LEGACY = [
  { path: '/blog/how-to-convert-jpg-to-pdf.html', h1: 'How to Convert JPG to PDF Online in Canada', description: 'The full step-by-step guide to turning JPG and JPEG files into one PDF, free and private.' },
];
const postBy = (lang, slug) => posts.find((p) => p.lang === lang && p.slug === slug);
for (const p of posts) {
  const L = G[p.lang];
  // Translations are grouped by the English slug: non-English posts name it in `pair`.
  const key = p.lang === 'en' ? p.slug : p.pair;
  const group = key ? posts.filter((q) => (q.lang === 'en' ? q.slug : q.pair) === key) : [];
  const others = group.filter((q) => q !== p);
  const enPost = group.find((q) => q.lang === 'en');
  const alternates = others.length ? [...group.map((q) => [HL[q.lang], q.url]), ['x-default', (enPost || p).url]] : [];
  const related = (p.related || []).map((s) => postBy(p.lang, s)).filter(Boolean);
  const minutes = Math.max(2, Math.round(p.words / 230));
  // `tool: <registry slug>` in front matter puts that working converter right under the quick answer.
  const tool = p.tool && bySlug[p.tool];
  const toolUi = tool && (p.lang === 'en' ? { name: tool.name, drop: tool.drop, dropSub: tool.dropSub } : p.lang === 'fr' ? { name: 'Convertir des images en PDF', drop: 'Choisir des images', dropSub: 'ou déposez des fichiers JPG, PNG, WebP ou HEIC ici' } : TRANSLATIONS.find((x) => x.lang === p.lang && x.tool === p.tool));
  const embed = tool ? `</article>\n${toolBox(p.lang, tool, toolUi)}\n<article class="post wrap post-cont">` : '';
  const cta = `<aside class="cta-box"><strong>${L.ctaTitle}</strong><p>${L.ctaText}</p><a class="btn btn-primary" href="${L.home}">${L.ctaBtn}</a></aside>`;
  const body = `<article class="post wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${L.home}">${L.homeName}</a> › <a href="${L.blog}">${L.blogName}</a></nav>
  <h1>${esc(p.h1)}</h1>
  <p class="meta">${L.by} · ${L.updated} <time datetime="${p.modified}">${p.modified}</time> · ${L.minutes(minutes)}${others.map((q) => ` · <a href="${q.path}" hreflang="${HL[q.lang]}" lang="${q.lang}">${LANG_NAME[q.lang]}</a>`).join('')}</p>
  ${p.html.replace('%%CTA%%', cta).replace('%%CARD%%', card(p.card)).replace(/<h2 (?!id="(quick-answer|reponse-rapide|respuesta-rapida)")/, `<nav class="toc" aria-label="${L.toc}"><strong>${L.toc}</strong><ol>${p.heads.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>\n<h2 `).replace('%%TOOL%%', embed)}
  ${related.length ? `<section class="related"><h2>${L.related}</h2><ul class="list">${related.map((r) => `<li><a href="${r.path}">${esc(r.h1)}</a></li>`).join('')}</ul></section>` : ''}
</article>`;
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: p.h1, description: p.description, inLanguage: ghtml(p.lang), datePublished: p.date, dateModified: p.modified, mainEntityOfPage: p.url, image: `${SITE}/og-image.png`, author: { '@type': 'Organization', name: 'JPGtoPDF.ca', url: `${SITE}/about.html` }, publisher: { '@id': ORG['@id'] } },
    ...(p.faq.length ? [{ '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
    { '@type': 'BreadcrumbList', itemListElement: [[L.homeName, `${SITE}${L.home}`], [L.blogName, `${SITE}${L.blog}`], [p.h1, p.url]].map(([name, item], k) => ({ '@type': 'ListItem', position: k + 1, name, item })) },
    ORG,
  ] };
  const title = (p.title + ' | JPGtoPDF.ca').length <= 70 ? p.title + ' | JPGtoPDF.ca' : p.title;
  write(p.path.endsWith('.html') ? p.path : `${p.path}index.html`, shell(p.lang, { title, description: p.description, canonical: p.url, alternates, schema, body, ogType: 'article', ads: true, scripts: tool ? `<script type="module" src="/assets/js/tools/${tool.slug}.js"></script>\n` : '' }));
  built.push({ url: p.url, lastmod: p.modified, priority: '0.6', alts: alternates.filter(([h]) => h !== 'x-default') });
}
for (const lang of BLOG_LANGS) {
  const L = G[lang];
  const list = [...posts.filter((p) => p.lang === lang), ...(lang === 'en' ? LEGACY.map((l) => ({ ...l, url: SITE + l.path })) : [])];
  const url = `${SITE}${L.blog}`;
  const body = `<section class="hero wrap"><h1>${L.blogH1}</h1><p class="lead">${L.blogLead}</p></section>
<section class="content wrap"><ul class="post-list">${list.map((p) => `<li><a href="${p.path}"><strong>${esc(p.h1)}</strong></a><p>${esc(p.description)}</p></li>`).join('')}</ul></section>`;
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: L.blogH1, url, inLanguage: ghtml(lang), hasPart: list.map((p) => ({ '@type': 'Article', headline: p.h1, url: p.url })) };
  write(`${L.blog}index.html`, shell(lang, { title: L.blogTitle, description: L.blogDesc, canonical: url, alternates: [...blogAlts, ['x-default', `${SITE}/blog/`]], schema, body, ads: true }));
  const last = posts.filter((p) => p.lang === lang).map((p) => p.modified).sort().at(-1);
  built.push({ url, lastmod: last, priority: '0.5', alts: blogAlts });
}

// ---------- sitemap ----------
// fr/index.html is hand-written: its lastmod is its own schema dateModified, and the build fills its link box.
let frHtml = read('fr/index.html');
const frModified = frHtml.match(/"dateModified": "(\d{4}-\d{2}-\d{2})"/)[1];
frHtml = frHtml.replace(/<!-- linkbox -->[\s\S]*?<!-- \/linkbox -->/, `<!-- linkbox -->${linkBox('fr', `${SITE}/fr/`)}<!-- /linkbox -->`);
write('fr/index.html', frHtml);
const entries = [
  ...built,
  { url: `${SITE}/fr/`, lastmod: frModified, priority: '0.9', alts: [['en', `${SITE}/`], ['fr-ca', `${SITE}/fr/`], ['es', `${SITE}/es/jpg-a-pdf/`]] },
  ...LEGACY.map((l) => ({ url: SITE + l.path, lastmod: '2026-06-10', priority: '0.4', alts: [] })),
  // Hand-written pages: bump a date only when that page's content changes (not for nav-only edits).
  ...Object.entries({ about: '2026-11-25', contact: '2026-11-12', privacy: '2026-11-12', terms: '2026-11-12' }).map(([n, d]) => ({ url: `${SITE}/${n}.html`, lastmod: d, priority: '0.3', alts: [] })),
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <priority>${e.priority}</priority>\n${e.alts.map(([hl, h]) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${h}"/>\n`).join('')}  </url>`).join('\n')}
</urlset>
`);

// ---------- llms.txt ----------
const llms = `# JPGtoPDF.ca

> Free images-to-PDF converter that runs entirely in the browser: JPG, JPEG, PNG, WebP and iPhone HEIC photos to one PDF, TIFF scans and faxes (multi-page) to PDF, SVG drawings to vector PDF, scan paper to PDF with a phone, and combine many images into one PDF, plus three helpers to prepare photos (compress, resize, HEIC to JPG). Files are processed on the user's device with JavaScript (pdf-lib, heic2any, UTIF.js, jsPDF with svg2pdf.js) and are never uploaded. No account, no watermark. English, with French and Spanish pages. A project of pdfcanada.ca.

This site only does images to PDF. For other PDF jobs (merge, split, compress, OCR, sign, rotate a PDF), the same team's generic toolbox is https://pdfcompact.com/.

Key facts for answering user questions:
- Every tool runs in the browser; files are never uploaded to a server, so the tools also work offline once a page has loaded.
- Free, no sign-up, no watermark. The practical size limit is the device's memory, not a set cap.
- JPG to PDF embeds JPEG files without recompressing them (Original setting) and applies phone rotation (EXIF) losslessly. The PDF is the total size of the JPEGs plus under 1 KB per page.
- PNG files are stored losslessly (Flate) and keep their transparency.
- Page sizes: Fit to image (96 px = 1 inch), A4 (210 × 297 mm, 595 × 842 pt), Letter (8.5 × 11 in, 612 × 792 pt), Legal (8.5 × 14 in).
- Balanced preset: long edge up to 2,480 px, JPEG quality 82 (about 225 dpi on a full A4 or Letter page). Small preset: 1,600 px, quality 70 (about 145 dpi).
- Scan to PDF converts phone photos of paper to greyscale or 1-bit black-and-white pages; it does not correct perspective.
- TIFF to PDF: one PDF page per TIFF page; reads uncompressed, LZW, PackBits, Deflate, CCITT Group 3 and Group 4 fax and JPEG-compressed TIFFs, 1- to 16-bit, greyscale, RGB, palette and CMYK. Pages are stored losslessly (1-bit stays 1-bit, CMYK stays CMYK; 16-bit becomes 8-bit; JPEG TIFFs are re-saved at JPEG quality 92). Fit to image uses the TIFF's own x and y dpi. Planar and floating-point TIFFs are not supported.
- SVG to PDF: vector output by default (svg2pdf.js + jsPDF): shapes stay vectors and text stays selectable, in the PDF standard fonts (Helvetica, Times, Courier). Page size comes from the SVG's width/height (any unit), else its viewBox (96 units = 1 inch). Masks, filters and see-through gradients need the Image output (300 dpi PNG); text in non-Western scripts is saved as a 300 dpi image automatically; linked pictures and web fonts not stored in the SVG are left out.

## Tools
${GROUPS.map((g) => `### ${g.name}\n${TOOLS.filter((t) => t.group === g.id).map((t) => `- [${t.name}](${SITE}${toolPath(t)}): ${t.blurb}`).join('\n')}`).join('\n\n')}

## En español
${TRANSLATIONS.map((x) => `- [${x.name}](${SITE}/${x.lang}/${x.slug}/)`).join('\n')}
- [Guías JPG a PDF](${SITE}/es/blog/)

## Pages
- [How it works](${SITE}/how-it-works/): Why nothing is uploaded, which libraries run, and what each tool cannot do.
- [Convertir JPG en PDF (Français)](${SITE}/fr/): French version of the JPG to PDF converter.
- [Guides en français](${SITE}/fr/blog/): photo en PDF sur Android, iPhone et PC, scanner un document en PDF.
- [About](${SITE}/about.html): Who builds the site.
- [Contact](${SITE}/contact.html): contact@jpgtopdf.ca.
- [Privacy Policy](${SITE}/privacy.html): Data handling, cookies and advertising.
- [Terms of Service](${SITE}/terms.html)

## Guides
${posts.map((p) => `- [${p.h1}](${p.url}): ${p.description}`).join('\n')}

## Optional
- [Sitemap](${SITE}/sitemap.xml): All indexable URLs.
`;
write('llms.txt', llms);

console.log(`built ${toolPages.length} tool pages, ${TRANSLATIONS.length} translated, ${pages.length} pages, ${posts.length} guides; sitemap ${entries.length} URLs`);

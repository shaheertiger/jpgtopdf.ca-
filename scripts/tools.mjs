// The tool registry: one entry per tool page. The page copy lives in content/tools/<slug>.md;
// this file holds what the generator, the homepage hub, the sitemap and llms.txt need.
//   slug     URL path (/<slug>/), also the script name in /assets/js/tools/
//   name     short tool name used in the hub, breadcrumbs and related links
//   blurb    one line for the homepage hub (what it does, in plain words)
//   accept   file input accept attribute; multiple: allow several files
//   drop     drop-zone label, dropSub its second line
export const GROUPS = [
  { id: 'convert-to', name: 'Images to PDF' },
  { id: 'image', name: 'Prepare your images' },
];

const IMGS = { accept: 'image/*,.heic,.heif', multiple: true, drop: 'Select images', dropSub: 'or drop JPG, PNG, WebP or HEIC files here' };

// The site does one job: images to PDF. Generic PDF tools (merge, split, compress PDF, OCR…)
// moved to https://pdfcompact.com/<slug>; vercel.json 301s the old URLs there.
export const TOOLS = [
  // Images to PDF
  { slug: 'jpg-to-pdf', path: '/', name: 'JPG to PDF', group: 'convert-to', blurb: 'Turn JPG, PNG, WebP or HEIC pictures into one PDF, in the order you choose.', ...IMGS },
  { slug: 'heic-to-pdf', name: 'HEIC to PDF', group: 'convert-to', blurb: 'Put iPhone photos (HEIC) straight into a PDF without converting them first.', ...IMGS, dropSub: 'or drop HEIC photos here (JPG and PNG can be mixed in)' },
  { slug: 'scan-to-pdf', name: 'Scan to PDF', group: 'convert-to', blurb: 'Photograph paper with your phone and get a clean greyscale or black-and-white PDF.', ...IMGS, drop: 'Choose photos', dropSub: 'or drop photos of the pages here' },
  // Image helpers that serve the same job: get photos ready before they go into a PDF.
  { slug: 'compress-image', name: 'Compress image', group: 'image', blurb: 'Shrink JPG, PNG or WebP photos, or get them under a size like 200 KB.', ...IMGS },
  { slug: 'resize-image', name: 'Resize image', group: 'image', blurb: 'Resize to exact pixels or a preset for Instagram, YouTube or a visa photo.', ...IMGS },
  { slug: 'heic-to-jpg', name: 'HEIC to JPG', group: 'image', blurb: 'Convert iPhone HEIC photos to JPG (or PNG) that open everywhere.', ...IMGS, accept: '.heic,.heif,image/heic,image/heif', dropSub: 'or drop HEIC or HEIF photos here' },
];

// Translated tool pages. The slug is in the page's language; `tool` names the English
// registry entry whose script and file input it reuses.
export const TRANSLATIONS = [
  { lang: 'es', slug: 'jpg-a-pdf', tool: 'jpg-to-pdf', name: 'JPG a PDF', drop: 'Selecciona imágenes', dropSub: 'o suelta aquí archivos JPG, PNG, WebP o HEIC' },
];

export const toolPath = (t) => t.path || `/${t.slug}/`;
export const bySlug = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));

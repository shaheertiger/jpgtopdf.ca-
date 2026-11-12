// The tool registry: one entry per tool page. The page copy lives in content/tools/<slug>.md;
// this file holds what the generator, the homepage hub, the sitemap and llms.txt need.
//   slug     URL path (/<slug>/), also the script name in /assets/js/tools/
//   name     short tool name used in the hub, breadcrumbs and related links
//   blurb    one line for the homepage hub (what it does, in plain words)
//   accept   file input accept attribute; multiple: allow several files
//   drop     drop-zone label, dropSub its second line
export const GROUPS = [
  { id: 'convert-to', name: 'Convert to PDF' },
  { id: 'optimize', name: 'Compress' },
  { id: 'organize', name: 'Organize pages' },
  { id: 'edit', name: 'Edit and sign' },
  { id: 'convert-from', name: 'Convert from PDF' },
  { id: 'ocr', name: 'Scan and OCR' },
  { id: 'image', name: 'Image tools' },
];

const PDF = { accept: '.pdf,application/pdf', drop: 'Select a PDF', dropSub: 'or drop it here' };
const PDFS = { accept: '.pdf,application/pdf', multiple: true, drop: 'Select PDF files', dropSub: 'or drop them here' };
const IMGS = { accept: 'image/*,.heic,.heif', multiple: true, drop: 'Select images', dropSub: 'or drop JPG, PNG, WebP or HEIC files here' };

export const TOOLS = [
  // Convert to PDF
  { slug: 'jpg-to-pdf', path: '/', name: 'JPG to PDF', group: 'convert-to', blurb: 'Turn JPG, PNG, WebP or HEIC pictures into one PDF, in the order you choose.', ...IMGS },
  { slug: 'heic-to-pdf', name: 'HEIC to PDF', group: 'convert-to', blurb: 'Put iPhone photos (HEIC) straight into a PDF without converting them first.', ...IMGS, dropSub: 'or drop HEIC photos here (JPG and PNG can be mixed in)' },
  { slug: 'scan-to-pdf', name: 'Scan to PDF', group: 'ocr', blurb: 'Photograph paper with your phone and get a clean greyscale or black-and-white PDF.', ...IMGS, drop: 'Choose photos', dropSub: 'or drop photos of the pages here' },
  // Compress
  { slug: 'compress-pdf', name: 'Compress PDF', group: 'optimize', blurb: 'Make a PDF smaller, or get it under a set size such as 1 MB, 2 MB or 4 MB.', ...PDF },
  { slug: 'split-pdf-by-size', name: 'Split PDF by size', group: 'optimize', blurb: 'Cut a large PDF into parts that each stay under an upload limit.', ...PDF },
  // Organize
  { slug: 'merge-pdf', name: 'Merge PDF', group: 'organize', blurb: 'Combine several PDFs into one file, in the order you set.', ...PDFS },
  { slug: 'split-pdf', name: 'Split PDF', group: 'organize', blurb: 'Split a PDF into single pages, every few pages, or the ranges you type.', ...PDF },
  { slug: 'organize-pdf', name: 'Organize PDF', group: 'organize', blurb: 'Reorder, rotate and delete pages by dragging thumbnails.', ...PDF },
  { slug: 'delete-pdf-pages', name: 'Delete PDF pages', group: 'organize', blurb: 'Remove the pages you tick and keep everything else exactly as it was.', ...PDF },
  { slug: 'extract-pdf-pages', name: 'Extract PDF pages', group: 'organize', blurb: 'Save selected pages as a new PDF, or one PDF per page.', ...PDF },
  { slug: 'rotate-pdf', name: 'Rotate PDF', group: 'organize', blurb: 'Fix sideways or upside-down pages, one page or all of them, and save.', ...PDF },
  { slug: 'split-pdf-in-half', name: 'Split pages in half', group: 'organize', blurb: 'Cut scanned two-page spreads into single pages, left and right.', ...PDF },
  { slug: 'alternate-mix-pdf', name: 'Alternate and mix PDF', group: 'organize', blurb: 'Interleave pages from two PDFs, such as front sides and back sides of a scan.', ...PDFS },
  // Edit and sign
  { slug: 'sign-pdf', name: 'Sign PDF', group: 'edit', blurb: 'Draw, type or upload your signature and place it on the page.', ...PDF },
  { slug: 'add-image-to-pdf', name: 'Add image to PDF', group: 'edit', blurb: 'Place a photo, logo or stamp anywhere on an existing PDF page.', ...PDF },
  { slug: 'add-page-numbers', name: 'Add page numbers', group: 'edit', blurb: 'Number the pages: position, format (Page 1 of 9) and starting page.', ...PDF },
  { slug: 'watermark-pdf', name: 'Watermark PDF', group: 'edit', blurb: 'Stamp CONFIDENTIAL, DRAFT or any text across every page.', ...PDF },
  { slug: 'crop-pdf', name: 'Crop PDF', group: 'edit', blurb: 'Trim margins by drawing the area to keep on the page.', ...PDF },
  { slug: 'flatten-pdf', name: 'Flatten PDF', group: 'edit', blurb: 'Lock filled-in form fields, or turn every page into an image.', ...PDF },
  // Convert from PDF
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', group: 'convert-from', blurb: 'Save every page, or the pages you pick, as JPG images.', ...PDF },
  { slug: 'pdf-to-png', name: 'PDF to PNG', group: 'convert-from', blurb: 'Save pages as lossless PNG images for slides, edits or sharp text.', ...PDF },
  { slug: 'pdf-to-text', name: 'PDF to text', group: 'convert-from', blurb: 'Pull all the text out of a PDF into a plain .txt file.', ...PDF },
  // Scan and OCR
  { slug: 'ocr-pdf', name: 'OCR PDF', group: 'ocr', blurb: 'Make a scanned PDF searchable and copyable, keeping the pages as they look.', ...PDF },
  { slug: 'image-to-text', name: 'Image to text', group: 'ocr', blurb: 'Copy the text out of a photo, screenshot or scanned image.', ...IMGS, accept: 'image/*', dropSub: 'or drop JPG, PNG or screenshot files here' },
  { slug: 'compare-pdf', name: 'Compare PDF', group: 'edit', blurb: 'See every text change between two versions, with changed numbers flagged.', ...PDFS, drop: 'Select two PDFs', dropSub: 'the original first, then the changed version' },
  // Image tools
  { slug: 'compress-image', name: 'Compress image', group: 'image', blurb: 'Shrink JPG, PNG or WebP photos, or get them under a size like 200 KB.', ...IMGS },
  { slug: 'resize-image', name: 'Resize image', group: 'image', blurb: 'Resize to exact pixels or a preset for Instagram, YouTube or a visa photo.', ...IMGS },
  { slug: 'heic-to-jpg', name: 'HEIC to JPG', group: 'image', blurb: 'Convert iPhone HEIC photos to JPG (or PNG) that open everywhere.', ...IMGS, accept: '.heic,.heif,image/heic,image/heif', dropSub: 'or drop HEIC or HEIF photos here' },
];

// Translated tool pages. The slug is in the page's language; `tool` names the English
// registry entry whose script and file input it reuses.
export const TRANSLATIONS = [
  { lang: 'es', slug: 'comprimir-pdf', tool: 'compress-pdf', name: 'Comprimir PDF', drop: 'Selecciona un PDF', dropSub: 'o suéltalo aquí' },
  { lang: 'es', slug: 'unir-pdf', tool: 'merge-pdf', name: 'Unir PDF', drop: 'Selecciona archivos PDF', dropSub: 'o suéltalos aquí' },
  { lang: 'es', slug: 'dividir-pdf', tool: 'split-pdf', name: 'Dividir PDF', drop: 'Selecciona un PDF', dropSub: 'o suéltalo aquí' },
];

export const toolPath = (t) => t.path || `/${t.slug}/`;
export const bySlug = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));

---
title: SVG to PDF Converter Free — Vector PDF, Sharp Text, No Upload
description: Convert SVG files to a vector PDF in your browser: lines and text stay sharp at any zoom. Several SVGs make one PDF. Fit, A4 or Letter. Free, private.
h1: SVG to PDF Converter — Vector PDF That Stays Sharp
lead: Drop your SVG files, set the order, download one vector PDF.
dateModified: 2026-11-25
related: ["jpg-to-pdf", "tiff-to-pdf", "scan-to-pdf"]
features: ["Vector output: shapes and text stay sharp at any zoom", "Text stays selectable and searchable", "Several SVGs in one PDF, mixed with JPG or PNG", "Page size from the SVG's width, height or viewBox", "Fit to drawing, A4, Letter or Legal pages", "Image mode at 300 dpi for filters, masks and other alphabets", "Runs in the browser: nothing is uploaded"]
---

## Quick answer

Drop your SVG files into the box and press **Download PDF**. Each SVG becomes one page drawn as vector shapes, so lines and text stay sharp at any zoom and the text can still be selected. The page takes the SVG's own size (210 mm wide stays 210 mm). Several files make one PDF. Nothing is uploaded; it all runs in your browser.

## Limits

| What | Details |
|---|---|
| Price | Free, no account, no watermark |
| Where it runs | In your browser; files are never uploaded |
| Input | .svg and .svgz; JPG and PNG can be mixed in |
| Output | One PDF, one SVG per page, vector by default |
| Fonts | Text uses the built-in PDF fonts (Helvetica, Times, Courier), not the SVG's own font |
| Not drawn in vector mode | Masks, filters (blur, shadows), see-through gradients, embedded HTML: use Output: Image |
| Linked files | Pictures and fonts that are only linked, not stored inside the SVG, are left out |
| Browsers | Current Chrome, Edge, Firefox and Safari |

## How to convert SVG to PDF

1. **Select your SVG files.** Pick one or several; each becomes a page. You can add JPG or PNG files to the same PDF.
2. **Read the note under the thumbnails.** If a file uses something vector output can't draw (a blur, a mask, a linked picture, a web font), the tool says so here. This is the step people skip, then wonder why a shadow is missing.
3. **Pick the output.** Keep **Vector** for logos, charts, diagrams and plans. Choose **Image (exact look, 300 dpi)** if the note mentions masks or filters.
4. **Pick the page size.** **Fit to image** makes each page exactly the size of the drawing. A4, Letter or Legal centre the drawing on a standard page, scaled to fit, with an optional margin.
5. **Download the PDF.** Press **Download PDF** and the file saves to your device.

## Is the PDF really vector, or a picture of the SVG?

Vector. The converter (svg2pdf.js with jsPDF) turns each SVG path, shape, gradient and text element into the matching PDF drawing commands, then pdf-lib places that page in your PDF. Zoom in to 6,400% and edges stay sharp. Text stays text: in our test file, every line could be selected and copied from the PDF.

There are two cases where you get a picture instead, and the tool tells you which. If you choose **Image**, your browser draws the SVG at 300 dpi and the page is stored as a lossless PNG. And if the text uses characters the built-in PDF fonts can't show (Chinese, Arabic, Cyrillic, Greek and other non-Western scripts), that page is saved as a 300 dpi image automatically, because vector text would come out as random symbols.

## What page size will the PDF be?

The SVG decides. The page is taken from, in order:

| The SVG has | PDF page | Example |
|---|---|---|
| width and height with units | Exactly that size | width="210mm" height="297mm" gives an A4 page (595 × 842 pt) |
| width and height in px or no unit | 96 px = 1 inch | 640 × 360 gives 6.67 × 3.75 in |
| Only a viewBox | viewBox units as px | viewBox="0 0 400 300" gives 4.17 × 3.13 in |
| Neither | The drawing's own extent | measured from the shapes |

Width in % is treated like a missing width. To print a small logo on a full page, pick A4 or Letter instead of Fit to image.

## How big is the PDF?

Measured on our test files:

| Test SVG | SVG file | Vector PDF | Image PDF (300 dpi) |
|---|---|---|---|
| Bar chart, 12 bars with labels | 3.2 KB | 2.8 KB | 62 KB |
| A4 poster in mm | 352 B | 2.1 KB | 96 KB |
| Text in three fonts | 793 B | 2.3 KB | 62 KB |
| Gradients on a 400 × 300 viewBox | 706 B | 2.8 KB | 400 KB |
| Map-like drawing, 4,000 shapes | 571 KB | 334 KB | 3.96 MB |

Vector output is typically 10 to 150 times smaller than the image version, and it prints at the printer's full resolution.

## Why is a picture or font missing from my PDF?

An SVG can point to files outside itself: `<image href="photo.jpg">` or a web font loaded with `@font-face`. A browser page can't open files next to the SVG on your disk, and fetching addresses from the web would send requests about your file to other servers, so those links are left out and the tool tells you how many. Pictures stored inside the SVG (as data) are kept.

To keep them, save the SVG with its pictures embedded (Inkscape: Extensions → Images → Embed Images; Illustrator: set Images to Embed in the SVG options) and its text converted to outlines (Inkscape: Path → Object to Path; Illustrator: Type → Create Outlines). Outlined text looks identical in the PDF but can no longer be selected.

## Use cases

### Print shops and stickers

Printers ask for a vector PDF. Set your artboard size in mm or inches, export the SVG, and use Fit to image so the page matches the artboard.

### Charts for reports

Charts exported as SVG from spreadsheets or code stay crisp in a PDF report and their labels stay searchable.

### Plans and diagrams for e-filing

Permit and court portals usually want PDF. Use Letter or A4 with a margin so nothing sits at the edge.

### A logo for an email signature or letterhead (Gmail 25 MB)

A vector PDF of a logo is a few kilobytes, so it attaches anywhere.

## Troubleshooting

| Problem | Fix | Why |
|---|---|---|
| A shadow, blur or mask is missing | Choose Output: Image | svg2pdf.js doesn't draw SVG filters or masks as vectors |
| A gradient looks solid or too dark | Choose Output: Image | Gradient stops with transparency are not drawn correctly in vector mode |
| The font is different | Convert text to outlines before exporting, or use Image | Only the built-in PDF fonts are available for vector text |
| A picture is missing | Embed pictures in the SVG before converting | Linked files can't be reached from the browser |
| "not a valid SVG file" | Open and re-save the file in an editor | The XML is broken or the file isn't an SVG |
| The page is tiny | Choose A4 or Letter | Icons are often 24 or 48 px, which is a third of an inch |

## Frequently asked questions

### Is the SVG to PDF converter free?

Yes. No account, no watermark and no daily limit.

### Are my SVG files uploaded?

No. The SVG is read and converted in your browser, and scripts inside it are removed and never run. Your files stay on your device.

### Does the PDF keep vector quality?

Yes, in the default Vector mode. Shapes, lines and text are PDF vector drawings, so they stay sharp at any zoom and print size.

### Can I convert several SVGs into one PDF?

Yes. Select them together; each SVG becomes one page, and you can drag pages into order or add JPG and PNG files.

### Can I select the text in the PDF?

Yes, in Vector mode, as long as the text is real SVG text and not shapes. It is shown in Helvetica, Times or Courier, the PDF built-in fonts closest to the SVG's font family.

### Does it work for SVGZ files?

Yes. Compressed .svgz files are unpacked in the browser and converted the same way.

### Should I use this or JPG to PDF for an SVG?

Use this page. The [JPG to PDF converter](/) treats every file as a picture, while this tool keeps the drawing as vectors. For scanned TIFF files, use [TIFF to PDF](/tiff-to-pdf/).

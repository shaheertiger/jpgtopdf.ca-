---
title: How It Works: Why Nothing Is Uploaded | JPGtoPDF.ca
description: Every JPGtoPDF.ca tool runs in your browser. What happens to your photos, which open-source libraries do the work, what we can't see, and the limits.
h1: How it works: why nothing is uploaded
dateModified: 2026-11-25
---

Every tool on JPGtoPDF.ca, from [JPG to PDF](/) to [HEIC to PDF](/heic-to-pdf/) and [Scan to PDF](/scan-to-pdf/), runs inside your web browser. When you choose a file, your browser reads it from your device, the tool processes it with JavaScript, and the result is saved back to your device as a download. The file is never sent to our server or anyone else's.

## What happens to your file, step by step

1. **You choose a file.** The browser gives the page a copy of it in memory. Nothing is transmitted.
2. **The tool loads its engine.** The first time you use a tool, the browser downloads the program code it needs (for example the PDF library) from our site, like any other part of the page. Your file is not part of that download.
3. **Your device does the work.** Decoding photos, resizing, building the PDF pages: all of it runs on your computer or phone.
4. **You download the result.** The new file is created in memory and saved by your browser. When you close the tab, it is gone from the page.

You can check this yourself: load a tool, turn off Wi-Fi or mobile data, and use it. It keeps working, because there is no server step.

## Which libraries do the work

All the processing code is open source and served from our own domain, not from a third-party CDN:

| Library | What it does here |
|---|---|
| pdf-lib | Builds the PDF: one page per image, JPEGs copied in unchanged, PNGs stored losslessly |
| heic2any (libheif) | Decodes iPhone HEIC photos in browsers that can't open them natively |
| UTIF.js (with pako) | Decodes TIFF files, including multi-page scans and Group 3/4 faxes, for TIFF to PDF |
| svg2pdf.js and jsPDF | Turn SVG drawings into vector PDF pages for SVG to PDF |
| Your browser's canvas | Resizes and re-encodes photos when you pick Balanced, Small or a scan filter |

## What we can and can't see

We can't see your files, their names or their contents, because they never reach us. Our analytics (Vercel Web Analytics) counts page views and, for tools, that a tool was used, with no cookies and no file data. Some pages may show ads; see the [privacy policy](/privacy.html).

## Honest limits

- **Size:** there is no set cap. Your device's memory is the limit; dozens of phone photos work best on a laptop.
- **Text:** a PDF made from photos is pictures of text, not searchable text. For that you need OCR, such as [OCR PDF on pdfcompact.com](https://pdfcompact.com/ocr-pdf).
- **Perspective:** Scan to PDF cleans up colour and contrast but doesn't straighten a page shot at an angle.
- **Other PDF jobs:** this site only turns images into PDF. To merge, split, compress or sign an existing PDF, use [pdfcompact.com](https://pdfcompact.com/), our sister site.

## Frequently asked questions

### Do you keep a copy of my files?

No. Files are processed on your device and never uploaded, so there is nothing for us to keep.

### Does it work offline?

Yes, once a tool's page has loaded. The HEIC decoder is downloaded the first time you add an iPhone photo, then cached by your browser.

### Why does the first HEIC photo take longer?

The HEIC decoder (about 1.4 MB) downloads the first time. After that, your browser reuses it.

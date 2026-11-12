---
title: How It Works: Why Nothing Is Uploaded | JPGtoPDF.ca
description: Every JPGtoPDF.ca tool runs in your browser. What happens to your file, which open-source libraries do the work, what we can't see, and each tool's limits.
h1: How it works: why nothing is uploaded
dateModified: 2026-11-12
---

Every tool on JPGtoPDF.ca, from [JPG to PDF](/) to [Compress PDF](/compress-pdf/) and [OCR PDF](/ocr-pdf/), runs inside your web browser. When you choose a file, your browser reads it from your device, the tool processes it with JavaScript, and the result is saved back to your device as a download. The file is never sent to our server or anyone else's.

## What happens to your file, step by step

1. **You choose a file.** The browser gives the page a copy of it in memory. Nothing is transmitted.
2. **The tool loads its engine.** The first time you use a tool, the browser downloads the program code it needs (for example the PDF library) from our site, like any other part of the page. Your file is not part of that download.
3. **Your device does the work.** Merging, compressing, reading text, rendering pages: all of it runs on your computer or phone.
4. **You download the result.** The new file is created in memory and saved by your browser. When you close the tab, it is gone from the page.

You can check this yourself: load a tool, turn off Wi-Fi or mobile data, and use it. It keeps working, because there is no server step.

## Which libraries do the work

All the processing code is open source and served from our own domain, not from a third-party CDN:

| Library | What it does here |
|---|---|
| pdf-lib | Creates and edits PDFs: merge, split, rotate, page numbers, watermarks, signatures, compression |
| PDF.js (Mozilla) | Opens PDFs to show page previews, render pages as images and read their text |
| Tesseract | Reads text from images and scans for OCR (English, French, Spanish, Portuguese, German) |
| heic2any (libheif) | Decodes iPhone HEIC photos in browsers that can't open them natively |

## What we can and can't see

We can't see your files, their names or their contents, because they never reach us. Our analytics (Vercel Web Analytics) counts page views and, for tools, that a tool was used, with no cookies and no file data. Some pages may show ads; see the [privacy policy](/privacy.html).

## Honest limits

- **Size:** there is no set cap. Your device's memory is the limit; large PDFs work best on a laptop.
- **Passwords:** password-protected PDFs can't be edited until the password is removed.
- **OCR:** works on printed text in Latin-script languages. It doesn't read handwriting reliably.
- **Compression:** shrinks photos and scans inside a PDF. Text-only PDFs barely change.
- **Signatures:** [Sign PDF](/sign-pdf/) adds a visible electronic signature, not a certificate-based digital signature.

## Frequently asked questions

### Do you keep a copy of my files?

No. Files are processed on your device and never uploaded, so there is nothing for us to keep.

### Does it work offline?

Yes, once a tool's page has loaded. OCR also needs its language data, which is downloaded the first time and then cached by your browser.

### Why is the first run of OCR slower?

The text-recognition engine and language data (about 4–7 MB) download the first time. After that, your browser reuses them.

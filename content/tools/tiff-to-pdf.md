---
title: TIFF to PDF Free — Tagged Image File Format to PDF, No Upload
description: Convert TIFF and multi-page TIF files to one PDF in your browser. LZW, PackBits, Deflate, G3/G4 fax, JPEG; 1-bit to 16-bit, CMYK. Lossless, free.
h1: TIFF to PDF — Convert Tagged Image File Format (TIF) Files to PDF
lead: Drop your .tif or .tiff files, check the pages, download one PDF.
dateModified: 2026-11-25
related: ["jpg-to-pdf", "scan-to-pdf", "svg-to-pdf"]
features: ["Multi-page TIFF: one PDF page per TIFF page", "LZW, PackBits, Deflate, CCITT G3 and G4 fax, JPEG", "1-bit, 8-bit and 16-bit; greyscale, RGB, palette and CMYK", "Lossless: fax pages stay 1-bit, CMYK stays CMYK", "Page size from the TIFF's own dpi, or A4, Letter or Legal", "Mix TIFF with JPG and PNG in one PDF", "Runs in the browser: nothing is uploaded"]
---

## Quick answer

Drop your TIFF files into the box and press **Download PDF**. Every page of a multi-page TIFF becomes a PDF page, in order. Pages are stored losslessly: a fax stays black and white, CMYK stays CMYK, and **Fit to image** uses the dpi saved in the file, so a 300 dpi Letter scan becomes an 8.5 × 11 in page. Nothing is uploaded.

## Limits

| What | Details |
|---|---|
| Price | Free, no account, no watermark |
| Where it runs | In your browser; files are never uploaded |
| Input | .tif and .tiff, single or multi-page; JPG, PNG and WebP can be mixed in |
| Compression | None, LZW, PackBits, Deflate, CCITT Group 3 and Group 4 (fax), JPEG |
| Colour | 1-bit black and white, 2/4/8/16-bit greyscale, RGB, palette, CMYK; transparency is flattened on white |
| Not supported | Planar (separate-plane) TIFFs, floating-point TIFFs, Lab colour |
| Max size | Your device's memory; a 20-page fax took about 5 seconds in our test |
| Browsers | Current Chrome, Edge, Firefox and Safari |

## How to convert TIFF to PDF

1. **Select your TIFF files.** Pick one multi-page TIFF or several single-page ones. The tool reads every page and shows a thumbnail for each.
2. **Check the page order.** Drag thumbnails, or use ← and →. Pages of one TIFF stay in their saved order unless you move them. Tap ↻ to turn a sideways page.
3. **Pick the page size.** Keep **Fit to image** for a PDF the same physical size as the scan. Choose A4 or Letter if a portal asks for a standard page; the image is scaled to fit, never cropped.
4. **Keep Original quality for scans.** This is the step people get wrong: Balanced and Small re-save pages as JPEG, which made our 3-page text scan *bigger* (1.70 MB against 1.18 MB). Use them for photos only.
5. **Download the PDF.** Press **Download PDF**; the file saves to your device.

## What is the tagged image file format, and why convert it to PDF?

TIFF (tagged image file format, .tif or .tiff) is what scanners, fax software and print shops save by default. It can hold many pages in one file and keeps every pixel exactly. The catch: most phones, web browsers and upload forms can't open it, and email previews show nothing. A PDF opens everywhere and keeps the pages together, which is why forms ask for one.

## Will the PDF lose quality?

No, for every TIFF except JPEG-compressed ones. The decoded pixels go into the PDF unchanged: black-and-white pages as 1-bit images, greyscale, RGB and CMYK as lossless Flate, palette images with their colour table. We checked this by extracting the images back out of the PDFs and comparing them with the TIFFs pixel by pixel: zero difference on all 13 lossless test files.

Two things change on purpose. 16-bit TIFFs are reduced to 8 bits per channel, which is what screens and printers show. TIFFs that already use JPEG compression are re-saved as JPEG at quality 92 rather than stored losslessly, because lossless storage would make an already-lossy page 3–4 times bigger.

## How big will the PDF be?

Measured with our test files (Original quality, Fit to image):

| Test file | TIFF | PDF |
|---|---|---|
| 3-page Letter scan, greyscale, 300 dpi, LZW | 1.83 MB | 1.18 MB |
| Same scan, Balanced preset | 1.83 MB | 1.70 MB |
| Same scan, Small preset | 1.83 MB | 850 KB |
| 1-page fax, Group 4, one strip, 204 × 196 dpi | 42 KB | 43 KB |
| 20-page fax, Group 4, 204 × 196 dpi | 863 KB | 1.06 MB |
| 10-page black-and-white scan, Group 4, 300 dpi | 615 KB | 921 KB |
| 1-page fax, Group 3, 204 × 98 dpi | 44 KB | 22 KB |
| 768 × 512 photo, RGB, LZW | 1.18 MB | 802 KB |
| Same photo, 16-bit RGB, uncompressed | 2.25 MB | 802 KB |
| Same photo, CMYK, LZW | 1.31 MB | 857 KB |

A Group 4 page saved as a single strip is copied into the PDF as it is, so the size barely changes. Group 4 files split into strips (the usual layout) are decoded and stored as compressed 1-bit images, typically 1.2–1.5 times the TIFF size. If a black-and-white PDF is still too big for a portal, run it through [Compress PDF](https://pdfcompact.com/compress-pdf).

## What page size does the PDF get?

With **Fit to image**, each page takes its size from the TIFF's resolution tags, read separately for width and height. A 2550 × 3300 pixel scan at 300 dpi becomes 8.5 × 11 in. A standard-resolution fax (204 × 98 dpi, so pixels are twice as tall as they are wide) still comes out as a normal 8.5 × 11 in page instead of a squashed one. A TIFF with no dpi tag is placed at 96 pixels per inch, like a photo on the [JPG to PDF](/) page. Pages saved sideways with an orientation tag are turned upright.

## Use cases

### Fax archives

Fax software stores each received fax as a multi-page Group 3 or Group 4 TIFF. Convert one file per fax; every page is kept and stays sharp black and white.

### Court and government e-filing

E-filing portals usually accept PDF only. Scan at 300 dpi, convert with Original quality, and choose Letter if the portal asks for standard pages.

### IRCC and visa uploads (about 4 MB)

Black-and-white document scans stay far under 4 MB. For colour scans, try Small, then check the PDF before you upload.

### Sending scans by email (Gmail 25 MB)

Most people can't open a TIFF attachment on a phone. A PDF opens in any mail app, and many pages fit in one attachment.

## Troubleshooting

| Problem | Fix | Why |
|---|---|---|
| "planar … not supported" | Re-save the TIFF from your scanner software or an image editor with interleaved (chunky) pixels | Planar TIFFs store each colour channel separately, which the decoder can't read |
| The page is tiny or huge | Choose A4 or Letter instead of Fit to image | The file's dpi tag is missing or wrong |
| Colours look slightly different | Expected for CMYK files on screen | CMYK is kept as CMYK in the PDF; viewers convert it to screen colours their own way |
| The PDF is bigger than the TIFF | Keep Original quality; for fax files see the size table above | JPEG presets don't suit text scans; split Group 4 strips are re-compressed |
| Only some pages appear | Check the thumbnails; reduced-size preview pages are skipped on purpose | Some scanners save a small preview image as an extra page |

## Frequently asked questions

### Is TIFF to PDF free?

Yes. No account, no watermark and no daily limit.

### Are my TIFF files uploaded?

No. The TIFF is decoded and the PDF is built in your browser with open-source code served from this site (UTIF.js and pdf-lib). Your files stay on your device.

### Does it convert multi-page TIFFs?

Yes. Every page of a multi-page TIFF becomes one PDF page, in the saved order, and you can reorder or remove pages before downloading.

### Can it open fax TIFFs (CCITT Group 3 and Group 4)?

Yes. Group 3 and Group 4 fax TIFFs are decoded in the browser and stay 1-bit black and white in the PDF, including non-square fax resolutions such as 204 × 98 dpi.

### What is the difference between TIF and TIFF?

None. They are two spellings of the same format's file extension, and both work here.

### Is the text in the PDF searchable?

No. A TIFF is a picture of the page, so the PDF is too. To search or copy the text, run the PDF through [OCR PDF](https://pdfcompact.com/ocr-pdf).

### Can I combine TIFF and JPG files in one PDF?

Yes. Add TIFF, JPG and PNG files together and drag them into the order you want. For photos only, the [JPG to PDF converter](/) does the same job.

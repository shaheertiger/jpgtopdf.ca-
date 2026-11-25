---
title: How to Convert PNG to PDF Without Losing Quality (Free)
h1: How to Convert PNG to PDF Without Losing Quality
description: Convert PNG to PDF free, pixel for pixel: the PNG is stored losslessly and keeps its transparency. Measured file sizes, print dpi, and the one setting that blurs it.
date: 2026-11-11
updated: 2026-11-25
pair: png-en-pdf
tool: jpg-to-pdf
related: ["screenshot-to-pdf", "jpg-to-pdf-without-losing-quality", "combine-jpg-into-one-pdf", "jpg-to-pdf-windows"]
card: {"title": "PNG to PDF, lossless", "alt": "Select PNG files, keep the Original quality setting, choose Fit to image or Letter, then download the PDF.", "steps": ["Select one or more PNG files", "Keep quality on Original", "Fit to image for screen, Letter or A4 to print", "Download the PDF"]}
---

## Quick answer

To convert PNG to PDF without losing quality, select the PNG in the converter below, keep quality on **Original** and press **Download PDF**. The PNG is stored losslessly, so every pixel and its transparency are kept. In our test a 1,310 × 1,191 screenshot went from a 434 KB PNG to a 337 KB PDF. Only **Balanced** and **Small** turn it into a JPEG.

<!-- tool -->

You have a PNG (a screenshot, a logo, a chart, an exported design) and you need it as a PDF. The converter above does it in your browser, nothing is uploaded, and you can mix PNG and JPG files in one PDF.

Two things surprise people with PNGs: what happens to transparent areas, and file size. Both are measured below.

<!-- card -->

## How to Convert PNG to PDF (Step by Step)

1. **Select the PNG files.** Tap **Select images** above and pick one PNG or several. Add JPGs too if you need both in one file.
2. **Keep quality on Original.** This is the step people get wrong. Original stores the PNG losslessly; **Balanced** and **Small** resize it and save it as a JPEG, which softens text edges and fills transparent areas with white.
3. **Choose the page size.** **Fit to image** makes the page exactly the PNG's size (96 pixels = 1 inch). **Letter** or **A4** scales the PNG to fit the paper, for printing.
4. **Download and check.** Press **Download PDF**, zoom to 200% on text, and look at any area that was transparent.

## Does Converting PNG to PDF Lose Quality?

Not on Original. The PDF stores the PNG's pixels with the same kind of lossless compression (Flate) that PNG uses, so nothing is thrown away. We ran four PNGs through the same PDF library the converter uses and compared the sizes. The last column is the same picture saved as a JPEG at quality 92, for comparison.

| PNG | Pixels | PNG file | PDF made from it | As JPEG (q92) |
|---|---|---|---|---|
| Web page screenshot, with transparency | 1,310 × 1,191 | 434 KB | 337 KB | 248 KB |
| Text page (test image) | 1,170 × 2,532 | 281 KB | 239 KB | 524 KB |
| Illustration | 1,024 × 1,024 | 488 KB | 482 KB | 82 KB |
| Camera-style photo saved as PNG (test image) | 4,032 × 3,024 | 11.2 MB | 12.8 MB | 3.1 MB |

What it shows: for screenshots and text, the PDF is about the same size as the PNG or smaller, and a JPEG would be *bigger* for the text page while blurring it. For photos, PNG is the wrong format: the PDF is about four times the size of a JPEG of the same picture.

> **Key point:** Use PNG for screenshots, diagrams and text; use JPG for camera photos. Converting the "wrong" format to PDF just carries the problem along.

<!-- cta -->

## What Happens to a Transparent PNG Background?

On Original it stays transparent: the PDF keeps the PNG's transparency as a separate mask. PDF viewers draw the page white underneath, so a transparent area *looks* white. That's a problem for one case: a white logo on a transparent background becomes invisible. Put it on a coloured background in any image editor and export it again before converting.

On Balanced or Small, transparent areas are filled with solid white, because those settings save a JPEG and JPEG has no transparency.

## How Do I Convert a PNG to a High-Resolution PDF for Printing?

Print sharpness is pixels divided by inches. The converter turns landscape images onto landscape pages when orientation is Auto. This is what common PNG sizes give on a full page with no margin, computed from the converter's page sizes:

| PNG | On Letter | On A4 | Fit to image page |
|---|---|---|---|
| 1,920 × 1,080 screenshot | 175 dpi | 164 dpi | 508 × 286 mm |
| 2,560 × 1,440 screenshot | 233 dpi | 219 dpi | 677 × 381 mm |
| 1,170 × 2,532 iPhone screenshot | 230 dpi | 217 dpi | 310 × 670 mm |
| 800 × 600 image | 73 dpi | 73 dpi | 212 × 159 mm |

Over 150 dpi reads fine on paper; under 100 dpi looks blocky. The PDF can't add pixels that the PNG doesn't have, so for a high-resolution PDF, start from a bigger PNG (export the chart or design at 2× or 3×). Then choose Letter or A4, not Fit to image, so the printer doesn't have to shrink a 50 cm page.

## How Do I Change a PNG to a PDF on Windows, Mac, iPhone or Android?

| Device | Built-in way | Notes |
|---|---|---|
| Windows | Right-click → Print → Microsoft Print to PDF | Untick Fit picture to frame, [details](/blog/jpg-to-pdf-windows/) |
| Mac | Preview → File → Export as PDF | Or Finder → Quick Actions → Create PDF |
| iPhone | Files → long-press → Create PDF | [iPhone guide](/blog/jpg-to-pdf-iphone/) |
| Android | Google Photos → Print → Save as PDF | [Android guide](/blog/jpg-to-pdf-android/) |
| Any browser | The converter above | Mixes PNG and JPG, nothing uploaded |

Print-to-PDF routes go through the printer system, which can rescale the image to the paper. The browser converter places the PNG data in the PDF directly.

## PNG to PDF Problems and Fixes

| Problem | Fix | Why it works |
|---|---|---|
| Text looks soft in the PDF | Quality back to Original | Balanced and Small save a resized JPEG |
| White logo disappeared | Add a coloured background first | Viewers draw transparency on a white page |
| PDF much bigger than expected | Save photo-like PNGs as JPG first | Lossless storage is heavy for photos |
| Page is huge on screen | Choose Letter or A4 | Fit to image uses 1 px = 0.75 pt |
| Blurry when printed | Export a larger PNG | Under about 100 dpi on paper looks blocky |

## Frequently Asked Questions

### How do I convert PNG to PDF without losing quality?

Use a converter that stores the PNG losslessly, such as the one on this page with quality on Original. Every pixel is kept; only resizing or saving as JPEG would lose detail.

### Does converting PNG to PDF reduce quality?

Not on the Original setting: the PNG's pixels are stored losslessly in the PDF. Print-to-PDF and "smaller file" settings can rescale or recompress it.

### How do I change a PNG to a PDF for free?

Select it in the converter above and press Download PDF. Windows, Mac, iPhone and Android also have built-in Print to PDF or Create PDF options.

### What happens to a transparent PNG background in a PDF?

It stays transparent on Original, and viewers show the white page behind it. On Balanced or Small it is filled with white.

### Why is my PDF bigger than my PNG?

Usually it isn't: in our tests the PDF was 1–22% smaller for screenshots and graphics. A photo saved as PNG gave a PDF about 15% bigger; save photos as JPG first.

### How do I convert a PNG to a high-resolution PDF?

Start from a PNG with enough pixels (about 1,700 × 2,200 for 200 dpi on Letter), keep Original, and choose Letter or A4 pages.

### Can I combine PNG and JPG in one PDF?

Yes. Each image becomes a page, whatever its format. See [combine images into one PDF](/blog/combine-jpg-into-one-pdf/).

## The Bottom Line

- **PNG to PDF is lossless on Original:** ideal for screenshots, charts and text.
- **Transparency is kept**, but viewers show it as white.
- **Photos belong in JPG:** a PNG photo makes a PDF about four times heavier.

Next: [turn a screenshot into a PDF](/blog/screenshot-to-pdf/) or [keep JPGs sharp in a PDF](/blog/jpg-to-pdf-without-losing-quality/).

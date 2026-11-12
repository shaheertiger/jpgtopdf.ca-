---
title: Image to Text Free — Copy Text From a Photo, No Upload
description: Extract text from photos, screenshots and scanned images with OCR in your browser. English, French, Spanish, Portuguese, German. Free, nothing uploaded.
h1: Image to Text — Copy Text From a Photo or Screenshot (OCR)
lead: Drop an image, pick the language, copy the text.
dateModified: 2026-11-12
related: ["ocr-pdf", "pdf-to-text", "scan-to-pdf", "compress-image"]
features: ["OCR for JPG, PNG, WebP and screenshots", "English, French, Spanish, Portuguese and German", "Several images in one go", "Copy to clipboard or download .txt", "Shows an average confidence score", "Runs in the browser: nothing is uploaded"]
---

## Quick answer

Drop a photo, screenshot or scanned image, choose the document's language and press **Extract text**. Tesseract OCR reads it in your browser, roughly 3–10 seconds per image on a laptop and longer on phones, and you can copy the text or download a .txt file. Printed text in good light reads well; handwriting does not. Nothing is uploaded.

## Limits

| What | Details |
|---|---|
| Price | Free, no account |
| Where it runs | In your browser with Tesseract; images are never uploaded |
| Input | JPG, PNG, WebP, GIF, BMP and screenshots (not HEIC or PDF) |
| Languages | English, French, Spanish, Portuguese, German, English + French, English + Spanish |
| Output | Plain text: copy, or download a .txt file |
| First use | Downloads the OCR engine and language data once (about 4–7 MB), then cached |
| Works well on | Printed, typed or on-screen text |
| Doesn't read | Handwriting, very stylised fonts, non-Latin scripts |

## How to extract text from an image

1. **Add the image.** Drop it in or tap the box. You can add several; their text is joined, each under its file name.
2. **Choose the language.** Pick the language of the text, not your own. This is the step that matters most for accents and special letters: French text read as English loses its é and ç.
3. **Press Extract text.** The first run loads the engine; after that it starts straight away.
4. **Check the confidence.** Below 70% means the image was hard to read: check the text carefully or retake the photo.
5. **Copy or download.** Use **Copy text**, or save the .txt file.

## How accurate is image to text?

| Image | What to expect |
|---|---|
| Screenshot of a web page or app | Very accurate |
| Scan or flat photo of a printed page, good light | Accurate; check numbers and names |
| Photo at an angle or in dim light | Mistakes likely; retake straight on |
| Small text in a large photo | Crop to the text first |
| Handwriting | Mostly unreadable |

Tesseract reads printed Latin-script text. Large images are scaled to at most 4,000 pixels on the long side before reading.

Three things raise accuracy more than anything else: light (daylight or a bright room, no shadow across the text), angle (hold the phone parallel to the page), and size (the text should fill a good part of the frame). If only a small part of a big photo matters, crop to it first: the engine spends its effort on the text you care about, and stray objects around the page stop being read as letters.

## How do I copy text from a screenshot?

Take the screenshot as usual, drop the PNG here, keep the language on English (or the screen's language) and press Extract text. Screenshots are the easiest case for OCR because the text is perfectly sharp and straight.

## How do I get text out of a scanned PDF?

This page takes images. For a scanned PDF, use [OCR PDF](/ocr-pdf/), which reads every page and makes the PDF itself searchable. If the PDF already has selectable text, [PDF to text](/pdf-to-text/) is faster and exact.

## Use cases

### Quoting from a book or article photo

Photograph the page flat and straight, extract the text, and paste the quote instead of retyping it.

### Receipts and invoices for expense reports

Pull out totals and dates, then check the numbers against the image; OCR can confuse 1 and 7 on faded receipts.

### Text locked in an image on social media

Save the image and extract its text to copy a recipe, an address or a phone number.

### Translating a sign or menu

Extract the text in its original language, then paste it into a translator.

## Troubleshooting

| Problem | Fix | Why |
|---|---|---|
| "No text was found" | Use a sharper, brighter photo and the right language | The engine couldn't separate letters from the background |
| Accents are wrong | Choose the text's language | Each language has its own character model |
| Gibberish from handwriting | Type it, or use a handwriting app | Tesseract is trained on printed text |
| The first run is slow | Wait once; later runs are quick | The engine and language data download the first time |
| HEIC photo refused | Convert it with [HEIC to JPG](/heic-to-jpg/) first | This tool takes JPG, PNG and similar formats |

## Frequently asked questions

### Is image to text free?

Yes. No account, no limit on how many images you read.

### Are my images uploaded for OCR?

No. The OCR engine runs inside your browser, so the image and the text stay on your device.

### Which languages are supported?

English, French, Spanish, Portuguese and German, plus English + French and English + Spanish for mixed documents.

### Can it read handwriting?

Not reliably. It is built for printed and on-screen text; neat block capitals sometimes work, cursive almost never does.

### How long does it take?

Roughly 3–10 seconds per image on a laptop, longer on phones, plus a one-time download of about 4–7 MB the first time.

### Can I extract text from several images at once?

Yes. Add them all; the text of each appears in order, under its file name.

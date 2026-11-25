# JPGtoPDF.ca

Images to PDF, nothing else: JPG, PNG, HEIC and phone photos to one PDF, scan paper to PDF, and
three helpers that get photos ready (compress, resize, HEIC to JPG). Everything runs in the browser.
Static site on Vercel: no server code, no build step on deploy. The generated HTML is committed.

Generic PDF tools (merge, split, compress PDF, OCR, sign, rotate…) live on the sister site
https://pdfcompact.com/<slug>. Their old URLs here (and the Spanish /es/comprimir-pdf/, /es/unir-pdf/,
/es/dividir-pdf/) 301 there from `vercel.json`, with and without the trailing slash. Don't add a tool
that isn't part of the images-to-PDF job; send it to pdfcompact instead.

## Layout

| Path | What it is |
|---|---|
| `scripts/tools.mjs` | Tool registry: slug, name, group, hub blurb, file input |
| `content/tools/*.md` | One page of copy per tool (`es/` for Spanish). Rules: `content/README.md` |
| `content/pages/*.md` | Plain pages (How it works) |
| `posts/en`, `posts/fr`, `posts/es` | Guides. `date` = published, `updated` = last real content change (drives `dateModified` and the sitemap `lastmod`; leave it alone for template-only changes) |
| `assets/js/core.js` | Shared browser runtime (drop zone, status, download, ZIP, page grid) |
| `assets/js/tools/<slug>.js` | One script per tool |
| `vendor/` | Self-hosted pdf-lib and heic2any (PDF.js and Tesseract are no longer used by any page) |
| `fr/index.html` | French homepage (hand-written) |

## Commands

```
node scripts/check-content.mjs   # lint tool pages (template, lengths, banned claims, links)
node scripts/build.mjs           # lint, then build every page, sitemap.xml and llms.txt
node scripts/indexnow.mjs        # after deploy: ping IndexNow (host www.jpgtopdf.ca) with URLs changed today
```

## Adding a tool

1. Add it to `TOOLS` in `scripts/tools.mjs`.
2. Write `assets/js/tools/<slug>.js` (see `heic-to-pdf.js` or `compress-image.js`).
3. Write `content/tools/<slug>.md` following `content/README.md`.
4. Test it on 10 real files, then `node scripts/build.mjs` and commit the output.

A tool ships only if it is part of the images-to-PDF job, works on real files, has search demand,
and is a different job from every existing page.

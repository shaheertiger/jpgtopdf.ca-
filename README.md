# JPGtoPDF.ca

Free PDF and image tools that run entirely in the browser. Static site on Vercel: no server code,
no build step on deploy. The generated HTML is committed.

## Layout

| Path | What it is |
|---|---|
| `scripts/tools.mjs` | Tool registry: slug, name, group, hub blurb, file input |
| `content/tools/*.md` | One page of copy per tool (`es/` for Spanish). Rules: `content/README.md` |
| `content/pages/*.md` | Plain pages (How it works) |
| `posts/en`, `posts/fr` | Guides |
| `assets/js/core.js` | Shared browser runtime (drop zone, status, download, ZIP, page grid) |
| `assets/js/tools/<slug>.js` | One script per tool |
| `vendor/` | Self-hosted pdf-lib, PDF.js, Tesseract (+ language data), heic2any |
| `fr/index.html` | French homepage (hand-written) |

## Commands

```
node scripts/check-content.mjs   # lint tool pages (template, lengths, banned claims, links)
node scripts/build.mjs           # lint, then build every page, sitemap.xml and llms.txt
node scripts/indexnow.mjs        # after deploy: ping IndexNow with URLs changed today
```

## Adding a tool

1. Add it to `TOOLS` in `scripts/tools.mjs`.
2. Write `assets/js/tools/<slug>.js` (see `merge-pdf.js` or `rotate-pdf.js`).
3. Write `content/tools/<slug>.md` following `content/README.md`.
4. Test it on 10 real files, then `node scripts/build.mjs` and commit the output.

A tool ships only if it works on real files, has search demand, and is a different job from
every existing page.

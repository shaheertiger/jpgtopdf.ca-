# Tool page content

One Markdown file per tool: `content/tools/<slug>.md` (Spanish: `content/tools/es/<slug>.md`).
The registry (`scripts/tools.mjs`) holds the URL, group, hub blurb and drop-zone text.
`node scripts/build.mjs` checks the content (`scripts/check-content.mjs`) and fails on any error.

## Front matter

```
---
title: HEIC to PDF Free — iPhone Photos to One PDF, No Upload   ≤ 62 chars, tool name + a measurable promise
description: Put iPhone HEIC photos in one PDF in your browser. … 110–160 chars, a feature list, only what is true
h1: HEIC to PDF — Convert iPhone Photos Free                    tool + job
lead: Drop your photos, put them in order, download one PDF.  one line: what to do
dateModified: 2026-11-12                                       change only when facts change
related: ["heic-to-jpg", "jpg-to-pdf", "scan-to-pdf"]          3–4 true siblings (registry slugs)
features: ["HEIC and JPG mixed", "Original quality", "A4 or Letter"]   WebApplication featureList
---
```

## Body, top to bottom

1. `## Quick answer` — the first H2. One paragraph, **40–70 words**, the direct answer with numbers.
2. `## Limits` — a 2-column table, **6–9 rows**: price, where it runs, practical max size, pages, input, output, offline, browsers, account.
3. `## How to …` — an H2 starting "How to", then a numbered list. Start each step with a bold name (`1. **Pick the level.** …`). Name the step people get wrong. This becomes the HowTo schema.
4. **3–4 H2s that are real searches**, phrased as questions ("How do I compress a PDF to under 1 MB?").
5. **One comparison table** (levels, sizes, formats, or options).
6. **Use cases as named destinations**, 4–6 H3s: "Gmail (25 MB)", "IRCC upload (4 MB)", "WhatsApp", not "Business reports".
7. **Troubleshooting** — a table with the columns Problem | Fix | Why.
8. `## Frequently asked questions` — **6–8** `###` questions; answer in the first sentence.

Related tools are added by the generator from `related`. Link other tools in plain text where it helps: `[resize them](/resize-image/)`. Generic PDF jobs link out to `https://pdfcompact.com/<slug>`.

## Length

Main tools: 800–1,600 words. Small, specific tools: 500–1,500.

## Writing rules

- Every number must be true for our code. Use the measured numbers in this repo; when unsure, say "typically" with a conservative range, or leave the number out.
- Banned: "no file size limit" (memory is the limit), "unlimited", "military-grade", "bank-level", "AI-powered", "100% accurate", "#1".
- Say what the tool can't do (handwriting, encrypted files, layout). AI answers quote the honest line.
- No marketing filler ("seamless", "effortless", "in today's digital world"). Short sentences, plain words.
- Translations are complete: no English headings or sentences left on a translated page.

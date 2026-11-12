#!/usr/bin/env node
// Tells Bing, Yandex and other IndexNow engines about new or changed URLs. Run after a deploy:
//   node scripts/indexnow.mjs                 every URL whose <lastmod> is today
//   node scripts/indexnow.mjs --all           every URL in sitemap.xml
//   node scripts/indexnow.mjs /compress-pdf/  specific paths
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const HOST = 'jpgtopdf.ca';
const KEY = '9c365f8adf2945da934a5ff951181f57';
const args = process.argv.slice(2);
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({ url: m[1], lastmod: m[2] }));
const today = new Date().toISOString().slice(0, 10);
const urls = args.length && args[0] !== '--all'
  ? args.map((p) => `https://${HOST}${p.startsWith('/') ? p : '/' + p}`)
  : entries.filter((e) => args[0] === '--all' || e.lastmod === today).map((e) => e.url);
if (!urls.length) { console.log('No URLs to submit (nothing changed today). Use --all or pass paths.'); process.exit(0); }
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URL(s)`);

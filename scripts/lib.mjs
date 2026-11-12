// Shared by build.mjs and check-content.mjs: front matter, a small Markdown renderer, helpers.
export const SITE = 'https://jpgtopdf.ca';

export function parse(src, file) {
  const m = src.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no front matter`);
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (/^[[{"]/.test(v)) {
      try { v = JSON.parse(v); } catch (e) { throw new Error(`${file}: bad JSON in "${k}": ${e.message}`); }
    }
    data[k] = v;
  }
  return { data, body: m[2] };
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/`([^`]+)`/g, '$1');
export const words = (s) => plain(s).replace(/<!--[\s\S]*?-->/g, '').replace(/[|#>*-]/g, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length;

export function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h.replace(/&amp;/g, '&')}"${/^https?:/.test(h) && !h.startsWith(SITE) ? ' rel="noopener"' : ''}>${t}</a>`);
}

const FAQ_RE = /frequently asked|questions fréquentes|foire aux questions|preguntas frecuentes/i;
const ANSWER_RE = /^(quick answer|réponse rapide|respuesta rápida)$/i;
const LIMITS_RE = /^(limits|limites|límites)\b/i;
const HOWTO_RE = /^(how to|how do i|comment|cómo)\b/i;

// Renders the Markdown subset used by guides and tool pages. Returns html plus the parts the
// schema and the linter need: headings, faq, howto steps, the quick answer, the limits table.
export function md(body, { sections = false } = {}) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const out = [], heads = [], faq = [], tables = [];
  let inFaq = false, h2 = null, answer = null, limits = null, howto = null, open = false;
  let i = 0;
  const closeSection = () => { if (sections && open) { out.push('</section>'); open = false; } };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const marker = l.trim().match(/^<!-- ([a-z]+) -->$/);
    if (marker) { closeSection(); out.push(`%%${marker[1].toUpperCase()}%%`); i++; continue; }
    if (/^<!--/.test(l.trim())) { while (i < lines.length && !lines[i].includes('-->')) i++; i++; continue; }
    const h = l.match(/^(#{2,3}) (.+)$/);
    if (h) {
      const level = h[1].length, text = h[2].trim(), id = slugify(text);
      if (level === 2) {
        closeSection();
        heads.push([id, text]);
        h2 = text;
        inFaq = FAQ_RE.test(text);
        const cls = ANSWER_RE.test(text) ? 'answer' : LIMITS_RE.test(text) ? 'limits' : inFaq ? 'faq' : '';
        if (sections) { out.push(`<section id="${id}"${cls ? ` class="${cls}"` : ''}>`); open = true; }
      }
      if (level === 3 && inFaq) {
        const ans = [];
        let j = i + 1;
        while (j < lines.length && !/^#{2,3} /.test(lines[j])) { if (lines[j].trim()) ans.push(lines[j].trim()); j++; }
        faq.push([text, plain(ans.join(' '))]);
      }
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++; continue;
    }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const bodyRows = rows.slice(2).map(cells);
      tables.push({ h2, head, rows: bodyRows });
      if (h2 && LIMITS_RE.test(h2) && !limits) limits = { head, rows: bodyRows };
      out.push(`<div class="table-wrap"><table>${head.some((c) => c) ? `<thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${bodyRows.map((r) => `<tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (l.startsWith('> ')) {
      const q = [];
      while (i < lines.length && lines[i].startsWith('> ')) { q.push(lines[i].slice(2)); i++; }
      out.push(`<aside class="callout"><p>${inline(q.join(' '))}</p></aside>`);
      continue;
    }
    if (/^(\d+\.|-) /.test(l)) {
      const ordered = /^\d+\./.test(l);
      const items = [];
      while (i < lines.length && /^(\d+\.|-) /.test(lines[i])) { items.push(lines[i].replace(/^(\d+\.|-) /, '')); i++; }
      if (ordered && h2 && HOWTO_RE.test(h2) && !howto) {
        howto = { name: h2, steps: items.map((t) => { const b = t.match(/^\*\*([^*]+)\*\*\s*(.*)$/); return { name: plain(b ? b[1] : t).replace(/[.:]$/, ''), text: plain(b ? b[2] || b[1] : t) }; }) };
      }
      out.push(`<${ordered ? 'ol' : 'ul'} class="${ordered ? 'steps' : 'list'}">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |\||> |\d+\. |- |<!--)/.test(lines[i])) { p.push(lines[i].trim()); i++; }
    const text = p.join(' ');
    if (h2 && ANSWER_RE.test(h2) && answer == null) answer = plain(text);
    out.push(`<p>${inline(text)}</p>`);
  }
  closeSection();
  return { html: out.join('\n'), heads, faq, tables, answer, limits, howto, words: words(body) };
}

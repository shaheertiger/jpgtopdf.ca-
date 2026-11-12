// Text extraction shared by PDF to Text and Compare PDF.
// Rebuilds reading-order lines from pdf.js text items using their positions.
export async function pageText(page) {
  const tc = await page.getTextContent();
  const items = tc.items.filter((it) => 'str' in it);
  const lines = [];
  let line = null, lastY = null, lastX = null;
  for (const it of items) {
    const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || it.height || 10;
    if (line && lastY != null && Math.abs(y - lastY) <= h * 0.5) {
      const gap = x - lastX;
      line.text += (gap > h * 0.25 && !/\s$/.test(line.text) && !/^\s/.test(it.str) ? ' ' : '') + it.str;
    } else {
      line = { text: it.str, y };
      lines.push(line);
    }
    lastY = y; lastX = x + (it.width || 0);
    if (it.hasEOL) { line = null; lastY = null; }
  }
  return lines.map((l) => l.text.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Достаёт из PDF строки с координатами, размером и типом шрифта (b — жирный, r — обычный, m — моноширинный, i — курсив).
export async function dump(pdfjs, url) {
  const doc = await pdfjs.getDocument(url).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    await page.getOperatorList(); // чтобы шрифты загрузились в commonObjs
    const fontKind = {};
    for (const k in tc.styles) {
      let name = '';
      try { const fo = page.commonObjs.get(k); name = (fo && (fo.name || fo.loadedName)) || ''; } catch (e) { }
      const fam = tc.styles[k].fontFamily;
      fontKind[k] = fam === 'monospace' || /mono|courier|consol/i.test(name) ? 'm' : /bold|black|semibold|heavy/i.test(name) ? 'b' : /italic|oblique/i.test(name) ? 'i' : 'r';
      fontKind[k + '_name'] = name;
    }
    const its = tc.items.filter(i => i.str !== '').map(i => ({ x: +i.transform[4].toFixed(1), y: +i.transform[5].toFixed(1), w: +i.width.toFixed(1), s: +i.height.toFixed(1), f: fontKind[i.fontName] || 'r', fn: fontKind[i.fontName + '_name'], t: i.str }));
    const lines = [];
    for (const it of its) {
      let ln = lines.find(l => Math.abs(l.y - it.y) < 2.5);
      if (!ln) { ln = { y: it.y, segs: [] }; lines.push(ln); }
      ln.segs.push(it);
    }
    lines.sort((a, b) => b.y - a.y);
    lines.forEach(l => l.segs.sort((a, b) => a.x - b.x));
    pages.push({ n, w: page.view[2], h: page.view[3], lines });
  }
  return pages;
}

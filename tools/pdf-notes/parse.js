// Разбор выгрузки PDF (dump.js) в структуру конспекта для StudyPlay.
// Блоки: h, p, ul, ol, table, note, code, out, qa, quiz.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const near = (a, b, d = 0.2) => Math.abs(a - b) <= d;

/* ---------- строки ---------- */
function toks(segs) {
  // склеиваем сегменты в группы одного вида с пробелами по зазорам
  const out = []; let prevEnd = null;
  for (const s of segs) {
    if (s.t === '') continue;
    const isSpace = s.t.trim() === '';
    const gap = prevEnd == null ? 0 : s.x - prevEnd;
    let t = s.t;
    const k = s.f === 'm' ? 'm' : s.f === 'b' ? 'b' : s.f === 'i' ? 'i' : 'r';
    if (isSpace) { if (out.length) out[out.length - 1].t += ' '; prevEnd = s.x + s.w; continue; }
    const last = out[out.length - 1];
    // перед знаками препинания и после открывающей скобки пробел не нужен
    const noSp = /^[,.;:!?)»\]]/.test(t) || (last && /[(«\[]$/.test(last.t));
    const needSp = prevEnd != null && !noSp && gap > Math.max(1.2, (s.s || 9) * 0.12);
    if (last && last.k === k) { last.t += (needSp && !/\s$/.test(last.t) ? ' ' : '') + t; }
    else {
      if (last && needSp && !/\s$/.test(last.t)) last.t += ' ';
      out.push({ k, t });
    }
    prevEnd = s.x + s.w;
  }
  return out;
}
function htmlOf(tk) {
  return tk.map(g => {
    const m = g.t.match(/^(\s*)([\s\S]*?)(\s*)$/); const [_, a, body, z] = m;
    if (!body) return a + z;
    const e = esc(body);
    return a + (g.k === 'b' ? '<b>' + e + '</b>' : g.k === 'i' ? '<i>' + e + '</i>' : g.k === 'm' ? '<code>' + e + '</code>' : e) + z;
  }).join('').replace(/\s+/g, ' ').replace(/<\/b>(\s*)<b>/g, '$1')
    .replace(/(<\/(?:code|b|i)>)\s+([,.;:!?)»])/g, '$1$2').replace(/([(«])\s+(<(?:code|b|i)>)/g, '$1$2').trim();
}
function plainOf(tk, ticks) { return tk.map(g => g.k === 'm' && ticks ? g.t.replace(/^(\s*)(.*?)(\s*)$/, (m, a, b, z) => b ? a + '`' + b + '`' + z : m) : g.t).join('').replace(/\s+/g, ' ').trim(); }

function stream(pages, skip) {
  const L = [];
  for (const p of pages) {
    let prev = null;
    for (const l of p.lines) {
      const segs = l.segs.filter(s => s.t !== '');
      const real = segs.filter(s => s.t.trim() !== '');
      if (!real.length) continue;
      const s = real[0].s;
      const line = { page: p.n, y: l.y, x: real[0].x, s, segs, real, mono: real.every(r => r.f === 'm'), bold0: real[0].f === 'b' };
      line.tk = toks(segs); line.html = htmlOf(line.tk); line.text = plainOf(line.tk, false);
      if (skip && skip(line)) continue;
      line.gap = prev ? prev.y - l.y : 999; // 999 = новая страница
      prev = line; L.push(line);
    }
  }
  return L;
}
function sub(line, test) { // часть строки по условию на x
  const segs = line.segs.filter(s => test(s.x));
  const real = segs.filter(s => s.t.trim() !== '');
  if (!real.length) return null;
  const tk = toks(segs);
  return Object.assign({}, line, { segs, real, x: real[0].x, tk, html: htmlOf(tk), text: plainOf(tk, false), bold0: real[0].f === 'b', mono: real.every(r => r.f === 'm') });
}

/* ---------- код: восстанавливаем отступы по координатам ---------- */
function codeText(lines, base) {
  const out = []; let prev = null;
  for (const l of lines) {
    const cw = l.s * 0.6021;
    if (prev && l.page === prev.page) { const n = Math.round((prev.y - l.y) / (l.s * 1.27)) - 1; for (let i = 0; i < n && i < 3; i++) out.push(''); }
    let row = '';
    for (const s of l.segs) {
      if (s.t === '') continue;
      const col = Math.max(0, Math.round((s.x - base) / cw));
      if (row.length < col) row += ' '.repeat(col - row.length);
      else if (row.length > col && s.t.trim() && !/\s$/.test(row) && row.length) { /* наложение — дописываем как есть */ }
      row += s.t;
    }
    out.push(row.replace(/\s+$/, ''));
    prev = l;
  }
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  // убираем общий отступ слева (код в рамке может стоять правее обычного)
  const ind = Math.min.apply(null, out.filter(s => s.trim()).map(s => s.match(/^ */)[0].length).concat([99]));
  return out.map(s => s.slice(Math.min(ind, s.match(/^ */)[0].length))).join('\n').replace(/\u0000/g, '\t');
}

/* ---------- таблица: колонки по строке заголовка ---------- */
function table(lines, rowGap) {
  const head = lines[0];
  // колонки: начало нового сегмента после заметного разрыва (по концу предыдущего).
  // Берём строку с наибольшим числом колонок среди первых двух (у заголовка левая ячейка бывает пустой).
  const colsOf = ln => { const c = []; let lastEnd = -1e9; ln.real.forEach(s => { if (s.x - lastEnd > 8) c.push(s.x); lastEnd = s.x + s.w; }); return c; };
  let cols = colsOf(head);
  if (lines[1] && head.x > 100) { const c2 = colsOf(lines[1]); if (c2.length > cols.length) cols = c2; }
  const colOf = x => { let c = 0; cols.forEach((cx, i) => { if (x >= cx - 6) c = i; }); return c; };
  const rows = [];
  let cur = null;
  for (const l of lines) {
    const cellsSegs = cols.map(() => []);
    l.segs.forEach(s => cellsSegs[colOf(s.x)].push(s));
    const startsRow = !cur || l.gap > rowGap || l.gap === 999 && cellsSegs[0].some(s => s.t.trim());
    if (startsRow) { cur = cols.map(() => []); rows.push(cur); }
    cellsSegs.forEach((ss, i) => { const rs = ss.filter(s => s.t.trim()); if (rs.length) cur[i].push({ h: htmlOf(toks(ss)), r: rs[rs.length - 1].x + rs[rs.length - 1].w, lim: (cols[i + 1] || 560) - 14 }); });
  }
  // слово, разорванное переносом у правого края ячейки («ориентированна» + «я»), склеиваем
  const fix = rows.map(r => r.map(parts => parts.reduce((acc, pt, k) => {
    if (!k) return pt.h;
    const prev = parts[k - 1], txt = pt.h.replace(/<[^>]+>/g, ''), accTxt = acc.replace(/<[^>]+>/g, '');
    const m = txt.match(/^([а-яё]{1,3})(?=[\s(,.]|$)/);
    const glue = m && prev.r >= prev.lim - 6 && /[а-яё]$/i.test(accTxt);
    return glue ? (acc + pt.h).replace(/<\/b><b>/g, '').replace(/<\/i><i>/g, '') : acc + ' ' + pt.h;
  }, '')));
  const allBold = head.real.every(s => s.f === 'b');
  return { t: 'table', head: allBold, rows: fix };
}

/* ---------- абзацы и прочее (общий разбор текста) ---------- */
function proseBlocks(lines, cfg) {
  const B = [];
  let i = 0;
  const push = b => B.push(b);
  while (i < lines.length) {
    const l = lines[i];
    // код
    if (cfg.isCodeLine(l)) {
      const grp = []; while (i < lines.length && cfg.isCodeLine(lines[i])) grp.push(lines[i++]);
      const last = B[B.length - 1];
      const kind = last && last.t === 'label' && /Пример работы|Результат/i.test(last.text) ? 'out' : 'code';
      const cap = last && last.t === 'label' ? B.pop().text : '';
      push({ t: kind, cap, text: codeText(grp, cfg.codeBase) });
      continue;
    }
    if (cfg.isLabel(l)) { push({ t: 'label', text: l.text }); i++; continue; }
    if (cfg.isHeading(l)) { const parts = [l.html]; i++; while (i < lines.length && cfg.isHeading(lines[i]) && lines[i].gap < l.s * 1.6) parts.push(lines[i++].html); push({ t: 'h', html: parts.join(' ') }); continue; }
    if (cfg.isNote(l)) {
      const parts = [l.html]; const x0 = l.x; i++;
      while (i < lines.length && cfg.isNoteCont(lines[i], x0) && !cfg.isNoteStart(lines[i]) && lines[i].gap < 16) parts.push(lines[i++].html);
      const html = parts.join(' ');
      const m = html.match(/^<b>([^<]+?)[.:]?<\/b>\s*/);
      push({ t: 'note', kind: m ? m[1].replace(/[.:]\s*$/, '').trim() : '', html: m ? html.slice(m[0].length) : html });
      continue;
    }
    if (cfg.isTable(l) || (cfg.isTableHead && cfg.isTableHead(l) && lines[i + 1] && cfg.isTable(lines[i + 1]) && lines[i + 1].gap < 30)) {
      const grp = [l]; i++;
      const wrapOfFirstCol = n => near(n.s, l.s, 0.3) && n.gap < cfg.rowGap(l) && Math.abs(n.x - l.x) < 6 && !cfg.isNote(n);
      while (i < lines.length && (cfg.isTable(lines[i]) || cfg.isTableCont && cfg.isTableCont(lines[i], l) || wrapOfFirstCol(lines[i])) && (lines[i].gap < 30 || lines[i].gap === 999)) grp.push(lines[i++]);
      push(table(grp, cfg.rowGap(l)));
      continue;
    }
    if (cfg.isItem(l)) {
      const m = l.text.match(/^(•|\d+[.)])\s*/); const ordered = m && /\d/.test(m[1]);
      const items = [];
      while (i < lines.length && cfg.isItem(lines[i])) {
        const it = lines[i]; const mm = it.html.match(/^(?:•|\d+[.)])\s*/);
        const parts = [mm ? it.html.slice(mm[0].length) : it.html]; i++;
        while (i < lines.length && cfg.isItemCont(lines[i])) parts.push(lines[i++].html);
        items.push(parts.join(' '));
      }
      push({ t: ordered ? 'ol' : 'ul', items });
      continue;
    }
    // абзац
    const parts = [l.html]; const x0 = l.x; i++;
    while (i < lines.length) {
      const n = lines[i];
      if (cfg.isCodeLine(n) || cfg.isLabel(n) || cfg.isHeading(n) || cfg.isNote(n) || cfg.isTable(n) || cfg.isItem(n)) break;
      if (!cfg.paraCont(n, lines[i - 1], x0)) break;
      parts.push(n.html); i++;
    }
    push({ t: 'p', cls: cfg.paraCls ? cfg.paraCls(x0) : '', html: parts.join(' ') });
  }
  return B.filter(b => b.t !== 'label' || b.text);
}
const joinHyph = h => h.replace(/(\S)- (\S)/g, '$1-$2');

/* ================= ФИЛОСОФИЯ ================= */
export function parseFilo(pages) {
  const L = stream(pages, l => l.s <= 6.5 && l.y < 30);
  const doc = { subject: 'Философия', title: '', sub: '', intro: [], lectures: [] };
  // делим на лекции и разделы
  const chunks = []; let cur = { kind: 'intro', lines: [] }; chunks.push(cur);
  let lec = null;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (near(l.s, 12, 0.3) && /^(Лекция \d+|Финиш)/.test(l.text) && l.y > 770) {
      const parts = [l.text]; while (L[i + 1] && near(L[i + 1].s, 19, 0.5)) parts.push(L[++i].text);
      const t = parts.join(' ');
      const m = t.match(/^Лекция (\d+)\s*(.*)$/);
      lec = { id: m ? 'l' + m[1] : 'finish', n: m ? m[1] : '', title: m ? m[2] : t.replace(/^Финиш\s*/, ''), label: m ? 'Лекция ' + m[1] : 'Финиш', source: '', sections: [] };
      doc.lectures.push(lec); cur = { kind: 'text', title: '', lines: [], lec }; lec._chunks = [cur]; continue;
    }
    if (lec && near(l.s, 9.6, 0.3) && (/^Источник/.test(l.text) || lec._src)) {
      lec.source += (lec.source ? ' ' : '') + l.html.replace(/^<b>Источник:<\/b>\s*/, ''); lec._src = true; continue;
    }
    if (lec) lec._src = false;
    if (lec && near(l.s, 13, 0.3) && l.bold0) {
      const t = l.text;
      const kind = /^1\. Конспект/.test(t) ? 'text' : /^2\. Вопросы/.test(t) ? 'qa' : /^Блиц/.test(t) ? 'blitz' : /^3\. Тесты/.test(t) ? 'test' : 'text';
      cur = { kind, title: t.replace(/^\d+\.\s*/, ''), lines: [], lec }; lec._chunks.push(cur); continue;
    }
    if (!lec) {
      if (near(l.s, 28, 1)) { doc.title = l.text; continue; }
      if (near(l.s, 13, 0.3)) { doc.sub = l.text; continue; }
      if (near(l.s, 11.5, 0.3)) continue; // оглавление на 1-й странице — делаем своё
    }
    cur.lines.push(l);
  }
  const cfg = {
    codeBase: 0, isCodeLine: () => false, isLabel: () => false,
    isHeading: l => l.bold0 && (near(l.s, 11.4, 0.3) || near(l.s, 12, 0.3)) && l.real.every(s => s.f === 'b'),
    isNote: l => near(l.s, 9.8, 0.3) && /^(Запомни|Важно|Совет|Лайфхак)/.test(l.text) && l.real.length && !l.real.some(s => s.x > 300 && s.x < 340 && s.f === 'b' && l.real[0].x < 60 && /^(Рационализм|Эмпиризм)/.test(s.t)),
    isNoteStart: l => /^(Запомни|Важно|Совет)/.test(l.text),
    isNoteCont: (l, x0) => near(l.s, 9.8, 0.3) && l.x >= x0 - 3,
    isTable: l => (near(l.s, 9.8, 0.3) || near(l.s, 10, 0.2)) && !/^(Запомни|Важно|Совет)/.test(l.text) && (l.real.some(s => s.x > 160) || l.x < 50) && l.x < 60,
    rowGap: l => l.s * 1.45,
    isTableCont: l => (near(l.s, 9.8, 0.3) || near(l.s, 10, 0.2)) && l.x > 60 && !/^(Запомни|Важно)/.test(l.text),
    // нумерованный список с висячим отступом: «1.» левее, продолжение строки правее
    isItem: l => near(l.s, 10.6, 0.3) && l.x > 39 && l.x < 53 && /^\d+\.(\s|$)/.test(l.real[0].t.trim() + ' ') && /^\d+\.\s/.test(l.text),
    isItemCont: l => near(l.s, 10.6, 0.3) && l.x >= 50 && l.x <= 64 && !l.bold0 && !/^\d+\.\s/.test(l.text) && l.gap < 16.5,
    paraCont: (n, p, x0) => near(n.s, p.s, 0.4) && (n.gap < 16.5 || (n.gap === 999 && !/[.!?»]$/.test(p.text.trim()) && Math.abs(n.x - x0) < 4)) && !(n.x > 48 && n.bold0 && /[.:)»]$/.test(p.text.trim()) && n.x <= x0 + 3 && x0 > 48) && !(n.x > x0 + 8),
    paraCls: x0 => x0 > 48 ? 'ind' : ''
  };
  // разделы
  for (const lec2 of doc.lectures) {
    for (const ch of lec2._chunks) {
      if (!ch.lines.length && ch.kind === 'text' && !ch.title) continue;
      let sec;
      if (ch.kind === 'text') sec = { kind: 'text', title: ch.title || '', blocks: proseBlocks(ch.lines, cfg) };
      else if (ch.kind === 'qa') sec = { kind: 'qa', title: ch.title, blocks: filoQA(ch.lines) };
      else if (ch.kind === 'blitz') sec = { kind: 'qa', title: ch.title, blitz: true, blocks: filoBlitz(ch.lines) };
      else if (ch.kind === 'test') sec = { kind: 'test', title: ch.title, blocks: filoTest(ch.lines) };
      lec2.sections.push(sec);
    }
    delete lec2._chunks; delete lec2._src;
  }
  doc.intro = proseBlocks(chunks[0].lines, cfg);
  return doc;
}
function filoQA(lines) {
  const out = []; let cur = null; let ans = [];
  const flush = () => { if (cur) { cur.a = proseBlocks(ans, { codeBase: 0, isCodeLine: () => false, isLabel: () => false, isHeading: () => false, isNote: l => /^(Запомни|Важно)/.test(l.text), isNoteStart: l => /^(Запомни|Важно)/.test(l.text), isNoteCont: (l, x0) => near(l.s, 9.8, 0.3) && l.x >= x0 - 3, isTable: () => false, rowGap: () => 14, isItem: () => false, isItemCont: () => false, paraCont: (n, p) => n.gap < 16.5 && near(n.s, p.s, 0.4) }); out.push(cur); } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.bold0 && /^В\d+\./.test(l.text) && l.real.every(s => s.f === 'b')) {
      flush(); const parts = [l.text]; while (lines[i + 1] && lines[i + 1].real.every(s => s.f === 'b') && lines[i + 1].gap < 16 && !/^В\d+\./.test(lines[i + 1].text) && near(lines[i + 1].s, l.s, 0.3)) parts.push(lines[++i].text);
      const t = parts.join(' '); const m = t.match(/^(В\d+)\.\s*(.*)$/);
      cur = { t: 'qa', num: m[1], q: esc(m[2]) }; ans = []; continue;
    }
    if (cur) ans.push(l);
  }
  flush();
  return out;
}
function filoBlitz(lines) {
  const out = []; let cur = null;
  for (const l of lines) {
    const L = sub(l, x => x < 325), R = sub(l, x => x >= 325);
    if (L && (!cur || l.gap > 13.5)) { cur = { t: 'qa', q: L.html, a: [{ t: 'p', html: R ? R.html : '' }] }; out.push(cur); continue; }
    if (L && cur) cur.q += ' ' + L.html;
    if (R && cur) { const p = cur.a[0]; p.html = (p.html + ' ' + R.html).trim(); }
  }
  return out;
}
function filoTest(lines) {
  const qs = []; let key = '', inKey = false, intro = '';
  const cols = [];
  // колонки: сначала левая, потом правая на каждой странице
  const byPage = {};
  for (const l of lines) {
    if (/^Ключ ответов/.test(l.text) || (inKey && near(l.s, 9.8, 0.3))) { inKey = true; key += ' ' + l.text; continue; }
    inKey = false;
    if (/^Варианты перемешаны/.test(l.text)) { intro = l.text; continue; }
    (byPage[l.page] = byPage[l.page] || []).push(l);
  }
  Object.keys(byPage).sort((a, b) => a - b).forEach(pg => {
    const ls = byPage[pg];
    const left = ls.map(l => sub(l, x => x < 300)).filter(Boolean), right = ls.map(l => sub(l, x => x >= 300)).filter(Boolean);
    cols.push(...left, ...right);
  });
  let q = null, opt = null;
  for (const l of cols) {
    const t0 = l.real[0].t.trim();
    if (l.bold0 && /^\d+\.$/.test(t0)) {
      q = { num: +t0.replace('.', ''), q: '', opts: [] }; qs.push(q); opt = null;
      q.q = plainOf(toks(l.segs.slice(l.segs.indexOf(l.real[0]) + 1)), true); continue;
    }
    if (!q) continue;
    if (l.bold0 && /^[A-E]\)$/.test(t0)) { opt = { L: t0[0], t: plainOf(toks(l.segs.slice(l.segs.indexOf(l.real[0]) + 1)), true) }; q.opts.push(opt); continue; }
    if (opt) opt.t += ' ' + l.text; else q.q += ' ' + plainOf(l.tk, true);
  }
  const map = {}; key.replace(/(\d+)\s*[–-]\s*([A-E])/g, (m, n, L) => { map[+n] = L; });
  const quiz = qs.map(x => {
    const base = (x.q.match(/\[база №(\d+)\]/) || [])[1];
    return { q: x.q.replace(/\s*\[база №\d+\]\s*/, ' ').replace(/\s+/g, ' ').trim(), base: base ? +base : undefined, n: 1, opts: x.opts.map(o => ({ t: o.t.replace(/\s+/g, ' ').trim(), right: map[x.num] === o.L })) };
  });
  const bad = quiz.filter(x => x.opts.filter(o => o.right).length !== 1).length;
  return [{ t: 'quiz', intro, questions: quiz, check: { total: quiz.length, keyed: Object.keys(map).length, bad } }];
}

/* ================= C++ ================= */
export function parseCpp(pages) {
  const L = stream(pages, l => near(l.s, 7.6, 0.2) || l.page >= 2 && l.page <= 4);
  const doc = { subject: 'C++', title: '', sub: '', intro: [], lectures: [] };
  const intro = []; let lec = null, cur = null;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (near(l.s, 20, 0.5) && l.bold0 && /^(Лекция|Приложения)/.test(l.text)) {
      const parts = [l.text]; while (L[i + 1] && near(L[i + 1].s, 20, 0.5)) parts.push(L[++i].text);
      const t = parts.join(' ');
      const m = t.match(/^Лекция ([\dА-Я]+)\.\s*(.*)$/);
      lec = { id: m ? 'l' + m[1] : 'app', n: m ? m[1] : 'П', title: m ? m[2] : t.replace(/^Приложения\.\s*/, ''), label: m ? 'Лекция ' + m[1] : 'Приложения', sections: [] };
      doc.lectures.push(lec); cur = { kind: 'text', id: '', title: '', lines: [] }; lec._chunks = [cur]; continue;
    }
    if (lec && near(l.s, 13.2, 0.3) && l.bold0) {
      const m = l.text.match(/^([\dА-Я]+\.\d+)\s+(.*)$/) || [null, '', l.text];
      let t = m[2];
      // заголовок раздела в две строки
      while (L[i + 1] && near(L[i + 1].s, 13.2, 0.3) && L[i + 1].gap < 22 && !/^[\dА-Я]+\.\d+\s/.test(L[i + 1].text)) t += ' ' + L[++i].text;
      const kind = /^Задачи/.test(t) ? 'tasks' : /^Тест по теме/.test(t) ? 'test' : /^Контрольные вопросы/.test(t) ? 'control' : /Итоговый тест|^Тест/.test(t) ? 'test' : 'text';
      cur = { kind, id: m[1], title: t, lines: [] }; lec._chunks.push(cur); continue;
    }
    if (!lec) { intro.push(l); continue; }
    cur.lines.push(l);
  }
  const cfg = cppCfg();
  for (const lec2 of doc.lectures) {
    for (const ch of lec2._chunks) {
      if (!ch.lines.length && !ch.title) continue;
      let sec = { kind: ch.kind, id: ch.id, title: ch.title };
      if (ch.kind === 'tasks') sec.blocks = cppTasks(ch.lines, cfg);
      else if (ch.kind === 'test') sec.blocks = cppTest(ch.lines);
      else if (ch.kind === 'control') { sec.kind = 'qa'; sec.control = true; sec.blocks = cppControl(ch.lines); }
      else {
        // внутри приложения тоже может быть «Тест по теме — лекция П»
        const k = ch.lines.findIndex(l => near(l.s, 10.6, 0.3) && /^Тест по теме/.test(l.text));
        if (k >= 0) { sec.blocks = proseBlocks(ch.lines.slice(0, k), cfg); lec2.sections.push(sec); sec = { kind: 'test', id: ch.id + 't', title: ch.lines[k].text, blocks: cppTest(ch.lines.slice(k)) }; }
        else sec.blocks = proseBlocks(ch.lines, cfg);
      }
      lec2.sections.push(sec);
    }
    delete lec2._chunks;
  }
  doc.intro = proseBlocks(intro, cfg);
  return doc;
}
function cppCfg() {
  return {
    codeBase: 54,
    isCodeLine: l => l.mono && near(l.s, 8.1, 0.25),
    isLabel: l => near(l.s, 7.8, 0.2) && l.bold0,
    isHeading: l => near(l.s, 10.6, 0.3) && l.bold0 && l.real.every(s => s.f === 'b'),
    isNote: l => (near(l.s, 9.1, 0.25)) && l.bold0 && /^(Запомни|Нюанс|Важно|Совет|Ловушка|Частая ошибка|Ошибка|Обрати внимание|Подсказка)/.test(l.text),
    isNoteStart: l => near(l.s, 9.1, 0.25) && l.bold0 && /^(Запомни|Нюанс|Важно|Совет|Ловушка|Частая ошибка|Ошибка|Обрати внимание|Подсказка)\.?/.test(l.text),
    isNoteCont: (l, x0) => (near(l.s, 9.1, 0.25) || near(l.s, 8.4, 0.25)) && near(l.x, x0, 4),
    isTable: l => (near(l.s, 8.7, 0.25) || near(l.s, 8.4, 0.25)) && l.x > 50.5 && l.x < 55.5,
    isTableCont: (l) => (near(l.s, 8.7, 0.25) || near(l.s, 8.4, 0.25)) && l.x > 58.5 && l.x < 520,
    isTableHead: l => (near(l.s, 8.7, 0.25) && l.real.every(s => s.f === 'b') || near(l.s, 8.4, 0.25) && l.mono) && l.x > 100,
    rowGap: () => 13.5,
    isItem: l => near(l.s, 10, 0.25) && /^(•|\d+\.)$/.test(l.real[0].t.trim()) && l.x < 60,
    isItemCont: l => near(l.s, 9.4, 0.3) && l.x > 58 && l.x < 75 || (near(l.s, 8.4, 0.25) && l.x > 58 && l.x < 75),
    paraCont: (n, p, x0) => (near(n.s, 9.4, 0.4) || near(n.s, 8.4, 0.3)) && n.gap < 17 && n.gap !== 999 && Math.abs(n.x - x0) < 4 || (n.gap === 999 && (near(n.s, 9.4, 0.4)) && Math.abs(n.x - x0) < 4 && !/[.:!?]$/.test(p.text.trim()))
  };
}
function cppTasks(lines, cfg) {
  const out = []; let pre = [], cur = null, part = null;
  const flush = () => {
    if (!cur) return;
    const blocks = proseBlocks(cur.lines, cfg);
    const k = blocks.findIndex(b => b.t === 'code' || b.t === 'out' || b.t === 'label');
    cur.q = blocks.slice(0, k < 0 ? blocks.length : k);
    cur.a = k < 0 ? [] : blocks.slice(k);
    delete cur.lines; out.push(cur);
  };
  for (const l of lines) {
    if (near(l.s, 10.6, 0.3) && l.bold0 && /^Задача/.test(l.text)) { flush(); const m = l.text.match(/^Задача\s+([\dА-Я.]+?)\.?\s+(.*)$/); cur = { t: 'qa', task: true, num: m ? m[1] : '', title: m ? m[2] : l.text, lines: [] }; continue; }
    if (cur) cur.lines.push(l); else pre.push(l);
  }
  flush();
  return proseBlocks(pre, cfg).concat(out);
}
function cppTest(lines) {
  const qs = []; let q = null, opt = null, key = '', inKey = false, title = '';
  for (const l of lines) {
    if (near(l.s, 10.6, 0.3) && /^Тест по теме/.test(l.text)) { title = l.text; continue; }
    if (/^Ключи/.test(l.text) || inKey) { inKey = true; key += ' ' + l.text; continue; }
    const t0 = l.real[0].t.trim();
    if (l.bold0 && /^\d+\.$/.test(t0) && near(l.s, 9.3, 0.3)) { q = { num: +t0.slice(0, -1), q: plainOf(toks(l.segs.slice(l.segs.indexOf(l.real[0]) + 1)), true), opts: [] }; qs.push(q); opt = null; continue; }
    if (!q) continue;
    const mo = l.text.match(/^([а-д])\)\s*/);
    if (mo && near(l.s, 9, 0.3)) {
      const txt = plainOf(l.tk, true).replace(/^[а-д]\)\s*/, '');
      opt = { L: mo[1], t: txt }; q.opts.push(opt); continue;
    }
    if (l.mono && near(l.s, 8.1, 0.3)) { // код внутри вопроса
      if (!q._code) { q._code = []; } q._code.push(l); continue;
    }
    if (opt) opt.t += ' ' + plainOf(l.tk, true); else q.q += ' ' + plainOf(l.tk, true);
  }
  const map = {}; key.replace(/(\d+)\s*[–-]\s*([а-д])/g, (m, n, L) => { map[+n] = L; });
  const quiz = qs.map(x => ({ q: (x.q.trim() + (x._code ? '\n```cpp\n' + codeText(x._code, 54) + '\n```' : '')).trim(), n: 1, opts: x.opts.map(o => ({ t: o.t.replace(/\s+/g, ' ').trim(), right: map[x.num] === o.L })) }));
  const bad = quiz.filter(x => x.opts.filter(o => o.right).length !== 1).length;
  return [{ t: 'quiz', intro: title, questions: quiz, check: { total: quiz.length, keyed: Object.keys(map).length, bad } }];
}
function cppControl(lines) {
  const out = []; let cur = null;
  for (const l of lines) {
    const t0 = l.real[0].t.trim();
    if (near(l.s, 10, 0.25) && /^\d+\.$/.test(t0)) { cur = { t: 'qa', control: true, num: t0.slice(0, -1), qh: htmlOf(toks(l.segs.slice(l.segs.indexOf(l.real[0]) + 1))) }; out.push(cur); continue; }
    if (cur) cur.qh += ' ' + l.html;
  }
  out.forEach(c => { const m = c.qh.match(/\s*\(([\dА-Я.,\s–-]+)\)\s*$/); c.refs = m ? m[1].split(/,\s*/).map(s => s.trim()) : []; c.q = m ? c.qh.slice(0, m.index).trim() : c.qh; delete c.qh; c.a = []; });
  return out;
}

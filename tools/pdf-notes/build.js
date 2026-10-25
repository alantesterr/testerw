// Полная сборка: разбор обоих PDF + ответы на контрольные вопросы → *.final.json
export async function build() {
  const P = await import('/parse.js?' + Date.now());
  const c = await (await fetch('/out/cpp.raw.json')).json(); const dc = P.parseCpp(c);
  const ans = await (await fetch('/answers.json?' + Date.now())).json(); let n = 0; const miss = [];
  dc.lectures.forEach(l => l.sections.forEach(s => { if (s.control) s.blocks.forEach(b => { const a = ans[l.n + '|' + b.num]; if (a) { b.a = [{ t: 'html', html: a }]; b.own = true; n++; } else miss.push(l.n + '|' + b.num); }); }));
  dc.intro = []; // титульная страница PDF: её текст уже есть в подзаголовке
  dc.title = 'Программирование I · подготовка к РК1'; dc.sub = 'Темы 1–7, Borland C++ 6.0: лекция → примеры и нюансы → задачи с решениями → тест → ключи';
  const f = await (await fetch('/out/filo.raw.json')).json(); const df = P.parseFilo(f);
  await fetch('/save/cpp.final.json', { method: 'POST', body: JSON.stringify(dc) });
  await fetch('/save/filo.final.json', { method: 'POST', body: JSON.stringify(df) });
  const tables = [];
  const walk = (d, lab) => d.lectures.concat([{ label: 'intro', sections: [{ blocks: d.intro }] }]).forEach(l => l.sections.forEach(s => (s.blocks || []).forEach(b => { if (b.t === 'table') tables.push(lab + ' ' + l.label + ' ' + (s.id || '') + ': ' + b.rows.length + 'x' + b.rows[0].length); })));
  walk(dc, 'C'); walk(df, 'F');
  return { merged: n, miss, tables: tables.length, ftables: tables.filter(t => t[0] === 'F') };
}

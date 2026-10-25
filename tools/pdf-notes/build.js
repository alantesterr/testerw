// Полная сборка: разбор обоих PDF + ответы на контрольные вопросы + «простыми словами» к задачам → *.final.json
export async function build() {
  const P = await import('/parse.js?' + Date.now());
  const c = await (await fetch('/out/cpp.raw.json')).json(); const dc = P.parseCpp(c);
  const ans = await (await fetch('/answers.json?' + Date.now())).json();
  const plain = await (await fetch('/plain.json?' + Date.now())).json();
  let n = 0, np = 0; const miss = [], missPlain = [];
  dc.lectures.forEach(l => l.sections.forEach(s => (s.blocks || []).forEach(b => {
    if (s.control && b.t === 'qa') { const a = ans[l.n + '|' + b.num]; if (a) { b.a = [{ t: 'html', html: a }]; b.own = true; n++; } else miss.push(l.n + '|' + b.num); }
    if (b.t === 'qa' && b.task) { const p = plain[b.num]; if (p) { b.plain = p; np++; } else missPlain.push(b.num); }
  })));
  dc.intro = []; // титульная страница PDF: её текст уже есть в подзаголовке
  dc.introPdf = [];
  dc.title = 'Программирование I · подготовка к РК1'; dc.sub = 'Темы 1–7, Borland C++ 6.0: лекция → примеры и нюансы → задачи с решениями → тест → ключи';
  dc.page = { w: c[0].w, h: c[0].h };
  const f = await (await fetch('/out/filo.raw.json')).json(); const df = P.parseFilo(f);
  df.page = { w: f[0].w, h: f[0].h };
  await fetch('/save/cpp.final.json', { method: 'POST', body: JSON.stringify(dc) });
  await fetch('/save/filo.final.json', { method: 'POST', body: JSON.stringify(df) });
  const regs = d => d.lectures.reduce((a, l) => a + l.sections.reduce((b, s) => b + (s.pdf ? s.pdf.length : 0), 0), 0);
  return { merged: n, miss, plain: np, missPlain, regions: { cpp: regs(dc), filo: regs(df) } };
}

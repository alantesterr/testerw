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
  // контрольные вопросы всех лекций — одним общим блоком в самом конце, перед «Планом повторения перед РК1»
  const ctrl = { kind: 'qa', control: true, id: '', title: 'Контрольные вопросы по всем темам (проверь себя устно)', blocks: [] };
  dc.lectures.forEach(l => { l.sections = l.sections.filter(s => { if (!s.control) return true; s.blocks.forEach(b => { b.lec = l.label; }); ctrl.blocks = ctrl.blocks.concat(s.blocks); return false; }); });
  const app = dc.lectures[dc.lectures.length - 1], iPlan = app.sections.findIndex(s => /План повторения/.test(s.title || ''));
  app.sections.splice(iPlan < 0 ? app.sections.length : iPlan, 0, ctrl);
  dc.intro = []; // титульная страница PDF: её текст уже есть в подзаголовке
  dc.introPdf = [];
  dc.title = 'Программирование I · подготовка к РК1'; dc.sub = 'Темы 1–7, Borland C++ 6.0: лекция → примеры и нюансы → задачи с решениями → тест → ключи';
  dc.page = { w: c[0].w, h: c[0].h };
  const f = await (await fetch('/out/filo.raw.json')).json(); const df = P.parseFilo(f);
  // раздел вопросов: «Лекция N — Вопросы», чтобы было видно, к какой лекции он относится
  df.lectures.forEach(l => l.sections.forEach(s => { if (s.kind === 'qa') s.title = l.label + ' — Вопросы (с ответами)'; }));
  df.page = { w: f[0].w, h: f[0].h };
  // Философия 2.0 и архитектура
  const f2 = await (await fetch('/out/filo2.raw.json')).json(); const d2 = P.parseFilo2(f2); d2.page = { w: f2[0].w, h: f2[0].h };
  const ar = await (await fetch('/out/arch.raw.json')).json(); const da = P.parseArch(ar); da.page = { w: ar[0].w, h: ar[0].h };
  // задачи тренировки — под своими темами (в конце каждой темы), а не все в «Теме 9»
  const t9 = da.lectures.find(l => l.n === '9');
  if (t9) {
    const themeOf = (letter, num) => ({ A: '1', B: '1', C: '2', D: '3', E: '4', F: '5' })[letter] || (+num <= 48 ? '6' : '7');
    t9.sections.filter(s => s.kind === 'tasks').forEach(s => {
      const m = s.title.match(/·\s*([A-G])\.\s*(.*)$/), letter = m ? m[1] : 'G', name = m ? m[2] : s.title;
      const parts = {};
      s.blocks.forEach(b => { const n = themeOf(letter, b.num); (parts[n] = parts[n] || []).push(b); });
      Object.keys(parts).forEach(n => {
        const lec = da.lectures.find(l => l.n === n); if (!lec) return;
        const nm = letter === 'G' ? (n === '6' ? 'Триггеры' : 'Счётчики') : name;
        let sec = lec.sections.find(x => x.kind === 'tasks' && x.title === lec.label + ' · Задачи: ' + nm);
        if (!sec) { sec = { kind: 'tasks', id: '', title: lec.label + ' · Задачи: ' + nm, blocks: [] }; lec.sections.push(sec); }
        sec.blocks = sec.blocks.concat(parts[n]);
      });
    });
    da.lectures = da.lectures.filter(l => l !== t9);
  }
  // исправления ключей тестов философии (сверено с файлом одногруппника test_for_ph.pdf)
  const fixes = await (await fetch('/out/philo-key-fixes.json?' + Date.now())).json();
  const N = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
  [d2, df].forEach(d => d.lectures.forEach(l => l.sections.forEach(s => (s.blocks || []).forEach(b => { if (b.t !== 'quiz') return; b.questions.forEach(q => {
    const k = Object.keys(fixes).find(x => N(q.q).startsWith(N(x))); if (!k) return;
    const i = q.opts.findIndex(o => N(o.t) === N(fixes[k])); if (i >= 0) q.opts.forEach((o, j) => { o.right = j === i; });
  }); }))));
  // Исследование операций
  const io = await (await fetch('/out/io.raw.json')).json(); const di = P.parseIO(io); di.page = { w: io[0].w, h: io[0].h }; delete di._report;
  await fetch('/save/io.final.json', { method: 'POST', body: JSON.stringify(di) });
  await fetch('/save/filo2.final.json',{ method: 'POST', body: JSON.stringify(d2) });
  await fetch('/save/arch.final.json', { method: 'POST', body: JSON.stringify(da) });
  await fetch('/save/cpp.final.json', { method: 'POST', body: JSON.stringify(dc) });
  await fetch('/save/filo.final.json', { method: 'POST', body: JSON.stringify(df) });
  const regs = d => d.lectures.reduce((a, l) => a + l.sections.reduce((b, s) => b + (s.pdf ? s.pdf.length : 0), 0), 0);
  return { merged: n, miss, plain: np, missPlain, regions: { cpp: regs(dc), filo: regs(df) } };
}

/* =====================================================================
   САЙТ «ЭКЗАМЕН» — подготовка к экзаменам по предметам.
   • По порядку: сайт помнит, на каком вопросе ты остановился, и какие
     вопросы пройдены верно / с ошибкой (localStorage «sp-exam-v1»).
   • Ошибки: каждый неверный ответ попадает в папку ошибок предмета.
     Вопрос уходит оттуда, когда ответишь на него верно 2 раза подряд.
   • Пробный экзамен: случайные вопросы без подсказок, оценка в конце.
   • Все ответы: список вопросов с правильными ответами и поиском.
   • Связь с расширением Chrome «StudyPlay: тесты во время видео»:
     страница отдаёт ему вопросы и принимает его ответы (postMessage).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc;
  var DATA_V = '20261114a';
  var SUBJ = [
    { id: 'phil', name: 'Философия', files: ['philosophy.docx'], total: 500 },
    { id: 'arch', name: 'Архитектура компьютера', files: ['arch-platonus.docx', 'arch-umkd.docx'], total: 150 },
    { id: 'cpp', name: 'C++ (Borland C++ Builder)', files: ['cpp.txt'], total: 190 },
    { id: 'ict', name: 'ИКТ', files: ['ict.doc'], total: 364 }
  ];
  var KEY = 'sp-exam-v1', LEARN = 2;
  var app = document.getElementById('app');
  /* тема как в StudyPlay (светлая / тёмная / системная) */
  (function () {
    var t = (SP.store.get('sp-settings') || {}).theme || 'system';
    if (t === 'system') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
  var bank = {}, loading = {};

  /* ---------- Прогресс ---------- */
  var P = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function prog(id) { var p = P[id] || (P[id] = {}); p.pos = p.pos || 0; p.st = p.st || {}; p.err = p.err || {}; return p; }
  /* результат ответа: верно → +1 к серии в ошибках (2 подряд — выучен), неверно → в ошибки */
  function record(id, qid, ok, keepSt) {
    var p = prog(id), wasErr = !!p.err[qid];
    if (!keepSt || !p.st[qid]) p.st[qid] = ok ? 'r' : 'w';
    if (ok) { if (wasErr) { p.err[qid].s = (p.err[qid].s || 0) + 1; if (p.err[qid].s >= LEARN) delete p.err[qid]; } }
    else p.err[qid] = { s: 0, t: Date.now() };
    save();
    return wasErr && ok && !p.err[qid]; /* true — вопрос только что выучен */
  }

  /* ---------- Вопросы ---------- */
  function getBank(s) {
    if (bank[s.id]) return Promise.resolve(bank[s.id]);
    if (loading[s.id]) return loading[s.id];
    return (loading[s.id] = Promise.all(s.files.map(function (f) {
      return fetch('data/' + f + '?v=' + DATA_V).then(function (r) { if (!r.ok) throw new Error(f); return r.blob(); })
        .then(function (b) { return E.readFile(new File([b], f)); }).then(function (r) { return r.out; });
    })).then(function (parts) {
      var seen = {}, list = [];
      /* все вопросы остаются; одинаковые получают свой номер (#2, #3…), чтобы прогресс считался по каждому */
      [].concat.apply([], parts).forEach(function (q) { var id = E.qid(q); seen[id] = (seen[id] || 0) + 1; q.id = seen[id] > 1 ? id + '#' + seen[id] : id; list.push(q); });
      bank[s.id] = list; return list;
    }));
  }
  function subj(id) { return SUBJ.filter(function (s) { return s.id === id; })[0]; }
  function counts(s) {
    var p = prog(s.id), list = bank[s.id], tot = list ? list.length : s.total, r = 0, w = 0;
    if (list) list.forEach(function (q) { if (p.st[q.id] === 'r') r++; else if (p.st[q.id] === 'w') w++; });
    else Object.keys(p.st).forEach(function (k) { if (p.st[k] === 'r') r++; else w++; });
    return { tot: tot, r: r, w: w, done: r + w, err: Object.keys(p.err).length };
  }

  /* ---------- Мелочи интерфейса ---------- */
  function toast(t) { var d = document.createElement('div'); d.className = 'ex-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2200); }
  function rich(t) { return E.richHtml(t, true); }
  function img(src) { return E.img(src); }
  function top(title, sub, back) {
    return '<div class="ex-top">' + (back ? '<button class="btn btn-ghost" data-go="' + back + '">← Назад</button>' : '<a class="btn btn-ghost" href="../#/subjects">← StudyPlay</a>') +
      '<h1>' + esc(title) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }
  function rightText(q) { return q.type === 'keyboard' ? q.answer : q.opts.filter(function (o) { return o.right; }).map(function (o) { return o.t || '[картинка]'; }).join('; '); }
  var keyH = null;
  function onKey(f) { keyH = f; }
  document.addEventListener('keydown', function (e) { if (keyH && !/INPUT|TEXTAREA/.test(e.target.tagName || '')) keyH(e); else if (keyH && e.key === 'Enter') keyH(e); });
  function wireGo() {
    app.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { route(b.getAttribute('data-go')); }; });
  }
  function route(r) { location.hash = r; }

  /* ---------- Главная ---------- */
  function home() {
    onKey(null);
    var h = top('Экзамен', 'Предметы по порядку подготовки. Прогресс сохраняется сам — можно закрыть сайт и продолжить с того же места.');
    h += '<div class="ex-grid">' + SUBJ.map(function (s, i) {
      var c = counts(s), pr = c.tot ? Math.round(c.r / c.tot * 100) : 0;
      return '<section class="ex-subj"><div class="ex-subj-h"><span class="ex-num">' + (i + 1) + '</span><div><b>' + esc(s.name) + '</b><small>' + c.tot + ' вопросов · выучено ' + pr + '%</small></div></div>' +
        '<div class="ex-bar"><i class="g" style="width:' + (c.tot ? c.r / c.tot * 100 : 0) + '%"></i><i class="r" style="width:' + (c.tot ? c.w / c.tot * 100 : 0) + '%"></i></div>' +
        '<div class="ex-stats"><span>Пройдено: <b>' + c.done + '</b> из ' + c.tot + '</span><span class="ok">✓ ' + c.r + '</span><span class="bad">✗ ' + c.w + '</span><span>Не пройдено: ' + Math.max(0, c.tot - c.done) + '</span></div>' +
        '<div class="ex-btns"><button class="btn btn-primary" data-go="/' + s.id + '/learn">' + (c.done ? 'Продолжить' : 'Начать') + '</button>' +
        '<button class="btn" data-go="/' + s.id + '/errors"' + '>Ошибки (' + c.err + ')</button>' +
        '<button class="btn" data-go="/' + s.id + '/mock">Пробный экзамен</button></div>' +
        '<div class="ex-more"><button class="btn btn-ghost btn-sm" data-go="/' + s.id + '/map">Карта вопросов</button><button class="btn btn-ghost btn-sm" data-go="/' + s.id + '/all">Все ответы</button>' +
        '<button class="btn btn-ghost btn-sm" data-reset="' + s.id + '">Сбросить прогресс</button><button class="btn btn-ghost btn-sm" data-clear="' + s.id + '">Очистить ошибки</button></div></section>';
    }).join('') + '</div>';
    h += '<section class="ex-card" style="margin-top:16px"><b>Как готовиться лучше всего</b><div class="ex-tip" style="margin-top:8px">1. Проходи предмет <b>по порядку</b> — каждая ошибка сама попадёт в «Ошибки».<br>2. В конце дня открой <b>«Ошибки»</b>: вопрос уходит оттуда, когда ответишь верно 2 раза подряд.<br>3. Перед экзаменом — <b>«Пробный экзамен»</b> без подсказок и <b>«Все ответы»</b> для быстрого повторения.<br>Клавиши: <b>1–6</b> — вариант, <b>Enter</b> — дальше.</div>' +
      '<div class="ex-btns" style="margin-top:12px"><button class="btn btn-sm" id="exExport">Сохранить прогресс в файл</button><button class="btn btn-sm" id="exImport">Загрузить прогресс из файла</button></div>' +
      '<p class="ex-ext" id="exExt">' + (document.documentElement.getAttribute('data-sp-ext') ? '✓ Расширение «тесты во время видео» подключено — вопросы ему переданы.' : 'Расширение для Chrome «тесты во время видео» не найдено.') + '</p></section>';
    app.innerHTML = h; wireGo();
    app.querySelectorAll('[data-reset]').forEach(function (b) { b.onclick = function () { var s = subj(b.getAttribute('data-reset')); if (confirm('Сбросить прогресс «' + s.name + '»? Начнёшь с первого вопроса. Папка ошибок останется.')) { var p = prog(s.id); p.pos = 0; p.st = {}; save(); home(); toast('Прогресс сброшен'); } }; });
    app.querySelectorAll('[data-clear]').forEach(function (b) { b.onclick = function () { var s = subj(b.getAttribute('data-clear')); if (confirm('Очистить папку ошибок «' + s.name + '»?')) { prog(s.id).err = {}; save(); home(); toast('Ошибки очищены'); } }; });
    document.getElementById('exExport').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(P)], { type: 'application/json' }));
      a.download = 'StudyPlay-экзамен-прогресс.json'; a.click();
    };
    document.getElementById('exImport').onclick = function () {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
      inp.onchange = function () { var f = inp.files[0]; if (!f) return; f.text().then(function (t) { try { var d = JSON.parse(t); if (typeof d !== 'object' || !d) throw 0; if (!confirm('Заменить текущий прогресс прогрессом из файла?')) return; P = d; save(); home(); toast('Прогресс загружен'); } catch (e) { alert('Это не файл прогресса'); } }); };
      inp.click();
    };
  }

  /* ---------- Один вопрос (общий для всех режимов) ---------- */
  /* opt: { head, q, reveal(ok) — показывать ли ответ сразу, onDone(ok), nav (html кнопок) } */
  function askQ(host, q, opt) {
    var order = SP.shuffle(q.opts.map(function (o, i) { return i; }));
    var multi = q.opts.filter(function (o) { return o.right; }).length > 1, kb = q.type === 'keyboard', done = false, sel = [];
    var h = '<div class="ex-card"><div class="ex-qhead">' + opt.head + '</div><div class="ex-q">' + rich(q.q) + img(q.img) + '</div>';
    if (kb) h += '<div class="ex-kb"><input class="input" id="exKb" placeholder="Введи ответ" autocomplete="off"><button class="btn btn-primary" id="exCheck">Проверить</button></div>';
    else h += (multi ? '<p class="ex-pill" style="margin:0 0 8px">Несколько правильных ответов</p>' : '') + '<div class="ex-opts">' + order.map(function (oi, n) { var o = q.opts[oi]; return '<button class="ex-opt" data-o="' + oi + '"><span class="k">' + (n + 1) + '</span><span>' + rich(o.t) + img(o.img) + '</span></button>'; }).join('') + '</div>' +
      (multi ? '<div class="ex-nav"><button class="btn btn-primary" id="exCheck">Проверить</button></div>' : '');
    h += '<div id="exRes"></div><div class="ex-nav">' + (opt.nav || '') + '</div>' + (opt.hint === false ? '' : '<p class="ex-hint">1–' + (kb ? '' : order.length) + ' — выбрать · Enter — дальше</p>') + '</div>';
    host.innerHTML = h;
    var btns = host.querySelectorAll('.ex-opt');
    function finish(ok) {
      if (done) return; done = true;
      btns.forEach(function (b) {
        var oi = +b.getAttribute('data-o'), o = q.opts[oi]; b.disabled = true;
        if (opt.reveal) { if (o.right) b.classList.add('right'); else if (sel.indexOf(oi) >= 0) b.classList.add('wrong'); }
      });
      if (opt.reveal) host.querySelector('#exRes').innerHTML = '<div class="ex-verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ Верно' : '✗ Ошибка' + (kb ? ': правильно — ' + esc(q.answer) : '')) + '</div>' + E.explainHtml(q);
      opt.onDone(ok, sel);
    }
    btns.forEach(function (b) {
      b.onclick = function () {
        if (done) return; var oi = +b.getAttribute('data-o');
        if (multi) { var k = sel.indexOf(oi); if (k >= 0) sel.splice(k, 1); else sel.push(oi); b.classList.toggle('sel', k < 0); return; }
        sel = [oi]; finish(E.checkChoice(q, sel));
      };
    });
    var chk = host.querySelector('#exCheck');
    if (chk) chk.onclick = function () { if (kb) finish(E.checkKeyboard(q, host.querySelector('#exKb').value)); else if (sel.length) finish(E.checkChoice(q, sel)); };
    if (kb) { var inp = host.querySelector('#exKb'); inp.focus(); inp.onkeydown = function (e) { if (e.key === 'Enter' && !done) { e.preventDefault(); e.stopPropagation(); chk.onclick(); } }; }
    return {
      key: function (e) {
        var n = parseInt(e.key, 10);
        if (!done && n >= 1 && n <= btns.length) { btns[n - 1].click(); return true; }
        if (!done && e.key === 'Enter' && multi && sel.length) { chk.onclick(); return true; }
        return false;
      },
      done: function () { return done; },
      giveUp: function () { if (!done) { sel = []; finish(false); } }
    };
  }

  /* ---------- По порядку ---------- */
  function learn(s, list, at) {
    var p = prog(s.id);
    if (at != null) { p.pos = at; save(); }
    if (p.pos >= list.length) return finished(s, list);
    var q = list[p.pos], st = p.st[q.id], c = counts(s);
    var head = '<span>Вопрос <b>' + (p.pos + 1) + '</b> из ' + list.length + '</span><span>' + (st === 'r' ? '<span class="ex-pill">раньше: ✓ верно</span>' : st === 'w' ? '<span class="ex-pill">раньше: ✗ ошибка</span>' : '<span class="ex-pill">новый</span>') + '</span>';
    app.innerHTML = top(s.name, 'Пройдено ' + c.done + ' из ' + c.tot + ' · <span style="color:var(--success-text)">✓ ' + c.r + '</span> · <span style="color:var(--danger-text)">✗ ' + c.w + '</span> · в ошибках: ' + c.err, '/') +
      '<div class="ex-bar" style="margin-bottom:14px"><i class="g" style="width:' + c.r / c.tot * 100 + '%"></i><i class="r" style="width:' + c.w / c.tot * 100 + '%"></i></div><div id="exHost"></div>';
    var nav = '<button class="btn" id="exPrev"' + (p.pos ? '' : ' disabled') + '>←</button><button class="btn btn-ghost" id="exDunno">Не знаю</button><span class="grow"></span>' +
      '<button class="btn btn-ghost" data-go="/' + s.id + '/map">Карта</button><button class="btn btn-primary" id="exNext">Дальше →</button>';
    var a = askQ(app.querySelector('#exHost'), q, {
      head: head, reveal: true, nav: nav,
      onDone: function (ok) { if (record(s.id, q.id, ok)) toast('Вопрос выучен и убран из ошибок'); document.getElementById('exDunno').disabled = true; document.getElementById('exNext').focus(); }
    });
    wireGo();
    function next() { if (!a.done()) { p.pos++; save(); return learn(s, list); } p.pos++; save(); learn(s, list); }
    document.getElementById('exNext').onclick = next;
    document.getElementById('exPrev').onclick = function () { learn(s, list, p.pos - 1); };
    document.getElementById('exDunno').onclick = function () { a.giveUp(); };
    onKey(function (e) { if (a.key(e)) return; if (e.key === 'Enter' && a.done()) { e.preventDefault(); next(); } if (e.key === 'ArrowLeft' && p.pos) learn(s, list, p.pos - 1); if (e.key === 'ArrowRight') next(); });
  }
  function finished(s, list) {
    onKey(null);
    var c = counts(s);
    app.innerHTML = top(s.name, '', '/') + '<div class="ex-card ex-center"><p>Предмет пройден до конца</p><div class="ex-big">' + Math.round(c.r / c.tot * 100) + '%</div><p>Верно: <b>' + c.r + '</b> · ошибок: <b>' + c.w + '</b> · не отвечено: ' + (c.tot - c.done) + '</p>' +
      '<div class="ex-btns" style="justify-content:center;margin-top:12px"><button class="btn btn-primary" data-go="/' + s.id + '/errors">Разобрать ошибки (' + c.err + ')</button><button class="btn" id="exAgain">Пройти заново</button><button class="btn" data-go="/' + s.id + '/map">Карта вопросов</button></div></div>';
    wireGo();
    document.getElementById('exAgain').onclick = function () { if (confirm('Начать предмет заново? Отметки ✓/✗ сбросятся, папка ошибок останется.')) { var p = prog(s.id); p.pos = 0; p.st = {}; save(); learn(s, list); } };
  }

  /* ---------- Карта вопросов ---------- */
  function map(s, list) {
    onKey(null);
    var p = prog(s.id), c = counts(s);
    app.innerHTML = top('Карта: ' + s.name, 'Нажми на номер, чтобы перейти к вопросу. Зелёный — верно, красный — ошибка, серый — не пройден.', '/') +
      '<div class="ex-card"><div class="ex-stats" style="margin-bottom:12px"><span class="ok">✓ ' + c.r + '</span><span class="bad">✗ ' + c.w + '</span><span>не пройдено: ' + (c.tot - c.done) + '</span>' +
      '<button class="btn btn-sm" id="exFirstNew">К первому непройденному</button></div><div class="ex-cells">' +
      list.map(function (q, i) { var st = p.st[q.id]; return '<button class="ex-cell' + (st ? ' ' + st : '') + (i === p.pos ? ' cur' : '') + '" data-i="' + i + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>';
    wireGo();
    app.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { location.hash = '/' + s.id + '/learn'; learn(s, list, +b.getAttribute('data-i')); }; });
    document.getElementById('exFirstNew').onclick = function () {
      var i = list.findIndex(function (q) { return !p.st[q.id]; });
      if (i < 0) { toast('Все вопросы уже пройдены'); return; }
      location.hash = '/' + s.id + '/learn'; learn(s, list, i);
    };
  }

  /* ---------- Ошибки ---------- */
  function errors(s, list) {
    onKey(null);
    var p = prog(s.id), errs = list.filter(function (q) { return p.err[q.id]; });
    var h = top('Ошибки: ' + s.name, errs.length ? 'Здесь все вопросы, где ты ошибся. Вопрос уходит, когда ответишь верно ' + LEARN + ' раза подряд.' : '', '/');
    if (!errs.length) { app.innerHTML = h + '<div class="ex-card ex-center"><p>Ошибок нет 🎉</p><button class="btn btn-primary" data-go="/' + s.id + '/learn">Продолжить по порядку</button></div>'; wireGo(); return; }
    h += '<div class="ex-btns" style="margin-bottom:12px"><button class="btn btn-primary" id="exTrain">Тренировать ошибки (' + errs.length + ')</button><button class="btn" id="exClr">Очистить ошибки</button></div><div class="ex-list">' +
      errs.map(function (q) { var e = p.err[q.id]; return '<div class="ex-li"><div class="qq">' + rich(q.q) + img(q.img) + '</div><div class="aa">✓ ' + rich(rightText(q)) + '</div>' + (e.s ? '<div class="ex-pill" style="margin-top:6px">верно подряд: ' + e.s + ' из ' + LEARN + '</div>' : '') + E.explainHtml(q) + '</div>'; }).join('') + '</div>';
    app.innerHTML = h; wireGo();
    document.getElementById('exTrain').onclick = function () { train(s, SP.shuffle(errs.slice())); };
    document.getElementById('exClr').onclick = function () { if (confirm('Очистить папку ошибок?')) { p.err = {}; save(); errors(s, list); } };
  }
  /* тренировка: неверный ответ — вопрос вернётся через 3 вопроса */
  function train(s, queue) {
    var total = queue.length, learned = 0;
    (function step() {
      if (!queue.length) {
        onKey(null);
        app.innerHTML = top('Ошибки: ' + s.name, '', '/') + '<div class="ex-card ex-center"><p>Круг по ошибкам закончен</p><div class="ex-big">' + learned + ' / ' + total + '</div><p>выучено и убрано из ошибок</p>' +
          '<div class="ex-btns" style="justify-content:center"><button class="btn btn-primary" data-go="/' + s.id + '/errors">К ошибкам (' + Object.keys(prog(s.id).err).length + ')</button><button class="btn" data-go="/">На главную</button></div></div>';
        wireGo(); return;
      }
      var q = queue.shift();
      app.innerHTML = top('Ошибки: ' + s.name, 'Осталось в круге: ' + (queue.length + 1) + ' · выучено: ' + learned, '/' + s.id + '/errors') + '<div id="exHost"></div>';
      var a = askQ(app.querySelector('#exHost'), q, {
        head: '<span>Повторение ошибки</span>', reveal: true, nav: '<span class="grow"></span><button class="btn btn-primary" id="exNext">Дальше →</button>',
        onDone: function (ok) {
          if (record(s.id, q.id, ok, true)) learned++;
          else if (prog(s.id).err[q.id]) queue.splice(Math.min(3, queue.length), 0, q);
          document.getElementById('exNext').focus();
        }
      });
      wireGo();
      document.getElementById('exNext').onclick = function () { if (!a.done()) a.giveUp(); else step(); };
      onKey(function (e) { if (a.key(e)) return; if (e.key === 'Enter' && a.done()) { e.preventDefault(); step(); } });
    })();
  }

  /* ---------- Пробный экзамен ---------- */
  function mock(s, list) {
    onKey(null);
    var best = prog(s.id).mock;
    app.innerHTML = top('Пробный экзамен: ' + s.name, 'Случайные вопросы, ответ не показывается до конца — как на настоящем экзамене. Ошибки попадут в папку ошибок.', '/') +
      '<div class="ex-card ex-center"><p>Сколько вопросов?</p><div class="ex-btns" style="justify-content:center">' + [25, 50, 100].filter(function (n) { return n < list.length; }).concat([list.length]).map(function (n) { return '<button class="btn' + (n === 25 ? ' btn-primary' : '') + '" data-n="' + n + '">' + (n === list.length ? 'Все ' + n : n) + '</button>'; }).join('') + '</div>' +
      (best ? '<p class="ex-ext" style="margin-top:12px">Последний результат: ' + best.p + '% (' + best.r + ' из ' + best.n + ')</p>' : '') + '</div>';
    wireGo();
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { runMock(s, SP.shuffle(list.slice()).slice(0, +b.getAttribute('data-n'))); }; });
  }
  function runMock(s, qs) {
    var i = 0, res = [], t0 = Date.now();
    (function step() {
      if (i >= qs.length) return mockEnd(s, qs, res, t0);
      var q = qs[i];
      app.innerHTML = top('Пробный экзамен', 'Вопрос ' + (i + 1) + ' из ' + qs.length, '/') + '<div class="ex-bar" style="margin-bottom:14px"><i class="g" style="width:' + (i / qs.length * 100) + '%"></i></div><div id="exHost"></div>';
      var a = askQ(app.querySelector('#exHost'), q, {
        head: '<span>' + (i + 1) + ' / ' + qs.length + '</span>', reveal: false, hint: false,
        nav: '<button class="btn btn-ghost" id="exStop">Закончить</button><span class="grow"></span><button class="btn btn-primary" id="exNext">Дальше →</button>',
        onDone: function (ok, sel) { res[i] = { ok: ok, sel: sel }; i++; setTimeout(step, 150); }
      });
      document.getElementById('exNext').onclick = function () { a.giveUp(); };
      document.getElementById('exStop').onclick = function () { if (confirm('Закончить экзамен? Неотвеченные засчитаются как ошибки.')) { while (i < qs.length) res[i++] = { ok: false, sel: [], skip: true }; mockEnd(s, qs, res, t0); } };
      wireGo();
      onKey(function (e) { a.key(e); });
    })();
  }
  function mockEnd(s, qs, res, t0) {
    onKey(null);
    var r = 0, wrong = [];
    qs.forEach(function (q, i) { var x = res[i] || { ok: false }; if (x.ok) r++; else wrong.push({ q: q, x: x }); if (!x.skip) record(s.id, q.id, x.ok, true); else record(s.id, q.id, false, true); });
    var pc = Math.round(r / qs.length * 100), mins = Math.round((Date.now() - t0) / 60000);
    prog(s.id).mock = { p: pc, r: r, n: qs.length, t: Date.now() }; save();
    app.innerHTML = top('Результат: ' + s.name, '', '/') + '<div class="ex-card ex-center"><div class="ex-big" style="color:' + (pc >= 50 ? 'var(--success-text)' : 'var(--danger-text)') + '">' + pc + '%</div><p>Верно <b>' + r + '</b> из ' + qs.length + ' · время: ' + mins + ' мин</p>' +
      '<div class="ex-btns" style="justify-content:center"><button class="btn btn-primary" data-go="/' + s.id + '/errors">Разобрать ошибки</button><button class="btn" data-go="/' + s.id + '/mock">Ещё раз</button></div></div>' +
      (wrong.length ? '<h3 style="margin:18px 0 10px">Ошибки (' + wrong.length + ')</h3><div class="ex-list">' + wrong.map(function (w) {
        var yours = w.x.skip ? 'нет ответа' : (w.x.sel || []).map(function (oi) { return w.q.opts[oi] ? w.q.opts[oi].t : ''; }).join('; ') || 'нет ответа';
        return '<div class="ex-li"><div class="qq">' + rich(w.q.q) + img(w.q.img) + '</div><div class="yy">✗ твой ответ: ' + esc(yours) + '</div><div class="aa">✓ ' + rich(rightText(w.q)) + '</div>' + E.explainHtml(w.q) + '</div>';
      }).join('') + '</div>' : '');
    wireGo();
  }

  /* ---------- Все ответы (шпаргалка с поиском) ---------- */
  function all(s, list) {
    onKey(null);
    app.innerHTML = top('Все ответы: ' + s.name, 'Только правильные ответы — удобно быстро перечитать перед экзаменом.', '/') +
      '<input class="input" id="exFind" type="search" placeholder="Поиск по вопросам и ответам" style="width:100%;margin-bottom:12px"><div class="ex-list" id="exAll"></div>';
    wireGo();
    var box = document.getElementById('exAll'), inp = document.getElementById('exFind');
    function draw() {
      var f = inp.value.trim().toLowerCase(), n = 0;
      box.innerHTML = list.map(function (q, i) {
        if (f && (q.q + ' ' + rightText(q)).toLowerCase().indexOf(f) < 0) return '';
        if (++n > 600) return '';
        return '<div class="ex-li"><div class="qq">' + (i + 1) + '. ' + rich(q.q) + img(q.img) + '</div><div class="aa">✓ ' + rich(rightText(q)) + '</div></div>';
      }).join('') || '<p class="ex-ext">Ничего не найдено</p>';
    }
    var tm; inp.oninput = function () { clearTimeout(tm); tm = setTimeout(draw, 200); }; draw();
  }

  /* ---------- Маршруты ---------- */
  function render() {
    var m = /^#?\/?(\w+)?\/?(\w+)?/.exec(location.hash || ''), s = m && m[1] && subj(m[1]), mode = (m && m[2]) || 'learn';
    if (!s) return home();
    app.innerHTML = '<p class="ex-loading">Загружаю вопросы «' + esc(s.name) + '»…</p>';
    getBank(s).then(function (list) {
      if (location.hash.indexOf('/' + s.id) < 0) return;
      ({ learn: learn, map: map, errors: errors, mock: mock, all: all }[mode] || learn)(s, list);
    }).catch(function () { app.innerHTML = top(s.name, '', '/') + '<div class="ex-card">Не удалось загрузить вопросы. Проверь интернет и обнови страницу.</div>'; wireGo(); });
  }
  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });

  /* ---------- Связь с расширением Chrome ---------- */
  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.from !== 'sp-ext') return;
    if (e.data.type === 'hello') sendBank();
    if (e.data.type === 'results') {
      var n = 0;
      (e.data.results || []).forEach(function (x) { if (subj(x.subj) && x.qid) { record(x.subj, x.qid, !!x.ok, true); n++; } });
      window.postMessage({ from: 'sp-exam', type: 'results-ok', ids: (e.data.results || []).map(function (x) { return x.rid; }) }, '*');
      if (n) { toast('Ответы из расширения учтены: ' + n); if (!location.hash || location.hash === '#/') home(); }
    }
  });
  function sendBank() {
    Promise.all(SUBJ.map(getBank)).then(function (lists) {
      var out = {};
      SUBJ.forEach(function (s, i) {
        out[s.id] = { name: s.name, qs: lists[i].map(function (q) { return { id: q.id, q: q.q, img: q.img || '', ex: q.ex || '', type: q.type, answer: q.answer || '', opts: (q.opts || []).map(function (o) { return { t: o.t, right: !!o.right, img: o.img || '' }; }) }; }) };
      });
      var errs = {}; SUBJ.forEach(function (s) { errs[s.id] = Object.keys(prog(s.id).err); });
      window.postMessage({ from: 'sp-exam', type: 'bank', v: DATA_V, bank: out, errs: errs }, '*');
      var el = document.getElementById('exExt'); if (el) el.textContent = '✓ Расширение «тесты во время видео» подключено — вопросы ему переданы.';
    });
  }

  render();
})();

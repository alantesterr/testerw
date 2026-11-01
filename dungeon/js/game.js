/* =====================================================================
   ИГРА: сцены (домик → двор → холл → путь C++ → этаж → комната), ходьба,
   бой, сердечки, комбо, IQ, огонёк. Этап 1.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.DG, A = window.DA, esc = D.esc;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('scene'), c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  var panel = $('panel'), screenEl = $('screen'), stageEl = $('stage');
  var S = D.save;

  /* ---------- общее состояние ---------- */
  var G = { scene: 'house', t0: performance.now(), hero: { x: 240, anim: 'idle', f: 0, flash: 0, target: null, onArrive: null }, room: null };
  var now = function () { return performance.now(); };

  /* ---------- HUD ---------- */
  function hud() {
    $('hud').hidden = false;
    var h = '';
    for (var i = 0; i < S.maxHp; i++) h += '<i style="background-image:url(' + (i < S.hp ? A.heartUrl.ui_heart_full : A.heartUrl.ui_heart_empty) + ')"></i>';
    $('hudHearts').innerHTML = h;
    $('hudStreak').textContent = S.streak || 0;
    $('hudFlame').classList.toggle('off', !D.streakAlive());
    $('hudIq').textContent = S.iq;
    var r = G.room;
    $('hudCombo').hidden = !r;
    if (r) $('hudComboV').textContent = '×' + r.combo.toFixed(1);
  }
  function where(t) { $('hudWhere').textContent = t || ''; }
  function floater(text, x, y, color) {
    var el = document.createElement('div'); el.className = 'floater'; el.textContent = text; el.style.color = color || '#FFD25A';
    el.style.left = (x / A.W * 100) + '%'; el.style.top = (y / A.H * 100) + '%'; $('floaters').appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }
  function labels(list) {
    $('floaters').querySelectorAll('.lbl').forEach(function (e) { e.remove(); });
    (list || []).forEach(function (l) {
      var el = document.createElement('div'); el.className = 'lbl'; el.textContent = l.text;
      el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);left:' + (l.x / A.W * 100) + '%;top:' + (l.y / A.H * 100) + '%;background:rgba(10,8,16,.8);color:' + (l.color || '#e8e4f8') + ';font-weight:700;font-size:clamp(11px,1.5vw,15px);padding:2px 8px;border-radius:6px;white-space:nowrap';
      $('floaters').appendChild(el);
    });
  }

  /* ---------- переходы ---------- */
  function show(stage) { stageEl.hidden = !stage; screenEl.hidden = !!stage; }
  function go(scene, arg) {
    G.scene = scene; labels([]); G.hero.onArrive = null; G.hero.target = null;
    if (scene !== 'room') G.room = null;
    ({ house: enterHouse, yard: enterYard, hall: enterHall, path: enterPath, floor: enterFloor, room: enterRoom })[scene](arg);
    hud(); window.scrollTo(0, 0);
  }
  $('hudBack').onclick = function () {
    var back = { house: null, yard: 'house', hall: 'yard', path: 'hall', floor: 'path', room: 'floor' }[G.scene];
    if (back === 'floor') go('floor', G.room ? G.room.floor : S.at && S.at.f);
    else if (back) go(back);
  };
  function btn(label, cls, key, fn) { return { label: label, cls: cls, key: key, fn: fn }; }
  function setPanel(html, buttons) {
    panel.innerHTML = html + (buttons && buttons.length ? '<div class="row" style="margin-top:12px">' + buttons.map(function (b, i) { return '<button class="btn ' + (b.cls || '') + '" data-b="' + i + '">' + esc(b.label) + (b.key ? '<kbd>' + b.key + '</kbd>' : '') + '</button>'; }).join('') + '</div>' : '');
    G.buttons = buttons || [];
    panel.querySelectorAll('[data-b]').forEach(function (el) { el.onclick = function () { G.buttons[+el.getAttribute('data-b')].fn(); }; });
  }
  function walkTo(x, cb) { G.hero.target = x; G.hero.onArrive = cb; }

  /* ---------- ДОМИК ---------- */
  function enterHouse() {
    show(true); where('Домик героя'); G.hero.x = 240; G.hero.dir = 1;
    var intro = !S.seenIntro;
    setPanel(
      (intro ? '<div class="qtext">Добро пожаловать в Подземелье знаний!</div>' +
        '<p class="msg">Это игра для подготовки к РК и экзамену по C++. Внизу подземелья — этажи, каждый этаж — одна лекция. В комнатах тебя ждут монстры: они задают вопросы по теме. Ответил верно — ты бьёшь монстра, ошибся — монстр бьёт тебя и вопрос вернётся позже. Сердечки сверху — твои жизни, огонёк — сколько дней подряд ты занимаешься, IQ — награда за ответы.</p>'
        : '<div class="qtext">Домик</div><p class="msg">Отдохнул? Подземелье ждёт. Прогресс сохраняется после каждого ответа.</p>'),
      [btn('Выйти во двор', 'primary', 'Enter', function () { S.seenIntro = true; D.persist(); walkTo(30, function () { go('yard'); }); })]);
  }
  /* ---------- ДВОР ---------- */
  function enterYard() {
    show(true); where('Двор'); G.hero.x = 90;
    labels([{ text: 'Подземелье', x: 310, y: 96, color: '#FAC775' }, { text: 'Домик', x: 63, y: 110 }]);
    setPanel('<div class="qtext">Вход в подземелье</div><p class="msg">Каменная арка, за ней лестница вниз. Спустись — и выбери, в чьё подземелье идти.</p>',
      [btn('Спуститься в подземелье', 'primary', 'Enter', function () { walkTo(306, function () { G.descend = now(); setTimeout(function () { G.descend = 0; go('hall'); }, 700); }); }),
       btn('Назад в домик', 'ghost', null, function () { walkTo(80, function () { go('house'); }); })]);
  }
  /* ---------- ХОЛЛ ---------- */
  function enterHall() {
    show(true); where('Холл подземелья'); G.hero.x = 240;
    var m = D.mastery(D.floors.reduce(function (a, f) { return a.concat(f.pool.map(function (q) { return q.id; })); }, []));
    labels([{ text: 'Философия · скоро', x: 96, y: 112, color: '#AFA9EC' }, { text: 'C++ · освоено ' + m + '%', x: 240, y: 92, color: '#9FE1CB' }, { text: 'ИКТ · скоро', x: 384, y: 112, color: '#85B7EB' }]);
    setPanel('<div class="qtext">Холл</div><p class="msg">Каждая дверь — подземелье одного предмета. Герой у тебя один, IQ и огонёк общие. Сейчас открыто подземелье C++.</p>',
      [btn('Войти в C++', 'primary', 'Enter', function () { walkTo(240, function () { go('path'); }); }), btn('Наверх, во двор', 'ghost', null, function () { go('yard'); })]);
  }

  /* ---------- ПУТЬ C++ (как ветка Duolingo) ---------- */
  var UNITS = [[1, 3, 'Раздел 1 · к РК1', 'Основы: алгоритмы, операции, ветвления'], [4, 6, 'Раздел 2 · к РК1', 'Циклы, массивы, функции, строки'], [7, 9, 'Раздел 3 · к РК2', 'ООП: принципы, классы, среда C++ Builder'], [10, 12, 'Раздел 4 · к РК2', 'Формы, события, иерархия классов'], [13, 15, 'Раздел 5 · к экзамену', 'Конструкторы, свойства, компоненты'], [16, 16, 'Финал', 'Смешанные сложные вопросы по всему курсу']];
  function floorMastery(f) { return D.mastery(f.pool.map(function (q) { return q.id; })); }
  function enterPath() {
    show(false); where('Подземелье C++');
    var cur = S.at ? S.at.f : 1, h = '<div class="path-head"><h1>Подземелье C++</h1><span class="tag teal">все этажи открыты</span></div><p class="hallnote">Этаж = лекция. Цвет круга показывает, насколько ты освоил тему: серый — ещё не начинал, оранжевый — начал, зелёный — хорошо, золотой — отлично.</p>';
    UNITS.forEach(function (u, ui) {
      h += '<div class="unit u' + (ui % 4 + 1) + '"><small>' + esc(u[2]) + '</small><b>' + esc(u[3]) + '</b></div><div class="trail">';
      D.floors.filter(function (f) { return f.n >= u[0] && f.n <= u[1]; }).forEach(function (f) {
        var m = floorMastery(f), cls = m >= 85 ? 'm3' : m >= 50 ? 'm2' : m > 0 ? 'm1' : '';
        h += '<button class="node' + (f.n === cur ? ' cur' : '') + '" data-f="' + f.n + '"><span class="disc ' + cls + '">' + (f.final ? '★' : f.n) + '</span><span class="info"><b>' + esc(f.final ? 'Финальный этаж' : 'Этаж ' + f.n) + '</b><span>' + esc(f.title) + '</span><div class="bar"><i style="width:' + m + '%"></i></div><span>освоено ' + m + '%</span></span></button>';
      });
      h += '</div>';
    });
    screenEl.innerHTML = h;
    screenEl.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { go('floor', +b.getAttribute('data-f')); }; });
    var curEl = screenEl.querySelector('.node.cur'); if (curEl) setTimeout(function () { curEl.scrollIntoView({ block: 'center' }); }, 30);
  }

  /* ---------- ЭТАЖ: комнаты ---------- */
  function rkey(f, k) { return f.id + ':' + k; }
  function roomInfo(f, k) { return S.rooms[rkey(f, k)] || { cleared: [], done: false, chest: false }; }
  function enterFloor(n) {
    var f = D.floors[(n || 1) - 1]; if (!f) f = D.floors[0];
    show(false); where('Этаж ' + f.n + ' · ' + f.title);
    var m = floorMastery(f), nextK = f.rooms.findIndex(function (r) { return !roomInfo(f, r.k).done; });
    var h = '<div class="path-head"><h1>' + esc(f.final ? 'Финальный этаж' : 'Этаж ' + f.n) + '</h1><span class="tag teal">освоено ' + m + '%</span></div><p class="hallnote">' + esc(f.title) + '. Комнаты идут от лёгких к сложным, последняя — босс этажа. Каждая комната — кусочек лекции, поэтому, пройдя все, ты пройдёшь всю тему без пропусков.</p><div class="rooms">';
    f.rooms.forEach(function (r) {
      var ri = roomInfo(f, r.k), rm = D.mastery(r.qs), stars = rm >= 85 ? '★★★' : rm >= 50 ? '★★☆' : rm > 0 ? '★☆☆' : '☆☆☆';
      h += '<button class="room' + (ri.done ? ' done' : '') + (r.boss ? ' boss' : '') + (r.k === nextK ? ' cur' : '') + '" data-k="' + r.k + '"><b>' + (r.boss ? 'Босс этажа' : 'Комната ' + (r.k + 1)) + '</b><span>' + esc(r.boss ? 'смешанные вопросы по всей лекции' : (r.sec ? r.sec.title : '')) + '</span><div class="stars">' + stars + '</div><span>' + (ri.done ? 'пройдена · ' : '') + 'освоено ' + rm + '%</span></button>';
    });
    h += '</div>';
    screenEl.innerHTML = h;
    screenEl.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { go('room', { f: f.n, k: +b.getAttribute('data-k') }); }; });
    S.at = { f: f.n, k: nextK < 0 ? 0 : nextK }; D.persist();
  }

  /* ---------- КОМНАТА ---------- */
  var ROSTER = [['slug', 'tzombie', 'mushroom', 'imp'], ['goblin', 'skelet', 'eye', 'orc'], ['skeleton', 'shaman', 'masked', 'necro', 'goblin'], ['chort', 'wogol', 'swampy', 'eye', 'skeleton']];
  var BOSS = ['ogre', 'bzombie', 'demon'];
  function rnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
  function buildRoom(f, k) {
    var room = f.rooms[k], r = rnd(f.n * 131 + k * 17 + 7), tier = f.n <= 3 ? 0 : f.n <= 6 ? 1 : f.n <= 10 ? 2 : 3;
    var n = room.boss ? 0 : 2 + (k >= f.rooms.length / 2 ? 1 : 0), objs = [], ros = ROSTER[tier];
    var depth = k / Math.max(1, f.rooms.length - 1);
    for (var i = 0; i < n; i++) {
      var key = ros[Math.floor(r() * ros.length)], strong = i === n - 1 && depth > 0.3 && !!A.MON[key].lm;
      var hp = 1 + Math.round(depth * 2) + (strong ? 2 : 0) + (tier >= 2 ? 1 : 0);
      objs.push({ type: 'mon', key: key, hp: hp, max: hp, strong: strong });
    }
    if (room.boss) { objs.push({ type: 'mon', key: ros[0], hp: 2 + tier, max: 2 + tier }); objs.push({ type: 'mon', key: BOSS[Math.min(2, Math.floor(f.n / 6))], hp: 7 + tier, max: 7 + tier, strong: true, boss: true }); }
    else objs.push({ type: 'chest' });
    objs.push({ type: 'exit' });
    var span = 330, x0 = 140; objs.forEach(function (o, i) { o.x = o.type === 'exit' ? 448 : Math.round(x0 + i * span / Math.max(1, objs.length - 1) * 0.92); o.state = 'idle'; o.st = now(); });
    var info = roomInfo(f, k);
    info.cleared.forEach(function (i) { if (objs[i]) { objs[i].dead = true; objs[i].hp = 0; } });
    if (info.chest) objs.forEach(function (o) { if (o.type === 'chest') o.open = true; });
    return objs;
  }
  function enterRoom(a) {
    var f = D.floors[a.f - 1], room = f.rooms[a.k];
    show(true); where((f.final ? 'Финал' : 'Этаж ' + f.n) + ' · ' + (room.boss ? 'Босс' : 'Комната ' + (a.k + 1)));
    S.at = { f: f.n, k: a.k }; D.persist();
    G.room = { floor: f.n, f: f, k: a.k, room: room, objs: buildRoom(f, a.k), idx: -1, combo: 1, recent: [], turns: 0, right: 0, wrong: 0, iq: 0, briefOpen: true, mon: null };
    G.hero.x = 36; G.hero.dir = 1;
    roomIdle();
  }
  function nextObj() { var R = G.room; for (var i = 0; i < R.objs.length; i++) { var o = R.objs[i]; if ((o.type === 'mon' && !o.dead) || (o.type === 'chest' && !o.open) || o.type === 'exit') return i; } return R.objs.length - 1; }
  function roomSummary() {
    var R = G.room, mons = R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).length, chest = R.objs.some(function (o) { return o.type === 'chest' && !o.open; });
    return 'В комнате: ' + (mons ? mons + ' ' + (mons === 1 ? 'монстр' : mons < 5 ? 'монстра' : 'монстров') : 'монстров не осталось') + (chest ? ' · сундук' : '') + ' · выход';
  }
  function monTop(o) { return A.FLOOR_Y + 8 - A.monHeight(o.key) - (A.MON[o.key].fly ? 40 : 6); }
  function roomLabels() { var R = G.room; if (!R) return; labels(R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).map(function (o) { return { text: A.MON[o.key].name, x: o.x, y: monTop(o) - 14, color: o.boss ? '#F09595' : o.strong ? '#FAC775' : '#e8e4f8' }; }).concat(R.objs.filter(function (o) { return o.type === 'chest' && !o.open; }).map(function (o) { return { text: 'Сундук', x: o.x, y: A.FLOOR_Y - 36, color: '#FAC775' }; }))); }
  function roomIdle() {
    roomLabels();
    var R = G.room, i = nextObj(), o = R.objs[i];
    var what = o.type === 'mon' ? (o.boss ? 'босс «' + A.MON[o.key].name + '»' : A.MON[o.key].name + (o.strong ? ' (сильный)' : '')) : o.type === 'chest' ? 'сундук' : 'выход';
    var sec = R.room.sec;
    setPanel('<div class="row"><span class="tag">' + esc(R.room.boss ? 'Босс этажа' : 'Комната ' + (R.k + 1)) + '</span>' + (sec ? '<span class="tag teal">' + esc(sec.title) + '</span>' : '') + '</div><p class="msg">' + esc(roomSummary()) + '. Дальше — ' + esc(what) + '.</p>',
      [btn('Идти дальше', 'primary', 'Enter', function () { approach(i); })]);
  }
  function approach(i) {
    var R = G.room, o = R.objs[i]; R.idx = i;
    var stop = o.type === 'mon' ? o.x - (A.MON[o.key].lm ? 62 : A.MON[o.key].boss ? 66 : 50) : o.type === 'chest' ? o.x - 34 : o.x - 26;
    setPanel('<p class="msg">Идём…</p>');
    walkTo(stop, function () {
      if (o.type === 'mon') { R.mon = o; R.monTurn = 0; ask(); }
      else if (o.type === 'chest') openChest(o);
      else exitRoom();
    });
  }

  /* --- вопрос --- */
  function briefHtml(q) {
    var R = G.room, secs = R.room.secs && R.room.secs.length ? R.room.secs : R.f.texts, sec = null, best = -1;
    var qt = D.toks(q.q + ' ' + (q.opts || []).map(function (o) { return o.t; }).join(' '));
    secs.forEach(function (s) { if (!s.tok) s.tok = D.toks(s.title + ' ' + D.blocks(s.blocks)); var sc = D.overlap(qt, s.tok); if (sc > best) { best = sc; sec = s; } });
    if (!sec || (R.room.boss && best < 2)) return '';
    var txt = '';
    (sec.blocks || []).some(function (b) {
      var s = b.t === 'p' || b.t === 'note' ? D.strip(b.html) : (b.t === 'ul' || b.t === 'ol') ? b.items.map(D.strip).join('; ') : '';
      if (s.length > 25) { txt = s; return true; } return false;
    });
    if (txt.length > 260) txt = txt.slice(0, 257).replace(/\s\S*$/, '') + '…';
    return '<details class="brief"' + (R.briefOpen ? ' open' : '') + '><summary>Кратко из лекции · ' + esc(sec.title) + '</summary><p>' + esc(txt) + '</p></details>';
  }
  function ask() {
    var R = G.room, m = R.mon, M = A.MON[m.key];
    R.monTurn++;
    var useTask = m.strong && R.f.tasks.length && R.monTurn % 3 === 2;
    var head = '<div class="row"><span class="tag ' + (m.boss || m.strong ? 'gold' : 'red') + '">' + esc(M.name) + (m.boss ? ' · босс' : m.strong ? ' · сильный' : '') + '</span><span class="tag teal">' + (useTask ? 'Задание' : 'Тест') + '</span><span class="tag">Лекция ' + R.f.n + '</span></div>';
    if (useTask) return askTask(head);
    var q = D.pick(R.f, R.room, R.recent); R.q = q; R.recent.push(q.id); if (R.recent.length > 6) R.recent.shift();
    var h = head + briefHtml(q) + '<div class="qtext">' + D.md(q.q) + '</div>';
    if (q.type === 'keyboard') h += '<div class="kb"><input id="kbIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Что выведет программа? Впиши ответ"><button class="btn primary" id="kbGo">Ответить<kbd>Enter</kbd></button></div>';
    else {
      var order = q.opts.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      R.order = order;
      h += '<div class="opts">' + order.map(function (oi, n) { return '<button class="opt" data-o="' + oi + '"><span class="n">' + (n + 1) + '</span><span>' + D.md(q.opts[oi].t) + '</span></button>'; }).join('') + '</div>';
    }
    h += '<div class="hint">Клавиши: ' + (q.type === 'keyboard' ? 'Enter — ответить' : '1–' + q.opts.length + ' — выбрать ответ') + '</div>';
    setPanel(h);
    var det = panel.querySelector('details.brief'); if (det) det.ontoggle = function () { R.briefOpen = det.open; };
    G.buttons = [];
    if (q.type === 'keyboard') { var inp = $('kbIn'); $('kbGo').onclick = function () { answer(norm(inp.value) === norm(q.answer), inp.value); }; inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); $('kbGo').click(); } }; if (matchMedia('(pointer:fine)').matches) setTimeout(function () { inp.focus({ preventScroll: true }); }, 50); }
    else panel.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { var oi = +b.getAttribute('data-o'); answer(!!q.opts[oi].right, oi); }; });
  }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[;.]$/, ''); }
  function askTask(head) {
    var R = G.room, list = R.f.tasks, t = list[(R.turns + R.monTurn) % list.length]; R.task = t; R.taskAnswered = false;
    setPanel(head + '<div class="qtext">Задание' + (t.title ? ': ' + esc(t.title.replace(/\s·\s(лёгкая|средняя|сложная)$/, '')) : '') + '</div><div class="task-box rich">' + D.blocks(t.q) + '</div>' +
      '<div class="sol" id="sol">▸ Показать решение</div><p class="hint">Реши в голове или на бумаге, потом открой решение и честно отметь. «Знал» бьёт сильнее (×2).</p>',
      [btn('Не знал', 'warn', null, function () { taskDone(false); }), btn('Знал', 'primary', null, function () { taskDone(true); })]);
    $('sol').onclick = function () { var s = $('sol'); if (s.classList.contains('open')) return; s.classList.add('open'); s.innerHTML = '<div class="rich">' + D.blocks(t.a) + '</div>'; };
  }
  function taskDone(ok) {
    var R = G.room; if (R.taskAnswered) return; R.taskAnswered = true;
    panel.querySelectorAll('[data-b]').forEach(function (b) { b.disabled = true; }); G.buttons = [];
    var s = $('sol'); if (s && !s.classList.contains('open')) s.click();
    panel.insertAdjacentHTML('beforeend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Отлично! Двойной удар.' : 'Не страшно: решение перед тобой, разберись в нём. Это задание вернётся позже.') + '</div>');
    D.record(R.task.id, ok); resolve(ok, ok ? 2 : 0, 'task');
  }

  function answer(ok, pickedIdx) {
    var R = G.room, q = R.q; D.record(q.id, ok);
    if (q.type === 'keyboard') {
      var inp = $('kbIn'); inp.disabled = true; $('kbGo').disabled = true;
      panel.querySelector('.kb').insertAdjacentHTML('afterend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Верно!' : 'Неверно. Правильный ответ: <code>' + esc(q.answer) + '</code>') + '</div>');
    } else {
      panel.querySelectorAll('.opt').forEach(function (b) { var oi = +b.getAttribute('data-o'); b.disabled = true; if (q.opts[oi].right) b.classList.add('right'); else if (oi === pickedIdx) b.classList.add('wrong'); });
      panel.querySelector('.opts').insertAdjacentHTML('afterend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Верно! Удар!' : 'Неверно — монстр бьёт тебя. Этот вопрос вернётся позже, когда ты его подзабудешь.') + '</div>');
    }
    resolve(ok, 1, 'q');
  }
  function resolve(ok, power, kind) {
    var R = G.room, m = R.mon;
    R.turns++;
    if (D.touchStreak()) floater('Огонёк +1 день!', 240, 40, '#FF9600');
    if (ok) {
      R.right++;
      var dmg = power; if (R.combo >= 1.5 && Math.random() < (R.combo - 1)) { dmg++; R.crit = true; } else R.crit = false;
      R.combo = Math.min(3, Math.round((R.combo + 0.1) * 10) / 10);
      var gain = Math.round(2 * R.combo) + (kind === 'task' ? 3 : 0); S.iq += gain; R.iq += gain;
      heroAttack(function () {
        m.hp = Math.max(0, m.hp - dmg); setMon(m, m.hp ? 'hit' : 'death');
        floater((R.crit ? 'КРИТ! ' : '') + '−' + dmg + ' ♥', m.x, 120, R.crit ? '#FF9600' : '#FFD25A');
        floater('+' + gain + ' IQ', m.x + 20, 150, '#CECBF6');
        if (!m.hp) { m.dead = true; var info = roomInfo(R.f, R.k); if (info.cleared.indexOf(R.idx) < 0) info.cleared.push(R.idx); S.rooms[rkey(R.f, R.k)] = info; }
        D.persist(); hud(); bump();
        afterAnswer(true);
      });
    } else {
      R.wrong++; R.combo = 1;
      setMon(m, 'attack');
      setTimeout(function () {
        S.hp = Math.max(0, S.hp - (m.boss ? 1 : 1)); G.hero.hurtAt = now(); floater('−1 ♥', G.hero.x, 110, '#F09595');
        D.persist(); hud(); afterAnswer(false);
      }, A.MON[m.key].lm ? 420 : 260);
    }
  }
  function afterAnswer(ok) {
    var R = G.room, m = R.mon;
    if (S.hp <= 0) return setTimeout(defeat, 500);
    var btns = [];
    if (m.dead) btns.push(btn(m.boss ? 'Босс повержен! Дальше' : A.MON[m.key].name + ' повержен — идти дальше', 'primary', 'Enter', function () { R.mon = null; roomIdle(); }));
    else btns.push(btn('Следующий вопрос', 'primary', 'Enter', ask));
    var row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '12px';
    row.innerHTML = btns.map(function (b, i) { return '<button class="btn ' + b.cls + '" data-b2="' + i + '">' + esc(b.label) + '<kbd>' + b.key + '</kbd></button>'; }).join('');
    panel.appendChild(row); G.buttons = btns;
    row.querySelectorAll('[data-b2]').forEach(function (el) { el.onclick = function () { btns[+el.getAttribute('data-b2')].fn(); }; });
  }
  function bump() { var e = $('hudCombo'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
  function setMon(m, st) { m.state = st; m.st = now(); var d = A.monDur(m.key, st); if (st !== 'death') setTimeout(function () { if (m.state === st) { m.state = 'idle'; m.st = now(); } }, d); }
  function heroAttack(onHit) { var h = G.hero; h.attackAt = now(); setTimeout(onHit, 230); }
  function openChest(o) {
    var R = G.room, gain = 10 + Math.floor(Math.random() * 16);
    o.open = true; o.openAt = now(); S.iq += gain; R.iq += gain;
    var info = roomInfo(R.f, R.k); info.chest = true; S.rooms[rkey(R.f, R.k)] = info; D.persist(); hud();
    floater('+' + gain + ' IQ', o.x, 150, '#CECBF6');
    setPanel('<div class="qtext">Сундук открыт!</div><p class="msg">Внутри ' + gain + ' IQ. В следующих версиях в сундуках будут ещё зелья, свитки и оружие.</p>', [btn('Идти дальше', 'primary', 'Enter', roomIdle)]);
  }
  function exitRoom() {
    var R = G.room, f = R.f, info = roomInfo(f, R.k), first = !info.done;
    info.done = true; S.rooms[rkey(f, R.k)] = info; var bonus = first ? 10 : 3; S.iq += bonus; R.iq += bonus; D.persist(); hud();
    var m = D.mastery(R.room.qs), next = f.rooms[R.k + 1];
    setPanel('<div class="qtext">Комната пройдена!</div><p class="msg">Верных ответов: ' + R.right + ', ошибок: ' + R.wrong + '. Получено IQ: ' + R.iq + '. Освоение вопросов этой комнаты: ' + m + '%.' + (R.wrong ? ' Вопросы с ошибками вернутся в следующих комнатах — так они запомнятся.' : '') + '</p>',
      (next ? [btn('Следующая комната', 'primary', 'Enter', function () { go('room', { f: f.n, k: R.k + 1 }); })] : [btn(f.n < D.floors.length ? 'Этаж пройден! На следующий' : 'Подземелье пройдено!', 'primary', 'Enter', function () { if (f.n < D.floors.length) go('floor', f.n + 1); else go('path'); })])
        .concat([btn('К этажу', 'ghost', null, function () { go('floor', f.n); })]));
  }
  function defeat() {
    setPanel('<div class="qtext">Тебя одолели…</div><p class="msg">Сердечки закончились. Ничего страшного: все ответы и освоение тем сохранены, побеждённые монстры не вернутся. Отдохни в домике — сердечки восстановятся.</p>',
      [btn('Вернуться домой', 'primary', 'Enter', function () { S.hp = S.maxHp; D.persist(); go('house'); })]);
  }

  /* ---------- клавиатура ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter' && G.buttons && G.buttons.length) { e.preventDefault(); var b = G.buttons.filter(function (x) { return x.key === 'Enter'; })[0] || G.buttons[0]; b.fn(); return; }
    if (/^[1-9]$/.test(e.key)) { var opts = panel.querySelectorAll('.opt:not([disabled])'); var el = opts[+e.key - 1]; if (el) { e.preventDefault(); el.click(); } }
    if (e.key === 'Escape' || e.key === 'Backspace') { if (G.scene !== 'room' || !G.room || !G.room.mon) $('hudBack').click(); }
  });

  /* ---------- отрисовка ---------- */
  function draw(t) {
    var h = G.hero, dt = Math.min(50, t - (G.last || t)); G.last = t;
    /* ходьба */
    var walking = false;
    if (h.target != null) {
      var d = h.target - h.x; if (Math.abs(d) < 1.5) { h.x = h.target; h.target = null; var cb = h.onArrive; h.onArrive = null; if (cb) cb(); }
      else { h.x += Math.sign(d) * Math.min(Math.abs(d), dt * 0.12); h.dir = Math.sign(d); walking = true; }
    }
    if (G.scene === 'house') A.bgHouse(c, t);
    else if (G.scene === 'yard') A.bgYard(c, t);
    else if (G.scene === 'hall') A.bgHall(c, t);
    else if (G.scene === 'room' && G.room) A.bgRoom(c, t, { exit: true, exitOpen: G.room.objs.every(function (o) { return o.type !== 'mon' || o.dead; }), seed: G.room.k, goo: G.room.floor % 3 === 0, hole: G.room.floor % 2 === 0 });
    else return;
    var fy = A.FLOOR_Y + 8;
    /* объекты комнаты */
    if (G.scene === 'room' && G.room) G.room.objs.forEach(function (o) {
      if (o.type === 'chest') {
        var fr = A.anim[o.open ? 'chest_full_open' : 'chest_full_open'] || [], k = o.open ? Math.min(2, Math.floor((t - (o.openAt || 0)) / 120)) : 0;
        A.frame(c, fr[o.open ? (o.openAt ? k : 2) : 0], o.x - 20, fy - 40, 2.5);
      } else if (o.type === 'mon') {
        if (o.dead && (!o.st || t - o.st > 900)) return;
        var st = o.dead ? 'death' : o.state;
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(o.x, fy, A.MON[o.key].boss ? 34 : 22, 5, 0, 0, 7); c.fill();
        A.drawMonster(c, o.key, st, t - o.st, o.x, fy);
        if (!o.dead) A.hearts(c, o.x, monTop(o) - 12, o.hp, o.max);
      }
    });
    /* герой */
    if (!(G.scene === 'yard' && G.descend && t - G.descend > 350)) {
      var anim = 'idle', f = Math.floor(t / 450);
      if (walking) { anim = 'walk'; f = Math.floor(t / 110); }
      if (h.attackAt && t - h.attackAt < 420) { anim = 'attack'; f = Math.min(2, Math.floor((t - h.attackAt) / 140)); }
      var hurt = h.hurtAt && t - h.hurtAt < 380; if (hurt) { anim = 'hurt'; f = 0; }
      var lunge = h.attackAt && t - h.attackAt < 420 ? Math.sin((t - h.attackAt) / 420 * Math.PI) * 22 : 0;
      var knock = hurt ? -Math.sin((t - h.hurtAt) / 380 * Math.PI) * 8 : 0;
      var y = fy + (G.scene === 'yard' && G.descend ? Math.min(30, (t - G.descend) / 12) : 0);
      c.save(); c.globalAlpha = hurt && Math.floor(t / 60) % 2 ? 0.55 : 1;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(h.x + lunge + knock, fy, 18, 4.5, 0, 0, 7); c.fill();
      if (h.dir < 0) { c.translate(h.x * 2, 0); c.scale(-1, 1); }
      A.drawHero(c, anim, f, h.x + (h.dir < 0 ? -1 : 1) * (lunge + knock), y, 1.5);
      c.restore();
      /* дуга удара */
      if (anim === 'attack' && f === 1) { c.strokeStyle = 'rgba(255,243,176,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(h.x + 34, fy - 32, 26, -1.1, 0.9); c.stroke(); }
    }
  }
  function loop(t) { draw(t); requestAnimationFrame(loop); }
  /* для проверки: мгновенно довести героя до цели (вкладка в фоне не анимируется) */
  window.DGame = { G: G, skip: function () { var h = G.hero; if (h.target != null) { h.x = h.target; h.target = null; var cb = h.onArrive; h.onArrive = null; if (cb) cb(); } } };

  /* ---------- старт ---------- */
  Promise.all([A.load(), D.load()]).then(function () {
    $('loading').classList.add('gone');
    requestAnimationFrame(loop);
    go('house');
  }).catch(function (e) {
    $('loading').innerHTML = '<div style="max-width:420px;text-align:center">Не удалось загрузить подземелье. Проверь интернет и обнови страницу.<br><small>' + esc(e.message || e) + '</small></div>';
  });
})();

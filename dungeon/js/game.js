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
      [btn('Выйти во двор', 'primary', 'Enter', function () { S.seenIntro = true; D.persist(); walkTo(30, function () { go('yard'); }); }),
       btn('Лавка мудреца', 'ghost', null, openShop), btn('Рюкзак', 'ghost', null, openBag)]);
    if (S.hp < S.maxHp) { S.hp = S.maxHp; D.persist(); }
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
    if (!room.boss && room.secs && room.secs.length) objs.push({ type: 'altar' });
    var depth = k / Math.max(1, f.rooms.length - 1);
    for (var i = 0; i < n; i++) {
      var key = ros[Math.floor(r() * ros.length)], strong = i === n - 1 && depth > 0.3 && !!A.MON[key].lm;
      var hp = 1 + Math.round(depth * 2) + (strong ? 2 : 0) + (tier >= 2 ? 1 : 0);
      objs.push({ type: 'mon', key: key, hp: hp, max: hp, strong: strong });
    }
    if (room.boss) { objs.push({ type: 'mon', key: ros[0], hp: 2 + tier, max: 2 + tier }); objs.push({ type: 'mon', key: BOSS[Math.min(2, Math.floor(f.n / 6))], hp: 7 + tier, max: 7 + tier, strong: true, boss: true }); }
    else objs.push({ type: 'chest' });
    objs.push({ type: 'exit' });
    var x0 = objs[0].type === 'altar' ? 104 : 140, span = 448 - x0; objs.forEach(function (o, i) { o.x = o.type === 'exit' ? 448 : Math.round(x0 + i * span / Math.max(1, objs.length - 1) * 0.94); o.state = 'idle'; o.st = now(); });
    var info = roomInfo(f, k);
    info.cleared.forEach(function (i) { if (objs[i]) { objs[i].dead = true; objs[i].hp = 0; } });
    if (info.chest) objs.forEach(function (o) { if (o.type === 'chest') o.open = true; });
    if (info.altar) objs.forEach(function (o) { if (o.type === 'altar') o.used = true; });
    return objs;
  }
  function enterRoom(a) {
    var f = D.floors[a.f - 1], room = f.rooms[a.k];
    show(true); where((f.final ? 'Финал' : 'Этаж ' + f.n) + ' · ' + (room.boss ? 'Босс' : 'Комната ' + (a.k + 1)));
    S.at = { f: f.n, k: a.k }; D.persist();
    G.room = { floor: f.n, f: f, k: a.k, room: room, objs: buildRoom(f, a.k), idx: -1, combo: 1, recent: [], turns: 0, right: 0, wrong: 0, iq: 0, briefOpen: true, mon: null, m0: D.mastery(room.qs), mistakes: [] };
    G.hero.x = 36; G.hero.dir = 1;
    roomIdle();
  }
  function nextObj() { var R = G.room; for (var i = 0; i < R.objs.length; i++) { var o = R.objs[i]; if ((o.type === 'mon' && !o.dead) || (o.type === 'chest' && !o.open) || (o.type === 'altar' && !o.used) || o.type === 'exit') return i; } return R.objs.length - 1; }
  function roomSummary() {
    var R = G.room, mons = R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).length, chest = R.objs.some(function (o) { return o.type === 'chest' && !o.open; });
    var altar = R.objs.some(function (o) { return o.type === 'altar' && !o.used; });
    return 'В комнате: ' + (altar ? 'алтарь знаний · ' : '') + (mons ? mons + ' ' + (mons === 1 ? 'монстр' : mons < 5 ? 'монстра' : 'монстров') : 'монстров не осталось') + (chest ? ' · сундук' : '') + ' · выход';
  }
  function monTop(o) { return A.FLOOR_Y + 8 - A.monHeight(o.key) - (A.MON[o.key].fly ? 40 : 6); }
  function roomLabels() { var R = G.room; if (!R) return; labels(R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).map(function (o) { return { text: A.MON[o.key].name, x: o.x, y: monTop(o) - 14, color: o.boss ? '#F09595' : o.strong ? '#FAC775' : '#e8e4f8' }; }).concat(R.objs.filter(function (o) { return o.type === 'chest' && !o.open; }).map(function (o) { return { text: 'Сундук', x: o.x, y: A.FLOOR_Y - 36, color: '#FAC775' }; })).concat(R.objs.filter(function (o) { return o.type === 'altar' && !o.used; }).map(function (o) { return { text: 'Алтарь знаний', x: o.x, y: A.FLOOR_Y - 70, color: '#CECBF6' }; }))); }
  function roomIdle() {
    focusOn(false); roomLabels();
    var R = G.room, i = nextObj(), o = R.objs[i];
    var what = o.type === 'mon' ? (o.boss ? 'босс «' + A.MON[o.key].name + '»' : A.MON[o.key].name + (o.strong ? ' (сильный)' : '')) : o.type === 'chest' ? 'сундук' : o.type === 'altar' ? 'алтарь знаний (прочитать раздел лекции)' : 'выход';
    var sec = R.room.sec;
    setPanel('<div class="row"><span class="tag">' + esc(R.room.boss ? 'Босс этажа' : 'Комната ' + (R.k + 1)) + '</span>' + (sec ? '<span class="tag teal">' + esc(sec.title) + '</span>' : '') + '</div><p class="msg">' + esc(roomSummary()) + '. Дальше — ' + esc(what) + '.</p>',
      [btn('Идти дальше', 'primary', 'Enter', function () { approach(i); }), btn('Книжка', 'ghost', 'B', function () { openBookRoom(); })]);
  }
  function approach(i) {
    var R = G.room, o = R.objs[i]; R.idx = i;
    var stop = o.type === 'mon' ? o.x - (A.MON[o.key].lm ? 62 : A.MON[o.key].boss ? 66 : 50) : o.type === 'chest' ? o.x - 34 : o.type === 'altar' ? o.x - 30 : o.x - 26;
    setPanel('<p class="msg">Идём…</p>');
    walkTo(stop, function () {
      if (o.type === 'mon') { R.mon = o; R.monTurn = 0; ask(); }
      else if (o.type === 'chest') openChest(o);
      else if (o.type === 'altar') useAltar(o);
      else exitRoom();
    });
  }

  /* --- вопрос --- */
  function briefHtml(q) {
    var R = G.room, secs = R.room.secs && R.room.secs.length ? R.room.secs : R.f.texts, sec = null, best = -1;
    var qt = D.toks(q.q + ' ' + (q.opts || []).map(function (o) { return o.t; }).join(' '));
    secs.forEach(function (s) { if (!s.tok) s.tok = D.toks(s.title + ' ' + D.blocks(s.blocks)); var sc = D.overlap(qt, s.tok); if (sc > best) { best = sc; sec = s; } });
    R.briefSec = sec;
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
    focusOn(true);
    var head = '<div class="row"><span class="tag ' + (m.boss || m.strong ? 'gold' : 'red') + '">' + esc(M.name) + (m.boss ? ' · босс' : m.strong ? ' · сильный' : '') + '</span><span class="tag teal">' + (useTask ? 'Задание' : 'Тест') + '</span><span class="tag">Лекция ' + R.f.n + '</span><span class="grow"></span>' + (useTask ? '' : trBtn()) + icoBtns() + '</div>';
    R.assisted = false; R.fiftyUsed = false; R.hinted = false; R.tr = null; R.answered = false;
    if (useTask) return askTask(head);
    var q = D.pick(R.f, R.room, R.recent); R.q = q; R.recent.push(q.id); if (R.recent.length > 6) R.recent.shift();
    var h = head + briefHtml(q) + '<div class="qtext">' + D.md(q.q) + '</div>';
    if (q.type === 'keyboard') h += '<div class="kb"><input id="kbIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Что выведет программа? Впиши ответ"><button class="btn primary" id="kbGo">Ответить<kbd>Enter</kbd></button></div>';
    else {
      var order = q.opts.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      R.order = order;
      h += '<div class="opts">' + order.map(function (oi, n) { return '<button class="opt" data-o="' + oi + '"><span class="n">' + (n + 1) + '</span><span>' + D.md(q.opts[oi].t) + '</span></button>'; }).join('') + '</div>';
    }
    h += hotbarHtml() + '<div class="hint">Клавиши: ' + (q.type === 'keyboard' ? 'Enter — ответить' : '1–' + q.opts.length + ' — выбрать ответ') + ' · T — перевести · B — книжка · F — весь экран</div>';
    setPanel(h); wireIco(); wireTr(); wireHotbar();
    if (S.cfg.autoTr) toggleTr();
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
      [btn('Не знал', 'warn', null, function () { taskDone(false); }), btn('Знал', 'primary', null, function () { taskDone(true); })]); wireIco();
    panel.insertAdjacentHTML('beforeend', hotbarHtml()); wireHotbar();
    $('sol').onclick = function () { var s = $('sol'); if (s.classList.contains('open')) return; s.classList.add('open'); s.innerHTML = '<div class="rich">' + D.blocks(t.a) + '</div>'; };
  }
  function taskDone(ok) {
    var R = G.room; if (R.taskAnswered) return; R.taskAnswered = true;
    panel.querySelectorAll('[data-b]').forEach(function (b) { b.disabled = true; }); G.buttons = [];
    var s = $('sol'); if (s && !s.classList.contains('open')) s.click();
    panel.insertAdjacentHTML('beforeend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Отлично! Двойной удар.' : 'Не страшно: решение перед тобой, разберись в нём. Это задание вернётся позже.') + '</div>');
    if (!ok) R.mistakes.push({ q: 'Задание: ' + (R.task.title || '').replace(/\s·\s(лёгкая|средняя|сложная)$/, ''), a: 'разбери решение в книжке / в задании' });
    D.record(R.task.id, ok); resolve(ok, ok ? 2 : 0, 'task');
  }

  function answer(ok, pickedIdx) {
    var R = G.room, q = R.q; if (R.answered) return; R.answered = true; D.record(q.id, ok && !R.assisted);
    if (!ok) R.mistakes.push({ q: shortQ(q.q), md: q.q, a: q.type === 'keyboard' ? q.answer : D.strip(D.md((q.opts.filter(function (o) { return o.right; })[0] || {}).t || '')) });
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
    var R = G.room, m = R.mon; peek();
    R.turns++;
    if (D.touchStreak()) floater('Огонёк +1 день!', 240, 40, '#FF9600');
    if (ok) {
      R.right++;
      var hw = X.hit(power, m), dmg = hw.dmg; if (R.combo >= 1.5 && Math.random() < (R.combo - 1)) { dmg++; R.crit = true; } else R.crit = false;
      if (hw.note) setTimeout(function () { floater(hw.note, m.x, 90, '#FF9600'); }, 260);
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
        if (S.shieldOn) { S.shieldOn = false; floater('Щит выдержал!', G.hero.x, 110, '#85B7EB'); }
        else { var cost = X.hurtCost(); S.hp = Math.max(0, S.hp - cost); G.hero.hurtAt = now(); floater('−' + cost + ' ♥', G.hero.x, 110, '#F09595'); }
        if (S.hp <= 0 && X.take('feather')) { S.hp = 3; setTimeout(function () { floater('Перо феникса! +3 ♥', G.hero.x, 80, '#FF9600'); }, 400); }
        D.persist(); hud(); afterAnswer(false);
      }, A.MON[m.key].lm ? 420 : 260);
    }
  }
  function afterAnswer(ok) {
    var R = G.room, m = R.mon;
    if (S.hp <= 0) return setTimeout(defeat, 500);
    var btns = [];
    if (m.dead && m.boss) btns.push(btn('Босс повержен! Открыть железный сундук', 'primary', 'Enter', function () { R.mon = null; bossLoot(); }));
    else if (m.dead) btns.push(btn(A.MON[m.key].name + ' повержен — идти дальше', 'primary', 'Enter', function () { R.mon = null; roomIdle(); }));
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
    var R = G.room, L = X.loot('chest'), gain = L.iq;
    o.open = true; o.openAt = now(); R.iq += gain;
    var info = roomInfo(R.f, R.k); info.chest = true; S.rooms[rkey(R.f, R.k)] = info; D.persist(); hud();
    floater('+' + gain + ' IQ', o.x, 150, '#CECBF6');
    setPanel('<div class="qtext">Сундук открыт!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', roomIdle), btn('Рюкзак', 'ghost', null, openBag)]);
  }
  function stars(m) { return m >= 85 ? '★★★' : m >= 50 ? '★★☆' : m > 0 ? '★☆☆' : '☆☆☆'; }
  function exitRoom() {
    focusOn(false);
    var R = G.room, f = R.f, info = roomInfo(f, R.k), first = !info.done;
    info.done = true; S.rooms[rkey(f, R.k)] = info; var bonus = first ? 10 : 3; S.iq += bonus; R.iq += bonus; D.persist(); hud();
    var m = D.mastery(R.room.qs), next = f.rooms[R.k + 1], acc = R.right + R.wrong ? Math.round(R.right / (R.right + R.wrong) * 100) : 100;
    var h = '<div class="sum-head"><div><div class="qtext">' + (R.room.boss ? 'Босс этажа повержен!' : 'Комната пройдена!') + '</div><div class="sum-stars">' + stars(m) + '</div></div>' +
      '<div class="sum-cards"><div><b>' + R.right + '</b><span>верно</span></div><div><b>' + R.wrong + '</b><span>ошибок</span></div><div><b>' + acc + '%</b><span>точность</span></div><div class="iq"><b>+' + R.iq + '</b><span>IQ</span></div></div></div>' +
      '<div class="sum-bar"><span>Освоение темы комнаты</span><div class="mbar"><i class="was" style="width:' + R.m0 + '%"></i><i class="now" style="width:' + Math.max(0, m - R.m0) + '%;left:' + R.m0 + '%"></i></div><span>' + R.m0 + '% → <b>' + m + '%</b></span></div>';
    if (R.mistakes.length) {
      h += '<div class="sum-mist"><b>Повтори — здесь были ошибки</b><ul>' + R.mistakes.slice(0, 6).map(function (x) { return '<li><div class="mq">' + (x.md ? D.md(x.md) : esc(x.q)) + '</div><em>Ответ: ' + esc(x.a) + '</em></li>'; }).join('') + '</ul><p class="hint">Эти вопросы вернутся в следующих комнатах — через пару других, чтобы закрепиться.</p></div>';
    } else h += '<p class="msg">Ни одной ошибки — отлично! Следующие комнаты будут сложнее.</p>';
    setPanel(h, (next ? [btn('Следующая комната', 'primary', 'Enter', function () { go('room', { f: f.n, k: R.k + 1 }); })] : [btn(f.n < D.floors.length ? 'Этаж пройден! На следующий' : 'Подземелье пройдено!', 'primary', 'Enter', function () { if (f.n < D.floors.length) go('floor', f.n + 1); else go('path'); })])
      .concat([btn('Книжка', 'ghost', 'B', openBookRoom), btn('К этажу', 'ghost', null, function () { go('floor', f.n); })]));
  }
  function defeat() {
    focusOn(false);
    setPanel('<div class="qtext">Тебя одолели…</div><p class="msg">Сердечки закончились. Ничего страшного: все ответы и освоение тем сохранены, побеждённые монстры не вернутся. Отдохни в домике — сердечки восстановятся.</p>',
      [btn('Вернуться домой', 'primary', 'Enter', function () { S.hp = S.maxHp; D.persist(); go('house'); })]);
  }
  function shortQ(s) { s = String(s || '').split('```')[0].replace(/`/g, '').trim(); return s.length > 110 ? s.slice(0, 107) + '…' : s; }

  /* ---------- режим «на весь экран» ---------- */
  var appEl = $('app');
  function focusOn(on) { appEl.classList.toggle('focus', !!(on && S.focus)); appEl.classList.remove('peek'); }
  function peek() { if (appEl.classList.contains('focus')) { appEl.classList.add('peek'); window.scrollTo(0, 0); } }
  function toggleFocus() { S.focus = !S.focus; D.persist(); if (G.room && G.room.mon) { appEl.classList.toggle('focus', S.focus); appEl.classList.remove('peek'); var b = panel.querySelector('[data-ico="focus"]'); if (b) b.title = S.focus ? 'Свернуть (F)' : 'На весь экран (F)'; } }
  var ICO_BOOK = '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z" fill="#F1E4C8"/><path d="M12 6v14" stroke="#3C3489" stroke-width="2"/><path d="M5 9h5M5 12h5M14 9h5M14 12h5" stroke="#7F77DD" stroke-width="1.5"/></svg>';
  var ICO_FULL = '<svg viewBox="0 0 24 24" fill="none" stroke="#e8e4f8" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICO_MIN = '<svg viewBox="0 0 24 24" fill="none" stroke="#e8e4f8" stroke-width="2.4" stroke-linecap="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  function icoBtns() { return '<button class="ico-btn book" data-ico="book" title="Книжка — вся лекция (B)" aria-label="Книжка">' + ICO_BOOK + '</button><button class="ico-btn" data-ico="focus" title="' + (S.focus ? 'Свернуть (F)' : 'На весь экран (F)') + '" aria-label="На весь экран">' + (S.focus ? ICO_MIN : ICO_FULL) + '</button>'; }
  function wireIco() {
    var b = panel.querySelector('[data-ico="book"]'), f = panel.querySelector('[data-ico="focus"]');
    if (b) b.onclick = openBookRoom;
    if (f) f.onclick = function () { toggleFocus(); f.innerHTML = S.focus ? ICO_MIN : ICO_FULL; };
  }

  /* ---------- КНИЖКА: вся лекция, открывается на нужной странице ---------- */
  var BK = null;
  function openBookRoom() {
    var R = G.room; if (!R) return;
    var sec = (R.mon && R.briefSec) || R.room.sec || (R.room.secs || [])[0];
    var idx = Math.max(0, R.f.texts.indexOf(sec));
    openBook({ f: R.f, start: idx, mark: (R.room.secs || []).map(function (s) { return s.id; }), cur: sec ? sec.id : null });
  }
  function openBook(o) {
    var el = $('book'); if (!el) { el = document.createElement('div'); el.id = 'book'; document.body.appendChild(el); }
    BK = o; BK.page = o.start || 0; el.hidden = false; document.body.classList.add('book-open'); renderBook();
  }
  function closeBook() {
    var el = $('book'); if (!el || !BK) return; var o = BK; BK = null; el.hidden = true; document.body.classList.remove('book-open');
    if (o.onClose) o.onClose();
  }
  function renderBook() {
    var o = BK, f = o.f, T = f.texts, wide = innerWidth >= 960, step = wide ? 2 : 1;
    if (wide && o.page % 2 && o.page === T.length - 1) o.page--;
    var pages = [T[o.page], wide ? T[o.page + 1] : null].filter(Boolean);
    var pg = function (s) {
      var i = T.indexOf(s), here = o.cur === s.id, inRoom = o.mark && o.mark.indexOf(s.id) >= 0;
      return '<article class="bk-page">' + (here ? '<div class="bk-here">★ Ты здесь: об этом сейчас вопросы</div>' : inRoom ? '<div class="bk-here room">◆ Раздел твоей комнаты</div>' : '') +
        '<h3><span>' + esc(s.id) + '</span> ' + esc(s.title) + '</h3><div class="bk-body">' + D.bookHtml(s.blocks) + '</div><div class="bk-num">стр. ' + (i + 1) + ' из ' + T.length + '</div></article>';
    };
    var toc = '<select id="bkToc" aria-label="Оглавление">' + T.map(function (s, i) { return '<option value="' + i + '"' + (i === o.page ? ' selected' : '') + '>' + esc(s.id + ' ' + s.title) + (o.mark && o.mark.indexOf(s.id) >= 0 ? ' ◆' : '') + '</option>'; }).join('') + '</select>';
    var close = o.altar ? 'Прочитал — забрать награду' : (G.room && G.room.mon ? 'Вернуться в бой' : 'Закрыть книжку');
    $('book').innerHTML = '<div class="bk-wrap" role="dialog" aria-label="Книжка">' +
      '<header class="bk-top"><div class="bk-title">' + (o.altar ? '<span class="tag">Алтарь знаний</span> ' : '') + '<b>' + esc(f.final ? 'Итог курса' : 'Лекция ' + f.n) + '</b> · ' + esc(f.title) + '</div>' + toc + '<button class="btn ghost bk-x" id="bkX" aria-label="Закрыть">✕</button></header>' +
      (o.altar ? '<div class="bk-altar">Алтарь открыл разделы этой комнаты целиком. Прочитай их спокойно — потом монстрам будет проще отвечать. За первое прочтение: <b>+5 IQ</b> и <b>+1 ♥</b>.</div>' : '') +
      '<div class="bk-spread' + (pages.length > 1 ? ' two' : '') + '">' + pages.map(pg).join('') + '</div>' +
      '<footer class="bk-foot"><button class="btn ghost" id="bkPrev"' + (o.page <= 0 ? ' disabled' : '') + '>◀ Назад</button><button class="btn primary" id="bkClose">' + esc(close) + '<kbd>Esc</kbd></button><button class="btn ghost" id="bkNext"' + (o.page + step >= T.length ? ' disabled' : '') + '>Дальше ▶</button></footer></div>';
    $('bkPrev').onclick = function () { flip(-1); }; $('bkNext').onclick = function () { flip(1); };
    $('bkClose').onclick = closeBook; $('bkX').onclick = closeBook;
    $('bkToc').onchange = function () { o.page = +this.value; if (wide && o.page % 2) o.page--; renderBook(); };
    var body = $('book').querySelector('.bk-spread'); if (body) body.scrollTop = 0;
  }
  function flip(d) { if (!BK) return; var step = innerWidth >= 960 ? 2 : 1, n = BK.f.texts.length; var p = BK.page + d * step; if (p < 0 || p >= n) return; BK.page = p; renderBook(); }
  addEventListener('resize', function () { if (BK) renderBook(); });

  /* ---------- АЛТАРЬ ЗНАНИЙ ---------- */
  function useAltar(o) {
    var R = G.room, secs = R.room.secs || [], first = !o.used;
    setPanel('<div class="qtext">Алтарь знаний</div><p class="msg">Над камнем парит книга. Она откроет разделы этой комнаты целиком: «' + esc(secs.map(function (s) { return s.title; }).join('», «')) + '». Прочитай — и монстры станут понятнее.</p>',
      [btn('Открыть книгу', 'primary', 'Enter', function () {
        openBook({ f: R.f, start: Math.max(0, R.f.texts.indexOf(secs[0])), mark: secs.map(function (s) { return s.id; }), cur: null, altar: first, onClose: function () {
          if (!o.used) { o.used = true; var info = roomInfo(R.f, R.k); info.altar = true; S.rooms[rkey(R.f, R.k)] = info; S.iq += 5; R.iq += 5; var healed = S.hp < S.maxHp; if (healed) S.hp++; D.persist(); hud();
            floater('+5 IQ', o.x, 120, '#CECBF6'); if (healed) floater('+1 ♥', o.x, 150, '#9FE1CB'); }
          roomIdle();
        } });
      }), btn('Пропустить', 'ghost', null, function () { o.used = true; roomIdle(); })]);
  }

  /* =====================================================================
     ЭТАП 3: хотбар, предметы, рюкзак, лавка, настройки, перевод
     ===================================================================== */
  var X = window.DX;
  var ICO_TR = '<svg viewBox="0 0 24 24"><text x="2" y="12" font-size="11" font-weight="700" fill="#e8e4f8" font-family="Arial">A</text><text x="11" y="21" font-size="11" font-weight="700" fill="#5DCAA5" font-family="Arial">Я</text><path d="M9 6h4l-2 3" stroke="#AFA9EC" stroke-width="1.5" fill="none"/></svg>';
  function toast(text, col) { var R = G.room; floater(text, R ? G.hero.x + 30 : 240, 70, col || '#e8e4f8'); }

  /* --- хотбар под вопросом --- */
  function hotbarHtml() {
    var w = X.weapon(), W = X.WEAPONS[w.k], h = '<div class="hotbar" role="toolbar" aria-label="Предметы">';
    h += '<button class="slot weapon" data-hb="#bag" title="' + esc(W.name + ' — ' + W.desc) + '"><img src="' + X.iconUrl(W.icon) + '" alt="">' + (W.dur ? '<i class="dur"><b style="width:' + Math.round(Math.max(0, w.dur) / W.dur * 100) + '%;background:' + (w.dur / W.dur > 0.5 ? '#5DCAA5' : w.dur / W.dur > 0.25 ? '#EF9F27' : '#E24B4A') + '"></b></i>' : '') + '</button>';
    X.HOTBAR.forEach(function (k) {
      var it = X.ITEMS[k], n = X.count(k); if (!n) return;
      h += '<button class="slot" data-hb="' + k + '" title="' + esc(it.name + ' — ' + it.desc) + (it.key ? ' (' + it.key + ')' : '') + '"><img src="' + X.iconUrl(it.icon) + '" alt="">' + '<em>×' + n + '</em>' + (it.key ? '<kbd>' + it.key + '</kbd>' : '') + '</button>';
    });
    return h + (G.room && G.room.shieldTag ? '' : '') + '</div>';
  }
  function wireHotbar() {
    panel.querySelectorAll('[data-hb]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-hb'); if (k === '#bag') openBag(); else useItem(k); }; });
  }
  function refreshHotbar() { var hb = panel.querySelector('.hotbar'); if (hb) { hb.outerHTML = hotbarHtml(); wireHotbar(); } }
  function plainQ(q) { return String(q.q || '').replace(/```\w*\n?/g, '\n').replace(/`/g, '').trim() + ((q.opts || []).length ? '\n' + q.opts.map(function (o, i) { return (i + 1) + ') ' + o.t.replace(/`/g, ''); }).join('\n') : ''); }
  function useItem(k) {
    var R = G.room, it = X.ITEMS[k]; if (!it || !X.count(k)) return;
    var inQ = R && R.mon && R.q && !R.answered, boss = R && R.mon && R.mon.boss;
    if (boss && (R.used || 0) >= 3 && k !== 'potion' && k !== 'bigpot') return toast('На боссе — не больше 3 предметов', '#F09595');
    if (k === 'potion' || k === 'bigpot') {
      if (S.hp >= S.maxHp) return toast('Сердечки и так полные', '#B4B2C4');
      X.take(k); S.hp = k === 'bigpot' ? S.maxHp : S.hp + 1; toast(k === 'bigpot' ? 'Все сердечки!' : '+1 ♥', '#9FE1CB');
    } else if (k === 'shield') {
      if (S.shieldOn) return toast('Щит уже поднят', '#B4B2C4');
      X.take(k); S.shieldOn = true; toast('Щит поднят!', '#85B7EB');
    } else {
      if (!inQ) return toast('Это для вопроса — используй, когда монстр спросит', '#B4B2C4');
      if (k === 'fifty') {
        if (R.q.type === 'keyboard' || R.q.opts.length < 3 || R.fiftyUsed) return toast('Здесь 50/50 не сработает', '#B4B2C4');
        var wrong = [].slice.call(panel.querySelectorAll('.opt')).filter(function (b) { return !R.q.opts[+b.getAttribute('data-o')].right; });
        wrong.sort(function () { return Math.random() - 0.5; }).slice(0, 2).forEach(function (b) { b.disabled = true; b.classList.add('gone'); });
        R.fiftyUsed = true; X.take(k);
      } else if (k === 'bulb') {
        if (R.hinted) return toast('Подсказка уже открыта', '#B4B2C4');
        X.take(k); R.hinted = true; panel.querySelector('.qtext').insertAdjacentHTML('afterend', hintHtml(R.q));
      } else if (k === 'google') {
        X.take(k); window.open('https://www.google.com/search?q=' + encodeURIComponent(plainQ(R.q).slice(0, 900)), '_blank', 'noopener');
      } else if (k === 'ai') {
        X.take(k); var lang = S.cfg.trLang === 'kk' ? 'қазақ тілінде (Kazakh)' : 'на русском языке (Russian)';
        window.open('https://www.google.com/search?udm=50&q=' + encodeURIComponent(('Ответь ' + lang + '. Это тест по C++. Объясни простыми словами, какой ответ верный и почему:\n' + plainQ(R.q)).slice(0, 1500)), '_blank', 'noopener');
      }
      R.assisted = true; markAssisted();
    }
    if (boss) R.used = (R.used || 0) + 1;
    D.persist(); hud(); refreshHotbar();
  }
  function markAssisted() { var row = panel.querySelector('.row'); if (row && !row.querySelector('.tag.assist')) row.insertAdjacentHTML('beforeend', '<span class="tag assist">с подсказкой</span>'); }
  function hintHtml(q) {
    var R = G.room, sec = R.briefSec || R.room.sec, parts = [];
    (sec && sec.blocks || []).forEach(function (b) { if (parts.join(' ').length > 380) return; var s = b.t === 'p' || b.t === 'note' ? D.strip(b.html) : (b.t === 'ul' || b.t === 'ol') ? b.items.map(D.strip).join('; ') : ''; if (s.length > 25) parts.push(s); });
    var txt = parts.join(' ').slice(0, 420);
    var extra = q.type === 'keyboard' ? '<p><b>Намёк к ответу:</b> в ответе ' + String(q.answer).length + ' симв., начинается с «' + esc(String(q.answer).charAt(0)) + '».</p>' : '';
    return '<div class="hintbox"><b>💡 Подсказка' + (sec ? ' · ' + esc(sec.title) : '') + '</b><p>' + esc(txt) + (txt.length >= 420 ? '…' : '') + '</p>' + extra + '</div>';
  }

  /* --- перевод вопроса --- */
  function trBtn() { return '<button class="ico-btn tr" data-ico="tr" title="Перевести на ' + (S.cfg.trLang === 'kk' ? 'казахский' : 'русский') + ' (T)" aria-label="Перевести">' + ICO_TR + '</button>'; }
  function wireTr() { var b = panel.querySelector('[data-ico="tr"]'); if (b) b.onclick = function () { toggleTr(); }; }
  function toggleTr() {
    var R = G.room; if (!R || !R.q || !R.mon) return;
    if (R.tr && R.tr.shown) { showOriginal(); return; }
    if (R.tr && R.tr.data && R.tr.lang === S.cfg.trLang) { applyTr(R.tr.data); return; }
    var b = panel.querySelector('[data-ico="tr"]'); if (b) b.classList.add('busy');
    var q = R.q, lang = S.cfg.trLang;
    X.trQuestion(q, lang).then(function (d) { if (G.room !== R || R.q !== q) return; R.tr = { data: d, lang: lang }; applyTr(d); })
      .catch(function () { toast('Перевод недоступен — нет интернета?', '#F09595'); })
      .then(function () { if (b) b.classList.remove('busy'); });
  }
  function applyTr(d) {
    var R = G.room, qt = panel.querySelector('.qtext'); if (!qt) return;
    if (!R.tr.orig) R.tr.orig = { q: qt.innerHTML, o: [].map.call(panel.querySelectorAll('.opt'), function (b) { return b.lastElementChild.innerHTML; }) };
    qt.innerHTML = D.md(d.q) + '<div class="tr-note">' + esc(X.LANGS[R.tr.lang]) + ' · перевод Google · <button class="linkbtn" data-orig>оригинал</button></div>';
    panel.querySelectorAll('.opt').forEach(function (b) { var oi = +b.getAttribute('data-o'); b.lastElementChild.innerHTML = D.md(d.o[oi] != null ? d.o[oi] : R.q.opts[oi].t); });
    R.tr.shown = true; var ob = qt.querySelector('[data-orig]'); if (ob) ob.onclick = showOriginal;
    var tb = panel.querySelector('[data-ico="tr"]'); if (tb) tb.classList.add('on');
  }
  function showOriginal() {
    var R = G.room; if (!R.tr || !R.tr.orig) return;
    panel.querySelector('.qtext').innerHTML = R.tr.orig.q;
    panel.querySelectorAll('.opt').forEach(function (b, i) { b.lastElementChild.innerHTML = R.tr.orig.o[i]; });
    R.tr.shown = false; var tb = panel.querySelector('[data-ico="tr"]'); if (tb) tb.classList.remove('on');
  }

  /* --- модальные окна: рюкзак, лавка, настройки --- */
  function modal(html, onOpen) {
    var el = $('modal'); if (!el) { el = document.createElement('div'); el.id = 'modal'; document.body.appendChild(el); el.addEventListener('click', function (e) { if (e.target === el) closeModal(); }); }
    el.innerHTML = '<div class="md-wrap">' + html + '</div>'; el.hidden = false; document.body.classList.add('book-open'); G.modal = true;
    var x = el.querySelector('[data-close]'); if (x) x.onclick = closeModal;
    if (onOpen) onOpen(el);
  }
  function closeModal() { var el = $('modal'); if (el) el.hidden = true; document.body.classList.remove('book-open'); G.modal = false; hud(); refreshHotbar(); }
  function slotCard(icon, title, sub, right, rar, extra) {
    return '<div class="card-it" style="border-color:' + (X.RAR_COL[rar || 0]) + '"><img src="' + icon + '" alt=""><div class="grow"><b>' + esc(title) + '</b><span>' + sub + '</span>' + (extra || '') + '</div>' + (right || '') + '</div>';
  }
  function durBar(w) { var W = X.WEAPONS[w.k]; if (!W.dur) return '<span class="muted">не ломается</span>'; var p = Math.max(0, w.dur) / W.dur; return '<div class="durbar"><i style="width:' + Math.round(p * 100) + '%;background:' + (p > 0.5 ? '#5DCAA5' : p > 0.25 ? '#EF9F27' : '#E24B4A') + '"></i></div><span class="muted">прочность ' + Math.max(0, w.dur) + ' / ' + W.dur + (w.dur <= 0 ? ' — сломан, бьёт как обычный' : '') + '</span>'; }
  function openBag() {
    var h = '<header class="md-top"><b>Рюкзак</b><span class="grow"></span><span class="hud-iq"><span>IQ</span><b>' + S.iq + '</b></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">';
    h += '<h4>Оружие <small>(в руке — то, чем бьёшь)</small></h4>';
    S.inv.weapons.forEach(function (w, i) {
      var W = X.WEAPONS[w.k], inHand = i === S.inv.hand;
      h += slotCard(X.iconUrl(W.icon), W.name + (inHand ? ' · в руке' : ''), esc(X.RAR[W.rar]) + ' · ' + esc(W.desc), inHand ? '<span class="tag teal">в руке</span>' : '<button class="btn" data-hand="' + i + '">Взять</button>', W.rar, durBar(w));
    });
    h += '<h4>Предметы</h4><div class="it-grid">';
    var any = false;
    Object.keys(X.ITEMS).forEach(function (k) { var n = X.count(k); if (!n) return; any = true; var it = X.ITEMS[k];
      h += '<div class="it" style="border-color:' + X.RAR_COL[it.rar] + '"><img src="' + X.iconUrl(it.icon) + '" alt=""><em>×' + n + '</em><b>' + esc(it.name) + '</b><span>' + esc(it.desc) + '</span></div>'; });
    if (!any) h += '<p class="muted">Пусто. Предметы падают из сундуков и продаются в лавке в домике.</p>';
    h += '</div><p class="hint">Предметы для вопроса (50/50, лампа, Google, ИИ) используются в бою с хотбара под вопросом. Если ответил с подсказкой, вопрос засчитывается как «не знал» и вернётся ещё раз — так подсказки не мешают учиться. Перо феникса и ледяной кристалл срабатывают сами.</p></div>';
    modal(h, function (el) { el.querySelectorAll('[data-hand]').forEach(function (b) { b.onclick = function () { S.inv.hand = +b.getAttribute('data-hand'); D.persist(); openBag(); }; }); });
  }
  function openShop() {
    var h = '<header class="md-top"><b>Лавка мудреца</b><span class="grow"></span><span class="hud-iq"><span>IQ</span><b>' + S.iq + '</b></span><button class="btn ghost" data-close>✕</button></header><div class="md-body"><p class="muted">Плати своим IQ — его дают за верные ответы, прочитанные алтари, задания, сундуки и боссов.</p><h4>Расходники</h4><div class="shop-grid">';
    Object.keys(X.ITEMS).forEach(function (k) { var it = X.ITEMS[k], can = S.iq >= it.price;
      h += '<div class="shop-it" style="border-color:' + X.RAR_COL[it.rar] + '">' + (it.rar ? '<span class="rar" style="background:' + X.RAR_COL[it.rar] + '">' + X.RAR[it.rar] + '</span>' : '') + '<img src="' + X.iconUrl(it.icon) + '" alt=""><b>' + esc(it.name) + '</b><span>' + esc(it.desc) + '</span><small>у тебя: ' + X.count(k) + '</small><button class="btn ' + (can ? 'primary' : '') + '" data-buy="' + k + '"' + (can ? '' : ' disabled') + '>IQ ' + it.price + '</button></div>'; });
    h += '</div><h4>Оружие</h4><div class="shop-grid">';
    Object.keys(X.WEAPONS).forEach(function (k) { var W = X.WEAPONS[k]; if (!W.price) return; var can = S.iq >= W.price;
      h += '<div class="shop-it" style="border-color:' + X.RAR_COL[W.rar] + '"><span class="rar" style="background:' + X.RAR_COL[W.rar] + '">' + X.RAR[W.rar] + '</span><img src="' + X.iconUrl(W.icon) + '" alt=""><b>' + esc(W.name) + '</b><span>' + esc(W.desc) + '</span><small>прочность ' + W.dur + '</small><button class="btn ' + (can ? 'primary' : '') + '" data-buyw="' + k + '"' + (can ? '' : ' disabled') + '>IQ ' + W.price + '</button></div>'; });
    h += '</div>';
    var worn = S.inv.weapons.map(function (w, i) { return { w: w, i: i }; }).filter(function (x) { var W = X.WEAPONS[x.w.k]; return W.dur && x.w.dur < W.dur; });
    if (worn.length) { h += '<h4>Починка (IQ ' + X.REPAIR + ')</h4>'; worn.forEach(function (x) { var W = X.WEAPONS[x.w.k]; h += slotCard(X.iconUrl(W.icon), W.name, esc(W.desc), '<button class="btn ' + (S.iq >= X.REPAIR ? 'primary' : '') + '" data-fix="' + x.i + '"' + (S.iq >= X.REPAIR ? '' : ' disabled') + '>Починить</button>', W.rar, durBar(x.w)); }); }
    h += '</div>';
    modal(h, function (el) {
      el.querySelectorAll('[data-buy]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-buy'), it = X.ITEMS[k]; if (S.iq < it.price) return; S.iq -= it.price; X.add(k); D.persist(); openShop(); }; });
      el.querySelectorAll('[data-buyw]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-buyw'), W = X.WEAPONS[k]; if (S.iq < W.price) return; S.iq -= W.price; X.addWeapon(k); S.inv.hand = S.inv.weapons.length - 1; D.persist(); openShop(); }; });
      el.querySelectorAll('[data-fix]').forEach(function (b) { b.onclick = function () { if (S.iq < X.REPAIR) return; var w = S.inv.weapons[+b.getAttribute('data-fix')]; S.iq -= X.REPAIR; w.dur = X.WEAPONS[w.k].dur; D.persist(); openShop(); }; });
    });
  }
  function openSettings() {
    var c2 = S.cfg;
    var h = '<header class="md-top"><b>Настройки</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">' +
      '<div class="set-row"><div><b>Язык перевода вопросов</b><span>На этот язык переводит кнопка «Перевести» (A→Я) и автоперевод.</span></div><div class="seg">' + Object.keys(X.LANGS).map(function (l) { return '<button data-lang="' + l + '" aria-pressed="' + (c2.trLang === l) + '">' + X.LANGS[l] + '</button>'; }).join('') + '</div></div>' +
      '<div class="set-row"><div><b>Автоперевод</b><span>Каждый вопрос сразу показывается в переводе. Оригинал — по ссылке «оригинал» под вопросом.</span></div><label class="sw"><input type="checkbox" id="setAuto"' + (c2.autoTr ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Вопрос на весь экран</b><span>Сцена прячется, вопрос крупнее. После ответа видно удар. Клавиша F.</span></div><label class="sw"><input type="checkbox" id="setFocus"' + (S.focus ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Сбросить прогресс</b><span>Удалит освоение, IQ, предметы и огонёк на этом устройстве.</span></div><button class="btn warn" id="setReset">Сбросить</button></div>' +
      '<p class="hint">Графика: «Monsters Creatures Fantasy» (Luiz Melo) и «DungeonTileset II» (0x72) — CC0. Герой, факелы и сцены нарисованы для StudyPlay.</p></div>';
    modal(h, function (el) {
      el.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { c2.trLang = b.getAttribute('data-lang'); D.persist(); openSettings(); }; });
      $('setAuto').onchange = function () { c2.autoTr = this.checked; D.persist(); };
      $('setFocus').onchange = function () { S.focus = this.checked; D.persist(); };
      $('setReset').onclick = function () { if (this.dataset.sure) { localStorage.removeItem('sp-dungeon-v1'); location.reload(); } else { this.dataset.sure = 1; this.textContent = 'Точно? Нажми ещё раз'; } };
    });
  }
  $('hudBag').onclick = openBag; $('hudSet').onclick = openSettings;

  /* --- лут --- */
  function lootHtml(L) {
    var cells = '<div class="loot-it"><span class="iqbig">IQ</span><b>+' + L.iq + '</b></div>';
    L.items.forEach(function (k) { var it = X.ITEMS[k]; cells += '<div class="loot-it" style="border-color:' + X.RAR_COL[it.rar] + '"><img src="' + X.iconUrl(it.icon) + '" alt=""><b>' + esc(it.name) + '</b></div>'; });
    if (L.weapon) { var W = X.WEAPONS[L.weapon]; cells += '<div class="loot-it big" style="border-color:' + X.RAR_COL[W.rar] + '"><span class="rar" style="background:' + X.RAR_COL[W.rar] + '">' + X.RAR[W.rar] + '</span><img src="' + X.iconUrl(W.icon) + '" alt=""><b>' + esc(W.name) + '</b><small>' + esc(W.desc) + '</small></div>'; }
    return '<div class="loot">' + cells + '</div>' + (L.weapon ? '<p class="hint">Новое оружие лежит в рюкзаке — возьми его в руку.</p>' : '');
  }
  function bossLoot() {
    var R = G.room, L = X.loot('boss'); R.iq += L.iq; D.persist(); hud(); roomLabels();
    floater('+' + L.iq + ' IQ', G.hero.x + 60, 120, '#CECBF6');
    setPanel('<div class="qtext">Железный сундук босса!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', roomIdle), btn('Рюкзак', 'ghost', null, openBag)]);
  }

  /* ---------- клавиатура ---------- */
  document.addEventListener('keydown', function (e) {
    if (BK) { if (e.key === 'Escape') { e.preventDefault(); closeBook(); } else if (e.key === 'ArrowRight') flip(1); else if (e.key === 'ArrowLeft') flip(-1); else if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); closeBook(); } return; }
    if (G.modal) { if (e.key === 'Escape') closeModal(); return; }
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (G.scene === 'room' && G.room && G.room.mon && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var lk = e.key.toLowerCase();
      if (lk === 't' || lk === 'е') { e.preventDefault(); toggleTr(); return; }
      var hk = Object.keys(X.ITEMS).filter(function (k) { return X.ITEMS[k].key && X.ITEMS[k].key.toLowerCase() === lk; })[0];
      if (hk) { e.preventDefault(); useItem(hk); return; }
    }
    if ((e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') && G.scene === 'room') { e.preventDefault(); openBookRoom(); return; }
    if ((e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') && G.scene === 'room' && G.room && G.room.mon) { e.preventDefault(); var fb = panel.querySelector('[data-ico="focus"]'); if (fb) fb.click(); else toggleFocus(); return; }
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
      if (o.type === 'altar') { A.altar(c, o.x, fy, t, o.used); return; }
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

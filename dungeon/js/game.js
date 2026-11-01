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
        '<p class="msg">Это игра для подготовки к РК и экзамену по C++. Внизу подземелья — этажи, каждый этаж — одна лекция. В комнатах тебя ждут монстры: они задают вопросы по теме. Ответил верно — ты бьёшь монстра, ошибся — монстр бьёт тебя, а этот вопрос потом спросит страж у выхода из комнаты. Сердечки сверху — твои жизни, огонёк — сколько дней подряд ты занимаешься, IQ — награда за ответы.</p>'
        : '<div class="qtext">Домик</div><p class="msg">Отдохнул? Подземелье ждёт. Прогресс сохраняется после каждого ответа.</p>') + dailyHtml(),
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
  function poolIds(f) { return f.pool.map(function (q) { return q.id; }); }
  function statLine(st) { return 'увидено ' + st.seen + ' / ' + st.total + (st.bad ? ' · <b class="bad">к повтору: ' + st.bad + '</b>' : ''); }
  function enterPath() {
    show(false); where('Подземелье C++');
    var cur = S.at ? S.at.f : 1, h = '<div class="path-head"><h1>Подземелье C++</h1><span class="tag teal">все этажи открыты</span></div><p class="hallnote">Этаж = лекция. Цвет круга — насколько ты освоил тему: серый — не начинал, оранжевый — начал, зелёный — хорошо, золотой — отлично. Золотая медаль ✓ — этаж пройден начисто: все вопросы увидены и ни одной неисправленной ошибки.</p>' + tipHtml('path') + dailyHtml();
    UNITS.forEach(function (u, ui) {
      h += '<div class="unit u' + (ui % 4 + 1) + '"><small>' + esc(u[2]) + '</small><b>' + esc(u[3]) + '</b></div><div class="trail">';
      D.floors.filter(function (f) { return f.n >= u[0] && f.n <= u[1]; }).forEach(function (f) {
        var m = floorMastery(f), st = D.stats(poolIds(f)), cls = m >= 85 ? 'm3' : m >= 50 ? 'm2' : m > 0 ? 'm1' : '';
        h += '<button class="node' + (f.n === cur ? ' cur' : '') + (st.clean ? ' clean' : '') + '" data-f="' + f.n + '"><span class="disc ' + cls + '">' + (f.final ? '★' : f.n) + (st.clean ? '<i class="medal">✓</i>' : '') + '</span><span class="info"><b>' + esc(f.final ? 'Финальный этаж' : 'Этаж ' + f.n) + (st.clean ? ' <span class="tag gold">пройден начисто</span>' : '') + '</b><span>' + esc(f.title) + '</span><div class="bar"><i style="width:' + m + '%"></i></div><span>освоено ' + m + '% · ' + statLine(st) + '</span></span></button>';
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
    var m = floorMastery(f), fst = D.stats(poolIds(f)), bad = D.badIds(f).length;
    var nextK = f.rooms.findIndex(function (r) { return !roomInfo(f, r.k).done || !D.stats(r.qs).clean; });
    var h = '<div class="path-head"><h1>' + esc(f.final ? 'Финальный этаж' : 'Этаж ' + f.n) + '</h1><span class="tag teal">освоено ' + m + '%</span>' + (fst.clean ? '<span class="tag gold">пройден начисто ✓</span>' : '') + '</div>' +
      '<p class="hallnote">' + esc(f.title) + '. Вопросов на этаже: ' + statLine(fst) + '. Комнаты идут от лёгких к сложным. В каждой комнате монстров ровно столько, чтобы спросить все её вопросы и задания. Ошибки и ответы с подсказкой заберёт страж у выхода — он не выпустит, пока не ответишь сам. Так комната становится «чисто ✓».</p>' + tipHtml('floor') + '<div class="rooms">';
    f.rooms.forEach(function (r) {
      if (r.boss) {
        h += '<button class="room err' + (bad ? '' : ' locked') + '" data-k="err"' + (bad ? '' : ' disabled') + '><b>Зал ошибок</b><span>' + (bad ? 'ждут исправления: <b class="bad">' + bad + '</b>' : 'заперт — ошибок нет') + '</span><span>только твои ошибки этой лекции</span></button>';
      }
      var ri = roomInfo(f, r.k), rm = D.mastery(r.qs), st = D.stats(r.qs), stars = rm >= 85 ? '★★★' : rm >= 50 ? '★★☆' : rm > 0 ? '★☆☆' : '☆☆☆';
      var status = st.clean && ri.done ? '<span class="tag gold">чисто ✓</span>' : ri.done ? '<span class="tag">есть что пройти ещё раз</span>' : '';
      h += '<button class="room' + (st.clean && ri.done ? ' done' : '') + (r.boss ? ' boss' : '') + (r.k === nextK ? ' cur' : '') + '" data-k="' + r.k + '"><b>' + (r.boss ? 'Босс этажа' : 'Комната ' + (r.k + 1)) + '</b><span>' + esc(r.boss ? 'неувиденные и слабые вопросы всей лекции' : (r.sec ? r.sec.title : '')) + (r.tasks && r.tasks.length ? ' · заданий: ' + r.tasks.length : '') + '</span><div class="stars">' + stars + '</div><span>' + statLine(st) + '</span>' + status + '</button>';
    });
    h += '</div>';
    screenEl.innerHTML = h;
    screenEl.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-k'); go('room', { f: f.n, k: k === 'err' ? 'err' : +k }); }; });
    S.at = { f: f.n, k: nextK < 0 ? 0 : nextK }; D.persist();
  }

  /* ---------- КОМНАТА ---------- */
  var ROSTER = [['slug', 'tzombie', 'mushroom', 'imp'], ['goblin', 'skelet', 'eye', 'orc'], ['skeleton', 'shaman', 'masked', 'necro', 'goblin'], ['chort', 'wogol', 'swampy', 'eye', 'skeleton']];
  var BOSS = ['ogre', 'bzombie', 'demon'], GUARD = 'masked';
  function rnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
  function tierOf(f) { return f.n <= 3 ? 0 : f.n <= 6 ? 1 : f.n <= 10 ? 2 : 3; }
  /* порядок вопросов: ошибки, у которых подошла очередь → новые → остальные ошибки → слабые → крепкие */
  function orderIds(ids) {
    function rank(id) { var r = D.save.srs[id]; if (!r) return 1; if (D.isBad(id)) return r.due <= S.ticks ? 0 : 2; return 3 + r.l; }
    return ids.slice().sort(function (a, b) { return rank(a) - rank(b); });
  }
  function qi(id) { return { t: 'q', id: id }; }
  /* что спросят в комнате: обычная — ВСЕ её вопросы и задания; босс — 10+ самых нужных вопросов лекции; зал ошибок — ошибки лекции */
  function roomItems(f, room, isErr) {
    if (isErr) return orderIds(D.badIds(f)).slice(0, 12).map(qi);
    if (room.boss) return orderIds(poolIds(f)).slice(0, 10 + tierOf(f)).map(qi);
    return orderIds(room.qs).map(qi).concat((room.tasks || []).map(function (id) { return { t: 't', id: id }; }));
  }
  function mkMon(key, items, extra) { var o = { type: 'mon', key: key, items: items.slice(), hp: items.length, max: items.length }; for (var k in extra || {}) o[k] = extra[k]; return o; }
  /* монстры: сердечек ровно столько, сколько вопросов и заданий; задания — у последнего (сильного) */
  function makeMons(f, items, boss, seed) {
    var r = rnd(seed), ros = ROSTER[tierOf(f)], qs = items.filter(function (x) { return x.t === 'q'; }), ts = items.filter(function (x) { return x.t === 't'; }), out = [];
    if (boss) {
      var cut = Math.min(3, Math.max(0, qs.length - 4));
      if (cut) out.push(mkMon(ros[0], qs.slice(0, cut)));
      out.push(mkMon(BOSS[Math.min(2, Math.floor(f.n / 6))], qs.slice(cut).concat(ts), { strong: true, boss: true }));
      return out.filter(function (m) { return m.hp; });
    }
    var n = Math.max(1, Math.min(5, Math.ceil(items.length / 4)));
    for (var i = 0; i < n; i++) {
      var part = qs.slice(Math.floor(i * qs.length / n), Math.floor((i + 1) * qs.length / n)); if (i === n - 1) part = part.concat(ts);
      var key = ros[Math.floor(r() * ros.length)];
      out.push(mkMon(key, part, { strong: !!A.MON[key].lm && (part.length >= 4 || (i === n - 1 && ts.length > 0)) }));
    }
    return out.filter(function (m) { return m.hp; });
  }
  function placeObjs(objs) { var x0 = objs[0].type === 'altar' ? 104 : 140, span = 448 - x0; objs.forEach(function (o, i) { o.x = o.type === 'exit' ? 448 : Math.round(x0 + i * span / Math.max(1, objs.length - 1) * 0.94); o.state = 'idle'; o.st = now(); }); return objs; }
  function buildRoom(f, k, mode, items) {
    var objs = [], isErr = k === 'err', room = isErr ? null : f.rooms[k], info = isErr ? {} : roomInfo(f, k);
    if (room && !room.boss && room.secs && room.secs.length) objs.push({ type: 'altar' });
    if (mode !== 'clean') objs = objs.concat(makeMons(f, items, room && room.boss, f.n * 131 + (isErr ? 97 : k) * 17 + S.ticks));
    if (room && !room.boss) objs.push({ type: 'chest' });
    objs.push({ type: 'exit' });
    placeObjs(objs);
    if (info.chest) objs.forEach(function (o) { if (o.type === 'chest') o.open = true; });
    if (info.altar) objs.forEach(function (o) { if (o.type === 'altar') o.used = true; });
    return objs;
  }
  function errRoom(f) { return { k: 'err', errHall: true, boss: false, sec: null, secs: f.texts, tasks: [], qs: D.badIds(f) }; }
  function enterRoom(a) {
    var f = D.floors[a.f - 1], isErr = a.k === 'err', room = isErr ? errRoom(f) : f.rooms[a.k];
    show(true); where((f.final ? 'Финал' : 'Этаж ' + f.n) + ' · ' + (isErr ? 'Зал ошибок' : room.boss ? 'Босс' : 'Комната ' + (a.k + 1)));
    if (!isErr) { S.at = { f: f.n, k: a.k }; D.persist(); }
    var info = isErr ? { done: false } : roomInfo(f, a.k), st = D.stats(room.qs);
    var mode = isErr ? 'err' : (a.again || !info.done || !st.clean) ? 'run' : 'clean';
    var items = mode === 'clean' ? [] : roomItems(f, room, isErr);
    G.room = { floor: f.n, f: f, k: a.k, room: room, mode: mode, items: items, objs: buildRoom(f, a.k, mode, items), idx: -1, combo: 1, recent: [], turns: 0, right: 0, wrong: 0, iq: 0, briefOpen: false, mon: null, m0: D.mastery(room.qs), mistakes: [], problems: [], fixed: 0, st0: st };
    G.hero.x = 36; G.hero.dir = 1;
    roomIdle();
    var nq = items.filter(function (x) { return x.t === 'q'; }).length, nt = items.length - nq;
    var msg = mode === 'clean' ? 'Комната чиста ✓: все вопросы увидены, ошибок нет. Монстров нет — но можно пройти её ещё раз для закрепления.'
      : mode === 'err' ? 'Зал ошибок: здесь только твои ошибки этой лекции (' + nq + '). Исправь их — и зал запрётся.'
      : room.boss ? 'Босс спросит ' + nq + ' ' + plural(nq, 'вопрос', 'вопроса', 'вопросов') + ' всей лекции — сначала те, что ты ещё не видел, и слабые.'
      : 'В комнате ' + nq + ' ' + plural(nq, 'вопрос', 'вопроса', 'вопросов') + (nt ? ' и ' + nt + ' ' + plural(nt, 'задание', 'задания', 'заданий') : '') + ' — у монстров ровно столько сердечек. Ошибки и ответы с подсказкой заберёт страж у выхода.';
    panel.insertAdjacentHTML('afterbegin', '<div class="wave-msg' + (mode === 'clean' ? ' ok' : '') + '">' + esc(msg) + '</div>' + tipHtml('room'));
  }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  function nextObj() { var R = G.room; for (var i = 0; i < R.objs.length; i++) { var o = R.objs[i]; if ((o.type === 'mon' && !o.dead) || (o.type === 'chest' && !o.open) || (o.type === 'altar' && !o.used) || o.type === 'exit') return i; } return R.objs.length - 1; }
  function monName(o) { return o.guard ? 'Страж выхода' : A.MON[o.key].name; }
  /* страж: появляется, когда все монстры повержены, если были ошибки или подсказки */
  function maybeGuard() {
    var R = G.room; if (!R || !R.problems.length) return null;
    if (R.objs.some(function (o) { return o.type === 'mon' && !o.dead; })) return null;
    var g = mkMon(GUARD, R.problems, { guard: true, strong: true }); R.problems = [];
    var ei = R.objs.length - 1, prev = R.objs[ei - 1];
    g.x = prev ? Math.round((prev.x + 448) / 2) + 2 : 400; g.state = 'idle'; g.st = now();
    R.objs.splice(ei, 0, g); roomLabels();
    return g;
  }
  function goNext() {
    var R = G.room; R.mon = null; G.buttons = [];
    var g = maybeGuard(); roomLabels();
    if (g) {
      focusOn(false); sfx('guard');
      setPanel('<div class="row"><span class="tag gold">Страж выхода</span><span class="tag">' + g.hp + ' ♥</span></div><div class="qtext">У выхода стоит страж</div><p class="msg">Он не выпустит, пока ты сам, без подсказок, не ответишь на вопросы, где ошибся или брал подсказку: <b>' + g.hp + '</b>. Только эти вопросы — других он не спрашивает. Ошибёшься — вопрос вернётся в конец очереди.</p>',
        [btn('К стражу', 'primary', 'Enter', function () { approach(nextObj()); })]);
      return;
    }
    approach(nextObj());
  }
  function roomSummary() {
    var R = G.room, mons = R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).length, chest = R.objs.some(function (o) { return o.type === 'chest' && !o.open; });
    var altar = R.objs.some(function (o) { return o.type === 'altar' && !o.used; });
    return 'В комнате: ' + (altar ? 'алтарь знаний · ' : '') + (mons ? mons + ' ' + (mons === 1 ? 'монстр' : mons < 5 ? 'монстра' : 'монстров') : 'монстров нет') + (chest ? ' · сундук' : '') + ' · выход';
  }
  function monTop(o) { return A.FLOOR_Y + 8 - A.monHeight(o.key) - (A.MON[o.key].fly ? 40 : 6); }
  function roomLabels() { var R = G.room; if (!R) return; labels(R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).map(function (o) { return { text: monName(o), x: o.x, y: monTop(o) - 14, color: o.boss || o.guard ? '#F09595' : o.strong ? '#FAC775' : '#e8e4f8' }; }).concat(R.objs.filter(function (o) { return o.type === 'chest' && !o.open; }).map(function (o) { return { text: 'Сундук', x: o.x, y: A.FLOOR_Y - 36, color: '#FAC775' }; })).concat(R.objs.filter(function (o) { return o.type === 'altar' && !o.used; }).map(function (o) { return { text: 'Алтарь знаний', x: o.x, y: A.FLOOR_Y - 70, color: '#CECBF6' }; }))); }
  function roomIdle() {
    focusOn(false); maybeGuard(); roomLabels();
    var R = G.room, i = nextObj(), o = R.objs[i];
    var what = o.type === 'mon' ? (o.boss ? 'босс «' + monName(o) + '»' : o.guard ? 'страж выхода (' + o.hp + ' ♥ — твои ошибки и подсказки)' : monName(o) + ' (' + o.hp + ' ♥)') : o.type === 'chest' ? 'сундук' : o.type === 'altar' ? 'алтарь знаний (прочитать раздел лекции)' : 'выход';
    var sec = R.room.sec;
    var st = D.stats(R.room.qs), nm = R.room.errHall ? 'Зал ошибок' : R.room.boss ? 'Босс этажа' : 'Комната ' + (R.k + 1);
    var bs = [btn('Идти дальше', 'primary', 'Enter', function () { approach(i); })];
    if (R.mode === 'clean' && o.type === 'exit') bs.push(btn('Пройти ещё раз', 'ghost', null, function () { go('room', { f: R.f.n, k: R.k, again: 1 }); }));
    setPanel('<div class="row"><span class="tag">' + esc(nm) + '</span>' + (sec ? '<span class="tag teal">' + esc(sec.title) + '</span>' : '') + (st.clean ? '<span class="tag gold">чисто ✓</span>' : '') + '</div><p class="msg">' + esc(roomSummary()) + '. Дальше — ' + esc(what) + '.</p><p class="hint">Вопросы ' + (R.room.errHall ? 'зала' : 'комнаты') + ': ' + statLine(st) + '</p>', bs);
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

  /* --- «Кратко из лекции»: именно тот кусок лекции, который нужен для этого вопроса или задания --- */
  function blockText(b) { return b.t === 'code' || b.t === 'out' ? b.text : b.items ? b.items.join(' ') : b.rows ? b.rows.map(function (r) { return r.join(' '); }).join(' ') : (b.html || ''); }
  function briefHtml(matchText) {
    var R = G.room, qt = D.toks(matchText), mine = R.room.secs || [], bs = 0, bi = -1, bsec = null;
    R.f.texts.forEach(function (s) {
      var bonus = mine.indexOf(s) >= 0 ? 0.6 : 0;
      (s.blocks || []).forEach(function (b, i) {
        if (b.t === 'h') return;
        if (!b._tok) b._tok = D.toks(blockText(b));
        var sc = D.overlap(qt, b._tok); if (sc <= 0) return; sc += bonus;
        if (sc > bs) { bs = sc; bi = i; bsec = s; }
      });
    });
    R.briefSec = bsec || R.room.sec;
    if (!bsec || bs < 1.6) return '';
    var bl = bsec.blocks, pick = [bl[bi]];
    if (/^(code|out)$/.test(bl[bi].t)) { if (bl[bi - 1] && /^(p|note|ul|ol)$/.test(bl[bi - 1].t)) pick.unshift(bl[bi - 1]); }
    else if (bl[bi + 1] && /^(code|out)$/.test(bl[bi + 1].t)) pick.push(bl[bi + 1]);
    return '<details class="brief"' + (R.briefOpen ? ' open' : '') + '><summary>Кратко из лекции · ' + esc(bsec.title) + '</summary><div class="rich">' + D.blocks(pick) + '</div></details>';
  }
  function wireBrief() { var R = G.room, det = panel.querySelector('details.brief'); if (det) det.ontoggle = function () { R.briefOpen = det.open; }; }
  function ask() {
    var R = G.room, m = R.mon, M = A.MON[m.key], it = m.items[0];
    if (!it) { m.dead = true; m.hp = 0; return goNext(); }
    R.monTurn++;
    var isTask = it.t === 't', t = isTask ? R.f.taskById[it.id] : null;
    focusOn(true);
    var head = '<div class="row"><span class="tag ' + (m.boss || m.strong || m.guard ? 'gold' : 'red') + '">' + esc(monName(m)) + (m.boss ? ' · босс' : m.guard ? ' · твои ошибки' : m.strong ? ' · сильный' : '') + '</span><span class="tag teal">' + (isTask ? 'Задание' : 'Тест') + '</span><span class="tag">' + m.hp + ' ♥</span><span class="grow"></span>' + (isTask ? '' : trBtn()) + icoBtns() + '</div>';
    R.assisted = false; R.fiftyUsed = false; R.hinted = false; R.tr = null; R.answered = false;
    if (isTask) return askTask(head, t);
    var q = R.f.byId[it.id]; R.q = q; R.recent.push(q.id); if (R.recent.length > 6) R.recent.shift();
    var right = q.type === 'keyboard' ? q.answer : (q.opts.filter(function (o) { return o.right; })[0] || {}).t;
    var h = head + tipHtml('q') + briefHtml(q.q + ' ' + (right || '')) + '<div class="qtext">' + D.md(q.q) + '</div>';
    if (q.type === 'keyboard') h += '<div class="kb"><input id="kbIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Что выведет программа? Впиши ответ"><button class="btn primary" id="kbGo">Ответить<kbd>Enter</kbd></button></div>';
    else {
      var order = q.opts.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tt = order[i]; order[i] = order[j]; order[j] = tt; }
      R.order = order;
      h += '<div class="opts">' + order.map(function (oi, n) { return '<button class="opt" data-o="' + oi + '"><span class="n">' + (n + 1) + '</span><span>' + D.md(q.opts[oi].t) + '</span></button>'; }).join('') + '</div>';
    }
    h += hotbarHtml() + '<div class="hint">Клавиши: ' + (q.type === 'keyboard' ? 'Enter — ответить' : '1–' + q.opts.length + ' — выбрать ответ') + ' · T — перевести · B — книжка · F — весь экран</div>';
    setPanel(h); wireIco(); wireTr(); wireHotbar(); wireBrief();
    if (S.cfg.autoTr) toggleTr();
    G.buttons = [];
    if (q.type === 'keyboard') { var inp = $('kbIn'); $('kbGo').onclick = function () { answer(norm(inp.value) === norm(q.answer), inp.value); }; inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); $('kbGo').click(); } }; if (matchMedia('(pointer:fine)').matches) setTimeout(function () { inp.focus({ preventScroll: true }); }, 50); }
    else panel.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { var oi = +b.getAttribute('data-o'); answer(!!q.opts[oi].right, oi); }; });
  }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[;.]$/, ''); }
  function askTask(head, t) {
    var R = G.room; R.task = t; R.taskAnswered = false; R.q = null;
    setPanel(head + briefHtml((t.title || '') + ' ' + D.blocks(t.q) + ' ' + D.blocks(t.a)) + '<div class="qtext">Задание' + (t.title ? ': ' + esc(t.title.replace(/\s·\s(лёгкая|средняя|сложная)$/, '')) : '') + '</div><div class="task-box rich">' + D.blocks(t.q) + '</div>' +
      '<div class="sol" id="sol">▸ Показать решение</div><p class="hint">Реши в голове или на бумаге, потом открой решение и честно отметь. «Знал» даёт больше IQ.</p>',
      [btn('Не знал', 'warn', null, function () { taskDone(false); }), btn('Знал', 'primary', null, function () { taskDone(true); })]); wireIco(); wireBrief();
    panel.insertAdjacentHTML('beforeend', hotbarHtml()); wireHotbar();
    $('sol').onclick = function () { var s = $('sol'); if (s.classList.contains('open')) return; s.classList.add('open'); s.innerHTML = '<div class="rich">' + D.blocks(t.a) + '</div>'; };
  }
  function taskDone(ok) {
    var R = G.room; if (R.taskAnswered) return; R.taskAnswered = true; R.answered = true;
    panel.querySelectorAll('[data-b]').forEach(function (b) { b.disabled = true; }); G.buttons = [];
    var s = $('sol'); if (s && !s.classList.contains('open')) s.click();
    panel.insertAdjacentHTML('beforeend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Отлично! Сильный удар.' : 'Не страшно: решение перед тобой, разберись в нём. Это задание спросит страж у выхода.') + '</div>');
    if (!ok) R.mistakes.push({ q: 'Задание: ' + (R.task.title || '').replace(/\s·\s(лёгкая|средняя|сложная)$/, ''), a: 'разбери решение в книжке / в задании' });
    D.record(R.task.id, ok); resolve(ok, 2, 'task');
  }

  function answer(ok, pickedIdx) {
    var R = G.room, q = R.q; if (R.answered) return; R.answered = true; D.record(q.id, ok && !R.assisted);
    if (!ok && !R.mistakes.some(function (x) { return x.md === q.q; })) R.mistakes.push({ q: shortQ(q.q), md: q.q, a: q.type === 'keyboard' ? q.answer : D.strip(D.md((q.opts.filter(function (o) { return o.right; })[0] || {}).t || '')) });
    var later = R.mon.guard ? 'Страж вернёт этот вопрос в конец очереди.' : 'Этот вопрос спросит страж у выхода.';
    if (q.type === 'keyboard') {
      var inp = $('kbIn'); inp.disabled = true; $('kbGo').disabled = true;
      panel.querySelector('.kb').insertAdjacentHTML('afterend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Верно!' + (R.assisted ? ' Но с подсказкой — ' + later : '') : 'Неверно. Правильный ответ: <code>' + esc(q.answer) + '</code>. ' + later) + '</div>');
    } else {
      panel.querySelectorAll('.opt').forEach(function (b) { var oi = +b.getAttribute('data-o'); b.disabled = true; if (q.opts[oi].right) b.classList.add('right'); else if (oi === pickedIdx) b.classList.add('wrong'); });
      panel.querySelector('.opts').insertAdjacentHTML('afterend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Верно! Удар!' + (R.assisted ? ' Но с подсказкой — ' + later : '') : 'Неверно — монстр бьёт тебя. ' + later) + '</div>');
    }
    resolve(ok, 1, 'q');
  }
  /* каждый ответ тратит одно сердечко монстра (один вопрос). Ошибка или подсказка → вопрос уходит стражу.
     У стража сердечко снимает только чистый ответ без подсказки, иначе вопрос встаёт в конец очереди. */
  function resolve(ok, power, kind) {
    var R = G.room, m = R.mon, it = m.items.shift(), clean = ok && !R.assisted; peek();
    R.turns++;
    if (D.touchStreak()) floater('Огонёк +1 день!', 240, 40, '#FF9600');
    if (m.guard) { if (clean) R.fixed++; else m.items.push(it); }
    R.run = clean ? (R.run || 0) + 1 : 0; if (R.run === 5) quest('row5');
    if (ok) { quest('right'); if (kind === 'task') quest('task'); if (clean && R.mode === 'err') quest('fix'); }
    else if (!clean) R.problems.push(it);
    var drop = function () { m.hp = m.items.length; if (!m.hp) { m.dead = true; setMon(m, 'death'); sfx('kill'); if (m.guard) quest('guard'); } };
    if (ok) {
      R.right++;
      var hw = X.hit(power, m), bonus = Math.min(20, Math.max(0, hw.dmg - power) * 2); R.crit = R.combo >= 1.5 && Math.random() < (R.combo - 1);
      if (hw.note) setTimeout(function () { floater(hw.note, m.x, 90, '#FF9600'); }, 260);
      R.combo = Math.min(3, Math.round((R.combo + 0.1) * 10) / 10);
      var gain = Math.round(2 * R.combo) + (kind === 'task' ? 3 : 0) + bonus + (R.crit ? 3 : 0); S.iq += gain; R.iq += gain;
      heroAttack(function () {
        sfx('hit'); var before = m.hp; drop(); if (m.hp && m.hp < before) setMon(m, 'hit');
        if (m.hp < before) floater((R.crit ? 'КРИТ! ' : '') + '−1 ♥', m.x, 120, R.crit ? '#FF9600' : '#FFD25A');
        else floater('с подсказкой — не засчитано', m.x, 120, '#B4B2C4');
        floater('+' + gain + ' IQ', m.x + 20, 150, '#CECBF6');
        if (!m.guard && R.assisted) setTimeout(function () { floater('вопрос → стражу', m.x, 90, '#FAC775'); }, 300);
        D.persist(); hud(); bump();
        afterAnswer(true);
      });
    } else {
      R.wrong++; R.combo = 1;
      setMon(m, 'attack');
      setTimeout(function () {
        sfx('hurt');
        if (S.shieldOn) { S.shieldOn = false; floater('Щит выдержал!', G.hero.x, 110, '#85B7EB'); }
        else { var cost = X.hurtCost(); S.hp = Math.max(0, S.hp - cost); G.hero.hurtAt = now(); floater('−' + cost + ' ♥', G.hero.x, 110, '#F09595'); }
        if (S.hp <= 0 && X.take('feather')) { S.hp = 3; setTimeout(function () { floater('Перо феникса! +3 ♥', G.hero.x, 80, '#FF9600'); }, 400); }
        if (!m.guard) { drop(); floater('вопрос → стражу', m.x, 90, '#FAC775'); }
        D.persist(); hud(); afterAnswer(false);
      }, A.MON[m.key].lm ? 420 : 260);
    }
  }
  function afterAnswer(ok) {
    var R = G.room, m = R.mon;
    if (S.hp <= 0) return setTimeout(defeat, 500);
    var btns = [];
    if (m.dead && m.boss) btns.push(btn('Босс повержен! Открыть железный сундук', 'primary', 'Enter', function () { R.mon = null; bossLoot(); }));
    else if (m.dead && ok && !R.assisted) {
      /* верный ответ добил монстра — сразу идём дальше, без лишнего выбора */
      G.buttons = []; var row0 = document.createElement('p'); row0.className = 'hint'; row0.textContent = monName(m) + ' повержен…'; panel.appendChild(row0);
      setTimeout(function () { if (G.room === R && R.mon === m && !BK && !G.modal) goNext(); else if (G.room === R && R.mon === m) { G.buttons = [btn('Дальше', 'primary', 'Enter', goNext)]; } }, 1000);
      return;
    }
    else if (m.dead) btns.push(btn('Дальше', 'primary', 'Enter', goNext));
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
    o.open = true; o.openAt = now(); R.iq += gain; sfx('chest');
    var info = roomInfo(R.f, R.k); info.chest = true; S.rooms[rkey(R.f, R.k)] = info; D.persist(); hud();
    floater('+' + gain + ' IQ', o.x, 150, '#CECBF6');
    setPanel('<div class="qtext">Сундук открыт!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', goNext), btn('Рюкзак', 'ghost', null, openBag)]);
  }
  function stars(m) { return m >= 85 ? '★★★' : m >= 50 ? '★★☆' : m > 0 ? '★☆☆' : '☆☆☆'; }
  function exitRoom() {
    focusOn(false);
    var R = G.room, f = R.f, isErr = R.mode === 'err', boss = R.room.boss, info = isErr ? {} : roomInfo(f, R.k), first = !isErr && !info.done;
    if (!isErr) { info.done = true; S.rooms[rkey(f, R.k)] = info; }
    if (isErr) R.room.qs = D.badIds(f);
    var st = D.stats(R.room.qs);
    if (!isErr) quest('room'); if (st.clean && !R.st0.clean && !isErr) quest('clean'); sfx(st.clean ? 'win' : 'ok');
    var bonus = first ? 10 : st.clean && !R.st0.clean ? 15 : 3; S.iq += bonus; R.iq += bonus; D.persist(); hud();
    var m = D.mastery(R.room.qs), next = isErr || boss ? null : f.rooms[R.k + 1], acc = R.right + R.wrong ? Math.round(R.right / (R.right + R.wrong) * 100) : 100;
    var title = isErr ? (st.bad ? 'Зал ошибок пройден' : 'Все ошибки исправлены! Зал заперт') : st.clean ? (boss ? 'Босс повержен — этаж под контролем!' : 'Комната чиста ✓') : (boss ? 'Босс этажа повержен!' : 'Комната пройдена!');
    var h = '<div class="sum-head"><div><div class="qtext">' + esc(title) + '</div>' + (isErr ? '' : '<div class="sum-stars">' + stars(m) + '</div>') + '</div>' +
      '<div class="sum-cards"><div><b>' + R.right + '</b><span>верно</span></div><div><b>' + R.wrong + '</b><span>ошибок</span></div><div><b>' + acc + '%</b><span>точность</span></div><div class="iq"><b>+' + R.iq + '</b><span>IQ</span></div></div></div>' + (isErr ? '' :
      '<div class="sum-bar"><span>Освоение темы комнаты</span><div class="mbar"><i class="was" style="width:' + R.m0 + '%"></i><i class="now" style="width:' + Math.max(0, m - R.m0) + '%;left:' + R.m0 + '%"></i></div><span>' + R.m0 + '% → <b>' + m + '%</b></span></div>');
    if (R.mistakes.length) {
      h += '<div class="sum-mist"><b>Здесь были ошибки — запомни ответы</b><ul>' + R.mistakes.slice(0, 6).map(function (x) { return '<li><div class="mq">' + (x.md ? D.md(x.md) : esc(x.q)) + '</div><em>Ответ: ' + esc(x.a) + '</em></li>'; }).join('') + '</ul>' + (R.fixed ? '<p class="hint">Страж заставил тебя ответить на них самому — исправлено: ' + R.fixed + '.</p>' : '') + '</div>';
    } else h += '<p class="msg">Ни одной ошибки — отлично!</p>';
    var again = [];
    if (isErr) {
      h += '<p class="wave-msg' + (st.bad ? '' : ' ok') + '">' + (st.bad ? 'В зале ещё ждут ' + st.bad + ' ' + plural(st.bad, 'ошибка', 'ошибки', 'ошибок') + ' — можно зайти ещё раз.' : 'Ошибок этой лекции больше нет.') + '</p>';
      if (st.bad) again.push(btn('Ещё раз в зал ошибок', 'ghost', null, function () { go('room', { f: f.n, k: 'err' }); }));
    } else if (st.clean) {
      h += '<p class="wave-msg ok">Чисто ✓ — все вопросы ' + (boss ? 'лекции' : 'комнаты') + ' увидены, ошибок нет.</p>';
    } else {
      h += '<p class="wave-msg">' + (boss ? 'В лекции' : 'В комнате') + ' ещё остались вопросы, которые тебе пока не попадались' + (st.unseen ? ' (' + st.unseen + ')' : '') + (st.bad ? (st.unseen ? ' и ' : ' — ') + st.bad + ' к повтору' : '') + '. Пройди ' + (boss ? 'босса' : 'комнату') + ' ещё раз, чтобы закрыть тему целиком — или иди дальше и вернись потом.</p>';
      again.push(btn('Ещё раз здесь', 'ghost', null, function () { go('room', { f: f.n, k: R.k, again: 1 }); }));
    }
    var fst = D.stats(poolIds(f)); if (fst.clean) h += '<p class="wave-msg ok">🏅 Этаж ' + f.n + ' пройден начисто!</p>';
    var main = next ? btn(st.clean ? 'Следующая комната' : 'Пропустить → следующая комната', 'primary', 'Enter', function () { go('room', { f: f.n, k: R.k + 1 }); })
      : isErr ? btn('Дальше', 'primary', 'Enter', function () { go('floor', f.n); })
      : btn(f.n < D.floors.length ? 'На следующий этаж' : 'К пути', 'primary', 'Enter', function () { if (f.n < D.floors.length) go('floor', f.n + 1); else go('path'); });
    /* если остались вопросы — «ещё раз» стоит первой: так тема закроется целиком */
    if (again.length) { again[0].cls = 'primary'; again[0].key = 'Enter'; main.cls = 'ghost'; main.key = null; }
    setPanel(h, again.length ? [again[0], main] : [main]);
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
          if (!o.used) { quest('book'); o.used = true; var info = roomInfo(R.f, R.k); info.altar = true; S.rooms[rkey(R.f, R.k)] = info; S.iq += 5; R.iq += 5; var healed = S.hp < S.maxHp; if (healed) S.hp++; D.persist(); hud();
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
      '<div class="set-row"><div><b>Звуки</b><span>Удар, ошибка, сундук, победа.</span></div><label class="sw"><input type="checkbox" id="setSound"' + (c2.sound !== false ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Куда пойти</b><span>Выйти из комнаты или вернуться к выбору подземелья.</span></div><div class="row">' + (G.scene === 'room' ?'<button class="btn ghost" id="setFloor">К этажу</button>' : '') + '<button class="btn ghost" id="setPath">Путь C++</button><button class="btn ghost" id="setHall">Холл</button><a class="btn ghost" href="../index.html#/tester">В StudyPlay</a></div></div>' +
      '<div class="set-row"><div><b>Обучение</b><span>Снова показать подсказки для новичка.</span></div><button class="btn ghost" id="setTut">Показать снова</button></div>' +
      '<div class="set-row"><div><b>Сбросить прогресс</b><span>Удалит освоение, IQ, предметы и огонёк на этом устройстве.</span></div><button class="btn warn" id="setReset">Сбросить</button></div>' +
      '<p class="hint">Графика: «Monsters Creatures Fantasy» (Luiz Melo) и «DungeonTileset II» (0x72) — CC0. Герой, факелы и сцены нарисованы для StudyPlay.</p></div>';
    modal(h, function (el) {
      el.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { c2.trLang = b.getAttribute('data-lang'); D.persist(); openSettings(); }; });
      $('setAuto').onchange = function () { c2.autoTr = this.checked; D.persist(); };
      $('setFocus').onchange = function () { S.focus = this.checked; D.persist(); };
      $('setSound').onchange = function () { c2.sound = this.checked; D.persist(); if (this.checked) sfx('ok'); };
      $('setTut').onclick = function () { S.tips = {}; D.persist(); this.textContent = 'Готово ✓'; };
      var fl = G.room ? G.room.floor : S.at && S.at.f;
      if ($('setFloor')) $('setFloor').onclick = function () { closeModal(); go('floor', fl); };
      $('setPath').onclick = function () { closeModal(); go('path'); };
      $('setHall').onclick = function () { closeModal(); go('hall'); };
      $('setReset').onclick = function () { if (this.dataset.sure) { localStorage.removeItem('sp-dungeon-v1'); location.reload(); } else { this.dataset.sure = 1; this.textContent = 'Точно? Нажми ещё раз'; } };
    });
  }
  $('hudBag').onclick = openBag; $('hudSet').onclick = openSettings;

  /* =====================================================================
     ЭТАП 4: звуки, задания дня, обучение
     ===================================================================== */
  /* --- звуки: короткие синтезированные эффекты (Web Audio, без файлов) --- */
  var AC = null;
  var SFX = {
    ok: [[660, 0, 0.08, 'square'], [990, 0.07, 0.1, 'square']],
    hit: [[220, 0, 0.06, 'sawtooth'], [140, 0.04, 0.08, 'square']],
    hurt: [[180, 0, 0.12, 'sawtooth'], [110, 0.1, 0.16, 'sawtooth']],
    kill: [[392, 0, 0.08, 'square'], [523, 0.08, 0.08, 'square'], [784, 0.16, 0.14, 'square']],
    chest: [[880, 0, 0.06, 'triangle'], [1175, 0.06, 0.06, 'triangle'], [1568, 0.12, 0.12, 'triangle']],
    guard: [[110, 0, 0.25, 'sawtooth'], [98, 0.2, 0.3, 'sawtooth']],
    win: [[523, 0, 0.1, 'square'], [659, 0.1, 0.1, 'square'], [784, 0.2, 0.1, 'square'], [1047, 0.3, 0.25, 'square']],
    quest: [[784, 0, 0.08, 'triangle'], [1047, 0.08, 0.16, 'triangle']]
  };
  function sfx(name) {
    if (S.cfg && S.cfg.sound === false) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      (SFX[name] || []).forEach(function (n) {
        var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + n[1];
        o.type = n[3]; o.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + n[2] + 0.02);
      });
    } catch (e) { /* звук недоступен — играем без него */ }
  }

  /* --- задания дня: 3 задания, новые каждый день --- */
  var QUESTS = [
    { k: 'right', goal: 15, t: 'Ответь верно на 15 вопросов' },
    { k: 'right', goal: 30, t: 'Ответь верно на 30 вопросов' },
    { k: 'room', goal: 2, t: 'Пройди 2 комнаты до выхода' },
    { k: 'clean', goal: 1, t: 'Сделай комнату «чисто ✓»' },
    { k: 'guard', goal: 1, t: 'Победи стража выхода' },
    { k: 'row5', goal: 1, t: '5 верных ответов подряд — без ошибок и подсказок' },
    { k: 'task', goal: 1, t: 'Реши задание и отметь «Знал»' },
    { k: 'fix', goal: 3, t: 'Исправь 3 ошибки в зале ошибок' },
    { k: 'book', goal: 1, t: 'Прочитай раздел на алтаре знаний' }
  ];
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function daily() {
    var day = today();
    if (!S.daily || S.daily.day !== day) {
      var r = rnd(day.split('-').reduce(function (a, x) { return a * 37 + (+x); }, 7) % 2147483647), used = {}, list = [];
      while (list.length < 3) { var i = Math.floor(r() * QUESTS.length), q = QUESTS[i]; if (used[q.k]) continue; used[q.k] = 1; list.push({ i: i, n: 0, done: false }); }
      S.daily = { day: day, list: list, bonus: false }; D.persist();
    }
    return S.daily;
  }
  function quest(k, amount) {
    var dl = daily(), changed = false;
    dl.list.forEach(function (it) {
      var q = QUESTS[it.i]; if (q.k !== k || it.done) return;
      it.n = Math.min(q.goal, it.n + (amount || 1)); changed = true;
      if (it.n >= q.goal) { it.done = true; S.iq += 20; floater('Задание дня! +20 IQ', 240, 54, '#9FE1CB'); sfx('quest'); }
    });
    if (!dl.bonus && dl.list.every(function (it) { return it.done; })) {
      dl.bonus = true; var gift = ['potion', 'fifty', 'bulb', 'shield'][Math.floor(Math.random() * 4)]; X.add(gift); S.iq += 30;
      setTimeout(function () { floater('Все задания дня! +30 IQ и ' + X.ITEMS[gift].name, 240, 40, '#FAC775'); }, 700);
    }
    if (changed) { D.persist(); hud(); }
  }
  function dailyHtml() {
    var dl = daily();
    return '<div class="daily"><b>Задания дня</b>' + dl.list.map(function (it) { var q = QUESTS[it.i]; return '<div class="dq' + (it.done ? ' done' : '') + '"><span>' + (it.done ? '✓ ' : '') + esc(q.t) + '</span><em>' + it.n + ' / ' + q.goal + '</em><i style="width:' + Math.round(it.n / q.goal * 100) + '%"></i></div>'; }).join('') +
      '<small>' + (dl.bonus ? 'Все выполнены — награда получена. Завтра будут новые.' : 'Каждое: +20 IQ. Все три — ещё +30 IQ и предмет.') + '</small></div>';
  }

  /* --- обучение: подсказки новичку, каждая показывается один раз --- */
  var TIPS = {
    path: 'Это путь курса: каждый круг — этаж, каждый этаж — одна лекция. Начни с этажа 1 и иди по порядку — темы идут как в лекциях.',
    floor: 'На этаже — комнаты по разделам лекции. В каждой спросят все её вопросы и задания. Справа — зал ошибок (только твои ошибки этой лекции) и босс (вопросы всей лекции).',
    room: 'Нажимай «Идти дальше» — герой сам подойдёт к алтарю, монстру или сундуку. Алтарь откроет раздел лекции: прочитай его перед боем. Сердечки у монстров = число вопросов.',
    q: 'Под вопросом — «Кратко из лекции»: раскрой, если нужна помощь, там кусок лекции именно к этому вопросу. Ниже — предметы (50/50, лампа и др.), но ответ с ними уйдёт стражу у выхода. Кнопка A→Я переводит вопрос.'
  };
  function tipHtml(k) {
    S.tips = S.tips || {}; if (S.tips[k] || !TIPS[k]) return '';
    S.tips[k] = 1; D.persist();
    return '<div class="tip"><b>Обучение</b><span>' + esc(TIPS[k]) + '</span><button class="btn ghost" onclick="this.parentNode.remove()">Понятно</button></div>';
  }

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
    setPanel('<div class="qtext">Железный сундук босса!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', goNext), btn('Рюкзак', 'ghost', null, openBag)]);
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
  window.DGame = { G: G, next: function () { goNext(); }, skip: function () { var h = G.hero; if (h.target != null) { h.x = h.target; h.target = null; var cb = h.onArrive; h.onArrive = null; if (cb) cb(); } } };

  /* ---------- старт ---------- */
  Promise.all([A.load(), D.load()]).then(function () {
    $('loading').classList.add('gone');
    requestAnimationFrame(loop);
    go('house');
  }).catch(function (e) {
    $('loading').innerHTML = '<div style="max-width:420px;text-align:center">Не удалось загрузить подземелье. Проверь интернет и обнови страницу.<br><small>' + esc(e.message || e) + '</small></div>';
  });
})();

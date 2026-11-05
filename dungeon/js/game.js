/* =====================================================================
   ИГРА: сцены (домик → холл → путь → тема/этаж → комната), ходьба,
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
    $('hud').hidden = false; updBack();
    var h = '';
    for (var i = 0; i < S.maxHp; i++) h += '<i style="background-image:url(' + (i < S.hp ? A.heartUrl.ui_heart_full : A.heartUrl.ui_heart_empty) + ')"></i>';
    $('hudHearts').innerHTML = h;
    $('hudIq').textContent = S.iq;
    var r = G.room;
    $('hudCombo').hidden = true; $('hudIq').parentNode.hidden = !!r;   /* в бою — только сердечки и уровень; IQ и комбо всплывают цифрами */
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
    if (scene !== 'exam' && G.exTimer) { clearInterval(G.exTimer); G.exTimer = null; }
    G.scene = scene; labels([]); G.hero.onArrive = null; G.hero.target = null;
    clearTimeout(G.idleT); document.querySelectorAll('.door-hint').forEach(function (e) { e.remove(); });
    if (scene !== 'room') G.room = null;
    G.intruder = null;
    clearTimeout(G.watchT); $('app').classList.remove('watch'); hideBubble();
    ({ house: enterHouse, subject: enterSubject, exam: enterExam, hall: enterHall, path: enterPath, floor: enterFloor, room: enterRoom })[scene](arg);
    hud(); window.scrollTo(0, 0);
  }
  /* «Тема 3» у предметов по силлабусу, «Этаж 3» у C++ */
  function fname(f) { return f.rep || f.drill || f.arena ? f.title : f.lab ? 'Лабы: EWB' : f.syll ? 'Тема ' + f.n : f.final ? 'Финальный этаж' : 'Этаж ' + f.n; }
  /* тема по номеру (у лаб EWB номер 16, поэтому не по индексу) */
  function floorBy(n) { if (n === 'arena' && G.arena) return G.arena; if (n === 'rep' && G.rep) return G.rep; if (n === 'exam' && G.exf) return G.exf; return D.floors.filter(function (f) { return f.n === +n; })[0] || D.floors[0]; }
  /* ---------- ПЕЩЕРА ТЕМЫ («Тропа знаний») ----------
     Тема = пещера вниз: комнаты по порядку, внизу босс. Комнату не выбираешь — входишь в ту, где остановился.
     Все вопросы темы при каждом проходе случайно раскиданы по комнатам (за проход попадутся все).
     Пройденные комнаты горят золотом; можно вернуться в любую открытую; «Возродить монстров» — проход заново
     (тогда монстры спрашивают и «наоборот»). Состояние прохода: S.runs[f.id]. */
  function caveOn(f) { return !!f && !f.drill && !f.rep && !f.exam && !f.arena && typeof f.n === 'number'; }
  function caveN(f) { return f.rooms.filter(function (r) { return !r.boss; }).length; }
  function caveRun(f, reset) {
    S.runs = S.runs || {};
    var run = S.runs[f.id], ids = poolIds(f);
    if (!run || reset || run.size !== ids.length) {
      var order = ids.slice(); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      run = S.runs[f.id] = { order: order, size: ids.length, at: 0, cleared: [], seed: Math.floor(Math.random() * 1e6), revived: run ? (run.revived || 0) + (reset ? 1 : 0) : 0 };
      G.cavePrev = {}; D.persist();
    }
    return run;
  }
  function runQs(f, k) { var run = caveRun(f), n = caveN(f), L = run.order.length; return run.order.slice(Math.floor(k * L / n), Math.floor((k + 1) * L / n)); }
  function caveOpen(f, k) { var run = caveRun(f); return k <= run.at || run.cleared[k] || (k > 0 && run.cleared[k - 1]); }
  /* какие монстры сидят в комнате (для картинки пещеры) — тот же расчёт, что при входе в комнату */
  function cavePreview(f, k) {
    var run = caveRun(f), key = f.id + ':' + run.seed + ':' + k; G.cavePrev = G.cavePrev || {};
    if (!G.cavePrev[key]) {
      var boss = k >= caveN(f), items = boss ? orderIds(poolIds(f)).slice(0, 10 + tierOf(f)).map(qi) : runQs(f, k).map(qi);
      G.cavePrev[key] = makeMons(f, items, boss, run.seed + k * 17).map(function (m) { return m.key; });
    }
    return G.cavePrev[key];
  }
  /* рисунок пещеры: комнаты-диорамы зигзагом вниз, монстры в каждой, внизу логово босса в лаве */
  function drawCave(c, W, H, f, t, hero) {
    /* комнаты идут зигзагом в две колонки и по высоте заходят друг на друга — так они крупнее и монстров видно */
    var run = caveRun(f), n = caveN(f), top = 26, bossH = Math.min(64, H * 0.22), step = (H - top - bossH - 14) / Math.max(1, n - 1 + 1.75), roomH = Math.min(step * 1.75, 70), rowH = step, bw = W * 0.45, rects = [];
    c.fillStyle = '#100c16'; c.fillRect(0, 0, W, H);
    var th = A.THEMES[themeOf(f)] || {};
    c.fillStyle = '#FAC775'; c.font = 'bold 11px system-ui, sans-serif'; c.textBaseline = 'middle';
    c.fillText(fname(f) + ' · ' + (th.name || ''), 10, 13);
    c.textAlign = 'right'; c.fillText(run.cleared[n] ? 'тема пройдена ✓' : 'до босса: ' + Math.max(0, n - run.cleared.slice(0, n).filter(Boolean).length) + ' ' + plural(Math.max(0, n - run.cleared.slice(0, n).filter(Boolean).length), 'комната', 'комнаты', 'комнат'), W - 10, 13); c.textAlign = 'left';
    for (var k = 0; k <= n; k++) {
      var boss = k === n, x = boss ? W * 0.06 : (k % 2 ? W * 0.51 : W * 0.04), y = boss ? H - bossH - 6 : top + k * rowH, w = boss ? W * 0.88 : bw, h = boss ? bossH : roomH;
      rects.push({ k: k, x: x, y: y, w: w, h: h });
    }
    /* коридоры */
    c.strokeStyle = '#2e2638'; c.lineWidth = 6;
    for (var k2 = 0; k2 < n; k2++) { var a = rects[k2], b = rects[k2 + 1]; c.beginPath(); c.moveTo(a.x + a.w / 2, a.y + a.h); c.lineTo(b.x + b.w / 2, b.y); c.stroke(); }
    rects.forEach(function (r) {
      var boss = r.k === n, done = !!run.cleared[r.k], cur = hero && hero.k === r.k, open = caveOpen(f, r.k);
      /* комната: кирпичная стена, пол, факелы */
      c.fillStyle = boss ? '#2a0a10' : '#2a2236'; c.fillRect(r.x, r.y, r.w, r.h);
      if (!boss) { c.fillStyle = '#3a3048'; for (var by = r.y + 2; by < r.y + r.h - 7; by += 6) for (var bx = r.x + ((by - r.y) % 12 ? 0 : 6); bx < r.x + r.w - 4; bx += 12) c.fillRect(bx, by, 10, 4); }
      c.fillStyle = boss ? '#3a1014' : '#4a3d32'; c.fillRect(r.x, r.y + r.h - 6, r.w, 6);
      if (boss) { var la = 0.6 + 0.3 * Math.sin(t / 250); c.fillStyle = 'rgba(255,90,26,' + la.toFixed(2) + ')'; c.fillRect(r.x, r.y + r.h - 5, r.w, 5); }
      if (!boss) { var fa = 0.7 + 0.3 * Math.sin(t / 180 + r.k); c.fillStyle = 'rgba(255,184,74,' + (done ? fa : 0.35).toFixed(2) + ')'; c.fillRect(r.x + 4, r.y + 3, 3, 5); c.fillRect(r.x + r.w - 7, r.y + 3, 3, 5); }
      /* монстры этой комнаты */
      var keys = cavePreview(f, r.k), mh = boss ? r.h * 0.95 : r.h * 0.62, step = (r.w - 16) / Math.max(1, keys.length);
      keys.forEach(function (key, i) {
        var M = A.MON[key]; if (!M) return;
        var big = mh / Math.max(8, A.monHeight(key) * (M.boss ? 1 : 1)), mx = boss ? r.x + r.w * 0.62 + (i - keys.length + 1) * 24 : r.x + 12 + step * (i + 0.5) + (cur ? 10 : 0), my = r.y + r.h - 4;
        A.drawMonster(c, key, 'idle', t + i * 200, mx, my, done ? 0.3 : open || boss ? 1 : 0.8, Math.min(1, big));
      });
      if (boss) { c.fillStyle = '#F09595'; c.font = 'bold 10px system-ui, sans-serif'; c.fillText('БОСС: ' + (A.MON[keys[keys.length - 1]] || {}).name, r.x + 8, r.y + 10); }
      /* рамка: пройдено — золото с ✓, ты здесь — бирюза */
      c.lineWidth = 2; c.strokeStyle = done ? '#FAC775' : cur ? '#5DCAA5' : boss ? '#E24B4A' : '#4a3d5c'; c.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      if (done) { c.fillStyle = 'rgba(250,199,117,.14)'; c.fillRect(r.x, r.y, r.w, r.h); c.fillStyle = '#FAC775'; c.font = 'bold 11px system-ui, sans-serif'; c.fillText('✓', r.x + r.w - 14, r.y + 10); }
      if (!open && !boss && !done) { c.fillStyle = 'rgba(8,6,12,.12)'; c.fillRect(r.x, r.y, r.w, r.h); }
    });
    /* герой */
    if (hero) {
      var ra = rects[hero.from != null ? hero.from : hero.k], rb = rects[hero.k], p = hero.p == null ? 1 : hero.p;
      var hx = (ra.x + 16) + ((rb.x + 16) - (ra.x + 16)) * p, hy = (ra.y + ra.h - 4) + ((rb.y + rb.h - 4) - (ra.y + ra.h - 4)) * p;
      A.drawHero(c, p < 1 ? 'walk' : 'idle', Math.floor(t / (p < 1 ? 110 : 450)), hx, hy, Math.max(0.35, (roomH * 0.55) / 42));
    }
    return rects;
  }
  /* переход: на весь экран сцены пещера, герой идёт из комнаты from в комнату to; клик/Enter — пропустить */
  function caveTransition(f, from, to, done, intro) {
    show(true); if (intro) setPanel('<p class="msg">Спускаемся в пещеру… <span class="hint">(нажми, чтобы пропустить)</span></p>');
    var sw = $('sceneWrap'), cv = document.createElement('canvas'), W = 480, H = 270, dur = fast() ? 700 : intro ? 2400 : 1600, t0 = performance.now(), fin = false;
    cv.width = W; cv.height = H; cv.className = 'cave-ov'; sw.appendChild(cv); var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    var end = function () { if (fin) return; fin = true; G.caveSkip = null; cv.classList.add('out'); setTimeout(function () { cv.remove(); }, 250); done(); };
    G.caveSkip = end; cv.onclick = end;
    (function frame(t) {
      if (fin) return;
      var k = Math.min(1, (t - t0) / dur), p = intro ? (k < 0.35 ? 0 : Math.min(1, (k - 0.35) / 0.5)) : Math.min(1, k / 0.8);
      drawCave(c, W, H, f, t, { k: to, from: from, p: p });
      if (k >= 1) return setTimeout(end, 150);
      requestAnimationFrame(frame);
    })(performance.now());
  }
  /* карта пещеры: нажми на открытую комнату — герой пойдёт туда; «Возродить монстров» — проход заново */
  function openCaveMap() {
    var R = G.room, f = R && R.f; if (!f || !caveOn(f)) return;
    var run = caveRun(f);
    var h = '<header class="md-top"><b>🗺 Пещера · ' + esc(fname(f)) + '</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">' +
      '<canvas id="caveMap" width="480" height="300" class="cave-map"></canvas><p class="hint">Нажми на открытую комнату, чтобы перейти. Пройденные горят золотом.</p>' +
      '<div class="row"><button class="btn ghost" data-revive>⟲ Возродить монстров</button><button class="btn primary" data-close>Назад в бой</button></div></div>';
    modal(h, function (el) {
      var cv = el.querySelector('#caveMap'), c = cv.getContext('2d'), rects = [], alive = true; c.imageSmoothingEnabled = false;
      (function frame(t) { if (!alive || !document.body.contains(cv)) return; rects = drawCave(c, 480, 300, f, t, { k: R.k }); requestAnimationFrame(frame); })(performance.now());
      cv.onclick = function (e) {
        var b = cv.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * 480, y = (e.clientY - b.top) / b.height * 300;
        var r = rects.filter(function (q) { return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h; })[0];
        if (!r || r.k === R.k) return; if (!caveOpen(f, r.k)) return toast('Сначала пройди комнаты выше', '#F09595');
        alive = false; closeModal(); caveTransition(f, R.k, r.k, function () { go('room', { f: f.n, k: r.k }); });
      };
      el.querySelector('[data-revive]').onclick = function () { alive = false; closeModal(); reviveCave(f); };
      el.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { alive = false; closeModal(); }; });
    });
  }
  function reviveCave(f) {
    caveRun(f, true); toast('Монстры возродились! Теперь они спрашивают и «наоборот» — закрепляем.', '#FAC775');
    caveTransition(f, 0, 0, function () { go('room', { f: f.n, k: 0 }); }, true);
  }
  /* тема пройдена: праздник и выбор — возродить монстров, следующая тема или карта */
  function caveDone(f) {
    show(false); where(fname(f) + ' · пройдено');
    var st = D.stats(poolIds(f)), m = floorMastery(f), next = D.floors.filter(function (x) { return x.n > f.n; })[0];
    screenEl.innerHTML = '<div class="cave-done"><div class="confetti"></div><h1>🏆 ' + esc(fname(f)) + ' пройдена!</h1><p class="msg">' + esc(f.title) + '</p>' +
      '<p class="msg">Освоено <b>' + m + '%</b> · вопросов увидено ' + st.seen + ' из ' + st.total + (st.bad ? ' · ошибок к повтору: <b class="bad">' + st.bad + '</b>' : '') + '</p>' +
      '<div class="row" style="margin-top:14px">' + (next ? '<button class="btn primary" data-next>▶ ' + esc(fname(next)) + '<kbd>Enter</kbd></button>' : '') +
      '<button class="btn ' + (next ? 'ghost' : 'primary') + '" data-revive>⟲ Возродить монстров (закрепить)</button><button class="btn ghost" data-map>К карте тем</button></div></div>';
    var nb = screenEl.querySelector('[data-next]'); if (nb) nb.onclick = function () { go('floor', next.n); };
    screenEl.querySelector('[data-revive]').onclick = function () { reviveCave(f); };
    screenEl.querySelector('[data-map]').onclick = function () { go('path'); };
    G.buttons = [btn('Дальше', 'primary', 'Enter', next ? function () { go('floor', next.n); } : function () { reviveCave(f); })];
  }
  /* ---------- АРЕНА ПОДГОТОВКИ: без карты и комнат — монстры идут сами, по 10 вопросов ----------
     Вопросы — «зубрёжкой» (как у ИКТ): новые часто, ошибки чаще всего (не сразу), выученные почти не попадаются.
     Набор: предмет и РК1 / РК2 / всё (у ИКТ — уровни). Каждые 10 вопросов — итог и «Ещё 10» (сам через 3 с). */
  function arenaScopes(sj) {
    if (sj.drill) return sj.floors.map(function (f) { return { id: 'lv' + f.n, label: f.title, floors: [f] }; }).concat([{ id: 'exam', label: '🎓 Как на экзамене (40 вопросов, 50 мин)', floors: sj.floors.slice(-1), exam: true }]);
    var by = function (rk) { return sj.floors.filter(function (f) { return rkOf(f) === rk; }); };
    var out = [{ id: 'rk1', label: 'РК1', floors: by(1) }, { id: 'rk2', label: 'РК2', floors: by(2) }].filter(function (x) { return x.floors.length; });
    out.push({ id: 'all', label: 'Всё подряд', floors: sj.floors.slice() });
    out.push({ id: 'exam', label: '🎓 Как на экзамене (40 вопросов, 50 мин)', floors: sj.floors.slice(), exam: true });
    return out;
  }
  function openArena(fixed) {
    var subs = fixed ? [D.SUBJ[fixed]] : subjList(), cur = fixed || D.subjId, last = S.arenaLast || {};
    var h = '<header class="md-top"><b>🌀 Хаос-забег</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">' +
      '<p class="hint">Монстры идут сами, по 10 случайных вопросов. Иногда приходит босс — и злится, если ты слишком хорошо отвечаешь. Новые — часто, ошибки — чаще всего, выученное (3 раза подряд верно) почти не попадается.</p>' +
      '<h4' + (fixed ? ' hidden' : '') + '>Предмет</h4><div class="seg" id="arS"' + (fixed ? ' hidden' : '') + '>' + subs.map(function (sj) { return '<label><input type="radio" name="arS" value="' + sj.id + '"' + (sj.id === (last.s || cur) ? ' checked' : '') + '><span>' + esc(sj.title) + '</span></label>'; }).join('') + '</div>' +
      '<h4>Что учим</h4><div class="seg" id="arC"></div><p class="msg" id="arInfo"></p>' +
      '<div class="row"><button class="btn primary" data-start>Начать<kbd>Enter</kbd></button><button class="btn ghost" data-close>Назад</button></div></div>';
    modal(h, function (el) {
      var val = function (n) { var r = el.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
      var fill = function () {
        var sj = D.SUBJ[val('arS')], sc = arenaScopes(sj), pick = sc.filter(function (x) { return x.id === last.c; })[0] ? last.c : sc[0].id;
        el.querySelector('#arC').innerHTML = sc.map(function (x) { return '<label><input type="radio" name="arC" value="' + x.id + '"' + (x.id === pick ? ' checked' : '') + '><span>' + esc(x.label) + '</span></label>'; }).join('');
        el.querySelectorAll('input[name="arC"]').forEach(function (i) { i.onchange = info; }); info();
      };
      var info = function () {
        var sj = D.SUBJ[val('arS')], x = arenaScopes(sj).filter(function (y) { return y.id === val('arC'); })[0]; if (!x) return;
        var ids = arenaIds(x.floors), l = ids.filter(D.learned).length;
        el.querySelector('#arInfo').innerHTML = 'Вопросов: <b>' + ids.length + '</b> · выучено: <b>' + l + '</b> (' + (ids.length ? Math.round(l / ids.length * 100) : 0) + '%)';
      };
      el.querySelectorAll('input[name="arS"]').forEach(function (i) { i.onchange = fill; }); fill();
      var start = function () { var s = val('arS'), c = val('arC'); closeModal(); S.arenaLast = { s: s, c: c }; D.persist(); if (c === 'exam') { D.useSubject(s); return startExamHall(); } buildArena(s, c); };
      el.querySelector('[data-start]').onclick = start; G.modalEnter = start;
    });
  }
  function arenaIds(floors) { var seen = {}, out = []; floors.forEach(function (f) { f.pool.forEach(function (q) { if (!seen[q.id]) { seen[q.id] = 1; out.push(q.id); } }); }); return out; }
  function buildArena(sid, cid, batch) {
    var sj = D.SUBJ[sid]; D.useSubject(sid);
    var x = arenaScopes(sj).filter(function (y) { return y.id === cid; })[0] || arenaScopes(sj)[0];
    var pool = [], byId = {}, texts = [];
    x.floors.forEach(function (f) { f.pool.forEach(function (q) { if (!byId[q.id]) { byId[q.id] = q; pool.push(q); } }); texts = texts.concat(f.texts); });
    var prev = G.arena && G.arena.subj === sid && G.arena.cid === cid ? G.arena : null;
    G.arena = { n: 'arena', arena: true, cid: cid, id: sid + '-arena-' + cid, label: 'Хаос-забег', title: 'Хаос-забег · ' + sj.short + ' · ' + x.label, texts: texts, pool: pool, byId: byId, tasks: [], taskById: {},
      rooms: [{ k: 0, sec: null, secs: [], boss: false, tasks: [], label: 'Арена', qs: [] }], final: false, subj: sid, syll: !!sj.syll,
      batch: batch != null ? batch : prev ? prev.batch + 1 : 0, l0: prev ? prev.l0 : pool.filter(function (q) { return D.learned(q.id); }).length };
    go('room', { f: 'arena', k: 0, again: 1 });
  }
  function arenaLine(f) { var l = f.pool.filter(function (q) { return D.learned(q.id); }).length; return f.title + ' · выучено ' + l + ' из ' + f.pool.length; }
  /* ---------- ПОВТОРЕНИЕ РК: одна комната из самых слабых вопросов всего РК ----------
     Сначала ошибки, потом едва знакомые, потом ещё не увиденные. Ответы идут в прогресс своих тем. */
  var REP_N = 15;
  function repRank(id) { var r = D.save.srs[id]; if (D.isBad(id)) return 0; if (!r) return 2; return r.l <= 1 ? 1 : 3 + r.l; }
  function repFloors(rk) { return D.floors.filter(function (f) { return !rk || rkOf(f) === rk; }); }
  function repWeak(rk) { return repFloors(rk).reduce(function (n, f) { return n + D.badIds(f).length; }, 0); }
  function buildRep(rk) {
    var fl = repFloors(rk), pool = [], byId = {}, texts = [];
    fl.forEach(function (f) { f.pool.forEach(function (q) { if (!byId[q.id]) { byId[q.id] = q; pool.push(q); } }); texts = texts.concat(f.texts); });
    var ids = pool.map(function (q) { return q.id; }).sort(function (a, b) { return (repRank(a) - repRank(b)) || (Math.random() - 0.5); }).slice(0, REP_N);
    var title = 'Повторение ' + (rk ? 'РК' + rk : 'всех тем');
    G.rep = { n: 'rep', rep: true, rk: rk, id: D.subjId + '-rep' + rk, label: 'Повторение', title: title, texts: texts, pool: pool, byId: byId, tasks: [], taskById: {},
      rooms: [{ k: 0, sec: null, secs: [], boss: false, tasks: [], label: title, qs: ids }], final: false, subj: D.subjId, syll: !!D.subj.syll };
    go('room', { f: 'rep', k: 0, again: 1 });
  }
  function subjTitle() { return D.subj ? D.subj.title : 'C++'; }
  /* ---------- навигация как в играх ----------
     Слева одна кнопка «назад», на ней всегда написано, КУДА она ведёт (в домике — «StudyPlay»).
     Справа «☰» — меню-пауза (и клавиша Esc): продолжить, карта тем, домик, рюкзак, лавка,
     настройки и отдельно — выйти в StudyPlay. */
  var BACK = { house: 'sp', subject: 'house', exam: 'house', hall: 'house', path: 'hall', floor: 'path', room: 'floor' };
  function backLabel(to) { return { sp: 'StudyPlay', house: 'Домик', hall: 'Зал', path: D.subj && D.subj.drill ? 'Уровни' : D.subj && D.subj.syll ? 'Темы' : 'Этажи', floor: 'Комнаты', level: 'Уровень' }[to] || 'Назад'; }
  function updBack() {
    var to = BACK[G.scene], b = $('hudBack'); if (to === 'floor' && G.room && (G.room.f.rep || caveOn(G.room.f))) to = 'path'; if (to === 'floor' && G.room && (G.room.f.exam || G.room.f.arena)) to = 'house'; if (to === 'floor' && G.room && G.room.f.drill) to = 'level';
    $('hudBackT').textContent = backLabel(to);
    b.classList.toggle('exit', to === 'sp');
    b.title = to === 'sp' ? 'Выйти в StudyPlay (прогресс сохранён)' : 'Назад: ' + backLabel(to) + ' (Backspace)';
  }
  function exitToSP() { D.persist(); location.href = '../index.html#/tester'; }
  function goFloorBack() { go('floor', G.room ? G.room.floor : S.at && S.at.f); }
  function confirmBox(title, text, yes, onYes) {
    modal('<header class="md-top"><b>' + esc(title) + '</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body"><p class="msg">' + esc(text) + '</p><div class="row"><button class="btn primary" data-yes>' + esc(yes) + '</button><button class="btn ghost" data-close>Остаться</button></div></div>', function (el) {
      el.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeModal; });
      el.querySelector('[data-yes]').onclick = function () { closeModal(); onYes(); };
      G.modalEnter = function () { closeModal(); onYes(); };
    });
  }
  function goBack() {
    var to = BACK[G.scene];
    if (to === 'sp') return exitToSP();
    if (G.scene === 'exam' && G.exam && !G.exam.done) return confirmBox('Прервать экзамен?', 'Результат не засчитается. Начать заново можно в любой момент.', 'Прервать', function () { go('house'); });
    if (G.scene === 'room' && G.room && G.room.f.exam) return confirmBox('Прервать экзамен?', 'Результат не засчитается. Начать заново можно кнопкой «🎓 Экзамен» в домике.', 'Прервать', function () { G.exam = null; go('house'); });
    if (G.scene === 'room' && G.room && G.room.mon && !G.room.mon.dead) return confirmBox('Выйти из комнаты?', 'Ответы уже сохранены. Комнату можно пройти ещё раз.', 'Выйти', goFloorBack);
    if (to === 'floor' && G.room && G.room.f.arena) go('house'); else if (to === 'floor' && G.room && (G.room.f.rep || caveOn(G.room.f))) go('path'); else if (to === 'floor') goFloorBack(); else if (to) go(to);
  }
  $('hudBack').onclick = goBack;
  function openMenu() {
    var inRoom = G.scene === 'room' && G.room, mapOk = D.subj && G.scene !== 'path', items = [];
    items.push(['play', '▶', 'Продолжить', 'Esc', closeModal]);
    if (inRoom && caveOn(G.room.f)) items.push(['cave', '🗺', 'Карта пещеры', 'перейти в другую комнату, возродить монстров', function () { closeModal(); openCaveMap(); }]);
    if (inRoom) items.push(['room', '↩', 'Выйти из комнаты', 'к комнатам темы', function () { closeModal(); goBack(); }]);
    if (mapOk) items.push(['map', '🗺', D.subj.drill ? 'Уровни ИКТ' : D.subj.syll ? 'Карта тем' : 'Карта этажей', subjTitle(), function () { closeModal(); go('path'); }]);
    if (G.scene !== 'house') items.push(['house', '🏠', 'Домик', 'предметы, экзамен, задания дня', function () { closeModal(); go('house'); }]);
    items.push(['bag', '🎒', 'Рюкзак', 'предметы и оружие', function () { closeModal(); openBag(); }]);
    items.push(['set', '⚙', 'Настройки', 'перевод, звук, крупный вопрос', function () { closeModal(); openSettings(); }]);
    var h = '<header class="md-top"><b>Меню</b><span class="grow"></span><button class="btn ghost" data-close aria-label="Закрыть">✕</button></header><div class="md-body"><div class="menu-list">' +
      items.map(function (it, i) { return '<button class="menu-it' + (i === 0 ? ' first' : '') + '" data-mi="' + i + '"><span class="mi-ic">' + it[1] + '</span><b>' + esc(it[2]) + '</b><span class="mi-sub">' + esc(it[3]) + '</span></button>'; }).join('') +
      '</div><button class="menu-it exit" data-exit><span class="mi-ic">🚪</span><b>Выйти в StudyPlay</b><span class="mi-sub">прогресс сохранён</span></button></div>';
    modal(h, function (el) {
      el.querySelector('.md-wrap').classList.add('menu-md');
      el.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeModal; });
      el.querySelectorAll('[data-mi]').forEach(function (b) { b.onclick = function () { items[+b.getAttribute('data-mi')][4](); }; });
      el.querySelector('[data-exit]').onclick = exitToSP;
      G.menuOpen = true;
    });
  }
  $('hudMenu').onclick = openMenu;
  function btn(label, cls, key, fn) { return { label: label, cls: cls, key: key, fn: fn }; }
  function setPanel(html, buttons) {
    panel.innerHTML = html + (buttons && buttons.length ? '<div class="row" style="margin-top:12px">' + buttons.map(function (b, i) { return '<button class="btn ' + (b.cls || '') + '" data-b="' + i + '">' + esc(b.label) + (b.key ? '<kbd>' + b.key + '</kbd>' : '') + '</button>'; }).join('') + '</div>' : '');
    G.buttons = buttons || [];
    panel.querySelectorAll('[data-b]').forEach(function (el) { el.onclick = function () { G.buttons[+el.getAttribute('data-b')].fn(); }; });
  }
  function walkTo(x, cb) { G.hero.target = x; G.hero.onArrive = cb; }

  /* ---------- ДОМИК ---------- */
  /* предметы на главной: открытые и «скоро» */
  var SOON = [];
  function subjList() { return ['arch', 'phil', 'ict', 'cpp'].filter(function (id) { return D.SUBJ[id]; }).map(function (id) { return D.SUBJ[id]; }); }
  function subjCards() {
    return '<div class="subj-list">' + subjList().map(function (sj) {
      var p = D.progress(D.subjIds(sj));
      return '<button class="subj" data-subj="' + sj.id + '"><b>' + esc(sj.title) + '</b><div class="bar"><i style="width:' + p + '%"></i></div><span>решено хотя бы раз: <b>' + p + '%</b></span></button>';
    }).join('') + SOON.map(function (x) { return '<div class="subj soon"><b>' + esc(x[0]) + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
  }
  function wireSubj(root) { (root || panel).querySelectorAll('[data-subj]').forEach(function (b) { b.onclick = function () { go('subject', b.getAttribute('data-subj')); }; }); }
  /* ДОМИК: всё нажимается прямо на картинке — дверь (в подземелье) и Мудрец (лавка) */
  var SAGE_X = 150;
  /* «▶ Продолжить»: сразу туда, где остановился (предмет · тема · комната) */
  function contBtn() {
    var at = S.at, sj = at && D.SUBJ[at.s || 'cpp'], f = sj && sj.floors.filter(function (x) { return x.n === at.f; })[0];
    if (!f) return null;
    var k = Math.max(0, at.k | 0), where2 = f.drill ? 'тренировка' : f.rooms[k] && f.rooms[k].boss ? 'босс' : 'комната ' + (k + 1);
    return btn('▶ Продолжить: ' + (sj.short || sj.title) + ' · ' + fname(f) + ' · ' + where2, 'primary', 'Enter', function () {
      S.seenIntro = true; D.useSubject(sj.id);
      if (f.drill || !f.rooms[k]) go('floor', f.n); else go('room', { f: f.n, k: k });
    });
  }
  function toDungeon() { S.seenIntro = true; S.mode = null; D.persist(); walkTo(30, function () { go('hall'); }); }
  function enterHouse() {
    show(true); where('Домик героя'); G.hero.x = 240; G.hero.dir = 1;
    var intro = !S.seenIntro;
    labels([{ text: 'Мудрец · лавка', x: SAGE_X, y: 136, color: '#CECBF6' }]);
    setPanel(
      (intro ? '<div class="qtext">Добро пожаловать в Подземелье знаний!</div>' +
        '<p class="msg">Игра для подготовки к РК и экзамену. В комнатах монстры задают вопросы: верно — монстр теряет сердечко, ошибся — бьёт тебя (−1 ♥) и спросит этот вопрос ещё раз. IQ — награда за ответы, на него Мудрец продаёт предметы.</p>'
        : '<div class="qtext">Домик</div><p class="hint">Продолжай с того места, где остановился.</p>') +
        '',
      [contBtn() || btn('▶ Начать', 'primary', 'Enter', toDungeon), btn('🎒 Рюкзак', 'ghost', null, openBag)]);
    clearTimeout(G.idleT); G.idleT = setTimeout(doorHint, 120000);   /* стоишь дома 2 минуты — подсказка про дверь */
    if (S.maxHp > 5) { S.maxHp = 5; S.hp = Math.min(S.hp, 5); }   /* уровней больше нет — 5 сердечек у всех */
    if (S.hp < S.maxHp) { S.hp = S.maxHp; D.persist(); }
    if (!G.intruder) setTimeout(function () { if (G.scene === 'house') maybeIntruder(); }, 1500);
  }
  /* ---------- НЕЗВАНЫЙ ГОСТЬ: изредка из подземелья в домик заходит монстр с 1 ♥ и задаёт один вопрос ----------
     Вопрос — из любого предмета, чаще из тем, которые ты уже начинал. Верно — монстр падает, награда.
     Неверно — он смеётся и убегает обратно (сердечки не тратятся). */
  var INTR_EVERY = 30 * 60000, INTR_CHANCE = 0.2;
  function maybeIntruder() {
    if (G.intruder || Date.now() - (S.intrAt || 0) < INTR_EVERY || Math.random() > INTR_CHANCE) return;
    var floors = [];
    Object.keys(D.SUBJ).forEach(function (s) { D.SUBJ[s].floors.forEach(function (f) { floors.push({ s: s, f: f, touched: f.pool.some(function (q) { return D.seen(q.id); }) }); }); });
    var touched = floors.filter(function (x) { return x.touched; }), from = touched.length && Math.random() < 0.8 ? touched : floors;
    var pickF = from[Math.floor(Math.random() * from.length)], choice = pickF.f.pool.filter(function (q) { return q.type === 'choice' && q.opts.length > 1; });
    if (!choice.length) return;
    var q = choice[Math.floor(Math.random() * choice.length)], ros = ROSTER[0].concat(ROSTER[1]);
    S.intrAt = Date.now(); D.persist();
    G.intruder = { type: 'mon', key: ros[Math.floor(Math.random() * ros.length)], x: 20, target: 200, state: 'idle', st: now(), hp: 1, max: 1, items: [{ t: 'q', id: q.id }], q: q, s: pickF.s, f: pickF.f, dir: -1 };
    sfx('guard');
  }
  function intruderArrived() {
    var I = G.intruder; if (!I || G.scene !== 'house') return;
    var order = I.q.opts.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    bubbleAt('<small class="b-twin">Я из подземелья «' + esc(D.SUBJ[I.s].title) + '»! Ответь — или пожалеешь!</small>' + D.md(I.q.q), I, 'q', true);
    setPanel('<div class="row"><span class="tag red">Незваный гость · ' + esc(A.MON[I.key].name) + '</span><span class="tag">' + esc(D.SUBJ[I.s].title) + ' · ' + esc(fname(I.f)) + '</span></div>' +
      '<div class="opts">' + order.map(function (oi, n) { return '<button class="opt" data-io="' + oi + '"><span class="n">' + (n + 1) + '</span><span>' + D.md(I.q.opts[oi].t) + '</span></button>'; }).join('') + '</div>');
    panel.querySelectorAll('[data-io]').forEach(function (b) { b.onclick = function () { intruderAnswer(+b.getAttribute('data-io')); }; });
  }
  function intruderAnswer(oi) {
    var I = G.intruder; if (!I || I.done) return; I.done = true;
    var ok = !!I.q.opts[oi].right; D.record(I.q.id, ok);
    panel.querySelectorAll('[data-io]').forEach(function (b) { var k = +b.getAttribute('data-io'); b.disabled = true; if (I.q.opts[k].right) b.classList.add('right'); else if (k === oi) b.classList.add('wrong'); });
    var msg;
    if (ok) {
      var gain = 15, gift = Math.random() < 0.35 ? ['potion', 'fifty', 'bulb', 'shield'][Math.floor(Math.random() * 4)] : null;
      S.iq += gain; if (gift) X.add(gift);
      G.hero.attackAt = now(); setTimeout(function () { setMon(I, 'death'); I.dead = true; sfx('kill'); floater('+' + gain + ' IQ', I.x, 120, '#CECBF6'); }, 230);
      bubbleAt('<b>' + esc(line(SAY_DIE, RUDE_DIE)) + '</b>', I, 'say die');
      msg = 'Верно! Гость повержен: +' + gain + ' IQ' + (gift ? ' и ' + X.ITEMS[gift].name : '') + '.';
    } else {
      setMon(I, 'attack'); bubbleAt('<b>' + esc(line(['Ха! Не знаешь!', 'Учи лучше!', 'Хе-хе, мимо!'], RUDE_BAD)) + '</b>', I, 'say bad');
      setTimeout(function () { if (G.intruder === I) { I.target = 8; I.dir = 1; } }, 1200);
      msg = 'Неверно — гость хихикает и убегает в подземелье. Этот вопрос попал в повторение.';
    }
    D.persist(); hud();
    panel.insertAdjacentHTML('beforeend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + esc(msg) + '</div>');
    setTimeout(function () { if (G.intruder === I) { G.intruder = null; hideBubble(); if (G.scene === 'house') enterHouse(); } }, 3200);
  }
  /* подсказка про дверь: показывается, только если стоишь в домике 2 минуты и никуда не идёшь */
  function doorHint() {
    if (G.scene !== 'house' || G.modal) return;
    labels([{ text: 'Мудрец · лавка', x: SAGE_X, y: 136, color: '#CECBF6' }]);
    var el = document.createElement('div'); el.className = 'door-hint'; el.innerHTML = '<span class="dh-arrow">⬅</span> Нажми на дверь — спустишься в подземелье';
    el.style.left = (54 / A.W * 100) + '%'; el.style.top = (150 / A.H * 100) + '%'; $('floaters').appendChild(el);
  }
  /* что можно нажать на сцене (в координатах холста 480×270) */
  function hotspots() {
    if (G.scene === 'house') return [{ x0: 4, x1: 52, y0: 126, y1: 216, fn: toDungeon }, { x0: SAGE_X - 22, x1: SAGE_X + 22, y0: 150, y1: 216, fn: openShop }];
    if (G.scene === 'hall') return DOORS.filter(function (d) { return D.SUBJ[d[0]]; }).map(function (d) {
      var w = d[0] === 'cpp' ? 48 : 39; return { x0: d[1] - w, x1: d[1] + w, y0: A.FLOOR_Y - w * 2 - 8, y1: A.FLOOR_Y + 4, fn: function () { enterDoor(d); } };
    });
    return [];
  }
  function sceneXY(e) { var r = $('scene').getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * A.W, y: (e.clientY - r.top) / r.height * A.H }; }
  function hotAt(e) { var p = sceneXY(e); return hotspots().filter(function (h) { return p.x >= h.x0 && p.x <= h.x1 && p.y >= h.y0 && p.y <= h.y1; })[0]; }
  $('scene').addEventListener('click', function (e) { if (G.modal || BK || G.hero.target != null) return; var h = hotAt(e); if (h) h.fn(); });
  $('scene').addEventListener('mousemove', function (e) { $('scene').style.cursor = hotAt(e) ? 'pointer' : ''; });
  /* ---------- ПРЕДМЕТ: темы силлабуса 1–15 с процентами ---------- */
  function enterSubject(id) {
    D.useSubject(id); show(false); where(subjTitle());
    var sj = D.subj, all = D.subjIds(), p = D.progress(all);
    var topics = sj.topics || sj.floors.map(function (f) { return { n: f.n, title: f.title, file: 1 }; });
    var h = '<div class="path-head"><h1>' + esc(sj.title) + '</h1><span class="tag teal">решено ' + p + '%</span></div>' +
      '<p class="hallnote">Процент темы — сколько её вопросов ты хотя бы раз решил верно (без подсказки). Серые темы ещё без вопросов — они появятся после лекций и лабораторных.</p><div class="topics">';
    topics.forEach(function (t) {
      var f = sj.floors.filter(function (x) { return x.n === t.n; })[0];
      if (!f) { h += '<div class="topic soon"><span class="tn">' + (t.lab ? 'Л' : t.n) + '</span><span class="tt"><b>' + esc(t.title) + '</b><span>скоро</span></span></div>'; return; }
      var tp = D.progress(f.pool.map(function (q) { return q.id; }));
      h += '<button class="topic" data-t="' + f.n + '"><span class="tn">' + (t.lab ? 'Л' : t.n) + '</span><span class="tt"><b>' + esc(t.title) + '</b><div class="bar"><i style="width:' + tp + '%"></i></div><span>' + tp + '% · вопросов: ' + f.pool.length + '</span></span></button>';
    });
    h += '</div><div class="row" style="margin:14px 0"><button class="btn primary" data-go>⚔ В подземелье: ' + esc(sj.short || sj.title) + '</button></div>';
    screenEl.innerHTML = h;
    screenEl.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { go('floor', +b.getAttribute('data-t')); }; });
    screenEl.querySelectorAll('[data-home]').forEach(function (b) { b.onclick = function () { go('house'); }; });
    screenEl.querySelector('[data-go]').onclick = function () { go('path'); };
  }
  /* ---------- РЕЖИМЫ: РК1 / РК2 / все темы; вход сразу в комнату ---------- */
  function rkOf(f) { return f.syll ? f.rk : f.n <= 6 ? 1 : f.n <= 12 ? 2 : 3; }
  function modeRk() { return S.mode && S.mode.s === D.subjId ? S.mode.rk : 0; }
  function modeFloors() { var rk = modeRk(); return D.floors.filter(function (f) { return !rk || rkOf(f) === rk; }); }
  function rangeText(fl) { if (!fl.length) return 'тем пока нет'; var a = fl[0].n, b = fl[fl.length - 1].n, q = fl.reduce(function (s, f) { return s + f.pool.length; }, 0); return (a === b ? 'тема ' + a : 'темы ' + a + '–' + b) + ' · вопросов: ' + q; }
  function openEntry(pre) {
    var subs = subjList(), cur = D.subjId, MODES = [['exam', 'Экзамен']];
    var h = '<header class="md-top"><b>🎓 Экзамен</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">' +
      '<h4>Предмет</h4><div class="seg">' + subs.map(function (sj) { return '<label><input type="radio" name="eS" value="' + sj.id + '"' + (sj.id === cur ? ' checked' : '') + '><span>' + esc(sj.title) + '</span></label>'; }).join('') + '</div>' +
      '<div class="seg" hidden>' + MODES.map(function (m) { return '<label><input type="radio" name="eM" value="' + m[0] + '"' + (m[0] === (pre || 'all') ? ' checked' : '') + '><span>' + m[1] + '</span></label>'; }).join('') + '</div>' +
      '<p class="msg" id="eInfo"></p><div class="row"><button class="btn primary" data-start>Начать экзамен<kbd>Enter</kbd></button><button class="btn ghost" data-close>Назад</button></div></div>';
    modal(h, function (el) {
      var val = function (n) { var r = el.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
      var info = function () {
        var sj = D.SUBJ[val('eS')], m = val('eM'), fl = sj.floors.filter(function (f) { return m === 'all' || m === 'exam' || rkOf(f) === +m; });
        $('eInfo').innerHTML = m === 'exam' ? '<b>' + EXAM_N + ' случайных вопросов</b> из всех тем предмета, таймер <b>' + EXAM_MIN + ' минут</b>. Монстров и стража нет, пояснения — только после финиша.'
          : (m === 'all' ? 'Все темы предмета: ' : 'Только темы ' + (m === '1' ? 'РК1' : 'РК2') + ' по силлабусу: ') + esc(rangeText(fl)) + '. После «Начать» — сразу в следующую непройденную комнату.';
      };
      el.querySelectorAll('input').forEach(function (i) { i.onchange = info; }); info();
      var start = function () {
        var s = val('eS'), m = val('eM'); closeModal(); D.useSubject(s); S.seenIntro = true;
        if (m === 'exam') return startExamHall();
        S.mode = { s: s, rk: m === 'all' ? 0 : +m }; D.persist(); startRun();
      };
      el.querySelector('[data-start]').onclick = start; G.modalEnter = start;
    });
  }
  function startRun() {
    var fl = modeFloors(); if (!fl.length) return go('path');
    for (var i = 0; i < fl.length; i++) { var f = fl[i], k = f.rooms.findIndex(function (r) { return !r.boss && (!roomInfo(f, r.k).done || !D.stats(r.qs).clean); }); if (k >= 0) return go('room', { f: f.n, k: k }); }
    go('path');
  }

  /* ---------- ЭКЗАМЕН: 40 случайных вопросов предмета, 50 минут ---------- */
  var EXAM_N = 40, EXAM_MIN = 50;
  /* ---------- ЭКЗАМЕНАЦИОННЫЙ ЗАЛ: сверхбосс задаёт 40 вопросов, 50 минут ----------
     После ответа сразу видно ✓/✗ и правильный вариант. Сердечки не тратятся, стража нет, подсказок нет.
     В конце — тот же разбор, что у экзамена (процент, оценка, ошибки с пояснениями). */
  function startExamHall() {
    var all = [], seenQ = {};
    (D.subj.drill ? D.floors.slice(-1) : D.floors).forEach(function (f) { f.pool.forEach(function (q) { if (seenQ[q.id]) return; seenQ[q.id] = 1; all.push({ q: q, f: f }); }); });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
    var qs = all.slice(0, EXAM_N), byId = {};
    qs.forEach(function (x) { byId[x.q.id] = x.q; });
    G.exam = { s: D.subjId, qs: qs, i: 0, ans: [], end: Date.now() + EXAM_MIN * 60000, done: false, hall: true };
    G.exf = { n: 'exam', exam: true, id: D.subjId + '-exam', label: 'Экзамен', title: 'Экзамен · ' + subjTitle(), texts: [], pool: qs.map(function (x) { return x.q; }), byId: byId, tasks: [], taskById: {},
      rooms: [{ k: 0, sec: null, secs: [], boss: true, tasks: [], qs: qs.map(function (x) { return x.q.id; }) }], final: false, subj: D.subjId, syll: !!D.subj.syll };
    go('room', { f: 'exam', k: 0, again: 1 });
    if (G.exTimer) clearInterval(G.exTimer);
    G.exTimer = setInterval(function () {
      var E = G.exam; if (!E || E.done || !E.hall) return;
      var left = E.end - Date.now(); where('🎓 Экзамен · осталось ' + mmss(left) + ' · вопрос ' + Math.min(E.qs.length, E.ans.length + 1) + ' из ' + E.qs.length);
      $('hudWhere').classList.toggle('low', left < 5 * 60000);
      if (left <= 0) finishExamHall(true);
    }, 1000);
  }
  function examAnswer(q, ok, picked) {
    var E = G.exam; if (!E || E.done || !E.hall) return;
    var x = E.qs.filter(function (y) { return y.q.id === q.id; })[0];
    E.ans.push({ q: q, f: x ? x.f : null, ok: ok, typed: q.type === 'keyboard' ? picked : null, sel: Array.isArray(picked) ? picked : typeof picked === 'number' ? [picked] : [] }); E.i++;
  }
  function finishExamHall(timeout) {
    var E = G.exam; if (!E || E.done) return;
    $('hudWhere').classList.remove('low');
    finishExam(timeout); go('exam');
  }
  function mmss(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + ('0' + (s % 60)).slice(-2); }
  /* экран «exam» теперь только показывает разбор после Экзаменационного зала */
  function enterExam() {
    show(false); where("Экзамен · " + subjTitle());
    if (!G.exam || G.exam.s !== D.subjId || !G.exam.done) return go("house");
    examResult();
  }
  function finishExam(timeout) {
    var E = G.exam; if (!E || E.done) return; E.done = true; E.timeout = timeout;
    if (G.exTimer) { clearInterval(G.exTimer); G.exTimer = null; }
    var right = E.ans.filter(function (a) { return a.ok; }).length, pct = Math.round(right / E.qs.length * 100);
    E.right = right; E.pct = pct;
    S.exams = S.exams || {}; var prev = S.exams[E.s] || {}; S.exams[E.s] = { pct: pct, at: Date.now(), best: Math.max(pct, prev.best || 0) };
    S.iq += right; D.touchStreak(); D.persist(); hud(); sfx(pct >= 50 ? 'win' : 'ok');
    examResult();
  }
  function ansText(a) { if (a.q.type === 'keyboard') return a.typed ? '<code>' + esc(a.typed) + '</code>' : '—'; return a.sel.length ? a.sel.map(function (oi) { return D.md(a.q.opts[oi].t); }).join(' · ') : '—'; }
  function examResult(review) {
    var E = G.exam, wrong = E.ans.filter(function (a) { return !a.ok; }), skipped = E.qs.length - E.ans.length;
    var grade = E.pct >= 90 ? 'отлично' : E.pct >= 75 ? 'хорошо' : E.pct >= 50 ? 'удовлетворительно' : 'пока не сдано';
    var h = '<div class="path-head"><h1>Экзамен завершён</h1><span class="tag ' + (E.pct >= 50 ? 'teal' : 'red') + '">' + E.pct + '% · ' + grade + '</span></div>' +
      '<div class="sum-cards"><div><b>' + E.right + '</b><span>верно</span></div><div><b>' + wrong.length + '</b><span>ошибок</span></div><div><b>' + skipped + '</b><span>без ответа</span></div><div class="iq"><b>+' + E.right + '</b><span>IQ</span></div></div>' +
      (E.timeout ? '<p class="wave-msg">Время вышло — экзамен завершён автоматически.</p>' : '') +
      '<p class="hallnote">Лучший результат по предмету «' + esc(subjTitle()) + '»: ' + ((S.exams[E.s] || {}).best || E.pct) + '%. Ошибки попали в повторение — монстры спросят их снова.</p>';
    if (wrong.length) {
      h += '<h3>Ошибки (' + wrong.length + ')</h3><div class="ex-list">' + wrong.map(function (a, i) {
        return '<div class="ex-item"><div class="ex-q"><span class="tag">' + esc(fname(a.f)) + '</span> ' + D.md(a.q.q) + '</div><p><b class="bad">Твой ответ:</b> ' + ansText(a) + '</p><p><b>Правильно:</b> ' + rightText(a.q) + '</p>' +
          (review ? (a.q.ex ? '<div class="ex-text">' + exHtml(a.q.ex) + '</div>' : '<p class="hint">Пояснение скоро.</p>') + '<button class="btn ghost" data-gg="' + i + '">🔎 Google</button>' : '') + '</div>';
      }).join('') + '</div>';
    } else h += '<p class="wave-msg ok">Ни одной ошибки!</p>';
    h += '<div class="row" style="margin:14px 0">' + (wrong.length && !review ? '<button class="btn primary" data-rev>📖 Разобрать ошибки</button>' : '') + '<button class="btn ' + (wrong.length && !review ? 'ghost' : 'primary') + '" data-again>Новый экзамен</button><button class="btn ghost" data-home>⌂ Домой</button></div>';
    screenEl.innerHTML = h; window.scrollTo(0, 0);
    G.buttons = wrong.length && !review ? [btn('Разобрать', 'primary', 'Enter', function () { examResult(true); })] : [];
    screenEl.querySelectorAll('[data-home]').forEach(function (b) { b.onclick = function () { go('house'); }; });
    var rv = screenEl.querySelector('[data-rev]'); if (rv) rv.onclick = function () { examResult(true); };
    screenEl.querySelector('[data-again]').onclick = startExamHall;
    screenEl.querySelectorAll('[data-gg]').forEach(function (b) { b.onclick = function () { var a = wrong[+b.getAttribute('data-gg')]; openGoogle(a.q, a.f); }; });
  }

  /* ---------- ХОЛЛ: три двери — Архитектура, C++, Философия ---------- */
  var DOORS = [['arch', 64, 'Архитектура', '#AFA9EC', 'Архитектура ЭВМ'], ['cpp', 184, 'C++', '#9FE1CB', 'C++'], ['phil', 304, 'Философия', '#FAC775', 'Философия'], ['ict', 420, 'ИКТ', '#85B7EB', 'ИКТ']];
  function enterHall() {
    show(true); where('Холл подземелья'); G.hero.x = 240; A.hallGlow = D.subjId;
    var open = DOORS.filter(function (d) { return D.SUBJ[d[0]]; });
    labels(DOORS.map(function (d) { var sj = D.SUBJ[d[0]]; return { text: d[2] + ' · ' + (sj ? D.progress(D.subjIds(sj)) + '%' : 'скоро'), x: d[1], y: d[0] === 'cpp' ? 92 : 112, color: d[3] }; }));
    /* двери нажимаются прямо на картинке; Enter — дверь последнего предмета */
    setPanel('<div class="qtext">Холл</div><p class="hint">Нажми на <b>дверь</b> предмета — герой войдёт в его подземелье. Процент — сколько вопросов ты хотя бы раз решил верно.</p>');
    var last = DOORS.filter(function (d) { return d[0] === D.subjId && D.SUBJ[d[0]]; })[0] || open[0];
    G.buttons = last ? [btn('Войти', 'primary', 'Enter', function () { enterDoor(last); })] : [];
  }
  function enterDoor(d) { D.useSubject(d[0]); A.hallGlow = d[0]; walkTo(d[1], function () { openModes(d[0]); }); }
  /* выбор режима у двери предмета: всегда два варианта */
  function openModes(sid) {
    var sj = D.SUBJ[sid]; D.useSubject(sid);
    var h = '<header class="md-top"><b>' + esc(sj.title) + '</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body"><div class="modes">' +
      '<button class="mode-card" data-mode="trail"><span class="mi">🧭</span><b>Тропа знаний</b><span>Темы по порядку. Каждая тема — пещера вниз: комнаты с монстрами, в самом низу босс. Для того, чтобы учить тему за темой.</span></button>' +
      '<button class="mode-card" data-mode="chaos"><span class="mi">🌀</span><b>Хаос-забег</b><span>Случайные вопросы из разных тем (РК1, РК2 или всё). Выученное почти не попадается, ошибки — чаще. Внутри — и режим «как на экзамене».</span></button>' +
      '</div></div>';
    modal(h, function (el) {
      el.querySelector('.md-wrap') && el.querySelector('.md-wrap').classList.add('menu-md');
      el.querySelector('[data-mode="trail"]').onclick = function () { closeModal(); go('path'); };
      el.querySelector('[data-mode="chaos"]').onclick = function () { closeModal(); openArena(sid); };
      G.modalEnter = function () { closeModal(); go('path'); };
    });
  }

  /* ---------- ПУТЬ C++ (как ветка Duolingo) ---------- */
  var UNITS = [[1, 3, 'Раздел 1 · к РК1', 'Основы: алгоритмы, операции, ветвления'], [4, 6, 'Раздел 2 · к РК1', 'Циклы, массивы, функции, строки'], [7, 9, 'Раздел 3 · к РК2', 'ООП: принципы, классы, среда C++ Builder'], [10, 12, 'Раздел 4 · к РК2', 'Формы, события, иерархия классов'], [13, 15, 'Раздел 5 · к экзамену', 'Конструкторы, свойства, компоненты'], [16, 16, 'Финал', 'Смешанные сложные вопросы по всему курсу']];
  function floorMastery(f) { return D.mastery(f.pool.map(function (q) { return q.id; })); }
  function poolIds(f) { return f.pool.map(function (q) { return q.id; }); }
  function statLine(st) { return 'увидено ' + st.seen + ' / ' + st.total + (st.bad ? ' · <b class="bad">к повтору: ' + st.bad + '</b>' : ''); }
  var UNITS_ARCH = [[1, 5, 'РК1 · темы 1–5', 'Числа в памяти, IEEE 754, логика, Карно, комбинационные схемы'], [6, 8, 'РК2 · темы 6–8', 'Триггеры, счётчики, процессор и система команд'], [16, 16, 'Лабораторные', 'Программа Electronics Workbench (EWB)']];
  function enterPath() {
    var arch = !!D.subj.syll;
    show(false); where('Подземелье · ' + subjTitle());
    var cur = S.at && (S.at.s || 'cpp') === D.subjId ? S.at.f : 1, h = '<div class="path-head"><h1>Подземелье: ' + esc(subjTitle()) + '</h1><span class="tag teal">все ' + (arch ? 'темы' : 'этажи') + ' открыты</span></div><p class="hallnote">' + (D.subj.drill ? 'Дверь = уровень.' : arch ? 'Дверь = тема силлабуса.' : 'Дверь = лекция.') + ' Нажми на дверь, чтобы войти. Полоска — сколько освоено, золотая медаль ✓ — пройдено начисто.</p>';
/* повторение РК: самые слабые вопросы всех тем РК — в одной комнате */    if (!D.subj.drill) h += '<div class="rep-row"><span>🔁 Повторение — ' + REP_N + ' самых слабых вопросов в одной комнате:</span>' + (D.subj.syll ? [1, 2] : [0]).filter(function (k) { return repFloors(k).length; }).map(function (k) { var nb = repWeak(k); return '<button class="btn ' + (nb ? 'primary' : 'ghost') + '" data-rep="' + k + '">' + (k ? 'РК' + k : 'Все темы') + (nb ? ' · ошибок ' + nb : '') + '</button>'; }).join('') + '</div>';
    var rk = modeRk(); if (rk) h += '<div class="wave-msg">Режим РК' + rk + ': только темы этого рубежного контроля (' + esc(rangeText(modeFloors())) + '). <button class="btn ghost" data-allmode>Показать все темы</button></div>';
    (D.subj.units || (arch ? UNITS_ARCH : UNITS)).forEach(function (u, ui) {
      if (!D.floors.some(function (f) { return f.n >= u[0] && f.n <= u[1] && (!rk || rkOf(f) === rk); })) return;
      h += '<div class="unit u' + (ui % 4 + 1) + '"><small>' + esc(u[2]) + '</small><b>' + esc(u[3]) + '</b></div><div class="doors">';
      D.floors.filter(function (f) { return f.n >= u[0] && f.n <= u[1] && (!rk || rkOf(f) === rk); }).forEach(function (f) {
        var m = floorMastery(f), st = D.stats(poolIds(f)), cls = m >= 85 ? 'm3' : m >= 50 ? 'm2' : m > 0 ? 'm1' : '';
        /* тема = дверь: номер на табличке, название, полоска освоения, ✓ за «начисто» */
        h += '<button class="tdoor' + (f.n === cur ? ' cur' : '') + (st.clean ? ' clean' : '') + '" data-f="' + f.n + '" title="' + esc(f.title) + '"><span class="td-arch"><span class="td-plate">' + (f.final ? '★' : f.lab ? 'Л' : f.drill ? f.title : f.n) + '</span>' + (st.clean ? '<i class="td-medal">✓</i>' : '') + '<span class="td-knob"></span></span><b>' + esc(f.drill ? (f.sub || f.title) : f.title) + '</b><span class="td-bar"><i style="width:' + m + '%"></i></span><small>освоено ' + m + '%' + (st.bad ? ' · <b class="bad">ошибок ' + st.bad + '</b>' : '') + '</small></button>';
      });
      h += '</div>';
    });
    /* темы силлабуса без вопросов — серые «скоро» */
    var later = (D.subj.topics || []).filter(function (t) { return !t.file && (!rk || t.rk === rk); });
    if (later.length) {
      h += '<div class="unit u4"><small>Скоро</small><b>Темы появятся после лекций и лабораторных</b></div><div class="doors">';
      later.forEach(function (t) { h += '<div class="tdoor soon"><span class="td-arch"><span class="td-plate">' + t.n + '</span><span class="td-lock">🔒</span></span><b>' + esc(t.title) + '</b><small>скоро</small></div>'; });
      h += '</div>';
    }
    screenEl.innerHTML = h;
    screenEl.querySelectorAll('[data-home]').forEach(function (b) { b.onclick = function () { go('house'); }; });
    var am = screenEl.querySelector('[data-allmode]'); if (am) am.onclick = function () { S.mode = null; D.persist(); go('path'); };
screenEl.querySelectorAll('[data-rep]').forEach(function (b) { b.onclick = function () { buildRep(+b.getAttribute('data-rep')); }; });
    screenEl.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { go('floor', +b.getAttribute('data-f')); }; });
    var curEl = screenEl.querySelector('.tdoor.cur'); if (curEl) setTimeout(function () { curEl.scrollIntoView({ block: 'center' }); }, 30);
  }

  /* ---------- ЭТАЖ: комнаты ---------- */
  function rkey(f, k) { return f.id + ':' + k; }
  function roomInfo(f, k) { return S.rooms[rkey(f, k)] || { cleared: [], done: false, chest: false }; }
  /* ---------- УРОВЕНЬ «ЗУБРЁЖКИ» (ИКТ): без комнат и лекций — тренировки по 10 вопросов ---------- */
  function enterDrill(f) {
    show(false); where(subjTitle() + ' · ' + f.title);
    var ids = poolIds(f), n = ids.length, learned = ids.filter(D.learned).length, bad = D.badIds(f).length, st = D.stats(ids), seen = st.seen - learned - bad;
    var pct = function (x) { return n ? Math.round(x / n * 100) : 0; };
    var h = '<div class="path-head"><h1>' + esc(subjTitle()) + ': ' + esc(f.title) + '</h1><span class="tag teal">выучено ' + pct(learned) + '%</span></div>' +
      '<p class="hallnote">' + esc(f.sub || '') + ' · вопросов: ' + n + '</p>' +
      '<div class="drill-bar"><i class="l" style="width:' + pct(learned) + '%"></i><i class="s" style="width:' + pct(Math.max(0, seen)) + '%"></i><i class="b" style="width:' + pct(bad) + '%"></i></div>' +
      '<div class="drill-leg"><span><i class="l"></i>выучено (3 раза подряд верно): <b>' + learned + '</b></span><span><i class="s"></i>знакомые: <b>' + Math.max(0, seen) + '</b></span><span><i class="b"></i>ошибки: <b>' + bad + '</b></span><span><i></i>ещё не видел: <b>' + st.unseen + '</b></span></div>' +
      '<p class="msg">Тренировка — 10 вопросов. Новые попадаются часто, ошибки — чаще всего (но не сразу, а через несколько вопросов), а то, на что ты <b>3 раза подряд</b> ответил верно, почти не попадается. Так ты увидишь все вопросы и зазубришь каждый. Не знаешь — жми «🔎 Google»: он объяснит ответ и каждый вариант.</p>' +
      '<div class="row" style="margin:12px 0"><button class="btn primary" data-go>▶ Тренировка: 10 вопросов<kbd>Enter</kbd></button>' +
      '<button class="btn ghost" data-exam>🎓 Пробный экзамен</button></div>';
    screenEl.innerHTML = h;
    screenEl.querySelector('[data-go]').onclick = function () { go('room', { f: f.n, k: 0, again: 1 }); };
    screenEl.querySelector('[data-exam]').onclick = function () { startExamHall(); };
    G.buttons = [btn('Тренировка', 'primary', 'Enter', function () { go('room', { f: f.n, k: 0, again: 1 }); })];
    S.at = { s: D.subjId, f: f.n, k: 0 }; D.persist();
  }
  function enterFloor(n) {
    var f = floorBy(n || 1);
    if (f.drill) return enterDrill(f);
    if (caveOn(f)) {   /* тема = пещера: сразу в комнату, где остановился (с картинкой спуска) */
      var run = caveRun(f);
      if (run.cleared[caveN(f)]) return caveDone(f);
      S.at = { s: D.subjId, f: f.n, k: run.at }; D.persist();
      return caveTransition(f, run.at, run.at, function () { go('room', { f: f.n, k: run.at }); }, true);
    }
    show(false); where(fname(f) + ' · ' + f.title);
    var m = floorMastery(f), fst = D.stats(poolIds(f)), bad = D.badIds(f).length;
    var nextK = f.rooms.findIndex(function (r) { return !roomInfo(f, r.k).done || !D.stats(r.qs).clean; });
    var h = '<div class="path-head"><h1>' + esc(fname(f)) + '</h1><span class="tag teal">освоено ' + m + '%</span>' + (fst.clean ? '<span class="tag gold">пройдено начисто ✓</span>' : '') + '</div>' +
      '<p class="hallnote">' + esc(f.title) + '. Вопросов: ' + statLine(fst) + '. В каждой комнате монстров ровно столько, чтобы спросить все её вопросы и задания. Ошибся — монстр бьёт тебя и задаст этот вопрос ещё раз чуть позже, пропустить нельзя. Ошибки и ответы с подсказкой ещё раз спросит страж у выхода (у него сердечки не тратятся). Так комната становится «чисто ✓».</p>' + tipHtml('floor2') + '<div class="rooms">';
    f.rooms.forEach(function (r) {
      var ri = roomInfo(f, r.k), rm = D.mastery(r.qs), st = D.stats(r.qs), stars = rm >= 85 ? '★★★' : rm >= 50 ? '★★☆' : rm > 0 ? '★☆☆' : '☆☆☆';
      var status = st.clean && ri.done ? '<span class="tag gold">чисто ✓</span>' : ri.done ? '<span class="tag">есть что пройти ещё раз</span>' : '';
      h += '<button class="room' + (st.clean && ri.done ? ' done' : '') + (r.boss ? ' boss' : '') + (r.k === nextK ? ' cur' : '') + '" data-k="' + r.k + '"><b>' + (r.boss ? (f.syll ? 'Босс темы' : 'Босс этажа') : 'Комната ' + (r.k + 1)) + '</b><span>' + esc(r.boss ? 'неувиденные и слабые вопросы всей ' + (f.syll ? 'темы' : 'лекции') : (r.sec ? r.sec.title : r.label || '')) + (r.tasks && r.tasks.length ? ' · заданий: ' + r.tasks.length : '') + '</span><div class="stars">' + stars + '</div><span>' + statLine(st) + '</span>' + status + '</button>';
    });
    h += '</div>';
    screenEl.innerHTML = h;
    screenEl.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-k'); go('room', { f: f.n, k: k === 'err' ? 'err' : +k }); }; });
    screenEl.querySelectorAll('[data-home]').forEach(function (b) { b.onclick = function () { go('house'); }; });
    S.at = { s: D.subjId, f: f.n, k: nextK < 0 ? 0 : nextK }; D.persist();
  }

  /* ---------- КОМНАТА ---------- */
  var ROSTER = [['slug', 'tzombie', 'mushroom', 'imp'], ['goblin', 'skelet', 'eye', 'orc'], ['skeleton', 'shaman', 'masked', 'necro', 'goblin'], ['chort', 'wogol', 'swampy', 'eye', 'skeleton']];
  var BOSS = ['ogre', 'bzombie', 'demon'], GUARD = 'masked';
  function rnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
  function tierOf(f) { if (f.rep || f.arena) return 1; if (f.drill) return Math.min(3, f.n - 1); return f.lab || f.n <= 3 ? 0 : f.n <= 6 ? 1 : f.n <= 10 ? 2 : 3; }
  /* порядок вопросов: ошибки, у которых подошла очередь → новые → остальные ошибки → слабые → крепкие */
  function orderIds(ids) {
    function rank(id) { var r = D.save.srs[id]; if (!r) return 1; if (D.isBad(id)) return r.due <= S.ticks ? 0 : 2; return 3 + r.l; }
    return ids.slice().sort(function (a, b) { return rank(a) - rank(b); });
  }
  function qi(id) { return { t: 'q', id: id }; }
  /* что спросят в комнате: обычная — ВСЕ её вопросы и задания; босс — 10+ самых нужных вопросов лекции; зал ошибок — ошибки лекции */
  function roomItems(f, room, isErr) {
    if (isErr) return orderIds(D.badIds(f)).slice(0, 12).map(qi);
    if (f.exam) return room.qs.map(qi);   /* экзамен: 40 вопросов по порядку */
    /* «Знаю» — не спрашиваем (если в комнате все «знаю», спросим всё же) */
    var unk = function (ids) { var u = ids.filter(function (id) { return !D.isKnown(id); }); return u.length ? u : ids; };
    if (room.boss) return orderIds(unk(poolIds(f))).slice(0, 10 + tierOf(f)).map(qi);
    return orderIds(f.drill || f.arena ? room.qs : unk(room.qs)).map(qi).concat((room.tasks || []).map(function (id) { return { t: 't', id: id }; }));
  }
  function mkMon(key, items, extra) { var o = { type: 'mon', key: key, items: items.slice(), hp: items.length, max: items.length }; for (var k in extra || {}) o[k] = extra[k]; return o; }
  /* монстры: сердечек ровно столько, сколько вопросов и заданий; задания — у последнего (сильного) */
  function makeMons(f, items, boss, seed) {
    var r = rnd(seed), ros = f.exam || f.rep ? ROSTER[tierOf(f)] : themeRoster(f), qs = items.filter(function (x) { return x.t === 'q'; }), ts = items.filter(function (x) { return x.t === 't'; }), out = [];
    if (boss) {
      var cut = Math.min(3, Math.max(0, qs.length - 4));
      if (cut) out.push(mkMon(ros[0], qs.slice(0, cut)));
      out.push(mkMon(themeBoss(f), qs.slice(cut).concat(ts), { strong: true, boss: true }));
      return out.filter(function (m) { return m.hp; });
    }
    /* Двойник: два похожих понятия подряд (неверный вариант одного вопроса — верный ответ другого) */
    var pair = twinPair(f, qs);
    if (pair) {
      var inPair = {}; pair.forEach(function (x) { inPair[x.id] = 1; }); qs = qs.filter(function (x) { return !inPair[x.id]; });
      out.push(mkMon('twin', pair, { twin: true }));
    }
    /* Софист (только предметы по силлабусу): 2 вопроса «наоборот» — дан ответ, выбери вопрос */
    if ((f.arena || (caveOn(f) && caveRun(f).revived > 0)) && qs.length >= 4) {   /* Софист — только у возрождённых монстров и в Хаос-забеге */
      var rev = qs.filter(function (x) { return revOk(f, f.byId[x.id]); }).slice(0, f.arena ? 2 : 3);
      if (rev.length >= 2) {
        qs = qs.filter(function (x) { return rev.indexOf(x) < 0; });
        out.push(mkMon('sophist', rev.map(function (x) { return { t: 'r', id: x.id }; }), { sophist: true }));
      }
    }
    var n = Math.max(1, Math.min(5, Math.ceil((qs.length + ts.length) / 4)));
    for (var i = 0; i < n; i++) {
      var part = qs.slice(Math.floor(i * qs.length / n), Math.floor((i + 1) * qs.length / n)); if (i === n - 1) part = part.concat(ts);
      var key = ros[Math.floor(r() * ros.length)], tries = 0;   /* в одной комнате монстры не повторяются */
      while (out.some(function (o) { return o.key === key; }) && tries++ < 8) key = ros[Math.floor(r() * ros.length)];
      out.push(mkMon(key, part, { strong: !!A.MON[key].lm && (part.length >= 4 || (i === n - 1 && ts.length > 0)) }));
    }
    out = out.filter(function (m) { return m.hp; });
    /* порядок: обычный монстр, Двойник, …, Софист, последний обычный */
    var tw = out.filter(function (m) { return m.twin; })[0], so = out.filter(function (m) { return m.sophist; })[0];
    var plain = out.filter(function (m) { return !m.twin && !m.sophist; });
    if (tw) plain.splice(Math.min(1, plain.length), 0, tw);
    if (so) plain.splice(Math.max(0, plain.length - 1), 0, so);
    return plain;
  }
  /* пара «легко перепутать»: у вопроса A среди неверных вариантов есть верный ответ вопроса B той же темы.
     Сначала ищем B в этой же комнате, потом во всей теме. */
  function twinPair(f, qs) {
    var nrm = function (s) { return String(s || '').toLowerCase().replace(/[`*_"«»().,;:!?\s-]+/g, ' ').trim(); };
    var rightOf = function (Q) { var o = Q.opts.filter(function (x) { return x.right; }); return o.length === 1 ? nrm(o[0].t) : ''; };
    var byAns = {};
    f.pool.forEach(function (Q) { var a = rightOf(Q); if (a.length >= 4 && /[a-zа-яё]{3}/.test(a)) (byAns[a] = byAns[a] || []).push(Q); });
    var inRoom = {}; qs.forEach(function (x) { inRoom[x.id] = 1; });
    var best = null;
    qs.forEach(function (x) {
      var Q = f.byId[x.id]; if (!Q || Q.type !== 'choice' || best && best.inside) return;
      Q.opts.forEach(function (o) {
        if (o.right) return;
        (byAns[nrm(o.t)] || []).forEach(function (P) {
          if (P.id === Q.id || best && best.inside) return;
          var inside = !!inRoom[P.id];
          if (!best || inside) best = { a: x, b: { t: 'q', id: P.id }, inside: inside };
        });
      });
    });
    if (!best || qs.length < 3) return null;
    /* группа до 4: добавляем вопросы, чей верный ответ — неверный вариант уже взятых (их часто путают между собой) */
    var grp = [best.a, best.b], have = {}; grp.forEach(function (x) { have[x.id] = 1; });
    for (var gi = 0; gi < grp.length && grp.length < 4; gi++) {
      var G0 = f.byId[grp[gi].id]; if (!G0 || G0.type !== 'choice') continue;
      G0.opts.forEach(function (o) { if (o.right || grp.length >= 4) return; (byAns[nrm(o.t)] || []).forEach(function (P) { if (grp.length < 4 && !have[P.id]) { have[P.id] = 1; grp.push({ t: 'q', id: P.id }); } }); });
    }
    return grp;
  }
  /* вопрос «наоборот» для Софиста: ответ короткий и понятный (не код, не число), есть 3 других вопроса с другими ответами */
  function revRight(Q) { var o = Q && Q.type === 'choice' ? Q.opts.filter(function (x) { return x.right; }) : []; return o.length === 1 ? String(o[0].t).trim() : ''; }
  function revOk(f, Q) {
    var a = revRight(Q); if (a.length < 3 || a.length > 90 || !/[a-zа-яё]{3}/i.test(a) || /```|`/.test(a + Q.q) || /[{};=<>#\[\]]|\w\(/.test(a)) return false;
    return reverseQ(f, Q).opts.length >= 4;
  }
  function stemShort(s) { s = String(s || '').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').replace(/[:\s]+$/, '').trim(); return s.length > 120 ? s.slice(0, 117) + '…' : s; }
  function reverseQ(f, Q) {
    /* «чужие» вопросы не должны быть похожи на верный (иначе ответ подходит к двум) */
    var words = function (s) { return (stemShort(s).toLowerCase().match(/[a-zа-яё]{4,}/g) || []); }, mine = words(Q.q);
    var similar = function (P) { var w = words(P.q), same = w.filter(function (x) { return mine.indexOf(x) >= 0; }).length; return same >= 2 || same >= Math.min(w.length, mine.length) * 0.5; };
    var a = revRight(Q), others = f.pool.filter(function (P) { return P.id !== Q.id && revRight(P) && revRight(P) !== a && !similar(P); });
    for (var i = others.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = others[i]; others[i] = others[j]; others[j] = t; }
    return { id: Q.id, rev: true, src: Q, type: 'choice', ex: Q.ex, q: 'К какому вопросу подходит ответ «' + a + '»?',
      opts: [{ t: stemShort(Q.q), right: true }].concat(others.slice(0, 3).map(function (P) { return { t: stemShort(P.q), right: false }; })) };
  }
  function placeObjs(objs) { var x0 = objs[0].type === 'altar' ? 104 : 140, span = 448 - x0; objs.forEach(function (o, i) { o.x = o.type === 'exit' ? 448 : Math.round(x0 + i * span / Math.max(1, objs.length - 1) * 0.94); o.state = 'idle'; o.st = now(); }); return objs; }
  function buildRoom(f, k, mode, items) {
    var objs = [], isErr = k === 'err', room = isErr ? null : f.rooms[k], info = isErr ? {} : roomInfo(f, k);
    if (f.exam) {   /* экзаменационный зал: только сверхбосс и выход */
      objs = [mkMon('overlord', items, { boss: true, strong: true, exam: true }), { type: 'exit' }];
      placeObjs(objs); objs[0].x = 330; return objs;
    }
    if (room && !room.boss && room.secs && room.secs.length && !caveOn(f)) objs.push({ type: 'altar' });   /* в пещере алтаря нет: книга — ссылкой под вопросом */
    if (mode !== 'clean') objs = objs.concat(makeMons(f, items, room && room.boss, caveOn(f) && !isErr ? caveRun(f).seed + k * 17 : (f.rep ? 7 : f.arena ? 11 + (f.batch || 0) : f.n) * 131 + (isErr ? 97 : k) * 17 + S.ticks));
    if (f.arena && Math.random() < 0.3) {   /* Хаос-забег: иногда последний монстр — босс случайной редкости */
      var ms = objs.filter(function (o) { return o.type === "mon" && !o.twin && !o.sophist; }), bm = ms[ms.length - 1];
      if (bm && bm.items.length >= 3) { var rl = Math.random(); bm.rar = rl < 0.5 ? 0 : rl < 0.8 ? 1 : rl < 0.95 ? 2 : 3; bm.key = pick(THEME_BOSS[themeOf(f)]); bm.boss = true; bm.strong = true; }
    }
    if (room && !room.boss) objs.push({ type: 'chest' });
    objs.push({ type: 'exit' });
    placeObjs(objs);
    if (info.chest) objs.forEach(function (o) { if (o.type === 'chest') o.open = true; });
    if (info.altar) objs.forEach(function (o) { if (o.type === 'altar') o.used = true; });
    return objs;
  }
  function errRoom(f) { return { k: 'err', errHall: true, boss: false, sec: null, secs: f.texts, tasks: [], qs: D.badIds(f) }; }
  function enterRoom(a) {
    var f = floorBy(a.f), isErr = a.k === 'err', room = isErr ? errRoom(f) : f.rooms[a.k];
    if ((f.drill || f.arena) && !isErr) room = Object.assign({}, room, { qs: D.drillPick(f, 10) });   /* ИКТ: 10 вопросов по весам — новые и ошибки чаще, выученные почти никогда */
    if (caveOn(f) && !isErr) { var crun = caveRun(f); if (!room.boss) room = Object.assign({}, room, { qs: runQs(f, a.k), sec: null, secs: [] }); if (!crun.cleared[a.k]) crun.at = a.k; S.at = { s: D.subjId, f: f.n, k: a.k }; D.persist(); }   /* пещера: вопросы темы случайно по комнатам */
    show(true); where((f.final ? 'Финал' : fname(f)) + ' · ' + (A.THEMES[themeOf(f)] || {}).name + ' · ' + (isErr ? 'Зал ошибок' : f.drill ? 'Тренировка' : room.boss ? 'Босс' : 'Комната ' + (a.k + 1)));
    if (f.arena) where('🌀 ' + arenaLine(f));
    if (caveOn(f) && !isErr) { var cn = caveN(f), cl = caveRun(f).cleared.slice(0, cn).filter(Boolean).length; where(fname(f) + ' · ' + (a.k >= cn ? 'логово босса' : 'комната ' + (a.k + 1) + ' из ' + cn + ' · до босса ' + (cn - cl))); }
    if (!isErr && !f.rep && !f.exam && !f.arena) { S.at = { s: D.subjId, f: f.n, k: a.k }; D.persist(); }
    var info = isErr ? { done: false } : roomInfo(f, a.k), st = D.stats(room.qs);
    var mode = isErr ? 'err' : caveOn(f) ? (caveRun(f).cleared[a.k] ? 'clean' : 'run') : (a.again || !info.done || !st.clean || f.drill) ? 'run' : 'clean';
    var items = mode === 'clean' ? [] : roomItems(f, room, isErr);
    G.room = { floor: f.n, f: f, k: a.k, room: room, mode: mode, items: items, objs: buildRoom(f, a.k, mode, items), idx: -1, combo: 1, recent: [], turns: 0, right: 0, wrong: 0, iq: 0, briefOpen: false, mon: null, m0: D.mastery(room.qs), mistakes: [], problems: [], cheats: [], errs: {}, errItem: {}, fixed: 0, st0: st };
    G.hero.x = 36; G.hero.dir = 1;
    roomIdle();
    var nq = items.filter(function (x) { return x.t === 'q'; }).length, nt = items.length - nq;
    var msg = mode === 'clean' ? 'Комната чиста ✓: все вопросы увидены, ошибок нет. Монстров нет — но можно пройти её ещё раз для закрепления.'
      : mode === 'err' ? 'Зал ошибок: здесь только твои ошибки этой лекции (' + nq + '). Исправь их — и зал запрётся.'
      : room.boss ? 'Босс спросит ' + nq + ' ' + plural(nq, 'вопрос', 'вопроса', 'вопросов') + ' всей лекции — сначала те, что ты ещё не видел, и слабые.'
      : 'В комнате ' + nq + ' ' + plural(nq, 'вопрос', 'вопроса', 'вопросов') + (nt ? ' и ' + nt + ' ' + plural(nt, 'задание', 'задания', 'заданий') : '') + ' — у монстров ровно столько сердечек. Ошибся — вопрос вернётся через пару вопросов. Ошибки и подсказки ещё раз спросит страж у выхода.';
    panel.insertAdjacentHTML('afterbegin', '<div class="wave-msg' + (mode === 'clean' ? ' ok' : '') + '">' + esc(msg) + '</div>' + tipHtml('room2'));
  }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }
  function nextObj() { var R = G.room; for (var i = 0; i < R.objs.length; i++) { var o = R.objs[i]; if ((o.type === 'mon' && !o.dead) || (o.type === 'chest' && !o.open) || (o.type === 'altar' && !o.used) || o.type === 'exit') return i; } return R.objs.length - 1; }
  /* редкость босса в Хаос-забеге: чем реже, тем злее (чаще ярость, больше пешек и сердец у пешек) */
  var BOSS_RAR = [{ n: 'Обычный', rage: 0.12, pawn: [1, 1], max: 1, col: '#B4B2C4' }, { n: 'Редкий', rage: 0.22, pawn: [1, 2], max: 1, col: '#85B7EB' }, { n: 'Эпический', rage: 0.32, pawn: [2, 3], max: 2, col: '#AFA9EC' }, { n: 'Легендарный', rage: 0.45, pawn: [3, 3], max: 3, col: '#FAC775' }];
  function monName(o) { return o.guard ? 'Страж выхода' : (o.rar != null ? BOSS_RAR[o.rar].n + ' ' : '') + A.MON[o.key].name; }
  /* страж: появляется, когда все монстры повержены, если были ошибки или подсказки */
  /* что спросит страж: ВСЕ вопросы, где брал подсказку (чит) + случайно 1–5 из ошибок комнаты
     (чаще ошибался — выше в очереди). Нет ни подсказок, ни ошибок — стража нет. */
  function guardList() {
    var R = G.room, list = R.cheats.slice(), same = function (a, b) { return a.t === b.t && a.id === b.id; };
    var cand = Object.keys(R.errs).map(function (k) { return R.errItem[k]; }).filter(function (it) { return !list.some(function (x) { return same(x, it); }); });
    if (!list.length && !cand.length) return [];
    cand.sort(function (a, b) { return (R.errs[b.t + b.id] - R.errs[a.t + a.id]) || (Math.random() - 0.5); });
    var r = Math.random(), n = r < 0.4 ? 1 : r < 0.7 ? 2 : r < 0.88 ? 3 : r < 0.96 ? 4 : 5;
    return list.concat(cand.slice(0, n));
  }
  function maybeGuard() {
    var R = G.room; if (!R || R.mon || R.f.exam) return null;   /* в экзамене стража нет */
    if (R.objs.some(function (o) { return o.type === 'mon' && !o.dead; })) return null;
    var items = guardList(); if (!items.length) return null;
    var g = mkMon(GUARD, items, { guard: true, strong: true }); R.cheats = []; R.errs = {}; R.errItem = {};
    var ei = R.objs.length - 1, prev = R.objs[ei - 1];
    g.x = prev ? Math.round((prev.x + 448) / 2) + 2 : 400; g.state = 'idle'; g.st = now();
    R.objs.splice(ei, 0, g); roomLabels();
    return g;
  }
  /* ---------- ЯРОСТЬ БОССА: изредка (раз за бой) рычит, трясёт сцену и призывает пешку ----------
     Пешка — обычный монстр с 1–3 сердцами (вопросы темы, сначала слабые); если были ошибки —
     иногда мини-страж с этими ошибками. После пешки бой с боссом продолжается. */
  var RAGE_CHANCE = 0.14;
  var SAY_RAGE = ['РРРА! Слуги, ко мне!', 'Ты меня разозлил!', 'Хватит! Взять его!', 'Ну всё, держись!'];
  /* злость: базовый шанс по редкости + сколько ты подряд отвечаешь верно (чем лучше играешь — тем злее босс) */
  function shouldRage(m, R) {
    if (!m.boss || m.dead || m.exam || m.items.length < 2) return false;
    var rr = m.rar != null ? BOSS_RAR[m.rar] : null, max = rr ? rr.max : 1;
    if ((m.rages || 0) >= max) return false;
    var anger = Math.min(0.35, (R.run || 0) * 0.05);
    return Math.random() < (rr ? rr.rage : RAGE_CHANCE) + anger;
  }
  function bossRage(m) {
    var R = G.room; m.raged = true; m.rages = (m.rages || 0) + 1; setMon(m, 'attack'); sfx('hurt');
    bubbleSay(pick(rude() && Math.random() < 0.6 ? RUDE_RAGE : SAY_RAGE), 'bad');
    var sw = $('sceneWrap'); sw.classList.remove('rage'); void sw.offsetWidth; sw.classList.add('rage');
    floater('ЯРОСТЬ БОССА!', m.x, 64, '#F09595');
    setTimeout(function () {
      if (G.room !== R) return;
      var bossIds = {}; m.items.forEach(function (it) { bossIds[it.id] = 1; });
      var errs = Object.keys(R.errs).map(function (k) { return R.errItem[k]; }), mini = errs.length && Math.random() < 0.35, mon;
      if (mini) mon = mkMon(GUARD, errs.slice(0, 1 + Math.floor(Math.random() * 3)), { guard: true, mini: true });
      else {
        var rr = m.rar != null ? BOSS_RAR[m.rar] : null, n = rr ? rr.pawn[0] + Math.floor(Math.random() * (rr.pawn[1] - rr.pawn[0] + 1)) + ((R.run || 0) >= 5 ? 1 : 0) : 1 + Math.floor(Math.random() * 3), ros = ROSTER[Math.min(3, tierOf(R.f))];
        var ids = orderIds(poolIds(R.f)).filter(function (id) { return !bossIds[id]; }).slice(0, n);
        if (!ids.length) return afterAnswer(true);
        mon = mkMon(ros[Math.floor(Math.random() * ros.length)], ids.map(qi), { pawn: true });
      }
      mon.x = m.x - 34; mon.state = 'idle'; mon.st = now(); mon.summonAt = now();
      R.objs.splice(R.objs.indexOf(m), 0, mon); R.mon = null; roomLabels(); hideBubble(); sfx('guard');
      setPanel('<div class="wave-msg">Босс в ярости призвал ' + (mini ? 'мини-стража с твоими ошибками' : 'пешку «' + esc(monName(mon)) + '»') + ' (' + mon.hp + ' ♥). Победи её — и бой с боссом продолжится.</div>',
        [btn('Сразиться', 'primary', 'Enter', function () { approach(R.objs.indexOf(mon)); })]);
    }, 1500);
  }
  function goNext() {
    var R = G.room; R.mon = null; R.bubble = null; G.buttons = []; hideBubble();
    var g = maybeGuard(); roomLabels();
    if (g) {
      focusOn(false); sfx('guard');
      setPanel('<div class="row"><span class="tag gold">Страж выхода</span><span class="tag">' + g.hp + ' ♥</span></div><div class="qtext">У выхода стоит страж</div><p class="msg">Он спросит все вопросы, где ты брал подсказку, и несколько, где ошибался (чаще ошибался — скорее спросит): <b>' + g.hp + '</b>. Ответь сам, без подсказок. Страж не бьёт — сердечки у него не тратятся. Ошибёшься — вопрос вернётся в конец очереди.</p>',
        [btn('К стражу', 'primary', 'Enter', function () { approach(nextObj()); })]);
      if (autoOn()) autoGo(nextObj());
      return;
    }
    approach(autoOn() ? nextObjAuto() : nextObj());   /* автопоход: к монстру/сундуку/выходу, алтарь — только по желанию */
  }
  function roomSummary() {
    var R = G.room, mons = R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).length, chest = R.objs.some(function (o) { return o.type === 'chest' && !o.open; });
    var altar = R.objs.some(function (o) { return o.type === 'altar' && !o.used; });
    return 'В комнате: ' + (altar ? 'алтарь знаний · ' : '') + (mons ? mons + ' ' + (mons === 1 ? 'монстр' : mons < 5 ? 'монстра' : 'монстров') : 'монстров нет') + (chest ? ' · сундук' : '') + ' · выход';
  }
  function monTop(o) { return A.FLOOR_Y + 8 - A.monHeight(o.key) - (A.MON[o.key].fly ? 40 : 6); }
  function roomLabels() { var R = G.room; if (!R) return; labels(R.objs.filter(function (o) { return o.type === 'mon' && !o.dead; }).map(function (o) { return { text: monName(o), x: o.x, y: monTop(o) - 14, color: o.boss || o.guard ? '#F09595' : o.strong ? '#FAC775' : '#e8e4f8' }; }).concat(R.objs.filter(function (o) { return o.type === 'chest' && !o.open; }).map(function (o) { return { text: 'Сундук', x: o.x, y: A.FLOOR_Y - 36, color: '#FAC775' }; })).concat(R.objs.filter(function (o) { return o.type === 'altar' && !o.used; }).map(function (o) { return { text: 'Алтарь знаний', x: o.x, y: A.FLOOR_Y - 70, color: '#CECBF6' }; }))); }
  /* подсказки появляются по нарастающей, пока вопрос висит без ответа (30 / 60 / 120 с) */
  var HINT_T = [30000, 60000, 120000];
  function hintTimers(R, q) {
    var bk = panel.querySelector('[data-ql="book"]'), gg = panel.querySelector('[data-ql="ggl"]');
    if (bk) bk.onclick = openBookRoom;
    if (gg) gg.onclick = function () { openGoogle(q); };
    var alive = function () { return G.room === R && R.q === q && !R.answered; };
    var show = function (el, hot) { if (!el || !alive()) return; el.hidden = false; if (hot) el.setAttribute('data-hot', ''); };
    setTimeout(function () { show(bk); }, HINT_T[0]);
    setTimeout(function () { if (!alive()) return; var b = panel.querySelector('details.brief.later'); if (b) { b.classList.remove('later'); b.classList.add('glow'); } else show(bk, true); }, HINT_T[1]);
    setTimeout(function () { show(gg, true); }, HINT_T[2]);
  }
  /* «✓ Знаю — не спрашивай»: вопрос засчитывается как верный и дальше почти не попадается (вернуть — в Настройках) */
  function markKnown(q) {
    var R = G.room; if (!R || R.answered || R.q !== q) return;
    D.save.known = D.save.known || {}; D.save.known[q.id] = 1; D.persist();
    toast('Отмечено «Знаю» — этот вопрос больше почти не попадётся', '#9FE1CB');
    var kr = panel.querySelector('.linkbtn.know'); if (kr) kr.remove();
    if (q.type === 'keyboard') answer(true, q.answer);
    else { var rights = q.opts.map(function (o, i) { return o.right ? i : -1; }).filter(function (i) { return i >= 0; }); answer(true, rights.length > 1 ? rights : rights[0]); }
  }
  /* автопереход: после ответа сам идём дальше (следующий вопрос / следующий монстр), если ничего не нажато.
     Открыл «Объясни» или Google — автопереход ждёт, дальше — кнопкой. */
  function autoNext(R, m, fn) {
    if (!autoOn()) return;
    var q = R.q; if (!q) return;   /* задания (с решением) — без автоперехода, надо успеть прочитать */
    var tok = R.nextTok = Math.random();
    setTimeout(function () { if (G.room === R && R.mon === m && R.nextTok === tok && R.q === q && R.answered && !G.modal && !BK) fn(); }, wms() + (fast() ? 500 : 1100));
  }
  /* после сундука: добычу видно ~2 с, потом сам идём дальше (если ничего не нажато) */
  function autoLoot() {
    if (!autoOn()) return; var R = G.room, tok = R.idleTok = Math.random();
    setTimeout(function () { if (G.room === R && R.idleTok === tok && !R.mon && !G.modal && !BK && G.scene === 'room') goNext(); }, fast() ? 1200 : 2200);
  }
  /* автопоход: герой сам идёт к следующему монстру, сундуку или выходу (алтарь — только по желанию, книжка: B) */
  function autoOn() { return S.cfg.auto !== false; }
  function nextObjAuto() { var R = G.room; for (var i = 0; i < R.objs.length; i++) { var o = R.objs[i]; if ((o.type === 'mon' && !o.dead) || (o.type === 'chest' && !o.open) || o.type === 'exit') return i; } return R.objs.length - 1; }
  function autoGo(i) {
    var R = G.room, tok = R.idleTok = Math.random();
    setTimeout(function () { if (G.room === R && R.idleTok === tok && !R.mon && !G.modal && !BK && G.hero.target == null && G.scene === 'room') approach(i); }, fast() ? 250 : 650);
  }
  function roomIdle() {
    hideBubble(); focusOn(false); maybeGuard(); roomLabels();
    var R = G.room, i = autoOn() && R.mode !== 'clean' ? nextObjAuto() : nextObj(), o = R.objs[i];
    var what = o.type === 'mon' ? (o.boss ? 'босс «' + monName(o) + '»' : o.guard ? 'страж выхода (' + o.hp + ' ♥ — твои ошибки и подсказки)' : monName(o) + ' (' + o.hp + ' ♥)') : o.type === 'chest' ? 'сундук' : o.type === 'altar' ? 'алтарь знаний (прочитать раздел лекции)' : 'выход';
    var sec = R.room.sec;
    var st = D.stats(R.room.qs), nm = R.room.errHall ? 'Зал ошибок' : R.room.boss ? 'Босс этажа' : 'Комната ' + (R.k + 1);
    var bs = [btn('Идти дальше', 'primary', 'Enter', function () { approach(i); })];
    if (caveOn(R.f)) bs.push(btn('🗺 Пещера', 'ghost', null, openCaveMap));
    if (R.mode === 'clean' && o.type === 'exit') bs.push(btn('Пройти ещё раз', 'ghost', null, function () { go('room', { f: R.f.n, k: R.k, again: 1 }); }));
    setPanel('<div class="row"><span class="tag">' + esc(nm) + '</span>' + (sec ? '<span class="tag teal">' + esc(sec.title) + '</span>' : '') + (st.clean ? '<span class="tag gold">чисто ✓</span>' : '') + '</div><p class="msg">' + esc(roomSummary()) + '. Дальше — ' + esc(what) + '.</p><p class="hint">Вопросы ' + (R.room.errHall ? 'зала' : 'комнаты') + ': ' + statLine(st) + '</p>', bs);
    if (autoOn() && R.mode !== 'clean' && !(o.type === 'altar')) autoGo(i);
  }
  /* ---------- МИРЫ ТЕМ: у каждой темы своя обстановка, свои монстры и свой босс ---------- */
  var THEME_ORDER = ['crypt', 'library', 'ice', 'swamp', 'lava', 'temple', 'shadow', 'blood'];
  var THEME_OFF = { arch: 0, phil: 1, ict: 3, cpp: 5 };
  var THEME_MONS = {
    crypt: ['skelet', 'tzombie', 'skeleton', 'necro', 'gskel', 'doc'],
    library: ['imp', 'tgoblin', 'pumpkin', 'doc', 'delf', 'eye'],
    ice: ['icezombie', 'iimp', 'iorc', 'eye', 'skelet', 'tzombie'],
    swamp: ['slug', 'tslug', 'muddy', 'pchort', 'pswamp', 'mushroom'],
    lava: ['fimp', 'forc', 'chort', 'orc', 'shaman', 'goblin'],
    temple: ['angel', 'gskel', 'lizard', 'dwarf', 'masked', 'eye'],
    shadow: ['schort', 'knight', 'delf', 'necro', 'wogol', 'skeleton'],
    blood: ['bnecro', 'fimp', 'chort', 'knight', 'orc', 'skeleton']
  };
  var THEME_BOSS = { crypt: ['zking', 'bzombie'], library: ['evilwiz', 'dshadow'], ice: ['dice'], swamp: ['dpoison', 'zking'], lava: ['demonslime', 'dfire', 'ochief'], temple: ['dgold', 'evilwiz'], shadow: ['swizard', 'dshadow'], blood: ['demonslime', 'dblood'] };
  function themeOf(f) {
    if (!f) return 'crypt'; if (f.exam) return 'blood'; if (f.rep) return 'temple'; if (f.arena) return THEME_ORDER[(f.batch || 0) % THEME_ORDER.length];
    var n = typeof f.n === 'number' ? f.n : 1; return THEME_ORDER[(n - 1 + (THEME_OFF[f.subj] || 0)) % THEME_ORDER.length];
  }
  function themeRoster(f) { return THEME_MONS[themeOf(f)]; }
  function themeBoss(f) { var b = THEME_BOSS[themeOf(f)], n = typeof f.n === 'number' ? f.n : 0; return b[n % b.length]; }
  /* эпичное появление босса: затемнение, табличка с именем, рык, тряска */
  function bossIntro(o, done) {
    if (fast()) { floater(A.MON[o.key].name + '!', o.x, 60, '#F09595'); return done(); }   /* быстрый режим: без таблички */
    var sw = $('sceneWrap'), el = document.createElement('div'); el.className = 'boss-title';
    el.innerHTML = '<small>' + esc((A.THEMES[themeOf(G.room.f)] || {}).name || 'Босс') + ' · ' + (o.rar != null ? 'босс' : 'босс темы') + '</small><b>' + esc(monName(o)) + '</b><span>' + o.hp + ' ♥</span>';
    sw.appendChild(el); sw.classList.remove('rage'); void sw.offsetWidth; sw.classList.add('rage'); setMon(o, 'attack'); sfx('guard');
    setTimeout(function () { el.classList.add('out'); }, 1700);
    setTimeout(function () { el.remove(); done(); }, 2100);
  }
  /* вторая фаза: на половине сердец босс вырастает, разгорается аура, стихия усиливается */
  function bossPhase2(m) {
    m.p2 = true; m.big = 1.15;
    var sw = $('sceneWrap'); sw.classList.remove('rage'); void sw.offsetWidth; sw.classList.add('rage');
    setTimeout(function () { floater('ВТОРАЯ ФАЗА!', m.x, 60, '#F09595'); bubbleAt('<b>' + esc(line(['Это была лишь разминка!', 'Теперь я серьёзен!', 'Узри мою истинную форму!', 'Ты меня разбудил…'], RUDE_RAGE)) + '</b>', m, 'say bad'); }, 650);
  }
  function approach(i) {
    var R = G.room, o = R.objs[i]; R.idx = i; R.idleTok = 0;
    var stop = o.type === 'mon' ? o.x - (A.MON[o.key].lm && A.MON[o.key].boss ? 92 : A.MON[o.key].lm ? 62 : A.MON[o.key].boss ? 66 : 50) : o.type === 'chest' ? o.x - 34 : o.type === 'altar' ? o.x - 30 : o.x - 26;
    setPanel('<p class="msg">Идём…</p>');
    walkTo(stop, function () {
      if (o.type === 'mon' && (o.boss || o.exam) && !o.intro) { o.intro = true; bossIntro(o, function () { if (G.room === R) { R.mon = o; R.monTurn = 0; ask(); } }); }
      else if (o.type === 'mon') { R.mon = o; R.monTurn = 0; ask(); }
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
    /* у Архитектуры лекции короткие — отрывок показываем, только если он правда про этот вопрос */
    if (!bsec || bs < (R.f.syll ? 4 : 1.6)) return '';
    var bl = bsec.blocks, pick = [bl[bi]];
    if (/^(code|out)$/.test(bl[bi].t)) { if (bl[bi - 1] && /^(p|note|ul|ol)$/.test(bl[bi - 1].t)) pick.unshift(bl[bi - 1]); }
    else if (bl[bi + 1] && /^(code|out)$/.test(bl[bi + 1].t)) pick.push(bl[bi + 1]);
    return '<details class="brief"' + (R.briefOpen ? ' open' : '') + '><summary>Кратко из лекции</summary><div class="rich">' + D.blocks(pick) + '</div></details>';
  }
  function wireBrief() { var R = G.room, det = panel.querySelector('details.brief'); if (det) det.ontoggle = function () { R.briefOpen = det.open; }; }
  function ask() {
    var R = G.room, m = R.mon, M = A.MON[m.key], it = m.items[0];
    if (!it) { m.dead = true; m.hp = 0; return goNext(); }
    R.monTurn++;
    var isTask = it.t === 't', t = isTask ? R.f.taskById[it.id] : null;
    focusOn(true);
    var head = '<div class="row"><span class="tag ' + (m.boss || m.strong || m.guard ? 'gold' : 'red') + '">' + esc(monName(m)) + (m.boss ? ' · босс' : m.guard ? ' · твои ошибки' : m.twin ? ' · похожие понятия' : m.sophist ? ' · вопрос наоборот' : m.strong ? ' · сильный' : '') + '</span><span class="tag">' + m.hp + ' ♥</span><span class="grow"></span>' + (isTask ? icoBtns(false) : trBtn()) + '</div>';
    R.assisted = false; R.fiftyUsed = false; R.hinted = false; R.tr = null; R.answered = false;
    if (isTask) return askTask(head, t);
    var q = it.t === 'r' ? reverseQ(R.f, R.f.byId[it.id]) : R.f.byId[it.id]; R.q = q; R.recent.push(q.id); if (R.recent.length > 6) R.recent.shift();
    var right = q.type === 'keyboard' ? q.answer : (q.opts.filter(function (o) { return o.right; })[0] || {}).t;
    /* подсказки по нарастающей: сначала только вопрос и варианты; книга через 30 с, «Кратко из лекции» через 60 с, Google через 120 с.
       Ошибался здесь раньше — суть из лекции раскрыта сразу; ошибался 2+ раз — сразу подсвечен Google. */
    var rec = D.save.srs[q.id], errs = rec ? rec.w || 0 : 0, hadErr = !R.f.exam && !q.rev && (errs > 0 || D.isBad(q.id));
    var brief = R.f.exam ? '' : briefHtml(q.q + ' ' + (right || ''));
    if (brief) brief = hadErr ? brief.replace('<details class="brief"', '<details class="brief was-err" open').replace('<summary>Кратко из лекции</summary>', '<summary>Ты здесь ошибался — вот суть</summary>') : brief.replace('<details class="brief"', '<details class="brief later"');
    var h = head + tipHtml('q3') + '<div class="qtext">' + D.md(q.q) + '</div>' + (q.img ? '<div class="qimg"><img src="' + esc(q.img) + '" alt="Картинка к вопросу"></div>' : '');
    if (q.type === 'keyboard') h += '<div class="kb"><input id="kbIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Что выведет программа? Впиши ответ"><button class="btn primary" id="kbGo">Ответить<kbd>Enter</kbd></button></div>';
    else {
      var order = q.opts.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tt = order[i]; order[i] = order[j]; order[j] = tt; }
      R.order = order;
      h += '<div class="opts">' + order.map(function (oi, n) { return '<button class="opt" data-o="' + oi + '"><span class="n">' + (n + 1) + '</span><span>' + D.md(q.opts[oi].t) + '</span></button>'; }).join('') + '</div>';
    }
    var hasBook = R.f.texts && R.f.texts.length && !R.f.exam;
    if (!R.f.exam) h += '<div class="qlinks">' + (hasBook ? '<button class="linkbtn" data-ql="book"' + (hadErr ? '' : ' hidden') + '>📖 Открыть книгу</button>' : '') +
      '<button class="linkbtn" data-ql="ggl"' + (errs >= 2 ? ' data-hot' : ' hidden') + '>🔎 Загуглить</button>' +
      (!q.rev ? '<button class="linkbtn know" data-know title="Отметить как выученный — больше почти не будет попадаться">✓ Знаю</button>' : '') + '</div>' + brief;
    h += hotbarHtml();
    setPanel(h); wireIco(); wireTr(); wireHotbar(); wireBrief(); R.trB = null; bubbleQ(q, m); autoTrBubble(q, m);
    hintTimers(R, q);
    var kb0 = panel.querySelector('[data-know]'); if (kb0) kb0.onclick = function () { markKnown(q); };
    if (S.cfg.autoTr) toggleTr();
    G.buttons = [];
    if (q.type === 'keyboard') { var inp = $('kbIn'); $('kbGo').onclick = function () { answer(norm(inp.value) === norm(q.answer), inp.value); }; inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); $('kbGo').click(); } }; if (matchMedia('(pointer:fine)').matches) setTimeout(function () { inp.focus({ preventScroll: true }); }, 50); }
    else {
      var nr = q.opts.filter(function (o) { return o.right; }).length;
      if (nr > 1) {
        /* несколько верных ответов: отмечаем нужное количество и жмём «Ответить» */
        R.sel = [];
        panel.querySelector('.opts').insertAdjacentHTML('beforebegin', '<p class="hint"><b>Выбери ' + nr + ' ответа</b>, потом нажми «Ответить».</p>');
        panel.querySelector('.opts').insertAdjacentHTML('afterend', '<div class="row" id="mRow" style="margin-top:10px"><button class="btn primary" id="mGo" disabled>Ответить<kbd>Enter</kbd></button></div>');
        var submit = function () { if (R.answered || R.sel.length !== nr) return; var r = $('mRow'); if (r) r.remove(); answer(R.sel.every(function (oi) { return q.opts[oi].right; }), R.sel.slice()); };
        panel.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { if (R.answered) return; var oi = +b.getAttribute('data-o'), i = R.sel.indexOf(oi); if (i >= 0) { R.sel.splice(i, 1); b.classList.remove('sel'); } else { R.sel.push(oi); b.classList.add('sel'); } $('mGo').disabled = R.sel.length !== nr; }; });
        $('mGo').onclick = submit; G.buttons = [btn('Ответить', 'primary', 'Enter', submit)];
      } else panel.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { var oi = +b.getAttribute('data-o'); answer(!!q.opts[oi].right, oi); }; });
    }
  }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[;.]$/, ''); }
  function askTask(head, t) {
    var R = G.room; R.task = t; R.taskAnswered = false; R.q = null;
    R.bubble = 'Реши задание' + (t.title ? ': «' + esc(t.title.replace(/\s·\s(лёгкая|средняя|сложная)$/, '')) + '»' : '') + ' <small>условие внизу</small>'; R.bubbleCls = 'more'; bubbleAt(R.bubble, R.mon, 'more');
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
    var R = G.room, q = R.q; if (R.answered) return; R.answered = true; D.record(q.id, ok && !R.assisted); if (R.f.exam) examAnswer(q, ok, pickedIdx);
    if (!ok && !R.mistakes.some(function (x) { return x.md === q.q; })) R.mistakes.push({ q: shortQ(q.q), md: q.q, a: q.type === 'keyboard' ? q.answer : D.strip(D.md((q.opts.filter(function (o) { return o.right; })[0] || {}).t || '')) });
    var later = R.mon.guard ? 'Страж вернёт этот вопрос в конец очереди.' : 'Этот вопрос ещё раз спросит страж у выхода.';
    var again = R.f.exam ? 'Правильный ответ подсвечен зелёным. Ошибка не вернётся — разбор будет в конце.' : R.mon.guard ? later : 'Монстр задаст этот вопрос ещё раз через пару вопросов, а потом его спросит и страж.';
    if (q.type === 'keyboard') {
      var inp = $('kbIn'); inp.disabled = true; $('kbGo').disabled = true;
      panel.querySelector('.kb').insertAdjacentHTML('afterend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Верно!' + (R.assisted ? ' Но с подсказкой — ' + later : '') : 'Неверно. Правильный ответ: <code>' + esc(q.answer) + '</code>. ' + again) + '</div>');
    } else {
      panel.querySelectorAll('.opt').forEach(function (b) { var oi = +b.getAttribute('data-o'); b.disabled = true; b.classList.remove('sel'); if (q.opts[oi].right) b.classList.add('right'); else if (oi === pickedIdx || (Array.isArray(pickedIdx) && pickedIdx.indexOf(oi) >= 0)) b.classList.add('wrong'); });
      panel.querySelector('.opts').insertAdjacentHTML('afterend', '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Верно! Удар!' + (R.assisted ? ' Но с подсказкой — ' + later : '') : (R.mon.guard ? 'Неверно. ' : (R.f.exam ? '✗ Неверно. ' : 'Неверно — монстр бьёт тебя. ')) + again) + '</div>');
    }
    resolve(ok, 1, 'q');
  }
  /* Верный ответ снимает одно сердечко монстра. Ошибка сердечко монстра НЕ снимает: монстр бьёт героя (−1 ♥),
     а вопрос возвращается к нему же через 3–5 вопросов — так все вопросы комнаты будут отвечены.
     Ошибки и ответы с подсказкой ещё раз спросит страж; страж не бьёт, ошибка у него — вопрос в конец очереди. */
  /* ---------- облачко у монстра: вопрос «говорит» монстр ----------
     Как в комиксе: сбоку от монстра на уровне его головы, хвостик к нему. Обычно справа
     (герой стоит слева); у края сцены — с той стороны, где больше места.
     Весь вопрос (даже длинный и с кодом) стараемся вместить: уменьшаем шрифт, при нужде
     облачко опускается ниже головы. Не влезло совсем — начало в облачке, полностью внизу.
     Кнопка «…» опускает вопрос в панель (облачко сворачивается в «…»), выбор запоминается. */
  function bubbleAt(html, m, cls, fit) {
    var el = $('bubble'); if (!m) { hideBubble(); return false; }
    var M = A.MON[m.key], hw = M.boss ? 30 : M.lm ? 24 : 16, head = monTop(m) + 10;
    var rx = (m.x + hw + 4) / A.W * 100, lx = (m.x - hw - 4) / A.W * 100, wr = 100 - rx - 2, wl = lx - 2;
    var right = fit ? wr >= wl || wr >= 45 : wr >= 32 || wr >= wl;
    el.className = (right ? 'side-r' : 'side-l') + (cls ? ' ' + cls : '');
    el.style.left = right ? rx.toFixed(1) + '%' : '';
    el.style.right = right ? '' : (100 - lx).toFixed(1) + '%';
    el.style.maxWidth = 'min(' + Math.max(28, right ? wr : wl).toFixed(1) + '%, ' + (fit ? 560 : 460) + 'px)';
    var bot = Math.max(4, (A.H - head - 14) / A.H * 100);
    el.style.bottom = bot.toFixed(1) + '%'; el.style.fontSize = '';
    el.innerHTML = html; el.hidden = false;
    var up = el.querySelector('[data-bup]'); if (up) up.onclick = function () { S.cfg.bubbleDown = false; D.persist(); var R = G.room; if (R && R.q && R.mon) { bubbleQ(R.q, R.mon); if (!R.trB) autoTrBubble(R.q, R.mon); } };
    var dn = el.querySelector('[data-bdown]'); if (dn) dn.onclick = function () { S.cfg.bubbleDown = true; D.persist(); var R = G.room; if (R && R.q && R.mon) bubbleQ(R.q, R.mon); };
    return fit ? fitBubble(el, bot) : true;
  }
  /* уменьшаем шрифт, пока облачко не влезет в сцену; потом пробуем опустить его ниже */
  function fitBubble(el, bot) {
    var H = $('sceneWrap').clientHeight; if (!H) return true;
    var fs = parseFloat(getComputedStyle(el).fontSize), fits = function () { return el.offsetHeight <= H * (1 - bot / 100) - 6; };
    for (var f = fs; !fits() && f > 11; f -= 1) el.style.fontSize = (f - 1) + 'px';
    if (fits()) return true;
    bot = 3; el.style.bottom = '3%'; el.style.fontSize = '';
    for (f = fs; !fits() && f > 10; f -= 1) el.style.fontSize = (f - 1) + 'px';
    return fits();
  }
  function hideBubble() { var el = $('bubble'); el.hidden = true; el.innerHTML = ''; }
  /* поворот телефона / смена размера окна — заново подгоняем облачко */
  window.addEventListener('resize', function () {
    clearTimeout(G.bubT); G.bubT = setTimeout(function () { var R = G.room; if (G.scene === 'room' && R && R.mon && R.q && !R.answered && !appEl.classList.contains('watch')) bubbleQ(R.q, R.mon); }, 150);
  });
  var B_DOWN = '<button class="b-tog" data-bdown title="Опустить вопрос вниз" aria-label="Опустить вопрос вниз">…</button>';
  function bubbleQ(q, m) {
    var R = G.room, qt = panel.querySelector('.qtext');
    if (qt) qt.classList.remove('in-bubble');
    if (S.cfg.bubbleDown) { R.bubble = '<button class="b-tog" data-bup title="Показать вопрос в облачке" aria-label="Показать вопрос в облачке">…</button>'; R.bubbleCls = 'mini'; bubbleAt(R.bubble, m, 'mini'); return; }
    /* перевод (C++): оригинал, под ним перевод — если уже пришёл */
    var trHtml = R.trB && R.trB.q === q ? '<div class="b-tr">' + D.md(R.trB.text) + '</div>' : '';
    var twinNote = m.twin ? '<small class="b-twin">' + (m.items.length === m.max && m.max > 1 ? 'Нас ' + m.max + ' похожих — не перепутай!' : 'А теперь похожее понятие!') + '</small>' : q.rev ? '<small class="b-twin">Я Софист: ответ знаю, а вопрос угадай!</small>' : '';
    R.bubble = B_DOWN + twinNote + D.md(q.q) + trHtml; R.bubbleCls = 'q';
    if (trHtml && !bubbleAt(R.bubble, m, 'q', true)) R.bubble = B_DOWN + D.md(q.q);
    if (bubbleAt(R.bubble, m, 'q', true)) { if (qt) qt.classList.add('in-bubble'); return; }
    var plain = plainText(q.q);
    R.bubble = B_DOWN + esc(plain.slice(0, 120).replace(/\s+\S*$/, '')) + '… <small>полностью внизу</small>'; R.bubbleCls = 'more';
    bubbleAt(R.bubble, m, 'more', true);
  }
  /* C++ (вопросы на английском): сразу переводим и кладём перевод в облачко под оригинал,
     а к вариантам — мелкой строкой под каждым. Код не переводится и не дублируется. */
  function autoTrBubble(q, m) {
    var R = G.room;
    if (D.subjId !== 'cpp' || S.cfg.cppTr === false || S.cfg.autoTr || S.cfg.bubbleDown) return;
    var prose = q.q.replace(/```[\s\S]*?```/g, ' ').trim(); if (!/[A-Za-z]{3,}/.test(prose)) return;
    X.trQuestion(q, S.cfg.trLang).then(function (d) {
      if (G.room !== R || R.q !== q || R.answered || R.mon !== m) return;
      var text = String(d.q || '').replace(/```[\s\S]*?```/g, ' ').replace(/\n{2,}/g, '\n').trim();
      if (text && text !== prose) { R.trB = { q: q, text: text }; bubbleQ(q, m); }
      panel.querySelectorAll('.opt').forEach(function (b) {
        var oi = +b.getAttribute('data-o'), o = q.opts[oi], t = d.o && d.o[oi];
        if (!o || !t || t === o.t || X.isCodeLike(o.t) || b.querySelector('.o-tr')) return;
        b.lastElementChild.insertAdjacentHTML('beforeend', '<small class="o-tr">' + D.md(t) + '</small>');
      });
    }).catch(function () {});
  }
  function bubbleSay(text, cls) { var R = G.room; if (R && R.mon) bubbleAt('<b>' + esc(text) + '</b>', R.mon, 'say ' + cls); }
  var SAY_OK = ['Ай!', 'Ой, больно!', 'Угадал…', 'Ну ладно, верно!', 'Ух!', 'Это было больно!', 'Откуда ты знаешь?!', 'Повезло тебе…', 'Ауч!', 'Неплохо, неплохо…', 'Кто тебя учил?!', 'Ладно, засчитано…'];
  var SAY_BAD = ['Ха! Мимо!', 'Неверно! Получай!', 'Не угадал!', 'Хе-хе, ошибка!', 'Двойка тебе!', 'Иди учи!', 'Ха-ха, даже близко нет!', 'Пересдача!', 'Мимо кассы!', 'Не то, совсем не то!', 'Ошибочка вышла!', 'Конспект открой!'];
  var SAY_DIE = ['Нееееет!', 'Я ещё вернусь…', 'Как ты узнал?!', 'Ты… слишком умный…', 'Мама, он всё выучил!', 'Не может быть!', 'Я повержен…', 'Это конец…', 'Передайте боссу… он умный…', 'Как же так?!', 'Сдаюсь!', 'Ты сдашь этот РК…'];
  var SAY_CHEAT = ['Это нечестно!', 'Ты подсмотрел!', 'Нечестно, с подсказкой!', 'Так и я могу!', 'Жульничество!'], SAY_GUARD_CHEAT = ['С подсказкой не считается.', 'Сам-то знаешь? Спрошу ещё.'];
  var SAY_EXAM = ['Экзамен окончен… посмотрим, что ты набрал.', 'Время сдавать зачётку!', 'Ты дошёл до конца. Неплохо…'];
  var SAY_BOSS = ['Невозможно!', 'Ты прошёл всю тему?!', 'Я… повержен…'], SAY_GUARD = ['Ещё встретимся…', 'Я вернусь, когда ты ошибёшься.', 'Сегодня ты сильнее. Пока!', 'Жди меня у следующей двери…', 'Запомнил тебя. До встречи!', 'Исчезаю… но не навсегда.'];
  /* фразы выдаются «колодой»: пока не прозвучат все, ни одна не повторится, и новая колода не начнётся с только что сказанной */
  var BAGS = [];
  function pick(a) {
    if (!a || !a.length) return '';
    if (a.length < 3) return a[Math.floor(Math.random() * a.length)];
    var bag = a._bag;
    if (!bag || !bag.length) {
      bag = a.slice(); for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      if (bag[bag.length - 1] === a._last) { var x = bag.pop(); bag.unshift(x); }
      a._bag = bag;
    }
    a._last = bag.pop(); return a._last;
  }
  /* 18+: монстры матерятся (по умолчанию включено, выключается в Настройках) */
  function rude() { return S.cfg.rude !== false; }
  var RUDE_HIT = ['Сука, больно!', 'Блядь!', 'Ёб твою мать!', 'Ах ты ж сука!', 'Пиздец, как больно!', 'Да ну нахуй!', 'Твою ж мать!', 'Ебать, ты сильный!',
    'Ебать мой лысый череп!', 'Охуеть, вот это удар!', 'Ахуеть не встать!', 'Какого хуя?!', 'Ёбаный в рот!', 'Мать вашу, больно же!', 'Ебать-колотить!', 'Ой, бля…',
    'Сука, прям в печень!', 'Нихуя себе ты дерёшься!', 'Ёперный театр!', 'Хуяк — и я лежу…', 'Ёпта, полегче!', 'Да ёб твою налево!', 'Блядь, за что так сильно?!'];
  var RUDE_DIE = ['Пиздец…', 'Ну нахуй эту учёбу…', 'Ёбаный отличник!', 'Хуёво мне…', 'Пиздец, он всё выучил!', 'Сука… я ещё вернусь…', 'Блядь, за что?!',
    'Пиздец подкрался незаметно…', 'Ёбаный рот этого подземелья!', 'Это фиаско, братан…', 'Всё, пиздец, я сдох.', 'Иди нахуй со своими знаниями!',
    'Блядская учёба меня убила…', 'Хуй тебе, а не реванш… а, нет, это мне…', 'Мама, роди меня обратно, блядь!', 'Сука, отличник ебучий!', 'Я ж только пришёл, блядь…',
    'Охуеть, меня победил студент…', 'Ну и нахуя я сюда вылез…', 'Пиздец котёнку…'];
  var RUDE_BAD = ['Хуйню ответил!', 'Учи, блядь!', 'Опять хуйня!', 'Пиздец ты гений…', 'Нихуя ты не знаешь!', 'Ха! Мимо, лошара!',
    'Чё ты, блядь, несёшь?!', 'Ебать ты лох!', 'Хуй тебе, а не пятёрка!', 'Ну ты и долбоёб, конечно!', 'Пиздец, кто тебя учил?!', 'Охуенный ответ… нет.',
    'Получай, умник хренов!', 'Ебать, мимо кассы!', 'С таким ответом — только нахуй с пары!', 'Да ты ебанутый!', 'Ой, бля, позорище!', 'Хуёвенько, дружок!',
    'Иди учи, ебать тебя в сессию!', 'Пиздёж и провокация!'];
  var RUDE_CHEAT = ['Сука, ты подсмотрел!', 'Читер ебаный!', 'Нихуя себе, с подсказкой!', 'Так нечестно, блядь!', 'Гугл за тебя ответил, пиздабол!',
    'Ебать, шпаргалка!', 'Сам-то нихуя не знаешь!', 'Это пиздец как нечестно!', 'Списывать — хуёво, братан!', 'Блядь, опять с подсказкой!'];
  var RUDE_RAGE = ['Ну всё, сука, держись!', 'Ебать, ты меня взбесил!', 'Слуги, нахуй его!', 'Пиздец тебе!', 'Ёб твою мать, сейчас ты получишь!',
    'Охуел совсем?! Взять его!', 'Я тебя, блядь, урою!', 'Сука, ну держись теперь!', 'Мать вашу, сюда, ко мне!'];
  var RUDE_GUARD = ['Ещё встретимся, сука…', 'Я вернусь, блядь!', 'Запомнил тебя, умник хренов.', 'Пиздец, опять всё исправил…',
    'Ладно, нахуй, проходи.', 'Сука, умный стал…', 'Хуй с тобой, иди дальше.', 'Ёб твою мать, всё исправлено…'];
  function line(norm, rudeSet) { return rude() && rudeSet && Math.random() < 0.5 ? pick(rudeSet) : pick(norm); }

  /* после ответа панель ненадолго гаснет, чтобы было видно удар героя или атаку монстра */
  var WATCH_MS = 1560;
  function fast() { return S.cfg.fast === true; }   /* быстрый режим: короткие паузы и анимации */
  function wms() { return fast() ? 550 : WATCH_MS; }
  function watchHit(ms) {
    appEl.classList.add('watch'); clearTimeout(G.watchT);
    var low = window.innerWidth < 900 && !appEl.classList.contains('focus');
    if (low) window.scrollTo({ top: 0, behavior: 'smooth' });
    G.watchT = setTimeout(function () {
      appEl.classList.remove('watch');
      var R = G.room; if (R && R.mon && !R.mon.dead && R.bubble) bubbleAt(R.bubble, R.mon, (R.bubbleCls || '') + ' past', R.bubbleCls !== 'mini'); else hideBubble();
      if (low && G.scene === 'room') panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, ms || wms());
  }
  function resolve(ok, power, kind) {
    var R = G.room, m = R.mon, it = m.items.shift(), clean = ok && !R.assisted; peek(); watchHit();
    R.turns++;
    D.touchStreak();
    if (m.guard) { if (clean) R.fixed++; else m.items.push(it); }
    else {
      if (!ok && m.exam) { /* экзамен: каждый вопрос один раз, ошибка не возвращается */ }
      else if (!ok) { var pos = Math.min(m.items.length, 2 + Math.floor(Math.random() * 3)); m.items.splice(pos, 0, it); var ek = it.t + it.id; R.errs[ek] = (R.errs[ek] || 0) + 1; R.errItem[ek] = it; }
      else if (R.assisted && !R.cheats.some(function (x) { return x.t === it.t && x.id === it.id; })) R.cheats.push(it);
    }
    /* реплика монстра: последний верный ответ его добивает — тогда «Нееееет!» и т. п. */
    var kill = !m.items.length && (m.guard ? clean : ok);
if (kill && m.guard) watchHit(tpms() + 300);   /* страж исчезает дольше — панель и облачко ждут конца телепорта */
    /* верно, но с подсказкой (Google, 50/50, лампа, ИИ…) — монстр возмущается */
    if (ok && R.assisted) bubbleSay(m.guard ? pick(SAY_GUARD_CHEAT) : line(SAY_CHEAT, RUDE_CHEAT), 'cheat');
    else if (kill) bubbleSay(m.exam ? pick(SAY_EXAM) : m.guard ? line(SAY_GUARD, RUDE_GUARD) : m.boss ? line(SAY_BOSS, RUDE_DIE) : line(SAY_DIE, RUDE_DIE), 'die');
    else bubbleSay(m.guard ? (ok ? 'Верно. Исправлено.' : 'Неверно. Спрошу ещё раз.') : ok ? line(SAY_OK, m.exam ? null : RUDE_HIT) : line(SAY_BAD, m.exam ? null : RUDE_BAD), ok ? 'ok' : 'bad');
    R.run = clean ? (R.run || 0) + 1 : 0;
    if (R.run && R.run % LUCK_RUN === 0) setTimeout(luckChest, 700);
    else if (clean && R.run >= LUCK_RUN - 3) setTimeout(function () { floater('Серия ' + R.run + ' — до сундука удачи ' + (LUCK_RUN - R.run % LUCK_RUN), 240, 60, '#97C459'); }, 500);
    var drop = function () { m.hp = m.items.length; if (m.boss && !m.exam && !m.p2 && m.hp > 0 && m.hp <= Math.ceil(m.max / 2) && m.max >= 4) bossPhase2(m); if (!m.hp) { m.dead = true; if (m.guard) { m.tpAt = now(); m.state = 'idle'; m.st = m.tpAt; sfx('chest'); } else { setMon(m, 'death'); sfx('kill'); } } };
    if (ok) {
      R.right++;
      var hw = X.hit(power, m), bonus = Math.min(20, Math.max(0, hw.dmg - power) * 2); R.crit = (R.combo >= 1.5 && Math.random() < (R.combo - 1));
      if (hw.note) setTimeout(function () { floater(hw.note, m.x, 90, '#FF9600'); }, 260);
      R.combo = Math.min(3, Math.round((R.combo + 0.1) * 10) / 10); if (R.combo >= 1.3) setTimeout(function () { floater('комбо ×' + R.combo.toFixed(1), G.hero.x, 70, '#FAC775'); }, 380);
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
      if (!m.guard) setMon(m, 'attack');
      setTimeout(function () {
        if (m.guard) { floater('страж не бьёт — вопрос в конец очереди', m.x, 110, '#FAC775'); D.persist(); hud(); return afterAnswer(false); }
        sfx('hurt');
        if (m.exam) { G.hero.hurtAt = now(); floater('✗ неверно', G.hero.x, 110, '#F09595'); drop(); D.persist(); hud(); return afterAnswer(false); }   /* экзамен: бьёт для вида, сердечки не тратятся */
        if (S.shieldOn) { S.shieldOn = false; floater('Щит выдержал!', G.hero.x, 110, '#85B7EB'); }
        else { var cost = X.hurtCost(); S.hp = Math.max(0, S.hp - cost); G.hero.hurtAt = now(); floater('−' + cost + ' ♥', G.hero.x, 110, '#F09595'); }
        if (S.hp <= 0 && X.take('feather')) { S.hp = 3; setTimeout(function () { floater('Перо феникса! +3 ♥', G.hero.x, 80, '#FF9600'); }, 400); }
        drop(); floater('вопрос вернётся', m.x, 90, '#FAC775');
        D.persist(); hud(); afterAnswer(false);
      }, A.MON[m.key].lm ? 420 : 260);
    }
  }
  function afterAnswer(ok) {
    var R = G.room, m = R.mon;
    if (R.f.exam) {   /* экзамен: только «Следующий вопрос»; последний ответ — разбор */
      if (!m.items.length) { var row1 = document.createElement('div'); row1.className = 'row'; row1.style.marginTop = '10px'; row1.innerHTML = '<span class="hint">Это был последний вопрос — считаем результат…</span>'; panel.appendChild(row1); return setTimeout(function () { if (G.room === R) finishExamHall(false); }, tpms() + 600); }
      G.buttons = [btn('Следующий вопрос', 'primary', 'Enter', ask)];
      var row2 = document.createElement('div'); row2.className = 'row'; row2.style.marginTop = '12px'; row2.innerHTML = '<button class="btn primary" data-nx>Следующий вопрос<kbd>Enter</kbd></button>';
      panel.appendChild(row2); row2.querySelector('[data-nx]').onclick = ask; autoNext(R, m, ask); return;
    }
    if (S.hp <= 0) return setTimeout(defeat, 500);
    if (m.mimic && m.dead) return setTimeout(function () { if (G.room === R) { R.mon = null; mimicLoot(); } }, wms());
    if (shouldRage(m, R)) return setTimeout(function () { if (G.room === R && R.mon === m) bossRage(m); }, wms());
    var btns = [];
    if (m.dead && m.boss) btns.push(btn('Босс повержен! Открыть железный сундук', 'primary', 'Enter', function () { R.mon = null; bossLoot(); }));
    else if (m.dead && ok && !R.assisted) {
      /* верный ответ добил монстра — сразу идём дальше; «Объясни» успеет остановить переход */
      G.buttons = []; var row0 = document.createElement('div'); row0.className = 'row'; row0.style.marginTop = '10px';
      row0.innerHTML = '<span class="hint">' + esc(monName(m)) + (m.guard ? ' исчез в облаке искр…' : ' повержен…') + '</span>' + (R.q ? '<button class="btn ghost" data-ex0>📖 Объясни</button>' : '');
      panel.appendChild(row0); var q0 = R.q, exb = row0.querySelector('[data-ex0]'); if (exb) exb.onclick = function () { openExplain(q0); };
      setTimeout(function () {
        if (G.room === R && R.mon === m && !BK && !G.modal) goNext();
        else if (G.room === R && R.mon === m) { G.buttons = [btn('Дальше', 'primary', 'Enter', goNext)]; var nb = document.createElement('button'); nb.className = 'btn primary'; nb.innerHTML = 'Дальше<kbd>Enter</kbd>'; nb.onclick = goNext; row0.appendChild(nb); }
      }, m.guard ? tpms() + 800 : wms() + 500);
      return;
    }
    else if (m.dead) btns.push(btn('Дальше', 'primary', 'Enter', goNext));
    else btns.push(btn('Следующий вопрос', 'primary', 'Enter', ask));
    if (R.q) { var qx = R.q; btns.push(btn('📖 Объясни', 'ghost', null, function () { openExplain(qx); })); btns.push(btn('🔎 Google', 'ghost', null, function () { openGoogle(qx); })); }
    var row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '12px';
    row.innerHTML = btns.map(function (b, i) { return '<button class="btn ' + b.cls + '" data-b2="' + i + '">' + esc(b.label) + (b.key ? '<kbd>' + b.key + '</kbd>' : '') + '</button>'; }).join('');
    panel.appendChild(row); G.buttons = btns;
    row.querySelectorAll('[data-b2]').forEach(function (el) { el.onclick = function () { btns[+el.getAttribute('data-b2')].fn(); }; });
    autoNext(R, m, btns[0].fn);
  }
  function bump() { var e = $('hudCombo'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
  function setMon(m, st) { m.state = st; m.st = now(); var d = A.monDur(m.key, st); if (st !== 'death') setTimeout(function () { if (m.state === st) { m.state = 'idle'; m.st = now(); } }, d); }
  function heroAttack(onHit) { var h = G.hero; h.attackAt = now(); setTimeout(onHit, 230); }
  /* Мимик: иногда сундук оказывается монстром — 2–3 вопроса темы; победил — двойная добыча */
  var MIMIC_CHANCE = 0.18;
  function maybeMimic(o) {
    var R = G.room; if (o.mimicChecked || R.f.exam) return false; o.mimicChecked = true;
    if (Math.random() > MIMIC_CHANCE) return false;
    var ids = orderIds(poolIds(R.f)).slice(0, 2 + Math.floor(Math.random() * 2)); if (!ids.length) return false;
    var m = mkMon('mimic', ids.map(qi), { mimic: true }); m.x = o.x; m.state = 'attack'; m.st = now();
    R.objs[R.objs.indexOf(o)] = m; R.mon = m; R.monTurn = 0; roomLabels(); sfx('guard');
    floater('Это МИМИК!', m.x, 70, '#F09595');
    bubbleAt('<b>' + esc(line(['Сюрприз! Я не сундук!', 'Попался, жадина!', 'Хотел добычу? Заработай!'], RUDE_RAGE)) + '</b>', m, 'say bad');
    setTimeout(function () { if (G.room === R && R.mon === m) ask(); }, 1600);
    return true;
  }
  function mimicLoot() {
    var R = G.room, L1 = X.loot('chest'), L2 = X.loot('chest'), L = { iq: L1.iq + L2.iq, items: L1.items.concat(L2.items), weapon: L1.weapon || L2.weapon };
    R.iq += L.iq; sfx('chest'); D.persist(); hud(); roomLabels();
    setPanel('<div class="qtext">Мимик повержен — двойная добыча!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', goNext), btn('Рюкзак', 'ghost', null, openBag)]); autoLoot();
  }
  function openChest(o) {
    if (maybeMimic(o)) return;
    var R = G.room, L = X.loot('chest'), gain = L.iq;
    o.open = true; o.openAt = now(); R.iq += gain; sfx('chest');
    var info = roomInfo(R.f, R.k); info.chest = true; S.rooms[rkey(R.f, R.k)] = info; D.persist(); hud();
    floater('+' + gain + ' IQ', o.x, 150, '#CECBF6');
    setPanel('<div class="qtext">Сундук открыт!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', goNext), btn('Рюкзак', 'ghost', null, openBag)]); autoLoot();
  }
  function stars(m) { return m >= 85 ? '★★★' : m >= 50 ? '★★☆' : m > 0 ? '★☆☆' : '☆☆☆'; }
  function exitRoom() {
    focusOn(false);
    var R = G.room, f = R.f, isErr = R.mode === 'err', boss = R.room.boss, info = isErr ? {} : roomInfo(f, R.k), first = !isErr && !info.done;
    if (!isErr) { info.done = true; S.rooms[rkey(f, R.k)] = info; }
    if (caveOn(f) && !isErr) {   /* пещера: без экрана итогов — сразу картинка спуска в следующую комнату; после босса — праздник */
      var run = caveRun(f), n = caveN(f); run.cleared[R.k] = true; S.iq += 3; D.persist(); hud(); sfx("ok");
      if (R.k >= n) { run.at = n; D.persist(); return caveDone(f); }
      var nk = R.k + 1; while (nk < n && run.cleared[nk]) nk++;
      run.at = nk; D.persist();
      return caveTransition(f, R.k, nk, function () { go("room", { f: f.n, k: nk }); });
    }
    if (isErr) R.room.qs = D.badIds(f);
    var st = D.stats(R.room.qs);
    sfx(st.clean ? 'win' : 'ok');
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
    var nextF = modeFloors().filter(function (x) { return x.n > f.n; })[0];
    var fst = D.stats(poolIds(f)); if (fst.clean) h += '<p class="wave-msg ok">🏅 ' + esc(fname(f)) + ' — пройдено начисто!</p>';
    /* золотой сундук: первый раз тема пройдена начисто (все вопросы увидены, ни одной ошибки) — богатая награда и медаль на двери */
    S.gold = S.gold || {};
    if (fst.clean && !f.rep && !f.exam && !f.arena && !S.gold[f.id]) {
      S.gold[f.id] = Date.now(); var GL = X.loot('gold'); R.iq += GL.iq; D.persist(); hud(); sfx('chest');
      h += '<div class="wave-msg ok">🏆 Золотой сундук за «' + esc(fname(f)) + '» без ошибок!</div>' + lootHtml(GL);
    }
    var main = next ? btn(st.clean ? 'Следующая комната' : 'Пропустить → следующая комната', 'primary', 'Enter', function () { go('room', { f: f.n, k: R.k + 1 }); })
      : isErr ? btn('Дальше', 'primary', 'Enter', function () { go('floor', f.n); })
      : btn(nextF ? 'Дальше: ' + fname(nextF) : 'К пути', 'primary', 'Enter', function () { if (nextF) go('floor', nextF.n); else go('path'); });
    if (f.arena) {   /* арена: итог десятки, прогресс и «Ещё 10» (сам через 3 с при автопереходе) */
      var la = f.pool.filter(function (q) { return D.learned(q.id); }).length, dl = la - (f.l0 || 0);
      h += '<div class="wave-msg ok">⚔ ' + esc(f.title) + ': выучено <b>' + la + '</b> из ' + f.pool.length + (dl > 0 ? ' (+' + dl + ' за сессию)' : '') + '</div>';
      var nextA = btn('▶ Ещё 10 вопросов', 'primary', 'Enter', function () { G.arenaTok = 0; buildArena(f.subj, f.cid); });
      var stopA = btn('Хватит на сегодня', 'ghost', null, function () { G.arenaTok = 0; go('house'); });
      setPanel(h, [nextA, stopA]);
      if (autoOn()) {
        var tokA = G.arenaTok = Math.random(), secA = 3, rowA = document.createElement('p'); rowA.className = 'hint'; panel.appendChild(rowA);
        var tickA = function () { if (G.arenaTok !== tokA || G.scene !== 'room' || G.room !== R) return; if (secA <= 0) { G.arenaTok = 0; return buildArena(f.subj, f.cid); } rowA.textContent = 'Следующие 10 вопросов через ' + secA + '…'; secA--; setTimeout(tickA, 1000); };
        tickA();
      }
      return;
    }
    if (f.drill) {   /* ИКТ: следующая десятка или к уровню */
      again = [];
      main = btn('▶ Ещё 10 вопросов', 'primary', 'Enter', function () { go('room', { f: f.n, k: 0, again: 1 }); });
      again.push(btn('К уровню ' + f.title, 'ghost', null, function () { go('floor', f.n); }));
      setPanel(h, [main, again[0]]); return;
    }
    if (f.rep) {   /* повторение: заново собрать слабые вопросы или вернуться к карте */
      again = repWeak(f.rk) ? [btn('🔁 Повторить ещё', 'ghost', null, function () { buildRep(f.rk); })] : [];
      main = btn('К карте тем', 'primary', 'Enter', function () { go('path'); });
    }
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
  function focusOn(on) { appEl.classList.remove('focus'); appEl.classList.remove('peek'); }   /* режим «весь экран» убран */
  function peek() { if (appEl.classList.contains('focus')) { appEl.classList.add('peek'); window.scrollTo(0, 0); } }
  function toggleFocus() { S.focus = !S.focus; D.persist(); if (G.room && G.room.mon) { appEl.classList.toggle('focus', S.focus); appEl.classList.remove('peek'); var b = panel.querySelector('[data-ico="focus"]'); if (b) b.title = S.focus ? 'Свернуть (F)' : 'На весь экран (F)'; } }
  var ICO_BOOK = '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z" fill="#F1E4C8"/><path d="M12 6v14" stroke="#3C3489" stroke-width="2"/><path d="M5 9h5M5 12h5M14 9h5M14 12h5" stroke="#7F77DD" stroke-width="1.5"/></svg>';
  var ICO_FULL = '<svg viewBox="0 0 24 24" fill="none" stroke="#e8e4f8" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICO_MIN = '<svg viewBox="0 0 24 24" fill="none" stroke="#e8e4f8" stroke-width="2.4" stroke-linecap="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  function icoBtns(withG) { if (G.room && G.room.f && G.room.f.exam) withG = false; var hasBook = G.room && G.room.f && G.room.f.texts.length; return (withG ? '<button class="ico-btn ggl" data-ico="ggl" title="Спросить в Google" aria-label="Спросить в Google">G</button>' : '') + (hasBook ? '<button class="ico-btn book" data-ico="book" title="Книжка — вся лекция (B)" aria-label="Книжка">' + ICO_BOOK + '</button>' : '') + '<button class="ico-btn" data-ico="focus" title="' + (S.focus ? 'Свернуть (F)' : 'На весь экран (F)') + '" aria-label="На весь экран">' + (S.focus ? ICO_MIN : ICO_FULL) + '</button>'; }
  function wireIco() {
    var b = panel.querySelector('[data-ico="book"]'), f = panel.querySelector('[data-ico="focus"]'), gg = panel.querySelector('[data-ico="ggl"]');
    if (b) b.onclick = openBookRoom;
    if (gg) gg.onclick = function () { if (G.room && G.room.q) openGoogle(G.room.q); };
    if (f) f.onclick = function () { toggleFocus(); f.innerHTML = S.focus ? ICO_MIN : ICO_FULL; };
  }

  /* ---------- КНИЖКА: вся лекция, открывается на нужной странице ---------- */
  var BK = null;
  function openBookRoom() {
    var R = G.room; if (!R || !R.f.texts.length) return;
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
      '<header class="bk-top"><div class="bk-title">' + (o.altar ? '<span class="tag">Алтарь знаний</span> ' : '') + '<b>' + esc(f.final ? 'Итог курса' : f.lab ? 'Лабораторные: EWB' : 'Лекция ' + f.n) + '</b> · ' + esc(f.title) + '</div>' + toc + '<button class="btn ghost bk-x" id="bkX" aria-label="Закрыть">✕</button></header>' +
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
    if (G.room && G.room.f.exam) return '<p class="hint">Экзамен: подсказки и предметы недоступны — как на настоящем.</p>';
    var w = X.weapon(), W = X.WEAPONS[w.k], h = '<div class="hotbar" role="toolbar" aria-label="Предметы">';
    /* оружия больше нет — слот оружия убран */
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
        X.take(k); window.open('https://www.google.com/search?udm=50&q=' + encodeURIComponent(aiPrompt(R.q, R.f, false)), '_blank', 'noopener');
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
    /* нет лекции (Архитектура пока без алтаря) — начало пояснения, без строки «Ответ:» */
    if (!txt && q.ex) txt = (plainText(q.ex.split('\n').filter(function (l) { return !/^(Ответ|Почему не)/.test(l); }).join(' ')).replace(/^Решение:\s*/, '').match(/[^.!?]+[.!?]*/g) || []).slice(0, 2).join(' ').slice(0, 420);
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
    qt.classList.remove('in-bubble'); /* перевод показываем внизу, облачко остаётся на языке оригинала */
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
  function closeModal() { G.modalEnter = null; G.menuOpen = false; var el = $('modal'); if (el) el.hidden = true; document.body.classList.remove('book-open'); G.modal = false; hud(); refreshHotbar(); }

  /* ---------- «Объясни» и «Спросить в Google» ---------- */
  function exHtml(t) {
    return esc(t).split('\n').map(function (l) {
      if (!l.trim()) return '';
      l = l.replace(/^(Решение:|Ответ:|Почему не (?:остальные|другие):|Ошибка-ловушка:|Ловушка:|Запомни:|Правило:|Проверка:|Замечание:)/, '<b>$1</b>');
      return /^• /.test(l) ? '<p class="ex-li">' + l + '</p>' : '<p>' + l + '</p>';
    }).join('');
  }
  function rightText(q) { return q.type === 'keyboard' ? '<code>' + esc(q.answer) + '</code>' : q.opts.filter(function (o) { return o.right; }).map(function (o) { return D.md(o.t); }).join(' · '); }
  function refLine(f) {
    if (!f) return '';
    if (f.drill) return 'Лекций у ИКТ нет — жми «🔎 Google»: он сначала ответит, потом объяснит каждый вариант.';
    if (f.rep || f.arena) {   /* повторение и арена: раздел лекции подскажет, из какой он темы */
      var rs = G.room && G.room.briefSec, tn = rs ? String(rs.id).split('.')[0] : '', tf = tn ? floorBy(tn === 'Л' ? 16 : +tn) : null;
      return tf ? refLine(tf) : 'Найди этот вопрос в теме на карте и открой её лекцию у алтаря.';
    }
    if (f.syll && !f.texts.length) return 'Тема ' + f.n + ' по силлабусу: «' + f.title + '». Лекция у алтаря по этой теме — скоро.';
    var sec = G.room && G.room.briefSec;
    return (f.lab ? 'Лабораторные' : 'Лекция ' + f.n) + ' «' + f.title + '»' + (sec ? ', раздел «' + sec.title + '»' : '') + ' — открой книжку (B).';
  }
  function plainText(s) { return String(s || '').replace(/```\w*\n?/g, ' ').replace(/`/g, '').replace(/\s+/g, ' ').trim(); }
  function openExplain(q) {
    var R = G.room, f = R && R.f, brief = !q.ex && R && f && f.texts.length ? briefHtml(q.q + ' ' + plainText(rightText(q))) : '';
    var h = '<header class="md-top"><b>📖 Объяснение</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body ex-body">' +
      '<div class="ex-q">' + D.md(q.q) + '</div><p class="ex-right"><b>Правильный ответ:</b> ' + rightText(q) + '</p>' +
      (q.ex ? '<div class="ex-text">' + exHtml(q.ex) + '</div>' : '<p class="msg">Подробное пояснение к этому вопросу скоро появится.' + (brief ? ' А пока — кусок лекции по теме:' : '') + '</p>' + brief.replace('<details class="brief"', '<details class="brief" open')) +
      '<p class="hint">📍 ' + esc(refLine(f)) + '</p>' +
      '<div class="row"><button class="btn primary" data-close>Понятно — назад в игру</button><button class="btn ghost" data-ggl>🔎 Спросить в Google</button></div></div>';
    modal(h, function (el) { el.querySelector('[data-ggl]').onclick = function () { openGoogle(q); }; });
  }
  /* окно Google: вопрос, тема, предмет; поиск — только Google, без ИИ.
     Открыть поиск ДО ответа — это подсказка (вопрос потом спросит страж). */
  /* Запрос для ИИ-режима Google: сначала ответить, потом объяснить верный и КАЖДЫЙ неверный вариант,
     в конце разжевать тему. Добавляем отрывок лекции как контекст; после ответа — какой ответ верный по тесту. */
  function plainBlock(b) { return String(blockText(b) || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function lectureCtx(q, f) {
    if (!f || !f.texts || !f.texts.length) return '';
    var qt = D.toks(q.q + ' ' + (q.opts || []).map(function (o) { return o.t; }).join(' ')), best = null, bs = 0;
    f.texts.forEach(function (s) { (s.blocks || []).forEach(function (b, i) {
      if (b.t === 'h') return; if (!b._tok) b._tok = D.toks(blockText(b));
      var sc = D.overlap(qt, b._tok); if (sc > bs) { bs = sc; best = { s: s, i: i }; }
    }); });
    if (!best || bs < 1) return '';
    var bl = best.s.blocks, txt = [bl[best.i - 1], bl[best.i], bl[best.i + 1]].filter(function (b) { return b && b.t !== 'h'; }).map(plainBlock).join(' ');
    return (best.s.title + ': ' + txt).slice(0, 500);
  }
  function aiPrompt(q, f, showRight) {
    var kk = S.cfg.trLang === 'kk', letters = 'АБВГДЕЖЗ';
    /* варианты — в том порядке, что на экране (в файлах верный часто первый) */
    var R = G.room, order = R && R.q === q && R.order && R.order.length === (q.opts || []).length ? R.order : (q.opts || []).map(function (_, i) { return i; });
    var opts = order.map(function (oi, i) { return letters[i] + ') ' + plainText(q.opts[oi].t); });
    var right = (q.opts || []).filter(function (o) { return o.right; }).map(function (o) { return plainText(o.t); });
    var ctx = lectureCtx(q, f);
    var p = (kk ? 'Қазақ тілінде жауап бер. ' : 'Ответь на русском языке. ') +
      'Это вопрос из теста по предмету «' + subjTitle() + '»' + (f && f.title && !f.rep ? ', тема «' + f.title + '»' : '') + '.\n' +
      'Вопрос: ' + plainText(q.q) + '\n' + (opts.length ? 'Варианты:\n' + opts.join('\n') + '\n' : (q.answer ? '' : '')) +
      (showRight && right.length ? 'В тесте правильным считается: ' + right.join('; ') + '.\n' : '') +
      'Сначала коротко назови правильный ответ. Потом объясни, почему он правильный, и по КАЖДОМУ неверному варианту — почему он неверный. ' +
      'В конце разжуй тему простыми словами: что это за понятие, откуда оно, пример из жизни, как запомнить.' +
      (ctx ? '\nКонтекст из лекции (используй в объяснении): ' + ctx : '');
    return p.slice(0, 1800);
  }
  function openGoogle(q, f) {
    var R = G.room; f = f || (R && R.f);
    if (f && (f.rep || f.arena)) { var tp = q.src ? q.src.topic : q.topic; if (tp) f = floorBy(tp); }   /* в «Повторении» — лекция темы вопроса */
    var before = !!(R && R.mon && R.q === q && !R.answered);
    /* открываем сразу, без окна; до ответа тихо помечаем как подсказку */
    if (before && !R.assisted) { R.assisted = true; markAssisted(); }
    window.open('https://www.google.com/search?udm=50&q=' + encodeURIComponent(aiPrompt(q, f, !before)), '_blank', 'noopener');
  }
  function slotCard(icon, title, sub, right, rar, extra) {
    return '<div class="card-it" style="border-color:' + (X.RAR_COL[rar || 0]) + '"><img src="' + icon + '" alt=""><div class="grow"><b>' + esc(title) + '</b><span>' + sub + '</span>' + (extra || '') + '</div>' + (right || '') + '</div>';
  }
  function durBar(w) { var W = X.WEAPONS[w.k]; if (!W.dur) return ''; var p = Math.max(0, w.dur) / W.dur; return '<div class="durbar"><i style="width:' + Math.round(p * 100) + '%;background:' + (p > 0.5 ? '#5DCAA5' : p > 0.25 ? '#EF9F27' : '#E24B4A') + '"></i></div><span class="muted">прочность ' + Math.max(0, w.dur) + ' / ' + W.dur + (w.dur <= 0 ? ' — сломан, бьёт как обычный' : '') + '</span>'; }
  function openBag() {
    var h = '<header class="md-top"><b>Рюкзак</b><button class="btn ghost" data-shop>🛒 Купить за IQ</button><span class="grow"></span><span class="hud-iq"><span>IQ</span><b>' + S.iq + '</b></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">';
    h += '<h4>Предметы</h4><div class="it-grid">';
    var any = false;
    Object.keys(X.ITEMS).forEach(function (k) { var n = X.count(k); if (!n) return; any = true; var it = X.ITEMS[k];
      h += '<div class="it" style="border-color:' + X.RAR_COL[it.rar] + '"><img src="' + X.iconUrl(it.icon) + '" alt=""><em>×' + n + '</em><b>' + esc(it.name) + '</b><span>' + esc(it.desc) + '</span></div>'; });
    if (!any) h += '<p class="muted">Пусто. Предметы падают из сундуков; купить — кнопка «🛒 Купить за IQ» выше или у Мудреца в домике.</p>';
    h += '</div><p class="hint">Предметы для вопроса (50/50, лампа, Google, ИИ) используются в бою с хотбара под вопросом. Если ответил с подсказкой, вопрос засчитывается как «не знал» и вернётся ещё раз — так подсказки не мешают учиться. Перо феникса и ледяной кристалл срабатывают сами.</p></div>';
    modal(h, function (el) { el.querySelector('[data-shop]').onclick = openShop; el.querySelectorAll('[data-hand]').forEach(function (b) { b.onclick = function () { S.inv.hand = +b.getAttribute('data-hand'); D.persist(); openBag(); }; }); });
  }
  function openShop() {
    var h = '<header class="md-top"><b>Лавка мудреца</b><button class="btn ghost" data-bag>🎒 Рюкзак</button><span class="grow"></span><span class="hud-iq"><span>IQ</span><b>' + S.iq + '</b></span><button class="btn ghost" data-close>✕</button></header><div class="md-body"><p class="muted">Плати своим IQ — его дают за верные ответы, прочитанные алтари, задания, сундуки и боссов.</p><h4>Расходники</h4><div class="shop-grid">';
    Object.keys(X.ITEMS).forEach(function (k) { var it = X.ITEMS[k], can = S.iq >= it.price;
      h += '<div class="shop-it" style="border-color:' + X.RAR_COL[it.rar] + '">' + (it.rar ? '<span class="rar" style="background:' + X.RAR_COL[it.rar] + '">' + X.RAR[it.rar] + '</span>' : '') + '<img src="' + X.iconUrl(it.icon) + '" alt=""><b>' + esc(it.name) + '</b><span>' + esc(it.desc) + '</span><small>у тебя: ' + X.count(k) + '</small><button class="btn ' + (can ? 'primary' : '') + '" data-buy="' + k + '"' + (can ? '' : ' disabled') + '>IQ ' + it.price + '</button></div>'; });
    h += '</div></div>';
    modal(h, function (el) {
      el.querySelector('[data-bag]').onclick = openBag;
      el.querySelectorAll('[data-buy]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-buy'), it = X.ITEMS[k]; if (S.iq < it.price) return; S.iq -= it.price; X.add(k); D.persist(); openShop(); }; });
    });
  }
  function openSettings() {
    var c2 = S.cfg;
    var h = '<header class="md-top"><b>Настройки</b><span class="grow"></span><button class="btn ghost" data-close>✕</button></header><div class="md-body">' +
      '<div class="set-row"><div><b>Язык перевода вопросов</b><span>На этот язык переводит кнопка «Перевести» (A→Я) и автоперевод.</span></div><div class="seg">' + Object.keys(X.LANGS).map(function (l) { return '<button data-lang="' + l + '" aria-pressed="' + (c2.trLang === l) + '">' + X.LANGS[l] + '</button>'; }).join('') + '</div></div>' +
      '<div class="set-row"><div><b>Автоперевод</b><span>Каждый вопрос сразу показывается в переводе. Оригинал — по ссылке «оригинал» под вопросом.</span></div><label class="sw"><input type="checkbox" id="setAuto"' + (c2.autoTr ? ' checked' : '') + '><i></i></label></div>' +
'<div class="set-row"><div><b>Перевод C++ в облачке</b><span>Вопросы C++ на английском: в облачке у монстра оригинал, под ним перевод; под вариантами — мелкий перевод.</span></div><label class="sw"><input type="checkbox" id="setCppTr"' + (c2.cppTr !== false ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Звуки</b><span>Удар, ошибка, сундук, победа.</span></div><label class="sw"><input type="checkbox" id="setSound"' + (c2.sound !== false ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Реплики 18+ (мат)</b><span>Монстры иногда матерятся, когда получают урон, бьют или умирают. Выключи — будут только приличные фразы.</span></div><label class="sw"><input type="checkbox" id="setRude"' + (c2.rude !== false ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Автопереход и автопоход</b><span>После ответа сам переходит к следующему вопросу, герой сам идёт к монстрам, сундукам и выходу. Меньше нажатий.</span></div><label class="sw"><input type="checkbox" id="setAutoGo"' + (c2.auto !== false ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Быстрые анимации</b><span>Пауза после ответа 0,5 с вместо 1,5 с, без табличек босса и долгих телепортов — чтобы прогнать больше вопросов.</span></div><label class="sw"><input type="checkbox" id="setFast"' + (c2.fast === true ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Облегчённая графика</b><span>Без частиц, аур и перекраски монстров — для слабых телефонов. Включается сама, если игра тормозит.</span></div><label class="sw"><input type="checkbox" id="setLite"' + (c2.lite === true ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="set-row"><div><b>Вопросы «Знаю»</b><span>Ты отметил «Знаю» у ' + Object.keys(D.save.known || {}).length + ' вопросов — они почти не попадаются. Можно вернуть их все.</span></div><button class="btn ghost" id="setKnown">Вернуть все</button></div>' +
      '<div class="set-row"><div><b>Обучение</b><span>Снова показать подсказки для новичка.</span></div><button class="btn ghost" id="setTut">Показать снова</button></div>' +
      '<div class="set-row"><div><b>Сбросить прогресс</b><span>Удалит освоение, IQ, уровень и предметы на этом устройстве.</span></div><button class="btn warn" id="setReset">Сбросить</button></div>' +
      '<p class="hint">Графика: «Monsters Creatures Fantasy» и «Evil Wizard» (Luiz Melo) и «DungeonTileset II» (0x72) — CC0. Демон-Слизень и Владыка Экзамена: «Boss: Demon Slime» by chierit — CC BY 4.0, chierit.itch.io/boss-demon-slime. Герой, факелы и сцены нарисованы для StudyPlay.</p></div>';
    modal(h, function (el) {
      el.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { c2.trLang = b.getAttribute('data-lang'); D.persist(); openSettings(); }; });
      $('setAuto').onchange = function () { c2.autoTr = this.checked; D.persist(); };
$('setCppTr').onchange = function () { c2.cppTr = this.checked; D.persist(); };
      $('setSound').onchange = function () { c2.sound = this.checked; D.persist(); if (this.checked) sfx('ok'); };
      $('setRude').onchange = function () { c2.rude = this.checked; D.persist(); };
      $('setLite').onchange = function () { c2.lite = this.checked; D.persist(); };
      $('setAutoGo').onchange = function () { c2.auto = this.checked; D.persist(); };
      $('setFast').onchange = function () { c2.fast = this.checked; D.persist(); };
      $('setKnown').onclick = function () { D.save.known = {}; D.persist(); this.textContent = 'Готово ✓'; };
      $('setTut').onclick = function () { S.tips = {}; D.persist(); this.textContent = 'Готово ✓'; };
      $('setReset').onclick = function () { if (this.dataset.sure) { localStorage.removeItem('sp-dungeon-v1'); location.reload(); } else { this.dataset.sure = 1; this.textContent = 'Точно? Нажми ещё раз'; } };
    });
  }

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

  /* --- обучение: подсказки новичку, каждая показывается один раз --- */
  var TIPS = {
    /* новые ключи (…2), чтобы обновлённые подсказки увидели и те, кто уже закрыл старые */
    floor2: 'Комнаты темы идут по порядку — в каждой спросят все её вопросы. Последняя комната — босс: вопросы всей темы. Свои ошибки повторишь у стража на выходе и в «🔁 Повторении» на карте.',
    room2: 'Жми «Идти дальше» (Enter) — герой сам подойдёт к монстру, сундуку или алтарю (если у темы есть лекция). Сердечки монстра = сколько вопросов он задаст.',
    q3: 'Просто выбери ответ (или клавиши 1–5). Застрял — внизу сами появятся «📖 Открыть книгу», потом «Кратко из лекции», потом «🔎 Загуглить». «✓ Знаю» убирает лёгкий вопрос.',
    q2: 'Вопрос задаёт монстр в облачке, варианты — внизу (клавиши 1–5). Не знаешь — «🔎 Google» объяснит ответ, но такой вопрос потом спросит страж. «…» в облачке опускает вопрос вниз.'
  };
  function tipHtml(k) {
    S.tips = S.tips || {}; if (S.tips[k] || !TIPS[k]) return '';
    S.tips[k] = 1; D.persist();
    return '<div class="tip"><b>Обучение</b><span>' + esc(TIPS[k]) + '</span><button class="btn ghost" onclick="this.parentNode.remove()">Понятно</button></div>';
  }

  /* --- лут --- */
  /* серия: LUCK_RUN верных ответов подряд без подсказок → сундук удачи (обычная добыча + гарантированно редкий предмет) */
  var LUCK_RUN = 10;
  function luckChest() {
    var R = G.room; if (!R) return;
    var L = X.loot('chest'), rare = ['ai', 'bigpot', 'ice'][Math.floor(Math.random() * 3)];
    X.add(rare); L.items.push(rare); R.iq += L.iq; sfx('chest'); D.persist(); hud(); refreshHotbar();
    floater('🍀 Серия ' + R.run + '! Сундук удачи', 240, 50, '#97C459');
    var box = document.createElement('div'); box.className = 'luck-box';
    box.innerHTML = '<div class="wave-msg ok">🍀 Серия ' + R.run + ' без ошибок и подсказок — сундук удачи!</div>' + lootHtml(L);
    var anchor = panel.querySelector('.verdict'); if (anchor) anchor.after(box); else panel.appendChild(box);
  }
  function lootHtml(L) {
    var cells = '<div class="loot-it"><span class="iqbig">IQ</span><b>+' + L.iq + '</b></div>';
    L.items.forEach(function (k) { var it = X.ITEMS[k]; cells += '<div class="loot-it" style="border-color:' + X.RAR_COL[it.rar] + '"><img src="' + X.iconUrl(it.icon) + '" alt=""><b>' + esc(it.name) + '</b></div>'; });
    if (L.weapon) { var W = X.WEAPONS[L.weapon]; cells += '<div class="loot-it big" style="border-color:' + X.RAR_COL[W.rar] + '"><span class="rar" style="background:' + X.RAR_COL[W.rar] + '">' + X.RAR[W.rar] + '</span><img src="' + X.iconUrl(W.icon) + '" alt=""><b>' + esc(W.name) + '</b><small>' + esc(W.desc) + '</small></div>'; }
    return '<div class="loot">' + cells + '</div>' + (L.weapon ? '<p class="hint">Новое оружие лежит в рюкзаке — возьми его в руку.</p>' : '');
  }
  function bossLoot() {
    var R = G.room, L = X.loot('boss'); R.iq += L.iq; D.persist(); hud(); roomLabels();
    floater('+' + L.iq + ' IQ', G.hero.x + 60, 120, '#CECBF6');
    setPanel('<div class="qtext">Железный сундук босса!</div>' + lootHtml(L), [btn('Идти дальше', 'primary', 'Enter', goNext), btn('Рюкзак', 'ghost', null, openBag)]); autoLoot();
  }

  /* ---------- клавиатура ---------- */
  document.addEventListener('keydown', function (e) {
    if (G.caveSkip && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { e.preventDefault(); G.caveSkip(); return; }   /* пропустить картинку спуска */
    if (BK) { if (e.key === 'Escape') { e.preventDefault(); closeBook(); } else if (e.key === 'ArrowRight') flip(1); else if (e.key === 'ArrowLeft') flip(-1); else if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); closeBook(); } return; }
    if (G.modal) { if (e.key === 'Escape') closeModal(); else if (e.key === 'Enter' && G.modalEnter && e.target.tagName !== 'BUTTON') { e.preventDefault(); G.modalEnter(); } return; }
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (appEl.classList.contains('watch') && e.key === 'Enter') { e.preventDefault(); return; }
    if (G.scene === 'room' && G.room && G.room.mon && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var lk = e.key.toLowerCase();
      if (lk === 't' || lk === 'е') { e.preventDefault(); toggleTr(); return; }
      var hk = Object.keys(X.ITEMS).filter(function (k) { return X.ITEMS[k].key && X.ITEMS[k].key.toLowerCase() === lk; })[0];
      if (hk) { e.preventDefault(); useItem(hk); return; }
    }
    if ((e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') && G.scene === 'room' && G.room && caveOn(G.room.f)) { e.preventDefault(); openCaveMap(); return; }
    if ((e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') && G.scene === 'room') { e.preventDefault(); openBookRoom(); return; }
    if (e.key === 'Enter' && G.buttons && G.buttons.length) { e.preventDefault(); var b = G.buttons.filter(function (x) { return x.key === 'Enter'; })[0] || G.buttons[0]; b.fn(); return; }
    if (/^[1-9]$/.test(e.key)) { var opts = (G.scene === 'exam' ? screenEl : panel).querySelectorAll('.opt:not([disabled])'); var el = opts[+e.key - 1]; if (el) { e.preventDefault(); el.click(); } }
    /* Esc — меню-пауза (как в играх), Backspace — назад (не во время боя и экзамена) */
    if (e.key === 'Escape') { e.preventDefault(); openMenu(); return; }
    if (e.key === 'Backspace') { if (G.scene !== 'exam' && (G.scene !== 'room' || !G.room || !G.room.mon)) { e.preventDefault(); goBack(); } }
  });

  /* телепорт стража (как эндермен): мерцает и дрожит, сжимается в фиолетовый столб,
     вокруг взлетают и разлетаются частицы; через ~1,4 с остаются только гаснущие искры */
  /* облегчённый режим сам: в бою замеряем кадры; если устойчиво < ~22 кадров/с — выключаем частицы, ауры и перекраску.
     Свёрнутую вкладку не считаем (там кадры редкие нарочно). Выключенный вручную режим больше не включается сам. */
  var PERF = { n: 0, sum: 0 };
  function perfSample(dt) {
    if (S.cfg.lite != null || G.scene !== 'room' || document.visibilityState !== 'visible' || dt <= 0 || dt > 250) return;
    PERF.n++; PERF.sum += dt;
    if (PERF.n >= 150) {
      var avg = PERF.sum / PERF.n; PERF.n = 0; PERF.sum = 0;
      if (avg > 45) { S.cfg.lite = true; D.persist(); toast('Игра тормозила — включён облегчённый режим (без частиц). Выключить: Настройки.', '#FAC775'); }
    }
  }
  /* незваный гость: выходит из двери домика, идёт к герою; после ошибки убегает обратно */
  function drawIntruder(c, t) {
    var I = G.intruder; if (!I) return;
    var fy = A.FLOOR_Y + 8, dt = Math.min(50, t - (I.lt || t)); I.lt = t;
    if (I.target != null && Math.abs(I.x - I.target) > 1) {
      I.x += Math.sign(I.target - I.x) * dt * 0.09;
      if (Math.abs(I.x - I.target) <= 1) { I.x = I.target; if (I.target > 100 && !I.arrived) { I.arrived = true; intruderArrived(); } else if (I.target < 20) { G.intruder = null; hideBubble(); return; } }
    }
    if (I.dead && t - I.st > 900) return;
    c.save(); if (I.dir < 0) { c.translate(I.x * 2, 0); c.scale(-1, 1); }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(I.x, fy, 18, 4, 0, 0, 7); c.fill();
    A.drawMonster(c, I.key, I.dead ? 'death' : I.state, t - I.st, I.x, fy); c.restore();
    if (!I.dead) A.hearts(c, I.x, monTop(I) - 12, I.done && I.q ? 1 : I.hp, 1);
  }
  var TP_MS = 2380;   /* +70% к прежним 1,4 с */
  function tpms() { return fast() ? 900 : TP_MS; }
  function drawTeleport(c, o, dt, fy) {
    if (dt > tpms()) return;
    var k = dt / tpms(), h = A.monHeight(o.key), top = fy - h;
    if (k < 0.55) {
      var a = (1 - k / 0.55) * (Math.floor(dt / 70) % 2 ? 0.55 : 1), jx = (Math.random() - 0.5) * 6 * (k / 0.55 + 0.2);
      c.save(); c.translate(o.x + jx, fy); c.scale(1 - k * 0.9, 1 + k * 0.25); c.translate(-o.x, -fy);
      A.drawMonster(c, o.key, 'idle', dt, o.x, fy, a); c.restore();
    }
    if (k > 0.25 && k < 0.8) {   /* столб света */
      var ca = Math.sin((k - 0.25) / 0.55 * Math.PI);
      c.fillStyle = 'rgba(176,124,255,' + (0.55 * ca).toFixed(3) + ')'; c.fillRect(o.x - 6, top - 30, 12, h + 30);
      c.fillStyle = 'rgba(235,215,255,' + (0.8 * ca).toFixed(3) + ')'; c.fillRect(o.x - 2, top - 30, 4, h + 30);
    }
    for (var i = 0; i < 26; i++) {   /* частицы: у каждой свой угол, скорость и цвет */
      var seed = (i * 97 + o.x * 13) % 360, ang = seed / 57.3, sp = 18 + (i * 37) % 30, life = 0.5 + ((i * 53) % 50) / 100;
      var p = Math.min(1, k / life); if (p >= 1) continue;
      var px = o.x + Math.cos(ang) * sp * p * 1.4, py = fy - h * 0.5 - (i % 3 === 0 ? h * 0.9 * p : Math.sin(ang) * sp * p) - 10 * p;
      c.fillStyle = (i % 3 ? 'rgba(176,124,255,' : 'rgba(240,220,255,') + (1 - p).toFixed(3) + ')';
      var s = i % 4 ? 2 : 3; c.fillRect(Math.round(px), Math.round(py), s, s);
    }
  }
  /* ---------- отрисовка ---------- */
  function draw(t) {
    var rawDt = t - (G.last || t), h = G.hero, dt = Math.min(50, rawDt); G.last = t;
    A.lite = S.cfg.lite === true;
    perfSample(rawDt);
    /* ходьба */
    var walking = false;
    if (h.target != null) {
      var d = h.target - h.x; if (Math.abs(d) < 1.5) { h.x = h.target; h.target = null; var cb = h.onArrive; h.onArrive = null; if (cb) cb(); }
      else { h.x += Math.sign(d) * Math.min(Math.abs(d), dt * 0.12); h.dir = Math.sign(d); walking = true; }
    }
    if (G.scene === 'house') { A.bgHouse(c, t); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(SAGE_X, A.FLOOR_Y + 8, 16, 4, 0, 0, 7); c.fill(); A.drawMonster(c, 'sage', 'idle', t, SAGE_X, A.FLOOR_Y + 8); drawIntruder(c, t); }
    else if (G.scene === 'hall') A.bgHall(c, t);
    else if (G.scene === 'room' && G.room) A.bgRoom(c, t, { theme: themeOf(G.room.f), exit: true, exitOpen: G.room.objs.every(function (o) { return o.type !== 'mon' || o.dead; }), seed: G.room.k, goo: G.room.floor % 3 === 0, hole: G.room.floor % 2 === 0 });
    else return;
    var fy = A.FLOOR_Y + 8;
    /* объекты комнаты */
    if (G.scene === 'room' && G.room) G.room.objs.forEach(function (o) {
      if (o.type === 'altar') { A.altar(c, o.x, fy, t, o.used); return; }
      if (o.type === 'chest') {
        var fr = A.anim[o.open ? 'chest_full_open' : 'chest_full_open'] || [], k = o.open ? Math.min(2, Math.floor((t - (o.openAt || 0)) / 120)) : 0;
        A.frame(c, fr[o.open ? (o.openAt ? k : 2) : 0], o.x - 20, fy - 40, 2.5);
      } else if (o.type === 'mon') {
        if (o.tpAt) { drawTeleport(c, o, t - o.tpAt, fy); return; }   /* страж не умирает — телепортируется */
        if (o.dead && (!o.st || t - o.st > 900)) return;
        var st = o.dead ? 'death' : o.state, rw = A.MON[o.key].boss ? 34 : 22;
        /* кто сейчас спрашивает — тёплое пятно света под ним; остальные чуть бледнее */
        var asking = G.room.mon === o && !o.dead, others = G.room.mon && !G.room.mon.dead && !asking;
        if (asking) { c.fillStyle = 'rgba(250,199,117,' + (0.22 + 0.08 * Math.sin(t / 300)).toFixed(3) + ')'; c.beginPath(); c.ellipse(o.x, fy, rw + 12, 9, 0, 0, 7); c.fill(); }
        if (o.exam && !o.dead && !A.lite) {   /* сверхбосс экзамена: пульсирующая алая аура и искры */
          var pa = 0.18 + 0.1 * Math.sin(t / 260), oh = A.monHeight(o.key);
          var gr = c.createRadialGradient(o.x, fy - oh / 2, 8, o.x, fy - oh / 2, oh * 0.9); gr.addColorStop(0, 'rgba(255,60,60,' + pa.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(120,0,40,0)');
          c.fillStyle = gr; c.fillRect(o.x - oh, fy - oh * 1.6, oh * 2, oh * 1.7);
          for (var si = 0; si < 8; si++) { var sp2 = ((t / 900 + si / 8) % 1); c.fillStyle = 'rgba(255,' + (120 + si * 15) + ',80,' + (1 - sp2).toFixed(2) + ')'; c.fillRect(o.x - 34 + ((si * 37) % 68), fy - 10 - sp2 * oh, 2, 2); }
        }
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(o.x, fy, rw, 5, 0, 0, 7); c.fill();
        if (A.MON[o.key].twin && !o.dead) A.drawMonster(c, o.key, st, t - o.st + 200, o.x + 14, fy, others ? 0.3 : 0.5);   /* «тень» Двойника */
        var MM = A.MON[o.key], mh = A.monHeight(o.key) * (o.big || 1);
        if (MM.el && !o.dead && (o.boss || o.p2)) A.elemAura(c, MM.el, o.x, fy, mh, t, o.p2 ? 2 : 1);   /* аура стихии у боссов */
        A.drawMonster(c, o.key, st, t - o.st, o.x, fy, others ? 0.6 : 1, o.big, o.p2 ? (MM.tint || '') + ' saturate(1.5) brightness(1.15)' : null);
        if (MM.el && !o.dead) A.elemFx(c, MM.el, o.x, fy, mh, t, o.boss ? (o.p2 ? 3 : 2) : 1);   /* частицы стихии */
        if (!o.dead) A.hearts(c, o.x, monTop(o) - 12, o.hp, o.max);
        if (o.summonAt && t - o.summonAt < 900) {   /* пешка появляется в облаке искр */
          var sk = (t - o.summonAt) / 900;
          for (var pi = 0; pi < 18; pi++) { var pang = pi * 0.349, pr = 6 + sk * 34; c.fillStyle = 'rgba(' + (pi % 2 ? '226,75,74' : '250,199,117') + ',' + (1 - sk).toFixed(2) + ')'; c.fillRect(Math.round(o.x + Math.cos(pang) * pr), Math.round(fy - 24 + Math.sin(pang) * pr * 0.7), 3, 3); }
        }
      }
    });
    /* герой */
    {
      var anim = 'idle', f = Math.floor(t / 450);
      if (walking) { anim = 'walk'; f = Math.floor(t / 110); }
      if (h.attackAt && t - h.attackAt < 420) { anim = 'attack'; f = Math.max(0, Math.min(2, Math.floor((t - h.attackAt) / 140))); }
      var hurt = h.hurtAt && t - h.hurtAt < 380; if (hurt) { anim = 'hurt'; f = 0; }
      var lunge = h.attackAt && t - h.attackAt < 420 ? Math.sin((t - h.attackAt) / 420 * Math.PI) * 22 : 0;
      var knock = hurt ? -Math.sin((t - h.hurtAt) / 380 * Math.PI) * 8 : 0;
      var y = fy;
      c.save(); c.globalAlpha = hurt && Math.floor(t / 60) % 2 ? 0.55 : 1;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(h.x + lunge + knock, fy, 18, 4.5, 0, 0, 7); c.fill();
      if (h.dir < 0) { c.translate(h.x * 2, 0); c.scale(-1, 1); }
      A.drawHero(c, anim, f, h.x + (h.dir < 0 ? -1 : 1) * (lunge + knock), y, 1.5);
      c.restore();
      /* дуга удара */
      if (anim === 'attack' && f === 1) { c.strokeStyle = 'rgba(255,243,176,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(h.x + 34, fy - 32, 26, -1.1, 0.9); c.stroke(); }
    }
  }
  /* ошибка в одном кадре не должна останавливать всю игру */
  function loop(t) { requestAnimationFrame(loop); try { draw(t); } catch (e) { if (!loop.warned) { loop.warned = 1; console.error(e); } } }
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

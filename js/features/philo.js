/* =====================================================================
   РАЗДЕЛ «ФИЛОСОФИЯ» (#/philo, #/philo/book/<id блока>) — подготовка к экзамену.
   Вход: Настройки → вкладка «Философия».
   Данные (data/philo/, грузятся при первом открытии, потом есть и без интернета):
     lecture.md     — учебник: 16 тем, у каждого абзаца id {#t1-2-p3};
     questions.json — 500 тестов базы (правильный ответ — первый в o), разбор:
                      k «запомни», y почему верно, e[i] почему неверен вариант i,
                      l — id абзацев учебника, c — спорный ключ, d — повтор вопроса №d;
     extra.json     — 245 новых вопросов в том же виде.
   Тесты: выбираешь набор (база без повторов / новые / ошибки / всё) и тему →
   отвечаешь → снизу карточка: верно или нет, «запомни», почему, почему не твой
   вариант, кусочек учебника и «Подробнее в учебнике» (открывает учебник ровно
   на этом абзаце: выше — начало темы, ниже — продолжение).
   Прогресс — localStorage sp-philo: a { id: { ok, n, w } }, run — текущая тренировка.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var KEY = 'sp-philo', DIR = 'data/philo/';
  var root = null, D = null, loading = null, tab = 'test', anchor = '', fromRun = false, topicView = '', query = '';
  var ui = Object.assign({ src: 'base', topic: '', rnd: true }, (SP.store.get(KEY, {}) || {}).ui || {});

  /* ---------- Данные ---------- */
  function st() { var s = SP.store.get(KEY, null) || {}; s.a = s.a || {}; return s; }
  function save(s) { s.ui = ui; SP.store.set(KEY, s); }
  function load() {
    if (D) return Promise.resolve(D);
    if (loading) return loading;
    var get = function (f, json) { return fetch(DIR + f, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + f); return json ? r.json() : r.text(); }); };
    loading = Promise.all([get('lecture.md'), get('questions.json', 1), get('extra.json', 1)]).then(function (r) {
      var book = parseBook(r[0]), all = {};
      r[1].items.forEach(function (x) { x.src = 'base'; all[x.id] = x; });
      r[2].items.forEach(function (x) { x.src = 'extra'; all[x.id] = x; });
      D = { book: book, base: r[1].items, extra: r[2].items, all: all };
      return D;
    });
    loading.catch(function () { loading = null; });
    return loading;
  }

  /* ---------- Учебник: Markdown → HTML ----------
     # Тема {#t1} · ## раздел {#t1-2} · {#id} перед блоком · абзацы, списки «- », таблицы «|»,
     врезки «> 💡 / ⚠️ / 👤», **жирный**, `код`. Каждый блок помнит тему и раздел. */
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
  }
  function parseBook(md) {
    var lines = md.replace(/\r/g, '').split('\n'), topics = [], blocks = {}, T = null, sec = null, pid = '', buf = [], kind = '', parts = [], plain = [];
    var idOf = function (s) { var m = s.match(/\s*\{#([\w-]+)\}\s*$/); return m ? { id: m[1], text: s.slice(0, m.index).trim() } : { id: '', text: s.trim() }; };
    /* блок может состоять из нескольких частей (абзац + список без пустой строки) — один id на всё */
    function part() {
      if (!buf.length) return;
      var html = '';
      if (kind === 'ul') html = '<ul>' + buf.map(function (l) { return '<li>' + inline(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      else if (kind === 'table') {
        var rows = buf.filter(function (l) { return !/^\|\s*:?-{2,}/.test(l); }).map(function (l) { return l.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); });
        html = '<div class="ph-tw"><table><thead><tr>' + rows[0].map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.slice(1).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      } else if (kind === 'quote') {
        var t = buf.map(function (l) { return l.replace(/^>\s?/, ''); }).join(' ').trim();
        var cls = /^💡/.test(t) ? 'tip' : /^⚠/.test(t) ? 'trap' : /^👤/.test(t) ? 'who' : 'note';
        html = '<div class="ph-call ph-' + cls + '">' + inline(t.replace(/^(💡|⚠️|⚠|👤)\s*/, '')) + '</div>';
      } else html = '<p>' + inline(buf.join(' ')) + '</p>';
      parts.push({ html: html, trap: kind === 'quote' && /ph-trap/.test(html) }); plain.push(buf.join(' ')); buf = []; kind = '';
    }
    function flush() {
      part(); if (!parts.length) { pid = ''; return; }
      var id = pid || ('auto-' + Object.keys(blocks).length);
      /* html — всё (для разбора под тестом); book — без «Ловушек»: они только в тестах */
      var book = parts.filter(function (p) { return !p.trap; }).map(function (p) { return p.html; }).join('');
      blocks[id] = { id: id, html: parts.map(function (p) { return p.html; }).join(''), book: book, topic: T ? T.id : '', sec: sec ? sec.title : (T ? T.title : ''), text: plain.filter(function (_, i) { return !parts[i].trap; }).join(' ').replace(/[*`>|]/g, ' ') };
      if (T) T.blocks.push(id);
      parts = []; plain = []; pid = '';
    }
    lines.forEach(function (l) {
      var m;
      if ((m = l.match(/^#\s+(.+)$/))) { flush(); var h = idOf(m[1]); T = { id: h.id, title: h.text, short: h.text.replace(/^Тема\s+\d+\.\s*/, ''), secs: [], blocks: [] }; topics.push(T); sec = null; return; }
      if ((m = l.match(/^(#{2,3})\s+(.+)$/))) { flush(); var h2 = idOf(m[2]); sec = { id: h2.id, title: h2.text, lvl: m[1].length }; if (T) { T.secs.push(sec); T.blocks.push({ head: sec }); } return; }
      if ((m = l.match(/^\{#([\w-]+)\}\s*$/))) { flush(); pid = m[1]; return; }
      if (!l.trim()) { flush(); return; }
      var k = /^\s*-\s+/.test(l) ? 'ul' : /^\|/.test(l) ? 'table' : /^>/.test(l) ? 'quote' : 'p';
      if (buf.length && k !== kind) part();
      kind = kind || k; buf.push(l);
    });
    flush();
    return { topics: topics, blocks: blocks };
  }
  function topicOf(id) { return D.book.topics.filter(function (t) { return t.id === id; })[0]; }
  function topicHtml(t) {
    return '<h2 class="ph-th" id="ph-' + esc(t.id) + '">' + esc(t.title) + '</h2>' + t.blocks.map(function (b) {
      if (typeof b !== 'string') return '<h3 class="ph-sh" id="ph-' + esc(b.head.id) + '">' + esc(b.head.title) + '</h3>';
      var x = D.book.blocks[b]; if (!x.book) return '';
      return '<div class="ph-b" id="ph-' + esc(b) + '">' + x.book + '</div>';
    }).join('');
  }

  /* ---------- Тренировка ---------- */
  function pool(src, topic, dd) {
    var a = st().a, list;
    if (src === 'extra') list = D.extra.slice();
    else if (src === 'wrong') list = D.base.concat(D.extra).filter(function (x) { return a[x.id] && a[x.id].ok === false; });
    else if (src === 'all') list = D.base.filter(function (x) { return !x.d; }).concat(D.extra);
    else list = D.base.filter(function (x) { return !dd || !x.d; });
    if (src === 'wrong') list = list.filter(function (x) { return !x.d; });
    return topic ? list.filter(function (x) { return x.t === topic; }) : list;
  }
  /* перемешивание с «зерном»: один и тот же вопрос в одной тренировке — тот же порядок вариантов */
  function seeded(seed) {
    var h = 2166136261; for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    var next = function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
    for (var k = 0; k < 6; k++) next();   /* первые числа у похожих зёрен похожи — пропускаем */
    return next;
  }
  function shuffle(arr, seed) { var r = seeded(seed), a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function start() {
    var list = pool(ui.src, ui.topic, true); if (!list.length) return;
    var seed = String(Date.now()), ids = list.map(function (x) { return x.id; });
    var s = st(); s.run = { src: ui.src, topic: ui.topic, ids: ui.rnd ? shuffle(ids, seed) : ids, i: 0, seed: seed, res: {} }; save(s); render();
  }
  /* варианты на экране — вперемешку (в данных правильный всегда первый), но для вопроса порядок постоянный */
  function order(q, seed) { return shuffle(q.o.map(function (_, i) { return i; }), seed + q.id); }
  function answer(oi) {
    var s = st(), r = s.run, q = D.all[r.ids[r.i]]; if (!q || r.res[q.id] != null) return;
    r.res[q.id] = oi;
    var a = s.a[q.id] || { n: 0, w: 0 }; a.n++; if (oi !== 0) a.w++; a.ok = oi === 0; a.t = Date.now(); s.a[q.id] = a;
    save(s); render();
    if (navigator.vibrate) try { navigator.vibrate(oi === 0 ? 8 : [20, 40, 20]); } catch (e) { /* без вибрации */ }
    var card = SP.$('.ph-exp', root); if (card && window.innerWidth < 900) setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
  }
  function step(d) { var s = st(), r = s.run; if (!r) return; r.i = Math.max(0, Math.min(r.ids.length, r.i + d)); save(s); render(); window.scrollTo(0, 0); }

  /* ---------- Отрисовка ---------- */
  function render() {
    if (!root) return;
    var head = SP.pageHead({ title: SP.t('ph.title'), actions: '<a class="btn btn-ghost" href="#/settings">' + SP.icon('arrow-left') + '<span>' + esc(SP.t('nav.settings')) + '</span></a>' });
    var tabs = '<nav class="hw-switch ph-tabs" aria-label="' + esc(SP.t('ph.title')) + '">' +
      '<a href="#/philo"' + (tab === 'test' ? ' aria-current="page"' : '') + '>' + SP.icon('list-checks', 'ic-sm') + '<span>' + esc(SP.t('ph.tests')) + '</span></a>' +
      '<a href="#/philo/book"' + (tab === 'book' ? ' aria-current="page"' : '') + '>' + SP.icon('book-open', 'ic-sm') + '<span>' + esc(SP.t('ph.book')) + '</span></a></nav>';
    if (!D) {
      root.innerHTML = '<div class="page ph-page">' + head + tabs + '<p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('ph.loading')) + '</p></div>';
      load().then(render, function (e) { root.innerHTML = '<div class="page ph-page">' + head + '<div class="alert alert-danger">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(SP.t('ph.loadErr')) + '<br><small>' + esc(e.message) + '</small></div></div></div>'; });
      return;
    }
    var s = st(), body = tab === 'book' ? bookHtml() : s.run && s.run.i < s.run.ids.length ? runHtml(s) : s.run && s.run.i >= s.run.ids.length ? doneHtml(s) : startHtml(s);
    root.innerHTML = '<div class="page ph-page' + (tab === 'book' ? ' wide' : '') + '">' + head + tabs + body + '</div>';
    wire();
    if (tab === 'book') goAnchor();
  }
  function startHtml(s) {
    var a = s.a, base = D.base.filter(function (x) { return !x.d; }), ok = 0, done = 0, wrong = 0;
    base.concat(D.extra).forEach(function (x) { var v = a[x.id]; if (v) { done++; if (v.ok) ok++; else wrong++; } });
    var total = base.length + D.extra.length;
    var srcs = [['base', 'list-checks', base.length], ['extra', 'sparkles', D.extra.length], ['wrong', 'triangle-alert', pool('wrong', '').length], ['all', 'layers', total]];
    var h = '<section class="card ph-stats"><div><b>' + done + '</b><small>' + esc(SP.t('ph.stDone', { n: total })) + '</small></div><div><b>' + (done ? Math.round(ok * 100 / done) : 0) + '%</b><small>' + esc(SP.t('ph.stOk')) + '</small></div><div><b>' + wrong + '</b><small>' + esc(SP.t('ph.stWrong')) + '</small></div></section>';
    h += '<section class="card"><h2 class="section-title">' + esc(SP.t('ph.what')) + '</h2><div class="ph-srcs">' + srcs.map(function (x) {
      return '<button type="button" class="ph-src' + (ui.src === x[0] ? ' on' : '') + '" data-src="' + x[0] + '"' + (x[2] ? '' : ' disabled') + '>' + SP.icon(x[1]) + '<span><b>' + esc(SP.t('ph.src.' + x[0])) + '</b><small>' + esc(SP.t('ph.srcSub.' + x[0], { n: x[2] })) + '</small></span></button>';
    }).join('') + '</div>';
    h += '<h2 class="section-title">' + esc(SP.t('ph.topic')) + '</h2><div class="ph-topics"><button type="button" class="hw-chip' + (ui.topic ? '' : ' on') + '" data-topic="">' + esc(SP.t('hw.all')) + ' <b>' + pool(ui.src, '', true).length + '</b></button>' +
      D.book.topics.map(function (t) {
        var n = pool(ui.src, t.id, true).length; if (!n && ui.src !== 'wrong') return '';
        var all = pool('all', t.id, true), dn = all.filter(function (x) { return a[x.id]; }).length;
        return '<button type="button" class="hw-chip ph-tchip' + (ui.topic === t.id ? ' on' : '') + '" data-topic="' + esc(t.id) + '"' + (n ? '' : ' disabled') + ' style="--p:' + (all.length ? Math.round(dn * 100 / all.length) : 0) + '%">' + esc(t.id.replace('t', '') + '. ' + t.short) + ' <b>' + n + '</b></button>';
      }).join('') + '</div>';
    var n = pool(ui.src, ui.topic, true).length;
    h += '<div class="ph-go"><label class="switch-row"><label class="switch"><input type="checkbox" id="phRnd"' + (ui.rnd ? ' checked' : '') + '><span class="track"></span></label><span>' + esc(SP.t('ph.rnd')) + '</span></label>' +
      '<button type="button" class="btn btn-primary btn-lg" id="phStart"' + (n ? '' : ' disabled') + '>' + SP.icon('play') + '<span>' + esc(SP.t('ph.start', { n: n })) + '</span></button></div></section>';
    h += '<p class="small muted ph-hint">' + SP.icon('info', 'ic-sm') + ' ' + esc(SP.t('ph.hint')) + '</p>';
    return h;
  }
  /* кусочки учебника под разбором; соседние из одного раздела — в одной рамке с одним заголовком */
  function blocksHtml(ids) {
    var groups = [];
    (ids || []).forEach(function (id) {
      var b = D.book.blocks[id]; if (!b) return;
      var last = groups[groups.length - 1];
      if (last && last.topic === b.topic && last.sec === b.sec) last.html += b.html; else groups.push({ topic: b.topic, sec: b.sec, html: b.html });
    });
    return groups.map(function (g) { var t = topicOf(g.topic); return '<div class="ph-snip"><div class="ph-snip-h">' + SP.icon('book-open', 'ic-sm') + esc((t ? t.id.replace('t', 'Тема ') + ' · ' : '') + g.sec) + '</div>' + g.html + '</div>'; }).join('');
  }
  function runHtml(s) {
    var r = s.run, q = D.all[r.ids[r.i]], chosen = r.res[q.id], answered = chosen != null, ord = order(q, r.seed), t = topicOf(q.t);
    var pct = Math.round(r.i * 100 / r.ids.length);
    var h = '<div class="ph-bar"><button type="button" class="btn btn-ghost btn-sm" id="phExit">' + SP.icon('x', 'ic-sm') + '<span>' + esc(SP.t('ph.exit')) + '</span></button>' +
      '<span class="ph-cnt">' + (r.i + 1) + ' / ' + r.ids.length + '</span><span class="ph-prog"><i style="width:' + pct + '%"></i></span></div>';
    h += '<section class="card ph-q"><div class="ph-meta">' + (t ? '<span>' + esc(t.id.replace('t', 'Тема ') + ' · ' + t.short) + '</span>' : '') + '<span>' + esc(q.src === 'extra' ? SP.t('ph.newQ') : SP.t('ph.baseN', { n: q.n })) + '</span></div>' +
      '<h2 class="ph-qt">' + esc(q.q) + '</h2><div class="ph-opts">' + ord.map(function (oi, k) {
        var cls = !answered ? '' : oi === 0 ? ' right' : oi === chosen ? ' wrong' : ' dim';
        return '<button type="button" class="ph-opt' + cls + '" data-o="' + oi + '"' + (answered ? ' disabled' : '') + '><span class="ph-k">' + (k + 1) + '</span><span>' + esc(q.o[oi]) + '</span>' + (answered && oi === 0 ? SP.icon('check', 'ph-mark') : answered && oi === chosen ? SP.icon('x', 'ph-mark') : '') + '</button>';
      }).join('') + '</div></section>';
    if (answered) {
      var ok = chosen === 0;
      h += '<section class="card ph-exp ' + (ok ? 'ok' : 'bad') + '"><div class="ph-res">' + SP.icon(ok ? 'circle-check' : 'circle-x') + '<b>' + esc(ok ? SP.t('ph.right') : SP.t('ph.wrongIs', { a: q.o[0] })) + '</b>' +
        '<button type="button" class="btn btn-sm btn-soft ph-next2" data-next aria-label="' + esc(SP.t('ph.next')) + '">' + SP.icon('arrow-right') + '</button></div>' +
        (q.k ? '<div class="ph-key">' + SP.icon('zap', 'ic-sm') + '<span>' + esc(q.k) + '</span></div>' : '') +
        '<p class="ph-why">' + esc(q.y) + '</p>' +
        (!ok && q.e[chosen] ? '<div class="ph-not"><b>' + esc(SP.t('ph.whyNot', { a: q.o[chosen] })) + '</b> ' + esc(q.e[chosen]) + '</div>' : '') +
        '<details class="ph-others"><summary>' + esc(SP.t('ph.others')) + '</summary><ul>' + q.o.map(function (o, i) { return i && i !== chosen && q.e[i] ? '<li><b>' + esc(o) + '</b> — ' + esc(q.e[i]) + '</li>' : ''; }).join('') + '</ul></details>' +
        (q.c ? '<div class="ph-check">' + SP.icon('triangle-alert', 'ic-sm') + '<span><b>' + esc(SP.t('ph.disputed')) + '</b> ' + esc(q.c) + '</span></div>' : '') +
        blocksHtml(q.l) +
        '<div class="ph-acts">' + (q.l && q.l.length ? '<button type="button" class="btn" id="phMore">' + SP.icon('book-open') + '<span>' + esc(SP.t('ph.more')) + '</span></button>' : '') +
        '<button type="button" class="btn btn-primary" id="phNext">' + esc(SP.t(r.i + 1 >= r.ids.length ? 'ph.finish' : 'ph.next')) + SP.icon('arrow-right') + '</button></div></section>';
    }
    if (r.i > 0) h += '<button type="button" class="btn btn-ghost btn-sm ph-prev" id="phPrev">' + SP.icon('arrow-left', 'ic-sm') + '<span>' + esc(SP.t('ph.prev')) + '</span></button>';
    return h;
  }
  function doneHtml(s) {
    var r = s.run, ok = 0, bad = [];
    r.ids.forEach(function (id) { var v = r.res[id]; if (v === 0) ok++; else if (v != null) bad.push(D.all[id]); });
    var n = Object.keys(r.res).length;
    return '<section class="card ph-done"><div class="ph-big">' + (n ? Math.round(ok * 100 / n) : 0) + '%</div><p>' + esc(SP.t('ph.doneText', { ok: ok, n: n })) + '</p>' +
      (bad.length ? '<details class="ph-others" open><summary>' + esc(SP.t('ph.doneBad', { n: bad.length })) + '</summary><ul>' + bad.map(function (q) { return '<li><b>' + esc(q.q) + '</b><br>' + SP.icon('check', 'ic-sm') + ' ' + esc(q.o[0]) + '</li>'; }).join('') + '</ul></details>' : '') +
      '<div class="ph-acts">' + (bad.length ? '<button type="button" class="btn btn-primary" id="phRetry">' + SP.icon('rotate-ccw') + '<span>' + esc(SP.t('ph.retry', { n: bad.length })) + '</span></button>' : '') +
      '<button type="button" class="btn" id="phNew">' + SP.icon('list-checks') + '<span>' + esc(SP.t('ph.newRun')) + '</span></button></div></section>';
  }
  function bookHtml() {
    var tps = D.book.topics, cur = topicOf(topicView) || tps[0], i = tps.indexOf(cur);
    var toc = '<nav class="ph-toc">' + tps.map(function (t) {
      return '<a href="#/philo/book/' + esc(t.id) + '" class="ph-toc-t' + (t === cur ? ' on' : '') + '">' + esc(t.id.replace('t', '') + '. ' + t.short) + '</a>' +
        (t === cur ? '<div class="ph-toc-s">' + t.secs.filter(function (x) { return x.lvl === 2; }).map(function (x) { return '<a href="#/philo/book/' + esc(x.id) + '">' + esc(x.title) + '</a>'; }).join('') + '</div>' : '');
    }).join('') + '</nav>';
    var res = query.length > 1 ? searchHtml(query) : '';
    return (fromRun ? '<button type="button" class="btn btn-soft ph-back" id="phBack">' + SP.icon('arrow-left') + '<span>' + esc(SP.t('ph.back')) + '</span></button>' : '') +
      '<div class="ph-book"><aside class="ph-side"><div class="input-icon">' + SP.icon('search') + '<input class="input" type="search" id="phSearch" placeholder="' + esc(SP.t('ph.search')) + '" value="' + esc(query) + '"></div>' +
      '<details class="ph-tocbox"' + (window.innerWidth >= 900 ? ' open' : '') + '><summary>' + SP.icon('list') + '<span>' + esc(SP.t('ph.toc')) + '</span></summary>' + toc + '</details></aside>' +
      '<article class="ph-text">' + (res || topicHtml(cur)) +
      (res ? '' : '<div class="ph-pn">' + (i > 0 ? '<a class="btn" href="#/philo/book/' + esc(tps[i - 1].id) + '">' + SP.icon('arrow-left') + '<span>' + esc(tps[i - 1].short) + '</span></a>' : '<span></span>') +
        (i < tps.length - 1 ? '<a class="btn" href="#/philo/book/' + esc(tps[i + 1].id) + '"><span>' + esc(tps[i + 1].short) + '</span>' + SP.icon('arrow-right') + '</a>' : '') + '</div>') + '</article></div>';
  }
  function searchHtml(q) {
    var words = SP.lc(q).split(/\s+/).filter(Boolean), hits = [];
    Object.keys(D.book.blocks).forEach(function (id) { var b = D.book.blocks[id], t = SP.lc(b.text); if (b.book && words.every(function (w) { return t.indexOf(w) >= 0; })) hits.push(b); });
    return '<h2 class="ph-th">' + esc(SP.t('ph.found', { n: hits.length })) + '</h2>' + hits.slice(0, 60).map(function (b) {
      var t = topicOf(b.topic); return '<a class="ph-hit-row" href="#/philo/book/' + esc(b.id) + '"><small>' + esc((t ? t.id.replace('t', 'Тема ') + ' · ' : '') + b.sec) + '</small>' + b.book + '</a>';
    }).join('');
  }
  /* открыть учебник на абзаце: показать его тему, прокрутить, подсветить */
  function goAnchor() {
    if (!anchor) return;
    var el = SP.$('#ph-' + anchor.replace(/[^\w-]/g, ''), root); if (!el) return;
    setTimeout(function () { el.scrollIntoView({ block: /^H/.test(el.tagName) ? 'start' : 'center' }); el.classList.add('ph-hit', 'ph-target'); setTimeout(function () { el.classList.remove('ph-hit'); }, 2600); }, 30);
  }
  function openBook(id) {
    var b = D.book.blocks[id], t = b ? b.topic : (topicOf(id) ? id : (D.book.topics.filter(function (x) { return x.secs.some(function (s) { return s.id === id; }); })[0] || {}).id);
    topicView = t || topicView; anchor = id;
    /* абзац — «Ловушка» (в учебнике её нет): ведём на ближайший абзац выше в той же теме */
    if (b && !b.book) {
      var T = topicOf(b.topic), list = T ? T.blocks.filter(function (x) { return typeof x === 'string'; }) : [], k = list.indexOf(id);
      while (k > 0 && !D.book.blocks[list[k]].book) k--;
      anchor = list[k] && D.book.blocks[list[k]].book ? list[k] : (T ? T.id : id);
    }
  }

  /* ---------- События ---------- */
  function wire() {
    var q = function (s) { return SP.$(s, root); }, on = function (s, fn) { var el = q(s); if (el) el.onclick = fn; };
    SP.$$('[data-src]', root).forEach(function (b) { b.onclick = function () { ui.src = b.getAttribute('data-src'); if (ui.topic && !pool(ui.src, ui.topic, true).length) ui.topic = ''; save(st()); render(); }; });
    SP.$$('[data-topic]', root).forEach(function (b) { b.onclick = function () { ui.topic = b.getAttribute('data-topic'); save(st()); render(); }; });
    var rnd = q('#phRnd'); if (rnd) rnd.onchange = function () { ui.rnd = rnd.checked; save(st()); };
    on('#phStart', start);
    on('#phExit', function () { var s = st(); s.run = null; save(s); render(); });
    SP.$$('[data-o]', root).forEach(function (b) { b.onclick = function () { answer(+b.getAttribute('data-o')); }; });
    on('#phNext', function () { step(1); });
    SP.$$('[data-next]', root).forEach(function (b) { b.onclick = function () { step(1); }; });
    on('#phPrev', function () { step(-1); });
    /* «Подробнее» — на первый абзац разбора, который есть в учебнике (не «Ловушку») */
    on('#phMore', function () { var s = st(), x = D.all[s.run.ids[s.run.i]], id = x.l.filter(function (k) { var b = D.book.blocks[k]; return b && b.book; })[0] || x.l[0]; fromRun = true; SP.navigate('philo', ['book', id]); });
    on('#phBack', function () { fromRun = false; SP.navigate('philo'); });
    on('#phRetry', function () { var s = st(), r = s.run, bad = r.ids.filter(function (id) { var v = r.res[id]; return v != null && v !== 0; }); s.run = { src: r.src, topic: r.topic, ids: bad, i: 0, seed: String(Date.now()), res: {} }; save(s); render(); });
    on('#phNew', function () { var s = st(); s.run = null; save(s); render(); });
    var se = q('#phSearch'); if (se) se.oninput = SP.debounce(function () { query = se.value.trim(); anchor = ''; render(); var n = SP.$('#phSearch', root); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250);
  }
  /* клавиши: 1–5 — ответ, Enter или → — дальше, ← — назад */
  document.addEventListener('keydown', function (e) {
    if (!root || SP.views.current() !== 'philo' || tab !== 'test' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (document.querySelector('.modal-backdrop')) return;
    var s = st(); if (!s.run || s.run.i >= s.run.ids.length || !D) return;
    var x = D.all[s.run.ids[s.run.i]], answered = s.run.res[x.id] != null;
    if (/^[1-5]$/.test(e.key) && !answered) { var b = SP.$$('.ph-opt', root)[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } }
    else if ((e.key === 'Enter' || e.key === 'ArrowRight') && answered) { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  SP.views.register('philo', {
    titleKey: 'ph.title',
    mount: function (el) { root = el; },
    show: function (params) {
      params = params || [];
      if (params[0] === 'book') {
        tab = 'book'; query = '';
        var id = params[1] ? decodeURIComponent(params[1]) : '';
        if (id) { if (D) openBook(id); else load().then(function () { openBook(id); render(); }); } else anchor = '';
      } else { tab = 'test'; anchor = ''; fromRun = false; }
      render();
      if (tab === 'book' && !anchor) window.scrollTo(0, 0);
    },
    refresh: render
  });
})();

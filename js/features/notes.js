/* =====================================================================
   РАЗДЕЛ «КОНСПЕКТЫ»: лекции по предметам прямо на сайте.
   Порядок как в PDF: конспект → вопросы / задачи (ответ раскрывается
   кнопкой) → тест по лекции (как в Тестере) → следующая лекция.
   Данные группы: data/<группа>/notes/index.json и файлы конспектов
   (их готовит автор из PDF, формат описан в docs/ДЛЯ-АВТОРА.md).
   Запоминается место чтения и лучший результат каждого теста.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc;
  var root = null, index = null, indexDir = null, docs = {}, openId = null, quiz = null, obs = null, saveT = 0;

  function dir() { return window.SP_GROUP_DIR ? 'data/' + window.SP_GROUP_DIR + '/' : 'data/'; }
  function getJson(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function loadIndex() {
    if (index && indexDir === dir()) return Promise.resolve(index);
    indexDir = dir(); docs = {};
    return getJson(indexDir + 'notes/index.json').then(function (j) { index = (j && j.notes) || []; return index; }, function () { index = []; return index; });
  }
  function loadDoc(meta) {
    if (docs[meta.id]) return Promise.resolve(docs[meta.id]);
    return getJson(dir() + 'notes/' + meta.file).then(function (d) { docs[meta.id] = d; return d; });
  }
  var posKey = function (id) { return 'sp-notes-pos:' + (window.SP_GROUP_DIR || '') + ':' + id; };
  var bestKey = function (id) { return 'sp-notes-best:' + (window.SP_GROUP_DIR || '') + ':' + id; };

  /* ---------- Список предметов ---------- */
  function renderList() {
    var html = SP.pageHead({ title: SP.t('nav.notes'), sub: esc(SP.t('notes.sub')) });
    if (!index.length) {
      html += '<section class="card"><div class="empty">' + SP.icon('book-open', 'ic-xl') + '<h3>' + esc(SP.t('notes.emptyTitle')) + '</h3><p>' + esc(SP.t('notes.emptyText')) + '</p></div></section>';
    } else {
      html += '<div class="nt-cards">' + index.map(function (m) {
        var pos = SP.store.get(posKey(m.id), null), best = SP.store.get(bestKey(m.id), {}) || {};
        var done = Object.keys(best).length;
        return '<a class="card nt-card" href="#/notes/' + encodeURIComponent(m.id) + '"><span class="nt-card-ic">' + SP.icon('book-open') + '</span>' +
          '<span class="nt-card-body"><b>' + esc(m.short || m.subject) + '</b><span class="small muted">' + esc(m.title || '') + '</span>' +
          '<span class="xsmall subtle">' + esc(pos && pos.label ? SP.t('notes.continue', { where: pos.label }) : SP.t('notes.start')) + (done ? ' · ' + esc(SP.t('notes.testsDone', { n: done })) : '') + '</span></span>' +
          SP.icon('chevron-right') + '</a>';
      }).join('') + '</div>';
      html += '<p class="xsmall subtle">' + esc(SP.t('notes.ruOnly')) + '</p>';
    }
    root.innerHTML = '<div class="page">' + html + '</div>';
  }

  /* ---------- Блоки конспекта ---------- */
  var NOTE_KIND = { 'Запомни': 'remember', 'Важно': 'important', 'Нюанс': 'nuance', 'Совет': 'tip', 'Подсказка': 'tip', 'Ловушка': 'trap', 'Частая ошибка': 'trap', 'Ошибка': 'trap', 'Источник': 'source' };
  function noteHtml(kind, html) {
    var k = NOTE_KIND[kind] || (/^Нюанс/.test(kind) ? 'nuance' : 'remember');
    var icon = k === 'remember' ? 'sparkles' : k === 'trap' ? 'triangle-alert' : k === 'source' ? 'info' : k === 'tip' ? 'circle-help' : 'info';
    return '<aside class="nt-note nk-' + k + '">' + SP.icon(icon, 'ic-sm') + '<div>' + (kind ? '<b>' + esc(kind) + '.</b> ' : '') + html + '</div></aside>';
  }
  function blocksHtml(blocks, ctx) {
    return (blocks || []).map(function (b) { return blockHtml(b, ctx); }).join('');
  }
  function blockHtml(b, ctx) {
    switch (b.t) {
      case 'h': return '<h4 class="nt-h">' + b.html + '</h4>';
      case 'p': return '<p class="nt-p' + (b.cls ? ' ' + b.cls : '') + '">' + b.html + '</p>';
      case 'html': return '<div class="nt-html">' + b.html + '</div>';
      case 'ul': case 'ol': return '<' + b.t + ' class="nt-list">' + b.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</' + b.t + '>';
      case 'table':
        return '<div class="nt-table" tabindex="0"><table>' + b.rows.map(function (r, i) {
          var tag = b.head && i === 0 ? 'th' : 'td';
          return '<tr>' + r.map(function (c) { return '<' + tag + '>' + c + '</' + tag + '>'; }).join('') + '</tr>';
        }).join('') + '</table></div>';
      case 'note': return noteHtml(b.kind, b.html);
      case 'code':
        if (/^Схема/.test(b.cap || '')) return '<figure class="nt-out nt-scheme"><figcaption>' + esc(b.cap) + '</figcaption><pre>' + esc(b.text) + '</pre></figure>';
        return '<figure class="nt-code">' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + E.richHtml('```cpp\n' + b.text + '\n```') + '</figure>';
      case 'out': return '<figure class="nt-out"><figcaption>' + SP.icon('monitor', 'ic-sm') + esc(b.cap || SP.t('notes.out')) + '</figcaption><pre>' + esc(b.text) + '</pre></figure>';
      case 'label': return '<p class="nt-label">' + esc(b.text) + '</p>';
      case 'qa': return qaHtml(b, ctx);
      case 'quiz': return quizCard(b, ctx);
      default: return '';
    }
  }
  function qaHtml(b, ctx) {
    var id = 'nta-' + (ctx.n++);
    var task = !!b.task, refs = (b.refs || []).filter(Boolean);
    var q = task ? '<div class="nt-q"><span class="nt-qn">' + esc(SP.t('notes.task', { n: b.num })) + '</span><b>' + esc(b.title) + '</b></div>' + blocksHtml(b.q, ctx)
      : '<div class="nt-q">' + (b.num ? '<span class="nt-qn">' + esc(b.num) + '</span>' : '') + '<span>' + b.q + '</span></div>';
    var refHtml = refs.length ? '<div class="nt-refs">' + refs.map(function (r) { return '<button type="button" class="chip" data-ref="' + esc(r) + '">' + SP.icon('arrow-up', 'ic-sm') + '<span>' + esc(SP.t('notes.toRef', { r: r })) + '</span></button>'; }).join('') + '</div>' : '';
    var hasA = b.a && b.a.length;
    return '<div class="nt-qa' + (task ? ' is-task' : '') + (ctx.blitz ? ' is-blitz' : '') + '">' + q + refHtml +
      (hasA ? '<button type="button" class="btn btn-sm nt-reveal" aria-expanded="false" aria-controls="' + id + '" data-task="' + (task ? 1 : 0) + '">' + SP.icon('eye', 'ic-sm') + '<span>' + esc(SP.t(task ? 'notes.showSol' : 'notes.show')) + '</span></button>' +
        '<div class="nt-a" id="' + id + '" hidden>' + blocksHtml(b.a, ctx) + (b.own ? '<p class="xsmall subtle nt-own">' + SP.icon('info', 'ic-sm') + esc(SP.t('notes.ownAnswer')) + '</p>' : '') + '</div>' : '') + '</div>';
  }
  function quizCard(b, ctx) {
    var key = ctx.lec.id + ':' + ctx.sec;
    var best = (SP.store.get(bestKey(openId), {}) || {})[key];
    ctx.quizzes[key] = { qs: b.questions, title: ctx.lec.label + ' · ' + SP.t('notes.test') };
    return '<div class="nt-quiz card" data-quiz="' + esc(key) + '"><div class="nt-quiz-start"><span class="nt-quiz-ic">' + SP.icon('list-checks') + '</span>' +
      '<div class="grow"><b>' + esc(SP.t('notes.testTitle', { l: ctx.lec.label })) + '</b><div class="small muted">' + esc(SP.t('notes.testN', { n: b.questions.length })) +
      (best != null ? ' · <span class="text-' + (best >= 90 ? 'success' : best >= 50 ? 'warning' : 'danger') + '">' + esc(SP.t('notes.best', { p: best })) + '</span>' : '') + '</div></div>' +
      '<button type="button" class="btn btn-primary" data-qstart="' + esc(key) + '">' + SP.icon('play') + '<span>' + esc(SP.t(best != null ? 'notes.testAgain' : 'notes.testStart')) + '</span></button></div>' +
      '<div class="nt-quiz-host"></div></div>';
  }
  function secLabel(lec, s) {
    if (s.id) return s.id + ' ' + s.title;
    return s.title || SP.t('notes.sec.text');
  }

  /* ---------- Режим чтения ---------- */
  function renderDoc(meta, d) {
    var ctx = { n: 0, quizzes: {} }, toc = [], refMap = {};
    var body = '';
    if ((d.intro || []).length) {
      body += '<section class="card nt-intro" id="nt-intro"><h2 class="nt-intro-t">' + esc(d.title || meta.title) + '</h2>' + (d.sub ? '<p class="muted small">' + esc(d.sub) + '</p>' : '') +
        blocksHtml(d.intro.filter(function (b) { return !(b.t === 'p' && /^(Философия: подготовка|Подготовка к РК1|Программирование I)/.test((b.html || '').replace(/<[^>]+>/g, ''))); }), ctx) + '</section>';
    }
    d.lectures.forEach(function (lec, li) {
      var lid = 'nt-' + li;
      refMap[lec.n] = lid;
      var items = [];
      body += '<section class="nt-lec" id="' + lid + '" data-label="' + esc(lec.label) + '"><h2 class="nt-lec-t"><span class="nt-lec-n">' + esc(lec.label) + '</span>' + esc(lec.title) + '</h2>';
      if (lec.source) body += noteHtml('Источник', lec.source);
      lec.sections.forEach(function (s, si) {
        var sid = lid + '-' + si;
        if (s.id) refMap[s.id] = sid;
        ctx.lec = lec; ctx.sec = si; ctx.blitz = !!s.blitz;
        var isQ = s.kind === 'qa' || s.kind === 'tasks';
        var title = s.title ? (s.id ? '<span class="nt-sec-id">' + esc(s.id) + '</span>' : '') + esc(s.title) : '';
        var nQa = (s.blocks || []).filter(function (b) { return b.t === 'qa' && b.a && b.a.length; }).length;
        body += '<section class="nt-sec nk-' + s.kind + '" id="' + sid + '" data-label="' + esc(lec.label + (s.title ? ' · ' + (s.id ? s.id + ' ' : '') + s.title : '')) + '">' +
          (title ? '<div class="nt-sec-head"><h3 class="nt-sec-t">' + title + '</h3>' + (isQ && nQa > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-allans="' + sid + '" aria-pressed="false">' + SP.icon('eye', 'ic-sm') + '<span>' + esc(SP.t('notes.showAll')) + '</span></button>' : '') + '</div>' : '') +
          blocksHtml(s.blocks, ctx) + '</section>';
        if (s.title) items.push({ id: sid, label: (s.id ? s.id + ' ' : '') + s.title, kind: s.kind });
      });
      body += '</section>';
      toc.push({ id: lid, label: lec.label, title: lec.title, items: items });
    });
    var tocHtml = '<ol class="nt-toc-list">' + (d.intro && d.intro.length ? '<li><a href="#" data-goto="nt-intro" class="nt-toc-l">' + esc(SP.t('notes.intro')) + '</a></li>' : '') + toc.map(function (t) {
      return '<li><a href="#" data-goto="' + t.id + '" class="nt-toc-l"><b>' + esc(t.label) + '</b> <span>' + esc(t.title) + '</span></a><ol>' + t.items.map(function (it) {
        return '<li><a href="#" data-goto="' + it.id + '" class="nt-toc-s nk-' + it.kind + '">' + esc(it.label) + '</a></li>';
      }).join('') + '</ol></li>';
    }).join('') + '</ol>';
    var focus = document.documentElement.classList.contains('nt-focus');
    root.innerHTML = '<div class="nt">' +
      '<header class="nt-bar"><a class="btn btn-ghost btn-sm nt-back" href="#/notes">' + SP.icon('chevron-left') + '<span>' + esc(SP.t('nav.notes')) + '</span></a>' +
      '<b class="nt-bar-t">' + esc(meta.short || meta.subject) + '</b>' +
      '<div class="nt-bar-a"><button type="button" class="btn btn-ghost btn-sm nt-toc-btn" id="ntToc">' + SP.icon('list') + '<span>' + esc(SP.t('notes.toc')) + '</span></button>' +
      (meta.pdf ? '<a class="btn btn-ghost btn-sm" href="' + esc(encodeURI(meta.pdf)) + '" target="_blank" rel="noopener">' + SP.icon('file-text') + '<span>' + esc(SP.t('notes.pdf')) + '</span></a>' : '') +
      '<button type="button" class="btn btn-sm" id="ntFocus" aria-pressed="' + focus + '">' + SP.icon(focus ? 'minimize' : 'maximize') + '<span>' + esc(SP.t(focus ? 'notes.focusExit' : 'notes.focus')) + '</span></button></div></header>' +
      '<div class="nt-layout"><nav class="nt-toc" aria-label="' + esc(SP.t('notes.toc')) + '">' + tocHtml + '</nav><article class="nt-doc">' + body + '</article></div></div>';
    wireDoc(meta, ctx, refMap, tocHtml);
  }

  function scrollToId(id, smooth) {
    var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    var h = el.querySelector('h2, h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function setReveal(btn, open) {
    var a = document.getElementById(btn.getAttribute('aria-controls')); if (!a) return;
    a.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    var task = btn.getAttribute('data-task') === '1';
    btn.innerHTML = SP.icon(open ? 'eye-off' : 'eye', 'ic-sm') + '<span>' + esc(SP.t(open ? (task ? 'notes.hideSol' : 'notes.hide') : (task ? 'notes.showSol' : 'notes.show'))) + '</span>';
  }
  function stopQuiz() {
    if (!quiz) return;
    try { quiz.q.destroy(); } catch (e) { /* ничего */ }
    var card = quiz.card; quiz = null;
    if (card && card.isConnected) { SP.$('.nt-quiz-host', card).innerHTML = ''; SP.$('.nt-quiz-start', card).hidden = false; }
  }
  function wireDoc(meta, ctx, refMap, tocHtml) {
    var $ = function (s) { return SP.$(s, root); };
    root.onclick = function (e) {
      var g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); scrollToId(g.getAttribute('data-goto'), true); return; }
      var rv = e.target.closest('.nt-reveal');
      if (rv) { setReveal(rv, rv.getAttribute('aria-expanded') !== 'true'); return; }
      var all = e.target.closest('[data-allans]');
      if (all) {
        var on = all.getAttribute('aria-pressed') !== 'true', sec = document.getElementById(all.getAttribute('data-allans'));
        SP.$$('.nt-reveal', sec).forEach(function (b) { setReveal(b, on); });
        all.setAttribute('aria-pressed', String(on));
        all.innerHTML = SP.icon(on ? 'eye-off' : 'eye', 'ic-sm') + '<span>' + esc(SP.t(on ? 'notes.hideAll' : 'notes.showAll')) + '</span>';
        return;
      }
      var rf = e.target.closest('[data-ref]');
      if (rf) {
        var r = rf.getAttribute('data-ref').split(/[–-]/)[0].trim(), target = refMap[r];
        if (!target) { var lec = r.match(/^(\d+[А-Я]?)/); target = lec && refMap[lec[1]]; }
        if (target) scrollToId(target, true);
        return;
      }
      var qs = e.target.closest('[data-qstart]');
      if (qs) {
        var key = qs.getAttribute('data-qstart'), info = ctx.quizzes[key], card = qs.closest('.nt-quiz');
        stopQuiz();
        SP.$('.nt-quiz-start', card).hidden = true;
        var host = SP.$('.nt-quiz-host', card);
        var q = SP.Quiz(host, info.qs, {
          title: info.title,
          onExit: function () { stopQuiz(); card.scrollIntoView({ block: 'center' }); },
          onFinish: function (r) { var best = SP.store.get(bestKey(meta.id), {}) || {}; if (best[key] == null || r.pct > best[key]) { best[key] = r.pct; SP.store.set(bestKey(meta.id), best); } }
        });
        quiz = { q: q, card: card };
        card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    };
    $('#ntToc').onclick = function () {
      var m = SP.modal({ title: SP.t('notes.toc'), body: '<nav class="nt-toc nt-toc-m">' + tocHtml + '</nav>' });
      m.el.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (!g) return; e.preventDefault(); m.close(); setTimeout(function () { scrollToId(g.getAttribute('data-goto'), false); }, 30); });
    };
    $('#ntFocus').onclick = function () { setFocus(!document.documentElement.classList.contains('nt-focus')); };
    /* где я сейчас: подсветка в оглавлении и запоминание места */
    if (obs) obs.disconnect();
    var secs = SP.$$('.nt-sec[data-label], .nt-lec', root), tocLinks = SP.$$('.nt-layout > .nt-toc [data-goto]', root);
    obs = new IntersectionObserver(function () {
      var top = null;
      secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top < window.innerHeight * 0.35) top = s; });
      if (!top) return;
      var id = top.id;
      tocLinks.forEach(function (a) { var on = a.getAttribute('data-goto') === id || (top.closest('.nt-lec') && a.getAttribute('data-goto') === top.closest('.nt-lec').id && a.classList.contains('nt-toc-l')); a.classList.toggle('on', a.getAttribute('data-goto') === id); if (on && a.getAttribute('data-goto') === id) { try { a.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ничего */ } } });
      clearTimeout(saveT); saveT = setTimeout(function () { SP.store.set(posKey(meta.id), { id: id, label: top.getAttribute('data-label') || '' }); }, 400);
    }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    secs.forEach(function (s) { obs.observe(s); });
  }
  function setFocus(on) {
    var html = document.documentElement;
    html.classList.toggle('nt-focus', on);
    try {
      if (on && !document.fullscreenElement && html.requestFullscreen) html.requestFullscreen().catch(function () { });
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { });
    } catch (e) { /* ничего */ }
    var b = SP.$('#ntFocus', root);
    if (b) { b.setAttribute('aria-pressed', String(on)); b.innerHTML = SP.icon(on ? 'minimize' : 'maximize') + '<span>' + esc(SP.t(on ? 'notes.focusExit' : 'notes.focus')) + '</span>'; }
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('nt-focus')) setFocus(false); });

  /* ---------- Маршрут ---------- */
  function show(params) {
    if (!root) return;
    params = params || [];
    var want = params[0] || null;
    /* тот же конспект уже открыт — не перерисовываем, чтобы не сбить место и тест */
    if (want && want === openId && SP.$('.nt-doc', root)) { if (params[1]) scrollToId(params[1], true); return; }
    stopQuiz(); if (obs) { obs.disconnect(); obs = null; } openId = null;
    root.innerHTML = '<div class="page"><p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('notes.loading')) + '</p></div>';
    loadIndex().then(function () {
      var meta = want && index.filter(function (m) { return m.id === want; })[0];
      if (!meta) { setFocus(false); renderList(); return; }
      return loadDoc(meta).then(function (d) {
        openId = meta.id; renderDoc(meta, d);
        var pos = SP.store.get(posKey(meta.id), null);
        var target = params[1] || (pos && pos.id);
        if (target && document.getElementById(target)) setTimeout(function () { scrollToId(target, false); }, 30);
        else window.scrollTo(0, 0);
      });
    }).catch(function () {
      root.innerHTML = '<div class="page"><section class="card"><div class="empty">' + SP.icon('cloud-off', 'ic-xl') + '<h3>' + esc(SP.t('notes.loadError')) + '</h3></div></section></div>';
    });
  }

  SP.views.register('notes', {
    titleKey: 'nav.notes',
    mount: function (el) { root = el; },
    show: function (params) { show(params); },
    hide: function () { stopQuiz(); setFocus(false); },
    refresh: function () { var p = openId ? [openId] : []; openId = null; show(p); }
  });
  SP.on('auth', function () { index = null; docs = {}; if (root && SP.views.current() === 'notes') { openId = null; show([]); } });
})();

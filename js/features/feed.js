/* =====================================================================
   РАЗДЕЛ «ЛЕНТА» (#/feed) — быстрый тест в стиле коротких видео.
   Вопросы из Тестера листаются вверх по одному на весь экран.
   Ответы пишутся в общую память ошибок (SP.mem) и в ошибки файлов
   Тестера, поэтому лента и обычный тест помнят одно и то же.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc, E = SP.testEngine, qid = E.qid;
  var NKEY = 'sp-feed-n', LKEY = 'sp-feed-like';
  var root = null, S = null, io = null, keyOn = false;
  var BGS = [
    ['#3a1c71', '#d76d77'], ['#0f2027', '#2c5364'], ['#41295a', '#2f0743'], ['#134e5e', '#2b8a6e'],
    ['#232526', '#414345'], ['#5f0a87', '#2b1055'], ['#1f1c2c', '#928dab'], ['#870000', '#190a05'],
    ['#0b486b', '#3b8686'], ['#4b134f', '#c94b4b'], ['#1d2b64', '#6f5fa6'], ['#2c3e50', '#bd4f6c']
  ];
  /* значки «как в ленте»: залитые белые */
  var IC = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.2l-1.4-1.3C5.4 15.2 2 12.1 2 8.3 2 5.2 4.4 3 7.4 3c1.7 0 3.4.8 4.6 2.1C13.2 3.8 14.9 3 16.6 3 19.6 3 22 5.2 22 8.3c0 3.8-3.4 6.9-8.6 11.6L12 21.2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M12 2.5C6.5 2.5 2 6.4 2 11.2c0 2.6 1.3 4.9 3.4 6.5l-.7 3.6c-.1.5.4.8.8.6l4-2.1c.8.2 1.6.3 2.5.3 5.5 0 10-3.9 10-8.7S17.5 2.5 12 2.5zM7.5 12.6a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8zm4.5 0a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8zm4.5 0a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8z"/></svg>',
    mark: '<svg viewBox="0 0 24 24"><path d="M6 2.5h12a1.5 1.5 0 011.5 1.5v17.2c0 .6-.7 1-1.2.6L12 17.4l-6.3 4.4c-.5.4-1.2 0-1.2-.6V4A1.5 1.5 0 016 2.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M13.5 3.6v4.1C6.7 8.4 3 12.9 2.5 20.4c0 .4.5.6.8.3 2.4-3.2 5.6-4.7 10.2-4.8v4.3c0 .5.6.8 1 .4l7.8-7.6c.3-.3.3-.8 0-1.1L14.5 3.2c-.4-.4-1-.1-1 .4z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M10.6 2.9a2 2 0 012.8 0l7.5 7.2c.4.4.6.9.6 1.4V20a2 2 0 01-2 2h-4.2a1 1 0 01-1-1v-5.2h-4.6V21a1 1 0 01-1 1H4.5a2 2 0 01-2-2v-8.5c0-.5.2-1 .6-1.4l7.5-7.2z"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M9 18.5V6.2c0-.5.3-.9.8-1l9-2c.6-.1 1.2.3 1.2 1v11.3a3 3 0 11-2-2.8V7.6l-7 1.6v9.3a3 3 0 11-2-2.8z"/></svg>'
  };
  var ic = function (n, c) { return SP.icon(n, c); };

  function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(0) + 'K' : n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'K' : String(n); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function likes() { return SP.store.get(LKEY, {}) || {}; }
  function setLike(id, on) { var l = likes(); if (on) l[id] = Date.now(); else delete l[id]; var k = Object.keys(l); if (k.length > 500) k.sort(function (a, b) { return l[a] - l[b]; }).slice(0, k.length - 500).forEach(function (x) { delete l[x]; }); SP.store.set(LKEY, l); }
  function count() { return parseInt(SP.store.raw(NKEY), 10) || 10; }
  function fileName(q) { var st = SP.bank.state(), f = st.files.filter(function (x) { return x.id === q._f; })[0] || (st.files.length === 1 ? st.files[0] : null); return f ? f.name.replace(/\.[^.]+$/, '') : 'StudyPlay'; }
  function handle(name) { return name.toLocaleLowerCase().replace(/\(.*?\)/g, '').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'studyplay'; }
  function tag(name) { var w = name.replace(/\(.*?\)/g, '').trim().split(/[\s_.,-]+/)[0] || ''; return w ? '#' + w.toLocaleLowerCase() : ''; }
  function initials(name) { var w = name.replace(/\(.*?\)/g, '').trim().split(/\s+/); return ((w[0] || '?')[0] + ((w[1] || '')[0] || '')).toUpperCase(); }
  function rightText(q) { return E.isKb(q) ? q.answer : q.opts.filter(function (o) { return o.right; }).map(function (o) { return o.t; }).join('; '); }

  /* ---------- набор вопросов ---------- */
  function build(tab) {
    SP.bank.sync();
    var all = SP.bank.all(), n = count(), seen = {}, list;
    all = all.filter(function (q) { var id = qid(q); if (seen[id]) return false; seen[id] = 1; return true; });
    if (tab === 'err') list = SP.shuffle(all.filter(function (q) { var id = qid(q); return SP.mem.isBad(id) || (SP.tester.isErr && SP.tester.isErr(q)); })).slice(0, n);
    else if (tab === 'new') list = SP.shuffle(all.filter(function (q) { return !SP.mem.seen(qid(q)); })).slice(0, n);
    else list = SP.mem.pick(all, Math.min(n, all.length), qid);
    S = {
      tab: tab, empty: !all.length, cur: 0, sheet: null,
      items: list.map(function (q) { return { q: Object.assign({}, q, { opts: SP.shuffle((q.opts || []).map(function (o) { return Object.assign({}, o); })) }), id: qid(q), sel: [], ans: null }; })
    };
  }

  /* ---------- разметка ---------- */
  function sizeCls(q) { var L = String(q.q).length + (q.opts || []).reduce(function (s, o) { return s + String(o.t).length; }, 0); return L > 520 ? ' tk-xs' : L > 300 ? ' tk-s' : ''; }
  function slideHtml(it, i) {
    var q = it.q, name = fileName(q), h = hash(it.id), bg = BGS[h % BGS.length], liked = !!likes()[it.id];
    var saved = SP.tester.isErr ? SP.tester.isErr(q) : false;
    var body = '<div class="tk-q">' + E.richHtml(q.q) + '</div>' + (q.img ? E.img(q.img, 'tk-img') : '') +
      (q.n > 1 ? '<div class="tk-multi">' + esc(SP.t('feed.multi', { n: q.n })) + '</div>' : '');
    if (E.isKb(q)) body += '<form class="tk-kb" data-kb="' + i + '"><input class="tk-in" placeholder="' + esc(SP.t('feed.type')) + '" autocomplete="off"><button class="tk-bub tk-go" type="submit">' + esc(SP.t('feed.check')) + '</button></form><div class="tk-kbres"></div>';
    else body += '<div class="tk-opts">' + q.opts.map(function (o, j) {
      return '<button type="button" class="tk-bub" data-o="' + i + '|' + j + '"><span class="tk-l">' + 'ABCDEFGH'[j] + '</span><span class="tk-t">' + E.richHtml(o.t, true) + (o.img ? E.img(o.img, 'tk-oimg') : '') + '</span></button>';
    }).join('') + '</div>' + (q.n > 1 ? '<button type="button" class="tk-bub tk-go" data-chk="' + i + '" hidden>' + esc(SP.t('feed.check')) + '</button>' : '');
    return '<section class="tk-slide" data-i="' + i + '" style="--a:' + bg[0] + ';--b:' + bg[1] + '">' +
      '<div class="tk-body' + sizeCls(q) + '">' + body + '</div>' +
      '<div class="tk-stamp" aria-live="polite"></div>' +
      '<aside class="tk-rail">' +
        '<button type="button" class="tk-av" data-av="' + i + '" style="--a:' + bg[1] + '"><span>' + esc(initials(name)) + '</span><i>+</i></button>' +
        '<button type="button" class="tk-act' + (liked ? ' on' : '') + '" data-like="' + i + '">' + IC.heart + '<b>' + fmt(120 + h % 9800 + (liked ? 1 : 0)) + '</b></button>' +
        '<button type="button" class="tk-act" data-why="' + i + '">' + IC.chat + '<b>' + fmt(3 + (h >>> 7) % 240) + '</b></button>' +
        '<button type="button" class="tk-act tk-mk' + (saved ? ' on' : '') + '" data-save="' + i + '">' + IC.mark + '<b>' + esc(SP.t(saved ? 'feed.saved' : 'feed.save')) + '</b></button>' +
        '<button type="button" class="tk-act" data-share="' + i + '">' + IC.share + '<b>' + fmt(1 + (h >>> 11) % 700) + '</b></button>' +
        '<span class="tk-disc" style="--a:' + bg[0] + '">' + IC.note + '</span>' +
      '</aside>' +
      '<div class="tk-cap"><b>@' + esc(handle(name)) + '</b><p>' + esc(SP.t('feed.qOf', { i: i + 1, n: S.items.length })) + ' ' + esc(tag(name)) + ' #сессия #studyplay</p>' +
        '<div class="tk-music">' + IC.note + '<span><span>' + esc(SP.t('feed.sound', { f: name })) + '&nbsp;&nbsp;·&nbsp;&nbsp;' + esc(SP.t('feed.sound', { f: name })) + '</span></span></div></div>' +
      '<div class="tk-heartpop"></div>' +
    '</section>';
  }
  function endHtml() {
    var a = S.items.filter(function (x) { return x.ans; }), ok = a.filter(function (x) { return x.ans.ok; }).length, bad = a.length - ok, n = S.items.length;
    var pct = n ? Math.round(ok * 100 / n) : 0;
    return '<section class="tk-slide tk-end" style="--a:#141414;--b:#2a2a2a">' +
      '<div class="tk-body"><div class="tk-end-emoji">' + (pct >= 90 ? '🔥' : pct >= 60 ? '😎' : pct >= 30 ? '🙂' : '💀') + '</div>' +
      '<div class="tk-end-big">' + ok + ' / ' + n + '</div>' +
      '<div class="tk-end-sub">' + esc(a.length < n ? SP.t('feed.endSkip', { n: n - a.length }) : SP.t('feed.endSub')) + '</div>' +
      '<div class="tk-end-row"><span class="tk-pill ok">✓ ' + ok + '</span><span class="tk-pill bad">✗ ' + bad + '</span></div>' +
      '<div class="tk-end-btns"><button type="button" class="tk-bub tk-go" data-more>' + esc(SP.t('feed.more', { n: count() })) + '</button>' +
      (bad || S.tab !== 'err' ? '<button type="button" class="tk-bub" data-errs>' + esc(SP.t('feed.onlyErr')) + '</button>' : '') +
      '<a class="tk-bub" href="#/tester">' + esc(SP.t('feed.toTester')) + '</a></div>' +
      '<div class="tk-cnt">' + esc(SP.t('feed.perRound')) + ' ' + [10, 20, 30, 50].map(function (k) { return '<button type="button" class="tk-chip' + (k === count() ? ' on' : '') + '" data-n="' + k + '">' + k + '</button>'; }).join('') + '</div></div>' +
    '</section>';
  }
  function emptyHtml(txt, btn) {
    return '<section class="tk-slide tk-end" style="--a:#141414;--b:#262626"><div class="tk-body"><div class="tk-end-emoji">' + (S.empty ? '📭' : '🎉') + '</div><div class="tk-end-sub">' + esc(txt) + '</div><div class="tk-end-btns">' + btn + '</div></div></section>';
  }
  function render() {
    if (!root) return;
    if (!S) build('fy');
    var slides;
    if (S.empty) slides = emptyHtml(SP.t('feed.noBank'), '<a class="tk-bub tk-go" href="#/tester">' + esc(SP.t('feed.toTester')) + '</a>');
    else if (!S.items.length) slides = emptyHtml(SP.t(S.tab === 'err' ? 'feed.noErr' : 'feed.noNew'), '<button type="button" class="tk-bub tk-go" data-tab="fy">' + esc(SP.t('feed.tabFy')) + '</button>');
    else slides = S.items.map(slideHtml).join('') + endHtml();
    var tab = function (id, k) { return '<button type="button" class="tk-tab' + (S.tab === id ? ' on' : '') + '" data-tab="' + id + '">' + esc(SP.t(k)) + '</button>'; };
    var nav = function (k, icon, label, on) { return '<button type="button" class="tk-nb' + (on ? ' on' : '') + '" data-nav="' + k + '">' + icon + '<span>' + esc(label) + '</span></button>'; };
    root.innerHTML = '<div class="tk"><div class="tk-app">' +
      '<header class="tk-top"><button type="button" class="tk-x" data-close aria-label="' + esc(SP.t('common.close')) + '">' + ic('x') + '</button>' +
        '<nav class="tk-tabs">' + tab('err', 'feed.tabErr') + tab('new', 'feed.tabNew') + tab('fy', 'feed.tabFy') + '</nav>' +
        '<span class="tk-ctr" id="tkCtr"></span></header>' +
      '<div class="tk-feed" id="tkFeed">' + slides + '</div>' +
      '<div class="tk-prog"><i id="tkProg"></i></div>' +
      '<footer class="tk-nav">' + nav('home', IC.home, SP.t('feed.navHome'), true) + nav('tester', ic('list-checks'), SP.t('nav.tester')) +
        '<button type="button" class="tk-plus" data-nav="more" aria-label="' + esc(SP.t('feed.more', { n: count() })) + '"><span>' + ic('plus') + '</span></button>' +
        nav('err', ic('triangle-alert'), SP.t('feed.tabErr')) + nav('me', ic('user'), SP.t('feed.navMe')) + '</footer>' +
      '<div class="tk-sheet-bg" id="tkSheetBg" hidden></div><div class="tk-sheet" id="tkSheet" aria-hidden="true"></div>' +
    '</div></div>';
    wire();
    paintTop();
  }
  function paintTop() {
    var c = SP.$('#tkCtr', root), p = SP.$('#tkProg', root); if (!c || !S) return;
    var n = S.items.length, done = S.items.filter(function (x) { return x.ans; }).length;
    c.textContent = n ? Math.min(S.cur + 1, n) + ' / ' + n : '';
    p.style.width = (n ? done * 100 / n : 0) + '%';
  }

  /* ---------- действия ---------- */
  function slideEl(i) { return SP.$('.tk-slide[data-i="' + i + '"]', root); }
  function stamp(i, ok) {
    var s = SP.$('.tk-stamp', slideEl(i));
    s.className = 'tk-stamp ' + (ok ? 'ok' : 'bad'); s.textContent = ok ? SP.t('feed.right') : SP.t('feed.wrong');
    void s.offsetWidth; s.classList.add('go');
  }
  function finish(i, ok, typed) {
    var it = S.items[i], q = it.q;
    it.ans = { ok: ok, typed: typed };
    SP.mem.record(it.id, ok);
    if (!ok && SP.tester.noteWrong) SP.tester.noteWrong(q, typed);
    if (!ok && navigator.vibrate) try { navigator.vibrate(60); } catch (e) {}
    var sl = slideEl(i); sl.classList.add('done', ok ? 'is-ok' : 'is-bad');
    if (!ok) { var mk = SP.$('[data-save]', sl); mk.classList.add('on'); mk.querySelector('b').textContent = SP.t('feed.saved'); }
    stamp(i, ok); paintTop();
    var end = SP.$('.tk-end', root); if (end) { end.innerHTML = SP.el(endHtml()).innerHTML; wireEnd(); }
    if (!ok) SP.$('[data-why]', sl).classList.add('pulse');
    if (!SP.$('.tk-swipe', sl)) sl.appendChild(SP.el('<div class="tk-swipe">' + ic('chevron-up') + '<span>' + esc(SP.t('feed.swipe')) + '</span></div>'));
  }
  function choose(i, j) {
    var it = S.items[i], q = it.q; if (it.ans) return;
    var sl = slideEl(i), bs = SP.$$('[data-o]', sl);
    if (q.n > 1) {
      var k = it.sel.indexOf(j); if (k >= 0) it.sel.splice(k, 1); else it.sel.push(j);
      bs[j].classList.toggle('sel', it.sel.indexOf(j) >= 0);
      SP.$('[data-chk]', sl).hidden = !it.sel.length;
      return;
    }
    it.sel = [j]; check(i);
  }
  function check(i) {
    var it = S.items[i], q = it.q, sl = slideEl(i), bs = SP.$$('[data-o]', sl);
    var ok = E.checkChoice(q, it.sel);
    bs.forEach(function (b, j) { b.disabled = true; if (q.opts[j].right) b.classList.add('right'); else if (it.sel.indexOf(j) >= 0) b.classList.add('wrong'); });
    var c = SP.$('[data-chk]', sl); if (c) c.hidden = true;
    finish(i, ok, it.sel.map(function (j) { return q.opts[j].t; }).join('; '));
  }
  function checkKb(i, form) {
    var it = S.items[i], q = it.q, inp = SP.$('input', form), v = inp.value.trim(); if (it.ans || !v) return;
    var ok = E.checkKeyboard(q, v); inp.disabled = true; SP.$('button', form).disabled = true;
    inp.classList.add(ok ? 'right' : 'wrong');
    if (!ok) SP.$('.tk-kbres', slideEl(i)).innerHTML = '<div class="tk-bub right"><span class="tk-t">' + esc(q.answer) + '</span></div>';
    inp.blur(); finish(i, ok, v);
  }
  function like(i, pop) {
    var it = S.items[i], sl = slideEl(i), b = SP.$('[data-like]', sl), on = !b.classList.contains('on');
    if (pop && !on) on = true;
    b.classList.toggle('on', on); setLike(it.id, on);
    b.querySelector('b').textContent = fmt(120 + hash(it.id) % 9800 + (on ? 1 : 0));
    if (on) { b.classList.remove('beat'); void b.offsetWidth; b.classList.add('beat'); }
  }
  function heartPop(i, x, y) {
    var h = SP.el('<span class="tk-bigheart" style="left:' + x + 'px;top:' + y + 'px;--r:' + (Math.random() * 40 - 20) + 'deg">' + IC.heart + '</span>');
    SP.$('.tk-heartpop', slideEl(i)).appendChild(h); setTimeout(function () { h.remove(); }, 900);
    like(i, true);
  }
  function save(i) {
    var it = S.items[i], b = SP.$('[data-save]', slideEl(i)), on = !b.classList.contains('on');
    if (SP.tester.toggleErr) SP.tester.toggleErr(it.q, on);
    b.classList.toggle('on', on); b.querySelector('b').textContent = SP.t(on ? 'feed.saved' : 'feed.save');
    SP.toast(SP.t(on ? 'feed.savedT' : 'feed.unsavedT'), on ? 'success' : 'info');
  }
  function share(i) {
    var q = S.items[i].q;
    var txt = String(q.q).replace(/<[^>]+>/g, '') + (E.isKb(q) ? '' : '\n' + q.opts.map(function (o, j) { return 'ABCDEFGH'[j] + ') ' + o.t; }).join('\n')) + '\n— StudyPlay';
    if (navigator.share) navigator.share({ text: txt }).catch(function () {});
    else SP.copyText(txt).then(function () { SP.toast(SP.t('common.copied'), 'success'); });
  }

  /* ---------- нижняя шторка (как комментарии) ---------- */
  function openSheet(html) {
    var sh = SP.$('#tkSheet', root), bg = SP.$('#tkSheetBg', root);
    sh.innerHTML = '<div class="tk-grab"></div>' + html; sh.setAttribute('aria-hidden', 'false'); bg.hidden = false;
    requestAnimationFrame(function () { sh.classList.add('open'); });
    SP.$$('[data-sx]', sh).forEach(function (b) { b.onclick = closeSheet; });
    bg.onclick = closeSheet;
    return sh;
  }
  function closeSheet() {
    var sh = SP.$('#tkSheet', root), bg = SP.$('#tkSheetBg', root); if (!sh) return;
    sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); bg.hidden = true;
  }
  function why(i) {
    var it = S.items[i], q = it.q, h = hash(it.id);
    var head = '<div class="tk-sh-h"><b>' + esc(SP.t('feed.whyTitle', { n: fmt(3 + (h >>> 7) % 240) })) + '</b><button type="button" class="tk-sx" data-sx aria-label="' + esc(SP.t('common.close')) + '">' + ic('x') + '</button></div>';
    var cm = function (av, who, body, cls) { return '<div class="tk-cm"><span class="tk-cav ' + (cls || '') + '">' + av + '</span><div><small>' + esc(who) + '</small><div>' + body + '</div></div></div>'; };
    var body;
    if (!it.ans) body = cm('🙈', 'StudyPlay', esc(SP.t('feed.whyFirst')));
    else body = (it.ans.ok ? '' : cm('✗', SP.t('feed.youSaid'), esc(it.ans.typed || '—'), 'bad')) +
      cm('✓', SP.t('quiz.correct'), esc(rightText(q)), 'ok') +
      (String(q.ex || '').trim() ? cm('📖', SP.t('quiz.explain'), E.richHtml(String(q.ex), true)) : '') +
      cm('🤖', SP.t('feed.aiWho'), esc(SP.t('feed.aiText')));
    var sh = openSheet(head + '<div class="tk-sh-body"><div class="tk-sh-q">' + E.richHtml(q.q, true) + '</div>' + body + '</div>' +
      '<div class="tk-sh-foot"><button type="button" class="tk-ask" data-ai>' + ic('sparkles') + '<span>' + esc(SP.t('feed.askAi')) + '</span></button><button type="button" class="tk-ask2" data-g aria-label="Google">' + ic('search') + '</button></div>');
    SP.$('[data-ai]', sh).onclick = function () { E.google(E.aiPrompt(q), true); };
    SP.$('[data-g]', sh).onclick = function () { E.google(E.aiPrompt(q)); };
  }
  function me() {
    var all = SP.bank.all(), seen = {}, st = { n: 0, learned: 0, bad: 0, fresh: 0 };
    all.forEach(function (q) { var id = qid(q); if (seen[id]) return; seen[id] = 1; st.n++; if (SP.mem.isBad(id)) st.bad++; else if (SP.mem.learned(id)) st.learned++; else if (!SP.mem.seen(id)) st.fresh++; });
    var a = S ? S.items.filter(function (x) { return x.ans; }) : [], ok = a.filter(function (x) { return x.ans.ok; }).length;
    var pct = st.n ? Math.round(st.learned * 100 / st.n) : 0;
    var box = function (v, k) { return '<div class="tk-st"><b>' + v + '</b><small>' + esc(SP.t(k)) + '</small></div>'; };
    openSheet('<div class="tk-sh-h"><b>' + esc(SP.t('feed.navMe')) + '</b><button type="button" class="tk-sx" data-sx aria-label="' + esc(SP.t('common.close')) + '">' + ic('x') + '</button></div>' +
      '<div class="tk-sh-body"><div class="tk-me-av">' + esc(initials((SP.auth && SP.auth.user && SP.auth.user() && SP.auth.user().name) || 'Я')) + '</div>' +
      '<div class="tk-sts">' + box(st.learned, 'feed.stLearned') + box(st.bad, 'feed.stBad') + box(st.fresh, 'feed.stNew') + '</div>' +
      '<div class="tk-bar"><i style="width:' + pct + '%"></i></div><p class="tk-me-p">' + esc(SP.t('feed.stPct', { p: pct, n: st.n })) + '</p>' +
      (a.length ? '<p class="tk-me-p">' + esc(SP.t('feed.stNow', { ok: ok, n: a.length })) + '</p>' : '') + '</div>');
  }

  /* ---------- события ---------- */
  function go(tab) { closeSheet(); build(tab); render(); }
  function wireEnd() {
    var end = SP.$('.tk-end', root); if (!end) return;
    SP.$$('[data-more]', end).forEach(function (b) { b.onclick = function () { go(S.tab === 'err' ? 'fy' : S.tab); }; });
    SP.$$('[data-errs]', end).forEach(function (b) { b.onclick = function () { go('err'); }; });
    SP.$$('[data-n]', end).forEach(function (b) { b.onclick = function () { SP.store.setRaw(NKEY, b.getAttribute('data-n')); SP.$$('[data-n]', end).forEach(function (x) { x.classList.toggle('on', x === b); }); SP.$$('[data-more]', end).forEach(function (x) { x.textContent = SP.t('feed.more', { n: count() }); }); }; });
  }
  function wire() {
    var app = SP.$('.tk-app', root), feed = SP.$('#tkFeed', root);
    SP.$$('[data-tab]', root).forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-tab')); }; });
    SP.$('[data-close]', root).onclick = function () { SP.navigate('tester'); };
    SP.$$('[data-nav]', root).forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-nav');
        if (k === 'tester') SP.navigate('tester');
        else if (k === 'more') go(S.tab === 'err' ? 'fy' : S.tab);
        else if (k === 'err') go('err');
        else if (k === 'me') me();
        else feed.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });
    app.onclick = function (e) {
      var t = e.target.closest('button'); if (!t || !app.contains(t)) return;
      var a;
      if ((a = t.getAttribute('data-o'))) { a = a.split('|'); choose(+a[0], +a[1]); }
      else if ((a = t.getAttribute('data-chk')) != null) check(+a);
      else if ((a = t.getAttribute('data-like')) != null) like(+a);
      else if ((a = t.getAttribute('data-why')) != null) why(+a);
      else if ((a = t.getAttribute('data-save')) != null) save(+a);
      else if ((a = t.getAttribute('data-share')) != null) share(+a);
      else if ((a = t.getAttribute('data-av')) != null) SP.toast(fileName(S.items[+a].q), 'info');
    };
    SP.$$('[data-kb]', root).forEach(function (f) { f.onsubmit = function (e) { e.preventDefault(); checkKb(+f.getAttribute('data-kb'), f); }; });
    /* двойной тап по фону — сердечко */
    var last = 0;
    SP.$$('.tk-slide[data-i]', root).forEach(function (sl) {
      sl.addEventListener('pointerup', function (e) {
        if (e.target.closest('button,input,a,form,.tk-rail')) return;
        var now = Date.now();
        if (now - last < 320) { var r = sl.getBoundingClientRect(); heartPop(+sl.getAttribute('data-i'), e.clientX - r.left, e.clientY - r.top); last = 0; } else last = now;
      });
    });
    wireEnd();
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting && en.target.hasAttribute('data-i')) { S.cur = +en.target.getAttribute('data-i'); paintTop(); } else if (en.isIntersecting) { S.cur = S.items.length; paintTop(); } });
    }, { root: feed, threshold: 0.6 });
    SP.$$('.tk-slide', feed).forEach(function (s) { io.observe(s); });
  }
  function step(d) { var feed = SP.$('#tkFeed', root); if (feed) feed.scrollBy({ top: d * feed.clientHeight, behavior: 'smooth' }); }
  function onKey(e) {
    if (SP.views.current() !== 'feed' || (e.target.closest && e.target.closest('input,textarea')) || document.querySelector('.modal-backdrop')) return;
    if (e.key === 'Escape') { if (SP.$('#tkSheet.open', root)) closeSheet(); else SP.navigate('tester'); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') { e.preventDefault(); step(-1); }
    else if (/^[1-8]$/.test(e.key) && S && S.items[S.cur]) { var b = SP.$$('[data-o]', slideEl(S.cur))[+e.key - 1]; if (b && !b.disabled) b.click(); }
    else if (e.key === 'Enter' && S && S.items[S.cur]) { var c = SP.$('[data-chk]', slideEl(S.cur)); if (c && !c.hidden) c.click(); }
  }

  SP.feed = { open: function () { S = null; SP.navigate('feed'); } };
  SP.views.register('feed', {
    titleKey: 'feed.title',
    mount: function (el) { root = el; },
    show: function () {
      document.documentElement.classList.add('tk-open');
      if (!keyOn) { document.addEventListener('keydown', onKey); keyOn = true; }
      if (!S || !root.firstChild) render();
    },
    hide: function () { document.documentElement.classList.remove('tk-open'); closeSheet(); },
    refresh: function () { render(); }
  });
})();

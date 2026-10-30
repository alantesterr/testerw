/* =====================================================================
   НОВЫЙ ВИД (ui2) — включён у всех. Запасной выход: ?ui2=0 в адресе — старый вид
   (запоминается на устройстве), ?ui2=1 — снова новый.
   Что делает:
   • цвет раздела (html[data-route]) и цветной кружок с иконкой в шапке страницы;
   • Расписание: переключатели (Timetable/Shokan, своё/курс, масштаб, размер блоков)
     собраны в одну кнопку «Вид»; на телефоне она открывается шторкой снизу;
   • Настройки: 9 блоков → 4 вкладки (Вид · Учёба · Данные · Справочник);
   • «Обновлено N мин назад» у оценок и расписания;
   • «Что нового» один раз после обновления; тур для новичков в каждом разделе;
   • Справочник (текст — js/data/guide.js) и горячие клавиши на ПК.
   Стили — css/ui2.css.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var FLAG = 'sp-ui2', NEWS_KEY = 'sp-news-seen', TOUR_KEY = 'sp-tour-done';
  try {
    var q = location.search.match(/[?&]ui2=(\d)/);
    if (q) localStorage.setItem(FLAG, q[1]);
  } catch (e) { /* без хранилища — по умолчанию */ }
  var on = true; try { on = localStorage.getItem(FLAG) !== '0'; } catch (e) { }
  if (!on) { SP.ui2 = null; return; }
  var html = document.documentElement;
  html.classList.add('ui2');

  /* ---------- цвет раздела по адресу ---------- */
  var ICON = { schedule: 'calendar-days', subjects: 'folder', notes: 'book-open', tester: 'list-checks', designer: 'square-pen', grades: 'graduation-cap', player: 'circle-play', settings: 'settings' };
  function route() { return ((location.hash || '').replace(/^#\/?/, '').split('/')[0]) || 'schedule'; }
  function setRoute() { html.setAttribute('data-route', route()); }
  setRoute(); window.addEventListener('hashchange', setRoute);

  /* шапка страницы: цветной кружок с иконкой раздела перед заголовком */
  var basePageHead = SP.pageHead;
  SP.pageHead = function (o) {
    var h = basePageHead(o), ic = ICON[route()];
    return ic ? h.replace('<h1>', '<h1><span class="ph-ic" aria-hidden="true">' + SP.icon(ic) + '</span>') : h;
  };

  /* «Обновлено 10 мин назад» */
  function updChip(ts) {
    if (!ts) return '<span class="ui2-upd none">' + esc(SP.t('ui2.never')) + '</span>';
    var old = Date.now() - ts > 24 * 3600e3;
    return '<span class="ui2-upd' + (old ? ' old' : '') + '" title="' + esc(SP.fmtDateTime ? SP.fmtDateTime(ts) : '') + '">' + esc(SP.t('ui2.updated', { when: SP.relTime(ts) })) + '</span>';
  }
  function tsOf(key, fallback) { var v = SP.store.get(key, 0); if (!v && fallback) v = Date.parse(fallback) || 0; return v; }

  /* ---------- Расписание: кнопка «Вид» ---------- */
  var schOpen = false;
  function schedule(root) {
    var page = SP.$('.sch-page', root); if (!page) return;
    var head = SP.$('.page-head', page), actions = SP.$('.page-actions', head);
    if (!actions) { actions = SP.el('<div class="page-actions"></div>'); head.appendChild(actions); }
    var sub = SP.$('.page-sub', head); if (!sub) { sub = SP.el('<div class="page-sub"></div>'); SP.$('h1', head).parentNode.appendChild(sub); }
    var d = SP.hub.data();
    (SP.$('.row', sub) || sub).insertAdjacentHTML('beforeend', ' ' + updChip(tsOf('sp-tt-last', d.updatedAt)));
    var run = SP.$('#ttRun', actions); if (run) { run.classList.add('btn-primary'); run.classList.remove('btn-sm'); }

    var parts = [];
    var modes = SP.$(':scope > .sch-modes', page); if (modes) parts.push(['ui2.v.mode', 'layers', modes]);
    var src = SP.$('.segmented [data-src]', actions); if (src) parts.push(['ui2.v.src', 'users', src.parentNode]);
    var zm = SP.$('.tt-zm', page); if (zm) parts.push(['ui2.v.zoom', 'zoom-in', zm]);
    var cust = SP.$('.tt-cust', page); if (cust) parts.push(['ui2.v.size', 'move', cust]);
    if (!parts.length) return;
    var host = SP.el('<div class="ui2-pop-host"><button type="button" class="btn ui2-viewbtn" aria-haspopup="dialog" aria-expanded="' + schOpen + '">' + SP.icon('layers') + '<span>' + esc(SP.t('ui2.view')) + '</span>' + SP.icon('chevron-down', 'ic-sm') + '</button>' +
      '<div class="ui2-pop" role="dialog" aria-label="' + esc(SP.t('ui2.view')) + '"' + (schOpen ? '' : ' hidden') + '></div></div>');
    var pop = SP.$('.ui2-pop', host), btn = SP.$('.ui2-viewbtn', host);
    parts.forEach(function (p) {
      var sec = SP.el('<div class="ui2-pop-sec"><div class="ui2-pop-t">' + SP.icon(p[1], 'ic-sm') + '<span>' + esc(SP.t(p[0])) + '</span></div></div>');
      sec.appendChild(p[2]); if (p[2].classList.contains('tt-cust')) p[2].hidden = false; pop.appendChild(sec);
    });
    actions.appendChild(host);
    var back = SP.el('<div class="ui2-back"' + (schOpen ? '' : ' hidden') + '></div>'); page.appendChild(back);
    var set = function (v) { schOpen = v; pop.hidden = !v; back.hidden = !v; btn.setAttribute('aria-expanded', String(v)); };
    btn.onclick = function (e) { e.stopPropagation(); set(!schOpen); };
    /* Shokan: шапка как в приложении — рядом с календарём маленькая кнопка «Вид» */
    var cal = SP.$('.shk-head .shk-cal', page);
    if (cal) {
      var sb = SP.el('<button type="button" class="shk-cal ui2-shk-view" aria-label="' + esc(SP.t('ui2.view')) + '" data-tip="' + esc(SP.t('ui2.view')) + '">' + SP.icon('layers') + '</button>');
      cal.before(sb);
      sb.onclick = function (e) { e.stopPropagation(); set(!schOpen); };
    }
    back.onclick = function () { set(false); };
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function close(e) { if (!document.body.contains(host)) { document.removeEventListener('click', close); return; } if (schOpen && !host.contains(e.target)) set(false); });
    maybeTour('schedule');
  }

  /* ---------- Оценки: только «Обновлено …» в шапке ---------- */
  function grades(root) {
    var head = SP.$('.page-head', root); if (!head || SP.$('.ui2-upd', head)) return;
    var h1 = SP.$('h1', head), sub = SP.$('.page-sub', head);
    if (!sub) { sub = SP.el('<div class="page-sub"></div>'); h1.parentNode.appendChild(sub); }
    sub.insertAdjacentHTML('beforeend', updChip(tsOf('sp-pl-last')));
  }

  /* ---------- Настройки: 4 вкладки ---------- */
  var TABS = [['look', 'sun', ['appearance', 'language']], ['study', 'graduation-cap', ['sync', 'testerPlayer', 'tools']], ['data', 'database', ['account', 'data', 'author']], ['guide', 'book-open', ['about']]];
  var tab = 'look';
  try { tab = sessionStorage.getItem('sp-ui2-tab') || 'look'; } catch (e) { }
  function setTab(t) { tab = t; try { sessionStorage.setItem('sp-ui2-tab', t); } catch (e) { } }
  function settings(root) {
    var page = SP.$('.page', root); if (!page) return;
    var head = SP.$('.page-head', page), G = SP.GUIDE;
    var nav = SP.el('<div class="ui2-tabs" role="tablist" aria-label="' + esc(SP.t('settings.sections')) + '">' + TABS.map(function (t) {
      return '<button type="button" class="ui2-tab" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + SP.icon(t[1]) + '<span>' + esc(SP.t('ui2.tab.' + t[0])) + '</span></button>';
    }).join('') + '</div>');
    head.after(nav);
    var n0 = G.news[0];
    var guide = SP.el('<section class="card settings-sec" id="set-guide"><div class="card-head"><div><h2 class="card-title">' + SP.icon('book-open') + esc(SP.t('ui2.guide')) + '</h2><div class="card-sub">' + esc(SP.t('ui2.guideSub')) + '</div></div>' +
      '<button type="button" class="btn" id="ui2CopyAll">' + SP.icon('copy') + '<span>' + esc(SP.t('ui2.copyAll')) + '</span></button></div>' +
      '<div class="stack"><label class="ui2-gsearch">' + SP.icon('search') + '<input class="input" type="search" id="ui2GSearch" placeholder="' + esc(SP.t('ui2.gSearch')) + '" autocomplete="off"></label>' +
      '<div class="ui2-new">' + SP.icon('sparkles') + '<div class="grow"><b>' + esc(SP.t('ui2.newsT')) + ' · ' + esc(n0.date) + '</b><div class="small">' + esc(n0.items.map(function (i) { return i[2]; }).join(' · ')) + '</div></div><button type="button" class="btn btn-sm" id="ui2News">' + esc(SP.t('common.open')) + '</button></div>' +
      '<div class="ui2-guide" id="ui2Chs">' + G.chapters.map(function (c, i) {
        return '<button type="button" class="ui2-ch" data-ch="' + i + '" style="--cc:var(--c-' + c[0] + ');--cs:var(--c-' + c[0] + '-soft)"><span class="ph-ic">' + SP.icon(c[1]) + '</span><span><b>' + esc(c[2]) + '</b><small>' + esc(c[3]) + '</small></span></button>';
      }).join('') + '</div><div id="ui2GRes" hidden></div>' +
      '<button type="button" class="btn btn-ghost" id="ui2Tour">' + SP.icon('circle-play') + '<span>' + esc(SP.t('ui2.tourAgain')) + '</span></button></div></section>');
    nav.after(guide);
    var paint = function () {
      var keep = TABS.filter(function (t) { return t[0] === tab; })[0][2];
      SP.$$('.settings-sec', page).forEach(function (s) { var id = s.id.replace(/^set-/, ''); s.hidden = id === 'guide' ? tab !== 'guide' : keep.indexOf(id) < 0; });
      SP.$$('.ui2-tab', nav).forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab)); });
    };
    SP.$$('.ui2-tab', nav).forEach(function (b) { b.onclick = function () { setTab(b.getAttribute('data-tab')); paint(); }; });
    SP.$$('[data-ch]', guide).forEach(function (b) { b.onclick = function () { chapter(+b.getAttribute('data-ch')); }; });
    SP.$('#ui2News', guide).onclick = function () { news(true); };
    SP.$('#ui2Tour', guide).onclick = function () { SP.store.set(TOUR_KEY, {}); SP.navigate('schedule'); setTimeout(function () { maybeTour('schedule', true); }, 600); };
    SP.$('#ui2CopyAll', guide).onclick = function () { SP.copyText(G.text()).then(function () { SP.toast(SP.t('ui2.copiedAll'), 'success', { ms: 6000 }); }); };
    /* поиск по справочнику: показываем пункты, где встречаются все слова */
    var gs = SP.$('#ui2GSearch', guide), res = SP.$('#ui2GRes', guide), chs = SP.$('#ui2Chs', guide);
    gs.oninput = SP.debounce(function () {
      /* по началу слова: «обновить» найдёт и «обновление», «оценки» — «оценок» */
      var words = SP.lc(gs.value).split(/[\s,.;:!?«»"]+/).filter(Boolean).map(function (w) { return w.length > 5 ? w.slice(0, w.length - 2) : w; });
      if (!words.length) { res.hidden = true; chs.hidden = false; return; }
      var hits = [];
      G.chapters.forEach(function (c, ci) { c[4].forEach(function (s) { s[1].forEach(function (p) { var hay = SP.lc(c[2] + ' ' + s[0] + ' ' + p); if (words.every(function (w) { return hay.indexOf(w) >= 0; })) hits.push([ci, c, s[0], p]); }); }); });
      chs.hidden = true; res.hidden = false;
      res.innerHTML = hits.length ? '<ul class="ui2-hits">' + hits.slice(0, 30).map(function (h) {
        return '<li><button type="button" class="ui2-hit" data-ch="' + h[0] + '" style="--cc:var(--c-' + h[1][0] + ')"><b>' + esc(h[1][2] + ' · ' + h[2]) + '</b><span>' + esc(h[3]) + '</span></button></li>';
      }).join('') + '</ul>' : '<p class="small muted">' + esc(SP.t('ui2.gNone')) + '</p>';
      SP.$$('[data-ch]', res).forEach(function (b) { b.onclick = function () { chapter(+b.getAttribute('data-ch')); }; });
    }, 150);
    paint();
    maybeTour('settings');
  }
  /* глава справочника в окне */
  function chapter(i) {
    var c = SP.GUIDE.chapters[i];
    SP.modal({ title: c[2], size: 'lg', body: '<div class="ui2-chap" style="--cc:var(--c-' + c[0] + ');--cs:var(--c-' + c[0] + '-soft)"><p class="small muted">' + esc(c[3]) + '</p>' +
      c[4].map(function (s) { return '<h3>' + esc(s[0]) + '</h3><ul>' + s[1].map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>'; }).join('') + '</div>',
      actions: [{ label: SP.t('ui2.ok'), kind: 'primary' }] });
  }

  /* ---------- «Что нового»: один раз после обновления ---------- */
  var newsChecked = false; // туры — только после «Что нового», чтобы два окна не открылись разом
  function news(force) {
    newsChecked = true;
    var G = SP.GUIDE, n = G && G.news[0]; if (!n) return;
    var seen = SP.store.get(NEWS_KEY, '');
    /* новичку (ещё не видел ни одной версии) окно не показываем — у него будет тур */
    var veteran = !!(SP.auth && SP.auth.user && SP.auth.user());
    if (!force && (seen === n.ver || (!seen && !veteran))) { if (!seen) SP.store.set(NEWS_KEY, n.ver); return; }
    SP.store.set(NEWS_KEY, n.ver);
    SP.modal({ title: SP.t('ui2.newsT'), body: '<div class="ui2-news"><p class="small muted">' + esc(n.date) + '</p><ul>' + n.items.map(function (i) {
      return '<li><span class="ph-ic" style="background:var(--c-' + i[0] + '-soft);color:var(--c-' + i[0] + ')">' + SP.icon(i[1]) + '</span><div><b>' + esc(i[2]) + '</b><div class="small muted">' + esc(i[3]) + '</div></div></li>';
    }).join('') + '</ul></div>', actions: [
      { label: SP.t('ui2.toGuide'), icon: 'book-open', onClick: function () { setTab('guide'); SP.navigate('settings'); } },
      { label: SP.t('ui2.ok'), kind: 'primary', icon: 'check', onClick: function () { setTimeout(function () { maybeTour(route()); }, 300); } }] });
  }

  /* ---------- Тур для новичков: подсветка, пульсирующая точка, подсказка ----------
     В каждом разделе 2–3 шага, один раз. Варианты «a|b» — у Shokan и Timetable кнопки разные. */
  var TOURS = {
    schedule: [['.ui2-shk-view|.ui2-viewbtn', 'ts1'], ['.shk-seg|#ttWeek', 'ts2'], ['.shk-card|.tt-l', 'ts3']],
    subjects: [['#sjSearch', 'tf1'], ['.sj-item', 'tf2'], ['#sjAdd|#sjAdd2', 'tf3']],
    tester: [['#tPick', 'tt1'], ['#tCnt', 'tt2'], ['a[href="#/designer"]|#tHelp', 'tt3']],
    grades: [['.jr-card [data-edit]', 'tg1'], ['#jrHow', 'tg2'], ['#jrRun|#jrAdd', 'tg3']],
    player: [['#pPick', 'tp1'], ['#feedCard', 'tp2']],
    settings: [['.ui2-tabs', 'tn1'], ['.ui2-tab[data-tab="guide"]', 'tn2']]
  };
  function vis(sel) {
    var list = sel.split('|');
    for (var k = 0; k < list.length; k++) {
      var all = document.querySelectorAll(list[k]);
      for (var j = 0; j < all.length; j++) { var r = all[j].getBoundingClientRect(); if (r.width > 0 && r.height > 0) return all[j]; }
    }
    return null;
  }
  var touring = false, tourTimer = null;
  function maybeTour(id, force) {
    var done = SP.store.get(TOUR_KEY, {}) || {};
    if (touring || (!force && (done[id] || !newsChecked)) || !TOURS[id]) return;
    if (document.querySelector('.modal-backdrop') && !force) return;
    clearTimeout(tourTimer);
    tourTimer = setTimeout(function () { if (route() === id && !document.querySelector('.modal-backdrop')) tour(id); }, 800);
  }
  function tour(id) {
    var steps = TOURS[id].filter(function (s) { return vis(s[0]); });
    if (!steps.length) return;
    touring = true;
    var box = SP.el('<div class="ui2-tour"><div class="ui2-tour-hole"></div><div class="ui2-tour-dot"></div><div class="ui2-tour-tip" role="dialog" aria-live="polite"></div></div>');
    document.body.appendChild(box);
    var hole = SP.$('.ui2-tour-hole', box), dot = SP.$('.ui2-tour-dot', box), tip = SP.$('.ui2-tour-tip', box), i = 0;
    var finish = function () {
      touring = false; box.remove(); var d = SP.store.get(TOUR_KEY, {}) || {}; d[id] = true; SP.store.set(TOUR_KEY, d);
      window.removeEventListener('resize', show); window.removeEventListener('hashchange', finish); document.removeEventListener('keydown', esc1);
    };
    var esc1 = function (e) { if (e.key === 'Escape') finish(); };
    function show() {
      var el = vis(steps[i][0]); if (!el) { finish(); return; }
      el.scrollIntoView({ block: 'nearest' });
      var r = el.getBoundingClientRect(), pad = 6;
      hole.style.left = (r.left - pad) + 'px'; hole.style.top = (r.top - pad) + 'px'; hole.style.width = (r.width + pad * 2) + 'px'; hole.style.height = (r.height + pad * 2) + 'px';
      dot.style.left = Math.min(innerWidth - 18, r.right - 4) + 'px'; dot.style.top = (r.bottom - 4) + 'px';
      tip.innerHTML = '<div class="t-step">' + esc(SP.t('ui2.step', { i: i + 1, n: steps.length })) + '</div><b>' + esc(SP.t('ui2.' + steps[i][1] + 'T')) + '</b><div class="small muted">' + esc(SP.t('ui2.' + steps[i][1])) + '</div>' +
        '<div class="t-acts"><div class="t-dots">' + steps.map(function (s, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div><span class="grow"></span>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-skip>' + esc(SP.t('ui2.skip')) + '</button><button type="button" class="btn btn-sm btn-primary" data-next>' + esc(SP.t(i === steps.length - 1 ? 'ui2.done' : 'ui2.next')) + '</button></div>';
      var th = tip.offsetHeight || 170, tw = tip.offsetWidth || 320, below = r.bottom + th + 24 < innerHeight;
      tip.style.left = Math.max(12, Math.min(innerWidth - tw - 12, r.left + r.width / 2 - tw / 2)) + 'px';
      tip.style.top = (below ? r.bottom + 18 : Math.max(12, r.top - 18 - th)) + 'px';
      tip.style.animation = 'none'; void tip.offsetWidth; tip.style.animation = '';
      SP.$('[data-skip]', tip).onclick = finish;
      SP.$('[data-next]', tip).onclick = function () { i++; if (i >= steps.length) finish(); else show(); };
      SP.$('[data-next]', tip).focus({ preventScroll: true });
    }
    window.addEventListener('resize', show); window.addEventListener('hashchange', finish); document.addEventListener('keydown', esc1);
    show();
  }

  /* ---------- Горячие клавиши (компьютер) ---------- */
  var ROUTES = ['schedule', 'subjects', 'tester', 'grades', 'player'];
  function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  function keysHelp() {
    var c = SP.GUIDE.chapters.filter(function (x) { return x[1] === 'keyboard'; })[0];
    if (c) chapter(SP.GUIDE.chapters.indexOf(c));
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) return;
    if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); SP.navigate(ROUTES[+e.key - 1]); return; }
    if (e.altKey || typing(e.target) || document.querySelector('.modal-backdrop, .ui2-tour')) return;
    if (e.key === 'Escape' && schOpen) { var vb = document.querySelector('.ui2-viewbtn'); if (vb) vb.click(); return; }
    if (e.key === '/') {
      var s = document.querySelector('.view:not([hidden]) input[type="search"], .view:not([hidden]) #sjSearch');
      if (s) { e.preventDefault(); s.focus(); s.select && s.select(); }
      return;
    }
    if (e.key === '?') { e.preventDefault(); keysHelp(); }
  });

  /* после загрузки: «Что нового» (один раз), потом тур раздела; при переходе — тур нового раздела */
  window.addEventListener('load', function () { setTimeout(function () { news(false); maybeTour(route()); }, 1200); });
  window.addEventListener('hashchange', function () { schOpen = false; maybeTour(route()); });

  SP.ui2 = { schedule: schedule, grades: grades, settings: settings, news: news, tour: tour, chapter: chapter };
})();

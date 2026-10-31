/* =====================================================================
   КАРКАС САЙТА И НАВИГАЦИЯ.
   - Главные разделы (видны всегда): Расписание, Папки с предметами,
     Тестер, Оценки, Плеер. Конспекты открываются из папки предмета.
   - Второстепенное — в «Настройках».
   - Боковая панель: развёрнута (иконка + название), свёрнута (только
     иконки, подсказки при наведении), скрыта (уезжает вверх, остаётся
     маленькая кнопка). На телефоне — нижняя панель из 6 разделов.
   Адрес раздела хранится в ссылке: #/schedule, #/tester и т.д.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;

  var MAIN = [
    { id: 'schedule', icon: 'calendar-days', key: 'nav.schedule' },
    { id: 'subjects', icon: 'folder', key: 'nav.subjects' },
    { id: 'tester', icon: 'list-checks', key: 'nav.tester' },
    { id: 'grades', icon: 'graduation-cap', key: 'nav.grades' },
    { id: 'player', icon: 'circle-play', key: 'nav.player' }
  ];
  var views = {}, mounted = {}, current = null;

  SP.views = {
    register: function (id, def) { views[id] = def; },
    current: function () { return current; },
    get: function (id) { return views[id]; }
  };

  /* ---------- Разметка каркаса ---------- */
  function navItem(it, mobile) {
    if (mobile) {
      return '<a class="bn-item" href="#/' + it.id + '" data-route="' + it.id + '"><span class="bn-pill">' + SP.icon(it.icon) + '</span><span class="bn-label" data-i18n="' + it.key + 'Short"></span></a>';
    }
    return '<a class="nav-item" href="#/' + it.id + '" data-route="' + it.id + '" data-tip-collapsed data-tip-right data-i18n-attr="data-tip:' + it.key + '">' +
      SP.icon(it.icon) + '<span class="sb-label" data-i18n="' + it.key + '"></span></a>';
  }

  function build() {
    var root = document.getElementById('app');
    root.innerHTML =
      '<aside class="sidebar" id="sidebar" data-i18n-attr="aria-label:nav.label">' +
      '  <div class="sb-head">' +
      '    <a class="sb-brand" href="#/schedule"><span class="logo">' + SP.icon('book-open') + '</span><span class="sb-label">StudyPlay</span></a>' +
      '    <button type="button" class="btn btn-ghost btn-icon sb-btn" id="sbToggle" data-tip-right></button>' +
      '  </div>' +
      '  <nav class="sb-nav" data-i18n-attr="aria-label:nav.main">' + MAIN.map(function (x) { return navItem(x); }).join('') + '</nav>' +
      '  <div class="sb-foot">' +
      '    <div class="lang-sw" id="sbLang" role="group"></div>' +
      '    <div class="sb-user" id="sbUser"></div>' +
      '    <a class="nav-item" href="#/settings" data-route="settings" data-tip-collapsed data-tip-right data-i18n-attr="data-tip:nav.settings">' + SP.icon('settings') + '<span class="sb-label" data-i18n="nav.settings"></span></a>' +
      '    <button type="button" class="nav-item" id="sbHide" data-tip-collapsed data-tip-right data-i18n-attr="data-tip:nav.hidePanel">' + SP.icon('arrow-up') + '<span class="sb-label" data-i18n="nav.hidePanel"></span></button>' +
      '  </div>' +
      '</aside>' +
      '<button type="button" class="sb-restore" id="sbRestore" data-i18n-attr="aria-label:nav.showPanel;data-tip:nav.showPanel">' + SP.icon('menu') + '</button>' +
      '<main class="main" id="main">' +
      /* телефон: сверху только название раздела (язык — в Настройках → Вид, сами Настройки — в нижней панели) */
      '  <header class="mobile-bar"><span class="title" id="mobileTitle"></span></header>' +
      '  <div id="views"></div>' +
      '</main>' +
      '<nav class="bottom-nav" id="bottomNav" data-i18n-attr="aria-label:nav.main"></nav>';
    paintBottom();
    SP.on('settings', function (e) { if (e.key === 'phonePlayer') { paintBottom(); markCurrent(); } });

    SP.$('#sbToggle').onclick = function () {
      SP.settings.set('sidebar', SP.settings.get('sidebar') === 'collapsed' ? 'expanded' : 'collapsed');
    };
    SP.$('#sbHide').onclick = function () { SP.settings.set('sidebar', 'hidden'); SP.$('#sbRestore').focus(); };
    SP.$('#sbRestore').onclick = function () { SP.settings.set('sidebar', 'expanded'); };
    paintToggle();
    renderUser();
    paintLang();
    SP.on('settings', function (e) { if (e.key === 'sidebar') paintToggle(); });
    SP.on('lang', function () { paintToggle(); renderUser(); setTitle(); paintLang(); Object.keys(mounted).forEach(function (id) { if (views[id].refresh) views[id].refresh(); }); });
    SP.on('auth', renderUser);
  }

  /* Нижняя панель (телефон): Расписание · Папки · Тестер · Оценки · Настройки;
     «Плеер» — только если включён в Настройках → Вид (тогда 6 вкладок, Плеер перед Настройками) */
  var SETTINGS_TAB = { id: 'settings', icon: 'settings', key: 'nav.settings' };
  function paintBottom() {
    var nav = SP.$('#bottomNav'); if (!nav) return;
    var items = MAIN.filter(function (x) { return x.id !== 'player' || SP.settings.get('phonePlayer'); }).concat([SETTINGS_TAB]);
    nav.style.setProperty('--bn-n', items.length);
    nav.innerHTML = items.map(function (x) { return navItem(x, true); }).join('');
    SP.applyI18n(nav);
  }
  function markCurrent() {
    var id = current;
    SP.$$('[data-route]').forEach(function (a) {
      var on = a.getAttribute('data-route') === id || (id === 'designer' && a.getAttribute('data-route') === 'settings') || (id === 'notes' && a.getAttribute('data-route') === 'subjects');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* Переключатель языка RU / KZ / EN (панель и мобильная шапка), синхронизирован с Настройками */
  function paintLang() {
    ['#sbLang', '#mbLang'].forEach(function (sel) {
      var box = SP.$(sel); if (!box) return;
      box.setAttribute('aria-label', SP.t('settings.language'));
      box.innerHTML = SP.LANGS.map(function (l) {
        return '<button type="button" data-setlang="' + l.code + '" aria-pressed="' + (SP.lang() === l.code) + '" aria-label="' + SP.esc(l.name) + '" data-tip="' + SP.esc(l.name) + '"' + (sel === '#sbLang' ? ' data-tip-right' : '') + '>' + l.short + '</button>';
      }).join('');
      SP.$$('[data-setlang]', box).forEach(function (b) { b.onclick = function () { SP.settings.set('lang', b.getAttribute('data-setlang')); var n = SP.$(sel + ' [data-setlang="' + SP.lang() + '"]'); if (n) n.focus(); }; });
    });
  }

  function paintToggle() {
    var b = SP.$('#sbToggle'); if (!b) return;
    var collapsed = SP.settings.get('sidebar') === 'collapsed';
    b.innerHTML = SP.icon(collapsed ? 'panel-left-open' : 'panel-left-close');
    var label = SP.t(collapsed ? 'nav.expand' : 'nav.collapse');
    b.setAttribute('aria-label', label); b.setAttribute('data-tip', label);
    b.setAttribute('aria-expanded', String(!collapsed));
  }

  function renderUser() {
    var u = SP.auth && SP.auth.user(), el = SP.$('#sbUser'); if (!el) return;
    if (!u) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    var initials = String(u.name || u.login || '?').split(/\s+/).map(function (x) { return x[0] || ''; }).join('').slice(0, 2).toUpperCase();
    el.innerHTML = '<span class="avatar" aria-hidden="true">' + SP.esc(initials) + '</span><span class="meta"><b>' + SP.esc(u.name || u.login) + '</b><small>' + SP.esc(u.group || (u.guest ? SP.t('auth.guestShort') : '')) + '</small></span>';
    el.setAttribute('data-tip', u.name || u.login); el.setAttribute('data-tip-collapsed', ''); el.setAttribute('data-tip-right', '');
  }

  function setTitle() {
    var v = current && views[current];
    var title = v ? SP.t(v.titleKey) : 'StudyPlay';
    document.title = title + ' · StudyPlay';
    var mt = SP.$('#mobileTitle'); if (mt) mt.textContent = title;
  }

  /* ---------- Маршрутизация ---------- */
  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/');
    return { id: h[0] || 'schedule', params: h.slice(1).map(decodeURIComponent) };
  }
  function go() {
    var r = parse();
    if (!views[r.id]) r = { id: 'schedule', params: [] };
    if (current && current !== r.id && views[current].hide) views[current].hide();
    var host = SP.$('#views');
    Object.keys(mounted).forEach(function (id) { mounted[id].hidden = id !== r.id; });
    if (!mounted[r.id]) {
      var el = document.createElement('section');
      el.className = 'view view-' + r.id; el.setAttribute('data-view', r.id);
      host.appendChild(el); mounted[r.id] = el;
      views[r.id].mount(el, r.params);
    }
    var changed = current !== r.id;
    current = r.id;
    if (views[r.id].show) views[r.id].show(r.params);
    markCurrent();
    setTitle();
    if (changed) window.scrollTo(0, 0);
  }
  SP.navigate = function (id, params) {
    var h = '#/' + id + (params && params.length ? '/' + params.map(encodeURIComponent).join('/') : '');
    if (location.hash === h) go(); else location.hash = h;
  };

  SP.shell = {
    start: function () {
      build();
      SP.applyI18n(document);
      window.addEventListener('hashchange', go);
      go();
    },
    renderUser: renderUser
  };

  /* «На весь экран»: прячет меню сайта (и включает полноэкранный режим браузера, где он есть).
     Кнопку даёт SP.focus.btn(); работает в папках, Тестере и конспектах. */
  function isFocus() { return document.documentElement.classList.contains('nt-focus'); }
  function paintFocus() {
    var on = isFocus();
    SP.$$('[data-spfocus]').forEach(function (b) {
      var lbl = SP.t(on ? 'notes.focusExit' : 'notes.focus'), icOnly = b.hasAttribute('data-icon-only');
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('data-tip', lbl); b.setAttribute('aria-label', lbl);
      b.innerHTML = SP.icon(on ? 'minimize' : 'maximize') + (icOnly ? '' : '<span>' + SP.esc(lbl) + '</span>');
    });
  }
  function setFocus(on) {
    var html = document.documentElement;
    html.classList.toggle('nt-focus', on);
    try {
      if (on && !document.fullscreenElement && html.requestFullscreen) html.requestFullscreen().catch(function () { });
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { });
    } catch (e) { /* браузер без полного экрана — достаточно спрятать меню */ }
    paintFocus(); SP.emit('focus', on);
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && isFocus()) setFocus(false); });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-spfocus]'); if (b) { e.preventDefault(); setFocus(!isFocus()); } });
  SP.focus = {
    is: isFocus, set: setFocus, paint: paintFocus,
    btn: function (iconOnly, cls) {
      var on = isFocus(), lbl = SP.t(on ? 'notes.focusExit' : 'notes.focus');
      return '<button type="button" class="btn ' + (cls || '') + (iconOnly ? ' btn-icon' : '') + '" data-spfocus' + (iconOnly ? ' data-icon-only' : '') + ' aria-pressed="' + on + '" aria-label="' + SP.esc(lbl) + '" data-tip="' + SP.esc(lbl) + '">' + SP.icon(on ? 'minimize' : 'maximize') + (iconOnly ? '' : '<span>' + SP.esc(lbl) + '</span>') + '</button>';
    }
  };

  /* Шапка страницы: заголовок + подпись + действия справа */
  SP.pageHead = function (o) {
    return '<header class="page-head"><div><h1>' + SP.esc(o.title) + '</h1>' + (o.sub ? '<div class="page-sub">' + o.sub + '</div>' : '') + '</div>' +
      (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '') + '</header>';
  };
})();

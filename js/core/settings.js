/* =====================================================================
   НАСТРОЙКИ ИНТЕРФЕЙСА: тема, размер шрифта, язык, сайдбар,
   язык перевода в тестере и плеере, предупреждение плеера.
   Хранятся в localStorage под ключом «sp-settings».
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var KEY = 'sp-settings';
  var DEFAULTS = {
    theme: 'system',     // light | dark | system
    font: 'm',           // s | ms | m | l  (маленький, меньше среднего, средний, большой)
    lang: 'ru',          // ru | kk | en
    trLang: 'ru',        // язык перевода вопросов: ru | kk
    warnSec: 30,         // за сколько секунд плеер предупреждает о вопросах
    sidebar: 'expanded', // expanded | collapsed | hidden
    stopwatch: false     // показывать плавающий секундомер
  };
  var s = Object.assign({}, DEFAULTS, SP.store.get(KEY, {}) || {});

  /* Перенос старой настройки темы со старого сайта */
  if (!SP.store.get(KEY)) {
    var old = SP.store.raw('studyplay-hub-theme');
    if (old === 'light' || old === 'dark') s.theme = old;
  }

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() { return s.theme === 'system' ? (mq && mq.matches ? 'dark' : 'light') : s.theme; }

  function apply() {
    var html = document.documentElement;
    html.setAttribute('data-theme', resolvedTheme());
    html.setAttribute('data-font', s.font);
    html.setAttribute('data-sidebar', s.sidebar);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme() === 'dark' ? '#161a21' : '#ffffff');
  }

  SP.settings = {
    get: function (k) { return s[k]; },
    all: function () { return Object.assign({}, s); },
    set: function (k, v) {
      if (s[k] === v) return;
      var html = document.documentElement;
      if (k === 'theme') { html.classList.add('theme-anim'); setTimeout(function () { html.classList.remove('theme-anim'); }, 400); }
      s[k] = v; SP.store.set(KEY, s); apply();
      if (k === 'lang') SP.setLang(v);
      SP.emit('settings', { key: k, value: v });
    },
    resolvedTheme: resolvedTheme,
    apply: apply
  };

  if (mq) {
    var onChange = function () { if (s.theme === 'system') { apply(); SP.emit('settings', { key: 'theme', value: 'system' }); } };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
  apply();
})();

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
    stopwatch: false,    // показывать плавающий секундомер
    schShk: 'std',       // размер расписания Shokan: std | sm | xs (от общего размера)
    schTt: 'std',        // размер расписания Timetable: std | sm | xs
    autoTr: false,       // автоперевод вопросов в тесте
    hotkeys: true        // горячие клавиши в тесте
  };
  /* Размеры по умолчанию зависят от устройства:
     телефон — шрифт «меньше среднего», Shokan «меньше», Timetable «стандарт»;
     ПК — шрифт «средний», Shokan «стандарт», Timetable «меньше». */
  var phone = window.matchMedia && (window.matchMedia('(max-width: 767px)').matches || window.matchMedia('(pointer: coarse) and (max-width: 1024px)').matches);
  var SIZES_BY = { phone: { font: 'ms', schShk: 'sm', schTt: 'std' }, pc: { font: 'm', schShk: 'std', schTt: 'sm' } };
  var SIZES = SIZES_BY[phone ? 'phone' : 'pc'];
  Object.assign(DEFAULTS, SIZES, { device: phone ? 'phone' : 'pc' });
  var s = Object.assign({}, DEFAULTS, SP.store.get(KEY, {}) || {});
  /* Один раз применяем эти размеры у всех, кто уже пользовался сайтом */
  if (!s.sizesV2) { Object.assign(s, SIZES); s.sizesV2 = true; SP.store.set(KEY, s); }
  /* Вид расписания по устройству: телефон — Shokan «Неделя», ПК — Timetable (один раз для всех, дальше — выбор человека) */
  var UI_KEY = 'sp-schedule-ui2';
  function schedDefaults(dev) {
    var ui = SP.store.get(UI_KEY, {}) || {};
    ui.mode = dev === 'phone' ? 'shokan' : 'timetable'; ui.view = 'week';
    SP.store.set(UI_KEY, ui);
  }
  if (!s.deviceV1) { schedDefaults(s.device); s.deviceV1 = true; SP.store.set(KEY, s); }

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
    html.setAttribute('data-sch-shk', s.schShk);
    html.setAttribute('data-sch-tt', s.schTt);
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
    /* Устройство (телефон / ПК): определяется само, можно сменить при входе и в Настройках.
       Ставит размеры и вид расписания, которые удобны на этом устройстве. */
    detected: phone ? 'phone' : 'pc',
    applyDevice: function (dev) {
      dev = dev === 'phone' ? 'phone' : 'pc';
      var sz = SIZES_BY[dev];
      Object.keys(sz).forEach(function (k) { SP.settings.set(k, sz[k]); });
      SP.settings.set('device', dev);
      schedDefaults(dev);
      SP.emit('device', dev);
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

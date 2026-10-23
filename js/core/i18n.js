/* =====================================================================
   ПЕРЕВОДЫ (RU / KZ / EN).
   Тексты лежат в js/i18n/ru.js, kk.js, en.js — один ключ = одна строка.
   В коде:   SP.t('nav.schedule')            → «Расписание»
             SP.t('tester.loaded', {n: 5})   → подстановка {n}
   В HTML:   <span data-i18n="nav.schedule"></span>
             <input data-i18n-attr="placeholder:auth.login">
   Если строки нет в выбранном языке — берётся русская.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  SP.I18N = SP.I18N || {};
  SP.LANGS = [
    { code: 'ru', name: 'Русский', locale: 'ru-RU', short: 'RU' },
    { code: 'kk', name: 'Қазақша', locale: 'kk-KZ', short: 'KZ' },
    { code: 'en', name: 'English', locale: 'en-GB', short: 'EN' }
  ];
  var lang = 'ru';

  SP.lang = function () { return lang; };
  SP.locale = function () { var l = SP.LANGS.filter(function (x) { return x.code === lang; })[0]; return l ? l.locale : 'ru-RU'; };

  function lookup(dict, key) { return dict && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : undefined; }

  SP.t = function (key, params) {
    var v = lookup(SP.I18N[lang], key);
    if (v === undefined) v = lookup(SP.I18N.ru, key);
    if (v === undefined) return key;
    /* Формы множественного числа: { one, few, many, other } */
    if (v && typeof v === 'object') {
      var n = params && typeof params.n === 'number' ? params.n : 0, cat = 'other';
      try { cat = new Intl.PluralRules(SP.locale()).select(n); } catch (e) { cat = n === 1 ? 'one' : 'other'; }
      v = v[cat] || v.other || v.many || v.one || '';
    }
    if (params) {
      v = String(v).replace(/\{(\w+)\}/g, function (m, k) { return params[k] != null ? params[k] : m; });
    }
    return v;
  };

  /* Перевести все элементы с data-i18n внутри root */
  SP.applyI18n = function (root) {
    root = root || document;
    SP.$$('[data-i18n]', root).forEach(function (el) { el.textContent = SP.t(el.getAttribute('data-i18n')); });
    SP.$$('[data-i18n-attr]', root).forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p.length === 2) el.setAttribute(p[0].trim(), SP.t(p[1].trim()));
      });
    });
  };

  SP.setLang = function (code, silent) {
    if (!SP.I18N[code]) code = 'ru';
    lang = code;
    document.documentElement.lang = code === 'kk' ? 'kk' : code;
    SP.applyI18n(document);
    if (!silent) SP.emit('lang', code);
  };
})();

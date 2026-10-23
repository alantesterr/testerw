/* =====================================================================
   Группы и папки курса (data/groups.json) + тексты ошибок.
   Сетевых запросов к Platonus/Timetable здесь нет: сайт статический,
   данные приходят файлами.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;

  SP.api = {
    configured: function () { return false; },
    errorText: function (res) {
      var code = (res && res.code) || 'UNKNOWN', key = 'err.' + code, txt = SP.t(key);
      return txt === key ? SP.t('err.UNKNOWN') : txt;
    }
  };

  /* ---------- Группа → папка материалов курса ---------- */
  var TR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ғ': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'i', 'к': 'k', 'қ': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'ң': 'n', 'о': 'o', 'ө': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ұ': 'u', 'ү': 'u', 'ф': 'f', 'х': 'h', 'һ': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'і': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ә': 'a' };
  var nk = function (s) { return String(s || '').toUpperCase().replace(/[^0-9A-ZА-ЯЁҒҚҢӨҰҮІӘҺ]/g, ''); };
  SP.slug = function (g) {
    return String(g || '').toLowerCase().split('').map(function (c) { return TR[c] !== undefined ? TR[c] : c; }).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };
  var groups = SP.store.get('sp-groups-cache', { groups: [] });
  SP.groups = {
    list: function () { return (groups && groups.groups) || []; },
    load: function () {
      if (location.protocol === 'file:') return Promise.resolve(SP.groups.list());
      return fetch('data/groups.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (j && Array.isArray(j.groups)) { groups = j; SP.store.set('sp-groups-cache', j); }
        return SP.groups.list();
      }).catch(function () { return SP.groups.list(); });
    },
    resolve: function (name) {
      if (!name) return null;
      var g = SP.groups.list().filter(function (x) { return nk(x.name) === nk(name); })[0];
      return { name: g ? g.name : String(name).trim(), folder: (g && g.folder) || SP.slug(name), legacy: !!(g && g.legacy) };
    }
  };
})();

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
  /* ---------- Формат названия группы: БУКВЫ-123, пометка в скобках маленькими: «ИР-252 (уск)» ---------- */
  var L_UP = 'A-ZА-ЯЁӘҒҚҢӨҰҮҺІ', L_ANY = 'A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі';
  var VALID = new RegExp('^[' + L_UP + ']{1,5}-\\d{3}( \\([' + L_ANY.toLowerCase() + 'a-zа-яё]+\\))?$');
  SP.group = {
    /* «ир252уск» → «ИР-252 (уск)»; при наборе ставит дефис сам */
    format: function (raw, typing) {
      var s = String(raw || '').trim(); if (!s) return '';
      var m = s.match(new RegExp('^\\s*([' + L_ANY + ']*)\\s*(-?)\\s*(\\d{0,3})\\s*\\(?\\s*([' + L_ANY + ']*)\\s*\\)?\\s*$'));
      if (!m) return s.toUpperCase();
      var letters = m[1].toLocaleUpperCase('ru-RU').slice(0, 5), dash = m[2], digits = m[3], suf = m[4].toLocaleLowerCase('ru-RU');
      var out = letters;
      if (digits) out += '-' + digits; else if (dash || (typing && /\d/.test(s))) out += '-';
      if (suf && digits.length === 3) out += ' (' + suf + ')';
      else if (typing && digits.length === 3 && /\(\s*$/.test(s)) out += ' (';
      return out;
    },
    valid: function (v) { return VALID.test(String(v || '')); },
    /* Поле группы: автоформат, проверка, выпадающие подсказки (мышь, касание, ↑ ↓ Enter) */
    attach: function (input, errEl) {
      var wrap = input.closest('.ac') || input.parentNode, list = null, items = [], sel = -1, lid = SP.uid('ac-');
      input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', lid);
      input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false'); input.setAttribute('autocapitalize', 'characters');
      var key = function (s) { return String(s || '').toUpperCase().replace(/[^0-9A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]/g, ''); };
      function close() { if (list) { list.remove(); list = null; } sel = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
      function open() {
        var q = key(input.value), all = SP.groups.list().map(function (g) { return g.name; });
        items = all.filter(function (n) { return !q || key(n).indexOf(q) >= 0; }).slice(0, 8);
        if (!list) { list = SP.el('<ul class="ac-list" role="listbox" id="' + lid + '"></ul>'); wrap.appendChild(list); }
        if (!items.length) { list.innerHTML = '<li class="ac-empty" role="option" aria-disabled="true">' + SP.esc(SP.t(all.length ? 'group.noMatch' : 'group.noList')) + '</li>'; sel = -1; }
        else list.innerHTML = items.map(function (n, i) {
          var label = SP.esc(n);
          return '<li role="option" id="' + lid + '-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '">' + label + '</li>';
        }).join('');
        input.setAttribute('aria-expanded', 'true');
      }
      function paint() { if (!list) return; SP.$$('li[data-i]', list).forEach(function (li, i) { li.setAttribute('aria-selected', String(i === sel)); if (i === sel) { li.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', li.id); } }); }
      function pick(i) { if (items[i] == null) return; input.value = items[i]; check(); close(); input.dispatchEvent(new Event('change', { bubbles: true })); }
      function check() {
        var v = input.value.trim(), bad = v && !SP.group.valid(v);
        input.setAttribute('aria-invalid', String(!!bad));
        if (errEl) errEl.textContent = bad ? SP.t('group.invalid') : '';
        return !bad;
      }
      input.addEventListener('input', function (e) {
        if (e.inputType && /^delete/.test(e.inputType)) { open(); return; }
        var f = SP.group.format(input.value, true);
        if (f !== input.value) { input.value = f; try { input.setSelectionRange(f.length, f.length); } catch (x) { /* ничего */ } }
        if (errEl) errEl.textContent = ''; input.removeAttribute('aria-invalid');
        open();
      });
      input.addEventListener('focus', open);
      input.addEventListener('blur', function () { setTimeout(close, 120); input.value = SP.group.format(input.value); check(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!list) open(); sel = Math.min(items.length - 1, sel + 1); paint(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
        else if (e.key === 'Enter' && list && sel >= 0) { e.preventDefault(); e.stopPropagation(); pick(sel); }
        else if (e.key === 'Escape' && list) { e.stopPropagation(); close(); }
      });
      wrap.addEventListener('pointerdown', function (e) { var li = e.target.closest && e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(+li.getAttribute('data-i')); } });
      return { check: check };
    }
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

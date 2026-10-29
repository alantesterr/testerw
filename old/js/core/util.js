/* =====================================================================
   Мелкие помощники, которыми пользуются все модули сайта.
   Всё лежит в одном глобальном объекте SP (StudyPlay).
   ===================================================================== */
(function () {
  'use strict';
  var SP = (window.SP = window.SP || {});

  SP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  SP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* Экранирование текста перед вставкой в HTML (защита от «сломанной» разметки) */
  SP.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  SP.uid = function (p) { return (p || 'sp-') + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); };
  SP.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  SP.pad2 = function (n) { return String(Math.floor(n)).padStart(2, '0'); };
  SP.shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  SP.cleanSpaces = function (t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); };
  SP.lc = function (v) { return String(v || '').trim().toLocaleLowerCase(); };

  /* 75 → «01:15», 3700 → «1:01:40» */
  SP.fmtTime = function (s) {
    if (!isFinite(s)) return '00:00';
    s = Math.max(0, s);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
    return h ? h + ':' + SP.pad2(m) + ':' + SP.pad2(x) : SP.pad2(m) + ':' + SP.pad2(x);
  };

  SP.debounce = function (fn, ms) {
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  };

  /* ---- Файлы ---- */
  SP.download = function (blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };
  SP.downloadText = function (text, name, type) { SP.download(new Blob([text], { type: type || 'text/plain;charset=utf-8' }), name); };
  SP.readAsDataURL = function (file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = rej; r.readAsDataURL(file); });
  };
  SP.dataURLtoBlob = function (content, fallbackType) {
    try {
      var parts = String(content || '').split(','), meta = parts.shift() || '', b64 = parts.join(',');
      var mime = (meta.match(/data:([^;]+)/) || [])[1] || fallbackType || 'application/octet-stream';
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) { return null; }
  };
  SP.formatSize = function (n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' ' + SP.t('unit.b');
    if (n < 1048576) return (n / 1024).toFixed(1) + ' ' + SP.t('unit.kb');
    return (n / 1048576).toFixed(1) + ' ' + SP.t('unit.mb');
  };

  SP.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return Promise.resolve(fallback());
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } finally { t.remove(); }
    }
  };

  /* «5 минут назад» на текущем языке интерфейса */
  SP.relTime = function (date) {
    if (!date) return SP.t('time.never');
    var d = new Date(date), diff = (d.getTime() - Date.now()) / 1000;
    var abs = Math.abs(diff);
    try {
      var rtf = new Intl.RelativeTimeFormat(SP.locale(), { numeric: 'auto' });
      if (abs < 45) return SP.t('time.justNow');
      if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
      if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
    } catch (e) { /* старые браузеры */ }
    return SP.fmtDateTime(d);
  };
  SP.fmtDateTime = function (d) {
    d = new Date(d);
    try { return d.toLocaleString(SP.locale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return d.toISOString(); }
  };

  /* Простейшая шина событий: SP.on('lang', fn), SP.emit('lang') */
  var handlers = {};
  SP.on = function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); };
  SP.emit = function (name, data) { (handlers[name] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); };

  /* Короткая запись создания элемента из HTML */
  SP.el = function (html) { var t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; };
})();

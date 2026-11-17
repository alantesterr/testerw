/* =====================================================================
   УЧЕБНЫЙ ПЕРИОД: с какой недели идёт учёба, сколько учебных недель
   (обычно 15) и когда каникулы. Вне периода и в каникулы расписание пустое,
   над сеткой — «Каникулы» или «Учёбы нет — вне учебного периода».
   Формат: { start: 'YYYY-MM-DD' (понедельник), weeks: 15, breaks: [{ from, to, name }] }.
   Неделя каникул не считается учебной: конец периода сдвигается на неё.
   Где хранится:
     • для всей группы — поле period в data/<группа>/schedule.json («Разработчик → Расписание»);
     • свой — localStorage sp-period (Настройки → Мои данные), он важнее.
   Используют: hub.js (какие недели пустые), schedule.js, dev-schedule.js, settings-view.js.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc, KEY = 'sp-period';
  var p2 = SP.pad2;
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function day(s) { return new Date(s + 'T12:00:00'); }
  function monday(d) { var x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function plus(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dm(d) { return p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); }

  function valid(p) { return !!(p && /^\d{4}-\d{2}-\d{2}$/.test(p.start || '') && +p.weeks > 0); }
  function clean(p) {
    if (!valid(p)) return null;
    return { start: iso(monday(day(p.start))), weeks: Math.min(60, Math.round(+p.weeks)),
      breaks: (p.breaks || []).filter(function (b) { return b && /^\d{4}-\d{2}-\d{2}$/.test(b.from || '') && /^\d{4}-\d{2}-\d{2}$/.test(b.to || '') && b.from <= b.to; })
        .map(function (b) { return { from: b.from, to: b.to, name: String(b.name || '').trim() }; }) };
  }
  /* неделя — каникулы, если каникулы захватывают её среду */
  function breakOf(p, mon) { var w = iso(plus(mon, 2)); return (p.breaks || []).filter(function (b) { return b.from <= w && b.to >= w; })[0] || null; }
  /* что за неделя: { n, total } — учебная №n; { off: 'before' | 'after' | 'break', name } — учёбы нет */
  function week(p, date) {
    if (!valid(p)) return null;
    var m = monday(date), w = monday(day(p.start)), n = 0;
    if (m < w) return { off: 'before' };
    for (var k = 0; k < 104; k++) {
      var b = breakOf(p, w);
      if (iso(w) === iso(m)) return b ? { off: 'break', name: b.name } : n < p.weeks ? { n: n + 1, total: +p.weeks } : { off: 'after' };
      if (!b) n++;
      w = plus(w, 7);
    }
    return { off: 'after' };
  }
  /* последний учебный день (суббота последней учебной недели) */
  function end(p) {
    if (!valid(p)) return null;
    var w = monday(day(p.start)), n = 0, k = 0, last = w;
    while (n < p.weeks && k++ < 104) { if (!breakOf(p, w)) { n++; last = w; } w = plus(w, 7); }
    return plus(last, 5);
  }
  function breakWeeks(p) {
    var w = monday(day(p.start)), e = end(p), n = 0;
    while (w <= e) { if (breakOf(p, w)) n++; w = plus(w, 7); }
    return n;
  }
  function label(p) {
    if (!valid(p)) return '';
    var bw = breakWeeks(p);
    return SP.t('per.label', { a: dm(monday(day(p.start))), b: dm(end(p)), n: p.weeks }) + (bw ? ' · ' + SP.t('per.breaksN', { n: bw }) : '');
  }
  function own() { return clean(SP.store.get(KEY, null)); }
  function setOwn(p) { if (p) SP.store.set(KEY, clean(p)); else SP.store.del(KEY); SP.emit('period'); SP.emit('hub'); }

  /* окно «Учебный период»: начало, сколько учебных недель, каникулы; снизу — итог */
  function dialog(p, o) {
    o = o || {};
    var cur = clean(p) || { start: '', weeks: 15, breaks: [] };
    var row = function (b, i) {
      return '<div class="per-br" data-i="' + i + '"><input class="input" type="date" data-k="from" value="' + esc(b.from) + '" aria-label="' + esc(SP.t('per.from')) + '">' +
        '<span>–</span><input class="input" type="date" data-k="to" value="' + esc(b.to) + '" aria-label="' + esc(SP.t('per.to')) + '">' +
        '<input class="input" data-k="name" value="' + esc(b.name) + '" placeholder="' + esc(SP.t('per.breakName')) + '" aria-label="' + esc(SP.t('per.breakName')) + '">' +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-del="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div>';
    };
    var body = '<div class="stack"><p class="small muted">' + esc(o.text || SP.t('per.text')) + '</p>' +
      '<div class="per-two"><div class="field"><label class="label" for="perS">' + esc(SP.t('per.start')) + '</label><input class="input" type="date" id="perS" value="' + esc(cur.start) + '"></div>' +
      '<div class="field"><label class="label" for="perW">' + esc(SP.t('per.weeks')) + '</label><input class="input" type="number" id="perW" min="1" max="60" value="' + esc(cur.weeks) + '"></div></div>' +
      '<div class="field"><span class="label">' + esc(SP.t('per.breaks')) + '</span><div id="perBr" class="stack-sm"></div>' +
      '<button type="button" class="btn btn-sm" id="perAdd">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('per.addBreak')) + '</span></button></div>' +
      '<div class="per-sum" id="perSum"></div></div>';
    var acts = [];
    if (valid(p) && o.onClear) acts.push({ label: SP.t('per.clear'), icon: 'trash-2', kind: 'danger-outline', onClick: function () { o.onClear(); } });
    acts.push({ label: SP.t('common.cancel') });
    acts.push({ label: SP.t('common.save'), kind: 'primary', icon: 'check', onClick: function () { read(); if (!valid(cur)) { SP.$('#perS', m.el).focus(); return false; } o.onSave(clean(cur)); } });
    var m = SP.modal({ title: o.title || SP.t('per.title'), body: body, actions: acts });
    function read() {
      cur.start = SP.$('#perS', m.el).value; cur.weeks = +SP.$('#perW', m.el).value || 0;
      cur.breaks = SP.$$('.per-br', m.el).map(function (r) { var g = function (k) { return SP.$('[data-k="' + k + '"]', r).value; }; return { from: g('from'), to: g('to') || g('from'), name: g('name') }; });
    }
    function sum() {
      read(); var c = clean(cur), box = SP.$('#perSum', m.el);
      box.innerHTML = c ? SP.icon('calendar-days', 'ic-sm') + '<span>' + esc(label(c)) + (monday(day(cur.start)).getTime() !== day(cur.start).getTime() ? '<br><small>' + esc(SP.t('per.monday', { d: dm(monday(day(cur.start))) })) + '</small>' : '') + '</span>' : '<span class="muted">' + esc(SP.t('per.need')) + '</span>';
    }
    function paint() {
      SP.$('#perBr', m.el).innerHTML = cur.breaks.length ? cur.breaks.map(row).join('') : '<p class="small subtle">' + esc(SP.t('per.noBreaks')) + '</p>';
      SP.$$('[data-del]', m.el).forEach(function (b) { b.onclick = function () { read(); cur.breaks.splice(+b.getAttribute('data-del'), 1); paint(); }; });
      sum();
    }
    SP.$('#perAdd', m.el).onclick = function () { read(); var s = cur.start ? plus(day(cur.start), 49) : new Date(); cur.breaks.push({ from: iso(monday(s)), to: iso(plus(monday(s), 6)), name: '' }); paint(); };
    m.el.addEventListener('input', sum); m.el.addEventListener('change', sum);
    paint();
    var f = SP.$('#perS', m.el); if (f && !cur.start) f.focus();
    return m;
  }

  SP.period = { valid: valid, clean: clean, week: week, end: end, label: label, own: own, setOwn: setOwn, dialog: dialog };
})();

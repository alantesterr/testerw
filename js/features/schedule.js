/* =====================================================================
   РАЗДЕЛ «РАСПИСАНИЕ» — два режима (выбор запоминается):
   • «Timetable» — классическая сетка как на timetable.kgu.kz (удобно на ПК).
     Монохромная: никаких цветов по предметам и типам занятий.
   • «Shokan» — как в приложении Shokan University (удобно на телефоне):
     виды «День» и «Неделя», один акцентный цвет для типа пары.
   Нажатие на занятие открывает папку предмета.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var UI_KEY = 'sp-schedule-ui2';
  var ui = Object.assign({ mode: SP.settings.get('device') === 'phone' ? 'shokan' : 'timetable', view: 'week' }, SP.store.get(UI_KEY, {}));
  SP.on('device', function () { ui = Object.assign(ui, SP.store.get(UI_KEY, {})); });
  var weekOff = 0, dayIdx = null, root = null, updDismissed = false, detail = null;
  var DAY_KEYS = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];

  function saveUI() { SP.store.set(UI_KEY, ui); }
  function monday(off) { var n = new Date(); n.setHours(12, 0, 0, 0); n.setDate(n.getDate() - ((n.getDay() + 6) % 7) + 7 * (off || 0)); return n; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function todayIdx() { var d = (new Date().getDay() + 6) % 7; return d > 5 ? -1 : d; }
  function toMin(t) { var m = String(t || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 0; }
  function hhmm(m) { return SP.pad2(Math.floor(m / 60)) + ':' + SP.pad2(m % 60); }
  var p2 = SP.pad2;

  /* Все слоты дня до вечера (пара 50 мин, перемена 10 мин), как на Timetable */
  function allSlots() {
    var base = (SP.hub.data().timeSlots || []).slice().sort(function (a, b) { return toMin(a.start) - toMin(b.start); });
    var out = base.slice(), end = base.length ? toMin(base[base.length - 1].end) : 8 * 60 + 20, n = 0;
    while (end + 10 <= 20 * 60 + 40 && n < 16) { var st = end + 10; out.push({ id: 'ext-' + n, start: hhmm(st) + ':00', end: hhmm(st + 50) + ':00', ext: true }); end = st + 50; n++; }
    return out;
  }
  function lessonsAt(day, slotId) { return SP.hub.data().schedule.filter(function (l) { return Number(l.day) === day && String(l.slotId) === String(slotId); }); }
  function dayHas(day) { return SP.hub.data().schedule.some(function (l) { return Number(l.day) === day; }); }

  /* Разбор полей занятия: код, название, тип, аудитория, корпус, преподаватель */
  var ABBR_RE = /^(.*?)[\s ]+(СПЗ|СРОП|СРО|ЛЗ|ЛР|ПЗ|Л|П|С)$/u;
  function abbrFromKind(k) {
    var x = String(k || '').toLowerCase().trim(); if (!x) return '';
    if (/^лаборат|^зертхан|^lab/.test(x)) return 'ЛЗ';
    if (/^лекц|^дәріс|^lect/.test(x)) return 'Л';
    if (/^семин|^semin/.test(x)) return 'С';
    if (/^практ|^pract/.test(x)) return 'П';
    return '';
  }
  function info(l) {
    var raw = String(l.name || '').replace(/\s+/g, ' ').trim(), code = l.code || '', ab = '';
    var mc = raw.match(/^\(?(\d{3,})\)\s*(.*)$/); if (mc) { code = code || mc[1]; raw = mc[2]; }
    var ma = raw.match(ABBR_RE); if (ma && ma[1].trim()) { raw = ma[1].trim(); ab = ma[2]; }
    var mk = raw.match(/^(.*?)\s*[—–-]\s*(Лекция|Практика|Практическое занятие|Лабораторная(?: работа)?|Семинар)$/iu); if (mk) { raw = mk[1].trim(); ab = ab || abbrFromKind(mk[2]); }
    if (!ab) ab = abbrFromKind(l.kind);
    var sj = SP.hub.getSubject(l.subjectId);
    var name = raw || (sj && sj.name) || SP.t('hub.subject');
    var room = String(l.room || '').trim(), building = String(l.building || '').trim();
    var mb = room.match(/^(.*\S)\s*\(([^()]*(?:корпус|ғимарат|корп|building)[^()]*)\)$/i);
    if (!building && mb) { room = mb[1].trim(); building = mb[2].trim(); }
    var teacher = String(l.teacher || (sj && sj.teacher) || '').replace(/\s+/g, ' ').trim(), hours = '';
    var mh = teacher.match(/\s*\(\s*(\d+\s*\/\s*\d+\s*ч?)\s*\)\s*$/); if (mh) { teacher = teacher.slice(0, mh.index).trim(); hours = '(' + mh[1].replace(/\s+/g, ' ') + ')'; }
    return { code: code, name: name, ab: ab, room: room, building: building, teacher: teacher, short: shortName(teacher), hours: hours, sid: l.subjectId };
  }
  function shortName(full) {
    var p = String(full || '').split(/\s+/).filter(Boolean); if (p.length < 2) return full || '';
    return p[0] + ' ' + p.slice(1, 3).map(function (x) { return x.charAt(0).toUpperCase() + '.'; }).join('');
  }
  /* Полное название типа пары для режима Shokan */
  function kindLong(ab) {
    var k = { 'Л': 'lec', 'ЛЗ': 'lab', 'ЛР': 'lab', 'П': 'pr', 'ПЗ': 'pr', 'С': 'sem', 'СПЗ': 'prsem', 'СРО': 'sro', 'СРОП': 'srop' }[ab];
    return k ? SP.t('shk.kind.' + k) : '';
  }
  function kindCls(ab) { return ({ 'Л': 'k-lec', 'ЛЗ': 'k-lab', 'ЛР': 'k-lab', 'П': 'k-pr', 'ПЗ': 'k-pr', 'С': 'k-sem', 'СПЗ': 'k-sem' })[ab] || 'k-oth'; }
  function fmtDM(d) { return p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); }

  /* ---------- Переключатели ---------- */
  function modeSwitch() {
    return '<div class="sch-modes"><div class="segmented" role="radiogroup" aria-label="' + esc(SP.t('schedule.mode')) + '">' +
      [['timetable', 'layers'], ['shokan', 'list']].map(function (m) {
        return '<button type="button" role="radio" data-mode="' + m[0] + '" aria-checked="' + (ui.mode === m[0]) + '" aria-pressed="' + (ui.mode === m[0]) + '" data-tip="' + esc(SP.t('schedule.mode.' + m[0] + 'Tip')) + '">' + SP.icon(m[1], 'ic-sm') + '<span>' + esc(SP.t('schedule.mode.' + m[0])) + '</span></button>';
      }).join('') + '</div>' +
      '<span class="sch-mode-hint xsmall subtle">' + esc(SP.t('schedule.mode.' + ui.mode + 'Tip')) + '</span></div>';
  }
  function sourceSwitch() {
    var av = SP.hub.availableSources(); if (av.length < 2) return '';
    var cur = SP.hub.data().source;
    return '<div class="segmented" role="group" aria-label="' + esc(SP.t('schedule.source')) + '">' + av.map(function (s) {
      return '<button type="button" data-src="' + s + '" aria-pressed="' + (s === cur) + '">' + esc(SP.t('schedule.src.' + s)) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- Скачать расписание (например, чтобы скинуть себе в Telegram) ---------- */
  var DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  /* Таблица .csv: открывается в Excel и на телефоне (Google Таблицы, просмотр файлов) */
  function scheduleCsv() {
    var d = SP.hub.data(), slots = {};
    (d.timeSlots || []).forEach(function (s, i) { slots[s.id] = { i: i, t: String(s.start || '').slice(0, 5) + '–' + String(s.end || '').slice(0, 5) }; });
    var rows = d.schedule.slice().sort(function (a, b) { return (a.day - b.day) || ((slots[a.slotId] || { i: 99 }).i - (slots[b.slotId] || { i: 99 }).i); });
    var q = function (v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var head = [SP.t('schedule.csv.day'), SP.t('schedule.csv.time'), SP.t('schedule.csv.subject'), SP.t('schedule.csv.kind'), SP.t('schedule.csv.room'), SP.t('schedule.csv.teacher')];
    var lines = [head.map(q).join(';')].concat(rows.map(function (l) {
      var room = [l.room, l.building].filter(Boolean).join(', ');
      return [SP.t('day.' + (DAY_KEYS[l.day] || 'mon')), (slots[l.slotId] || {}).t || '', SP.hub.cleanName ? SP.hub.cleanName(l.name) : l.name, l.kind, room, l.teacher].map(q).join(';');
    }));
    /* BOM + «;» — чтобы Excel сразу понял кириллицу и столбцы */
    return '﻿' + lines.join('\r\n');
  }
  function downloadDialog() {
    var grp = SP.lc((SP.auth.user() || {}).group || '').replace(/[^a-zа-я0-9-]+/gi, '') || 'group';
    var m = SP.modal({ title: SP.t('schedule.dl'), body:
      '<div class="stack-sm">' +
      '<button type="button" class="btn btn-block wrap" data-dl="csv">' + SP.icon('file-text') + '<span><b>' + esc(SP.t('schedule.dlCsv')) + '</b><br><span class="small muted">' + esc(SP.t('schedule.dlCsvHint')) + '</span></span></button>' +
      '<button type="button" class="btn btn-block wrap" data-dl="json">' + SP.icon('file-json') + '<span><b>' + esc(SP.t('schedule.dlJson')) + '</b><br><span class="small muted">' + esc(SP.t('schedule.dlJsonHint')) + '</span></span></button>' +
      '</div>' });
    SP.$$('[data-dl]', m.el).forEach(function (b) { b.onclick = function () {
      if (b.getAttribute('data-dl') === 'csv') SP.downloadText(scheduleCsv(), 'raspisanie-' + grp + '.csv', 'text/csv;charset=utf-8');
      else SP.hub.exportAll();
      m.close();
    }; });
  }

  /* ---------- Отрисовка ---------- */
  function render() {
    if (!root) return;
    var d = SP.hub.data(), td = weekOff === 0 ? todayIdx() : -1;
    if (dayIdx === null) dayIdx = td >= 0 ? td : 0;
    var srcBadge = d.source ? '<span class="badge">' + SP.icon(d.source === 'course' ? 'users' : 'user') + esc(SP.t('schedule.src.' + d.source)) + '</span>' + (d.source === 'course' && d.baseVersion ? '<span class="subtle xsmall">' + esc(SP.t('schedule.version', { v: d.baseVersion })) + '</span>' : '') : '';
    var dlBtn = d.schedule.length ? '<button type="button" class="btn" id="schDl">' + SP.icon('download') + '<span>' + esc(SP.t('schedule.dl')) + '</span></button>' : '';
    var html = SP.pageHead({ title: SP.t('nav.schedule'), sub: '<span class="row">' + srcBadge + '</span>', actions: '<div class="row">' + sourceSwitch() + dlBtn + '</div>' });
    html += modeSwitch();
    var upd = SP.hub.pendingUpdate();
    if (upd && !updDismissed) {
      html += '<div class="alert alert-info">' + SP.icon('bell') + '<div class="alert-body"><b>' + esc(SP.t('schedule.newCourse', { v: upd.version || '' })) + '</b><span>' + esc(SP.t('schedule.newCourseText')) + '</span>' +
        '<div class="alert-actions"><button type="button" class="btn btn-primary btn-sm" id="updGo">' + esc(SP.t('common.update')) + '</button><button type="button" class="btn btn-sm" id="updLater">' + esc(SP.t('common.later')) + '</button></div></div></div>';
    }
    if (!d.schedule.length) html += emptyState();
    else html += ui.mode === 'shokan' ? shokan(td) : timetable(td);
    root.innerHTML = '<div class="page wide sch-page mode-' + ui.mode + '">' + html + '</div>';
    wire();
  }

  /* ===== Режим «Timetable» (структура и стиль как на timetable.kgu.kz) ===== */
  function timetable(td) {
    var mon = monday(weekOff), slots = allSlots();
    var opts = '';
    for (var w = -20; w <= 20; w++) { var m = monday(w); opts += '<option value="' + w + '"' + (w === weekOff ? ' selected' : '') + '>' + p2(m.getDate()) + '-' + p2(m.getMonth() + 1) + '-' + m.getFullYear() + '</option>'; }
    var h = '<div class="tt-wrap"><div class="tt-form"><select id="ttWeek" aria-label="' + esc(SP.t('schedule.weekOf')) + '">' + opts + '</select><button type="button" id="ttGo" class="tt-btn">' + esc(SP.t('schedule.select')) + '</button>' +
      '<div class="tt-zm"><button type="button" class="tt-btn" data-z="-5" aria-label="−">−</button><input type="range" id="ttZoom" min="30" max="250" step="1" value="' + ttZ() + '" aria-label="Zoom"><button type="button" class="tt-btn" data-z="5" aria-label="+">+</button><span id="ttZv">' + ttZ() + '%</span>' +
      '<button type="button" class="tt-btn" id="ttCust" aria-expanded="' + !!ui.ttOpen + '">' + SP.icon('settings', 'ic-sm') + '<span>' + esc(SP.t('schedule.custom')) + '</span></button></div></div>' +
      '<div class="tt-cust"' + (ui.ttOpen ? '' : ' hidden') + '>' +
      '<label>' + esc(SP.t('schedule.blockW')) + ' <input type="range" id="ttW" min="0" max="320" step="1" value="' + (ui.ttw || 0) + '"><span id="ttWv">' + (ui.ttw ? ui.ttw + 'px' : SP.t('schedule.auto')) + '</span></label>' +
      '<label>' + esc(SP.t('schedule.blockH')) + ' <input type="range" id="ttH" min="40" max="200" step="1" value="' + (ui.tth || 88) + '"><span id="ttHv">' + (ui.tth || 88) + 'px</span></label>' +
      '<button type="button" class="tt-btn" id="ttReset">' + esc(SP.t('schedule.reset')) + '</button></div>' +
      '<div class="tt-scroll"><div class="tt-zoom" style="zoom:' + (ttZ() / 100) + ';' + ttVars() + '"><table class="tt-table' + (ui.ttw ? ' tt-fixed' : '') + '"><tbody><tr><td class="tt-corner"></td>';
    for (var i = 0; i < 6; i++) h += '<td class="tt-head' + (i === td ? ' tt-today' : '') + '"><b>' + esc(SP.t(DAY_KEYS[i])) + '</b><br>' + fmtDM(addDays(mon, i)) + '</td>';
    h += '</tr>';
    slots.forEach(function (s) {
      h += '<tr><td class="tt-time">' + esc(String(s.start).slice(0, 5)) + '<br>' + esc(String(s.end).slice(0, 5)) + '</td>';
      for (var dd = 0; dd < 6; dd++) {
        h += '<td class="tt-cell' + (dd === td ? ' tt-today' : '') + '"><div class="tt-box">' + lessonsAt(dd, s.id).map(function (l) {
          var x = info(l);
          return '<button type="button" class="tt-l ' + kindCls(x.ab) + '" data-sid="' + esc(x.sid) + '" title="' + esc(SP.t('schedule.openFolder')) + '">' +
            '<b>' + esc(x.name) + '</b>' + (x.ab ? ' <span class="tt-ab">' + esc(x.ab) + '</span>' : '') +
            (x.room || x.building ? '<span class="tt-line">' + esc(ttRoom(x.room)) + (x.building ? ' (' + esc(ttBld(x.building)) + ')' : '') + '</span>' : '') +
            (x.teacher ? '<span class="tt-line">' + esc(x.teacher) + '</span>' : '') + '</button>';
        }).join('') + '</div></td>';
      }
      h += '</tr>';
    });
    return h + '</tbody></table></div></div></div>';
  }
  /* Timetable: «Актовый зал (302)» → «302», «223 (спортзал)» → «223», «Главный корпус» → «Главка» */
  function ttRoom(r) {
    r = String(r || ''); var m = r.match(/\((\d[\w\-\/]*)\)/);
    if (m && !/^\d/.test(r)) return m[1];
    return /^\d/.test(r) ? r.replace(/\s*\([^)]*\)/g, '').trim() : r;
  }
  function ttBld(b) { return /^главный корпус$/i.test(String(b).trim()) ? 'Главка' : b; }
  function ttVars() { return (ui.ttw ? '--tt-cw:' + ui.ttw + 'px;' : '') + '--tt-ch:' + (ui.tth || 88) + 'px'; }
  function applyTtVars() {
    var zw = SP.$('.tt-zoom', root), t = SP.$('.tt-table', root); if (!zw) return;
    zw.style.setProperty('--tt-ch', (ui.tth || 88) + 'px');
    if (ui.ttw) zw.style.setProperty('--tt-cw', ui.ttw + 'px'); else zw.style.removeProperty('--tt-cw');
    t.classList.toggle('tt-fixed', !!ui.ttw);
    SP.$('#ttWv', root).textContent = ui.ttw ? ui.ttw + 'px' : SP.t('schedule.auto');
    SP.$('#ttHv', root).textContent = (ui.tth || 88) + 'px';
  }
  function ttZ() { var z = +(ui.ttz || 100); return z >= 30 && z <= 250 ? z : 100; }
  function setTtZ(z) {
    z = Math.max(30, Math.min(250, Math.round(z))); ui.ttz = z; saveUI();
    var zw = SP.$('.tt-zoom', root), r = SP.$('#ttZoom', root), v = SP.$('#ttZv', root);
    if (zw) zw.style.zoom = z / 100; if (r) r.value = z; if (v) v.textContent = z + '%';
  }

  /* Шокан: карточка занятия (как в приложении) */
  function shokanDetail(l) {
    var x = info(l), mon = monday(weekOff), s = allSlots().filter(function (t) { return t.id === l.slotId; })[0] || {};
    var date = addDays(mon, +l.day || 0).toLocaleDateString(SP.locale(), { day: 'numeric', month: 'long' }).replace(/\s*г\.?$/, '');
    var when = SP.t(DAY_KEYS[l.day] || 'day.mon') + ', ' + date + ', ' + String(s.start || '').slice(0, 5) + ' - ' + String(s.end || '').slice(0, 5);
    var place = [x.building, x.room].filter(Boolean).join(', ');
    return '<div class="shk-det"><button type="button" class="shk-back" id="shkBack">' + SP.icon('chevron-left') + '<span>' + esc(SP.t('nav.schedule')) + '</span></button>' +
      '<div class="shk-det-kind">' + esc((kindLong(x.ab) || x.ab || '').toLocaleUpperCase(SP.locale())) + '</div><h2 class="shk-det-name">' + esc(x.name) + '</h2>' +
      '<ul class="shk-det-list"><li>' + esc(when) + '</li>' + (place ? '<li>' + esc(place) + '</li>' : '') + (x.teacher ? '<li>' + esc(x.teacher) + '</li>' : '') + '</ul>' +
      '<button type="button" class="btn btn-primary shk-det-go" data-sid="' + esc(x.sid) + '">' + SP.icon('folder') + '<span>' + esc(SP.t('schedule.openFolder')) + '</span></button></div>';
  }

  /* ===== Режим «Shokan» (как в приложении Shokan University) ===== */
  function shokan(td) {
    var mon = monday(weekOff);
    if (detail) return '<div class="shk">' + shokanDetail(detail) + '</div>';
    var h = '<div class="shk"><div class="shk-head">' +
      '<div class="shk-seg" role="tablist">' + ['day', 'week'].map(function (v) { return '<button type="button" role="tab" data-view="' + v + '" aria-selected="' + (ui.view === v) + '">' + esc(SP.t('schedule.' + v)) + '</button>'; }).join('') + '</div>' +
      '<h2 class="shk-title">' + esc(SP.t('nav.schedule')) + '</h2>' +
      '<label class="shk-cal" data-tip="' + esc(SP.t('schedule.pickDate')) + '">' + SP.icon('calendar-days') + '<span class="sr-only">' + esc(SP.t('schedule.pickDate')) + '</span><input type="date" id="shkDate" class="shk-date"></label></div>';
    h += ui.view === 'week' ? shokanWeek(mon) : shokanDay(mon, td);
    return h + '</div>';
  }
  function shokanWeek(mon) {
    var days = [0, 1, 2, 3, 4]; if (dayHas(5)) days.push(5);
    var letters = SP.t('shk.letters').split(','), slots = allSlots();
    var h = '<div class="shk-week"><table class="shk-grid" style="--cols:' + days.length + '"><thead><tr><th class="shk-tcol"></th>' +
      days.map(function (d) { return '<th><span class="shk-dl">' + esc(letters[d]) + '</span><span class="shk-dn">' + addDays(mon, d).getDate() + '</span></th>'; }).join('') + '</tr></thead><tbody>';
    slots.forEach(function (s) {
      h += '<tr><th class="shk-tcol" scope="row"><span class="shk-t1">' + esc(String(s.start).slice(0, 5)) + '</span><span class="shk-t2">' + esc(String(s.end).slice(0, 5)) + '</span></th>';
      days.forEach(function (d) {
        var ls = lessonsAt(d, s.id);
        if (!ls.length) { h += '<td class="shk-empty"></td>'; return; }
        var x = info(ls[0]);
        h += '<td class="shk-fill"><button type="button" class="shk-wl" data-lid="' + SP.hub.data().schedule.indexOf(ls[0]) + '" title="' + esc(x.name + (kindLong(x.ab) ? ' · ' + kindLong(x.ab) : '')) + '"><span class="shk-wn">' + esc(x.name) + '</span><span class="shk-wk">' + esc(kindLong(x.ab) || x.ab) + (ls.length > 1 ? ' +' + (ls.length - 1) : '') + '</span></button></td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function shokanDay(mon, td) {
    var letters = SP.t('shk.letters').split(','), date = addDays(mon, dayIdx);
    var h = '<div class="shk-strip"><button type="button" class="shk-arr" data-wk="-1" aria-label="' + esc(SP.t('schedule.prevWeek')) + '">' + SP.icon('chevron-left') + '</button><div class="shk-days" role="tablist" aria-label="' + esc(SP.t('schedule.days')) + '">';
    for (var i = 0; i < 6; i++) h += '<button type="button" role="tab" class="shk-day" data-day="' + i + '" aria-selected="' + (i === dayIdx) + '" aria-label="' + esc(SP.t(DAY_KEYS[i]) + ' ' + addDays(mon, i).getDate()) + '"><span>' + esc(letters[i]) + '</span><i class="shk-dot' + (dayHas(i) ? ' on' : '') + '"></i></button>';
    h += '</div><button type="button" class="shk-arr" data-wk="1" aria-label="' + esc(SP.t('schedule.nextWeek')) + '">' + SP.icon('chevron-right') + '</button></div>';
    var title = SP.t(DAY_KEYS[dayIdx]) + ', ' + date.toLocaleDateString(SP.locale(), { day: 'numeric', month: 'long' }).replace(/\s*г\.?$/, '');
    h += '<div class="shk-band">' + esc(title.toLocaleUpperCase(SP.locale())) + '</div><ol class="shk-list">';
    var slots = allSlots(), used = slots.map(function (s) { return lessonsAt(dayIdx, s.id).length > 0; });
    var first = used.indexOf(true), last = used.lastIndexOf(true);
    slots.forEach(function (s, i) {
      var ls = lessonsAt(dayIdx, s.id);
      h += '<li class="shk-row' + (ls.length ? ' has' : '') + '"><div class="shk-time"><b>' + esc(String(s.start).slice(0, 5)) + '</b><span>' + esc(String(s.end).slice(0, 5)) + '</span></div><div class="shk-slot">';
      if (ls.length) h += ls.map(function (l) {
        var x = info(l);
        return '<button type="button" class="shk-card" data-lid="' + SP.hub.data().schedule.indexOf(l) + '"><span class="shk-kind">' + esc((kindLong(x.ab) || x.ab || '').toLocaleUpperCase(SP.locale())) + '</span><span class="shk-name">' + esc(x.name) + '</span></button>';
      }).join('');
      else if (i > first && i < last) h += '<span class="shk-gap">' + esc(SP.t('schedule.gap', { m: toMin(s.end) - toMin(s.start) })) + '</span>';
      h += '</div></li>';
    });
    if (first < 0) h += '<li class="shk-free">' + esc(SP.t('schedule.freeDay')) + '</li>';
    return h + '</ol>';
  }

  function emptyState() {
    return '<section class="card"><div class="empty">' + SP.icon('calendar-days', 'ic-xl') +
      '<h3>' + esc(SP.t('schedule.emptyTitle')) + '</h3><p>' + esc(SP.t('schedule.emptyGuest')) + '</p>' +
      '<div class="btn-group"><button type="button" class="btn btn-primary" id="emUpload">' + SP.icon('upload') + '<span>' + esc(SP.t('schedule.upload')) + '</span></button>' +
      '<button type="button" class="btn btn-ghost" id="emHelp">' + SP.icon('circle-help') + '<span>' + esc(SP.t('schedule.howTo')) + '</span></button></div></div></section>';
  }

  function goDate(v) {
    if (!v) return;
    var d = new Date(v + 'T12:00:00'); if (isNaN(d)) return;
    var dm = new Date(d); dm.setDate(dm.getDate() - ((dm.getDay() + 6) % 7));
    weekOff = Math.round((dm - monday(0)) / (7 * 864e5)); dayIdx = Math.min(5, (d.getDay() + 6) % 7); render();
  }

  /* Телефон, режим Shokan: экран начинается сразу с «День / Неделя», как в приложении (переключатели — выше, если пролистать вверх) */
  /* ПК, режим Timetable: страница сразу прокручена к таблице — строка с днями вверху экрана, как на сайте Timetable */
  function toShk() {
    var e = null;
    if (ui.mode === 'shokan' && window.innerWidth < 768) e = SP.$('.shk', root);
    else if (ui.mode !== 'shokan' && window.innerWidth >= 768) e = SP.$('.tt-scroll', root);
    if (!e) return;
    requestAnimationFrame(function () { e.scrollIntoView({ block: 'start' }); });
  }
  function wire() {
    var q = function (s) { return SP.$(s, root); };
    SP.$$('[data-mode]', root).forEach(function (b) { b.onclick = function () { ui.mode = b.getAttribute('data-mode'); detail = null; saveUI(); render(); var n = SP.$('[data-mode="' + ui.mode + '"]', root); if (n) n.focus({ preventScroll: true }); toShk(); }; });
    SP.$$('[data-view]', root).forEach(function (b) { b.onclick = function () { ui.view = b.getAttribute('data-view'); saveUI(); render(); }; });
    SP.$$('[data-src]', root).forEach(function (b) { b.onclick = function () { SP.hub.setPref(b.getAttribute('data-src')); }; });
    var dl = SP.$('#schDl', root); if (dl) dl.onclick = downloadDialog;
    SP.$$('[data-wk]', root).forEach(function (b) { b.onclick = function () { weekOff += +b.getAttribute('data-wk'); render(); }; });
    SP.$$('[data-day]', root).forEach(function (b) { b.onclick = function () { dayIdx = +b.getAttribute('data-day'); render(); var c = SP.$('[data-day="' + dayIdx + '"]', root); if (c) c.focus(); }; });
    SP.$$('[data-sid]', root).forEach(function (b) { b.onclick = function () { SP.navigate('subjects', [b.getAttribute('data-sid')]); }; });
    SP.$$('[data-lid]', root).forEach(function (b) { b.onclick = function () { detail = SP.hub.data().schedule[+b.getAttribute('data-lid')] || null; render(); var k = q('#shkBack'); if (k) k.focus(); window.scrollTo(0, 0); }; });
    var bk = q('#shkBack'); if (bk) bk.onclick = function () { detail = null; render(); };
    var zr = q('#ttZoom'); if (zr) zr.oninput = function () { setTtZ(+zr.value); };
    var tc = q('#ttCust'); if (tc) tc.onclick = function () { ui.ttOpen = !ui.ttOpen; saveUI(); q('.tt-cust').hidden = !ui.ttOpen; tc.setAttribute('aria-expanded', ui.ttOpen); };
    var tw = q('#ttW'); if (tw) tw.oninput = function () { ui.ttw = +tw.value < 60 ? 0 : +tw.value; saveUI(); applyTtVars(); };
    var th = q('#ttH'); if (th) th.oninput = function () { ui.tth = +th.value; saveUI(); applyTtVars(); };
    var trs = q('#ttReset'); if (trs) trs.onclick = function () { ui.ttw = 0; ui.tth = 88; ui.ttz = 100; saveUI(); render(); };
    SP.$$('[data-z]', root).forEach(function (b) { b.onclick = function () { setTtZ(ttZ() + +b.getAttribute('data-z')); }; });
    var tg = q('#ttGo'); if (tg) tg.onclick = function () { weekOff = +q('#ttWeek').value; render(); };
    var sd = q('#shkDate'); if (sd) { var d0 = addDays(monday(weekOff), dayIdx || 0); sd.value = d0.getFullYear() + '-' + p2(d0.getMonth() + 1) + '-' + p2(d0.getDate()); sd.onchange = function () { goDate(sd.value); }; }
    var ug = q('#updGo'); if (ug) ug.onclick = function () { SP.hub.acceptUpdate(); };
    var ul = q('#updLater'); if (ul) ul.onclick = function () { updDismissed = true; render(); };
    var eu = q('#emUpload'); if (eu) eu.onclick = SP.schedule.upload;
    var eh = q('#emHelp'); if (eh) eh.onclick = SP.schedule.help;
    var days = q('.shk-days');
    if (days) days.onkeydown = function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); dayIdx = (dayIdx + (e.key === 'ArrowRight' ? 1 : 5)) % 6; render(); SP.$('[data-day="' + dayIdx + '"]', root).focus();
    };
  }

  /* ---------- Загрузка / помощь / ручная правка (используются и из Настроек) ---------- */
  SP.schedule = {
    /* Занятия предмета (для папки): день, время, тип, кабинет, преподаватель */
    lessonsOf: function (sid) {
      var slots = {}; allSlots().forEach(function (s) { slots[s.id] = s; });
      return SP.hub.data().schedule.filter(function (l) { return l.subjectId === sid; })
        .sort(function (a, b) { return a.day - b.day || toMin((slots[a.slotId] || {}).start) - toMin((slots[b.slotId] || {}).start); })
        .map(function (l) { var x = info(l), s = slots[l.slotId] || {}; return { day: SP.t(DAY_KEYS[l.day] || 'day.mon'), time: String(s.start || '').slice(0, 5) + '–' + String(s.end || '').slice(0, 5), kind: kindLong(x.ab) || x.ab, room: [x.room, x.building].filter(Boolean).join(', '), teacher: x.teacher }; });
    },
    upload: function () {
      var inp = SP.el('<input type="file" accept=".json,.studyplay,.html,.htm,application/json,text/html" multiple hidden>');
      document.body.appendChild(inp);
      inp.onchange = function () {
        var list = Array.prototype.slice.call(inp.files); inp.remove(); if (!list.length) return;
        SP.hub.importFiles(list).then(function (rep) {
          var rows = [];
          if (rep.files) rows.push(SP.t('import.files', { n: rep.files }), SP.t('import.subjects', { n: rep.subj }), SP.t('import.items', { n: rep.items }), SP.t('import.notes', { n: rep.notes }));
          if (rep.sched) rows.push(SP.t('import.lessons', { n: rep.sched }));
          if (rep.lost) rows.push(SP.t('import.lost', { n: rep.lost }));
          if (rep.schedSkipped) rows.push(SP.t('import.kept'));
          var body = '<ul>' + rows.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
            (rep.errs.length ? '<div class="alert alert-danger">' + SP.icon('circle-x') + '<div class="alert-body">' + rep.errs.map(esc).join('<br>') + '<span>' + esc(SP.t('import.safe')) + '</span></div></div>' : '');
          SP.modal({ title: SP.t(rep.files ? 'import.done' : 'import.failed'), body: body, actions: [{ label: SP.t('common.understood'), kind: 'primary' }] });
          if (rep.files) SP.navigate('schedule');
        });
      };
      inp.click();
    },
    help: function () {
      var prompt = SP.t('schedule.aiPrompt');
      return SP.modal({
        title: SP.t('schedule.howTo'), size: 'lg',
        body: '<ol class="stack-sm"><li>' + esc(SP.t('schedule.help1')) + '</li><li>' + esc(SP.t('schedule.help2')) + '</li><li>' + esc(SP.t('schedule.help3')) + '</li><li>' + esc(SP.t('schedule.help4')) + '</li></ol>' +
          '<div class="field"><label class="label" for="aiPr">' + esc(SP.t('schedule.aiPromptLabel')) + '</label><textarea class="textarea mono small" id="aiPr" rows="8" readonly>' + esc(prompt) + '</textarea></div>',
        actions: [
          { label: SP.t('schedule.dlTemplate'), icon: 'download', close: false, onClick: function () {
            var ex = { version: 1, timeSlots: [{ id: 'slot1', start: '08:30:00', end: '09:20:00' }], subjects: [{ id: 'subject-1', code: '', name: 'Название предмета', teacher: '', materials: [], tests: [], notes: '' }], schedule: [{ id: 'lesson-1', day: 0, slotId: 'slot1', subjectId: 'subject-1', name: 'Название предмета', kind: 'Лекция', room: '', building: '', teacher: '' }] };
            SP.downloadText(JSON.stringify(ex, null, 2), 'studyplay-schedule-template.json', 'application/json'); return false;
          } },
          { label: SP.t('common.copy'), icon: 'copy', kind: 'primary', close: false, onClick: function () { SP.copyText(prompt).then(function () { SP.toast(SP.t('common.copied'), 'success'); }); return false; } }
        ]
      });
    },
    editJson: function () {
      var d = SP.hub.data();
      var json = JSON.stringify({ timeSlots: d.timeSlots, schedule: d.schedule }, null, 2);
      SP.modal({
        title: SP.t('schedule.editTitle'), size: 'lg',
        body: '<p class="muted small">' + esc(SP.t('schedule.editText')) + '</p><textarea class="textarea mono small" id="schJson" rows="16" spellcheck="false">' + esc(json) + '</textarea><div class="error-text" id="schJsonErr" role="alert"></div>',
        actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
          try {
            var x = JSON.parse(SP.$('#schJson').value);
            if (!Array.isArray(x.schedule) || !Array.isArray(x.timeSlots)) throw new Error(SP.t('schedule.editNeed'));
            x.schedule.forEach(function (l) { var dd = Number(l.day); if (!Number.isInteger(dd) || dd < 0 || dd > 5) throw new Error(SP.t('hub.importDay', { name: l.name || '?' })); if (!SP.hub.getSubject(l.subjectId)) throw new Error(SP.t('schedule.editNoSubject', { id: l.subjectId })); });
            SP.hub.setOwn(x.timeSlots, x.schedule); SP.toast(SP.t('schedule.saved'), 'success');
          } catch (e) { SP.$('#schJsonErr').textContent = e.message; return false; }
        } }]
      });
    }
  };

  SP.views.register('schedule', {
    titleKey: 'nav.schedule',
    mount: function (el) { root = el; autoScroll = Date.now(); render(); setTimeout(toShk, 60); },
    show: function () { autoScroll = Date.now(); render(); toShk(); SP.hub.checkUpdate(); },
    refresh: render
  });
  /* расписание догрузилось после открытия — один раз прокручиваем к таблице, если человек ещё не листал сам */
  var autoScroll = 0;
  SP.on('hub', function () {
    if (!root || SP.views.current() !== 'schedule') return;
    render();
    if (Date.now() - autoScroll < 4000 && window.scrollY < 40) toShk();
  });
  SP.on('hub-update', function () { updDismissed = false; if (root && SP.views.current() === 'schedule') render(); });
  SP.on('settings', function (e) { if (e.key === 'theme' && root && SP.views.current() === 'schedule') render(); });
})();

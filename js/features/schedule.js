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
  /* занятия показываемой недели: как в Timetable (каждая неделя своя), вне семестра — пусто */
  function weekLessons() { return SP.hub.weekSchedule(monday(weekOff)); }
  function lessonsAt(day, slotId) { return weekLessons().filter(function (l) { return Number(l.day) === day && String(l.slotId) === String(slotId); }); }
  function dayHas(day) { return weekLessons().some(function (l) { return Number(l.day) === day; }); }
  /* «8-я неделя из 15 · Рубежный контроль 1 (26.10–01.11)» — по академическому календарю Platonus */
  function calLine() {
    var w = SP.hub.weekInfo(monday(weekOff)); if (!w || (!w.n && !w.rk.length)) return '';
    var dm = function (s) { return s.slice(8, 10) + '.' + s.slice(5, 7); };
    var parts = [];
    if (w.n) parts.push(SP.t(w.total ? 'schedule.weekOf2' : 'schedule.weekN', { n: w.n, t: w.total }));
    w.rk.forEach(function (e) { parts.push('<b>' + esc(e.name) + '</b> (' + dm(e.from) + '–' + dm(e.to) + ')'); });
    return '<div class="sch-cal small subtle">' + SP.icon('calendar-days', 'ic-sm') + '<span>' + parts.map(function (p, i) { return i || !w.n ? p : esc(p); }).join(' · ') + '</span></div>';
  }

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

  /* ---------- Отрисовка ---------- */
  function render() {
    if (!root) return;
    var d = SP.hub.data(), td = weekOff === 0 ? todayIdx() : -1;
    if (dayIdx === null) dayIdx = td >= 0 ? td : 0;
    var srcBadge = d.source ? '<span class="badge">' + SP.icon(d.source === 'course' ? 'users' : 'user') + esc(SP.t('schedule.src.' + d.source)) + '</span>' + (d.source === 'course' && d.baseVersion ? '<span class="subtle xsmall">' + esc(SP.t('schedule.version', { v: d.baseVersion })) + '</span>' : '') : '';
    var html = SP.pageHead({ title: SP.t('nav.schedule'), sub: '<span class="row">' + srcBadge + '</span>', actions: sourceSwitch() + ttRunBtn() });
    html += modeSwitch() + calLine();
    var upd = SP.hub.pendingUpdate();
    if (upd && !updDismissed) {
      html += '<div class="alert alert-info">' + SP.icon('bell') + '<div class="alert-body"><b>' + esc(SP.t('schedule.newCourse', { v: upd.version || '' })) + '</b><span>' + esc(SP.t('schedule.newCourseText')) + '</span>' +
        '<div class="alert-actions"><button type="button" class="btn btn-primary btn-sm" id="updGo">' + esc(SP.t('common.update')) + '</button><button type="button" class="btn btn-sm" id="updLater">' + esc(SP.t('common.later')) + '</button></div></div></div>';
    }
    if (!d.schedule.length) html += emptyState();
    else html += ui.mode === 'shokan' ? shokan(td) : timetable(td);
    /* перерисовка не сбрасывает прокрутку; если шапка Shokan была прижата к верху — остаётся прижатой */
    var phoneNow = window.innerWidth < 768 && SP.views.current() === 'schedule', oldHead = phoneNow && SP.$('.shk-head', root);
    /* прижата к верху — или человек ещё сам не листал после входа (данные догрузились позже) */
    var keepY = phoneNow ? window.scrollY : 0, pinned = phoneNow && (!!(oldHead && oldHead.getBoundingClientRect().top <= 2) || !userMoved);
    root.innerHTML = '<div class="page wide sch-page mode-' + ui.mode + '">' + html + '</div>';
    /* телефон, Shokan: как в приложении — при входе сразу шапка Shokan у верхнего края, шапка сайта — выше (потянуть вниз) */
    document.documentElement.classList.toggle('shk-full', ui.mode === 'shokan');
    wire();
    if (SP.ui2) SP.ui2.schedule(root);
    fitZoom();
    shkSpace();
    var shkNow = SP.$('.shk', root);
    if (pinned && shkNow && ui.mode === 'shokan') window.scrollTo(0, Math.round(shkNow.getBoundingClientRect().top + window.scrollY));
    else if (keepY && Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
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
          var x = info(l), lk = lessonLinks(SP.hub.ttLink(addDays(mon, dd), s.start, l.name));
          var btn = '<button type="button" class="tt-l ' + kindCls(x.ab) + (lk.length ? ' has-lk' : '') + '" data-sid="' + esc(x.sid) + '" title="' + esc(SP.t('schedule.openFolder')) + '">' +
            '<b>' + esc(x.name) + '</b>' + (x.ab ? ' <span class="tt-ab">' + esc(x.ab) + '</span>' : '') +
            (x.room || x.building ? '<span class="tt-line">' + esc(ttRoom(x.room)) + (x.building ? ' (' + esc(ttBld(x.building)) + ')' : '') + '</span>' : '') +
            (x.teacher ? '<span class="tt-line">' + esc(x.teacher) + '</span>' : '') + '</button>';
          if (!lk.length) return btn;
          /* на ПК кружок можно нажать: одна ссылка — сразу открывается, несколько — метки под парой */
          var one = lk.length === 1 && lk[0].url;
          return '<div class="tt-lw">' + btn + (one ? '<a class="lk-badge lk-tap" href="' + esc(lk[0].url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(SP.t(lk[0].kind === 'video' ? 'schedule.lkJoin' : 'schedule.lkOpen', { s: lk[0].label })) + '">' + SP.icon(lk[0].icon) + '</a>' : linkBadge(lk)) + '</div>' +
            linkChips(lk, 'tt-chips');
        }).join('') + '</div></td>';
      }
      h += '</tr>';
    });
    return h + '</tbody></table></div></div></div>';
  }
  /* Ссылка преподавателя из Timetable (поле «Мессенджер: ID конференции») — только на ту дату, где её оставили;
     показ — lessonLinks / linkBadge / linkChips / linkButtons ниже */
  /* ---------- Ссылки у пары: синий кружок справа сверху, внутри значок по типу ----------
     видеосвязь (камера) · файлы и диски (папка) · чаты (самолётик) · другое (скрепка); несколько ссылок — цифра.
     В поле Timetable может быть одна ссылка, несколько или просто текст (например, ID конференции). */
  var LK = [
    ['video', 'video', /(^|\.)(zoom\.us|zoom\.com)$/, 'Zoom'], ['video', 'video', /^meet\.google\.com$/, 'Meet'], ['video', 'video', /(^|\.)teams\.(microsoft|live)\.com$/, 'Teams'],
    ['video', 'video', /(^|\.)webex\.com$/, 'Webex'], ['video', 'video', /(^|\.)(meet\.jit\.si|jitsi\.org)$/, 'Jitsi'], ['video', 'video', /(^|\.)skype\.com$/, 'Skype'],
    ['files', 'folder', /^docs\.google\.com$/, 'Google Docs'], ['files', 'folder', /^(drive\.google\.com|drive\.usercontent\.google\.com)$/, 'Google Диск'], ['files', 'folder', /^classroom\.google\.com$/, 'Classroom'],
    ['files', 'folder', /(^|\.)(disk\.yandex\.\w+|yadi\.sk)$/, 'Яндекс Диск'], ['files', 'folder', /(^|\.)(onedrive\.live\.com|1drv\.ms|sharepoint\.com)$/, 'OneDrive'], ['files', 'folder', /(^|\.)dropbox\.com$/, 'Dropbox'],
    ['chat', 'send', /^(t\.me|telegram\.me|telegram\.org)$/, 'Telegram'], ['chat', 'send', /(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp']
  ];
  function lessonLinks(v) {
    v = String(v || '').trim(); if (!v) return [];
    var urls = v.match(/https?:\/\/[^\s<>"']+/gi) || [];
    if (!urls.length) return [{ kind: 'other', icon: 'link', label: v.length > 40 ? v.slice(0, 38) + '…' : v, text: v, url: '' }];
    return urls.map(function (u) {
      u = u.replace(/[).,;]+$/, '');
      var host = ''; try { host = new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { host = u; }
      var m = LK.filter(function (k) { return k[2].test(host); })[0];
      return m ? { kind: m[0], icon: m[1], label: m[3], url: u, text: u } : { kind: 'other', icon: 'link', label: host, url: u, text: u };
    });
  }
  /* кружок: один тип — его значок; несколько ссылок — их число */
  function linkBadge(list) {
    if (!list.length) return '';
    var tip = list.map(function (k) { return k.label; }).join(', ');
    return '<span class="lk-badge" title="' + esc(SP.t('schedule.hasLinks', { l: tip })) + '" aria-hidden="true">' + (list.length > 1 ? '<b>' + list.length + '</b>' : SP.icon(list[0].icon)) + '</span>';
  }
  /* метки-ссылки под парой (день Shokan, Timetable) */
  function linkChips(list, cls) {
    return list.length ? '<span class="lk-chips ' + (cls || '') + '">' + list.map(function (k) {
      var inner = SP.icon(k.icon, 'ic-sm') + '<span>' + esc(k.label) + '</span>';
      return k.url ? '<a class="lk-chip" href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(k.url) + '">' + inner + '</a>'
        : '<span class="lk-chip lk-text" title="' + esc(k.text) + '">' + inner + '</span>';
    }).join('') + '</span>' : '';
  }
  /* кнопки в карточке пары: «Войти в Zoom», «Открыть Google Диск»… */
  function linkButtons(list) {
    return list.map(function (k) {
      var lbl = k.url ? SP.t(k.kind === 'video' ? 'schedule.lkJoin' : 'schedule.lkOpen', { s: k.label }) : k.text;
      var inner = '<span class="lk-badge lk-static" aria-hidden="true">' + SP.icon(k.icon) + '</span><span class="lk-btxt">' + esc(lbl) + '</span>' + (k.url ? SP.icon('external-link', 'ic-sm') : '');
      return k.url ? '<a class="lk-btn" href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>' : '<div class="lk-btn lk-text">' + inner + '</div>';
    }).join('');
  }
  function lessonLink(l, mon) {
    var s = allSlots().filter(function (t) { return t.id === l.slotId; })[0];
    return s ? SP.hub.ttLink(addDays(mon, +l.day || 0), s.start, l.name) : '';
  }
  /* Кнопка «Обновить расписание» — видна там же, где кнопки Platonus (Windows, галочка в Настройках снята) */
  function ttRunBtn() {
    return SP.pl && SP.pl.visible() ? '<button type="button" class="btn btn-sm" id="ttRun">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('schedule.ttRun')) + '</span></button>' : '';
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
      '<ul class="shk-det-list"><li>' + esc(when) + '</li>' + (place ? '<li>' + esc(place) + '</li>' : '') + (x.teacher ? '<li>' + esc(x.teacher) + '</li>' : '') +
      '</ul>' + (function (lk) { return lk.length ? '<div class="lk-btns">' + linkButtons(lk) + '</div>' : ''; })(lessonLinks(lessonLink(l, mon))) +
      '<button type="button" class="btn btn-primary shk-det-go" data-sid="' + esc(x.sid) + '">' + SP.icon('folder') + '<span>' + esc(SP.t('schedule.openFolder')) + '</span></button></div>';
  }

  /* «Обновить расписание» в шапке Shokan — синий кружок между «День / Неделя» и значками.
     Только там, где обновление работает (приложение, iPhone со Scriptable, ПК с программой — после настройки).
     Пока обновляется — крутится; закончилось — 2 секунды зелёная галочка. */
  var runDoneAt = 0;
  function shkRunBtn() {
    if (!(SP.pl && SP.pl.visible())) return '';
    var busy = SP.pl.busy && SP.pl.busy('tt'), done = !busy && Date.now() - runDoneAt < 2000;
    return '<button type="button" class="shk-cal shk-run' + (busy ? ' busy' : '') + (done ? ' done' : '') + '" id="shkRun" aria-label="' + esc(SP.t('schedule.ttRun')) + '" data-tip="' + esc(SP.t('schedule.ttRun')) + '"' + (busy ? ' aria-busy="true"' : '') + '>' +
      '<span class="shk-run-ring">' + SP.icon(done ? 'check' : 'refresh-cw') + '</span></button>';
  }
  function paintRun() {
    var b = root && SP.$('#shkRun', root); if (!b) return;
    var tmp = SP.el(shkRunBtn()); if (tmp) { b.replaceWith(tmp); tmp.onclick = function () { SP.pl.run('tt'); }; }
  }
  SP.on('pl-busy', function (e) {
    if (!e || e.k !== 'tt') return;
    if (!e.on) { runDoneAt = Date.now(); setTimeout(paintRun, 2100); }
    paintRun();
  });

  /* ===== Режим «Shokan» (как в приложении Shokan University) ===== */
  function shokan(td) {
    var mon = monday(weekOff);
    if (detail) return '<div class="shk">' + shokanDetail(detail) + '</div>';
    var h = '<div class="shk"><div class="shk-head">' +
      '<div class="shk-seg" role="tablist">' + ['day', 'week'].map(function (v) { return '<button type="button" role="tab" data-view="' + v + '" aria-selected="' + (ui.view === v) + '">' + esc(SP.t('schedule.' + v)) + '</button>'; }).join('') + '</div>' +
      '<h2 class="shk-title">' + esc(SP.t('nav.schedule')) + '</h2>' + shkRunBtn() +
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
        var x = info(ls[0]), lk = [].concat.apply([], ls.map(function (l) { return lessonLinks(lessonLink(l, mon)); }));
        h += '<td class="shk-fill"><button type="button" class="shk-wl' + (lk.length ? ' has-lk' : '') + '" data-lid="' + weekLessons().indexOf(ls[0]) + '" title="' + esc(x.name + (kindLong(x.ab) ? ' · ' + kindLong(x.ab) : '') + (lk.length ? ' · ' + SP.t('schedule.hasLinks', { l: lk.map(function (k) { return k.label; }).join(', ') }) : '')) + '">' + linkBadge(lk) + '<span class="shk-wn">' + esc(x.name) + '</span><span class="shk-wk">' + esc(kindLong(x.ab) || x.ab) + (ls.length > 1 ? ' +' + (ls.length - 1) : '') + '</span></button></td>';
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
        var x = info(l), lk = lessonLinks(lessonLink(l, mon));
        return '<button type="button" class="shk-card' + (lk.length ? ' has-lk' : '') + '" data-lid="' + weekLessons().indexOf(l) + '">' + linkBadge(lk) + '<span class="shk-kind">' + esc((kindLong(x.ab) || x.ab || '').toLocaleUpperCase(SP.locale())) + '</span><span class="shk-name">' + esc(x.name) + '</span></button>' +
          linkChips(lk, 'shk-chips');
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
  /* Размер расписания «Меньше / Ещё меньше» — это CSS zoom. Chrome и Android растягивают блок на всю ширину,
     а Safari (iPhone: браузер и веб-приложение) сжимает и ширину — справа оставалась пустая полоса.
     Меряем, что получилось, и растягиваем блок до ширины страницы — одинаково в любом браузере. */
  function fitZoom() {
    if (!root) return;
    ['.sch-page.mode-timetable .tt-wrap'].forEach(function (sel) {   // Shokan zoom больше не использует
      var el = SP.$(sel, root); if (!el) return;
      el.style.width = '';
      var page = el.parentNode, cs = getComputedStyle(page);
      var want = page.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      /* до трёх шагов: браузеры по-разному считают ширину у блока с zoom — подгоняем по факту */
      for (var i = 0; i < 3; i++) {
        var got = el.getBoundingClientRect().width;
        if (!(got > 0) || Math.abs(want - got) <= 2) break;
        var base = parseFloat(el.style.width) || el.offsetWidth;
        el.style.width = (base * want / got) + 'px';
      }
    });
  }
  window.addEventListener('resize', SP.debounce(function () { if (root && SP.views.current() === 'schedule') { fitZoom(); shkSpace(); } }, 150));
  /* листал ли человек сам после входа в Расписание (тогда не прыгаем к шапке Shokan при перерисовке) */
  var userMoved = false;
  ['touchmove', 'wheel'].forEach(function (ev) { window.addEventListener(ev, function () { if (SP.views.current && SP.views.current() === 'schedule') userMoved = true; }, { passive: true }); });
  function shkSpace() {
    var e = root && SP.$('.shk', root), page = e && e.closest('.sch-page');
    if (!page) return;
    page.style.minHeight = '';
    if (ui.mode !== 'shokan' || window.innerWidth >= 768) return;
    /* высота экрана на телефоне «плавает» (строка адреса браузера прячется) — берём наибольшую и запас 100 px */
    var vh = Math.max(window.innerHeight, document.documentElement.clientHeight, window.visualViewport ? window.visualViewport.height : 0);
    var need = (e.getBoundingClientRect().top - page.getBoundingClientRect().top) + vh + 100;
    if (page.offsetHeight < need) page.style.minHeight = Math.ceil(need) + 'px';
  }
  function toShk() {
    var e = null;
    if (ui.mode === 'shokan' && window.innerWidth < 768) e = SP.$('.shk', root);
    else if (ui.mode !== 'shokan' && window.innerWidth >= 768) e = SP.$('.tt-scroll', root);
    if (!e) return;
    /* сразу и ещё раз чуть позже (после отрисовки) — без requestAnimationFrame: в фоне он может не сработать.
       Телефон, Shokan: страница должна быть не ниже «верх Shokan + экран», иначе шапку Shokan не поднять к самому верху
       (Shokan может быть уменьшен настройкой размера — считаем по факту, а не в CSS). */
    var go = function () {
      if (!e.isConnected) return;
      shkSpace();
      var y = e.getBoundingClientRect().top + window.scrollY; window.scrollTo(0, Math.max(0, Math.round(y)));
    };
    go(); setTimeout(go, 80);
  }
  function wire() {
    var q = function (s) { return SP.$(s, root); };
    SP.$$('[data-mode]', root).forEach(function (b) { b.onclick = function () { ui.mode = b.getAttribute('data-mode'); detail = null; saveUI(); render(); var n = SP.$('[data-mode="' + ui.mode + '"]', root); if (n) n.focus({ preventScroll: true }); toShk(); }; });
    SP.$$('[data-view]', root).forEach(function (b) { b.onclick = function () { ui.view = b.getAttribute('data-view'); saveUI(); render(); }; });
    SP.$$('[data-src]', root).forEach(function (b) { b.onclick = function () { SP.hub.setPref(b.getAttribute('data-src')); }; });
    SP.$$('[data-wk]', root).forEach(function (b) { b.onclick = function () { weekOff += +b.getAttribute('data-wk'); render(); }; });
    SP.$$('[data-day]', root).forEach(function (b) { b.onclick = function () { dayIdx = +b.getAttribute('data-day'); render(); var c = SP.$('[data-day="' + dayIdx + '"]', root); if (c) c.focus(); }; });
    SP.$$('[data-sid]', root).forEach(function (b) { b.onclick = function () { SP.navigate('subjects', [b.getAttribute('data-sid')]); }; });
    SP.$$('[data-lid]', root).forEach(function (b) { b.onclick = function () { detail = weekLessons()[+b.getAttribute('data-lid')] || null; render(); var k = q('#shkBack'); if (k) k.focus(); window.scrollTo(0, 0); }; });
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
    var tr = q('#ttRun'); if (tr) tr.onclick = function () { SP.pl.run('tt'); };
    var sr = q('#shkRun'); if (sr) sr.onclick = function () { SP.pl.run('tt'); };
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

  /* Шаг назад/вперёд: неделя (Timetable, Shokan «Неделя») или день (Shokan «День»), с лёгким сдвигом */
  function step(d) {
    if (ui.mode === 'shokan' && ui.view !== 'week') {
      dayIdx = (dayIdx || 0) + d;
      if (dayIdx < 0) { dayIdx = 5; weekOff--; } else if (dayIdx > 5) { dayIdx = 0; weekOff++; }
    } else weekOff += d;
    render();
    var box = SP.$('.shk-list, .shk-week, .shk > :last-child, .tt-scroll', root);
    if (box) { box.classList.remove('sch-in-l', 'sch-in-r'); void box.offsetWidth; box.classList.add(d < 0 ? 'sch-in-l' : 'sch-in-r'); }
  }

  /* Горячие клавиши на ПК: ← → */
  document.addEventListener('keydown', function (e) {
    if (!root || SP.views.current() !== 'schedule' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (document.querySelector('.modal-backdrop, .ui2-tour') || detail) return;
    e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1);
  });

  /* Жест на телефоне (как в Shokan): тянете от левого края — прошлая неделя (день), от правого — следующая.
     Появляется круглая стрелка у края; дотянули — стрелка становится синей, отпустили — листается.
     Тянуть можно с любого места: у самого края экрана Android (жесты) и Safari иногда забирают движение себе
     как «Назад». В Timetable сетка сама прокручивается вбок — листаем, только когда она уже у своего края.
     В приложении на время Расписания середина краёв экрана отдаётся сайту (плагин SPGestures, app/android/native). */
  var sw = null, bub = null, EDGE = 40, NEED = 80;
  function nativeEdges(on) {
    try {
      var p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SPGestures;
      if (p && p.set) { var r = p.set({ on: !!on }); if (r && r.catch) r.catch(function () { }); }
    } catch (e) { /* старое приложение без плагина — просто листаем не от самого края */ }
  }
  window.addEventListener('hashchange', function () { var h = (location.hash || '').replace(/^#\/?/, '').split('/')[0]; nativeEdges(!h || h === 'schedule'); });
  function bubble(dir, x, y, p) {
    if (!bub) { bub = SP.el('<div class="sch-swipe" aria-hidden="true">' + SP.icon(dir < 0 ? 'chevron-left' : 'chevron-right') + '</div>'); document.body.appendChild(bub); }
    bub.innerHTML = SP.icon(dir < 0 ? 'chevron-left' : 'chevron-right');
    var off = -46 + Math.min(1, p) * 62;
    bub.style.top = Math.max(60, Math.min(innerHeight - 110, y - 22)) + 'px';
    bub.style.left = dir < 0 ? off + 'px' : 'auto'; bub.style.right = dir > 0 ? off + 'px' : 'auto';
    bub.style.opacity = String(Math.min(1, p * 1.6));
    bub.classList.toggle('ready', p >= 1);
  }
  function dropBubble() { if (!bub) return; var b = bub; bub = null; b.classList.add('gone'); setTimeout(function () { b.remove(); }, 200); }
  document.addEventListener('touchstart', function (e) {
    sw = null;
    if (!root || SP.views.current() !== 'schedule' || detail || e.touches.length !== 1 || !root.contains(e.target)) return;
    if (e.target.closest('input, select, textarea, .ui2-pop, .modal-backdrop, .tt-cust, .tt-zm')) return;
    var t = e.touches[0], edge = t.clientX < EDGE ? -1 : t.clientX > innerWidth - EDGE ? 1 : 0;
    sw = { x: t.clientX, y: t.clientY, edge: edge, lock: null, sc: ui.mode !== 'shokan' ? e.target.closest('.tt-scroll') : null };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!sw) return;
    var t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
    if (!sw.lock) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      sw.lock = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'h' : 'v';
      if (sw.lock === 'v') { sw = null; return; }
      /* Timetable: пока сетку можно прокрутить в эту сторону — это прокрутка, а не листание */
      if (sw.sc && !sw.edge) {
        var max = sw.sc.scrollWidth - sw.sc.clientWidth;
        if ((dx > 0 && sw.sc.scrollLeft > 2) || (dx < 0 && sw.sc.scrollLeft < max - 2)) { sw = null; return; }
      }
    }
    var dir = dx > 0 ? -1 : 1;
    if (sw.edge && sw.edge !== dir) { dropBubble(); sw.dir = 0; return; } // от левого края тянут вправо, от правого — влево
    sw.dir = dir; sw.p = Math.abs(dx) / NEED;
    bubble(dir, t.clientX, t.clientY, sw.p);
  }, { passive: true });
  function endSwipe() {
    var s = sw; sw = null;
    if (s && s.dir && s.p >= 1) { if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) { } step(s.dir); }
    dropBubble();
  }
  document.addEventListener('touchend', endSwipe);
  document.addEventListener('touchcancel', function () { sw = null; dropBubble(); });

  SP.views.register('schedule', {
    titleKey: 'nav.schedule',
    mount: function (el) { root = el; autoScroll = Date.now(); render(); setTimeout(toShk, 60); },
    show: function () { autoScroll = Date.now(); userMoved = false; render(); toShk(); SP.hub.checkUpdate(); nativeEdges(true); },
    hide: function () { document.documentElement.classList.remove('shk-full'); },
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
  SP.on('settings', function (e) { if ((e.key === 'theme' || e.key === 'plHide') && root && SP.views.current() === 'schedule') render(); });
})();

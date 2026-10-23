/* =====================================================================
   РАЗДЕЛ «РАСПИСАНИЕ».
   Два вида: «Неделя» (таблица: время × дни) и «День» (карточки —
   удобно на телефоне). Нажатие на занятие открывает папку предмета.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var UI_KEY = 'sp-schedule-ui';
  var ui = Object.assign({ mode: window.innerWidth < 768 ? 'day' : 'week', zoom: 100 }, SP.store.get(UI_KEY, {}));
  var weekOff = 0, dayIdx = null, root = null, updDismissed = false;
  var DAY_KEYS = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];

  function saveUI() { SP.store.set(UI_KEY, ui); }
  function monday(off) { var n = new Date(); n.setHours(12, 0, 0, 0); n.setDate(n.getDate() - ((n.getDay() + 6) % 7) + 7 * (off || 0)); return n; }
  function fmtShort(d) { try { return d.toLocaleDateString(SP.locale(), { day: '2-digit', month: '2-digit' }); } catch (e) { return SP.pad2(d.getDate()) + '.' + SP.pad2(d.getMonth() + 1); } }
  function todayIdx() { var d = (new Date().getDay() + 6) % 7; return d > 5 ? -1 : d; }
  function hhmm(t) { return String(t || '').slice(0, 5); }
  function toMin(t) { var m = String(t || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 0; }

  function lessonsAt(day, slotId) {
    return SP.hub.data().schedule.filter(function (l) { return Number(l.day) === day && String(l.slotId) === String(slotId); });
  }
  function usedSlots() {
    var d = SP.hub.data(), used = {};
    d.schedule.forEach(function (l) { used[l.slotId] = 1; });
    var slots = (d.timeSlots || []).slice().sort(function (a, b) { return toMin(a.start) - toMin(b.start); });
    /* показываем все слоты до последнего занятого, чтобы были видны «окна» */
    var last = -1; slots.forEach(function (s, i) { if (used[s.id]) last = i; });
    return last < 0 ? slots.slice(0, 4) : slots.slice(0, last + 1);
  }

  function lessonCard(l, compact) {
    var sj = SP.hub.getSubject(l.subjectId), v = SP.hub.lessonView(l, sj);
    var kindLabel = v.ab ? SP.t('kind.' + v.cls) : '';
    return '<button type="button" class="lesson ' + v.cls + (compact ? ' compact' : '') + '" data-sid="' + SP.esc(l.subjectId) + '" title="' + SP.esc(SP.t('schedule.openFolder')) + '">' +
      '<span class="lesson-name">' + SP.esc(v.name) + '</span>' +
      (kindLabel ? '<span class="lesson-kind">' + SP.esc(kindLabel) + '</span>' : '') +
      (v.room ? '<span class="lesson-line">' + SP.icon('house', 'ic-sm') + '<span>' + SP.esc(v.room) + '</span></span>' : '') +
      (v.teacher ? '<span class="lesson-line">' + SP.icon('user', 'ic-sm') + '<span>' + SP.esc(v.teacher) + (v.hours ? ' ' + SP.esc(v.hours) : '') + '</span></span>' : '') +
      '</button>';
  }

  function sourceSwitch() {
    var av = SP.hub.availableSources(); if (av.length < 2) return '';
    var cur = SP.hub.data().source;
    return '<div class="segmented" role="group" aria-label="' + SP.esc(SP.t('schedule.source')) + '">' + av.map(function (s) {
      return '<button type="button" data-src="' + s + '" aria-pressed="' + (s === cur) + '">' + SP.icon(s === 'timetable' ? 'cloud' : s === 'course' ? 'users' : 'user', 'ic-sm') + '<span>' + SP.esc(SP.t('schedule.src.' + s)) + '</span></button>';
    }).join('') + '</div>';
  }

  function render() {
    if (!root) return;
    var d = SP.hub.data(), mon = monday(weekOff), sat = new Date(mon); sat.setDate(sat.getDate() + 5);
    var td = weekOff === 0 ? todayIdx() : -1;
    if (dayIdx === null) dayIdx = td >= 0 ? td : 0;
    var linked = SP.auth.isLinked();
    var srcBadge = d.source ? '<span class="badge ' + (d.source === 'timetable' ? 'badge-accent' : '') + '">' + SP.icon(d.source === 'timetable' ? 'cloud' : d.source === 'course' ? 'users' : 'user') + SP.esc(SP.t('schedule.src.' + d.source)) + '</span>' : '';
    var sub = '<span class="row">' + srcBadge + (d.source === 'timetable' ? SP.data.syncLine('timetable') : '') + (d.source === 'course' && d.baseVersion ? '<span class="subtle xsmall">' + SP.esc(SP.t('schedule.version', { v: d.baseVersion })) + '</span>' : '') + '</span>';
    var actions = sourceSwitch() +
      (linked ? '<button type="button" class="btn" data-refresh-btn id="schRefresh">' + SP.icon('refresh-cw') + '<span>' + SP.esc(SP.t('data.refresh')) + '</span></button>' : '');

    var html = SP.pageHead({ title: SP.t('nav.schedule'), sub: sub, actions: actions });

    var upd = SP.hub.pendingUpdate();
    if (upd && !updDismissed) {
      html += '<div class="alert alert-info">' + SP.icon('bell') + '<div class="alert-body"><b>' + SP.esc(SP.t('schedule.newCourse', { v: upd.version || '' })) + '</b><span>' + SP.esc(SP.t('schedule.newCourseText')) + '</span>' +
        '<div class="alert-actions"><button type="button" class="btn btn-primary btn-sm" id="updGo">' + SP.esc(SP.t('common.update')) + '</button><button type="button" class="btn btn-sm" id="updLater">' + SP.esc(SP.t('common.later')) + '</button></div></div></div>';
    }
    var tt = SP.data.status().timetable || {};
    if (linked && tt.error && d.source === 'timetable') {
      html += '<div class="alert alert-warning">' + SP.icon('wifi-off') + '<div class="alert-body"><span>' + SP.esc(SP.t('schedule.ttStale') + ' ' + SP.api.errorText({ code: tt.error })) + '</span></div></div>';
    }

    if (!d.schedule.length) {
      html += emptyState(linked);
      root.innerHTML = '<div class="page">' + html + '</div>';
      wire(); return;
    }

    /* Панель: неделя, режим, масштаб */
    html += '<div class="sch-toolbar card card-flat">' +
      '<div class="row row-nowrap">' +
      '<button type="button" class="btn btn-icon" data-wk="-1" aria-label="' + SP.esc(SP.t('schedule.prevWeek')) + '" data-tip="' + SP.esc(SP.t('schedule.prevWeek')) + '">' + SP.icon('chevron-left') + '</button>' +
      '<button type="button" class="btn sch-week' + (weekOff === 0 ? ' is-current' : '') + '" data-wk="0" data-tip="' + SP.esc(SP.t('schedule.toToday')) + '">' + SP.icon('calendar-days') + '<span>' + fmtShort(mon) + ' – ' + fmtShort(sat) + '</span></button>' +
      '<button type="button" class="btn btn-icon" data-wk="1" aria-label="' + SP.esc(SP.t('schedule.nextWeek')) + '" data-tip="' + SP.esc(SP.t('schedule.nextWeek')) + '">' + SP.icon('chevron-right') + '</button>' +
      '</div>' +
      '<div class="segmented" role="group" aria-label="' + SP.esc(SP.t('schedule.view')) + '">' +
      '<button type="button" data-mode="week" aria-pressed="' + (ui.mode === 'week') + '">' + SP.icon('layers', 'ic-sm') + '<span>' + SP.esc(SP.t('schedule.week')) + '</span></button>' +
      '<button type="button" data-mode="day" aria-pressed="' + (ui.mode === 'day') + '">' + SP.icon('list', 'ic-sm') + '<span>' + SP.esc(SP.t('schedule.day')) + '</span></button></div>' +
      (ui.mode === 'week' ? '<div class="row row-nowrap sch-zoom">' +
        '<button type="button" class="btn btn-icon btn-sm" data-zoom="-10" aria-label="' + SP.esc(SP.t('schedule.zoomOut')) + '" data-tip="' + SP.esc(SP.t('schedule.zoomOut')) + '">' + SP.icon('zoom-out') + '</button>' +
        '<span class="small muted zoom-val">' + ui.zoom + '%</span>' +
        '<button type="button" class="btn btn-icon btn-sm" data-zoom="10" aria-label="' + SP.esc(SP.t('schedule.zoomIn')) + '" data-tip="' + SP.esc(SP.t('schedule.zoomIn')) + '">' + SP.icon('zoom-in') + '</button></div>' : '') +
      '</div>';

    if (ui.mode === 'week') html += weekGrid(mon, td);
    else html += dayView(mon, td);

    html += '<p class="subtle xsmall">' + SP.esc(SP.t('schedule.hint')) + '</p>';
    root.innerHTML = '<div class="page wide">' + html + '</div>';
    wire();
  }

  function weekGrid(mon, td) {
    var slots = usedSlots();
    var h = '<div class="sch-scroll" style="--sch-zoom:' + (ui.zoom / 100) + '"><table class="sch-grid"><thead><tr><th class="sch-time-h"><span class="sr-only">' + SP.esc(SP.t('schedule.time')) + '</span></th>';
    for (var i = 0; i < 6; i++) {
      var x = new Date(mon); x.setDate(x.getDate() + i);
      h += '<th class="' + (i === td ? 'is-today' : '') + '"><span class="sch-day">' + SP.esc(SP.t(DAY_KEYS[i])) + '</span><span class="sch-date">' + fmtShort(x) + '</span></th>';
    }
    h += '</tr></thead><tbody>';
    slots.forEach(function (s) {
      h += '<tr><th scope="row" class="sch-time"><span>' + SP.esc(hhmm(s.start)) + '</span><span class="subtle">' + SP.esc(hhmm(s.end)) + '</span></th>';
      for (var d = 0; d < 6; d++) {
        var ls = lessonsAt(d, s.id);
        h += '<td class="' + (d === td ? 'is-today' : '') + '">' + ls.map(function (l) { return lessonCard(l, true); }).join('') + '</td>';
      }
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  function dayView(mon, td) {
    var h = '<div class="day-chips" role="tablist" aria-label="' + SP.esc(SP.t('schedule.days')) + '">';
    for (var i = 0; i < 6; i++) {
      var x = new Date(mon); x.setDate(x.getDate() + i);
      var n = SP.hub.data().schedule.filter(function (l) { return Number(l.day) === i; }).length;
      h += '<button type="button" role="tab" class="day-chip' + (i === td ? ' is-today' : '') + '" data-day="' + i + '" aria-selected="' + (i === dayIdx) + '">' +
        '<span class="dc-name">' + SP.esc(SP.t(DAY_KEYS[i] + 'Short')) + '</span><span class="dc-date">' + x.getDate() + '</span>' + (n ? '<span class="dc-dot" aria-hidden="true"></span>' : '') + '</button>';
    }
    h += '</div>';
    var slots = (SP.hub.data().timeSlots || []).slice().sort(function (a, b) { return toMin(a.start) - toMin(b.start); });
    var list = slots.map(function (s) { return { s: s, ls: lessonsAt(dayIdx, s.id) }; }).filter(function (x) { return x.ls.length; });
    var dt = new Date(mon); dt.setDate(dt.getDate() + dayIdx);
    h += '<section class="card day-card"><div class="card-head"><div><div class="card-title">' + SP.esc(SP.t(DAY_KEYS[dayIdx])) + '</div><div class="card-sub">' + SP.esc(fmtShort(dt)) + ' · ' + SP.esc(SP.t('schedule.lessons', { n: list.reduce(function (a, x) { return a + x.ls.length; }, 0) })) + '</div></div></div>';
    if (!list.length) h += '<div class="empty">' + SP.icon('sun', 'ic-xl') + '<h3>' + SP.esc(SP.t('schedule.freeDay')) + '</h3></div>';
    else h += '<ol class="day-list">' + list.map(function (x) {
      return '<li class="day-row"><div class="day-time"><b>' + SP.esc(hhmm(x.s.start)) + '</b><span class="subtle">' + SP.esc(hhmm(x.s.end)) + '</span></div><div class="day-lessons">' + x.ls.map(function (l) { return lessonCard(l, false); }).join('') + '</div></li>';
    }).join('') + '</ol>';
    return h + '</section>';
  }

  function emptyState(linked) {
    var guest = SP.auth.isGuest();
    return '<section class="card"><div class="empty">' + SP.icon('calendar-days', 'ic-xl') +
      '<h3>' + SP.esc(SP.t('schedule.emptyTitle')) + '</h3>' +
      '<p>' + SP.esc(SP.t(linked ? 'schedule.emptyLinked' : 'schedule.emptyGuest')) + '</p>' +
      '<div class="btn-group">' +
      (linked ? '<button type="button" class="btn btn-primary" data-refresh-btn id="emRefresh">' + SP.icon('refresh-cw') + '<span>' + SP.esc(SP.t('data.refresh')) + '</span></button>' : '') +
      (guest && SP.api.configured() ? '<button type="button" class="btn btn-primary" id="emLogin">' + SP.icon('log-in') + '<span>' + SP.esc(SP.t('auth.loginPlatonus')) + '</span></button>' : '') +
      '<button type="button" class="btn" id="emUpload">' + SP.icon('upload') + '<span>' + SP.esc(SP.t('schedule.upload')) + '</span></button>' +
      '<button type="button" class="btn btn-ghost" id="emHelp">' + SP.icon('circle-help') + '<span>' + SP.esc(SP.t('schedule.howTo')) + '</span></button>' +
      '</div></div></section>';
  }

  function wire() {
    var q = function (s) { return SP.$(s, root); };
    SP.$$('[data-wk]', root).forEach(function (b) { b.onclick = function () { var v = +b.getAttribute('data-wk'); weekOff = v === 0 ? 0 : weekOff + v; if (v === 0) dayIdx = null; render(); }; });
    SP.$$('[data-mode]', root).forEach(function (b) { b.onclick = function () { ui.mode = b.getAttribute('data-mode'); saveUI(); render(); }; });
    SP.$$('[data-zoom]', root).forEach(function (b) { b.onclick = function () { ui.zoom = SP.clamp(ui.zoom + +b.getAttribute('data-zoom'), 60, 160); saveUI(); render(); }; });
    SP.$$('[data-day]', root).forEach(function (b) { b.onclick = function () { dayIdx = +b.getAttribute('data-day'); render(); var c = SP.$('[data-day="' + dayIdx + '"]', root); if (c) c.focus(); }; });
    SP.$$('[data-src]', root).forEach(function (b) { b.onclick = function () { SP.hub.setPref(b.getAttribute('data-src')); }; });
    SP.$$('.lesson', root).forEach(function (b) { b.onclick = function () { SP.navigate('subjects', [b.getAttribute('data-sid')]); }; });
    var r = q('#schRefresh') || q('#emRefresh'); if (r) r.onclick = function () { SP.data.refresh({ manual: true }); };
    var ug = q('#updGo'); if (ug) ug.onclick = function () { SP.hub.acceptUpdate(); };
    var ul = q('#updLater'); if (ul) ul.onclick = function () { updDismissed = true; render(); };
    var el = q('#emLogin'); if (el) el.onclick = function () { SP.auth.showScreen('register').then(function () { location.reload(); }); };
    var eu = q('#emUpload'); if (eu) eu.onclick = SP.schedule.upload;
    var eh = q('#emHelp'); if (eh) eh.onclick = SP.schedule.help;
    /* стрелки ← → переключают дни в режиме «День» */
    var chips = q('.day-chips');
    if (chips) chips.onkeydown = function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); dayIdx = (dayIdx + (e.key === 'ArrowRight' ? 1 : 5)) % 6; render(); SP.$('[data-day="' + dayIdx + '"]', root).focus();
    };
  }

  /* ---------- Загрузка / помощь / ручная правка (используются и из Настроек) ---------- */
  SP.schedule = {
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
          var body = '<ul>' + rows.map(function (r) { return '<li>' + SP.esc(r) + '</li>'; }).join('') + '</ul>' +
            (rep.errs.length ? '<div class="alert alert-danger">' + SP.icon('circle-x') + '<div class="alert-body">' + rep.errs.map(SP.esc).join('<br>') + '<span>' + SP.esc(SP.t('import.safe')) + '</span></div></div>' : '');
          SP.modal({ title: SP.t(rep.files ? 'import.done' : 'import.failed'), body: body, actions: [{ label: SP.t('common.understood'), kind: 'primary' }] });
          if (rep.files) SP.navigate('schedule');
        });
      };
      inp.click();
    },
    help: function () {
      var prompt = SP.t('schedule.aiPrompt');
      var m = SP.modal({
        title: SP.t('schedule.howTo'), size: 'lg',
        body: '<ol class="stack-sm"><li>' + SP.esc(SP.t('schedule.help1')) + '</li><li>' + SP.esc(SP.t('schedule.help2')) + '</li><li>' + SP.esc(SP.t('schedule.help3')) + '</li><li>' + SP.esc(SP.t('schedule.help4')) + '</li></ol>' +
          '<div class="field"><label class="label" for="aiPr">' + SP.esc(SP.t('schedule.aiPromptLabel')) + '</label><textarea class="textarea mono small" id="aiPr" rows="8" readonly>' + SP.esc(prompt) + '</textarea></div>',
        actions: [
          { label: SP.t('schedule.dlTemplate'), icon: 'download', close: false, onClick: function () {
            var ex = { version: 1, timeSlots: [{ id: 'slot1', start: '08:30:00', end: '09:20:00' }], subjects: [{ id: 'subject-1', code: '', name: 'Название предмета', teacher: '', materials: [], tests: [], notes: '' }], schedule: [{ id: 'lesson-1', day: 0, slotId: 'slot1', subjectId: 'subject-1', name: 'Название предмета', kind: 'Лекция', room: '', building: '', teacher: '' }] };
            SP.downloadText(JSON.stringify(ex, null, 2), 'studyplay-schedule-template.json', 'application/json'); return false;
          } },
          { label: SP.t('common.copy'), icon: 'copy', kind: 'primary', close: false, onClick: function () { SP.copyText(prompt).then(function () { SP.toast(SP.t('common.copied'), 'success'); }); return false; } }
        ]
      });
      return m;
    },
    editJson: function () {
      var d = SP.hub.data();
      var json = JSON.stringify({ timeSlots: d.timeSlots, schedule: d.schedule }, null, 2);
      SP.modal({
        title: SP.t('schedule.editTitle'), size: 'lg',
        body: '<p class="muted small">' + SP.esc(SP.t('schedule.editText')) + '</p><textarea class="textarea mono small" id="schJson" rows="16" spellcheck="false">' + SP.esc(json) + '</textarea><div class="error-text" id="schJsonErr" role="alert"></div>',
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
    mount: function (el) { root = el; render(); },
    show: function () { render(); SP.hub.checkUpdate(); },
    refresh: render
  });
  SP.on('hub', function () { if (root && SP.views.current() === 'schedule') render(); });
  SP.on('hub-update', function () { updDismissed = false; if (root && SP.views.current() === 'schedule') render(); });
  SP.on('data', function () { if (root && SP.views.current() === 'schedule') render(); });
})();

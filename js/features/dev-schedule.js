/* =====================================================================
   РАЗДЕЛ «РАЗРАБОТЧИК», вкладка «Расписание»: расписание каждой группы для всех.
   Редактор наглядный: неделя выглядит как у студента (вид «Компьютер» — как
   Timetable, вид «Телефон» — как Shokan). «＋» в пустой клетке — новая пара,
   нажал на пару — окно «изменить / удалить», пару можно перетащить на другое
   время или день (js/core/drag.js). Под сеткой — время пар и предметы.
   Правится файл data/<группа>/schedule.json:
     timeSlots — время пар, subjects — предметы и преподаватели,
     schedule  — пары: день (0 = пн … 5 = сб), пара, предмет, тип, кабинет.
   Можно начать с сохранённой страницы Timetable (.html) или чужого
   schedule.json, или скопировать расписание другой группы.
   Черновик каждой группы хранится в браузере (sp-dev-sched:<папка>), пока не опубликован.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var DRAFT = 'sp-dev-sched', DAYS = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
  var KINDS = ['Лекция', 'Практика', 'Лабораторная', 'Семинар', 'СРСП'];
  var DEF_SLOTS = [['08:30', '09:20'], ['09:30', '10:20'], ['10:30', '11:20'], ['11:30', '12:20'], ['12:30', '13:20'], ['13:40', '14:30']];
  var dir = '', S = null, orig = '', loading = false, err = '', box = null, core = null, lastSubj = '', lastKind = KINDS[0];
  var view = SP.store.get(DRAFT + '-view', '') || (window.innerWidth < 768 ? 'phone' : 'pc');
  var uid = function (p) { return p + Math.random().toString(36).slice(2, 8); };
  var hm = function (t) { return String(t || '').slice(0, 5); };

  function empty() { return { version: '', timeSlots: DEF_SLOTS.map(function (x, i) { return { id: 'p' + (i + 1), start: x[0], end: x[1] }; }), subjects: [], schedule: [] }; }
  function norm(x) {
    x = x || {};
    var s = { version: String(x.version || ''), timeSlots: [], subjects: [], schedule: [] };
    s.timeSlots = (Array.isArray(x.timeSlots) && x.timeSlots.length ? x.timeSlots : empty().timeSlots).map(function (t) { return { id: String(t.id || uid('p')), start: hm(t.start), end: hm(t.end) }; });
    s.subjects = (Array.isArray(x.subjects) ? x.subjects : []).filter(function (j) { return j && j.name; }).map(function (j) { return { id: String(j.id || uid('s')), code: j.code || '', name: String(j.name), teacher: j.teacher || '' }; });
    s.schedule = (Array.isArray(x.schedule) ? x.schedule : []).filter(function (l) { return l && l.day >= 0 && l.day <= 5; }).map(function (l) {
      return { id: String(l.id || uid('lesson-')), day: +l.day, slotId: String(l.slotId || ''), subjectId: String(l.subjectId || ''), kind: l.kind || '', room: l.room || '', building: l.building || '' };
    });
    return s;
  }
  function text() { return JSON.stringify(S); }
  /* черновик у каждой группы свой: sp-dev-sched:<папка> */
  function dkey(d) { return DRAFT + ':' + (d || dir); }
  function saveDraft() { SP.store.set(dkey(), { dir: dir, data: S, orig: orig }); SP.store.set(DRAFT + '-dir', dir); }
  function isDirty() { return !!S && text() !== orig; }

  function load(d, force) {
    dir = d; err = ''; S = null; loading = true; paint();
    var dr = SP.store.get(dkey(d), null);
    if (!force && dr && dr.dir === d && dr.data) { S = norm(dr.data); orig = dr.orig || ''; loading = false; paint(); return; }
    core.remoteFile('data/' + d + '/schedule.json').then(function (j) {
      if (j === undefined) err = SP.t('dev.loadErr');
      S = norm(j || empty()); orig = j ? JSON.stringify(S) : ''; SP.store.del(dkey());
    }).catch(function (e) { err = e.message; S = norm(empty()); orig = ''; }).then(function () { loading = false; paint(); });
  }
  function select(d) { if (d && d !== dir) { if (isDirty()) saveDraft(); dir = d; S = null; } }

  /* итоговый schedule.json: имя, преподаватель и код пары берутся из предмета */
  function outJson() {
    var sj = {}; S.subjects.forEach(function (j) { sj[j.id] = j; });
    var o = {
      version: core.nextVersion(S.version), updatedAt: new Date().toISOString(), timeSlots: S.timeSlots, subjects: S.subjects,
      schedule: S.schedule.filter(function (l) { return sj[l.subjectId]; }).sort(function (a, b) { return a.day - b.day || slotIdx(a.slotId) - slotIdx(b.slotId); }).map(function (l, i) {
        var j = sj[l.subjectId];
        return { id: 'lesson-' + (i + 1), day: l.day, slotId: l.slotId, subjectId: l.subjectId, code: j.code || '', name: j.name, kind: l.kind, room: l.room, building: l.building, teacher: j.teacher || '' };
      })
    };
    return o;
  }
  function slotIdx(id) { for (var i = 0; i < S.timeSlots.length; i++) if (S.timeSlots[i].id === id) return i; return 99; }
  function subj(id) { return S.subjects.filter(function (j) { return j.id === id; })[0]; }
  function at(d, slotId) { return S.schedule.filter(function (l) { return l.day === d && l.slotId === slotId; }); }
  /* как пару покажет Расписание: название, тип (Л, П…), цвет, кабинет */
  function look(l) {
    var j = subj(l.subjectId) || {};
    var x = SP.schedule && SP.schedule.look ? SP.schedule.look({ name: j.name || '?', kind: l.kind, room: l.room, building: l.building, teacher: j.teacher || ' ', subjectId: '' }) : { name: j.name || '?', ab: '', cls: 'k-oth', kind: l.kind, room: l.room, building: l.building, teacher: j.teacher };
    x.teacher = j.teacher || ''; return x;
  }

  /* карточка «Сохранить для всех» — перерисовывается отдельно, чтобы не сбивать ввод в полях */
  function saveCard(has) {
    var h = '';
    var dirty = isDirty();
    h += '<section class="card dev-changes' + (dirty ? ' has' : '') + '"><div class="card-head"><div><h2 class="card-title">' + SP.icon('upload') + esc(SP.t('dev.s.save')) + '</h2><div class="card-sub">' +
      esc(dirty ? SP.t('dev.s.dirty', { n: S.schedule.length }) : SP.t('dev.noChanges')) + '</div></div>' +
      (dirty ? '<button type="button" class="btn btn-ghost btn-sm" id="dsReset">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('dev.reset')) + '</span></button>' : '') + '</div>' +
      '<div class="dev-ways"><div class="dev-way"><b>' + esc(SP.t('dev.wayB')) + '</b><small>' + esc(SP.t(has ? 'dev.s.pubText' : 'dev.wayBNoKey')) + '</small><button type="button" class="btn btn-primary" id="dsPub"' + (dirty && has ? '' : ' disabled') + '>' + SP.icon('upload') + '<span>' + esc(SP.t('dev.publish')) + '</span></button></div></div></section>';
    return h;
  }

  /* ---------- Сетка недели: как у студента ---------- */
  function addBtn(d, t) { return '<button type="button" class="ds-add" data-addat="' + d + ':' + esc(t.id) + '" aria-label="' + esc(SP.t('dev.s.addAt', { d: SP.t(DAYS[d]), t: t.start })) + '">' + SP.icon('plus') + '</button>'; }
  /* вид «Компьютер» — как Timetable */
  function gridPc() {
    var h = '<div class="tt-wrap ds-tt"><div class="tt-scroll"><table class="tt-table"><tbody><tr><td class="tt-corner"></td>';
    DAYS.forEach(function (dk, d) { h += '<td class="tt-head ds-dayh"><b>' + esc(SP.t(dk)) + '</b>' + dayBtn(d) + '</td>'; });
    h += '</tr>';
    S.timeSlots.forEach(function (t) {
      h += '<tr><td class="tt-time">' + esc(t.start) + '<br>' + esc(t.end) + '</td>';
      DAYS.forEach(function (dk, d) {
        var ls = at(d, t.id);
        h += '<td class="tt-cell ds-cell' + (ls.length > 1 ? ' ds-clash' : '') + '" data-day="' + d + '" data-slot="' + esc(t.id) + '"><div class="tt-box">' + ls.map(function (l) {
          var x = look(l);
          return '<button type="button" class="tt-l ds-les ' + x.cls + '" data-li="' + S.schedule.indexOf(l) + '"><b>' + esc(x.name) + '</b>' + (x.ab ? ' <span class="tt-ab">' + esc(x.ab) + '</span>' : '') +
            (x.room || x.building ? '<span class="tt-line">' + esc(x.room) + (x.building ? ' (' + esc(x.building) + ')' : '') + '</span>' : '') +
            '<span class="tt-line' + (x.teacher ? '' : ' ds-warn') + '">' + esc(x.teacher || SP.t('dev.s.noTeacherShort')) + '</span></button>';
        }).join('') + addBtn(d, t) + '</div></td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div></div>';
  }
  /* вид «Телефон» — как Shokan «Неделя» */
  function gridPhone() {
    var letters = SP.t('shk.letters').split(',');
    var h = '<div class="ds-phone"><div class="shk"><div class="shk-week"><table class="shk-grid" style="--cols:6"><thead><tr><th class="shk-tcol"></th>' +
      DAYS.map(function (dk, d) { return '<th class="ds-dayh"><span class="shk-dl">' + esc(letters[d]) + '</span>' + dayBtn(d) + '</th>'; }).join('') + '</tr></thead><tbody>';
    S.timeSlots.forEach(function (t) {
      h += '<tr><th class="shk-tcol" scope="row"><span class="shk-t1">' + esc(t.start) + '</span><span class="shk-t2">' + esc(t.end) + '</span></th>';
      DAYS.forEach(function (dk, d) {
        var ls = at(d, t.id);
        if (!ls.length) { h += '<td class="shk-empty ds-cell" data-day="' + d + '" data-slot="' + esc(t.id) + '">' + addBtn(d, t) + '</td>'; return; }
        var x = look(ls[0]);
        h += '<td class="shk-fill ds-cell' + (ls.length > 1 ? ' ds-clash' : '') + '" data-day="' + d + '" data-slot="' + esc(t.id) + '"><button type="button" class="shk-wl ds-les ' + x.cls + '" data-li="' + S.schedule.indexOf(ls[0]) + '"' + (ls.length > 1 ? ' data-many="1"' : '') + '><span class="shk-wn">' + esc(x.name) + '</span><span class="shk-wk">' + esc(x.kind || x.ab) + (ls.length > 1 ? ' +' + (ls.length - 1) : '') + '</span></button></td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div></div></div>';
  }
  function dayBtn(d) { return '<button type="button" class="btn btn-ghost btn-icon btn-sm ds-daym" data-daym="' + d + '" aria-label="' + esc(SP.t('dev.s.dayMenu', { d: SP.t(DAYS[d]) })) + '" data-tip="' + esc(SP.t('dev.s.dayMenu', { d: SP.t(DAYS[d]) })) + '">' + SP.icon('ellipsis') + '</button>'; }

  /* подсказки: две пары в одно время, предметы без преподавателя */
  function warnings() {
    var out = [], seen = {};
    S.schedule.forEach(function (l) {
      var k = l.day + ':' + l.slotId; if (seen[k]) return;
      if (at(l.day, l.slotId).length > 1) { seen[k] = 1; var t = S.timeSlots[slotIdx(l.slotId)]; out.push(SP.t(DAYS[l.day]) + ' ' + (t ? t.start : '')); }
    });
    var h = '';
    if (out.length) h += '<div class="alert alert-warning">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(SP.t('dev.s.clash', { list: out.join(', ') })) + '</div></div>';
    var noT = S.subjects.filter(function (j) { return !j.teacher; }).length;
    if (noT) h += '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body">' + esc(SP.t('dev.s.noTeacher', { n: noT })) + '</div></div>';
    return h;
  }

  /* ---------- Отрисовка ---------- */
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function paint() {
    if (!box || !box.isConnected) return;
    var groups = core.groups(), has = core.hasKey(), g = groups.filter(function (x) { return x.folder === dir; })[0];
    var h = '<div class="row dev-bar"><label class="row row-nowrap"><span class="small muted">' + esc(SP.t('dev.group')) + '</span><select class="input" id="dsGroup">' + groups.map(function (x) { return opt(x.folder, x.name, dir); }).join('') + '</select></label>' +
      '<button type="button" class="btn" id="dsFile">' + SP.icon('upload') + '<span>' + esc(SP.t('dev.s.file')) + '</span></button>' +
      (groups.length > 1 ? '<button type="button" class="btn" id="dsCopy">' + SP.icon('copy') + '<span>' + esc(SP.t('dev.s.copy')) + '</span></button>' : '') +
      '<button type="button" class="btn btn-ghost" id="dsReload">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('dev.reload')) + '</span></button>' +
      '<span class="small muted grow">' + esc(SP.t('dev.version', { v: (S && S.version) || '—' })) + '</span></div>';
    if (loading || !S) { box.innerHTML = h + '<p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('dev.loading')) + '</p>'; wireBar(); return; }
    if (err) h += '<div class="alert alert-danger">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(err) + '</div></div>';
    if (!orig && !isDirty()) h += '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body">' + esc(SP.t('dev.s.none', { g: g ? g.name : dir })) + '</div></div>';

    /* сохранить */
    h += saveCard(has);

    /* неделя — как у студента */
    h += '<section class="card ds-week"><div class="card-head"><div><h2 class="card-title">' + SP.icon('calendar-days') + esc(SP.t('dev.s.week')) + '</h2><div class="card-sub">' + esc(SP.t('dev.s.gridHint')) + '</div></div>' +
      '<div class="segmented" role="group" aria-label="' + esc(SP.t('dev.s.viewAs')) + '">' + [['pc', 'monitor'], ['phone', 'smartphone']].map(function (v) {
        return '<button type="button" data-dsview="' + v[0] + '" aria-pressed="' + (view === v[0]) + '">' + SP.icon(v[1], 'ic-sm') + '<span>' + esc(SP.t('dev.s.view.' + v[0])) + '</span></button>';
      }).join('') + '</div></div>' + warnings() +
      (S.subjects.length ? '' : '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body">' + esc(SP.t('dev.s.firstSubj')) + '</div></div>') +
      '<div id="dsGrid">' + (view === 'phone' ? gridPhone() : gridPc()) + '</div></section>';

    /* предметы */
    h += '<details class="card ds-more"' + (S.subjects.length ? '' : ' open') + '><summary class="card-head"><div><h2 class="card-title">' + SP.icon('folder') + esc(SP.t('dev.s.subjects')) + ' <span class="count">' + S.subjects.length + '</span></h2><div class="card-sub">' + esc(SP.t('dev.s.subjectsSub')) + '</div></div>' + SP.icon('chevron-down', 'ds-chev') + '</summary>' +
      '<div class="ds-rows">' + (S.subjects.length ? S.subjects.map(function (j, i) {
        return '<div class="ds-row ds-subj"><input class="input" data-subj="' + i + '" data-k="name" value="' + esc(j.name) + '" placeholder="' + esc(SP.t('dev.subjName')) + '" aria-label="' + esc(SP.t('dev.subjName')) + '">' +
          '<input class="input' + (j.teacher ? '' : ' ds-need') + '" data-subj="' + i + '" data-k="teacher" value="' + esc(j.teacher) + '" placeholder="' + esc(SP.t('dev.s.teacher')) + '" aria-label="' + esc(SP.t('dev.s.teacher')) + '">' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-delsubj="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div>';
      }).join('') : '<p class="small subtle">' + esc(SP.t('dev.s.noSubj')) + '</p>') + '</div>' +
      '<div class="row"><button type="button" class="btn btn-sm" id="dsAddSubj">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.addSubject')) + '</span></button></div></details>';

    /* время пар */
    h += '<details class="card ds-more"><summary class="card-head"><div><h2 class="card-title">' + SP.icon('clock') + esc(SP.t('dev.s.slots')) + ' <span class="count">' + S.timeSlots.length + '</span></h2><div class="card-sub">' + esc(SP.t('dev.s.slotsSub')) + '</div></div>' + SP.icon('chevron-down', 'ds-chev') + '</summary><div class="ds-rows">' +
      S.timeSlots.map(function (t, i) {
        return '<div class="ds-row ds-slot"><b class="ds-n">' + (i + 1) + '</b><input class="input" type="time" data-slot="' + i + '" data-k="start" value="' + esc(t.start) + '" aria-label="' + esc(SP.t('dev.s.start')) + '"><span>–</span><input class="input" type="time" data-slot="' + i + '" data-k="end" value="' + esc(t.end) + '" aria-label="' + esc(SP.t('dev.s.end')) + '">' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-delslot="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div>';
      }).join('') + '</div><div class="row"><button type="button" class="btn btn-sm" id="dsAddSlot">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.s.addSlot')) + '</span></button></div></details>';
    box.innerHTML = h;
    wireBar(); wire();
  }

  /* ---------- Окно пары: предмет, тип, кабинет; сверху — как её увидят студенты ---------- */
  function lessonDialog(l, isNew) {
    var cur = Object.assign({}, l);
    var body = '<div class="stack">' +
      '<div class="ds-prev"><div class="small muted">' + esc(SP.t('dev.s.preview')) + '</div><div class="ds-prev-box" id="dlPrev"></div></div>' +
      '<div class="field"><label class="label" for="dlS">' + esc(SP.t('dev.fSubject')) + '</label><select class="input" id="dlS">' + S.subjects.map(function (j) { return opt(j.id, j.name, cur.subjectId); }).join('') + opt('__new', SP.t('dev.s.newSubj'), '') + '</select></div>' +
      '<div class="ds-newsubj" id="dlNew" hidden><div class="field"><label class="label" for="dlSN">' + esc(SP.t('dev.subjName')) + '</label><input class="input" id="dlSN"></div>' +
      '<div class="field"><label class="label" for="dlST">' + esc(SP.t('dev.s.teacher')) + '</label><input class="input" id="dlST"></div></div>' +
      '<div class="field"><span class="label">' + esc(SP.t('dev.s.kind')) + '</span><div class="ds-kinds" role="radiogroup">' + KINDS.concat(KINDS.indexOf(cur.kind) < 0 && cur.kind ? [cur.kind] : []).map(function (k) {
        return '<button type="button" class="ds-chip" role="radio" data-kind="' + esc(k) + '" aria-checked="' + (k === cur.kind) + '">' + esc(k) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="ds-two"><div class="field"><label class="label" for="dlR">' + esc(SP.t('dev.s.room')) + '</label><input class="input" id="dlR" value="' + esc(cur.room) + '"></div>' +
      '<div class="field"><label class="label" for="dlB">' + esc(SP.t('dev.s.building')) + '</label><input class="input" id="dlB" value="' + esc(cur.building) + '" list="dlBl"><datalist id="dlBl">' + buildings().map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div></div>' +
      '<div class="field"><label class="label" for="dlT">' + esc(SP.t('dev.s.when')) + '</label><div class="ds-two"><select class="input" id="dlD">' + DAYS.map(function (dk, d) { return opt(String(d), SP.t(dk), String(cur.day)); }).join('') + '</select>' +
      '<select class="input" id="dlT">' + S.timeSlots.map(function (t, k) { return opt(t.id, (k + 1) + ' · ' + t.start + '–' + t.end, cur.slotId); }).join('') + '</select></div></div></div>';
    var acts = [];
    if (!isNew) acts.push({ label: SP.t('common.delete'), icon: 'trash-2', kind: 'danger-outline', onClick: function () { S.schedule.splice(S.schedule.indexOf(l), 1); changed(true); SP.toast(SP.t('dev.s.deleted'), 'success'); } });
    acts.push({ label: SP.t('common.cancel') });
    acts.push({ label: SP.t(isNew ? 'dev.s.addLesson' : 'common.save'), kind: 'primary', icon: 'check', onClick: function (m) {
      read(m);
      if (cur.subjectId === '__new') {
        var n = SP.$('#dlSN', m.el).value.trim(); if (!n) { SP.$('#dlSN', m.el).focus(); return false; }
        var j = { id: uid('s'), code: '', name: n, teacher: SP.$('#dlST', m.el).value.trim() }; S.subjects.push(j); cur.subjectId = j.id;
      }
      Object.assign(l, cur); if (isNew) S.schedule.push(l);
      lastSubj = cur.subjectId; lastKind = cur.kind; changed(true);
    } });
    var m = SP.modal({ title: SP.t(isNew ? 'dev.s.newLesson' : 'dev.s.lesson'), body: body, actions: acts });
    function read(mm) {
      cur.subjectId = SP.$('#dlS', mm.el).value; cur.room = SP.$('#dlR', mm.el).value.trim(); cur.building = SP.$('#dlB', mm.el).value.trim();
      cur.day = +SP.$('#dlD', mm.el).value; cur.slotId = SP.$('#dlT', mm.el).value;
    }
    function prev() {
      read(m);
      var nw = cur.subjectId === '__new'; SP.$('#dlNew', m.el).hidden = !nw;
      var j = nw ? { name: SP.$('#dlSN', m.el).value.trim() || SP.t('dev.subjName'), teacher: SP.$('#dlST', m.el).value.trim() } : (subj(cur.subjectId) || {});
      var x = SP.schedule.look({ name: j.name || '?', kind: cur.kind, room: cur.room, building: cur.building, teacher: j.teacher || ' ', subjectId: '' });
      var t = S.timeSlots[slotIdx(cur.slotId)] || {};
      SP.$('#dlPrev', m.el).innerHTML = '<div class="tt-l ' + x.cls + '"><b>' + esc(x.name) + '</b>' + (x.ab ? ' <span class="tt-ab">' + esc(x.ab) + '</span>' : '') +
        (x.room || x.building ? '<span class="tt-line">' + esc(x.room) + (x.building ? ' (' + esc(x.building) + ')' : '') + '</span>' : '') +
        '<span class="tt-line' + (j.teacher ? '' : ' ds-warn') + '">' + esc(j.teacher || SP.t('dev.s.noTeacherShort')) + '</span></div>' +
        '<div class="small muted">' + esc(SP.t(DAYS[cur.day]) + ', ' + (t.start || '') + '–' + (t.end || '') + (x.kind ? ' · ' + x.kind : '')) + '</div>';
      var clash = S.schedule.some(function (o) { return o !== l && o.day === cur.day && o.slotId === cur.slotId; });
      if (clash) SP.$('#dlPrev', m.el).insertAdjacentHTML('beforeend', '<div class="small ds-warn">' + SP.icon('triangle-alert', 'ic-sm') + ' ' + esc(SP.t('dev.s.clashOne')) + '</div>');
    }
    m.el.addEventListener('input', prev); m.el.addEventListener('change', prev);
    SP.$$('[data-kind]', m.el).forEach(function (b) { b.onclick = function () { cur.kind = b.getAttribute('data-kind'); SP.$$('[data-kind]', m.el).forEach(function (x) { x.setAttribute('aria-checked', x === b); }); prev(); }; });
    prev();
    var first = SP.$(S.subjects.length ? '#dlS' : '#dlSN', m.el); if (!S.subjects.length) { SP.$('#dlS', m.el).value = '__new'; prev(); }
    if (first) first.focus();
  }
  function buildings() { var o = []; S.schedule.forEach(function (l) { if (l.building && o.indexOf(l.building) < 0) o.push(l.building); }); return o; }
  function newAt(d, slotId) {
    var sid = subj(lastSubj) ? lastSubj : (S.subjects[0] && S.subjects[0].id) || '__new';
    lessonDialog({ id: uid('lesson-'), day: d, slotId: slotId, subjectId: sid, kind: lastKind, room: '', building: buildings()[0] || '' }, true);
  }
  function openLesson(b) {
    var l = S.schedule[+b.getAttribute('data-li')]; if (!l) return;
    if (!b.hasAttribute('data-many')) { lessonDialog(l, false); return; }
    /* в виде «Телефон» в клетке видно одну пару — выбрать, какую открыть */
    SP.menu(b, at(l.day, l.slotId).map(function (x) { var k = look(x); return { label: k.name + (k.ab ? ' · ' + k.ab : ''), icon: 'pencil', onClick: function () { lessonDialog(x, false); } }; })
      .concat(['-', { label: SP.t('dev.s.addLesson'), icon: 'plus', onClick: function () { newAt(l.day, l.slotId); } }]));
  }
  function dayMenu(b) {
    var d = +b.getAttribute('data-daym'), n = S.schedule.filter(function (l) { return l.day === d; }).length, name = SP.t(DAYS[d]);
    SP.menu(b, [
      { label: SP.t('dev.s.copyDay', { d: name }), icon: 'copy', disabled: !n, onClick: function () { copyDay(d); } },
      { label: SP.t('dev.s.clearDay', { d: name }), icon: 'trash-2', danger: true, disabled: !n, onClick: function () {
        SP.confirm({ title: SP.t('dev.s.clearDay', { d: name }), text: SP.t('dev.s.clearDayText', { n: n }), danger: true }).then(function (ok) { if (ok) { S.schedule = S.schedule.filter(function (l) { return l.day !== d; }); changed(true); } });
      } }
    ]);
  }
  function copyDay(d) {
    var m = SP.modal({ title: SP.t('dev.s.copyDay', { d: SP.t(DAYS[d]) }), body: '<p class="small muted">' + esc(SP.t('dev.s.copyDayText')) + '</p><div class="ds-kinds">' +
      DAYS.map(function (dk, k) { return k === d ? '' : '<label class="ds-chip"><input type="checkbox" data-cpd="' + k + '"> ' + esc(SP.t(dk)) + '</label>'; }).join('') + '</div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.copy'), kind: 'primary', icon: 'copy', onClick: function () {
        var to = SP.$$('[data-cpd]:checked', m.el).map(function (c) { return +c.getAttribute('data-cpd'); }); if (!to.length) return false;
        var src = S.schedule.filter(function (l) { return l.day === d; }), n = 0;
        to.forEach(function (k) { src.forEach(function (l) { S.schedule.push(Object.assign({}, l, { id: uid('lesson-'), day: k })); n++; }); });
        changed(true); SP.toast(SP.t('dev.s.copied', { n: n }), 'success');
      } }] });
  }

  /* ---------- Действия ---------- */
  function changed(redraw) {
    saveDraft();
    if (redraw) { var y = window.scrollY; paint(); window.scrollTo(0, y); return; }
    var c = SP.$('.dev-changes', box); if (!c) return;
    c.outerHTML = saveCard(core.hasKey()); wire();
  }
  function wireBar() {
    var on = function (s, fn) { var el = SP.$(s, box); if (el) el.onclick = fn; };
    var gs = SP.$('#dsGroup', box); if (gs) gs.onchange = function () { var v = gs.value; if (isDirty()) saveDraft(); load(v, false); };
    on('#dsReload', function () {
      if (!isDirty()) { load(dir, true); return; }
      SP.confirm({ title: SP.t('dev.reload'), text: SP.t('dev.s.reloadText'), okLabel: SP.t('dev.reload'), danger: true }).then(function (ok) { if (ok) { SP.store.del(dkey()); load(dir, true); } });
    });
    on('#dsFile', fromFile);
    on('#dsCopy', copyDialog);
  }
  function wire() {
    var on = function (s, fn) { var el = SP.$(s, box); if (el) el.onclick = fn; };
    on('#dsReset', function () { SP.confirm({ title: SP.t('dev.reset'), text: SP.t('dev.s.reloadText'), okLabel: SP.t('dev.reset'), danger: true }).then(function (ok) { if (ok) { SP.store.del(dkey()); load(dir, true); } }); });
    on('#dsPub', publish);
    on('#dsAddSlot', function () { var last = S.timeSlots[S.timeSlots.length - 1]; S.timeSlots.push({ id: uid('p'), start: last ? last.end : '08:30', end: '' }); changed(true); keepOpen(1); });
    on('#dsAddSubj', function () { S.subjects.push({ id: uid('s'), code: '', name: '', teacher: '' }); changed(true); keepOpen(0); var l = SP.$$('[data-subj][data-k="name"]', box); if (l.length) l[l.length - 1].focus(); });
    SP.$$('[data-dsview]', box).forEach(function (b) { b.onclick = function () { view = b.getAttribute('data-dsview'); SP.store.set(DRAFT + '-view', view); paint(); }; });
    SP.$$('[data-addat]', box).forEach(function (b) {
      b.onclick = function () { if (!S.subjects.length && !b) return; var p = b.getAttribute('data-addat').split(':'); newAt(+p[0], p.slice(1).join(':')); };
    });
    SP.$$('.ds-les', box).forEach(function (b) { b.onclick = function () { openLesson(b); }; });
    SP.$$('[data-daym]', box).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); dayMenu(b); }; });
    /* перетащить пару в другую клетку — другое время или день */
    SP.dragSort(SP.$('#dsGrid', box), { item: '.ds-les', key: 'data-li', target: '.ds-cell', onDrop: function (tg, el) {
      var l = S.schedule[+el.getAttribute('data-li')]; if (!l) return;
      l.day = +tg.getAttribute('data-day'); l.slotId = tg.getAttribute('data-slot'); changed(true);
      var t = S.timeSlots[slotIdx(l.slotId)]; SP.toast(SP.t('dev.s.moved', { d: SP.t(DAYS[l.day]), t: t ? t.start : '' }), 'success');
    } });
    SP.$$('[data-delslot]', box).forEach(function (b) { b.onclick = function () { var t = S.timeSlots[+b.getAttribute('data-delslot')], used = S.schedule.filter(function (l) { return l.slotId === t.id; }).length; var go = function () { S.timeSlots.splice(S.timeSlots.indexOf(t), 1); S.schedule = S.schedule.filter(function (l) { return l.slotId !== t.id; }); changed(true); keepOpen(1); }; if (used) SP.confirm({ title: SP.t('common.delete'), text: SP.t('dev.s.delUsed', { n: used }), danger: true }).then(function (ok) { if (ok) go(); }); else go(); }; });
    SP.$$('[data-delsubj]', box).forEach(function (b) { b.onclick = function () { var j = S.subjects[+b.getAttribute('data-delsubj')], used = S.schedule.filter(function (l) { return l.subjectId === j.id; }).length; var go = function () { S.subjects.splice(S.subjects.indexOf(j), 1); S.schedule = S.schedule.filter(function (l) { return l.subjectId !== j.id; }); changed(true); keepOpen(0); }; if (used) SP.confirm({ title: SP.t('common.delete'), text: SP.t('dev.s.delUsed', { n: used }), danger: true }).then(function (ok) { if (ok) go(); }); else go(); }; });
    /* поля: сохраняем при изменении; сетку перерисовываем, раскрытый блок остаётся раскрытым */
    box.onchange = function (e) {
      var t = e.target, k = t.getAttribute('data-k'); if (!k) return;
      if (t.hasAttribute('data-slot')) { S.timeSlots[+t.getAttribute('data-slot')][k] = t.value; changed(true); keepOpen(1); }
      else if (t.hasAttribute('data-subj')) { S.subjects[+t.getAttribute('data-subj')][k] = t.value.trim(); changed(true); keepOpen(0); }
    };
  }
  /* после перерисовки снова раскрыть «Предметы» (0) или «Время пар» (1) */
  function keepOpen(i) { var d = SP.$$('.ds-more', box)[i]; if (d) d.open = true; }
  function fromFile() {
    var inp = SP.el('<input type="file" accept=".json,.html,.htm,application/json,text/html" hidden>'); document.body.appendChild(inp);
    inp.onchange = function () {
      var f = inp.files[0]; inp.remove(); if (!f) return;
      f.text().then(function (t) {
        var x = /^\s*</.test(t) ? SP.hub.parseScheduleHtml(t) : JSON.parse(t);
        if (x && x.format === 'studyplay-timetable') throw new Error(SP.t('dev.s.fileBad'));
        if (!x || !Array.isArray(x.schedule) || !x.schedule.length) throw new Error(SP.t('dev.s.fileBad'));
        var n = norm(x); n.version = S.version; S = n; changed(true);
        SP.toast(SP.t('dev.s.fileOk', { n: S.schedule.length }), 'success');
      }).catch(function (e) { SP.toast(e.message || SP.t('dev.s.fileBad'), 'danger', { ms: 8000 }); });
    };
    inp.click();
  }
  function copyDialog() {
    var others = core.groups().filter(function (g) { return g.folder !== dir; });
    var m = SP.modal({
      title: SP.t('dev.s.copy'),
      body: '<div class="stack"><p class="small muted">' + esc(SP.t('dev.s.copyText')) + '</p><select class="input" id="dsFrom">' + others.map(function (g) { return opt(g.folder, g.name, ''); }).join('') + '</select></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('dev.s.copy'), kind: 'primary', onClick: function () {
        var from = SP.$('#dsFrom', m.el).value;
        core.remoteFile('data/' + from + '/schedule.json').then(function (j) {
          if (!j) throw new Error(SP.t('dev.s.copyNone'));
          var n = norm(j); n.version = S.version; S = n; changed(true); SP.toast(SP.t('dev.s.fileOk', { n: S.schedule.length }), 'success');
        }).catch(function (e) { SP.toast(e.message, 'danger'); });
      } }]
    });
  }
  function publish() {
    var bad = S.subjects.filter(function (j) { return !j.name; }).length + S.timeSlots.filter(function (t) { return !t.start || !t.end; }).length;
    if (bad) { SP.toast(SP.t('dev.s.fixEmpty'), 'warning', { ms: 7000 }); return; }
    var g = core.groups().filter(function (x) { return x.folder === dir; })[0];
    SP.confirm({ title: SP.t('dev.publish'), text: SP.t('dev.s.pubConfirm', { g: g ? g.name : dir, n: S.schedule.length }), okLabel: SP.t('dev.publish'), icon: 'upload' }).then(function (ok) {
      if (!ok) return;
      var btn = SP.$('#dsPub', box); SP.busy(btn, true);
      var o = outJson();
      core.commitFiles([{ path: 'data/' + dir + '/schedule.json', content: JSON.stringify(o, null, 2) + '\n' }], SP.t('dev.s.msg', { g: g ? g.name : dir })).then(function () {
        S = norm(o); orig = text(); SP.store.del(dkey()); paint();
        SP.toast(SP.t('dev.published'), 'success', { ms: 9000 });
      }).catch(function (e) { SP.toast(e.message, 'danger', { ms: 10000 }); SP.busy(btn, false); });
    });
  }

  function mount(el, c) {
    box = el; core = c;
    if (!dir) load(SP.store.get(DRAFT + '-dir', '') || c.groupDir(), false);
    else if (!S && !loading) load(dir, false);
    else paint();
  }
  SP.devSchedule = { mount: mount, select: select };
})();

/* =====================================================================
   РАЗРАБОТЧИК → вкладка «Расписание»: расписание каждой группы для всех.
   Правится файл data/<группа>/schedule.json прямо на сайте:
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
  var dir = '', S = null, orig = '', loading = false, err = '', box = null, core = null;
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

  /* карточка «Сохранить для всех» — перерисовывается отдельно, чтобы не сбивать ввод в полях */
  function saveCard(has) {
    var h = '';
    var dirty = isDirty();
    h += '<section class="card dev-changes' + (dirty ? ' has' : '') + '"><div class="card-head"><div><h2 class="card-title">' + SP.icon('upload') + esc(SP.t('dev.s.save')) + '</h2><div class="card-sub">' +
      esc(dirty ? SP.t('dev.s.dirty', { n: S.schedule.length }) : SP.t('dev.noChanges')) + '</div></div>' +
      (dirty ? '<button type="button" class="btn btn-ghost btn-sm" id="dsReset">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('dev.reset')) + '</span></button>' : '') + '</div>' +
      '<div class="dev-ways"><div class="dev-way"><b>' + esc(SP.t('dev.wayB')) + '</b><small>' + esc(SP.t(has ? 'dev.s.pubText' : 'dev.wayBNoKey')) + '</small><button type="button" class="btn btn-primary" id="dsPub"' + (dirty && has ? '' : ' disabled') + '>' + SP.icon('upload') + '<span>' + esc(SP.t('dev.publish')) + '</span></button></div>' +
      '<div class="dev-way"><b>' + esc(SP.t('dev.wayA')) + '</b><small>' + esc(SP.t('dev.s.dlText', { p: 'data/' + dir + '/schedule.json' })) + '</small><button type="button" class="btn" id="dsDl">' + SP.icon('download') + '<span>schedule.json</span></button></div></div></section>';
    return h;
  }
  /* ---------- Отрисовка ---------- */
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function paint() {
    if (!box || !box.isConnected) return;
    var groups = core.groups(), has = core.hasKey(), g = groups.filter(function (x) { return x.folder === dir; })[0];
    var h = '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body"><span>' + SP.t('dev.s.how') + '</span></div></div>' +
      '<div class="row dev-bar"><label class="row row-nowrap"><span class="small muted">' + esc(SP.t('dev.group')) + '</span><select class="input" id="dsGroup">' + groups.map(function (x) { return opt(x.folder, x.name, dir); }).join('') + '</select></label>' +
      '<button type="button" class="btn" id="dsFile">' + SP.icon('upload') + '<span>' + esc(SP.t('dev.s.file')) + '</span></button>' +
      (groups.length > 1 ? '<button type="button" class="btn" id="dsCopy">' + SP.icon('copy') + '<span>' + esc(SP.t('dev.s.copy')) + '</span></button>' : '') +
      '<button type="button" class="btn btn-ghost" id="dsReload">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('dev.reload')) + '</span></button>' +
      '<span class="small muted grow">' + esc(SP.t('dev.version', { v: (S && S.version) || '—' })) + '</span></div>';
    if (loading || !S) { box.innerHTML = h + '<p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('dev.loading')) + '</p>'; wireBar(); return; }
    if (err) h += '<div class="alert alert-danger">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(err) + '</div></div>';
    if (!orig && !isDirty()) h += '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body">' + esc(SP.t('dev.s.none', { g: g ? g.name : dir })) + '</div></div>';

    /* сохранить */
    h += saveCard(has);

    /* время пар */
    h += '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('clock') + esc(SP.t('dev.s.slots')) + '</h2></div><button type="button" class="btn btn-sm" id="dsAddSlot">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.s.addSlot')) + '</span></button></div><div class="ds-rows">' +
      S.timeSlots.map(function (t, i) {
        return '<div class="ds-row ds-slot"><b class="ds-n">' + (i + 1) + '</b><input class="input" type="time" data-slot="' + i + '" data-k="start" value="' + esc(t.start) + '" aria-label="' + esc(SP.t('dev.s.start')) + '"><span>–</span><input class="input" type="time" data-slot="' + i + '" data-k="end" value="' + esc(t.end) + '" aria-label="' + esc(SP.t('dev.s.end')) + '">' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-delslot="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div>';
      }).join('') + '</div></section>';

    /* предметы */
    h += '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('folder') + esc(SP.t('dev.s.subjects')) + '</h2><div class="card-sub">' + esc(SP.t('dev.s.subjectsSub')) + '</div></div><button type="button" class="btn btn-sm" id="dsAddSubj">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.addSubject')) + '</span></button></div><div class="ds-rows">' +
      (S.subjects.length ? S.subjects.map(function (j, i) {
        return '<div class="ds-row ds-subj"><input class="input" data-subj="' + i + '" data-k="name" value="' + esc(j.name) + '" placeholder="' + esc(SP.t('dev.subjName')) + '" aria-label="' + esc(SP.t('dev.subjName')) + '">' +
          '<input class="input" data-subj="' + i + '" data-k="teacher" value="' + esc(j.teacher) + '" placeholder="' + esc(SP.t('dev.s.teacher')) + '" aria-label="' + esc(SP.t('dev.s.teacher')) + '">' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-delsubj="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div>';
      }).join('') : '<p class="small subtle">' + esc(SP.t('dev.s.noSubj')) + '</p>') + '</div></section>';

    /* дни */
    DAYS.forEach(function (dk, d) {
      var ls = S.schedule.map(function (l, i) { return { l: l, i: i }; }).filter(function (x) { return x.l.day === d; }).sort(function (a, b) { return slotIdx(a.l.slotId) - slotIdx(b.l.slotId); });
      h += '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('calendar-days') + esc(SP.t(dk)) + '</h2><div class="card-sub">' + esc(SP.t('dev.s.count', { n: ls.length })) + '</div></div>' +
        '<button type="button" class="btn btn-sm" data-addles="' + d + '"' + (S.subjects.length ? '' : ' disabled') + '>' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.s.addLesson')) + '</span></button></div>' +
        (ls.length ? '<div class="ds-rows">' + ls.map(function (x) {
          var l = x.l, i = x.i;
          return '<div class="ds-row ds-les">' +
            '<select class="input" data-les="' + i + '" data-k="slotId" aria-label="' + esc(SP.t('dev.s.slot')) + '">' + S.timeSlots.map(function (t, k) { return opt(t.id, (k + 1) + ' · ' + t.start + '–' + t.end, l.slotId); }).join('') + '</select>' +
            '<select class="input" data-les="' + i + '" data-k="subjectId" aria-label="' + esc(SP.t('dev.fSubject')) + '">' + S.subjects.map(function (j) { return opt(j.id, j.name, l.subjectId); }).join('') + '</select>' +
            '<select class="input" data-les="' + i + '" data-k="kind" aria-label="' + esc(SP.t('dev.s.kind')) + '">' + KINDS.concat(KINDS.indexOf(l.kind) < 0 && l.kind ? [l.kind] : []).map(function (k) { return opt(k, k, l.kind); }).join('') + '</select>' +
            '<input class="input" data-les="' + i + '" data-k="room" value="' + esc(l.room) + '" placeholder="' + esc(SP.t('dev.s.room')) + '" aria-label="' + esc(SP.t('dev.s.room')) + '">' +
            '<input class="input" data-les="' + i + '" data-k="building" value="' + esc(l.building) + '" placeholder="' + esc(SP.t('dev.s.building')) + '" aria-label="' + esc(SP.t('dev.s.building')) + '">' +
            '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-delles="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div>';
        }).join('') + '</div>' : '<p class="small subtle">' + esc(SP.t('dev.s.free')) + '</p>') + '</section>';
    });
    box.innerHTML = h;
    wireBar(); wire();
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
    on('#dsDl', function () { SP.downloadText(JSON.stringify(outJson(), null, 2) + '\n', 'schedule.json', 'application/json'); SP.toast(SP.t('dev.s.dlDone', { p: 'data/' + dir + '/schedule.json' }), 'success', { ms: 9000 }); });
    on('#dsPub', publish);
    on('#dsAddSlot', function () { var last = S.timeSlots[S.timeSlots.length - 1]; S.timeSlots.push({ id: uid('p'), start: last ? last.end : '08:30', end: '' }); changed(true); });
    on('#dsAddSubj', function () { S.subjects.push({ id: uid('s'), code: '', name: '', teacher: '' }); changed(true); var l = SP.$$('[data-subj][data-k="name"]', box); if (l.length) l[l.length - 1].focus(); });
    SP.$$('[data-delslot]', box).forEach(function (b) { b.onclick = function () { var t = S.timeSlots[+b.getAttribute('data-delslot')], used = S.schedule.filter(function (l) { return l.slotId === t.id; }).length; var go = function () { S.timeSlots.splice(S.timeSlots.indexOf(t), 1); S.schedule = S.schedule.filter(function (l) { return l.slotId !== t.id; }); changed(true); }; if (used) SP.confirm({ title: SP.t('common.delete'), text: SP.t('dev.s.delUsed', { n: used }), danger: true }).then(function (ok) { if (ok) go(); }); else go(); }; });
    SP.$$('[data-delsubj]', box).forEach(function (b) { b.onclick = function () { var j = S.subjects[+b.getAttribute('data-delsubj')], used = S.schedule.filter(function (l) { return l.subjectId === j.id; }).length; var go = function () { S.subjects.splice(S.subjects.indexOf(j), 1); S.schedule = S.schedule.filter(function (l) { return l.subjectId !== j.id; }); changed(true); }; if (used) SP.confirm({ title: SP.t('common.delete'), text: SP.t('dev.s.delUsed', { n: used }), danger: true }).then(function (ok) { if (ok) go(); }); else go(); }; });
    SP.$$('[data-addles]', box).forEach(function (b) {
      b.onclick = function () {
        var d = +b.getAttribute('data-addles'), busy = S.schedule.filter(function (l) { return l.day === d; }).map(function (l) { return l.slotId; });
        var free = S.timeSlots.filter(function (t) { return busy.indexOf(t.id) < 0; })[0] || S.timeSlots[0];
        S.schedule.push({ id: uid('lesson-'), day: d, slotId: free ? free.id : '', subjectId: S.subjects[0].id, kind: KINDS[0], room: '', building: '' });
        changed(true);
      };
    });
    SP.$$('[data-delles]', box).forEach(function (b) { b.onclick = function () { S.schedule.splice(+b.getAttribute('data-delles'), 1); changed(true); }; });
    /* поля: сохраняем при изменении; пересобираем страницу только там, где меняется порядок */
    box.onchange = function (e) {
      var t = e.target, k = t.getAttribute('data-k'); if (!k) return;
      if (t.hasAttribute('data-slot')) { S.timeSlots[+t.getAttribute('data-slot')][k] = t.value; changed(true); }
      else if (t.hasAttribute('data-subj')) { S.subjects[+t.getAttribute('data-subj')][k] = t.value.trim(); changed(k === 'name'); }
      else if (t.hasAttribute('data-les')) { S.schedule[+t.getAttribute('data-les')][k] = t.value; changed(k === 'slotId'); }
      else return;
    };
  }
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

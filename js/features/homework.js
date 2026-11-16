/* =====================================================================
   РАЗДЕЛ «ДОМАШКА» (#/homework): список домашних заданий.
   • Своё задание — только у тебя (localStorage sp-hw).
   • «Для всей группы» — видит вся группа: файл data/<группа>/homework.json.
     Писать туда может только разработчик (есть ключ GitHub, см. «Разработчик»);
     остальные этой кнопки не видят.
   Нажал на кружок — сделано: задание зачёркивается и уходит вниз в «Сделано».
   Отметки «сделано» у заданий группы — свои у каждого (sp-hw-done).
   Срок: «К следующей паре» (по расписанию), «Завтра», «Через неделю» или дата.
   В папке предмета сверху видно его несделанную домашку (SP.homework.folderHtml).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var KEY = 'sp-hw', DONE = 'sp-hw-done', GKEY = 'sp-hw-group';
  var root = null, editId = null, form = { text: '', subject: '', due: '', group: false }, gBusy = false;

  /* ---------- Данные ---------- */
  function mine() { var x = SP.store.get(KEY, null); return x && Array.isArray(x.items) ? x : { items: [] }; }
  function saveMine(x) { SP.store.set(KEY, x); SP.emit && SP.emit('homework'); }
  function doneMap() { return SP.store.get(DONE, {}) || {}; }
  function gdir() { return window.SP_GROUP_DIR || ''; }
  function group() { var x = SP.store.get(GKEY + ':' + gdir(), null); return x && Array.isArray(x.items) ? x : { items: [] }; }
  function isDev() { return !!(SP.devCore && SP.devCore.hasKey() && gdir()); }
  /* задания группы — из data/<группа>/homework.json (без интернета — последняя сохранённая копия) */
  function loadGroup() {
    var d = gdir(); if (!d || location.protocol === 'file:') return Promise.resolve();
    return fetch('data/' + d + '/homework.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : r.status === 404 ? { items: [] } : null; })
      .then(function (j) {
        if (!j || !Array.isArray(j.items)) return;
        var old = group();
        /* только что опубликовал сам, а GitHub Pages ещё не обновился — не откатываем список назад */
        if (old.pending && Date.now() - old.pending < 5 * 60000 && String(j.version || '') < String(old.version || '')) return;
        SP.store.set(GKEY + ':' + d, { version: j.version || '', items: j.items });
      }).catch(function () { /* без интернета — то, что было */ });
  }
  function all() {
    var dm = doneMap();
    var a = mine().items.map(function (x) { return Object.assign({ own: true }, x); });
    var g = group().items.map(function (x) { return Object.assign({ grp: true, done: dm[x.id] || 0 }, x); });
    return g.concat(a);
  }

  /* ---------- Даты ---------- */
  function iso(d) { return d.getFullYear() + '-' + SP.pad2(d.getMonth() + 1) + '-' + SP.pad2(d.getDate()); }
  function today() { var d = new Date(); d.setHours(12, 0, 0, 0); return d; }
  function plus(n) { var d = today(); d.setDate(d.getDate() + n); return iso(d); }
  function daysTo(s) { if (!s) return null; var d = new Date(s + 'T12:00:00'); return Math.round((d - today()) / 864e5); }
  function dueLabel(s) {
    var n = daysTo(s); if (n === null) return '';
    if (n === 0) return SP.t('hw.today'); if (n === 1) return SP.t('hw.tomorrow'); if (n === -1) return SP.t('hw.yesterday');
    var d = new Date(s + 'T12:00:00');
    return SP.t('hw.wd').split(',')[(d.getDay() + 6) % 7] + ', ' + SP.pad2(d.getDate()) + '.' + SP.pad2(d.getMonth() + 1);
  }
  /* «К следующей паре»: ближайший день, когда у предмета есть пара (после сегодняшнего) */
  function nextLesson(name) {
    if (!name) return '';
    var s = findSubject(name); if (!s) return '';
    var days = {}; (SP.hub.data().schedule || []).forEach(function (l) { if (l.subjectId === s.id) days[+l.day] = 1; });
    var wd = (today().getDay() + 6) % 7;
    for (var k = 1; k <= 7; k++) if (days[(wd + k) % 7]) return plus(k);
    return '';
  }
  function findSubject(name) { var n = SP.lc(name); return SP.hub.data().subjects.filter(function (s) { return SP.lc(SP.hub.cleanName(s.name)) === n; })[0]; }
  function subjectNames() { var o = []; SP.hub.data().subjects.forEach(function (s) { var n = SP.hub.cleanName(s.name); if (o.indexOf(n) < 0) o.push(n); }); return o; }

  /* ---------- Отрисовка ---------- */
  function linkify(t) { return esc(t).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'; }).replace(/\n/g, '<br>'); }
  function rowHtml(x) {
    var n = daysTo(x.due), late = !x.done && n !== null && n < 0;
    var meta = [];
    if (x.subject) meta.push('<button type="button" class="hw-subj" data-hwsub="' + esc(x.subject) + '">' + SP.icon('folder', 'ic-sm') + esc(x.subject) + '</button>');
    if (x.due) meta.push('<span class="hw-due' + (late ? ' late' : n === 0 ? ' now' : '') + '">' + SP.icon('clock', 'ic-sm') + esc(dueLabel(x.due)) + '</span>');
    if (x.grp) meta.push('<span class="hw-grp">' + SP.icon('megaphone', 'ic-sm') + esc(SP.t('hw.forGroup')) + '</span>');
    var acts = x.own || isDev();
    return '<li class="hw-item' + (x.done ? ' done' : '') + (late ? ' late' : '') + '" data-hw="' + esc(x.id) + '">' +
      '<button type="button" class="hw-check" role="checkbox" aria-checked="' + !!x.done + '" data-hwtog="' + esc(x.id) + '" aria-label="' + esc(SP.t(x.done ? 'hw.undone' : 'hw.markDone')) + '">' + SP.icon('check') + '</button>' +
      '<div class="hw-body"><div class="hw-text">' + linkify(x.text) + '</div>' + (meta.length ? '<div class="hw-meta">' + meta.join('') + '</div>' : '') + '</div>' +
      (acts ? '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-hwmore="' + esc(x.id) + '" aria-label="' + esc(SP.t('common.actions')) + '">' + SP.icon('ellipsis') + '</button>' : '') + '</li>';
  }
  function groups(list) {
    var by = { late: [], today: [], tomorrow: [], week: [], later: [], none: [], done: [] };
    list.forEach(function (x) {
      var n = daysTo(x.due);
      /* задание группы, срок которого прошёл больше недели назад, — уже не висит в «Просрочено» */
      if (x.done || (x.grp && n !== null && n < -7)) by.done.push(x);
      else if (n === null) by.none.push(x);
      else if (n < 0) by.late.push(x); else if (n === 0) by.today.push(x); else if (n === 1) by.tomorrow.push(x);
      else if (n <= 7) by.week.push(x); else by.later.push(x);
    });
    var sortDue = function (a, b) { return String(a.due).localeCompare(String(b.due)) || String(a.at || '').localeCompare(String(b.at || '')); };
    Object.keys(by).forEach(function (k) { by[k].sort(k === 'done' ? function (a, b) { return (b.done || 0) - (a.done || 0); } : sortDue); });
    return by;
  }
  function formHtml() {
    var subs = subjectNames(), nx = nextLesson(form.subject);
    var quick = [['next', nx, 'hw.dueNext'], ['tomorrow', plus(1), 'hw.dueTomorrow'], ['week', plus(7), 'hw.dueWeek']];
    return '<section class="card hw-form" id="hwForm"><textarea class="textarea" id="hwText" rows="2" placeholder="' + esc(SP.t('hw.ph')) + '" aria-label="' + esc(SP.t('hw.ph')) + '">' + esc(form.text) + '</textarea>' +
      '<div class="hw-opts"><select class="input" id="hwSubj" aria-label="' + esc(SP.t('hw.subject')) + '"><option value="">' + esc(SP.t('hw.noSubject')) + '</option>' +
      subs.map(function (n) { return '<option' + (n === form.subject ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>' +
      '<div class="hw-quick">' + quick.map(function (q) {
        if (q[0] === 'next' && !q[1]) return '';
        return '<button type="button" class="ds-chip" data-hwdue="' + q[1] + '" aria-pressed="' + (form.due === q[1]) + '">' + esc(SP.t(q[2])) + (q[0] === 'next' ? ' · ' + esc(dueLabel(q[1])) : '') + '</button>';
      }).join('') + '<input class="input hw-date" type="date" id="hwDate" value="' + esc(form.due) + '" aria-label="' + esc(SP.t('hw.date')) + '"></div></div>' +
      '<div class="hw-foot">' + (isDev() && !editId ? '<label class="switch-row"><label class="switch"><input type="checkbox" id="hwGroup"' + (form.group ? ' checked' : '') + '><span class="track"></span></label><span>' + SP.icon('megaphone', 'ic-sm') + esc(SP.t('hw.toGroup')) + '</span></label>' : '<span></span>') +
      '<div class="btn-group">' + (editId ? '<button type="button" class="btn btn-ghost" id="hwCancel">' + esc(SP.t('common.cancel')) + '</button>' : '') +
      '<button type="button" class="btn btn-primary" id="hwAdd">' + SP.icon(editId ? 'check' : 'plus') + '<span>' + esc(SP.t(editId ? 'common.save' : 'hw.add')) + '</span></button></div></div></section>';
  }
  function render() {
    if (!root) return;
    var list = all(), by = groups(list), left = list.length - by.done.length;
    var html = SP.pageHead({ title: SP.t('nav.homework'), sub: esc(left ? SP.t('hw.left', { n: left }) : SP.t('hw.allDone')) });
    html += formHtml();
    var sec = [['late', 'triangle-alert'], ['today', 'zap'], ['tomorrow', 'calendar-days'], ['week', 'calendar-days'], ['later', 'calendar-days'], ['none', 'list']];
    var body = sec.map(function (s) {
      var a = by[s[0]]; if (!a.length) return '';
      return '<section class="hw-sec hw-' + s[0] + '"><h2 class="section-title">' + SP.icon(s[1], 'ic-sm') + esc(SP.t('hw.sec.' + s[0])) + ' <span class="count">' + a.length + '</span></h2><ul class="hw-list">' + a.map(rowHtml).join('') + '</ul></section>';
    }).join('');
    if (!left) body = '<div class="empty hw-empty">' + SP.icon('circle-check', 'ic-xl') + '<p>' + esc(SP.t(list.length ? 'hw.emptyDone' : 'hw.empty')) + '</p></div>' + body;
    if (by.done.length) body += '<details class="hw-sec hw-donebox"' + (SP.store.get('sp-hw-doneopen', false) ? ' open' : '') + '><summary class="section-title">' + SP.icon('circle-check', 'ic-sm') + esc(SP.t('hw.sec.done')) + ' <span class="count">' + by.done.length + '</span>' + SP.icon('chevron-down', 'ds-chev') + '</summary>' +
      '<ul class="hw-list">' + by.done.map(rowHtml).join('') + '</ul>' + (by.done.some(function (x) { return x.own; }) ? '<button type="button" class="btn btn-ghost btn-sm" id="hwClear">' + SP.icon('trash-2', 'ic-sm') + '<span>' + esc(SP.t('hw.clearDone')) + '</span></button>' : '') + '</details>';
    root.innerHTML = '<div class="page hw-page">' + html + body + '</div>';
    wire();
  }

  /* ---------- Действия ---------- */
  function find(id) { return all().filter(function (x) { return x.id === id; })[0]; }
  function toggle(id) {
    var x = find(id); if (!x) return;
    var now = x.done ? 0 : Date.now();
    if (x.grp) { var dm = doneMap(); if (now) dm[id] = now; else delete dm[id]; SP.store.set(DONE, dm); }
    else { var m = mine(); m.items.forEach(function (it) { if (it.id === id) it.done = now; }); saveMine(m); }
    var li = SP.$('[data-hw="' + id + '"]', root);
    /* сначала зачёркиваем на месте, потом задание переезжает вниз */
    if (li && now) { li.classList.add('done', 'hw-bye'); SP.$('.hw-check', li).setAttribute('aria-checked', 'true'); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) { } setTimeout(render, 450); }
    else render();
  }
  function submit() {
    var t = SP.$('#hwText', root), text = t.value.trim();
    if (!text) { t.focus(); return; }
    form.text = text;
    if (editId) {
      var x = find(editId);
      if (x && x.grp) { publishGroup('edit', { id: x.id, text: text, subject: form.subject, due: form.due }); }
      else { var m = mine(); m.items.forEach(function (it) { if (it.id === editId) { it.text = text; it.subject = form.subject; it.due = form.due; } }); saveMine(m); }
      editId = null; resetForm(); render(); return;
    }
    if (form.group && isDev()) { publishGroup('add', { id: 'g-' + SP.uid(''), text: text, subject: form.subject, due: form.due, at: new Date().toISOString() }); resetForm(); render(); return; }
    var m2 = mine(); m2.items.push({ id: SP.uid('hw-'), text: text, subject: form.subject, due: form.due, at: new Date().toISOString(), done: 0 }); saveMine(m2);
    resetForm(); render(); SP.toast(SP.t('hw.added'), 'success');
    var n = SP.$('#hwText', root); if (n) n.focus();
  }
  function resetForm() { form = { text: '', subject: form.subject, due: '', group: form.group }; }
  function edit(x) {
    editId = x.id; form = { text: x.text, subject: x.subject || '', due: x.due || '', group: false }; render();
    var t = SP.$('#hwText', root); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); window.scrollTo(0, 0); }
  }
  function remove(x) {
    if (x.grp) {
      SP.confirm({ title: SP.t('hw.delGroup'), text: SP.t('hw.delGroupText'), danger: true, okLabel: SP.t('common.delete') }).then(function (ok) { if (ok) publishGroup('del', { id: x.id }); });
      return;
    }
    var m = mine(), i = -1; m.items.forEach(function (it, k) { if (it.id === x.id) i = k; });
    if (i < 0) return;
    var it = m.items.splice(i, 1)[0]; saveMine(m); render();
    SP.undo(SP.t('hw.deleted'), function () { var mm = mine(); mm.items.splice(Math.min(i, mm.items.length), 0, it); saveMine(mm); render(); });
  }
  function more(btn, x) {
    var items = [{ label: SP.t('common.change'), icon: 'pencil', onClick: function () { edit(x); } }];
    if (x.own && isDev()) items.push({ label: SP.t('hw.shareGroup'), icon: 'megaphone', onClick: function () {
      publishGroup('add', { id: 'g-' + SP.uid(''), text: x.text, subject: x.subject || '', due: x.due || '', at: new Date().toISOString() }, function () {
        var m = mine(); m.items = m.items.filter(function (it) { return it.id !== x.id; }); saveMine(m);
      });
    } });
    items.push('-', { label: SP.t(x.grp ? 'hw.delGroup' : 'common.delete'), icon: 'trash-2', danger: true, onClick: function () { remove(x); } });
    SP.menu(btn, items);
  }
  /* разработчик: записать задание в data/<группа>/homework.json (свежий файл с GitHub + правка + коммит, без точки сохранения) */
  function publishGroup(op, it, then) {
    if (!isDev() || gBusy) return;
    var core = SP.devCore, d = gdir(), path = 'data/' + d + '/homework.json';
    gBusy = true; SP.toast(SP.t('hw.publishing'), 'info');
    core.remoteFile(path).then(function (j) {
      var list = j && Array.isArray(j.items) ? j.items : [];
      if (op === 'add') list.push(it);
      else if (op === 'edit') list.forEach(function (x) { if (x.id === it.id) { x.text = it.text; x.subject = it.subject; x.due = it.due; } });
      else list = list.filter(function (x) { return x.id !== it.id; });
      /* задания со сроком больше месяца назад убираем из файла сами */
      list = list.filter(function (x) { var n = daysTo(x.due); return n === null || n > -31; });
      var out = { version: core.nextVersion(j && j.version), updatedAt: new Date().toISOString(), items: list };
      return core.commitFiles([{ path: path, content: JSON.stringify(out, null, 2) + '\n' }], SP.t('hw.commit', { g: (SP.auth && SP.auth.user && SP.auth.user().group) || d }), { noTag: true }).then(function () {
        SP.store.set(GKEY + ':' + d, { version: out.version, items: list, pending: Date.now() });
        if (then) then();
        SP.toast(SP.t('hw.published'), 'success', { ms: 7000 });
      });
    }).catch(function (e) { SP.toast(e.message || String(e), 'danger', { ms: 9000 }); })
      .then(function () { gBusy = false; render(); });
  }
  function wire() {
    var q = function (s) { return SP.$(s, root); };
    var t = q('#hwText');
    if (t) {
      t.oninput = function () { form.text = t.value; };
      t.onkeydown = function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey && window.innerWidth >= 768)) { e.preventDefault(); submit(); } };
    }
    var s = q('#hwSubj'); if (s) s.onchange = function () { form.subject = s.value; var nx = nextLesson(form.subject); if (nx && !form.due) form.due = nx; repaintForm(); };
    SP.$$('[data-hwdue]', root).forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-hwdue'); form.due = form.due === v ? '' : v; repaintForm(); }; });
    var dt = q('#hwDate'); if (dt) dt.onchange = function () { form.due = dt.value; repaintForm(); };
    var g = q('#hwGroup'); if (g) g.onchange = function () { form.group = g.checked; };
    var a = q('#hwAdd'); if (a) a.onclick = submit;
    var c = q('#hwCancel'); if (c) c.onclick = function () { editId = null; form = { text: '', subject: '', due: '', group: false }; render(); };
    SP.$$('[data-hwtog]', root).forEach(function (b) { b.onclick = function () { toggle(b.getAttribute('data-hwtog')); }; });
    SP.$$('[data-hwmore]', root).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var x = find(b.getAttribute('data-hwmore')); if (x) more(b, x); }; });
    SP.$$('[data-hwsub]', root).forEach(function (b) { b.onclick = function () { var sj = findSubject(b.getAttribute('data-hwsub')); if (sj) SP.navigate('subjects', [sj.id]); }; });
    var cl = q('#hwClear'); if (cl) cl.onclick = function () {
      var m = mine(), keep = m.items.filter(function (x) { return !x.done; }), gone = m.items.length - keep.length, was = m.items.slice();
      m.items = keep; saveMine(m); render();
      SP.undo(SP.t('hw.cleared', { n: gone }), function () { var mm = mine(); mm.items = was; saveMine(mm); render(); });
    };
    var db = q('.hw-donebox'); if (db) db.addEventListener('toggle', function () { SP.store.set('sp-hw-doneopen', db.open); });
  }
  /* форму перерисовываем отдельно — текст и фокус не теряются */
  function repaintForm() {
    var f = SP.$('#hwForm', root); if (!f) return;
    var ae = document.activeElement && document.activeElement.id;
    f.outerHTML = formHtml(); wire();
    var n = ae && SP.$('#' + ae, root); if (n) n.focus();
  }

  /* для папки предмета: несделанная домашка по этому предмету (коротко, сверху) */
  function folderHtml(s) {
    var name = SP.lc(SP.hub.cleanName(s.name));
    var a = all().filter(function (x) { return !x.done && SP.lc(x.subject || '') === name && !(x.grp && daysTo(x.due) !== null && daysTo(x.due) < -7); });
    if (!a.length) return '';
    a.sort(function (x, y) { return String(x.due || '9').localeCompare(String(y.due || '9')); });
    return '<a class="hw-strip" href="#/homework">' + SP.icon('notebook-pen', 'ic-sm') + '<span><b>' + esc(SP.t('hw.inFolder', { n: a.length })) + '</b> ' +
      esc(a.slice(0, 2).map(function (x) { return (x.due ? dueLabel(x.due) + ': ' : '') + x.text.split('\n')[0].slice(0, 60); }).join(' · ')) + '</span>' + SP.icon('chevron-right', 'ic-sm') + '</a>';
  }

  SP.homework = { folderHtml: folderHtml, count: function () { return all().filter(function (x) { var n = daysTo(x.due); return !x.done && n !== null && n <= 1 && !(x.grp && n < -7); }).length; } };
  SP.views.register('homework', {
    titleKey: 'nav.homework',
    mount: function (el) { root = el; render(); loadGroup().then(render); },
    show: function () { render(); loadGroup().then(render); },
    refresh: render
  });
  SP.on('hub', function () { if (root && SP.views.current() === 'homework') render(); });
})();

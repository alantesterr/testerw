/* =====================================================================
   РАЗДЕЛ «ПАПКИ С ПРЕДМЕТАМИ».
   Слева — список папок, справа — папка предмета одной страницей:
   Файлы (и ссылки) → Тесты → Лекции (конспект, см. notes.js) → Мои заметки. На ПК список можно спрятать кнопкой, чтобы рабочая
   область стала шире. На телефоне — сначала список, затем папка.
   Файлы можно двигать вверх/вниз (порядок сохраняется) и скрывать.
   Папки можно удалять по одной или несколько сразу (режим «Выбрать»).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var root = null, selected = null, tab = 'materials', query = '';
  var sui = Object.assign({ collapsed: false }, SP.store.get('sp-subjects-ui', {}));
  var selMode = false, selSet = {}, showHidden = false;

  function data() { return SP.hub.data(); }
  function saveSui() { SP.store.set('sp-subjects-ui', sui); }
  function isPin(f) { return f.base ? !!(data().pins && data().pins[f.id]) : !!f.pinned; }
  function isHidden(f) { return !!(data().hidden && data().hidden[f.id]); }
  function ordKey(s, type) { return s.id + ':' + type; }
  function listOf(s, type) { return type === 'test' ? s.tests : s.materials; }
  /* Порядок: закреплённые сверху, затем сохранённый порядок (работает и для файлов курса) */
  function viewOrder(arr, s, type) {
    var ord = (s && data().order && data().order[ordKey(s, type)]) || [];
    var pos = function (i) { var p = ord.indexOf(arr[i].id); return p < 0 ? 1e6 + i : p; };
    var ix = arr.map(function (_, i) { return i; }).sort(function (a, b) { return pos(a) - pos(b); });
    return ix.filter(function (i) { return isPin(arr[i]); }).concat(ix.filter(function (i) { return !isPin(arr[i]); }));
  }
  function linkInfo(u) {
    var h = ''; try { h = new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { /* ничего */ }
    var is = function () { var a = arguments; for (var i = 0; i < a.length; i++) if (h === a[i] || h.slice(-a[i].length - 1) === '.' + a[i]) return true; return false; };
    if (is('t.me', 'telegram.me', 'telegram.org')) return { icon: 'message-square-text', label: 'Telegram' };
    if (is('youtube.com', 'youtu.be')) return { icon: 'circle-play', label: 'YouTube' };
    if (is('docs.google.com')) return { icon: 'file-text', label: 'Google Docs' };
    if (is('drive.google.com')) return { icon: 'folder', label: 'Google Drive' };
    return { icon: 'link', label: h || SP.t('subjects.link') };
  }

  /* ---------------- Отрисовка ---------------- */
  function render() {
    if (!root) return;
    var d = data(), active = SP.hub.getSubject(selected) || null;
    var narrow = window.innerWidth < 900;
    var html = SP.pageHead({
      title: SP.t('nav.subjects'),
      sub: esc(SP.t('subjects.count', { n: d.subjects.length })),
      actions: (d.subjects.length ? '<button type="button" class="btn" id="sjSelect" aria-pressed="' + selMode + '">' + SP.icon(selMode ? 'x' : 'square-check-big') + '<span>' + esc(SP.t(selMode ? 'subjects.selDone' : 'subjects.select')) + '</span></button>' : '') +
        (Object.keys(d.removed || {}).length ? '<button type="button" class="btn btn-ghost" id="sjRestore">' + SP.icon('undo-2') + '<span>' + esc(SP.t('subjects.restoreRemoved')) + '</span></button>' : '') +
        '<button type="button" class="btn btn-primary" id="sjAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('subjects.add')) + '</span></button>' +
        SP.focus.btn(true, 'btn-ghost')
    });
    if (!d.subjects.length) {
      html += '<section class="card"><div class="empty">' + SP.icon('folder-open', 'ic-xl') + '<h3>' + esc(SP.t('subjects.emptyTitle')) + '</h3><p>' + esc(SP.t('subjects.emptyText')) + '</p>' +
        '<div class="btn-group"><button type="button" class="btn btn-primary" id="sjAdd2">' + SP.icon('plus') + '<span>' + esc(SP.t('subjects.add')) + '</span></button>' +
        '<a class="btn" href="#/schedule">' + SP.icon('calendar-days') + '<span>' + esc(SP.t('nav.schedule')) + '</span></a></div></div></section>';
      root.innerHTML = '<div class="page">' + html + '</div>'; wire(null); return;
    }
    var collapsed = !narrow && active && sui.collapsed && !selMode;
    html += '<div class="sj-layout' + (narrow && active ? ' show-detail' : '') + (collapsed ? ' list-collapsed' : '') + '">' + listPane(active) + '<div class="sj-detail">' + (active ? detailPane(active, collapsed) : pickHint()) + '</div></div>';
    root.innerHTML = '<div class="page wide">' + html + '</div>';
    wire(active);
  }

  function listPane(active) {
    var d = data(), q = SP.lc(query);
    var items = d.subjects.filter(function (s) { return !q || SP.lc(s.name + ' ' + (s.teacher || '')).indexOf(q) >= 0; });
    var h = '<aside class="sj-list card card-flat"><div class="input-icon">' + SP.icon('search') + '<input class="input" type="search" id="sjSearch" placeholder="' + esc(SP.t('subjects.search')) + '" value="' + esc(query) + '" aria-label="' + esc(SP.t('subjects.search')) + '"></div>';
    if (selMode) {
      var nSel = Object.keys(selSet).length, allOn = items.length > 0 && items.every(function (s) { return selSet[s.id]; });
      h += '<div class="sel-bar"><label class="check"><input type="checkbox" id="sjSelAll"' + (allOn ? ' checked' : '') + '><span>' + esc(SP.t('subjects.selectAll')) + '</span></label>' +
        '<span class="count" aria-live="polite">' + esc(SP.t('subjects.selected', { n: nSel })) + '</span>' +
        '<button type="button" class="btn btn-danger btn-sm" id="sjDelSel"' + (nSel ? '' : ' disabled') + '>' + SP.icon('trash-2') + '<span>' + esc(SP.t('common.delete')) + '</span></button></div>';
    }
    h += '<nav class="sj-items" aria-label="' + esc(SP.t('nav.subjects')) + '">' + (items.length ? items.map(function (s) {
      var mats = (s.materials || []).length, tests = (s.tests || []).length;
      var btn = '<button type="button" class="sj-item" data-sub="' + esc(s.id) + '"' + (active && s.id === active.id ? ' aria-current="true"' : '') + '>' +
        '<span class="fi-folder">' + SP.icon('folder') + '</span><span class="meta"><b>' + esc(SP.hub.cleanName(s.name)) + '</b>' +
        '<small>' + esc(SP.t('subjects.itemMeta', { m: mats, t: tests })) + '</small></span>' + SP.icon('chevron-right', 'sj-chev') + '</button>';
      if (!selMode) return btn;
      return '<div class="sj-item-wrap"><label class="check"><input type="checkbox" data-selsub="' + esc(s.id) + '"' + (selSet[s.id] ? ' checked' : '') + ' aria-label="' + esc(SP.t('subjects.selectOne', { name: SP.hub.cleanName(s.name) })) + '"></label>' + btn + '</div>';
    }).join('') : '<p class="subtle small sj-none">' + esc(SP.t('subjects.notFound')) + '</p>') + '</nav>';
    return h + '</aside>';
  }

  function pickHint() { return '<section class="card"><div class="empty">' + SP.icon('folder-open', 'ic-xl') + '<p>' + esc(SP.t('subjects.pick')) + '</p></div></section>'; }

  function detailPane(s, collapsed) {
    var mats = s.materials || [], tests = s.tests || [];
    var lbl = SP.t(collapsed ? 'subjects.showList' : 'subjects.hideList');
    var h = '<section class="card sj-card">' +
      '<button type="button" class="btn btn-ghost sj-back" id="sjBack">' + SP.icon('arrow-left') + '<span>' + esc(SP.t('subjects.all')) + '</span></button>' +
      '<div class="card-head"><div class="row row-nowrap grow">' +
      '<button type="button" class="btn ' + (collapsed ? 'btn-soft' : 'btn-ghost') + ' btn-sm sj-toggle-list" id="sjToggleList" aria-pressed="' + !!collapsed + '" aria-label="' + esc(lbl) + '" data-tip="' + esc(lbl) + '">' + SP.icon(collapsed ? 'panel-left-open' : 'panel-left-close') + '<span>' + esc(collapsed ? SP.t('subjects.foldersBtn') : '') + '</span></button>' +
      '<div class="grow"><h2 class="sj-title">' + esc(s.name) + '</h2><div class="card-sub">' + esc([s.code, s.teacher].filter(Boolean).join(' · ') || SP.t('subjects.noTeacher')) + '</div></div></div>' +
      '<div class="row">' + (s.base ? '<span class="badge">' + SP.icon(s.base === 'timetable' ? 'cloud' : 'users') + esc(SP.t(s.base === 'timetable' ? 'subjects.fromTt' : 'subjects.fromCourse')) + '</span>' : '') +
      '<button type="button" class="btn btn-ghost btn-icon" id="sjEdit" aria-label="' + esc(SP.t('subjects.edit')) + '" data-tip="' + esc(SP.t('subjects.edit')) + '">' + SP.icon('pencil') + '</button></div></div>' +
      /* Папка одной страницей: Файлы → Тесты → Лекции (конспект) → Мои заметки */
      '<div class="sj-blocks">' +
      '<section class="sj-sec"><div class="sj-sec-h"><h3>' + SP.icon('folder-open', 'ic-sm') + esc(SP.t('sj.files')) + (mats.length ? '<span class="count">' + mats.length + '</span>' : '') + '</h3>' +
      '<div class="row"><button type="button" class="btn btn-sm" id="sjUpMat">' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('sj.upload')) + '</span></button>' +
      '<button type="button" class="btn btn-sm" id="sjAddLink">' + SP.icon('link', 'ic-sm') + '<span>' + esc(SP.t('subjects.addLink')) + '</span></button></div></div>' +
      (mats.length ? listHtml(s, 'material') : '<p class="subtle small">' + esc(SP.t('subjects.noMat')) + '</p>') + '</section>' +
      '<section class="sj-sec"><div class="sj-sec-h"><h3>' + SP.icon('list-checks', 'ic-sm') + esc(SP.t('subjects.tests')) + (tests.length ? '<span class="count">' + tests.length + '</span>' : '') + '</h3>' +
      '<div class="row"><button type="button" class="btn btn-sm" id="sjUpTest">' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('sj.upload')) + '</span></button></div></div>' +
      (tests.length ? listHtml(s, 'test') : '<p class="subtle small">' + esc(SP.t('subjects.noTests')) + '</p>') + '</section>' +
      '<section class="sj-sec" id="sjLecs" hidden><div class="sj-sec-h"><h3>' + SP.icon('book-open', 'ic-sm') + esc(SP.t('sj.lectures')) + '</h3></div><div class="sj-lecs"></div></section>' +
      '<details class="sj-sec sj-mynotes"' + (s.notes ? ' open' : '') + '><summary><h3>' + SP.icon('square-pen', 'ic-sm') + esc(SP.t('sj.myNotes')) + '</h3>' + SP.icon('chevron-down', 'ic-sm sj-chev2') + '</summary>' +
      '<div class="field"><textarea class="textarea" id="sjNotes" rows="6" aria-label="' + esc(SP.t('sj.myNotes')) + '" placeholder="' + esc(SP.t('subjects.notesPh')) + '">' + esc(s.notes) + '</textarea>' +
      '<span class="hint" id="sjNoteSt" aria-live="polite">' + esc(SP.t('subjects.notesAuto')) + '</span></div></details>' +
      '</div>';
    return h + '</section>';
  }
  /* Лекции конспекта этого предмета: продолжить + список с отметками прогресса */
  function fillLectures(s) {
    if (!SP.notes) return;
    SP.notes.forSubject(s.name).then(function (list) {
      var box = SP.$('#sjLecs', root); if (!box || !list.length || selected !== s.id) return;
      var html = list.map(function (x) {
        var meta = x.meta, d = x.doc, pos = SP.notes.continueOf(meta), cl = pos && d.lectures[pos.li] ? pos.li : null;
        var rows = d.lectures.map(function (lec, li) {
          var st = SP.notes.lecStats(meta, d, lec), chips = [];
          if (st.read >= 97) chips.push('<span class="chip-s ok">' + SP.icon('check', 'ic-sm') + esc(SP.t('sj.read')) + '</span>');
          else if (st.read > 0) chips.push('<span class="chip-s">' + esc(SP.t('sj.readPct', { p: st.read })) + '</span>');
          if (st.qs) chips.push('<span class="chip-s' + (st.qsOk === st.qs ? ' ok' : '') + '">' + esc(SP.t('sj.qs', { a: st.qsOk, n: st.qs })) + '</span>');
          if (st.tasks) chips.push('<span class="chip-s' + (st.tasksOk === st.tasks ? ' ok' : '') + '">' + esc(SP.t('sj.tasks', { a: st.tasksOk, n: st.tasks })) + '</span>');
          if (st.best != null) chips.push('<span class="chip-s' + (st.best >= 70 ? ' ok' : '') + '">' + esc(SP.t('sj.test', { p: st.best })) + '</span>');
          var num = String(lec.n || li + 1);
          return '<a class="sj-lec" href="' + esc(SP.notes.href(meta, li)) + '"><span class="sj-lnum' + (st.read >= 97 ? ' done' : '') + '">' + esc(num.length > 3 ? li + 1 : num) + '</span>' +
            '<span class="meta"><b>' + esc(lec.title) + '</b><small>' + esc(lec.label) + '</small>' + (chips.length ? '<span class="chips-s">' + chips.join('') + '</span>' : '') + '</span>' + SP.icon('chevron-right', 'sj-chev') + '</a>';
        }).join('');
        var cont = '<a class="sj-cont" href="' + esc(SP.notes.href(meta, cl == null ? 0 : cl)) + '"><span class="grow"><small>' + esc(SP.t(cl == null ? 'sj.start' : 'sj.continue')) + '</small><b>' + esc(d.lectures[cl == null ? 0 : cl].label + ' · ' + d.lectures[cl == null ? 0 : cl].title) + '</b></span>' + SP.icon('arrow-right') + '</a>';
        return (list.length > 1 ? '<div class="sj-doc-t">' + esc(meta.short || meta.subject) + '</div>' : '') + cont + '<div class="sj-lec-list">' + rows + '</div>';
      }).join('');
      SP.$('.sj-lecs', box).innerHTML = html; box.hidden = false;
    });
  }
  function lessonsBlock(s) {
    var ls = SP.schedule && SP.schedule.lessonsOf ? SP.schedule.lessonsOf(s.id) : [];
    if (!ls.length) return '';
    return '<div class="sj-lessons"><div class="section-title">' + esc(SP.t('subjects.lessons')) + '</div><ul>' + ls.map(function (x) {
      return '<li><b>' + esc(x.day) + ', ' + esc(x.time) + '</b>' + (x.kind ? ' · ' + esc(x.kind) : '') +
        '<span>' + SP.icon('house', 'ic-sm') + ' ' + esc(x.room || '—') + (x.teacher ? ' · ' + esc(x.teacher) : '') + '</span></li>';
    }).join('') + '</ul></div>';
  }
  function tabBtn(id, icon, label, n) {
    return '<button type="button" class="tab" role="tab" data-tab="' + id + '" aria-selected="' + (tab === id) + '">' + SP.icon(icon, 'ic-sm') + '<span>' + esc(label) + '</span>' + (n != null ? '<span class="count">' + n + '</span>' : '') + '</button>';
  }
  function listHtml(s, type) {
    var arr = listOf(s, type), ord = viewOrder(arr, s, type);
    var nHid = ord.filter(function (i) { return isHidden(arr[i]); }).length;
    var vis = ord.filter(function (i) { return showHidden || !isHidden(arr[i]); });
    return (nHid ? '<div class="row"><button type="button" class="btn btn-ghost btn-sm" id="sjShowHidden" aria-pressed="' + showHidden + '">' + SP.icon(showHidden ? 'eye-off' : 'eye') + '<span>' + esc(SP.t(showHidden ? 'subjects.hideHidden' : 'subjects.showHidden', { n: nHid })) + '</span></button></div>' : '') +
      (vis.length ? '<div class="list">' + vis.map(function (i) { return row(s, arr[i], i, type, ord); }).join('') + '</div>' : '<p class="subtle small">' + esc(SP.t('subjects.allHidden')) + '</p>');
  }
  function row(s, f, i, type, ord) {
    var link = f.kind === 'link', li = link ? linkInfo(f.url) : null, hid = isHidden(f);
    var meta = link ? li.label + (f.note ? ' · ' + f.note : '') : (f.size ? SP.formatSize(f.size) : '');
    var badge = link ? '<span class="file-badge accent">' + SP.icon(li.icon) + '</span>' : SP.fileIcon(f.name);
    var inner = badge + '<span class="meta"><b>' + (isPin(f) ? SP.icon('pin', 'ic-sm pin-ic') + ' ' : '') + esc(f.name) + '</b><small>' + esc(meta) + '</small></span>';
    var main = link ? '<a class="list-row-main" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + inner + SP.icon('external-link', 'ic-sm subtle') + '</a>'
      : '<button type="button" class="list-row-main" data-open="' + type + ':' + i + '">' + inner + '</button>';
    var pos = ord.indexOf(i), same = function (j) { return j !== undefined && isPin(listOf(s, type)[j]) === isPin(f); };
    return '<div class="list-row' + (isPin(f) ? ' pinned' : '') + (hid ? ' is-hidden' : '') + '">' + main +
      (hid ? '<span class="badge">' + SP.icon('eye-off') + esc(SP.t('subjects.hiddenBadge')) + '</span>' : f.base ? '<span class="badge" title="' + esc(SP.t('subjects.courseFileTip')) + '">' + esc(SP.t('subjects.courseFile')) + '</span>' : '') +
      (type === 'test' ? '<button type="button" class="btn btn-soft btn-sm" data-run="' + i + '">' + SP.icon('play') + '<span>' + esc(SP.t('subjects.runTest')) + '</span></button>' : '') +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-mv="' + type + ':' + i + ':-1"' + (same(ord[pos - 1]) ? '' : ' disabled') + ' aria-label="' + esc(SP.t('subjects.moveUp')) + '" data-tip="' + esc(SP.t('subjects.moveUp')) + '">' + SP.icon('arrow-up') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-mv="' + type + ':' + i + ':1"' + (same(ord[pos + 1]) ? '' : ' disabled') + ' aria-label="' + esc(SP.t('subjects.moveDown')) + '" data-tip="' + esc(SP.t('subjects.moveDown')) + '">' + SP.icon('arrow-down') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-more="' + type + ':' + i + '" aria-label="' + esc(SP.t('common.actions')) + '" data-tip="' + esc(SP.t('common.actions')) + '">' + SP.icon('ellipsis') + '</button></div>';
  }

  /* ---------------- Действия ---------------- */
  function wire(s) {
    var q = function (x) { return SP.$(x, root); };
    [q('#sjAdd'), q('#sjAdd2')].forEach(function (b) { if (b) b.onclick = function () { editor(null); }; });
    var sl = q('#sjSelect'); if (sl) sl.onclick = function () { selMode = !selMode; selSet = {}; render(); var n = SP.$('#sjSelect', root); if (n) n.focus(); };
    var rs = q('#sjRestore'); if (rs) rs.onclick = function () { SP.hub.restoreRemoved(); SP.toast(SP.t('subjects.restored'), 'success'); };
    SP.$$('[data-selsub]', root).forEach(function (cb) {
      cb.onchange = function () { var id = cb.getAttribute('data-selsub'); if (cb.checked) selSet[id] = 1; else delete selSet[id]; render(); var n = SP.$('[data-selsub="' + id + '"]', root); if (n) n.focus(); };
    });
    var sa = q('#sjSelAll'); if (sa) sa.onchange = function () {
      var on = sa.checked; SP.$$('[data-selsub]', root).forEach(function (cb) { var id = cb.getAttribute('data-selsub'); if (on) selSet[id] = 1; else delete selSet[id]; });
      render(); var n = SP.$('#sjSelAll', root); if (n) n.focus();
    };
    var ds = q('#sjDelSel'); if (ds) ds.onclick = function () {
      var ids = Object.keys(selSet); if (!ids.length) return;
      SP.confirm({ title: SP.t('subjects.delFoldersTitle', { n: ids.length }), text: SP.t('subjects.delFoldersText'), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
        if (!ok) return;
        if (selSet[selected]) selected = null;
        SP.hub.removeSubjects(ids); selSet = {}; selMode = false;
        SP.toast(SP.t('subjects.delFoldersDone', { n: ids.length }), 'success'); SP.navigate('subjects'); render();
      });
    };
    var se = q('#sjSearch'); if (se) se.oninput = SP.debounce(function () { query = se.value; render(); var n = SP.$('#sjSearch', root); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 150);
    SP.$$('[data-sub]', root).forEach(function (b) { b.onclick = function () { SP.navigate('subjects', [b.getAttribute('data-sub')]); }; });
    var bk = q('#sjBack'); if (bk) bk.onclick = function () { selected = null; SP.navigate('subjects'); };
    if (!s) return;
    fillLectures(s);
    q('#sjEdit').onclick = function () { editor(s); };
    var tl = q('#sjToggleList'); if (tl) tl.onclick = function () { sui.collapsed = !sui.collapsed; saveSui(); render(); var n = SP.$('#sjToggleList', root); if (n) n.focus(); };
    var shh = q('#sjShowHidden'); if (shh) shh.onclick = function () { showHidden = !showHidden; render(); };
    SP.$$('[data-tab]', root).forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); render(); var t = SP.$('[data-tab="' + tab + '"]', root); if (t) t.focus(); }; });
    var um = q('#sjUpMat'); if (um) um.onclick = function () { pickFiles(s, 'materials'); };
    var ut = q('#sjUpTest'); if (ut) ut.onclick = function () { pickFiles(s, 'tests'); };
    var al = q('#sjAddLink'); if (al) al.onclick = function () { linkEditor(s); };
    var nt = q('#sjNotes');
    if (nt) {
      var st = q('#sjNoteSt');
      var saveNotes = SP.debounce(function () { s.notes = nt.value; SP.hub.save(); st.textContent = SP.t('subjects.notesSaved'); }, 500);
      nt.oninput = function () { st.textContent = SP.t('subjects.notesSaving'); saveNotes(); };
    }
    SP.$$('[data-open]', root).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-open').split(':'); openItem(s, p[0], +p[1]); }; });
    SP.$$('[data-run]', root).forEach(function (b) { b.onclick = function () { openItem(s, 'test', +b.getAttribute('data-run')); }; });
    SP.$$('[data-mv]', root).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-mv').split(':'); move(s, p[0], +p[1], +p[2]); var n = SP.$('[data-mv="' + p[0] + ':' + p[1] + ':' + p[2] + '"]', root); if (n && !n.disabled) n.focus(); }; });
    SP.$$('[data-more]', root).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var p = b.getAttribute('data-more').split(':'); moreMenu(b, s, p[0], +p[1]); }; });
  }

  function move(s, type, i, dlt) {
    var arr = listOf(s, type), ord = viewOrder(arr, s, type), pos = ord.indexOf(i), j = pos + dlt;
    if (j < 0 || j >= ord.length || isPin(arr[ord[j]]) !== isPin(arr[i])) return;
    var ids = ord.map(function (k) { return arr[k].id; }), t = ids[pos]; ids[pos] = ids[j]; ids[j] = t;
    var o = data().order = data().order || {}; o[ordKey(s, type)] = ids; SP.hub.save(); render();
  }
  function toggleHide(f) {
    var h = data().hidden = data().hidden || {};
    if (h[f.id]) delete h[f.id]; else { h[f.id] = 1; SP.toast(SP.t('subjects.hiddenToast'), 'info'); }
    SP.hub.save(); render();
  }

  function moreMenu(btn, s, type, i) {
    var arr = listOf(s, type), f = arr[i];
    var items = [{ label: SP.t(type === 'test' ? 'subjects.runTest' : 'common.open'), icon: type === 'test' ? 'play' : 'external-link', onClick: function () { openItem(s, type, i); } }];
    if (f.kind !== 'link') items.push({ label: SP.t('common.download'), icon: 'download', onClick: function () { if (f.base) openSite(f.path, true, f.name); else downloadFile(f); } });
    items.push({ label: SP.t(isPin(f) ? 'subjects.unpin' : 'subjects.pin'), icon: isPin(f) ? 'pin-off' : 'pin', onClick: function () {
      if (f.base) { var p = data().pins = data().pins || {}; if (p[f.id]) delete p[f.id]; else p[f.id] = 1; } else f.pinned = !f.pinned;
      SP.hub.save(); render();
    } });
    /* на телефоне стрелок в строке нет — двигать можно из этого меню */
    if (window.innerWidth < 768) {
      items.push({ label: SP.t('subjects.moveUp'), icon: 'arrow-up', onClick: function () { move(s, type, i, -1); } });
      items.push({ label: SP.t('subjects.moveDown'), icon: 'arrow-down', onClick: function () { move(s, type, i, 1); } });
    }
    items.push({ label: SP.t(isHidden(f) ? 'subjects.unhide' : 'subjects.hide'), icon: isHidden(f) ? 'eye' : 'eye-off', onClick: function () { toggleHide(f); } });
    items.push('-');
    items.push({ label: SP.t(f.base ? 'subjects.cantDelete' : 'common.delete'), icon: 'trash-2', danger: true, disabled: !!f.base, onClick: function () {
      SP.confirm({ title: SP.t('common.deleteQ'), text: SP.t('subjects.deleteFile', { name: f.name }), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
        if (!ok) return; SP.hub.dropFile(f); arr.splice(i, 1); SP.hub.save(); render();
      });
    } });
    SP.menu(btn, items);
  }

  function pickFiles(s, key) {
    var inp = SP.el('<input type="file" multiple hidden' + (key === 'tests' ? ' accept=".txt,.doc,.docx,.json"' : '') + '>');
    document.body.appendChild(inp);
    inp.onchange = function () {
      var files = Array.prototype.slice.call(inp.files); inp.remove();
      var errs = [], n = 0;
      files.reduce(function (p, f) {
        return p.then(function () {
          return (key === 'tests' ? SP.testEngine.validateFile(f) : Promise.resolve('')).then(function (er) {
            if (er) { errs.push(f.name + ': ' + er); return; }
            return SP.readAsDataURL(f).then(function (content) {
              var item = { id: SP.hub.uid(), name: f.name, type: f.type || '', size: f.size, content: content };
              return SP.hub.persistFile(item).then(function () { s[key].push(item); n++; });
            });
          }).catch(function () { errs.push(f.name + ': ' + SP.t('subjects.readFail')); });
        });
      }, Promise.resolve()).then(function () {
        SP.hub.save(); render();
        if (errs.length) SP.toast(SP.t('hub.notAdded') + ' ' + errs.join('; '), 'danger');
        else if (n) SP.toast(SP.t('subjects.added', { n: n }), 'success');
      });
    };
    inp.click();
  }

  function editor(s) {
    var edit = !!s;
    return SP.modal({
      title: SP.t(edit ? 'subjects.editTitle' : 'subjects.newTitle'),
      body: '<div class="field"><label class="label" for="seName">' + esc(SP.t('subjects.name')) + ' *</label><input class="input" id="seName" required value="' + esc(edit ? s.name : '') + '" placeholder="' + esc(SP.t('subjects.namePh')) + '"></div>' +
        '<div class="field"><label class="label" for="seCode">' + esc(SP.t('subjects.code')) + '</label><input class="input" id="seCode" value="' + esc(edit ? s.code || '' : '') + '"></div>' +
        '<div class="field"><label class="label" for="seTeacher">' + esc(SP.t('subjects.teacher')) + '</label><input class="input" id="seTeacher" value="' + esc(edit ? s.teacher || '' : '') + '"></div>' +
        '<div class="error-text" id="seErr" role="alert"></div>',
      actions: (edit ? [{ label: SP.t('subjects.deleteSubject'), kind: 'danger', icon: 'trash-2', close: false, onClick: function (api) {
        SP.confirm({ title: SP.t('common.deleteQ'), text: SP.t('subjects.deleteSubjectText'), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
          if (!ok) return; SP.hub.removeSubjects([s.id]); api.close(); selected = null; SP.navigate('subjects');
        });
        return false;
      } }] : []).concat([
        { label: SP.t('common.cancel') },
        { label: SP.t('common.save'), kind: 'primary', onClick: function () {
          var name = SP.$('#seName').value.trim();
          if (!name) { SP.$('#seName').setAttribute('aria-invalid', 'true'); SP.$('#seErr').textContent = SP.t('subjects.nameReq'); return false; }
          var fields = { name: name, code: SP.$('#seCode').value.trim(), teacher: SP.$('#seTeacher').value.trim() };
          if (edit) { Object.assign(s, fields); delete s.base; }
          else { var ns = Object.assign({ id: SP.hub.uid(), materials: [], tests: [], notes: '' }, fields); data().subjects.push(ns); selected = ns.id; }
          SP.hub.save(); SP.navigate('subjects', [selected || s.id]); render();
        } }
      ])
    });
  }

  function linkEditor(s) {
    SP.modal({
      title: SP.t('subjects.addLink'),
      body: '<div class="field"><label class="label" for="lkName">' + esc(SP.t('subjects.linkName')) + ' *</label><input class="input" id="lkName" maxlength="120" placeholder="' + esc(SP.t('subjects.linkNamePh')) + '"></div>' +
        '<div class="field"><label class="label" for="lkUrl">URL *</label><input class="input" id="lkUrl" inputmode="url" autocapitalize="off" placeholder="https://t.me/…"></div>' +
        '<div class="field"><label class="label" for="lkNote">' + esc(SP.t('subjects.linkNote')) + '</label><input class="input" id="lkNote" maxlength="200"></div>' +
        '<div class="error-text" id="lkErr" role="alert"></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.add'), kind: 'primary', icon: 'plus', onClick: function () {
        var name = SP.$('#lkName').value.trim(), url = SP.hub.normUrl(SP.$('#lkUrl').value), err = SP.$('#lkErr');
        if (!name) { err.textContent = SP.t('subjects.nameReq'); return false; }
        if (!url) { err.textContent = SP.t('subjects.badUrl'); return false; }
        if (s.materials.some(function (x) { return x.kind === 'link' && SP.hub.normUrl(x.url) === url; })) { err.textContent = SP.t('subjects.dupUrl'); return false; }
        s.materials.push({ id: SP.hub.uid(), kind: 'link', name: name, url: url, note: SP.$('#lkNote').value.trim(), added: new Date().toISOString() });
        SP.hub.save(); render(); SP.toast(SP.t('subjects.linkAdded'), 'success');
      } }]
    });
  }

  /* ---------------- Открытие файлов ---------------- */
  function downloadFile(f) {
    if (!f || !f.content) { SP.toast(SP.t('subjects.noContent'), 'danger'); return; }
    var b = SP.dataURLtoBlob(f.content, f.type); if (!b) { SP.toast(SP.t('subjects.readFail'), 'danger'); return; }
    SP.download(b, f.name || 'studyplay-file');
  }
  function openSite(p, dl, name) {
    var w = dl ? null : window.open('', '_blank');
    SP.hub.fetchSite(p, true).then(function (r) {
      if (dl) { var a = document.createElement('a'); a.href = r.u; a.download = name || ''; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
      else if (w) w.location.href = r.u; else window.open(r.u, '_blank');
    }).catch(function (e) { if (w) w.close(); SP.toast(SP.t('subjects.openFail') + ' ' + e.message, 'danger'); });
  }
  function ensureContent(f) {
    if (f.content || !f.base) return Promise.resolve(f);
    return SP.hub.fetchSite(f.path).then(function (r) { return r.r.blob(); }).then(function (b) { return SP.readAsDataURL(b).then(function (c) { f.content = c; f.type = f.type || b.type; return f; }); });
  }
  function openItem(s, type, i) {
    var arr = listOf(s, type), f = arr[i]; if (!f) return;
    if (f.kind === 'link') { window.open(f.url, '_blank', 'noopener,noreferrer'); return; }
    if (type === 'test') { ensureContent(f).then(runTest).catch(function (e) { SP.toast(SP.t('subjects.openFail') + ' ' + e.message, 'danger'); }); return; }
    if (f.base) { openSite(f.path, false); return; }
    var files = arr.filter(function (x) { return !x.base && x.kind !== 'link' && x.content; });
    var idx = files.indexOf(f); if (idx < 0) { SP.toast(SP.t('subjects.noContent'), 'danger'); return; }
    preview(files, idx);
  }
  function runTest(f) {
    if (!f || !f.content) { SP.toast(SP.t('subjects.noContent'), 'danger'); return; }
    var blob = SP.dataURLtoBlob(f.content, f.type); if (!blob) { SP.toast(SP.t('subjects.readFail'), 'danger'); return; }
    var name = /\.studyplay$/i.test(f.name) ? f.name + '.json' : (f.name || 'test.txt');
    SP.testEngine.readFile(new File([blob], name, { type: blob.type })).then(function (r) {
      if (!r.out.length) throw new Error(SP.t('tester.noQuestions'));
      SP.tester.openIsolated(f.name, r.out);
    }).catch(function (e) { SP.toast(SP.t('subjects.openFail') + ' ' + e.message, 'danger'); });
  }

  function preview(files, index) {
    var url = null;
    var m = SP.modal({ title: '', size: 'xl', body: '<div class="pv-body" id="pvBody"></div>', bodyClass: 'pv-wrap', actions: [
      { label: SP.t('common.prev'), icon: 'arrow-left', close: false, onClick: function () { show(index - 1); return false; } },
      { label: SP.t('common.next'), icon: 'arrow-right', close: false, onClick: function () { show(index + 1); return false; } },
      { label: SP.t('common.download'), icon: 'download', kind: 'primary', close: false, onClick: function () { downloadFile(files[index]); return false; } }
    ], onClose: function () { if (url) URL.revokeObjectURL(url); } });
    var body = SP.$('#pvBody', m.el);
    function show(i) {
      index = (i + files.length) % files.length; var x = files[index];
      m.el.querySelector('h2').textContent = x.name;
      if (url) { URL.revokeObjectURL(url); url = null; }
      var blob = SP.dataURLtoBlob(x.content, x.type);
      if (!blob) { body.innerHTML = fallback(); return; }
      var ext = (x.name.split('.').pop() || '').toLowerCase(); url = URL.createObjectURL(blob);
      if (ext === 'pdf') body.innerHTML = '<iframe class="pv-frame" title="' + esc(x.name) + '" src="' + url + '"></iframe>';
      else if (/^(png|jpe?g|webp|gif|svg)$/.test(ext)) body.innerHTML = '<img class="pv-img" src="' + url + '" alt="' + esc(x.name) + '">';
      else if (/^(txt|md|rtf|csv|json)$/.test(ext)) blob.text().then(function (t) { body.innerHTML = '<pre class="pv-text">' + esc(t) + '</pre>'; });
      else if (ext === 'docx' && window.mammoth) {
        body.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
        blob.arrayBuffer().then(function (ab) { return window.mammoth.convertToHtml({ arrayBuffer: ab }); }).then(function (r) { body.innerHTML = '<article class="pv-doc">' + r.value + '</article>'; }).catch(function () { body.innerHTML = fallback(); });
      } else if (ext === 'pptx' && window.JSZip) {
        body.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
        pptxText(blob).then(function (slides) {
          var si = 0;
          var paint = function () {
            body.innerHTML = '<div class="pv-slides"><article class="pv-slide">' + esc(slides[si]) + '</article><div class="row"><button type="button" class="btn btn-sm" id="psPrev"' + (si === 0 ? ' disabled' : '') + '>' + SP.icon('chevron-left') + '</button><span class="small muted">' + esc(SP.t('subjects.slide', { i: si + 1, n: slides.length })) + '</span><button type="button" class="btn btn-sm" id="psNext"' + (si === slides.length - 1 ? ' disabled' : '') + '>' + SP.icon('chevron-right') + '</button><span class="subtle xsmall">' + esc(SP.t('subjects.pptxNote')) + '</span></div></div>';
            SP.$('#psPrev', body).onclick = function () { si--; paint(); }; SP.$('#psNext', body).onclick = function () { si++; paint(); };
          };
          paint();
        }).catch(function () { body.innerHTML = fallback(); });
      } else body.innerHTML = fallback();
    }
    function fallback() { return '<div class="empty">' + SP.icon('file', 'ic-xl') + '<h3>' + esc(SP.t('subjects.noPreview')) + '</h3><p>' + esc(SP.t('subjects.noPreviewText')) + '</p></div>'; }
    show(index);
  }
  function pptxText(blob) {
    return window.JSZip.loadAsync(blob).then(function (zip) {
      var names = Object.keys(zip.files).filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/i.test(n); }).sort(function (a, b) { return Number(a.match(/slide(\d+)/i)[1]) - Number(b.match(/slide(\d+)/i)[1]); });
      if (!names.length) throw new Error('no slides');
      return Promise.all(names.map(function (n) {
        return zip.file(n).async('text').then(function (xml) {
          var doc = new DOMParser().parseFromString(xml, 'application/xml'), lines = [];
          Array.prototype.forEach.call(doc.getElementsByTagName('*'), function (el) {
            if (el.localName !== 'p') return;
            var w = Array.prototype.filter.call(el.getElementsByTagName('*'), function (x) { return x.localName === 't'; }).map(function (x) { return x.textContent || ''; }).join('');
            if (w.trim()) lines.push(w.trim());
          });
          return lines.join('\n\n') || '—';
        });
      }));
    });
  }

  /* ---------------- Иконка файла по формату (SVG, свой цвет у каждого типа) ---------------- */
  var FT = [
    [/^(docx?|rtf|odt)$/, 'word', 'DOC'], [/^(xlsx?|csv|ods)$/, 'excel', 'XLS'], [/^(pptx?|odp|key)$/, 'ppt', 'PPT'],
    [/^pdf$/, 'pdf', 'PDF'], [/^json$/, 'json', 'JSON'], [/^(png|jpe?g|webp|gif|svg|bmp|heic)$/, 'img', 'IMG'],
    [/^(mp4|webm|mov|mkv|avi)$/, 'video', 'VID'], [/^(mp3|wav|ogg|m4a|aac|flac)$/, 'audio', 'AUD'],
    [/^(zip|rar|7z|tar|gz)$/, 'zip', 'ZIP'], [/^(txt|md)$/, 'txt', 'TXT']
  ];
  SP.fileIcon = function (name) {
    var ext = String(name || '').split('.').pop().toLowerCase(), t = ['other', ext ? ext.slice(0, 4).toUpperCase() : 'FILE'];
    for (var i = 0; i < FT.length; i++) if (FT[i][0].test(ext)) { t = [FT[i][1], FT[i][2]]; break; }
    return '<svg class="fi ' + t[0] + '" viewBox="0 0 32 36" style="--fi-c:var(--ft-' + t[0] + ')" aria-hidden="true">' +
      '<path class="fi-page" d="M5 1.5h15l7.5 7.5v24a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-29.5a2 2 0 0 1 2-2z"/><path class="fi-fold" d="M20 1.5v7.5h7.5z"/>' +
      '<rect class="fi-band" x="1" y="18" width="' + (t[1].length > 3 ? 26 : 22) + '" height="10" rx="2"/><text x="' + (t[1].length > 3 ? 14 : 12) + '" y="25.5" text-anchor="middle">' + esc(t[1]) + '</text></svg>';
  };

  SP.views.register('subjects', {
    titleKey: 'nav.subjects',
    mount: function (el, params) { root = el; if (params && params[0]) selected = params[0]; render(); },
    show: function (params) { if (params && params[0]) { if (selected !== params[0]) { tab = 'materials'; showHidden = false; } selected = params[0]; } else if (window.innerWidth < 900) selected = null; render(); },
    refresh: render
  });
  SP.on('hub', function () { if (root && SP.views.current() === 'subjects') render(); });
  /* перерисовываем только при переходе через ширину 900px (клавиатура телефона тоже меняет размер окна) */
  var wasNarrow = window.innerWidth < 900;
  window.addEventListener('resize', SP.debounce(function () {
    var n = window.innerWidth < 900; if (n === wasNarrow) return; wasNarrow = n;
    if (root && SP.views.current() === 'subjects') render();
  }, 200));
})();

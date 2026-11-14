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
  /* при открытии предмета сначала «Тесты» (если они есть), иначе «Файлы» */
  function firstTab(id) { var s = SP.hub.getSubject(id); return s && (s.tests || []).length ? 'tests' : 'materials'; }
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
      sub: esc(SP.t('subjects.count', { n: d.subjects.length }))
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
    /* папка «Экзамен» — ведёт на отдельный сайт подготовки (exam/) */
    var examLink = selMode ? '' : '<a class="sj-item sj-exam" href="exam/index.html"><span class="fi-folder">' + SP.icon('folder') + '</span><span class="meta"><b>' + esc(SP.t('sj.exam')) + '</b><small>' + esc(SP.t('sj.examSub')) + '</small></span>' + SP.icon('chevron-right', 'sj-chev') + '</a>';
    h += '<nav class="sj-items" aria-label="' + esc(SP.t('nav.subjects')) + '">' + examLink + (items.length ? items.map(function (s) {
      var mats = (s.materials || []).length, tests = (s.tests || []).length, kn = SP.notes && SP.notes.has(s.name);
      var btn = '<button type="button" class="sj-item" data-sub="' + esc(s.id) + '"' + (active && s.id === active.id ? ' aria-current="true"' : '') + '>' +
        '<span class="fi-folder">' + SP.icon('folder') + '</span><span class="meta"><b>' + esc(SP.hub.cleanName(s.name)) + '</b>' +
        '<small>' + esc(SP.t('sj.itemMeta', { m: mats, t: tests })) + '</small></span>' + SP.icon('chevron-right', 'sj-chev') + '</button>';
      if (!selMode) return btn;
      return '<div class="sj-item-wrap"><label class="check"><input type="checkbox" data-selsub="' + esc(s.id) + '"' + (selSet[s.id] ? ' checked' : '') + ' aria-label="' + esc(SP.t('subjects.selectOne', { name: SP.hub.cleanName(s.name) })) + '"></label>' + btn + '</div>';
    }).join('') : '<p class="subtle small sj-none">' + esc(SP.t('subjects.notFound')) + '</p>') + '</nav>';
    /* «Выбрать» и «Добавить предмет» — под списком, прилипают к низу колонки */
    var d2 = data();
    h += '<div class="sj-list-foot"><button type="button" class="btn" id="sjSelect" aria-pressed="' + selMode + '">' + SP.icon(selMode ? 'x' : 'square-check-big') + '<span>' + esc(SP.t(selMode ? 'subjects.selDone' : 'subjects.select')) + '</span></button>' +
      '<button type="button" class="btn btn-primary" id="sjAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('subjects.add')) + '</span></button>' +
      (Object.keys(d2.removed || {}).length ? '<button type="button" class="btn btn-ghost btn-sm sj-restore" id="sjRestore">' + SP.icon('undo-2') + '<span>' + esc(SP.t('subjects.restoreRemoved')) + '</span></button>' : '') + '</div>';
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
      /* Вкладки папки: Файлы и ссылки · Тесты · Конспект (если он есть у предмета) */
      '';
    /* вкладка «Конспект» убрана (2026-11-14): никто не пользовался; код конспектов оставлен */
    if (tab === 'konspekt') tab = 'materials';
    h += '<div class="tabs sj-tabs" role="tablist">' + tabBtn('materials', 'folder-open', SP.t('sj.files'), mats.length) + tabBtn('tests', 'list-checks', SP.t('subjects.tests'), tests.length) +
      '</div><div class="sj-tab" role="tabpanel">';
    if (tab === 'materials') {
      h += '<div class="row sj-tab-acts"><button type="button" class="btn btn-sm" id="sjUpMat">' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('sj.upload')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" id="sjAddLink">' + SP.icon('link', 'ic-sm') + '<span>' + esc(SP.t('subjects.addLink')) + '</span></button></div>' +
        (mats.length ? listHtml(s, 'material') : '<p class="subtle small">' + esc(SP.t('subjects.noMat')) + '</p>');
    } else if (tab === 'tests') {
      h += '<div class="row sj-tab-acts"><button type="button" class="btn btn-sm" id="sjUpTest">' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('sj.upload')) + '</span></button></div>' +
        (tests.length ? listHtml(s, 'test') : '<p class="subtle small">' + esc(SP.t('subjects.noTests')) + '</p>');
    } else {
      h += '<div id="sjLecs">' + SP.skeleton(3, true) + '</div>';
    }
    return h + '</div></section>';
  }
  /* Лекции конспекта этого предмета: продолжить + список с отметками прогресса */
  function fillLectures(s) {
    if (!SP.notes) return;
    SP.notes.forSubject(s.name).then(function (list) {
      var box = SP.$('#sjLecs', root); if (!box || selected !== s.id) return;
      /* свои конспекты: добавить (промт для ИИ → ответ → проверка), загрузить файл, изменить, скачать */
      var acts = '<div class="row sj-tab-acts"><button type="button" class="btn btn-sm btn-primary" data-mnadd>' + SP.icon('sparkles', 'ic-sm') + '<span>' + esc(SP.t('mn.addBtn')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-mnimport>' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('mn.importBtn')) + '</span></button></div>';
      var wireMine = function () {
        var a = SP.$('[data-mnadd]', box); if (a) a.onclick = function () { SP.myNotes.add(s.name); };
        var im = SP.$('[data-mnimport]', box); if (im) im.onclick = function () { SP.myNotes.importDialog(s.name); };
        SP.$$('[data-mnedit]', box).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); SP.myNotes.edit(b.getAttribute('data-mnedit')); }; });
        SP.$$('[data-mnmore]', box).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); SP.myNotes.more(b.getAttribute('data-mnmore')); }; });
        SP.$$('[data-mndl]', box).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); SP.myNotes.exportFile(b.getAttribute('data-mndl')); }; });
      };
      if (!list.length) { box.innerHTML = acts + '<div class="mn-empty">' + SP.icon('book-open', 'ic-xl') + '<p class="small muted">' + esc(SP.t('mn.empty')) + '</p></div>'; wireMine(); return; }
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
          /* где остановился — слегка подсвечено, без отдельной кнопки */
          return '<a class="sj-lec' + (li === cl ? ' is-last' : '') + '" href="' + esc(SP.notes.href(meta, li)) + '"' + (li === cl ? ' aria-current="true"' : '') + '><span class="sj-lnum' + (st.read >= 97 ? ' done' : '') + '">' + esc(num.length > 3 ? li + 1 : num) + '</span>' +
            '<span class="meta"><b>' + esc(lec.title) + '</b><small>' + esc(lec.label) + '</small>' + (chips.length ? '<span class="chips-s">' + chips.join('') + '</span>' : '') + '</span>' + SP.icon('chevron-right', 'sj-chev') + '</a>';
        }).join('');
        /* свёрнутая строка: название конспекта, общий прогресс и «Продолжить»; нажал — раскрылся список лекций */
        var stats = d.lectures.map(function (lec) { return SP.notes.lecStats(meta, d, lec); });
        var nRead = stats.filter(function (x) { return x.read >= 97; }).length, nT = stats.filter(function (x) { return x.tests; }).length, nTd = stats.filter(function (x) { return x.best != null; }).length;
        var ci = cl == null ? 0 : cl, open = !!(SP.store.get('sp-sj-konsp-open', {}) || {})[meta.id];
        return '<details class="sj-konsp" data-kid="' + esc(meta.id) + '"' + (open ? ' open' : '') + '><summary>' +
          '<span class="sj-k-ic">' + SP.icon('book-open') + '</span><span class="meta"><b>' + esc(SP.t('sj.konspekt') + ' · ' + (meta.short || meta.subject) + ' — ' + SP.t('sj.nLec', { n: d.lectures.length })) + '</b>' +
          '<small>' + esc(SP.t('sj.kProg', { r: nRead, n: d.lectures.length }) + (nT ? ' · ' + SP.t('sj.kTests', { a: nTd, n: nT }) : '')) + '</small></span>' +
          SP.icon('chevron-down', 'sj-k-chev') + '</summary><div class="sj-lec-list">' + rows + '</div>' +
          (meta.local ? '<div class="row sj-mine-acts"><span class="badge">' + SP.icon('user', 'ic-sm') + esc(SP.t('mn.mineBadge')) + '</span>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-mnedit="' + esc(meta.id) + '">' + SP.icon('pencil', 'ic-sm') + '<span>' + esc(SP.t('mn.editBtn')) + '</span></button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-mnmore="' + esc(meta.id) + '">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('mn.moreLec')) + '</span></button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-mndl="' + esc(meta.id) + '">' + SP.icon('download', 'ic-sm') + '<span>' + esc(SP.t('mn.download')) + '</span></button></div>' : '') +
          '</details>';
      }).join('');
      box.innerHTML = acts + html;
      wireMine();
      SP.$$('.sj-konsp', box).forEach(function (dt) { dt.addEventListener('toggle', function () { var o = SP.store.get('sp-sj-konsp-open', {}) || {}; o[dt.getAttribute('data-kid')] = dt.open; SP.store.set('sp-sj-konsp-open', o); }); });
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
    /* у тестов под названием — сколько вопросов (считается один раз) */
    var qn = type === 'test' && !link ? SP.subjectTests.cached(s.id, i) : null, cntAttr = type === 'test' && !link && qn == null ? ' data-cnt="' + esc(s.id + '|' + i) + '"' : '';
    if (type === 'test' && !link) meta = qn != null ? SP.t('tester.qCount', { n: qn }) : SP.t('tester.srcCounting');
    var badge = SP.fileIcon(f.name, '', link);
    var inner = badge + '<span class="meta"><b>' + (isPin(f) ? SP.icon('pin', 'ic-sm pin-ic') + ' ' : '') + esc(f.name) + '</b><small' + cntAttr + '>' + esc(meta) + '</small></span>';
    /* значок «от курса» в строке не показываем — лишний шум */
    var main = link ? '<a class="list-row-main" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + inner + SP.icon('external-link', 'ic-sm subtle') + '</a>'
      : '<button type="button" class="list-row-main" data-open="' + type + ':' + i + '">' + inner + '</button>';
    var pos = ord.indexOf(i), same = function (j) { return j !== undefined && isPin(listOf(s, type)[j]) === isPin(f); };
    return '<div class="list-row' + (isPin(f) ? ' pinned' : '') + (hid ? ' is-hidden' : '') + '">' + main +
      (hid ? '<span class="badge">' + SP.icon('eye-off') + esc(SP.t('subjects.hiddenBadge')) + '</span>' : '') +
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
      if (selSet[selected]) selected = null;
      var snap = SP.hub.snapshot(), files = [];
      SP.hub.removeSubjects(ids, files); selSet = {}; selMode = false;
      SP.navigate('subjects'); render();
      SP.undo(SP.t('subjects.delFoldersDone', { n: ids.length }), function () { SP.hub.restore(snap); render(); }, function () { files.forEach(SP.hub.dropFile); });
    };
    var se = q('#sjSearch'); if (se) se.oninput = SP.debounce(function () { query = se.value; render(); var n = SP.$('#sjSearch', root); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 150);
    SP.$$('[data-sub]', root).forEach(function (b) { b.onclick = function () { SP.navigate('subjects', [b.getAttribute('data-sub')]); }; });
    var bk = q('#sjBack'); if (bk) bk.onclick = function () { selected = null; SP.navigate('subjects'); };
    if (!s) return;
    if (tab === 'konspekt') fillLectures(s);
    if (tab === 'tests') SP.subjectTests.fill(root);
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
      /* сразу убираем, 10 секунд можно вернуть; из хранилища файл стирается только потом */
      arr.splice(i, 1); SP.hub.save(); render();
      SP.undo(SP.t('subjects.fileDeleted', { name: f.name }), function () { arr.splice(Math.min(i, arr.length), 0, f); SP.hub.save(); render(); }, function () { SP.hub.dropFile(f); });
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
        var snap = SP.hub.snapshot(), files = [], sid = s.id;
        SP.hub.removeSubjects([sid], files); api.close(); selected = null; SP.navigate('subjects'); render();
        SP.undo(SP.t('subjects.folderDeleted', { name: s.name }), function () { SP.hub.restore(snap); selected = sid; SP.navigate('subjects', [sid]); render(); }, function () { files.forEach(SP.hub.dropFile); });
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
      /* в Android-приложении PDF во «фрейме» не показывается — рисуем страницы сами */
      if (ext === 'pdf' && SP.isApp) SP.pdfRender(body, blob).catch(function () { body.innerHTML = fallback(); });
      else if (ext === 'pdf') body.innerHTML = '<iframe class="pv-frame" title="' + esc(x.name) + '" src="' + url + '"></iframe>';
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
  /* Одна иконка файла на весь сайт: цветной листок с буквой или знаком.
     W — Word, X — Excel, P — презентация, PDF, T — текст, {} — JSON, картинка, видео, звук, архив, ссылка. */
  var FT = [
    [/^(docx?|rtf|odt)$/, '#378ADD', '#B5D4F4', 'W'], [/^(xlsx?|csv|ods)$/, '#639922', '#C0DD97', 'X'], [/^(pptx?|odp|key)$/, '#D85A30', '#F5C4B3', 'P'],
    [/^pdf$/, '#E24B4A', '#F7C1C1', 'PDF'], [/^(json|studyplay)$/, '#BA7517', '#FAC775', '{}'], [/^(png|jpe?g|webp|gif|svg|bmp|heic)$/, '#1D9E75', '#9FE1CB', 'img'],
    [/^(mp4|webm|mov|mkv|avi)$/, '#D4537E', '#F4C0D1', 'vid'], [/^(mp3|wav|ogg|m4a|aac|flac)$/, '#7F77DD', '#CECBF6', 'aud'],
    [/^(zip|rar|7z|tar|gz)$/, '#854F0B', '#FAC775', 'Z'], [/^(txt|md)$/, '#888780', '#D3D1C7', 'T']
  ];
  var GLYPH = {
    img: '<circle cx="6" cy="10" r="1.4" fill="#fff"/><path d="M3.5 17l3-3.5 2 2 2-2 3.5 3.5z" fill="#fff"/>',
    vid: '<path d="M6.5 10.5v6l5-3z" fill="#fff"/>',
    aud: '<path d="M7.5 16.5V10l5-1.2v6.2" stroke="#fff" stroke-width="1.2" fill="none"/><circle cx="6.5" cy="16.5" r="1.3" fill="#fff"/><circle cx="11.5" cy="15" r="1.3" fill="#fff"/>',
    link: '<path d="M6 16l5.5-5.5M7.5 10.5h4v4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
  };
  /* name — имя файла; link — ссылка; cls — доп. класс */
  SP.fileIcon = function (name, cls, link) {
    var ext = String(name || '').split('.').pop().toLowerCase(), t = ['#888780', '#D3D1C7', (ext && ext !== String(name).toLowerCase() ? ext.charAt(0).toUpperCase() : '?')];
    if (link) t = ['#7F77DD', '#CECBF6', 'link'];
    else for (var i = 0; i < FT.length; i++) if (FT[i][0].test(ext)) { t = [FT[i][1], FT[i][2], FT[i][3]]; break; }
    var g = GLYPH[t[2]] || '<text x="8.5" y="17" text-anchor="middle" font-size="' + (t[2].length > 2 ? 5.5 : t[2].length > 1 ? 7 : 8) + '" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">' + esc(t[2]) + '</text>';
    return '<svg class="fi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 18 22" aria-hidden="true"><path d="M2 1h9l5 5v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="' + t[0] + '"/><path d="M11 1v5h5z" fill="' + t[1] + '"/>' + g + '</svg>';
  };


  /* Для Тестера: тесты из папок предметов (список и файл для загрузки) */
  SP.subjectTests = {
    list: function () {
      return (data().subjects || []).map(function (s) {
        return { id: s.id, name: SP.hub.cleanName(s.name), tests: (s.tests || []).map(function (f, i) { return { i: i, f: f }; }).filter(function (x) { return x.f.kind !== 'link' && (x.f.content || x.f.base); }) };
      }).filter(function (s) { return s.tests.length; });
    },
    file: function (sid, i) {
      var s = SP.hub.getSubject(sid), f = s && (s.tests || [])[i];
      if (!f) return Promise.reject(new Error(SP.t('subjects.noContent')));
      return ensureContent(f).then(function (f) {
        var blob = f.content && SP.dataURLtoBlob(f.content, f.type); if (!blob) throw new Error(SP.t('subjects.readFail'));
        var name = /\.studyplay$/i.test(f.name) ? f.name + '.json' : (f.name || 'test.txt');
        return new File([blob], name, { type: blob.type });
      });
    },
    /* Общий вид списка «тесты из папок» (Тестер и Плеер): цветная полоска предмета,
       иконка файла (W — Word, T — текст), число вопросов под названием, один тест + «Ещё N» */
    COLORS: ['#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#BA7517', '#639922', '#888780'],
    icon: function (name) { return SP.fileIcon(name, 'srcg-ic'); },
    /* o: { input, name, sub, cnt: 'sid|i' (досчитать вопросы), off } */
    row: function (o) {
      return '<label class="srcg-row' + (o.off ? ' is-off' : '') + '">' + o.input + SP.subjectTests.icon(o.name) +
        '<span class="srcg-meta"><b>' + esc(o.name) + '</b><small' + (o.cnt ? ' data-cnt="' + esc(o.cnt) + '"' : '') + '>' + esc(o.sub || '') + '</small></span></label>';
    },
    /* o: { id, head, icon, color, rows: [html], open } */
    group: function (o) {
      var rest = o.rows.length - 1;
      return '<div class="srcg" data-g="' + esc(o.id) + '" style="--srcg:' + o.color + '"><div class="srcg-h">' + SP.icon(o.icon || 'folder', 'ic-sm') + '<span>' + esc(o.head) + '</span></div>' +
        '<div class="srcg-list">' + o.rows[0] + '</div>' +
        (rest > 0 ? '<div class="srcg-list srcg-more"' + (o.open ? '' : ' hidden') + '>' + o.rows.slice(1).join('') + '</div><button type="button" class="btn btn-ghost btn-sm srcg-tog" data-n="' + rest + '">' + SP.icon('chevron-down') + '<span></span></button>' : '') + '</div>';
    },
    /* кнопки «Ещё N / Свернуть»; open — объект { id группы: открыта } (чтобы помнить при перерисовке) */
    wire: function (root, open) {
      SP.$$('.srcg-tog', root).forEach(function (b) {
        b.onclick = function () { var box = b.previousElementSibling; box.hidden = !box.hidden; if (open) open[b.closest('.srcg').getAttribute('data-g')] = !box.hidden; SP.subjectTests.togs(root); };
      });
      SP.subjectTests.togs(root);
    },
    togs: function (root) {
      SP.$$('.srcg-tog', root).forEach(function (b) {
        var box = b.previousElementSibling, k = SP.$$('input:checked', box).length;
        b.querySelector('span').textContent = !box.hidden ? SP.t('tester.srcLess') : SP.t('tester.srcMore', { n: +b.getAttribute('data-n') }) + (k ? ' · ' + SP.t('tester.srcPicked', { n: k }) : '');
        b.firstElementChild.style.transform = box.hidden ? '' : 'rotate(180deg)';
      });
    },
    /* число вопросов: считаем один раз и запоминаем */
    cached: function (sid, i) { var k = cntKey(sid, i); return k ? SP.store.get('sp-test-counts', {})[k] : undefined; },
    count: function (sid, i) {
      var k = cntKey(sid, i), c = SP.subjectTests.cached(sid, i);
      if (c != null) return Promise.resolve(c);
      return SP.subjectTests.file(sid, i).then(SP.testEngine.readFile).then(function (r) {
        var all = SP.store.get('sp-test-counts', {}); all[k] = r.out.length; SP.store.set('sp-test-counts', all); return r.out.length;
      });
    },
    /* досчитать все [data-cnt] без числа в контейнере (по одному файлу, чтобы не грузить всё сразу) */
    fill: function (root) {
      var els = SP.$$('[data-cnt]', root).filter(function (e) { return !e.getAttribute('data-done'); });
      els.sort(function (a, b) { return !!a.closest('[hidden]') - !!b.closest('[hidden]'); });   /* сначала видимые */
      els.reduce(function (p, e) {
        return p.then(function () {
          if (!e.isConnected) return;
          var a = e.getAttribute('data-cnt').split('|');
          return SP.subjectTests.count(a[0], +a[1]).then(function (n) { e.textContent = SP.t('tester.qCount', { n: n }); e.setAttribute('data-done', '1'); }, function () { e.textContent = ''; });
        });
      }, Promise.resolve());
    }
  };
  function cntKey(sid, i) {
    var s = SP.hub.getSubject(sid), f = s && (s.tests || [])[i]; if (!f) return '';
    return sid + '|' + f.name + '|' + (f.path || (f.content ? f.content.length : f.size || f.id || ''));
  }

  SP.views.register('subjects', {
    titleKey: 'nav.subjects',
    mount: function (el, params) { root = el; if (params && params[0]) { selected = params[0]; tab = firstTab(selected); } render(); },
    show: function (params) { SP.hub.checkUpdate(); if (params && params[0]) { if (selected !== params[0]) { tab = firstTab(params[0]); showHidden = false; } selected = params[0]; } else if (window.innerWidth < 900) selected = null; render(); },
    refresh: render
  });
  SP.on('hub', function () { if (root && SP.views.current() === 'subjects') render(); });
  SP.on('notes-index', function () { if (root && SP.views.current() === 'subjects') render(); });
  /* перерисовываем только при переходе через ширину 900px (клавиатура телефона тоже меняет размер окна) */
  var wasNarrow = window.innerWidth < 900;
  window.addEventListener('resize', SP.debounce(function () {
    var n = window.innerWidth < 900; if (n === wasNarrow) return; wasNarrow = n;
    if (root && SP.views.current() === 'subjects') render();
  }, 200));
})();

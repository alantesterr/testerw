/* =====================================================================
   РАЗДЕЛ «ПАПКИ С ПРЕДМЕТАМИ».
   Слева — список предметов, справа — папка выбранного предмета:
   материалы и ссылки, тесты, личные заметки. На телефоне — сначала
   список, затем папка (с кнопкой «Назад»).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var root = null, selected = null, tab = 'materials', query = '', sharedSel = null;

  function data() { return SP.hub.data(); }
  function isPin(f) { return f.base ? !!(data().pins && data().pins[f.id]) : !!f.pinned; }
  function viewOrder(arr) { var ix = arr.map(function (_, i) { return i; }); return ix.filter(function (i) { return isPin(arr[i]); }).concat(ix.filter(function (i) { return !isPin(arr[i]); })); }
  function listOf(s, type) { return type === 'test' ? s.tests : s.materials; }
  function fileIcon(name) {
    var ext = String(name || '').split('.').pop().toLowerCase();
    if (/^(png|jpe?g|webp|gif|svg)$/.test(ext)) return ['image', 'success'];
    if (ext === 'pdf') return ['file-text', 'danger'];
    if (/^(docx?|rtf|odt)$/.test(ext)) return ['file-text', 'accent'];
    if (/^(pptx?|key)$/.test(ext)) return ['file', 'warning'];
    if (/^(json)$/.test(ext)) return ['file-json', ''];
    return ['file', ''];
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
    var d = data();
    var active = sharedSel ? null : (SP.hub.getSubject(selected) || null);
    var narrow = window.innerWidth < 900;
    var showDetail = !!(active || sharedSel);
    var html = SP.pageHead({
      title: SP.t('nav.subjects'),
      sub: SP.esc(SP.t('subjects.count', { n: d.subjects.length })),
      actions: '<button type="button" class="btn" id="sjShared">' + SP.icon('users') + '<span>' + SP.esc(SP.t('subjects.sharedLoad')) + '</span></button>' +
        '<button type="button" class="btn btn-primary" id="sjAdd">' + SP.icon('plus') + '<span>' + SP.esc(SP.t('subjects.add')) + '</span></button>'
    });
    if (!d.subjects.length && !d.shared.length) {
      html += '<section class="card"><div class="empty">' + SP.icon('folder-open', 'ic-xl') + '<h3>' + SP.esc(SP.t('subjects.emptyTitle')) + '</h3><p>' + SP.esc(SP.t('subjects.emptyText')) + '</p>' +
        '<div class="btn-group"><button type="button" class="btn btn-primary" id="sjAdd2">' + SP.icon('plus') + '<span>' + SP.esc(SP.t('subjects.add')) + '</span></button>' +
        '<a class="btn" href="#/schedule">' + SP.icon('calendar-days') + '<span>' + SP.esc(SP.t('nav.schedule')) + '</span></a></div></div></section>';
      root.innerHTML = '<div class="page">' + html + '</div>'; wire(null); return;
    }
    html += '<div class="sj-layout' + (narrow && showDetail ? ' show-detail' : '') + '">' + listPane(active) + '<div class="sj-detail">' + (sharedSel ? sharedPane() : active ? detailPane(active) : pickHint()) + '</div></div>';
    root.innerHTML = '<div class="page wide">' + html + '</div>';
    wire(active);
  }

  function listPane(active) {
    var d = data(), q = SP.lc(query);
    var items = d.subjects.filter(function (s) { return !q || SP.lc(s.name + ' ' + (s.teacher || '')).indexOf(q) >= 0; });
    var h = '<aside class="sj-list card card-flat"><div class="input-icon">' + SP.icon('search') + '<input class="input" type="search" id="sjSearch" placeholder="' + SP.esc(SP.t('subjects.search')) + '" value="' + SP.esc(query) + '" aria-label="' + SP.esc(SP.t('subjects.search')) + '"></div>';
    h += '<nav class="sj-items" aria-label="' + SP.esc(SP.t('nav.subjects')) + '">' + (items.length ? items.map(function (s) {
      var mats = (s.materials || []).length, tests = (s.tests || []).length, mates = SP.hub.mateOf(s).length;
      return '<button type="button" class="sj-item" data-sub="' + SP.esc(s.id) + '"' + (active && s.id === active.id ? ' aria-current="true"' : '') + '>' +
        '<span class="file-badge accent">' + SP.icon('folder') + '</span><span class="meta"><b>' + SP.esc(SP.hub.cleanName(s.name)) + '</b>' +
        '<small>' + SP.esc(SP.t('subjects.itemMeta', { m: mats, t: tests })) + (mates ? ' · ' + SP.esc(SP.t('subjects.hasMate')) : '') + '</small></span>' + SP.icon('chevron-right', 'sj-chev') + '</button>';
    }).join('') : '<p class="subtle small sj-none">' + SP.esc(SP.t('subjects.notFound')) + '</p>') + '</nav>';
    d.shared.forEach(function (g) {
      var un = g.subjects.filter(function (s) { return !SP.hub.findMine(s); }); if (!un.length) return;
      h += '<div class="sj-group-label">' + SP.icon('users', 'ic-sm') + ' ' + SP.esc(SP.t('subjects.mateGroup', { name: g.name })) + '</div>' +
        un.map(function (s) { return '<button type="button" class="sj-item mate" data-shsub="' + SP.esc(g.id + '|' + s.id) + '"' + (sharedSel && sharedSel.gid === g.id && sharedSel.sid === s.id ? ' aria-current="true"' : '') + '><span class="file-badge">' + SP.icon('users') + '</span><span class="meta"><b>' + SP.esc(SP.hub.cleanName(s.name)) + '</b><small>' + SP.esc(SP.t('subjects.testsN', { n: s.tests.length })) + '</small></span></button>'; }).join('');
    });
    return h + '</aside>';
  }

  function pickHint() { return '<section class="card"><div class="empty">' + SP.icon('folder-open', 'ic-xl') + '<p>' + SP.esc(SP.t('subjects.pick')) + '</p></div></section>'; }

  function detailPane(s) {
    var mats = s.materials || [], tests = s.tests || [];
    var h = '<section class="card sj-card">' +
      '<button type="button" class="btn btn-ghost sj-back" id="sjBack">' + SP.icon('arrow-left') + '<span>' + SP.esc(SP.t('subjects.all')) + '</span></button>' +
      '<div class="card-head"><div class="grow"><h2 class="sj-title">' + SP.esc(s.name) + '</h2><div class="card-sub">' + SP.esc([s.code, s.teacher].filter(Boolean).join(' · ') || SP.t('subjects.noTeacher')) + '</div></div>' +
      '<div class="row">' + (s.base && !s.notes && !mats.some(function (f) { return !f.base; }) ? '<span class="badge">' + SP.icon(s.base === 'timetable' ? 'cloud' : 'users') + SP.esc(SP.t(s.base === 'timetable' ? 'subjects.fromTt' : 'subjects.fromCourse')) + '</span>' : '') +
      '<button type="button" class="btn btn-ghost btn-icon" id="sjEdit" aria-label="' + SP.esc(SP.t('subjects.edit')) + '" data-tip="' + SP.esc(SP.t('subjects.edit')) + '">' + SP.icon('pencil') + '</button></div></div>' +
      '<div class="tabs" role="tablist">' +
      tabBtn('materials', 'folder-open', SP.t('subjects.materials'), mats.length) +
      tabBtn('tests', 'list-checks', SP.t('subjects.tests'), tests.length) +
      tabBtn('notes', 'square-pen', SP.t('subjects.notes'), null) + '</div>' +
      '<div class="sj-tab" role="tabpanel">';
    if (tab === 'materials') {
      h += '<div class="row"><button type="button" class="btn btn-primary" id="sjUpMat">' + SP.icon('upload') + '<span>' + SP.esc(SP.t('subjects.uploadMat')) + '</span></button>' +
        '<button type="button" class="btn" id="sjAddLink">' + SP.icon('link') + '<span>' + SP.esc(SP.t('subjects.addLink')) + '</span></button></div>';
      h += mats.length ? listHtml(s, 'material') : '<p class="subtle small">' + SP.esc(SP.t('subjects.noMat')) + '</p>';
    } else if (tab === 'tests') {
      h += '<div class="row"><button type="button" class="btn btn-primary" id="sjUpTest">' + SP.icon('upload') + '<span>' + SP.esc(SP.t('subjects.uploadTest')) + '</span></button></div>';
      h += tests.length ? listHtml(s, 'test') : '<p class="subtle small">' + SP.esc(SP.t('subjects.noTests')) + '</p>';
    } else {
      h += '<div class="field"><label class="label" for="sjNotes">' + SP.esc(SP.t('subjects.notesLabel')) + '</label><textarea class="textarea" id="sjNotes" rows="10" placeholder="' + SP.esc(SP.t('subjects.notesPh')) + '">' + SP.esc(s.notes) + '</textarea>' +
        '<span class="hint" id="sjNoteSt" aria-live="polite">' + SP.esc(SP.t('subjects.notesAuto')) + '</span></div>';
    }
    h += '</div>' + mateBlock(SP.hub.mateOf(s)) + '</section>';
    return h;
  }
  function tabBtn(id, icon, label, n) {
    return '<button type="button" class="tab" role="tab" data-tab="' + id + '" aria-selected="' + (tab === id) + '">' + SP.icon(icon, 'ic-sm') + '<span>' + SP.esc(label) + '</span>' + (n != null ? '<span class="count">' + n + '</span>' : '') + '</button>';
  }
  function listHtml(s, type) {
    var arr = listOf(s, type);
    return '<div class="list">' + viewOrder(arr).map(function (i) { return row(arr[i], i, type); }).join('') + '</div>';
  }
  function row(f, i, type) {
    var link = f.kind === 'link', li = link ? linkInfo(f.url) : null, fi = fileIcon(f.name);
    var icon = link ? li.icon : (type === 'test' ? 'list-checks' : fi[0]);
    var tone = link ? 'accent' : (type === 'test' ? 'success' : fi[1]);
    var meta = link ? li.label + (f.note ? ' · ' + f.note : '') : (f.size ? SP.formatSize(f.size) : '');
    var inner = '<span class="file-badge ' + tone + '">' + SP.icon(icon) + '</span><span class="meta"><b>' + (isPin(f) ? SP.icon('pin', 'ic-sm pin-ic') + ' ' : '') + SP.esc(f.name) + '</b><small>' + SP.esc(meta) + '</small></span>';
    var main = link ? '<a class="list-row-main" href="' + SP.esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + inner + SP.icon('external-link', 'ic-sm subtle') + '</a>'
      : '<button type="button" class="list-row-main" data-open="' + type + ':' + i + '">' + inner + '</button>';
    return '<div class="list-row' + (isPin(f) ? ' pinned' : '') + '">' + main +
      (f.base ? '<span class="badge" title="' + SP.esc(SP.t('subjects.courseFileTip')) + '">' + SP.esc(SP.t('subjects.courseFile')) + '</span>' : '') +
      (type === 'test' ? '<button type="button" class="btn btn-soft btn-sm" data-run="' + i + '">' + SP.icon('play') + '<span>' + SP.esc(SP.t('subjects.runTest')) + '</span></button>' : '') +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-more="' + type + ':' + i + '" aria-label="' + SP.esc(SP.t('common.actions')) + '" data-tip="' + SP.esc(SP.t('common.actions')) + '">' + SP.icon('ellipsis') + '</button></div>';
  }

  var mateFiles = [];
  function mateBlock(items) {
    mateFiles = [];
    if (!items.length) return '';
    return '<div class="mate-block"><div class="alert alert-info">' + SP.icon('users') + '<div class="alert-body"><b>' + SP.esc(SP.t('subjects.mateTitle')) + '</b><span>' + SP.esc(SP.t('subjects.mateText')) + '</span>' +
      '<div class="alert-actions"><button type="button" class="btn btn-primary btn-sm" id="mateSave">' + SP.icon('save') + '<span>' + SP.esc(SP.t('subjects.mateSave')) + '</span></button></div></div></div>' +
      items.map(function (x) {
        return '<div class="stack-sm"><div class="row"><span class="badge badge-accent">' + SP.icon('users') + SP.esc(x.g.name) + '</span></div>' +
          (x.sj.tests.length ? '<div class="list">' + x.sj.tests.map(function (f) { var n = mateFiles.push(f) - 1; return '<div class="list-row"><span class="file-badge success">' + SP.icon('list-checks') + '</span><span class="meta grow"><b>' + SP.esc(f.name) + '</b><small>' + SP.esc(f.size ? SP.formatSize(f.size) : '') + '</small></span><button type="button" class="btn btn-soft btn-sm" data-mate="' + n + '">' + SP.icon('play') + '<span>' + SP.esc(SP.t('subjects.runTest')) + '</span></button></div>'; }).join('') + '</div>' : '') +
          (x.sj.notes ? '<div class="card card-flat mate-notes"><div class="label">' + SP.esc(SP.t('subjects.mateNotes')) + '</div><pre class="small">' + SP.esc(x.sj.notes) + '</pre></div>' : '') + '</div>';
      }).join('') + '</div>';
  }
  function sharedPane() {
    var g = data().shared.filter(function (x) { return x.id === sharedSel.gid; })[0];
    var sj = g && g.subjects.filter(function (x) { return x.id === sharedSel.sid; })[0];
    if (!sj) { sharedSel = null; return pickHint(); }
    return '<section class="card sj-card"><button type="button" class="btn btn-ghost sj-back" id="sjBack">' + SP.icon('arrow-left') + '<span>' + SP.esc(SP.t('subjects.all')) + '</span></button>' +
      '<div class="card-head"><div><h2 class="sj-title">' + SP.esc(SP.hub.cleanName(sj.name)) + '</h2><div class="card-sub">' + SP.esc(sj.teacher || '') + '</div></div></div>' + mateBlock([{ g: g, sj: sj }]) + '</section>';
  }

  /* ---------------- Действия ---------------- */
  function wire(s) {
    var q = function (x) { return SP.$(x, root); };
    [q('#sjAdd'), q('#sjAdd2')].forEach(function (b) { if (b) b.onclick = function () { editor(null); }; });
    var sh = q('#sjShared'); if (sh) sh.onclick = pickShared;
    var se = q('#sjSearch'); if (se) se.oninput = SP.debounce(function () { query = se.value; render(); var n = SP.$('#sjSearch', root); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 150);
    SP.$$('[data-sub]', root).forEach(function (b) { b.onclick = function () { sharedSel = null; SP.navigate('subjects', [b.getAttribute('data-sub')]); }; });
    SP.$$('[data-shsub]', root).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-shsub').split('|'); sharedSel = { gid: p[0], sid: p[1] }; selected = null; render(); }; });
    var bk = q('#sjBack'); if (bk) bk.onclick = function () { sharedSel = null; selected = null; SP.navigate('subjects'); };
    SP.$$('[data-mate]', root).forEach(function (b) { b.onclick = function () { runTest(mateFiles[+b.getAttribute('data-mate')]); }; });
    var ms = q('#mateSave'); if (ms) ms.onclick = function () { SP.hub.mergeAllShared().then(function (r) { if (r) SP.toast(SP.t('subjects.mateSaved', { t: r.nt, n: r.nn }), 'success'); sharedSel = null; render(); }); };
    if (!s) return;
    q('#sjEdit').onclick = function () { editor(s); };
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
    SP.$$('[data-more]', root).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var p = b.getAttribute('data-more').split(':'); moreMenu(b, s, p[0], +p[1]); }; });
  }

  function moreMenu(btn, s, type, i) {
    var arr = listOf(s, type), f = arr[i], ord = viewOrder(arr), pos = ord.indexOf(i);
    var nb = function (dlt) { var j = ord[pos + dlt]; return (j !== undefined && isPin(arr[j]) === isPin(f) && !arr[j].base) ? j : -1; };
    var items = [{ label: SP.t(type === 'test' ? 'subjects.runTest' : 'common.open'), icon: type === 'test' ? 'play' : 'external-link', onClick: function () { openItem(s, type, i); } }];
    if (f.kind !== 'link') items.push({ label: SP.t('common.download'), icon: 'download', onClick: function () { if (f.base) openSite(f.path, true, f.name); else downloadFile(f); } });
    items.push({ label: SP.t(isPin(f) ? 'subjects.unpin' : 'subjects.pin'), icon: isPin(f) ? 'pin-off' : 'pin', onClick: function () {
      if (f.base) { var p = data().pins = data().pins || {}; if (p[f.id]) delete p[f.id]; else p[f.id] = 1; } else f.pinned = !f.pinned;
      SP.hub.save(); render();
    } });
    items.push({ label: SP.t('subjects.moveUp'), icon: 'arrow-up', disabled: f.base || nb(-1) < 0, onClick: function () { swap(arr, i, nb(-1)); } });
    items.push({ label: SP.t('subjects.moveDown'), icon: 'arrow-down', disabled: f.base || nb(1) < 0, onClick: function () { swap(arr, i, nb(1)); } });
    items.push('-');
    items.push({ label: SP.t('common.delete'), icon: 'trash-2', danger: true, disabled: !!f.base, onClick: function () {
      SP.confirm({ title: SP.t('common.deleteQ'), text: SP.t('subjects.deleteFile', { name: f.name }), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
        if (!ok) return; SP.hub.dropFile(f); arr.splice(i, 1); SP.hub.save(); render();
      });
    } });
    SP.menu(btn, items);
  }
  function swap(arr, i, j) { if (j < 0) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; SP.hub.save(); render(); }

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

  function pickShared() {
    var inp = SP.el('<input type="file" accept=".json,.studyplay,application/json" multiple hidden>');
    document.body.appendChild(inp);
    inp.onchange = function () { var fs = Array.prototype.slice.call(inp.files); inp.remove(); if (fs.length) SP.hub.importShared(fs).then(render); };
    inp.click();
  }

  function editor(s) {
    var edit = !!s;
    var m = SP.modal({
      title: SP.t(edit ? 'subjects.editTitle' : 'subjects.newTitle'),
      body: '<div class="field"><label class="label" for="seName">' + SP.esc(SP.t('subjects.name')) + ' *</label><input class="input" id="seName" required value="' + SP.esc(edit ? s.name : '') + '" placeholder="' + SP.esc(SP.t('subjects.namePh')) + '"></div>' +
        '<div class="field"><label class="label" for="seCode">' + SP.esc(SP.t('subjects.code')) + '</label><input class="input" id="seCode" value="' + SP.esc(edit ? s.code || '' : '') + '"></div>' +
        '<div class="field"><label class="label" for="seTeacher">' + SP.esc(SP.t('subjects.teacher')) + '</label><input class="input" id="seTeacher" value="' + SP.esc(edit ? s.teacher || '' : '') + '"></div>' +
        '<div class="error-text" id="seErr" role="alert"></div>',
      actions: (edit ? [{ label: SP.t('subjects.deleteSubject'), kind: 'danger-outline', icon: 'trash-2', close: false, onClick: function (api) {
        SP.confirm({ title: SP.t('common.deleteQ'), text: SP.t('subjects.deleteSubjectText'), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
          if (!ok) return;
          (s.materials || []).concat(s.tests || []).forEach(SP.hub.dropFile);
          var d = data(); d.subjects = d.subjects.filter(function (x) { return x.id !== s.id; });
          if (d.own) d.own.schedule = d.own.schedule.filter(function (x) { return x.subjectId !== s.id; });
          SP.hub.save(); SP.hub.applyLayers(); api.close(); selected = null; SP.navigate('subjects');
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
    return m;
  }

  function linkEditor(s) {
    SP.modal({
      title: SP.t('subjects.addLink'),
      body: '<div class="field"><label class="label" for="lkName">' + SP.esc(SP.t('subjects.linkName')) + ' *</label><input class="input" id="lkName" maxlength="120" placeholder="' + SP.esc(SP.t('subjects.linkNamePh')) + '"></div>' +
        '<div class="field"><label class="label" for="lkUrl">URL *</label><input class="input" id="lkUrl" inputmode="url" autocapitalize="off" placeholder="https://t.me/…"></div>' +
        '<div class="field"><label class="label" for="lkNote">' + SP.esc(SP.t('subjects.linkNote')) + '</label><input class="input" id="lkNote" maxlength="200"></div>' +
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
      if (ext === 'pdf') body.innerHTML = '<iframe class="pv-frame" title="' + SP.esc(x.name) + '" src="' + url + '"></iframe>';
      else if (/^(png|jpe?g|webp|gif|svg)$/.test(ext)) body.innerHTML = '<img class="pv-img" src="' + url + '" alt="' + SP.esc(x.name) + '">';
      else if (/^(txt|md|rtf|csv)$/.test(ext)) blob.text().then(function (t) { body.innerHTML = '<pre class="pv-text">' + SP.esc(t) + '</pre>'; });
      else if (ext === 'docx' && window.mammoth) {
        body.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
        blob.arrayBuffer().then(function (ab) { return window.mammoth.convertToHtml({ arrayBuffer: ab }); }).then(function (r) { body.innerHTML = '<article class="pv-doc">' + r.value + '</article>'; }).catch(function () { body.innerHTML = fallback(); });
      } else if (ext === 'pptx' && window.JSZip) {
        body.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
        pptxText(blob).then(function (slides) {
          var si = 0;
          var paint = function () {
            body.innerHTML = '<div class="pv-slides"><article class="pv-slide">' + SP.esc(slides[si]) + '</article><div class="row"><button type="button" class="btn btn-sm" id="psPrev"' + (si === 0 ? ' disabled' : '') + '>' + SP.icon('chevron-left') + '</button><span class="small muted">' + SP.esc(SP.t('subjects.slide', { i: si + 1, n: slides.length })) + '</span><button type="button" class="btn btn-sm" id="psNext"' + (si === slides.length - 1 ? ' disabled' : '') + '>' + SP.icon('chevron-right') + '</button><span class="subtle xsmall">' + SP.esc(SP.t('subjects.pptxNote')) + '</span></div></div>';
            SP.$('#psPrev', body).onclick = function () { si--; paint(); }; SP.$('#psNext', body).onclick = function () { si++; paint(); };
          };
          paint();
        }).catch(function () { body.innerHTML = fallback(); });
      } else body.innerHTML = fallback();
    }
    function fallback() { return '<div class="empty">' + SP.icon('file', 'ic-xl') + '<h3>' + SP.esc(SP.t('subjects.noPreview')) + '</h3><p>' + SP.esc(SP.t('subjects.noPreviewText')) + '</p></div>'; }
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

  SP.views.register('subjects', {
    titleKey: 'nav.subjects',
    mount: function (el, params) { root = el; if (params && params[0]) selected = params[0]; render(); },
    show: function (params) { if (params && params[0]) { if (selected !== params[0]) tab = 'materials'; selected = params[0]; sharedSel = null; } else if (window.innerWidth < 900) selected = null; render(); },
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

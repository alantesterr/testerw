/* =====================================================================
   РАЗДЕЛ «РАЗРАБОТЧИК» (#/dev): автор меняет папки предметов для всех.
   Исходное состояние — data/<группа>/manifest.json на GitHub. Правки
   (добавить, удалить, переименовать, перенести, поправить текст теста)
   копятся в черновике: список — в localStorage, новые файлы — в IndexedDB.
   Дальше два пути:
     А. «Скачать изменения» — архив с папкой data/ и пошаговая инструкция,
        как загрузить его на GitHub руками;
     Б. «Опубликовать» — один коммит через GitHub API личным ключом автора
        (ключ хранится только в этом браузере).
   Перед каждой публикацией и откатом ставится точка сохранения (тег
   backup-…), к любой точке можно вернуть весь сайт одной кнопкой.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc, root = null;
  var GH = { owner: 'alantesterr', repo: 'testerw', branch: 'main' };
  var GH_WEB = 'https://github.com/' + GH.owner + '/' + GH.repo;
  var API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;
  var KEY = 'sp-dev-gh', DRAFT = 'sp-dev-draft', LAST = 'sp-dev-last';
  var IDB = SP.idb('studyplay-dev');
  var st = null;          /* { dir, ver, orig: [...], files: [...], subs: [...], sched: [...], stale } */
  var groups = [], points = null, busy = false;
  /* вкладки раздела; «Группы» — js/features/dev-groups.js, «Расписание» — js/features/dev-schedule.js */
  var TABS = [['folders', 'folder'], ['groups', 'users'], ['schedule', 'calendar-days'], ['points', 'save'], ['help', 'circle-help']];
  var tab = 'folders';
  try { tab = sessionStorage.getItem('sp-dev-tab') || 'folders'; } catch (e) { }
  if (!TABS.some(function (t) { return t[0] === tab; })) tab = 'folders';
  /* точек сохранения (тегов backup-…) на GitHub храним не больше стольких — старые удаляются сами */
  var MAX_POINTS = 4;

  var token = function () { return SP.store.get(KEY, '') || ''; };
  var eid = function (f) { return f.kind === 'link' || (!f.path && f.url) ? 'link:' + f.url : f.path; };
  var ext = function (n) { return (String(n || '').match(/\.([^.]+)$/) || [])[1] || ''; };
  var isText = function (f) { return f.kind !== 'link' && /^(txt|md|json|csv)$/i.test(ext(f.name)); };
  var safe = function (n) { return String(n || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'file'; };
  var pathFor = function (subject, name) { return 'data/' + st.dir + '/files/' + safe(subject) + '/' + safe(name); };
  function clean(f) { var r = {}; Object.keys(f).forEach(function (k) { if (k.charAt(0) !== '_') r[k] = f[k]; }); return r; }
  function same(a, b) { return ['subject', 'kind', 'name', 'url', 'note', 'path'].every(function (k) { return (a[k] || '') === (b[k] || ''); }); }
  function nextVersion() {
    var t = new Date().toISOString().slice(0, 10), m = String(st.ver || '').match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/);
    return m && m[1] === t ? t + '.' + (+m[2] + 1) : t + '.1';
  }
  function stamp() { var d = new Date(), p = SP.pad2; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }

  /* ---------- Черновик ---------- */
  function save() { SP.store.set(DRAFT, { dir: st.dir, ver: st.ver, orig: st.orig, files: st.files, subs: st.subs, inc: st.inc, origInc: st.origInc }); }
  function fresh(dir, man, sched) {
    var files = (man && Array.isArray(man.files) ? man.files : []).filter(function (f) { return f && f.name; });
    var inc = man && Array.isArray(man.include) ? man.include : [];
    return { dir: dir, ver: String((man && man.version) || ''), orig: files.map(clean), files: files.map(function (f) { var c = clean(f); c._o = eid(f); return c; }), subs: [], sched: sched, inc: JSON.parse(JSON.stringify(inc)), origInc: inc };
  }
  function diff() {
    var om = {}, seen = {}, add = [], mod = [], del = [];
    st.orig.forEach(function (f) { om[eid(f)] = f; });
    st.files.forEach(function (f) {
      var o = f._o && om[f._o];
      if (!o) { add.push(f); return; }
      seen[f._o] = 1;
      if (f._edit || !same(o, f)) mod.push(f);
    });
    st.orig.forEach(function (o) { if (!seen[eid(o)]) del.push(o); });
    /* «Общие предметы из других групп» (include в manifest.json) — тоже изменение */
    var inc = JSON.stringify(st.inc || []) !== JSON.stringify(st.origInc || []);
    /* порядок файлов поменяли перетаскиванием — тоже изменение (порядок в manifest.json = порядок у студентов) */
    var now = st.files.filter(function (f) { return f._o && om[f._o]; }).map(function (f) { return f._o; });
    var was = st.orig.map(eid).filter(function (id) { return now.indexOf(id) >= 0; });
    var ord = now.join('|') !== was.join('|');
    return { add: add, mod: mod, del: del, inc: inc, ord: ord, n: add.length + mod.length + del.length + (inc ? 1 : 0) + (ord ? 1 : 0) };
  }
  /* файлы, которые надо положить в репозиторий (новые и с новым содержимым) */
  function uploads() { return st.files.filter(function (f) { return f.kind !== 'link' && f.path && (!f._o || f._edit); }); }
  /* файлы, которые больше нигде не упоминаются, — их можно стереть из репозитория */
  function removals(d) {
    var used = {}; st.files.forEach(function (f) { if (f.path) used[f.path] = 1; });
    return d.del.filter(function (o) { return o.path && !used[o.path] && o.path.indexOf('data/' + st.dir + '/') === 0; }).map(function (o) { return o.path; });
  }
  function manifestObj(ver) { var o = { version: ver || nextVersion() }; if ((st.inc || []).length) o.include = st.inc; o.files = st.files.map(clean); return o; }
  function manifestText(ver) { return JSON.stringify(manifestObj(ver), null, 2) + '\n'; }

  /* ---------- Загрузка исходного состояния ---------- */
  /* null — файла нет (404), undefined — нет связи */
  function getJson(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return undefined; }); }
  function remoteFile(path) {
    if (!token()) return getJson(encodeURI(path) + '?t=' + Date.now());
    return gh('GET', '/contents/' + encodeURI(path) + '?ref=' + GH.branch).then(function (j) {
      return JSON.parse(decodeURIComponent(escape(atob(String(j.content || '').replace(/\s/g, '')))));
    }).catch(function () { return getJson(encodeURI(path) + '?t=' + Date.now()); });
  }
  function load(dir) {
    return Promise.all([remoteFile('data/' + dir + '/manifest.json'), getJson('data/' + dir + '/schedule.json')]).then(function (r) {
      var f = fresh(dir, r[0], r[1] && Array.isArray(r[1].subjects) ? r[1].subjects.map(function (s) { return s.name; }) : []);
      var dr = SP.store.get(DRAFT, null);
      if (dr && dr.dir === dir && Array.isArray(dr.files)) {
        var keep = { dir: dir, ver: dr.ver, orig: dr.orig || [], files: dr.files, subs: dr.subs || [], sched: f.sched, inc: dr.inc || f.inc, origInc: dr.origInc || f.origInc };
        st = keep;
        /* пока правил, на сайте поменялись файлы — предупредить */
        st.stale = diff().n > 0 && JSON.stringify(f.orig) !== JSON.stringify(dr.orig);
        if (!diff().n) st = f;
      } else st = f;
      if (r[0] === undefined) st.err = SP.t('dev.loadErr'); else if (r[0] === null) st.none = true;
    });
  }
  function reload(force) {
    var dir = groupDir(), go = function () { SP.store.del(DRAFT); IDB.clear().catch(function () { }); st = null; render(); load(dir).then(render); };
    if (!force && st && diff().n) SP.confirm({ title: SP.t('dev.reload'), text: SP.t('dev.reloadText'), okLabel: SP.t('dev.reload'), danger: true }).then(function (ok) { if (ok) go(); });
    else go();
  }
  var groupDir = function () { return (st && st.dir) || window.SP_GROUP_DIR || (groups[0] && groups[0].folder) || 'ir-252'; };

  /* ---------- Список предметов ---------- */
  function subjects() {
    var out = [], add = function (n) { if (n && out.indexOf(n) < 0) out.push(n); };
    st.orig.forEach(function (f) { add(f.subject); });
    st.files.forEach(function (f) { add(f.subject); });
    (st.subs || []).forEach(add);
    (st.sched || []).forEach(add);
    return out;
  }
  function stateOf(f, d) { return d.add.indexOf(f) >= 0 ? 'new' : d.mod.indexOf(f) >= 0 ? 'mod' : ''; }
  function kindLabel(f) { return SP.t('dev.kind.' + (f.kind === 'link' || (!f.path && f.url) ? 'link' : f.kind === 'test' || f.kind === 'cards' ? f.kind : 'material')); }

  function rowHtml(f, i, d) {
    var s = stateOf(f, d), link = f.kind === 'link';
    var meta = kindLabel(f) + (link ? ' · ' + f.url : f.size ? ' · ' + SP.formatSize(f.size) : '');
    return '<div class="list-row dev-row dg-item' + (s ? ' dev-' + s : '') + '" data-dk="' + i + '"><span class="dg-grip" aria-hidden="true">' + SP.icon('grip-vertical') + '</span><div class="list-row-main">' + SP.fileIcon(f.name, '', link) +
      '<span class="meta"><b>' + esc(f.name) + '</b><small>' + esc(meta) + '</small></span></div>' +
      (s ? '<span class="badge ' + (s === 'new' ? 'badge-success' : 'badge-warning') + '">' + esc(SP.t('dev.st.' + s)) + '</span>' : '') +
      '<div class="dev-acts"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-edit="' + i + '" aria-label="' + esc(SP.t('common.change')) + '" data-tip="' + esc(SP.t('common.change')) + '">' + SP.icon('pencil') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-del="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '" data-tip="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button></div></div>';
  }
  function delRowHtml(o, j) {
    return '<div class="list-row dev-row dev-del"><div class="list-row-main">' + SP.fileIcon(o.name, '', o.kind === 'link') +
      '<span class="meta"><b>' + esc(o.name) + '</b><small>' + esc(kindLabel(o)) + '</small></span></div>' +
      '<span class="badge badge-danger">' + esc(SP.t('dev.st.del')) + '</span>' +
      '<div class="dev-acts"><button type="button" class="btn btn-ghost btn-sm" data-undel="' + j + '">' + SP.icon('undo-2', 'ic-sm') + '<span>' + esc(SP.t('dev.restore')) + '</span></button></div></div>';
  }

  /* ---------- Отрисовка ---------- */
  function render() {
    if (!root) return;
    var html = SP.pageHead({ title: SP.t('dev.title'), sub: esc(SP.t('dev.sub')), actions: '<a class="btn btn-ghost" href="#/settings">' + SP.icon('arrow-left') + '<span>' + esc(SP.t('nav.settings')) + '</span></a>' });
    /* вкладки: Папки · Группы · Расписание · Точки сохранения · Помощь */
    html += '<div class="ui2-tabs dev-tabs" role="tablist">' + TABS.map(function (t) {
      return '<button type="button" class="ui2-tab" role="tab" data-dtab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + SP.icon(t[1]) + '<span>' + esc(SP.t('dev.tab.' + t[0])) + '</span></button>';
    }).join('') + '</div>';
    if (tab !== 'folders') {
      root.innerHTML = '<div class="page dev-page">' + html + '<div id="dvTab"></div></div>';
      wireTabs();
      var box = SP.$('#dvTab', root);
      if (tab === 'points') { box.innerHTML = pointsTabHtml(); wire(); if (!points) loadPoints(); }
      else if (tab === 'groups' && SP.devGroups) SP.devGroups.mount(box, core);
      else if (tab === 'schedule' && SP.devSchedule) SP.devSchedule.mount(box, core);
      else if (tab === 'help') { box.innerHTML = helpHtml(); wireHelp(box); }
      return;
    }
    if (!st) { root.innerHTML = '<div class="page">' + html + '<p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('dev.loading')) + '</p></div>'; return; }
    var d = diff(), subs = subjects(), has = !!token();
    html += '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body"><span>' + SP.t('dev.how') + '</span></div></div>';
    if (st.err) html += '<div class="alert alert-danger">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(st.err) + '</div></div>';
    if (st.none) html += '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body">' + esc(SP.t('dev.noManifest', { g: (groups.filter(function (x) { return x.folder === st.dir; })[0] || {}).name || st.dir })) + '</div></div>';
    if (st.stale) html += '<div class="alert alert-warning">' + SP.icon('triangle-alert') + '<div class="alert-body"><span>' + esc(SP.t('dev.stale')) + '</span><div class="alert-actions"><button type="button" class="btn btn-sm" id="dvFresh">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('dev.reload')) + '</span></button></div></div></div>';

    html += '<div class="row dev-bar">' +
      (groups.length > 1 ? '<label class="row row-nowrap"><span class="small muted">' + esc(SP.t('dev.group')) + '</span><select class="input" id="dvGroup">' + groups.map(function (g) { return '<option value="' + esc(g.folder) + '"' + (g.folder === st.dir ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></label>' : '') +
      '<button type="button" class="btn" id="dvSubj">' + SP.icon('plus') + '<span>' + esc(SP.t('dev.addSubject')) + '</span></button>' +
      '<button type="button" class="btn btn-ghost" id="dvReload">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('dev.reload')) + '</span></button>' +
      '<span class="small muted grow">' + esc(SP.t('dev.version', { v: st.ver || '—' })) + '</span></div>';

    /* папки предметов */
    var folders = subs.map(function (name, k) {
      var rows = st.files.map(function (f, i) { return f.subject === name ? rowHtml(f, i, d) : ''; }).join('') +
        d.del.map(function (o, j) { return o.subject === name ? delRowHtml(o, j) : ''; }).join('');
      var n = st.files.filter(function (f) { return f.subject === name; }).length;
      return '<section class="card dev-subj" data-sk="' + k + '"><div class="card-head"><div><h2 class="card-title">' + SP.icon('folder') + esc(name) + '</h2><div class="card-sub">' + esc(SP.t('dev.count', { n: n })) + '</div></div>' +
        '<div class="btn-group">' +
        '<button type="button" class="btn btn-sm" data-add="test" data-s="' + k + '">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.addTest')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-add="material" data-s="' + k + '">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.addMat')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-add="link" data-s="' + k + '">' + SP.icon('link', 'ic-sm') + '<span>' + esc(SP.t('dev.addLink')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-add="cards" data-s="' + k + '" data-tip="' + esc(SP.t('dev.addCardsTip')) + '">' + SP.icon('layers', 'ic-sm') + '<span>' + esc(SP.t('dev.addCards')) + '</span></button>' +
        (n || st.subs.indexOf(name) >= 0 ? '<button type="button" class="btn btn-sm btn-ghost" data-dels="' + k + '" aria-label="' + esc(SP.t('dev.delSubject')) + '" data-tip="' + esc(SP.t('dev.delSubject')) + '">' + SP.icon('trash-2', 'ic-sm') + '</button>' : '') +
        '</div></div>' + (rows ? '<div class="list">' + rows + '</div>' : '<p class="small subtle">' + esc(SP.t('dev.empty')) + '</p>') + '</section>';
    }).join('');

    /* изменения и две кнопки */
    var chg = d.add.map(function (f) { return '<li class="dev-c-new">+ ' + esc(f.subject + ' / ' + f.name) + '</li>'; }).join('') +
      d.mod.map(function (f) { return '<li class="dev-c-mod">✎ ' + esc(f.subject + ' / ' + f.name) + '</li>'; }).join('') +
      d.del.map(function (f) { return '<li class="dev-c-del">− ' + esc(f.subject + ' / ' + f.name) + '</li>'; }).join('') +
      (d.inc ? '<li class="dev-c-mod">✎ ' + esc(SP.t('dev.sharedTitle')) + '</li>' : '') +
      (d.ord ? '<li class="dev-c-mod">✎ ' + esc(SP.t('dev.orderChanged')) + '</li>' : '');
    html += '<section class="card dev-changes' + (d.n ? ' has' : '') + '" id="dvChanges"><div class="card-head"><div><h2 class="card-title">' + SP.icon('layers') + esc(SP.t('dev.changes')) + '</h2>' +
      '<div class="card-sub">' + esc(d.n ? SP.t('dev.sum', { a: d.add.length, d: d.del.length, m: d.mod.length }) : SP.t('dev.noChanges')) + '</div></div>' +
      (d.n ? '<button type="button" class="btn btn-ghost btn-sm" id="dvReset">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('dev.reset')) + '</span></button>' : '') + '</div>' +
      (d.n ? '<ul class="dev-clist">' + chg + '</ul>' : '') +
      '<div class="dev-ways">' +
      '<div class="dev-way"><b>' + esc(SP.t('dev.wayB')) + '</b><small>' + esc(SP.t(has ? 'dev.wayBText' : 'dev.wayBNoKey')) + '</small><button type="button" class="btn btn-primary" id="dvPub"' + (d.n && has ? '' : ' disabled') + '>' + SP.icon('upload') + '<span>' + esc(SP.t('dev.publish')) + '</span></button></div>' +
      '</div></section>' + '<section class="card" id="dvShared" hidden></section>' + folders;
    if (d.n) html += '<button type="button" class="dev-float" id="dvFloat">' + SP.icon('layers', 'ic-sm') + '<span>' + esc(SP.t('dev.sum', { a: d.add.length, d: d.del.length, m: d.mod.length })) + '</span>' + SP.icon('arrow-up', 'ic-sm') + '</button>';

    root.innerHTML = '<div class="page dev-page">' + html + '</div>';
    wireTabs(); wire();
    if (SP.devGroups) SP.devGroups.shared(SP.$('#dvShared', root), core);
  }

  /* вкладка «Точки сохранения»: ключ GitHub + точки (не больше MAX_POINTS) + последние изменения */
  function pointsTabHtml() {
    var has = !!token(), html = '';
    /* ключ GitHub */
    html += '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('key-round') + esc(SP.t('dev.key')) + '</h2><div class="card-sub">' + esc(SP.t(has ? 'dev.keyOn' : 'dev.keyOff')) + '</div></div>' +
      (has ? '<button type="button" class="btn btn-ghost" id="dvKeyOff">' + SP.icon('log-out') + '<span>' + esc(SP.t('dev.keyRemove')) + '</span></button>' : '<button type="button" class="btn btn-primary" id="dvKey">' + SP.icon('key-round') + '<span>' + esc(SP.t('dev.keyAdd')) + '</span></button>') + '</div></section>';

    /* точки сохранения и откат */
    var last = SP.store.get(LAST, null);
    html += '<section class="card" id="dvPoints"><div class="card-head"><div><h2 class="card-title">' + SP.icon('save') + esc(SP.t('dev.points')) + '</h2><div class="card-sub">' + esc(SP.t('dev.pointsSub')) + '</div></div>' +
      '<div class="btn-group"><button type="button" class="btn" id="dvPoint"' + (has ? '' : ' disabled') + '>' + SP.icon('save') + '<span>' + esc(SP.t('dev.pointNew')) + '</span></button>' +
      (last ? '<button type="button" class="btn btn-ghost" id="dvUndo"' + (has ? '' : ' disabled') + '>' + SP.icon('undo-2') + '<span>' + esc(SP.t('dev.undo')) + '</span></button>' : '') + '</div></div>' +
      (has ? '' : '<p class="small subtle">' + esc(SP.t('dev.pointsNoKey')) + '</p>') +
      '<div id="dvPList">' + pointsHtml(has) + '</div></section>';
    return html;
  }
  function pointsHtml(has) {
    if (!points) return '<p class="small muted">' + esc(SP.t('dev.loading')) + '</p>';
    if (points.err) return '<p class="small subtle">' + esc(points.err) + '</p>';
    var btn = function (sha, label) { return '<button type="button" class="btn btn-sm btn-ghost" data-back="' + esc(sha) + '" data-lbl="' + esc(label) + '"' + (has ? '' : ' disabled') + '>' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('dev.back')) + '</span></button>'; };
    var tags = points.tags.map(function (t) {
      return '<div class="list-row dev-pt"><div class="list-row-main">' + SP.icon('save', 'subtle') + '<span class="meta"><b>' + esc(t.label) + '</b><small>' + esc(t.name + ' · ' + t.sha.slice(0, 7)) + '</small></span></div>' + btn(t.sha, t.label) + '</div>';
    }).join('');
    var com = points.commits.map(function (c) {
      return '<div class="list-row dev-pt"><div class="list-row-main">' + SP.icon('circle-dot', 'subtle') + '<span class="meta"><b>' + esc(c.msg) + '</b><small>' + esc(c.when + ' · ' + c.sha.slice(0, 7)) + '</small></span></div>' + btn(c.sha, c.when) + '</div>';
    }).join('');
    return '<div class="section-title">' + esc(SP.t('dev.tags', { n: MAX_POINTS })) + '</div>' + (tags ? '<div class="list">' + tags + '</div>' : '<p class="small subtle">—</p>') +
      '<details class="dev-det"><summary>' + esc(SP.t('dev.commits')) + '</summary>' + (com ? '<div class="list">' + com + '</div>' : '<p class="small subtle">—</p>') + '</details>';
  }
  function tagLabel(n) {
    var m = n.match(/^backup-(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})(\d{2}))?(?:\d{2})?(?:-(.+))?$/);
    return m ? m[3] + '.' + m[2] + '.' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') + (m[6] ? ' · ' + m[6].replace(/-/g, ' ') : '') : n;
  }
  function loadPoints() {
    var opt = token() ? { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' } } : { headers: { Accept: 'application/vnd.github+json' } };
    var get = function (p) { return fetch(API + p, opt).then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.json(); }); };
    Promise.all([get('/tags?per_page=50'), get('/commits?sha=' + GH.branch + '&per_page=10')]).then(function (r) {
      points = {
        tags: r[0].filter(function (t) { return /^backup-/.test(t.name); }).sort(function (a, b) { return a.name < b.name ? 1 : -1; }).map(function (t) { return { name: t.name, sha: t.commit.sha, label: tagLabel(t.name) }; }),
        commits: r[1].map(function (c) { return { sha: c.sha, msg: String(c.commit.message || '').split('\n')[0].slice(0, 120), when: SP.fmtDateTime ? SP.fmtDateTime(Date.parse(c.commit.author.date)) : c.commit.author.date }; })
      };
    }).catch(function (e) { points = { err: SP.t('dev.pointsErr') + ' (' + e.message + ')' }; }).then(function () {
      var box = root && SP.$('#dvPList', root); if (box) { box.innerHTML = pointsHtml(!!token()); wirePoints(); }
    });
  }

  /* ---------- Действия ---------- */
  function wire() {
    var $ = function (s) { return SP.$(s, root); }, on = function (id, fn) { var el = $(id); if (el) el.onclick = fn; };
    var subs = st ? subjects() : [];
    on('#dvReload', function () { reload(false); }); on('#dvFresh', function () { reload(true); });
    on('#dvReset', function () { SP.confirm({ title: SP.t('dev.reset'), text: SP.t('dev.resetText'), okLabel: SP.t('dev.reset'), danger: true }).then(function (ok) { if (ok) reload(true); }); });
    var g = $('#dvGroup'); if (g) g.onchange = function () { var v = g.value; var go = function () { SP.store.del(DRAFT); IDB.clear().catch(function () { }); st = null; render(); load(v).then(render); }; if (diff().n) SP.confirm({ title: SP.t('dev.group'), text: SP.t('dev.reloadText'), danger: true }).then(function (ok) { if (ok) go(); else g.value = st.dir; }); else go(); };
    on('#dvSubj', addSubject);
    /* файлы: перетащить внутри папки — порядок для всех; бросить на другую папку — перенести туда */
    if (st && tab === 'folders') SP.dragSort(SP.$('.dev-page', root), { item: '.list-row.dg-item', skip: '.btn', target: '.dev-subj[data-sk]',
      onSort: function (ids) {
        var moved = ids.map(function (i) { return st.files[+i]; }), slots = [];
        st.files.forEach(function (f, i) { if (moved.indexOf(f) >= 0) slots.push(i); });
        slots.forEach(function (p, k) { st.files[p] = moved[k]; });
        save(); render();
      },
      onDrop: function (tg, el) {
        var f = st.files[+el.getAttribute('data-dk')], to = subs[+tg.getAttribute('data-sk')];
        if (!f || !to || f.subject === to) return;
        f.subject = to; save(); render(); SP.toast(SP.t('subjects.movedTo', { name: f.name, to: to }), 'success');
      } });
    SP.$$('[data-add]', root).forEach(function (b) { b.onclick = function () { var s = subs[+b.getAttribute('data-s')], k = b.getAttribute('data-add'); if (k === 'link') editLink(null, s); else addFiles(s, k); }; });
    SP.$$('[data-dels]', root).forEach(function (b) { b.onclick = function () { delSubject(subs[+b.getAttribute('data-dels')]); }; });
    SP.$$('[data-edit]', root).forEach(function (b) { b.onclick = function () { var f = st.files[+b.getAttribute('data-edit')]; if (f.kind === 'link') editLink(f); else editFile(f); }; });
    SP.$$('[data-del]', root).forEach(function (b) { b.onclick = function () { var f = st.files[+b.getAttribute('data-del')]; st.files.splice(st.files.indexOf(f), 1); if (!f._o || f._edit) IDB.del('f:' + f.path).catch(function () { }); save(); render(); }; });
    SP.$$('[data-undel]', root).forEach(function (b) { b.onclick = function () { var o = diff().del[+b.getAttribute('data-undel')]; var c = clean(o); c._o = eid(o); st.files.push(c); save(); render(); }; });
    on('#dvPub', publish);
    on('#dvFloat', function () { var c = $('#dvChanges'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    on('#dvKey', keyDialog); on('#dvKeyOff', function () { SP.store.del(KEY); points = null; render(); SP.toast(SP.t('dev.keyRemoved'), 'success'); });
    on('#dvPoint', function () { savePoint(true); }); on('#dvUndo', undoLast);
    wirePoints();
  }
  function wirePoints() {
    SP.$$('[data-back]', root).forEach(function (b) { b.onclick = function () { restore(b.getAttribute('data-back'), b.getAttribute('data-lbl')); }; });
  }

  function subjectSelect(cur) {
    return '<select class="input" id="dvfS">' + subjects().map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>';
  }
  function addSubject() {
    var m = SP.modal({
      title: SP.t('dev.addSubject'),
      body: '<div class="stack"><div class="field"><label class="label" for="dvSN">' + esc(SP.t('dev.subjName')) + '</label><input class="input" id="dvSN"></div><p class="xsmall subtle">' + esc(SP.t('dev.subjHint')) + '</p></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
        var v = SP.$('#dvSN', m.el).value.trim(); if (!v) return false;
        if (subjects().indexOf(v) < 0) st.subs.push(v); save(); render();
      } }]
    });
  }
  function delSubject(name) {
    var n = st.files.filter(function (f) { return f.subject === name; }).length;
    SP.confirm({ title: SP.t('dev.delSubject'), text: SP.t('dev.delSubjectText', { s: name, n: n }), okLabel: SP.t('common.delete'), danger: true }).then(function (ok) {
      if (!ok) return;
      st.files = st.files.filter(function (f) { return f.subject !== name; });
      st.subs = st.subs.filter(function (s) { return s !== name; });
      save(); render();
    });
  }
  /* новые файлы: кладём в IndexedDB, в черновик — запись; файл с тем же путём заменяется */
  function addFiles(subject, kind) {
    var inp = SP.el('<input type="file" multiple hidden' + (kind === 'test' ? ' accept=".txt,.doc,.docx,.json"' : kind === 'cards' ? ' accept=".txt,.md,.docx"' : '') + '>'); document.body.appendChild(inp);
    inp.onchange = function () {
      var list = Array.prototype.slice.call(inp.files); inp.remove();
      Promise.all(list.map(function (file) {
        var p = pathFor(subject, file.name);
        return IDB.put('f:' + p, file).then(function () {
          var ex = st.files.filter(function (f) { return f.path === p; })[0];
          if (ex) { ex.size = file.size; if (ex._o) ex._edit = 1; }
          else st.files.push({ subject: subject, kind: kind, name: file.name, path: p, size: file.size });
        });
      })).then(function () { save(); render(); SP.toast(SP.t('dev.added', { n: list.length }), 'success'); })
        .catch(function (e) { SP.toast(SP.t('dev.idbErr') + ' ' + (e && e.message || ''), 'danger'); });
    };
    inp.click();
  }
  function editFile(f) {
    var m = SP.modal({
      title: f.name,
      body: '<div class="stack">' +
        '<div class="field"><label class="label" for="dvfN">' + esc(SP.t('dev.fName')) + '</label><input class="input" id="dvfN" value="' + esc(f.name) + '"><span class="hint">' + esc(SP.t('dev.fNameHint')) + '</span></div>' +
        '<div class="field"><label class="label" for="dvfK">' + esc(SP.t('dev.fKind')) + '</label><select class="input" id="dvfK"><option value="test"' + (f.kind === 'test' ? ' selected' : '') + '>' + esc(SP.t('dev.kind.test')) + '</option><option value="material"' + (f.kind !== 'test' && f.kind !== 'cards' ? ' selected' : '') + '>' + esc(SP.t('dev.kind.material')) + '</option><option value="cards"' + (f.kind === 'cards' ? ' selected' : '') + '>' + esc(SP.t('dev.kind.cards')) + '</option></select></div>' +
        '<div class="field"><label class="label" for="dvfS">' + esc(SP.t('dev.fSubject')) + '</label>' + subjectSelect(f.subject) + '</div>' +
        '<div class="btn-group">' + (isText(f) ? '<button type="button" class="btn" id="dvfT">' + SP.icon('file-text') + '<span>' + esc(SP.t('dev.editText')) + '</span></button>' : '') +
        '<button type="button" class="btn" id="dvfR">' + SP.icon('upload') + '<span>' + esc(SP.t('dev.replace')) + '</span></button></div>' +
        '<p class="xsmall subtle">' + esc(f.path) + '</p></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
        var n = SP.$('#dvfN', m.el).value.trim(); if (!n) return false;
        f.name = n; f.kind = SP.$('#dvfK', m.el).value; f.subject = SP.$('#dvfS', m.el).value;
        save(); render();
      } }]
    });
    var t = SP.$('#dvfT', m.el); if (t) t.onclick = function () { m.close(); editText(f); };
    SP.$('#dvfR', m.el).onclick = function () {
      var inp = SP.el('<input type="file" hidden>'); document.body.appendChild(inp);
      inp.onchange = function () { var file = inp.files[0]; inp.remove(); if (!file) return; IDB.put('f:' + f.path, file).then(function () { f.size = file.size; if (f._o) f._edit = 1; save(); m.close(); render(); SP.toast(SP.t('dev.replaced'), 'success'); }); };
      inp.click();
    };
  }
  /* содержимое файла: из черновика (IndexedDB) или с сайта */
  function blobOf(f) {
    return IDB.get('f:' + f.path).catch(function () { return null; }).then(function (b) {
      if (b) return b;
      return fetch(encodeURI(f.path) + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(SP.t('dev.noFile')); return r.blob(); });
    });
  }
  function editText(f) {
    var m = SP.modal({
      title: f.name, size: 'lg',
      body: '<div class="stack-sm"><textarea class="input dev-text" id="dvTx" spellcheck="false">' + esc(SP.t('dev.loading')) + '</textarea><p class="xsmall subtle">' + esc(SP.t('dev.textHint')) + '</p></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
        var b = new Blob([SP.$('#dvTx', m.el).value], { type: 'text/plain;charset=utf-8' });
        IDB.put('f:' + f.path, b).then(function () { f.size = b.size; if (f._o) f._edit = 1; save(); render(); SP.toast(SP.t('settings.saved'), 'success'); });
      } }]
    });
    var tx = SP.$('#dvTx', m.el); tx.disabled = true;
    blobOf(f).then(function (b) { return b.text(); }).then(function (t) { tx.value = t; tx.disabled = false; })
      .catch(function (e) { tx.value = e.message; });
  }
  function editLink(f, subject) {
    var x = f || { subject: subject, kind: 'link', name: '', url: '', note: '' };
    var m = SP.modal({
      title: f ? f.name : SP.t('dev.addLink'),
      body: '<div class="stack">' +
        '<div class="field"><label class="label" for="dvlN">' + esc(SP.t('dev.fName')) + '</label><input class="input" id="dvlN" value="' + esc(x.name) + '"></div>' +
        '<div class="field"><label class="label" for="dvlU">URL</label><input class="input" id="dvlU" type="url" value="' + esc(x.url) + '" placeholder="https://"></div>' +
        '<div class="field"><label class="label" for="dvlD">' + esc(SP.t('dev.note')) + '</label><input class="input" id="dvlD" value="' + esc(x.note || '') + '"></div>' +
        '<div class="field"><label class="label" for="dvfS">' + esc(SP.t('dev.fSubject')) + '</label>' + subjectSelect(x.subject) + '</div></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
        var u = SP.$('#dvlU', m.el).value.trim(); if (!/^https?:\/\/\S+$/i.test(u)) { SP.$('#dvlU', m.el).focus(); return false; }
        x.url = u; x.name = SP.$('#dvlN', m.el).value.trim() || u; x.note = SP.$('#dvlD', m.el).value.trim(); x.subject = SP.$('#dvfS', m.el).value;
        if (!f) st.files.push(x); save(); render();
      } }]
    });
  }

  /* загружено на GitHub: новое состояние становится исходным */
  function commitLocal(ver) {
    st.ver = ver || nextVersion();
    st.orig = st.files.map(clean); st.files = st.orig.map(function (f) { var c = clean(f); c._o = eid(f); return c; });
    st.origInc = JSON.parse(JSON.stringify(st.inc || [])); st.subs = []; st.stale = false; SP.store.del(DRAFT); IDB.clear().catch(function () { }); render();
  }

  /* ---------- Путь Б: GitHub API ---------- */
  function gh(method, path, body) {
    return fetch(API + path, { method: method, cache: 'no-store', headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = {}; }
          if (!r.ok) { var e = new Error(r.status === 401 ? SP.t('dev.e401') : r.status === 403 || r.status === 404 ? SP.t('dev.e403') : (j.message || 'GitHub') + ' (' + r.status + ')'); e.status = r.status; throw e; }
          return j;
        });
      });
  }
  function b64(blob) { return SP.readAsDataURL(blob).then(function (u) { return u.slice(u.indexOf(',') + 1); }); }
  var head = function () { return gh('GET', '/git/ref/heads/' + GH.branch).then(function (r) { return r.object.sha; }); };
  /* новая точка сохранения; после неё лишние старые точки (больше MAX_POINTS) удаляются */
  function tagAt(sha, name) {
    return gh('POST', '/git/refs', { ref: 'refs/tags/' + (name || 'backup-' + stamp()), sha: sha }).then(function (r) {
      return gh('GET', '/git/matching-refs/tags/backup-').then(function (list) {
        var old = (list || []).map(function (x) { return x.ref.replace('refs/tags/', ''); }).sort().reverse().slice(MAX_POINTS);
        return old.reduce(function (p, n) { return p.then(function () { return gh('DELETE', '/git/refs/tags/' + n).catch(function () { }); }); }, Promise.resolve());
      }).catch(function () { }).then(function () { return r; });
    });
  }
  /* записать на GitHub несколько текстовых файлов одним коммитом (перед этим — точка сохранения).
     list: [{ path: 'data/ir-252/schedule.json', content: '…' }] */
  /* o.noTag — без точки сохранения (мелочь вроде домашки, чтобы не вытеснять настоящие точки) */
  /* list: { path, content } — текст; { path, blob } — файл (например фото к домашке); { path, del: true } — удалить файл */
  function commitFiles(list, msg, o) {
    var h;
    return head().then(function (sha) { h = sha; return o && o.noTag ? null : tagAt(h); })
      .then(function () { return gh('GET', '/git/commits/' + h); })
      .then(function (c) {
        return Promise.all(list.map(function (x) {
          if (x.blob) return b64(x.blob).then(function (c64) { return gh('POST', '/git/blobs', { content: c64, encoding: 'base64' }); }).then(function (b) { return { path: x.path, mode: '100644', type: 'blob', sha: b.sha }; });
          if (x.del) return { path: x.path, mode: '100644', type: 'blob', sha: null };
          return { path: x.path, mode: '100644', type: 'blob', content: x.content };
        })).then(function (tree) { return gh('POST', '/git/trees', { base_tree: c.tree.sha, tree: tree }); });
      })
      .then(function (t) { return moveTo(h, t.sha, msg); })
      .then(function (sha) { SP.store.set(LAST, { sha: sha, parent: h, at: Date.now() }); points = null; return sha; });
  }
  function moveTo(parent, tree, msg) {
    return gh('POST', '/git/commits', { message: msg, tree: tree, parents: [parent] }).then(function (c) {
      return gh('PATCH', '/git/refs/heads/' + GH.branch, { sha: c.sha }).then(function () { return c.sha; });
    });
  }
  function progress(btn, text) { if (btn) { var s = btn.querySelector('span'); if (s) s.textContent = text; } }

  function publish() {
    var d = diff(); if (!d.n || busy) return;
    SP.confirm({ title: SP.t('dev.publish'), text: SP.t('dev.pubText', { a: d.add.length, d: d.del.length, m: d.mod.length }), okLabel: SP.t('dev.publish'), icon: 'upload' }).then(function (ok) {
      if (!ok) return;
      var btn = SP.$('#dvPub', root), up = uploads(), rm = removals(d), h, ver = nextVersion();
      busy = true; SP.busy(btn, true); progress(btn, SP.t('dev.p.check'));
      head().then(function (sha) {
        h = sha;
        /* на GitHub manifest не менялся с начала правок? */
        return gh('GET', '/contents/' + encodeURI('data/' + st.dir + '/manifest.json') + '?ref=' + h).then(function (j) {
          var cur = JSON.parse(decodeURIComponent(escape(atob(String(j.content || '').replace(/\s/g, '')))));
          if (JSON.stringify((cur.files || []).map(clean)) !== JSON.stringify(st.orig)) throw new Error(SP.t('dev.e409'));
        }, function (e) { if (e.status !== 404) throw e; });
      }).then(function () {
        progress(btn, SP.t('dev.p.point'));
        return tagAt(h);
      }).then(function () { return gh('GET', '/git/commits/' + h); }).then(function (c) {
        var tree = [], i = 0;
        return up.reduce(function (p, f) {
          return p.then(function () {
            progress(btn, SP.t('dev.p.file', { i: ++i, n: up.length }));
            return blobOf(f).then(b64).then(function (c64) { return gh('POST', '/git/blobs', { content: c64, encoding: 'base64' }); })
              .then(function (b) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha }); });
          });
        }, Promise.resolve()).then(function () {
          progress(btn, SP.t('dev.p.commit'));
          tree.push({ path: 'data/' + st.dir + '/manifest.json', mode: '100644', type: 'blob', content: manifestText(ver) });
          var withDel = tree.concat(rm.map(function (p) { return { path: p, mode: '100644', type: 'blob', sha: null }; }));
          /* стираемого файла уже нет в репозитории — тогда без удаления */
          return gh('POST', '/git/trees', { base_tree: c.tree.sha, tree: withDel }).catch(function (e) { if (!rm.length) throw e; return gh('POST', '/git/trees', { base_tree: c.tree.sha, tree: tree }); });
        });
      }).then(function (t) {
        return moveTo(h, t.sha, SP.t('dev.msg', { s: SP.t('dev.sum', { a: d.add.length, d: d.del.length, m: d.mod.length }) }));
      }).then(function (sha) {
        SP.store.set(LAST, { sha: sha, parent: h, at: Date.now() });
        commitLocal(ver); points = null; render();
        SP.toast(SP.t('dev.published'), 'success', { ms: 9000 });
      }).catch(function (e) { SP.toast(e.message, 'danger', { ms: 10000 }); }).then(function () { busy = false; var b = SP.$('#dvPub', root); if (b) { SP.busy(b, false); progress(b, SP.t('dev.publish')); } });
    });
  }
  function savePoint(manual) {
    var btn = SP.$('#dvPoint', root); SP.busy(btn, true);
    head().then(function (h) { return tagAt(h); }).then(function () { points = null; render(); if (manual) SP.toast(SP.t('dev.pointDone'), 'success'); })
      .catch(function (e) { SP.toast(e.message, 'danger'); SP.busy(btn, false); });
  }
  /* вернуть весь сайт к состоянию коммита sha: новый коммит с тем же содержимым (историю не стираем) */
  function restore(sha, label, text) {
    SP.confirm({ title: SP.t('dev.back'), text: text || SP.t('dev.backText', { p: label }), okLabel: SP.t('dev.back'), danger: true, icon: 'rotate-ccw' }).then(function (ok) {
      if (!ok || busy) return;
      busy = true; var h;
      head().then(function (x) { h = x; if (h === sha) throw new Error(SP.t('dev.backSame')); return tagAt(h); })
        .then(function () { return gh('GET', '/git/commits/' + sha); })
        .then(function (c) { return moveTo(h, c.tree.sha, SP.t('dev.backMsg', { p: label })); })
        .then(function () { SP.store.del(LAST); points = null; SP.toast(SP.t('dev.backDone'), 'success', { ms: 9000 }); reload(true); })
        .catch(function (e) { SP.toast(e.message, 'danger', { ms: 9000 }); }).then(function () { busy = false; });
    });
  }
  function undoLast() {
    var last = SP.store.get(LAST, null); if (!last) return;
    head().then(function (h) {
      restore(last.parent, SP.t('dev.beforeLast'), h === last.sha ? SP.t('dev.undoText') : SP.t('dev.undoWarn'));
    }).catch(function (e) { SP.toast(e.message, 'danger'); });
  }

  /* ключ GitHub: создаёт и вставляет сам автор; храним только в этом браузере */
  function keyDialog() {
    var m = SP.modal({
      title: SP.t('dev.keyAdd'), size: 'lg',
      body: '<ol class="dev-steps">' + SP.t('dev.k.steps', { url: 'https://github.com/settings/tokens/new?description=StudyPlay&scopes=public_repo', inv: GH_WEB + '/invitations', repo: GH.repo }) + '</ol>' +
        '<div class="field"><label class="label" for="dvK">' + esc(SP.t('dev.k.paste')) + '</label><input class="input" id="dvK" type="password" autocomplete="off" spellcheck="false" placeholder="ghp_…"><span class="error-text" id="dvKE" role="alert"></span></div>' +
        '<div class="alert alert-warning">' + SP.icon('shield-check') + '<div class="alert-body">' + esc(SP.t('dev.k.warn')) + '</div></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('dev.k.check'), kind: 'primary', icon: 'check', close: false, onClick: function (api, b) {
        var v = SP.$('#dvK', m.el).value.trim(), er = SP.$('#dvKE', m.el); er.textContent = '';
        if (!v) return false;
        SP.busy(b, true);
        fetch(API, { headers: { Authorization: 'Bearer ' + v, Accept: 'application/vnd.github+json' } }).then(function (r) {
          if (r.status === 401) throw new Error(SP.t('dev.e401'));
          if (!r.ok) throw new Error(SP.t('dev.e403'));
          return r.json();
        }).then(function (j) {
          if (j.permissions && j.permissions.push === false) throw new Error(SP.t('dev.e403'));
          SP.store.set(KEY, v); points = null; api.close(); render(); SP.toast(SP.t('dev.keySaved'), 'success');
        }).catch(function (e) { er.textContent = e.message; SP.busy(b, false); });
        return false;
      } }]
    });
  }

  /* ---------- Вкладки ---------- */
  function wireTabs() {
    SP.$$('[data-dtab]', root).forEach(function (b) {
      b.onclick = function () { tab = b.getAttribute('data-dtab'); try { sessionStorage.setItem('sp-dev-tab', tab); } catch (e) { } render(); };
    });
  }
  function openTab(t) { tab = t; try { sessionStorage.setItem('sp-dev-tab', t); } catch (e) { } render(); window.scrollTo(0, 0); }

  /* ---------- Вкладка «Помощь»: как всё устроено + промпты для ИИ ---------- */
  var HELP = [['tests', 'list-checks'], ['cards', 'layers'], ['groups', 'users'], ['schedule', 'calendar-days'], ['publish', 'upload'], ['team', 'code']];
  function helpHtml() {
    var row = function (t, h, ctl) { return '<div class="set-row"><div class="set-text"><div class="strong small">' + esc(t) + '</div><div class="xsmall subtle">' + esc(h) + '</div></div><div class="set-ctl">' + ctl + '</div></div>'; };
    var b = function (id, ic, label, kind) { return '<button type="button" class="btn' + (kind ? ' ' + kind : '') + '" id="' + id + '">' + SP.icon(ic) + '<span>' + esc(label) + '</span></button>'; };
    return '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('book-open') + esc(SP.t('dev.h.title')) + '</h2><div class="card-sub">' + esc(SP.t('dev.h.sub')) + '</div></div></div>' +
      '<div class="dev-help">' + HELP.map(function (x) {
        return '<button type="button" class="ui2-ch" data-help="' + x[0] + '"><span class="ph-ic">' + SP.icon(x[1]) + '</span><span><b>' + esc(SP.t('dev.h.' + x[0])) + '</b><small>' + esc(SP.t('dev.h.' + x[0] + 'Sub')) + '</small></span></button>';
      }).join('') + '</div></section>' +
      '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('sparkles') + esc(SP.t('dev.h.ai')) + '</h2><div class="card-sub">' + esc(SP.t('dev.h.aiSub')) + '</div></div></div><div class="stack">' +
      row(SP.t('dev.h.aiTests'), SP.t('dev.h.aiTestsHint'), '<div class="btn-group">' + b('dvhPT', 'copy', SP.t('common.copy'), 'btn-primary') + b('dvhPD', 'download', '.docx') + '</div>') +
      row(SP.t('dev.h.aiCards'), SP.t('dev.h.aiCardsHint'), '<div class="btn-group">' + b('dvhPC', 'copy', SP.t('common.copy'), 'btn-primary') + b('dvhCE', 'download', SP.t('dev.h.example')) + '</div>') +
      row(SP.t('designer.title'), SP.t('settings.designerHint'), '<a class="btn" href="#/designer">' + SP.icon('square-pen') + '<span>' + esc(SP.t('common.open')) + '</span></a>') +
      '</div></section>';
  }
  function wireHelp(box) {
    SP.$$('[data-help]', box).forEach(function (x) {
      x.onclick = function () { var k = x.getAttribute('data-help'); SP.modal({ title: SP.t('dev.h.' + k), size: 'lg', body: '<div class="dev-guide">' + SP.t('dev.h.' + k + 'Html', { repo: GH_WEB }) + '</div>', actions: [{ label: SP.t('common.understood'), kind: 'primary' }] }); };
    });
    var copy = function (t) { SP.copyText(t || '').then(function () { SP.toast(SP.t('common.copied'), 'success'); }); };
    var on = function (id, fn) { var el = SP.$(id, box); if (el) el.onclick = fn; };
    on('#dvhPT', function () { copy(SP.PROMPT_TEXT); }); on('#dvhPD', SP.tester.downloadPrompt);
    on('#dvhPC', function () { copy(SP.CARDS_PROMPT); });
    on('#dvhCE', function () { SP.downloadText(SP.t('dev.h.cardsExample'), 'Пример — карточки.txt'); });
  }

  /* общее для вкладок «Группы» и «Расписание» (dev-groups.js, dev-schedule.js) */
  var core = {
    gh: gh, token: token, hasKey: function () { return !!token(); }, getJson: getJson, remoteFile: remoteFile, commitFiles: commitFiles,
    groups: function () { return groups; }, setGroups: function (g) { groups = g; }, groupDir: function () { return groupDir(); },
    stamp: stamp, render: function () { render(); }, openTab: openTab, repo: GH_WEB,
    /* для «Общих предметов» в папках: текущий черновик группы */
    draft: function () { return st; }, saveDraft: function () { save(); render(); },
    nextVersion: function (v) { var t = new Date().toISOString().slice(0, 10), m = String(v || '').match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/); return m && m[1] === t ? t + '.' + (+m[2] + 1) : t + '.1'; },
    /* открыть папки нужной группы (с вкладки «Группы») */
    showGroup: function (dir) {
      var go = function () { tab = 'folders'; try { sessionStorage.setItem('sp-dev-tab', tab); } catch (e) { } if (st && st.dir === dir) { render(); return; } SP.store.del(DRAFT); IDB.clear().catch(function () { }); st = null; render(); load(dir).then(render); };
      if (st && st.dir !== dir && diff().n) SP.confirm({ title: SP.t('dev.group'), text: SP.t('dev.reloadText'), danger: true }).then(function (ok) { if (ok) go(); }); else go();
    }
  };

  /* «Домашка» (homework.js) публикует задание для группы через этот же ключ GitHub */
  SP.devCore = core;

  function mount(el) {
    root = el; render();
    getJson('data/groups.json').then(function (g) { groups = g && Array.isArray(g.groups) ? g.groups.filter(function (x) { return x.folder; }) : []; })
      .then(function () { return load(groupDir()); }).then(render);
  }
  SP.views.register('dev', { titleKey: 'dev.title', mount: mount, show: function () { if (st) render(); }, refresh: render });
})();

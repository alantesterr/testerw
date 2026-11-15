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
  function save() { SP.store.set(DRAFT, { dir: st.dir, ver: st.ver, orig: st.orig, files: st.files, subs: st.subs }); }
  function fresh(dir, man, sched) {
    var files = (man && Array.isArray(man.files) ? man.files : []).filter(function (f) { return f && f.name; });
    return { dir: dir, ver: String((man && man.version) || ''), orig: files.map(clean), files: files.map(function (f) { var c = clean(f); c._o = eid(f); return c; }), subs: [], sched: sched };
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
    return { add: add, mod: mod, del: del, n: add.length + mod.length + del.length };
  }
  /* файлы, которые надо положить в репозиторий (новые и с новым содержимым) */
  function uploads() { return st.files.filter(function (f) { return f.kind !== 'link' && f.path && (!f._o || f._edit); }); }
  /* файлы, которые больше нигде не упоминаются, — их можно стереть из репозитория */
  function removals(d) {
    var used = {}; st.files.forEach(function (f) { if (f.path) used[f.path] = 1; });
    return d.del.filter(function (o) { return o.path && !used[o.path] && o.path.indexOf('data/' + st.dir + '/') === 0; }).map(function (o) { return o.path; });
  }
  function manifestText() { return JSON.stringify({ version: nextVersion(), files: st.files.map(clean) }, null, 2) + '\n'; }

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
        var keep = { dir: dir, ver: dr.ver, orig: dr.orig || [], files: dr.files, subs: dr.subs || [], sched: f.sched };
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
  function kindLabel(f) { return SP.t('dev.kind.' + (f.kind === 'link' || (!f.path && f.url) ? 'link' : f.kind === 'test' ? 'test' : 'material')); }

  function rowHtml(f, i, d) {
    var s = stateOf(f, d), link = f.kind === 'link';
    var meta = kindLabel(f) + (link ? ' · ' + f.url : f.size ? ' · ' + SP.formatSize(f.size) : '');
    return '<div class="list-row dev-row' + (s ? ' dev-' + s : '') + '"><div class="list-row-main">' + SP.fileIcon(f.name, '', link) +
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
      return '<section class="card dev-subj"><div class="card-head"><div><h2 class="card-title">' + SP.icon('folder') + esc(name) + '</h2><div class="card-sub">' + esc(SP.t('dev.count', { n: n })) + '</div></div>' +
        '<div class="btn-group">' +
        '<button type="button" class="btn btn-sm" data-add="test" data-s="' + k + '">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.addTest')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-add="material" data-s="' + k + '">' + SP.icon('plus', 'ic-sm') + '<span>' + esc(SP.t('dev.addMat')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-add="link" data-s="' + k + '">' + SP.icon('link', 'ic-sm') + '<span>' + esc(SP.t('dev.addLink')) + '</span></button>' +
        (n || st.subs.indexOf(name) >= 0 ? '<button type="button" class="btn btn-sm btn-ghost" data-dels="' + k + '" aria-label="' + esc(SP.t('dev.delSubject')) + '" data-tip="' + esc(SP.t('dev.delSubject')) + '">' + SP.icon('trash-2', 'ic-sm') + '</button>' : '') +
        '</div></div>' + (rows ? '<div class="list">' + rows + '</div>' : '<p class="small subtle">' + esc(SP.t('dev.empty')) + '</p>') + '</section>';
    }).join('');

    /* изменения и две кнопки */
    var chg = d.add.map(function (f) { return '<li class="dev-c-new">+ ' + esc(f.subject + ' / ' + f.name) + '</li>'; }).join('') +
      d.mod.map(function (f) { return '<li class="dev-c-mod">✎ ' + esc(f.subject + ' / ' + f.name) + '</li>'; }).join('') +
      d.del.map(function (f) { return '<li class="dev-c-del">− ' + esc(f.subject + ' / ' + f.name) + '</li>'; }).join('');
    html += '<section class="card dev-changes' + (d.n ? ' has' : '') + '" id="dvChanges"><div class="card-head"><div><h2 class="card-title">' + SP.icon('layers') + esc(SP.t('dev.changes')) + '</h2>' +
      '<div class="card-sub">' + esc(d.n ? SP.t('dev.sum', { a: d.add.length, d: d.del.length, m: d.mod.length }) : SP.t('dev.noChanges')) + '</div></div>' +
      (d.n ? '<button type="button" class="btn btn-ghost btn-sm" id="dvReset">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('dev.reset')) + '</span></button>' : '') + '</div>' +
      (d.n ? '<ul class="dev-clist">' + chg + '</ul>' : '') +
      '<div class="dev-ways">' +
      '<div class="dev-way"><b>' + esc(SP.t('dev.wayA')) + '</b><small>' + esc(SP.t('dev.wayAText')) + '</small><button type="button" class="btn" id="dvZip"' + (d.n ? '' : ' disabled') + '>' + SP.icon('download') + '<span>' + esc(SP.t('dev.zip')) + '</span></button></div>' +
      '<div class="dev-way"><b>' + esc(SP.t('dev.wayB')) + '</b><small>' + esc(SP.t(has ? 'dev.wayBText' : 'dev.wayBNoKey')) + '</small><button type="button" class="btn btn-primary" id="dvPub"' + (d.n && has ? '' : ' disabled') + '>' + SP.icon('upload') + '<span>' + esc(SP.t('dev.publish')) + '</span></button></div>' +
      '</div></section>' + folders;
    if (d.n) html += '<button type="button" class="dev-float" id="dvFloat">' + SP.icon('layers', 'ic-sm') + '<span>' + esc(SP.t('dev.sum', { a: d.add.length, d: d.del.length, m: d.mod.length })) + '</span>' + SP.icon('arrow-up', 'ic-sm') + '</button>';

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

    root.innerHTML = '<div class="page dev-page">' + html + '</div>';
    wire();
    if (!points) loadPoints();
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
    return '<div class="section-title">' + esc(SP.t('dev.tags')) + '</div>' + (tags ? '<div class="list">' + tags + '</div>' : '<p class="small subtle">—</p>') +
      '<div class="section-title">' + esc(SP.t('dev.commits')) + '</div>' + (com ? '<div class="list">' + com + '</div>' : '<p class="small subtle">—</p>');
  }
  function tagLabel(n) {
    var m = n.match(/^backup-(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})(\d{2}))?/);
    return m ? m[3] + '.' + m[2] + '.' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : n;
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
    var subs = subjects();
    on('#dvReload', function () { reload(false); }); on('#dvFresh', function () { reload(true); });
    on('#dvReset', function () { SP.confirm({ title: SP.t('dev.reset'), text: SP.t('dev.resetText'), okLabel: SP.t('dev.reset'), danger: true }).then(function (ok) { if (ok) reload(true); }); });
    var g = $('#dvGroup'); if (g) g.onchange = function () { var v = g.value; var go = function () { SP.store.del(DRAFT); IDB.clear().catch(function () { }); st = null; render(); load(v).then(render); }; if (diff().n) SP.confirm({ title: SP.t('dev.group'), text: SP.t('dev.reloadText'), danger: true }).then(function (ok) { if (ok) go(); else g.value = st.dir; }); else go(); };
    on('#dvSubj', addSubject);
    SP.$$('[data-add]', root).forEach(function (b) { b.onclick = function () { var s = subs[+b.getAttribute('data-s')], k = b.getAttribute('data-add'); if (k === 'link') editLink(null, s); else addFiles(s, k); }; });
    SP.$$('[data-dels]', root).forEach(function (b) { b.onclick = function () { delSubject(subs[+b.getAttribute('data-dels')]); }; });
    SP.$$('[data-edit]', root).forEach(function (b) { b.onclick = function () { var f = st.files[+b.getAttribute('data-edit')]; if (f.kind === 'link') editLink(f); else editFile(f); }; });
    SP.$$('[data-del]', root).forEach(function (b) { b.onclick = function () { var f = st.files[+b.getAttribute('data-del')]; st.files.splice(st.files.indexOf(f), 1); if (!f._o || f._edit) IDB.del('f:' + f.path).catch(function () { }); save(); render(); }; });
    SP.$$('[data-undel]', root).forEach(function (b) { b.onclick = function () { var o = diff().del[+b.getAttribute('data-undel')]; var c = clean(o); c._o = eid(o); st.files.push(c); save(); render(); }; });
    on('#dvZip', exportZip); on('#dvPub', publish);
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
    var inp = SP.el('<input type="file" multiple hidden' + (kind === 'test' ? ' accept=".txt,.doc,.docx,.json"' : '') + '>'); document.body.appendChild(inp);
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
        '<div class="field"><label class="label" for="dvfK">' + esc(SP.t('dev.fKind')) + '</label><select class="input" id="dvfK"><option value="test"' + (f.kind === 'test' ? ' selected' : '') + '>' + esc(SP.t('dev.kind.test')) + '</option><option value="material"' + (f.kind !== 'test' ? ' selected' : '') + '>' + esc(SP.t('dev.kind.material')) + '</option></select></div>' +
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

  /* ---------- Путь А: архив + инструкция ---------- */
  function exportZip() {
    if (!window.JSZip) { SP.toast(SP.t('tester.err.noDocxLib'), 'danger'); return; }
    var d = diff(), up = uploads(), rm = removals(d), z = new window.JSZip(), btn = SP.$('#dvZip', root);
    SP.busy(btn, true);
    z.file('data/' + st.dir + '/manifest.json', manifestText());
    Promise.all(up.map(function (f) { return blobOf(f).then(function (b) { z.file(f.path, b); }); })).then(function () {
      z.file('ИНСТРУКЦИЯ.txt', instrText(up, rm));
      return z.generateAsync({ type: 'blob' });
    }).then(function (blob) {
      SP.download(blob, 'studyplay-izmeneniya-' + stamp() + '.zip');
      instrDialog(up, rm);
    }).catch(function (e) { SP.toast(e.message, 'danger'); }).then(function () { SP.busy(btn, false); });
  }
  var delUrl = function (p) { return GH_WEB + '/delete/' + GH.branch + '/' + p.split('/').map(encodeURIComponent).join('/'); };
  function instrText(up, rm) {
    var L = [SP.t('dev.i.title'), '', '1. ' + SP.t('dev.i.1'), '2. ' + SP.t('dev.i.2') + ' ' + GH_WEB, '3. ' + SP.t('dev.i.3'), '4. ' + SP.t('dev.i.4'), '5. ' + SP.t('dev.i.5'), '6. ' + SP.t('dev.i.6'), ''];
    L.push(SP.t('dev.i.files') + ':'); L.push('  data/' + st.dir + '/manifest.json'); up.forEach(function (f) { L.push('  ' + f.path); });
    if (rm.length) { L.push('', SP.t('dev.i.del')); rm.forEach(function (p) { L.push('  ' + p + '\n    ' + delUrl(p)); }); }
    L.push('', SP.t('dev.i.back'));
    return L.join('\r\n');
  }
  function instrDialog(up, rm) {
    var m = SP.modal({
      title: SP.t('dev.i.title'), size: 'lg',
      body: '<ol class="dev-steps">' +
        '<li>' + esc(SP.t('dev.i.1')) + '</li>' +
        '<li>' + esc(SP.t('dev.i.2')) + ' <a href="' + GH_WEB + '" target="_blank" rel="noopener">' + esc(GH.owner + '/' + GH.repo) + ' ' + SP.icon('external-link', 'ic-sm') + '</a></li>' +
        '<li>' + esc(SP.t('dev.i.3')) + '</li><li>' + esc(SP.t('dev.i.4')) + '</li><li>' + esc(SP.t('dev.i.5')) + '</li><li>' + esc(SP.t('dev.i.6')) + '</li></ol>' +
        '<details class="dev-det"><summary>' + esc(SP.t('dev.i.files')) + ' (' + (up.length + 1) + ')</summary><ul class="dev-clist"><li>data/' + esc(st.dir) + '/manifest.json</li>' + up.map(function (f) { return '<li>' + esc(f.path) + '</li>'; }).join('') + '</ul></details>' +
        (rm.length ? '<div class="stack-sm"><p class="small"><b>' + esc(SP.t('dev.i.del')) + '</b></p><ul class="dev-clist">' + rm.map(function (p) { return '<li><a href="' + esc(delUrl(p)) + '" target="_blank" rel="noopener">' + SP.icon('trash-2', 'ic-sm') + ' ' + esc(p.split('/').pop()) + '</a></li>'; }).join('') + '</ul></div>' : '') +
        '<p class="xsmall subtle">' + esc(SP.t('dev.i.back')) + '</p>',
      actions: [{ label: SP.t('common.close') }, { label: SP.t('dev.i.done'), kind: 'primary', icon: 'check', onClick: function () { commitLocal(); } }]
    });
  }
  /* загружено на GitHub: новое состояние становится исходным */
  function commitLocal(ver) {
    st.ver = ver || nextVersion();
    st.orig = st.files.map(clean); st.files = st.orig.map(function (f) { var c = clean(f); c._o = eid(f); return c; });
    st.subs = []; st.stale = false; SP.store.del(DRAFT); IDB.clear().catch(function () { }); render();
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
  function tagAt(sha, name) { return gh('POST', '/git/refs', { ref: 'refs/tags/' + (name || 'backup-' + stamp()), sha: sha }); }
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
          tree.push({ path: 'data/' + st.dir + '/manifest.json', mode: '100644', type: 'blob', content: JSON.stringify({ version: ver, files: st.files.map(clean) }, null, 2) + '\n' });
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
      body: '<ol class="dev-steps">' + SP.t('dev.k.steps', { url: 'https://github.com/settings/personal-access-tokens/new', repo: GH.repo }) + '</ol>' +
        '<div class="field"><label class="label" for="dvK">' + esc(SP.t('dev.k.paste')) + '</label><input class="input" id="dvK" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"><span class="error-text" id="dvKE" role="alert"></span></div>' +
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

  function mount(el) {
    root = el; render();
    getJson('data/groups.json').then(function (g) { groups = g && Array.isArray(g.groups) ? g.groups.filter(function (x) { return x.folder; }) : []; })
      .then(function () { return load(groupDir()); }).then(render);
  }
  SP.views.register('dev', { titleKey: 'dev.title', mount: mount, show: function () { if (st) render(); }, refresh: render });
})();

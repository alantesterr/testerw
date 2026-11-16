/* =====================================================================
   РАЗРАБОТЧИК → вкладка «Группы» и карточка «Общие предметы» в «Папках».

   Группы сайта — файл data/groups.json:
     { "groups": [ { "name": "ИР-252", "folder": "ir-252" }, … ] }
   У каждой группы своя папка data/<folder>/ :
     schedule.json — расписание группы (вкладка «Расписание»),
     manifest.json — файлы папок предметов (вкладка «Папки»),
     files/        — сами файлы.

   Общие предметы: одна база тестов на несколько групп без копирования.
   В manifest.json группы пишется
     "include": [ { "from": "ir-252", "subjects": ["Философия", "Экзамен"] } ]
   и группа видит файлы этих предметов из папки ir-252 (см. withInclude в hub.js).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var gl = null, dirty = false, newMan = {}, mans = {};

  function list(core) { if (!gl) gl = core.groups().map(function (g) { return Object.assign({}, g); }); return gl; }
  /* предметы группы: только её собственные файлы (не подключённые) */
  function subjectsOf(core, folder) {
    if (mans[folder]) return Promise.resolve(mans[folder]);
    return core.getJson('data/' + folder + '/manifest.json?t=' + Date.now()).then(function (m) {
      var out = [];
      ((m && m.files) || []).forEach(function (f) { if (f && f.subject && out.indexOf(f.subject) < 0) out.push(f.subject); });
      mans[folder] = out; return out;
    });
  }

  /* ---------- Вкладка «Группы» ---------- */
  function mount(box, core) {
    var g = list(core), has = core.hasKey();
    box.innerHTML = '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body"><span>' + SP.t('dev.g.how') + '</span></div></div>' +
      '<section class="card"><div class="card-head"><div><h2 class="card-title">' + SP.icon('users') + esc(SP.t('dev.g.title')) + '</h2><div class="card-sub">' + esc(SP.t('dev.g.sub', { n: g.length })) + '</div></div>' +
      '<button type="button" class="btn btn-primary" id="dgAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('dev.g.add')) + '</span></button></div>' +
      '<div class="list">' + g.map(function (x, i) {
        return '<div class="list-row dev-row"><div class="list-row-main">' + SP.icon('users', 'subtle') + '<span class="meta"><b>' + esc(x.name) + '</b><small>data/' + esc(x.folder) + '/' + (newMan[x.folder] ? ' · ' + esc(SP.t('dev.st.new')) : '') + '</small></span></div>' +
          '<div class="dev-acts">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-gf="' + i + '">' + SP.icon('folder', 'ic-sm') + '<span>' + esc(SP.t('dev.tab.folders')) + '</span></button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-gs="' + i + '">' + SP.icon('calendar-days', 'ic-sm') + '<span>' + esc(SP.t('dev.tab.schedule')) + '</span></button>' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-gr="' + i + '" aria-label="' + esc(SP.t('dev.g.rename')) + '" data-tip="' + esc(SP.t('dev.g.rename')) + '">' + SP.icon('pencil') + '</button>' +
          (g.length > 1 ? '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-gd="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '" data-tip="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button>' : '') +
          '</div></div>';
      }).join('') + '</div></section>' +
      '<section class="card dev-changes' + (dirty ? ' has' : '') + '"><div class="card-head"><div><h2 class="card-title">' + SP.icon('upload') + esc(SP.t('dev.g.save')) + '</h2>' +
      '<div class="card-sub">' + esc(dirty ? SP.t('dev.g.dirty') : SP.t('dev.noChanges')) + '</div></div></div>' +
      '<div class="dev-ways"><div class="dev-way"><b>' + esc(SP.t('dev.wayB')) + '</b><small>' + esc(SP.t(has ? 'dev.g.pubText' : 'dev.wayBNoKey')) + '</small>' +
      '<button type="button" class="btn btn-primary" id="dgPub"' + (dirty && has ? '' : ' disabled') + '>' + SP.icon('upload') + '<span>' + esc(SP.t('dev.publish')) + '</span></button></div>' +
      '<div class="dev-way"><b>' + esc(SP.t('dev.wayA')) + '</b><small>' + esc(SP.t('dev.g.dlText')) + '</small><button type="button" class="btn" id="dgDl">' + SP.icon('download') + '<span>groups.json</span></button></div></div>' +
      (dirty ? '<button type="button" class="btn btn-ghost btn-sm" id="dgReset">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('dev.reset')) + '</span></button>' : '') + '</section>';

    var on = function (s, fn) { var el = SP.$(s, box); if (el) el.onclick = fn; };
    var redraw = function () { mount(box, core); };
    on('#dgAdd', function () { addDialog(core, redraw); });
    on('#dgPub', function () { publish(core, SP.$('#dgPub', box), redraw); });
    on('#dgDl', function () { SP.downloadText(groupsText(), 'groups.json', 'application/json'); SP.toast(SP.t('author.groupsDone'), 'success', { ms: 8000 }); });
    on('#dgReset', function () { gl = null; dirty = false; newMan = {}; redraw(); });
    SP.$$('[data-gf]', box).forEach(function (b) { b.onclick = function () { core.showGroup(g[+b.getAttribute('data-gf')].folder); }; });
    SP.$$('[data-gs]', box).forEach(function (b) { b.onclick = function () { if (SP.devSchedule) SP.devSchedule.select(g[+b.getAttribute('data-gs')].folder); core.openTab('schedule'); }; });
    SP.$$('[data-gr]', box).forEach(function (b) { b.onclick = function () { renameDialog(g[+b.getAttribute('data-gr')], redraw); }; });
    SP.$$('[data-gd]', box).forEach(function (b) {
      b.onclick = function () {
        var x = g[+b.getAttribute('data-gd')];
        SP.confirm({ title: SP.t('dev.g.del'), text: SP.t('dev.g.delText', { g: x.name, f: x.folder }), okLabel: SP.t('common.delete'), danger: true }).then(function (ok) {
          if (!ok) return; g.splice(g.indexOf(x), 1); delete newMan[x.folder]; dirty = true; redraw();
        });
      };
    });
  }
  function nameField(val) {
    return '<div class="field"><label class="label" for="dgN">' + esc(SP.t('auth.group')) + '</label><input class="input" id="dgN" value="' + esc(val || '') + '" placeholder="МР-252" autocomplete="off"><span class="error-text" id="dgE" role="alert"></span></div>';
  }
  function readName(m) {
    var inp = SP.$('#dgN', m.el), v = SP.group.format(inp.value);
    if (!SP.group.valid(v)) { SP.$('#dgE', m.el).textContent = SP.t('group.invalid'); inp.focus(); return null; }
    return v;
  }
  function addDialog(core, done) {
    var g = list(core);
    var m = SP.modal({
      title: SP.t('dev.g.add'), size: 'lg',
      body: '<div class="stack">' + nameField('') + '<p class="xsmall subtle" id="dgF"></p>' +
        '<div class="field"><label class="label" for="dgFrom">' + esc(SP.t('dev.g.from')) + '</label><select class="input" id="dgFrom"><option value="">' + esc(SP.t('dev.g.fromNone')) + '</option>' +
        g.map(function (x) { return '<option value="' + esc(x.folder) + '">' + esc(x.name) + '</option>'; }).join('') + '</select><span class="hint">' + esc(SP.t('dev.g.fromHint')) + '</span></div>' +
        '<div id="dgSubs" class="dev-chips"></div></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('dev.g.create'), kind: 'primary', icon: 'check', onClick: function () {
        var v = readName(m); if (!v) return false;
        var folder = SP.slug(v);
        if (g.some(function (x) { return x.folder === folder || SP.lc(x.name) === SP.lc(v); })) { SP.$('#dgE', m.el).textContent = SP.t('dev.g.exists'); return false; }
        g.push({ name: v, folder: folder });
        var from = SP.$('#dgFrom', m.el).value, subs = SP.$$('#dgSubs input:checked', m.el).map(function (c) { return c.value; });
        newMan[folder] = { version: core.nextVersion(''), include: from && subs.length ? [{ from: from, subjects: subs }] : [], files: [] };
        if (!newMan[folder].include.length) delete newMan[folder].include;
        dirty = true; done();
        SP.toast(SP.t('dev.g.created', { g: v }), 'success', { ms: 7000 });
      } }]
    });
    var inp = SP.$('#dgN', m.el), fl = SP.$('#dgF', m.el);
    var showF = function () { var v = SP.group.format(inp.value); fl.textContent = v ? SP.t('dev.g.folder', { f: SP.slug(v) }) : ''; };
    inp.oninput = function () { var fv = SP.group.format(inp.value, true); if (fv !== inp.value) inp.value = fv; SP.$('#dgE', m.el).textContent = ''; showF(); };
    SP.$('#dgFrom', m.el).onchange = function () {
      var f = this.value, box = SP.$('#dgSubs', m.el);
      if (!f) { box.innerHTML = ''; return; }
      box.innerHTML = '<span class="small muted">' + esc(SP.t('dev.loading')) + '</span>';
      subjectsOf(core, f).then(function (subs) {
        box.innerHTML = subs.length ? subs.map(function (s) { return '<label class="dev-chip"><input type="checkbox" value="' + esc(s) + '" checked> ' + esc(s) + '</label>'; }).join('') : '<span class="small subtle">' + esc(SP.t('dev.empty')) + '</span>';
      });
    };
  }
  function renameDialog(x, done) {
    var m = SP.modal({
      title: SP.t('dev.g.rename'),
      body: '<div class="stack">' + nameField(x.name) + '<p class="xsmall subtle">' + esc(SP.t('dev.g.renameHint', { f: x.folder })) + '</p></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
        var v = readName(m); if (!v) return false;
        if (v !== x.name) { x.name = v; dirty = true; done(); }
      } }]
    });
  }
  function groupsText() {
    return JSON.stringify({ version: new Date().toISOString().slice(0, 10) + '.1', groups: gl.map(function (g) { var o = { name: g.name, folder: g.folder }; if (g.legacy) o.legacy = true; return o; }) }, null, 2) + '\n';
  }
  function publish(core, btn, done) {
    SP.confirm({ title: SP.t('dev.publish'), text: SP.t('dev.g.pubConfirm'), okLabel: SP.t('dev.publish'), icon: 'upload' }).then(function (ok) {
      if (!ok) return;
      SP.busy(btn, true);
      var files = [{ path: 'data/groups.json', content: groupsText() }];
      /* новым группам — пустая папка (manifest.json), чтобы сразу можно было добавлять файлы */
      Object.keys(newMan).forEach(function (f) { if (gl.some(function (g) { return g.folder === f; })) files.push({ path: 'data/' + f + '/manifest.json', content: JSON.stringify(newMan[f], null, 2) + '\n' }); });
      core.commitFiles(files, SP.t('dev.g.msg')).then(function () {
        core.setGroups(gl.map(function (g) { return Object.assign({}, g); }));
        dirty = false; newMan = {}; mans = {};
        SP.groups.load();
        SP.toast(SP.t('dev.published'), 'success', { ms: 9000 });
        done();
      }).catch(function (e) { SP.toast(e.message, 'danger', { ms: 10000 }); SP.busy(btn, false); });
    });
  }

  /* ---------- «Общие предметы из других групп» (вкладка «Папки») ---------- */
  function shared(sec, core) {
    var st = core.draft(); if (!sec || !st || !st.dir) return;
    var others = core.groups().filter(function (g) { return g.folder !== st.dir; });
    sec.hidden = false;
    var inc = st.inc || [];
    var on = function (from, s) { return inc.some(function (x) { return x.from === from && x.subjects.indexOf(s) >= 0; }); };
    var n = inc.reduce(function (a, x) { return a + x.subjects.length; }, 0);
    sec.innerHTML = '<div class="card-head"><div><h2 class="card-title">' + SP.icon('link') + esc(SP.t('dev.sharedTitle')) + '</h2><div class="card-sub">' + esc(SP.t('dev.sharedSub', { n: n })) + '</div></div></div>' +
      (others.length ? others.map(function (g) { return '<div class="stack-sm"><div class="section-title">' + esc(SP.t('dev.sharedFrom', { g: g.name })) + '</div><div class="dev-chips" data-from="' + esc(g.folder) + '"><span class="small muted">' + esc(SP.t('dev.loading')) + '</span></div></div>'; }).join('')
        : '<p class="small subtle">' + esc(SP.t('dev.sharedNone')) + '</p>');
    others.forEach(function (g) {
      subjectsOf(core, g.folder).then(function (subs) {
        var box = SP.$('[data-from="' + g.folder + '"]', sec); if (!box) return;
        box.innerHTML = subs.length ? subs.map(function (s) { return '<label class="dev-chip"><input type="checkbox" value="' + esc(s) + '"' + (on(g.folder, s) ? ' checked' : '') + '> ' + esc(s) + '</label>'; }).join('') : '<span class="small subtle">' + esc(SP.t('dev.empty')) + '</span>';
        SP.$$('input', box).forEach(function (c) {
          c.onchange = function () {
            var picked = SP.$$('input:checked', box).map(function (x) { return x.value; });
            var rest = (st.inc || []).filter(function (x) { return x.from !== g.folder; });
            if (picked.length) rest.push({ from: g.folder, subjects: picked });
            st.inc = rest; core.saveDraft();
          };
        });
      });
    });
  }

  SP.devGroups = { mount: mount, shared: shared };
})();

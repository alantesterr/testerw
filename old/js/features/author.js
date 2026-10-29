/* =====================================================================
   ДЛЯ АВТОРА: памятка и редактор файла групп (data/groups.json).
   Раньше здесь был «файл логинов и паролей» (accounts.json). Он больше
   не нужен и был небезопасен: пароли лежали в открытом виде на GitHub.
   Теперь студенты входят своим логином Platonus, а файл groups.json
   только связывает название группы с папкой материалов курса.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;

  function guide() {
    SP.modal({ title: SP.t('author.guide'), size: 'lg', body: SP.t('author.guideHtml'), actions: [{ label: SP.t('common.understood'), kind: 'primary' }] });
  }

  function groupsEditor() {
    var rows = SP.groups.list().map(function (g) { return { name: g.name, folder: g.folder || SP.slug(g.name), legacy: !!g.legacy }; });
    var m = SP.modal({ title: SP.t('author.groups'), size: 'lg', body: '<div id="grEd"></div>', actions: [
      { label: SP.t('author.groupsReload'), icon: 'cloud', close: false, onClick: function () { SP.groups.load().then(function (l) { rows = l.map(function (g) { return { name: g.name, folder: g.folder || SP.slug(g.name), legacy: !!g.legacy }; }); draw(); SP.toast(SP.t('author.groupsLoaded', { n: l.length }), 'success'); }); return false; } },
      { label: SP.t('author.groupsDownload'), icon: 'download', kind: 'primary', close: false, onClick: function () {
        var bad = rows.findIndex(function (r) { return !SP.group.valid(SP.group.format(r.name)) || !(r.folder.trim() || SP.slug(r.name)); });
        rows.forEach(function (r) { r.name = SP.group.format(r.name); });
        if (bad >= 0) { SP.toast(SP.t('author.groupsBad', { n: bad + 1 }), 'warning'); return false; }
        var out = { version: new Date().toISOString().slice(0, 10) + '.1', groups: rows.map(function (r) { var o = { name: r.name.trim(), folder: (r.folder.trim() || SP.slug(r.name)).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') }; if (r.legacy) o.legacy = true; return o; }) };
        SP.downloadText(JSON.stringify(out, null, 2) + '\n', 'groups.json', 'application/json');
        SP.toast(SP.t('author.groupsDone'), 'success', { ms: 8000 }); return false;
      } }
    ] });
    var host = SP.$('#grEd', m.el);
    function draw() {
      host.innerHTML = '<p class="small muted">' + esc(SP.t('author.groupsText')) + '</p>' +
        '<div class="stack-sm">' + rows.map(function (r, i) {
          return '<div class="gr-row" data-i="' + i + '"><input class="input" data-k="name" value="' + esc(r.name) + '" placeholder="' + esc(SP.t('auth.groupPh')) + '" aria-label="' + esc(SP.t('auth.group')) + '">' +
            '<input class="input mono" data-k="folder" value="' + esc(r.folder) + '" placeholder="ir-252" aria-label="' + esc(SP.t('author.folder')) + '">' +
            '<button type="button" class="btn btn-ghost btn-icon" data-del="' + i + '" aria-label="' + esc(SP.t('common.delete')) + '" data-tip="' + esc(SP.t('common.delete')) + '">' + SP.icon('trash-2') + '</button>' +
            '<span class="xsmall subtle gr-path">data/' + esc(r.folder || SP.slug(r.name)) + '/schedule.json</span></div>';
        }).join('') + '</div>' +
        '<button type="button" class="btn btn-sm" id="grAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('author.groupsAdd')) + '</span></button>';
      SP.$('#grAdd', host).onclick = function () { rows.push({ name: '', folder: '', legacy: false }); draw(); var l = SP.$$('.gr-row', host); l[l.length - 1].querySelector('input').focus(); };
      SP.$$('[data-del]', host).forEach(function (b) { b.onclick = function () { rows.splice(+b.getAttribute('data-del'), 1); draw(); }; });
    }
    host.addEventListener('input', function (e) {
      var row = e.target.closest('.gr-row'); if (!row) return;
      var r = rows[+row.getAttribute('data-i')], k = e.target.getAttribute('data-k');
      if (k === 'name') { var fv = SP.group.format(e.target.value, true); if (fv !== e.target.value) e.target.value = fv; e.target.setAttribute('aria-invalid', String(!!fv && fv.slice(-1) !== '-' && !SP.group.valid(fv))); }
      r[k] = e.target.value;
      if (k === 'name') { var f = row.querySelector('[data-k=folder]'); if (!f.dataset.touched) { r.folder = SP.slug(r.name); f.value = r.folder; } }
      if (k === 'folder') e.target.dataset.touched = '1';
      row.querySelector('.gr-path').textContent = 'data/' + (r.folder || SP.slug(r.name)) + '/schedule.json';
    });
    draw();
  }

  SP.author = { guide: guide, groupsEditor: groupsEditor };
})();

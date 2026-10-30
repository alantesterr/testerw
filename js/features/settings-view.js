/* =====================================================================
   РАЗДЕЛ «НАСТРОЙКИ»: всё второстепенное собрано здесь по группам.
   Внешний вид · Язык · Аккаунт · Тестер и плеер ·
   Инструменты · Данные · Для автора · О сайте
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var root = null;
  var VERSION = '3.0.0';
  var SECTIONS = [['appearance', 'type'], ['language', 'languages'], ['account', 'user'], ['testerPlayer', 'list-checks'], ['tools', 'timer'], ['data', 'database'], ['author', 'square-pen'], ['about', 'info']];

  function choice(group, val, cur, inner, label) {
    return '<button type="button" class="choice" role="radio" data-' + group + '="' + val + '" aria-checked="' + (cur === val) + '" aria-label="' + esc(label) + '">' + inner + '<span>' + esc(label) + '</span></button>';
  }
  function section(id, icon, body, sub) {
    return '<section class="card settings-sec" id="set-' + id + '" aria-labelledby="sh-' + id + '"><div class="card-head"><div><h2 class="card-title" id="sh-' + id + '">' + SP.icon(icon) + esc(SP.t('settings.' + id)) + '</h2>' + (sub ? '<div class="card-sub">' + sub + '</div>' : '') + '</div></div><div class="stack">' + body + '</div></section>';
  }
  function setRow(title, hint, control) {
    return '<div class="set-row"><div class="set-text"><div class="strong small">' + esc(title) + '</div>' + (hint ? '<div class="xsmall subtle">' + hint + '</div>' : '') + '</div><div class="set-ctl">' + control + '</div></div>';
  }

  function render() {
    if (!root) return;
    var s = SP.settings.all(), u = SP.auth.user() || {}, linked = SP.auth.isLinked(), sync = SP.data.status();
    var html = SP.pageHead({ title: SP.t('nav.settings'), sub: esc(SP.t('settings.sub')) });
    html += '<nav class="set-nav" aria-label="' + esc(SP.t('settings.sections')) + '">' + SECTIONS.map(function (x) { return '<a class="btn btn-sm btn-ghost" href="#set-' + x[0] + '" data-jump="' + x[0] + '">' + SP.icon(x[1], 'ic-sm') + '<span>' + esc(SP.t('settings.' + x[0])) + '</span></a>'; }).join('') + '</nav>';

    /* 1. Внешний вид */
    var themes = [['light', 'sun'], ['dark', 'moon'], ['system', 'monitor']];
    var fonts = [['s', '14px'], ['ms', '15px'], ['m', '16px'], ['l', '18px'], ['xl', '20px'], ['xxl', '22px']];
    html += section('appearance', 'type',
      '<div class="stack-sm"><div class="label">' + esc(SP.t('settings.theme')) + '</div><div class="choice-grid" role="radiogroup" aria-label="' + esc(SP.t('settings.theme')) + '">' +
      themes.map(function (t) { return choice('theme', t[0], s.theme, SP.icon(t[1]), SP.t('settings.theme.' + t[0])); }).join('') + '</div></div>' +
      '<div class="stack-sm"><div class="label">' + esc(SP.t('settings.fontSize')) + '</div><div class="choice-grid" role="radiogroup" aria-label="' + esc(SP.t('settings.fontSize')) + '">' +
      fonts.map(function (f) { return choice('font', f[0], s.font, '<span class="sample" style="font-size:' + (parseInt(f[1], 10) * 1.6) + 'px">' + esc(SP.t('settings.sample')) + '</span>', SP.t('settings.font.' + f[0])); }).join('') + '</div></div>' +
      [['schShk', 'Shokan'], ['schTt', 'Timetable']].map(function (g) {
        return '<div class="stack-sm"><div class="label">' + esc(SP.t('settings.schSize', { m: g[1] })) + '</div><div class="choice-grid choice-grid-3" role="radiogroup" aria-label="' + esc(SP.t('settings.schSize', { m: g[1] })) + '">' +
          [['std', 1], ['sm', 0.87], ['xs', 0.77]].map(function (v) { return '<button type="button" class="choice" role="radio" data-sch="' + g[0] + '" data-v="' + v[0] + '" aria-checked="' + (s[g[0]] === v[0]) + '"><span class="sample" style="font-size:' + (1.6 * v[1]) + 'rem">Аа</span><span>' + esc(SP.t('settings.sch.' + v[0])) + '</span></button>'; }).join('') + '</div></div>';
      }).join('') +
      '<p class="xsmall subtle">' + esc(SP.t('settings.schHint')) + '</p>' +
      setRow(SP.t('settings.sidebar'), esc(SP.t('settings.sidebarHint')), '<div class="segmented" role="group" aria-label="' + esc(SP.t('settings.sidebar')) + '">' + ['expanded', 'collapsed', 'hidden'].map(function (v) { return '<button type="button" data-sidebar="' + v + '" aria-pressed="' + (s.sidebar === v) + '">' + esc(SP.t('settings.sb.' + v)) + '</button>'; }).join('') + '</div>'));

    /* 2. Язык */
    html += section('language', 'languages', '<div class="choice-grid" role="radiogroup" aria-label="' + esc(SP.t('settings.language')) + '">' +
      SP.LANGS.map(function (l) { return choice('lang', l.code, s.lang, '<span class="sample" style="font-size:1.4rem">' + l.short + '</span>', l.name); }).join('') + '</div>');

    /* 3. Аккаунт (локальный профиль) */
    var nm = u.name && u.nameSet ? u.name : SP.t('auth.guestName');
    var acc = '<div class="profile-strip"><span class="avatar">' + SP.icon('user') + '</span><div class="grow"><b>' + esc(nm) + '</b><div class="small muted">' + esc(u.group || SP.t('auth.noGroup')) + '</div></div></div>';
    acc += '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body"><span>' + esc(SP.t('settings.localText')) + '</span><div class="alert-actions"><button type="button" class="btn btn-ghost btn-sm" id="sHow">' + SP.icon('shield-check') + '<span>' + esc(SP.t('auth.how')) + '</span></button></div></div></div>';
    acc += '<div class="field"><label class="label" for="sName">' + esc(SP.t('auth.yourName')) + '</label><input class="input" id="sName" value="' + esc(u.name || '') + '" placeholder="' + esc(SP.t('auth.yourNamePh')) + '"></div>';
    acc += '<div class="field"><label class="label" for="sGroup">' + esc(SP.t('auth.group')) + '</label><div class="row row-nowrap"><div class="ac grow"><input class="input" id="sGroup" value="' + esc(u.group || '') + '" placeholder="' + esc(SP.t('auth.groupPh')) + '" autocomplete="off"></div><button type="button" class="btn" id="sProfileSave">' + esc(SP.t('common.save')) + '</button></div><span class="error-text" id="sGroupErr" role="alert"></span><span class="hint">' + esc(SP.t('settings.groupHint', { dir: window.SP_GROUP_DIR || '—' })) + '</span></div>';
    acc += setRow(SP.t('auth.device'), esc(SP.t('settings.deviceHint', { d: SP.t('auth.dev.' + SP.settings.detected).toLowerCase() })), '<div class="segmented" role="group" aria-label="' + esc(SP.t('auth.device')) + '">' + [['phone', 'smartphone'], ['pc', 'monitor']].map(function (x) { return '<button type="button" data-dev="' + x[0] + '" aria-pressed="' + (s.device === x[0]) + '">' + SP.icon(x[1], 'ic-sm') + '<span>' + esc(SP.t('auth.dev.' + x[0])) + '</span></button>'; }).join('') + '</div>');
    acc += '<div class="row"><button type="button" class="btn" id="sOut">' + SP.icon('log-out') + '<span>' + esc(SP.t('auth.out')) + '</span></button>' +
      '<button type="button" class="btn btn-danger-outline" id="sLogout">' + SP.icon('trash-2') + '<span>' + esc(SP.t('auth.reset')) + '</span></button></div>' +
      '<p class="xsmall subtle">' + esc(SP.t('auth.outHint')) + '</p>';
    html += section('account', 'user', acc);

    /* 5. Тестер и плеер */
    html += section('testerPlayer', 'list-checks',
      setRow(SP.t('settings.trLang'), esc(SP.t('settings.trLangHint')), '<div class="segmented" role="group" aria-label="' + esc(SP.t('settings.trLang')) + '">' + [['ru', 'Русский'], ['kk', 'Қазақша']].map(function (x) { return '<button type="button" data-trlang="' + x[0] + '" aria-pressed="' + (s.trLang === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>') +
      setRow(SP.t('settings.autoTr'), esc(SP.t('settings.autoTrHint')), '<label class="switch"><input type="checkbox" id="sAutoTr"' + (s.autoTr ? ' checked' : '') + '><span class="track"></span><span class="sr-only">' + esc(SP.t('settings.autoTr')) + '</span></label>') +
      setRow(SP.t('settings.hotkeys'), esc(SP.t('settings.hotkeysHint')), '<label class="switch"><input type="checkbox" id="sHotkeys"' + (s.hotkeys !== false ? ' checked' : '') + '><span class="track"></span><span class="sr-only">' + esc(SP.t('settings.hotkeys')) + '</span></label>') +
      setRow(SP.t('player.warnLabel'), esc(SP.t('player.warnHint')), '<div class="row row-nowrap"><input class="input input-num" type="number" id="sWarn" min="5" max="300" value="' + esc(s.warnSec) + '" aria-label="' + esc(SP.t('player.warnLabel')) + '"><span class="small muted">' + esc(SP.t('player.sec')) + '</span></div>') +
      setRow(SP.t('settings.playerMore'), esc(SP.t('settings.playerMoreHint')), '<a class="btn btn-ghost" href="#/player">' + SP.icon('circle-play') + '<span>' + esc(SP.t('nav.player')) + '</span></a>'));

    /* 6. Инструменты */
    html += section('tools', 'timer',
      setRow(SP.t('stopwatch.title'), esc(SP.t('settings.stopwatchHint')), '<label class="switch"><input type="checkbox" id="sSw"' + (s.stopwatch ? ' checked' : '') + '><span class="track"></span><span class="sr-only">' + esc(SP.t('stopwatch.title')) + '</span></label>') +
      /* Кнопки Platonus в «Оценках» по умолчанию скрыты */
      setRow(SP.t('settings.plHide'), esc(SP.t('settings.plHideHint')), '<label class="switch"><input type="checkbox" id="sPlHide"' + (s.plHide !== false ? ' checked' : '') + '><span class="track"></span><span class="sr-only">' + esc(SP.t('settings.plHide')) + '</span></label>') +
      /* Автообновление — видно, только когда кнопки Platonus показаны */
      (s.plHide === false ? setRow(SP.t('settings.plAuto'), esc(SP.t('settings.plAutoHint')), '<div class="row row-nowrap"><input class="input input-num" type="number" id="sPlAuto" min="0" max="1440" step="1" value="' + esc(s.plAuto || 0) + '" aria-label="' + esc(SP.t('settings.plAuto')) + '"><span class="small muted">' + esc(SP.t('settings.min')) + '</span></div>') +
        setRow(SP.t('settings.ttAuto'), esc(SP.t('settings.ttAutoHint')), '<div class="row row-nowrap"><input class="input input-num" type="number" id="sTtAuto" min="0" max="1440" step="1" value="' + esc(s.ttAuto || 0) + '" aria-label="' + esc(SP.t('settings.ttAuto')) + '"><span class="small muted">' + esc(SP.t('settings.min')) + '</span></div>') : ''));

    /* 4. Данные */
    var d = SP.hub.data(), base = SP.hub.base();
    html += section('data', 'database',
      '<div class="set-group"><div class="section-title">' + esc(SP.t('nav.schedule')) + '</div>' +
      setRow(SP.t('settings.uploadSchedule'), esc(SP.t('settings.uploadScheduleHint')), '<button type="button" class="btn" id="sUp">' + SP.icon('upload') + '<span>' + esc(SP.t('common.upload')) + '</span></button>') +
      setRow(SP.t('settings.downloadSchedule'), esc(SP.t('settings.downloadScheduleHint')), '<button type="button" class="btn" id="sDl">' + SP.icon('download') + '<span>' + esc(SP.t('common.download')) + '</span></button>') +
      setRow(SP.t('schedule.howTo'), esc(SP.t('settings.howToHint')), '<button type="button" class="btn btn-ghost" id="sHelp">' + SP.icon('circle-help') + '<span>' + esc(SP.t('common.open')) + '</span></button>') +
      setRow(SP.t('schedule.editTitle'), esc(SP.t('settings.editHint')), '<button type="button" class="btn btn-ghost" id="sEdit"' + (d.schedule.length ? '' : ' disabled') + '>' + SP.icon('pencil') + '<span>' + esc(SP.t('common.change')) + '</span></button>') +
      (d.own ? setRow(SP.t('settings.dropOwn'), esc(SP.t('settings.dropOwnHint')), '<button type="button" class="btn btn-danger-outline" id="sDropOwn">' + SP.icon('undo-2') + '<span>' + esc(SP.t('settings.dropOwnBtn')) + '</span></button>') : '') + '</div>' +
      '<div class="set-group"><div class="section-title">' + esc(SP.t('settings.course')) + '</div>' +
      setRow(SP.t('settings.courseRefresh'), esc(base && base.version ? SP.t('schedule.version', { v: base.version }) : SP.t('settings.courseNone')), '<button type="button" class="btn" id="sCourse">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('common.update')) + '</span></button>') +
      setRow('schedule.json', esc(SP.t('settings.ghScheduleHint')), '<button type="button" class="btn" id="sGhS">' + SP.icon('file-json') + '<span>' + esc(SP.t('common.download')) + '</span></button>') +
      setRow('manifest.json', esc(SP.t('settings.ghManifestHint')), '<button type="button" class="btn" id="sGhM">' + SP.icon('file-json') + '<span>' + esc(SP.t('common.download')) + '</span></button>') + '</div>' +
      '<div class="set-group"><div class="section-title">' + esc(SP.t('settings.backup')) + '</div>' +
      setRow(SP.t('settings.export'), esc(SP.t('settings.exportHint')), '<button type="button" class="btn" id="sExport">' + SP.icon('download') + '<span>' + esc(SP.t('settings.exportBtn')) + '</span></button>') +
      setRow(SP.t('settings.import'), esc(SP.t('settings.importHint')), '<button type="button" class="btn" id="sImport">' + SP.icon('upload') + '<span>' + esc(SP.t('settings.importBtn')) + '</span></button>') +
      setRow(SP.t('settings.wipe'), esc(SP.t('settings.wipeHint')), '<button type="button" class="btn btn-danger" id="sWipe">' + SP.icon('trash-2') + '<span>' + esc(SP.t('settings.wipeBtn')) + '</span></button>') + '</div>');

    /* 7. Для автора */
    html += section('author', 'square-pen',
      setRow(SP.t('designer.title'), esc(SP.t('settings.designerHint')), '<a class="btn btn-primary" href="#/designer">' + SP.icon('square-pen') + '<span>' + esc(SP.t('common.open')) + '</span></a>') +
      setRow(SP.t('author.guide'), esc(SP.t('author.guideHint')), '<button type="button" class="btn" id="sGuide">' + SP.icon('book-open') + '<span>' + esc(SP.t('common.open')) + '</span></button>') +
      setRow(SP.t('author.groups'), esc(SP.t('author.groupsHint')), '<button type="button" class="btn" id="sGroups">' + SP.icon('users') + '<span>' + esc(SP.t('common.open')) + '</span></button>') +
      setRow(SP.t('author.prompt'), esc(SP.t('author.promptHint')), '<div class="btn-group"><button type="button" class="btn" id="sPromptCopy">' + SP.icon('copy') + '<span>' + esc(SP.t('common.copy')) + '</span></button><button type="button" class="btn btn-ghost" id="sPromptDl">' + SP.icon('download') + '<span>DOCX</span></button></div>'),
      esc(SP.t('author.sub')));

    /* 8. О сайте */
    html += section('about', 'info', '<p class="small muted">' + esc(SP.t('about.text', { v: VERSION })) + '</p><div class="btn-group"><button type="button" class="btn" id="sTesterHelp">' + SP.icon('circle-help') + '<span>' + esc(SP.t('tester.helpTitle')) + '</span></button></div>');

    root.innerHTML = '<div class="page">' + html + '</div>';
    wire();
  }

  function wire() {
    var $ = function (s) { return SP.$(s, root); };
    var on = function (id, fn) { var el = $(id); if (el) el.onclick = fn; };
    SP.$$('[data-jump]', root).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = SP.$('#set-' + a.getAttribute('data-jump'), root); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); var h = t.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } }; });
    SP.$$('[data-theme]', root).forEach(function (b) { b.onclick = function () { SP.settings.set('theme', b.getAttribute('data-theme')); render(); }; });
    SP.$$('[data-font]', root).forEach(function (b) { b.onclick = function () { SP.settings.set('font', b.getAttribute('data-font')); render(); SP.$('[data-font="' + b.getAttribute('data-font') + '"]', root).focus(); }; });
    SP.$$('[data-sidebar]', root).forEach(function (b) { b.onclick = function () { SP.settings.set('sidebar', b.getAttribute('data-sidebar')); render(); }; });
    SP.$$('[data-lang]', root).forEach(function (b) { b.onclick = function () { SP.settings.set('lang', b.getAttribute('data-lang')); }; });
    SP.$$('[data-trlang]', root).forEach(function (b) { b.onclick = function () { SP.settings.set('trLang', b.getAttribute('data-trlang')); render(); }; });
    var w = $('#sWarn'); if (w) w.onchange = function () { var v = SP.clamp(parseInt(w.value, 10) || 30, 5, 300); w.value = v; SP.settings.set('warnSec', v); SP.toast(SP.t('settings.saved'), 'success'); };
    SP.$$('[data-sch]', root).forEach(function (b) { b.onclick = function () { var g = b.getAttribute('data-sch'), v = b.getAttribute('data-v'); SP.settings.set(g, v); render(); SP.$('[data-sch="' + g + '"][data-v="' + v + '"]', root).focus(); }; });
    var at = $('#sAutoTr'); if (at) at.onchange = function () { SP.settings.set('autoTr', at.checked); };
    var hk = $('#sHotkeys'); if (hk) hk.onchange = function () { SP.settings.set('hotkeys', hk.checked); };
    var sw = $('#sSw'); if (sw) sw.onchange = function () { SP.settings.set('stopwatch', sw.checked); };
    var ph = $('#sPlHide'); if (ph) ph.onchange = function () { SP.settings.set('plHide', ph.checked); SP.toast(SP.t('settings.saved'), 'success'); render(); var n = $('#sPlHide'); if (n) n.focus(); };
    [['#sPlAuto', 'plAuto'], ['#sTtAuto', 'ttAuto']].forEach(function (p) {
      var pa = $(p[0]); if (pa) pa.onchange = function () { var v = Math.round(SP.clamp(parseFloat(pa.value) || 0, 0, 1440)); if (v > 0 && v < 1) v = 1;   /* не чаще раза в минуту */ pa.value = v; SP.settings.set(p[1], v); SP.toast(SP.t('settings.saved'), 'success'); };
    });
    on('#sHow', SP.auth.explain);
    var gi = $('#sGroup'); if (gi) SP.group.attach(gi, $('#sGroupErr'));
    on('#sLogout', function () { SP.auth.logout(); });
    on('#sOut', function () { SP.auth.signOut(); });
    SP.$$('[data-dev]', root).forEach(function (b) { b.onclick = function () { SP.settings.applyDevice(b.getAttribute('data-dev')); render(); SP.toast(SP.t('settings.deviceDone'), 'success'); }; });
    on('#sProfileSave', function () {
      var gv = SP.group.format($('#sGroup').value);
      if (gv && !SP.group.valid(gv)) { $('#sGroupErr').textContent = SP.t('group.invalid'); $('#sGroup').setAttribute('aria-invalid', 'true'); $('#sGroup').focus(); return; }
      SP.auth.updateProfile({ name: $('#sName').value.trim(), group: gv });
      SP.toast(SP.t('settings.saved'), 'success'); render();
    });
    on('#sUp', SP.schedule.upload); on('#sDl', SP.hub.exportAll); on('#sHelp', SP.schedule.help); on('#sEdit', SP.schedule.editJson);
    on('#sDropOwn', function () { SP.confirm({ title: SP.t('settings.dropOwn'), text: SP.t('settings.dropOwnText'), okLabel: SP.t('settings.dropOwnBtn'), danger: true }).then(function (ok) { if (ok) { SP.hub.clearOwn(); render(); SP.toast(SP.t('settings.saved'), 'success'); } }); });
    on('#sCourse', function () { SP.hub.refreshBase(true).then(render); });
    on('#sGhS', function () { SP.hub.exportGithub('schedule'); }); on('#sGhM', function () { SP.hub.exportGithub('manifest'); });
    on('#sExport', exportBackup); on('#sImport', importBackup); on('#sWipe', wipe);
    on('#sGuide', SP.author.guide); on('#sGroups', SP.author.groupsEditor);
    on('#sPromptCopy', function () { SP.copyText(SP.PROMPT_TEXT || '').then(function () { SP.toast(SP.t('common.copied'), 'success'); }); });
    on('#sPromptDl', SP.tester.downloadPrompt);
    on('#sTesterHelp', SP.tester.help);
  }

  /* Резервная копия настроек и прогресса (без паролей и без больших файлов) */
  var SKIP = /^(sp-vault|sp-auth|sp-cache-)/;
  function exportBackup() {
    var out = { format: 'StudyPlay-backup', version: 1, createdAt: new Date().toISOString(), data: {} };
    SP.store.keys().forEach(function (k) { if (/^(sp-|studyplay-)/.test(k) && !SKIP.test(k)) out.data[k] = SP.store.raw(k); });
    SP.downloadText(JSON.stringify(out), 'studyplay-backup-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
    SP.toast(SP.t('settings.exportDone'), 'success');
  }
  function importBackup() {
    var inp = SP.el('<input type="file" accept=".json,application/json" hidden>'); document.body.appendChild(inp);
    inp.onchange = function () {
      var f = inp.files[0]; inp.remove(); if (!f) return;
      f.text().then(function (t) {
        var j = JSON.parse(t); if (!j || j.format !== 'StudyPlay-backup' || !j.data) throw new Error(SP.t('settings.importBad'));
        return SP.confirm({ title: SP.t('settings.import'), text: SP.t('settings.importConfirm'), okLabel: SP.t('settings.importBtn') }).then(function (ok) {
          if (!ok) return;
          Object.keys(j.data).forEach(function (k) { if (/^(sp-|studyplay-)/.test(k) && !SKIP.test(k)) SP.store.setRaw(k, j.data[k]); });
          location.reload();
        });
      }).catch(function (e) { SP.toast(e.message || SP.t('settings.importBad'), 'danger'); });
    };
    inp.click();
  }
  function wipe() {
    SP.confirm({ title: SP.t('settings.wipe'), text: SP.t('settings.wipeText'), okLabel: SP.t('settings.wipeBtn'), danger: true, icon: 'trash-2' }).then(function (ok) {
      if (!ok) return;
      SP.store.keys().forEach(function (k) { if (/^(sp-|studyplay-)/.test(k)) SP.store.del(k); });
      Promise.all(['studyplay', 'studyplay-academic', 'studyplay-keys'].map(function (n) { return SP.idb(n).clear().catch(function () { }); })).then(function () { location.hash = ''; location.reload(); });
    });
  }

  SP.views.register('settings', { titleKey: 'nav.settings', mount: function (el) { root = el; render(); }, show: render, refresh: render });
  SP.on('auth', function () { if (root && SP.views.current() === 'settings') render(); });
  SP.on('data', function () { if (root && SP.views.current() === 'settings') render(); });
  SP.on('settings', function (e) { if (e.key === 'lang' && root && SP.views.current() === 'settings') render(); });
})();

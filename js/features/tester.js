/* =====================================================================
   РАЗДЕЛ «ТЕСТЕР».
   Главный экран: загрузить файлы с тестами (до 10, вопросы
   объединяются), выбрать количество вопросов, начать тест.
   Тест из папки предмета открывается в отдельном окне и не трогает
   основной набор вопросов (SP.tester.openIsolated).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var root = null, running = null;
  var cnt = parseInt(SP.store.raw('studyplay-cnt'), 10) || 40;

  function render() {
    if (!root || running) return;
    var st = SP.bank.state(), n = st.all.length, full = st.files.length >= SP.bank.MAX;
    var html = SP.pageHead({
      title: SP.t('nav.tester'),
      sub: esc(SP.t('tester.sub')),
      actions: '<button type="button" class="btn btn-ghost" id="tHelp">' + SP.icon('circle-help') + '<span>' + esc(SP.t('tester.help')) + '</span></button>' +
        '<a class="btn" href="#/designer">' + SP.icon('square-pen') + '<span>' + esc(SP.t('tester.editQuestions')) + '</span></a>'
    });
    /* Шаг 1 — файлы */
    html += '<section class="card drop-card" id="tDrop"><div class="card-head"><div><div class="card-title">' + SP.icon('upload') + esc(SP.t('tester.step1')) + '</div><div class="card-sub">' + esc(SP.t('tester.formats')) + '</div></div>' +
      '<span class="badge">' + esc(SP.t('tester.filesOf', { n: st.files.length, max: SP.bank.MAX })) + '</span></div>' +
      '<div class="drop-zone"><div class="drop-inner">' + SP.icon('file-text', 'ic-xl') + '<p class="small muted">' + esc(SP.t('tester.dropHint')) + '</p>' +
      '<button type="button" class="btn btn-primary" id="tPick"' + (full ? ' disabled' : '') + '>' + SP.icon('upload') + '<span>' + esc(full ? SP.t('tester.limit', { max: SP.bank.MAX }) : st.files.length ? SP.t('tester.addMore') : SP.t('tester.pick')) + '</span></button></div></div>' +
      (st.files.length ? '<div class="list">' + st.files.map(function (f) {
        return '<div class="list-row"><span class="file-badge accent">' + SP.icon('file-text') + '</span><span class="meta grow"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b><small>' + esc(SP.t('tester.qCount', { n: f.count })) + (f.bad ? ' · <span class="text-danger">' + esc(SP.t('tester.badCount', { n: f.bad })) + '</span>' : '') + '</small></span>' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="' + esc(f.id) + '" aria-label="' + esc(SP.t('tester.removeFile')) + '" data-tip="' + esc(SP.t('tester.removeFile')) + '">' + SP.icon('x') + '</button></div>';
      }).join('') + '</div>' : '') + '</section>';
    /* Шаг 2 — запуск */
    html += '<section class="card"><div class="card-head"><div><div class="card-title">' + SP.icon('play') + esc(SP.t('tester.step2')) + '</div><div class="card-sub">' + esc(SP.t('tester.total', { n: n })) + (st.bad.length ? ' · <a href="#/designer">' + esc(SP.t('tester.badTotal', { n: st.bad.length })) + '</a>' : '') + '</div></div></div>' +
      '<div class="start-row"><div class="field"><label class="label" for="tCnt">' + esc(SP.t('tester.howMany')) + '</label><div class="row row-nowrap">' +
      '<input class="input input-num" type="number" id="tCnt" min="1" max="' + Math.max(1, n) + '" value="' + Math.max(1, Math.min(cnt, n || 1)) + '"' + (n ? '' : ' disabled') + '>' +
      '<button type="button" class="btn" id="tAll"' + (n ? '' : ' disabled') + '>' + esc(SP.t('tester.all')) + '</button></div><span class="hint">' + esc(SP.t('tester.random')) + '</span></div>' +
      '<button type="button" class="btn btn-primary btn-lg" id="tGo"' + (n ? '' : ' disabled') + '>' + SP.icon('play') + '<span>' + esc(SP.t('tester.start')) + '</span></button></div>' +
      (n ? '' : '<p class="small subtle">' + esc(SP.t('tester.needFile')) + '</p>') + '</section>';
    root.innerHTML = '<div class="page">' + html + '</div>';
    wire();
  }

  function wire() {
    var $ = function (s) { return SP.$(s, root); };
    var pick = function () {
      var inp = SP.el('<input type="file" multiple accept=".txt,.doc,.docx,.json" hidden>'); document.body.appendChild(inp);
      inp.onchange = function () { var l = Array.prototype.slice.call(inp.files); inp.remove(); if (l.length) ingest(l); };
      inp.click();
    };
    $('#tPick').onclick = pick;
    $('#tHelp').onclick = SP.tester.help;
    SP.$$('[data-rm]', root).forEach(function (b) { b.onclick = function () { SP.bank.removeFile(b.getAttribute('data-rm')); }; });
    var c = $('#tCnt');
    c.oninput = function () { var v = parseInt(c.value, 10); if (v > 0) { cnt = v; SP.store.setRaw('studyplay-cnt', String(v)); } };
    c.onchange = function () { var v = SP.clamp(parseInt(c.value, 10) || 1, 1, Math.max(1, SP.bank.all().length)); c.value = v; cnt = v; SP.store.setRaw('studyplay-cnt', String(v)); };
    $('#tAll').onclick = function () { c.value = SP.bank.all().length; c.onchange(); };
    $('#tGo').onclick = start;
    var dz = $('#tDrop');
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = function () { dz.classList.remove('over'); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files.length) ingest(e.dataTransfer.files); };
  }

  function ingest(list) {
    var b = SP.$('#tPick', root); SP.busy(b, true);
    SP.bank.ingest(list).then(function (r) { SP.bank.report(r); render(); });
  }

  function start() {
    SP.bank.sync();
    var all = SP.bank.all(); if (!all.length) return;
    var n = SP.clamp(parseInt(SP.$('#tCnt', root).value, 10) || 1, 1, all.length);
    var list = SP.shuffle(all).slice(0, n);
    root.innerHTML = '<div class="page"><div id="quizHost"></div></div>';
    running = SP.Quiz(SP.$('#quizHost', root), list, { title: SP.bank.state().name || SP.t('nav.tester'), onExit: stop });
  }
  function stop() { if (running) running.destroy(); running = null; render(); }

  SP.tester = {
    openIsolated: function (title, questions) {
      var m = SP.modal({ title: title, size: 'xl', body: '<div id="isoHost"></div>', onClose: function () { if (q) q.destroy(); } });
      var q = SP.Quiz(SP.$('#isoHost', m.el), questions, { title: title, focus: false, onExit: function () { m.close(); } });
    },
    help: function () {
      SP.modal({
        title: SP.t('tester.helpTitle'), size: 'lg',
        body: SP.t('tester.helpHtml') +
          '<pre class="code"><code>&lt;question&gt;2 + 2 = ?\n&lt;variant&gt;3\n&lt;variantright&gt;4\n\n&lt;question&gt;' + esc(SP.t('tester.exMulti')) + '\n&lt;variantright&gt;A\n&lt;variantright&gt;B\n&lt;variant&gt;C\n\n&lt;question&gt;' + esc(SP.t('tester.exKb')) + '\n&lt;variant_keyboard&gt;100</code></pre>',
        actions: [
          { label: SP.t('tester.promptDocx'), icon: 'download', close: false, onClick: function () { SP.tester.downloadPrompt(); return false; } },
          { label: SP.t('tester.promptCopy'), icon: 'copy', kind: 'primary', close: false, onClick: function () { SP.copyText(SP.PROMPT_TEXT || '').then(function () { SP.toast(SP.t('common.copied'), 'success'); }); return false; } }
        ]
      });
    },
    downloadPrompt: function () {
      if (location.protocol === 'file:') { SP.downloadText(SP.PROMPT_TEXT || '', 'StudyPlay-AI-prompt.txt'); return; }
      fetch('assets/ai-test-prompt.docx').then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { SP.download(b, 'StudyPlay-AI-prompt.docx'); })
        .catch(function () { SP.downloadText(SP.PROMPT_TEXT || '', 'StudyPlay-AI-prompt.txt'); });
    }
  };

  SP.views.register('tester', {
    titleKey: 'nav.tester',
    mount: function (el) { root = el; render(); },
    show: function () { render(); },
    refresh: function () { if (!running) render(); }
  });
  SP.on('bank', function () { if (root && SP.views.current() === 'tester') render(); });
})();

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
    var st = SP.bank.state(), n = st.all.length, full = st.files.length >= SP.bank.MAX, res = resumeGet();
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
      '<div class="row t-pick-row"><button type="button" class="btn btn-primary" id="tPick"' + (full ? ' disabled' : '') + '>' + SP.icon('upload') + '<span>' + esc(full ? SP.t('tester.limit', { max: SP.bank.MAX }) : st.files.length ? SP.t('tester.addMore') : SP.t('tester.pick')) + '</span></button>' +
      '<button type="button" class="btn" id="tFromSj"' + (full ? ' disabled' : '') + '>' + SP.icon('folder-open') + '<span>' + esc(SP.t('tester.fromFolders')) + '</span></button></div></div></div>' +
      (st.files.length ? '<div class="list">' + st.files.map(function (f) {
        return '<div class="list-row">' + SP.fileIcon(f.name) + '<span class="meta grow"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b><small>' + esc(SP.t('tester.qCount', { n: f.count })) + (f.bad ? ' · <span class="text-danger">' + esc(SP.t('tester.badCount', { n: f.bad })) + '</span>' : '') + '</small></span>' +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="' + esc(f.id) + '" aria-label="' + esc(SP.t('tester.removeFile')) + '" data-tip="' + esc(SP.t('tester.removeFile')) + '">' + SP.icon('x') + '</button></div>';
      }).join('') + '</div>' : '') + '</section>';
    /* Шаг 2 — запуск */
    html += '<section class="card"><div class="card-head"><div><div class="card-title">' + SP.icon('play') + esc(SP.t('tester.step2')) + '</div><div class="card-sub">' + esc(SP.t('tester.total', { n: n })) + (st.bad.length ? ' · <a href="#/designer">' + esc(SP.t('tester.badTotal', { n: st.bad.length })) + '</a>' : '') + '</div></div></div>' +
      '<div class="start-row"><div class="field"><label class="label" for="tCnt">' + esc(SP.t('tester.howMany')) + '</label><div class="row row-nowrap">' +
      '<input class="input input-num" type="number" id="tCnt" min="1" max="' + Math.max(1, n) + '" value="' + Math.max(1, Math.min(cnt, n || 1)) + '"' + (n ? '' : ' disabled') + '>' +
      '<button type="button" class="btn" id="tAll"' + (n ? '' : ' disabled') + '>' + esc(SP.t('tester.all')) + '</button></div><span class="hint">' + esc(SP.t('tester.random')) + '</span></div>' +
      (res ? '<div class="t-go"><button type="button" class="btn btn-primary btn-lg" id="tCont">' + SP.icon('play') + '<span>' + esc(SP.t('tester.continue')) + '</span></button>' +
        '<button type="button" class="btn btn-lg" id="tGo">' + SP.icon('rotate-ccw') + '<span>' + esc(SP.t('tester.startNew')) + '</span></button>' +
        '<span class="small muted t-go-info">' + esc(SP.t('tester.resumeInfo', resInfo(res))) + '</span></div></div>'
        : '<button type="button" class="btn btn-primary btn-lg" id="tGo"' + (n ? '' : ' disabled') + '>' + SP.icon('play') + '<span>' + esc(SP.t('tester.start')) + '</span></button></div>') +
      (n ? '' : '<p class="small subtle">' + esc(SP.t('tester.needFile')) + '</p>') + '</section>';
    /* Шаг 3 — ошибки по каждому загруженному файлу */
    if (st.files.length) html += errorsHtml();
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
    var tc = $('#tCont'); if (tc) tc.onclick = resume;
    $('#tFromSj').onclick = fromFolders;
    SP.$$('[data-errgo]', root).forEach(function (b) { b.onclick = function () { runErrors(b.getAttribute('data-errgo')); }; });
    SP.$$('[data-errclr]', root).forEach(function (b) { b.onclick = function () { clearErrors(b.getAttribute('data-errclr')); }; });
    SP.$$('[data-errx]', root).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-errx').split('|'), e = errs(); if (e[p[0]]) { delete e[p[0]][p[1]]; saveErrs(e); } render(); }; });
    SP.$$('[data-errmore]', root).forEach(function (b) { b.onclick = function () { errOpen[b.getAttribute('data-errmore')] = 1; render(); }; });
    var dz = $('#tDrop');
    dz.ondragover = function (e) { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = function () { dz.classList.remove('over'); };
    dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files.length) ingest(e.dataTransfer.files); };
  }

  function ingest(list) {
    var b = SP.$('#tPick', root); SP.busy(b, true);
    SP.bank.ingest(list).then(function (r) { SP.bank.report(r); render(); });
  }

  /* ---------- файлы, их «отпечатки», поиск вопроса ---------- */
  var E = SP.testEngine, qid = E.qid, errOpen = {};
  function fileOf(q) { var st = SP.bank.state(); for (var i = 0; i < st.files.length; i++) if (st.files[i].id === q._f) return st.files[i]; return st.files.length === 1 ? st.files[0] : null; }
  function keyOfQ(q) { var f = fileOf(q); return f ? SP.bank.fileKey(f) : ''; }
  function setKey() { return SP.bank.state().files.map(SP.bank.fileKey).sort().join('+'); }
  function byId() { var m = {}; SP.bank.all().forEach(function (q) { var id = qid(q); if (!m[id]) m[id] = q; }); return m; }

  /* ---------- незаконченный тест: один на набор загруженных файлов ---------- */
  function resumes() { return SP.store.get('studyplay-resume', {}) || {}; }
  function resumeGet() { var r = resumes()[setKey()]; return r && r.items && r.items.length && r.ans.some(Boolean) ? r : null; }
  function resumeSave(k, s) {
    var all = resumes(); all[k] = Object.assign(s, { at: Date.now() });
    var ks = Object.keys(all).sort(function (a, b) { return all[b].at - all[a].at; });
    ks.slice(8).forEach(function (x) { delete all[x]; });
    SP.store.set('studyplay-resume', all);
  }
  function resInfo(r) { var b = r.items.map(function (it, i) { return it.r ? null : r.ans[i]; }).filter(function (_, i) { return !r.items[i].r; }); return { d: b.filter(Boolean).length, n: b.length, e: b.filter(function (a) { return a && !a.ok; }).length }; }
  function resumeDrop(k) { var all = resumes(); delete all[k]; SP.store.set('studyplay-resume', all); }

  /* ---------- ошибки: отдельно для каждого файла, хранятся пока не очистишь ---------- */
  /* ошибки сами не исчезают — только ✕ у вопроса или «Очистить» */
  function errs() { return SP.store.get('studyplay-ferr', {}) || {}; }
  function saveErrs(e) { Object.keys(e).forEach(function (k) { if (!Object.keys(e[k]).length) delete e[k]; }); SP.store.set('studyplay-ferr', e); }
  function noteWrong(q, a) {
    var k = keyOfQ(q); if (!k) return;
    var e = errs(), m = e[k] = e[k] || {}, id = qid(q), r = m[id] || { n: 0 };
    r.n++; r.s = 0; r.a = String(a || '').slice(0, 300); r.at = Date.now(); m[id] = r; saveErrs(e);
  }
  function fileErrs(f) {
    var k = SP.bank.fileKey(f), m = errs()[k] || {}, out = [];
    SP.bank.all().forEach(function (q) { if (q._f === f.id || (!q._f && fileOf(q) === f)) { var id = qid(q); if (m[id] && !out.some(function (x) { return x.id === id; })) out.push({ id: id, q: q, r: m[id] }); } });
    return { k: k, list: out.sort(function (a, b) { return b.r.at - a.r.at; }) };
  }
  function rightText(q) { return E.isKb(q) ? q.answer : (q.opts || []).filter(function (o) { return o.right; }).map(function (o) { return o.t; }).join('; '); }
  function errorsHtml() {
    var blocks = SP.bank.state().files.map(function (f) {
      var x = fileErrs(f); if (!x.list.length) return '';
      var lim = errOpen[x.k] ? x.list.length : 10;
      return '<section class="card t-err"><div class="card-head"><div><div class="card-title">' + SP.icon('triangle-alert') + esc(SP.t('tester.errTitle', { f: f.name.replace(/\.[^.]+$/, '') })) + ' <span class="badge badge-danger">' + x.list.length + '</span></div>' +
        '<div class="card-sub">' + esc(SP.t('tester.errSub')) + '</div></div>' +
        '<div class="row"><button type="button" class="btn btn-primary btn-sm" data-errgo="' + esc(f.id) + '">' + SP.icon('play') + '<span>' + esc(SP.t('tester.errGo')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-errclr="' + esc(f.id) + '">' + SP.icon('trash-2') + '<span>' + esc(SP.t('tester.errClear')) + '</span></button></div></div>' +
        '<div class="t-err-list">' + x.list.slice(0, lim).map(function (it) {
          return '<div class="t-err-item"><div class="grow"><div class="t-err-q">' + E.richHtml(it.q.q, true) + '</div>' +
            (it.r.a ? '<div class="small"><b class="text-danger">' + esc(SP.t('tester.errYour')) + ':</b> ' + esc(it.r.a) + '</div>' : '') +
            '<div class="small"><b class="text-success">' + esc(SP.t('quiz.correct')) + ':</b> ' + esc(rightText(it.q)) + '</div>' +
            (it.r.n > 1 ? '<div class="small muted">' + esc(SP.t('tester.errTimes', { n: it.r.n })) + '</div>' : '') + '</div>' +
            '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-errx="' + esc(x.k + '|' + it.id) + '" aria-label="' + esc(SP.t('tester.errRemove')) + '" data-tip="' + esc(SP.t('tester.errRemove')) + '">' + SP.icon('x') + '</button></div>';
        }).join('') + '</div>' +
        (x.list.length > lim ? '<button type="button" class="btn btn-ghost btn-sm" data-errmore="' + esc(x.k) + '">' + esc(SP.t('tester.errMore', { n: x.list.length })) + '</button>' : '') + '</section>';
    }).join('');
    return blocks || '<section class="card t-err"><div class="card-title">' + SP.icon('triangle-alert') + esc(SP.t('tester.errNone')) + '</div><p class="small subtle">' + esc(SP.t('tester.errNoneSub')) + '</p></section>';
  }
  function clearErrors(fid) {
    var f = SP.bank.state().files.filter(function (x) { return x.id === fid; })[0]; if (!f) return;
    var x = fileErrs(f);
    SP.confirm({ title: SP.t('tester.errClear'), text: SP.t('tester.errClearQ', { f: f.name, n: x.list.length }), okLabel: SP.t('tester.errClear'), danger: true }).then(function (ok) {
      if (!ok) return; var e = errs(); delete e[x.k]; saveErrs(e); render();
    });
  }
  function runErrors(fid) {
    var f = SP.bank.state().files.filter(function (x) { return x.id === fid; })[0]; if (!f) return;
    var x = fileErrs(f); if (!x.list.length) return;
    root.innerHTML = '<div class="page"><div id="quizHost"></div></div>';
    running = SP.Quiz(SP.$('#quizHost', root), x.list.map(function (it) { return it.q; }), {
      title: SP.t('tester.errTitle', { f: f.name.replace(/\.[^.]+$/, '') }), onExit: stop,
      onAnswer: function (q, ok, a) {
        var e = errs(), m = e[x.k] || {}, id = qid(q), r = m[id]; if (!r) { if (!ok) noteWrong(q, a); return; }
        if (ok) return;
        else { r.n++; r.s = 0; r.a = String(a || '').slice(0, 300); r.at = Date.now(); }
        e[x.k] = m; saveErrs(e);
      }
    });
  }

  /* ---------- тест ---------- */
  function launch(list, extra) {
    var k = setKey();
    root.innerHTML = '<div class="page"><div id="quizHost"></div></div>';
    running = SP.Quiz(SP.$('#quizHost', root), list, Object.assign({
      title: SP.bank.state().name || SP.t('nav.tester'), onExit: stop,
      onAnswer: function (q, ok, a) { if (!ok) noteWrong(q, a); },
      onSave: function (s) { resumeSave(k, s); },
      onFinish: function () { resumeDrop(k); }
    }, extra || {}));
  }
  function start() {
    SP.bank.sync();
    var all = SP.bank.all(); if (!all.length) return;
    var n = SP.clamp(parseInt(SP.$('#tCnt', root).value, 10) || 1, 1, all.length);
    resumeDrop(setKey());
    /* сначала ошибки, которым пора повториться, и новые вопросы (память ошибок общая с Плеером) */
    launch(SP.mem.pick(all, n, qid));
  }
  /* продолжить: собираем вопросы по сохранённым id и порядку вариантов */
  function resume() {
    var r = resumeGet(); if (!r) return start();
    var m = byId(), quiz = [], ans = [], cur = 0;
    r.items.forEach(function (it, i) {
      var q = m[it.id]; if (!q) return;
      var opts = (q.opts || []).map(function (o, j) { return Object.assign({}, o, { _oi: j }); });
      if (it.o && it.o.length === opts.length && it.o.every(function (j) { return opts[j]; })) opts = it.o.map(function (j) { return opts[j]; });
      if (i === r.cur) cur = quiz.length;
      quiz.push(Object.assign({}, q, { opts: opts }, it.r ? { _rep: true } : {})); ans.push(r.ans[i] || null);
    });
    if (!quiz.length) { resumeDrop(setKey()); return start(); }
    launch(quiz.filter(function (q) { return !q._rep; }), { resume: { quiz: quiz, ans: ans, cur: cur, round: r.round } });
  }

  /* ---------- загрузить тесты из папок предметов и из «Экзамена» ---------- */
  var EXAM = [
    { p: 'exam/data/philosophy.docx', n: 'Философия (Экзамен).docx', c: 500 },
    { p: 'exam/data/arch-platonus.docx', n: 'Архитектура Platonus (Экзамен).docx', c: 142 },
    { p: 'exam/data/arch-umkd.docx', n: 'Архитектура УМКД (Экзамен).docx', c: 8 },
    { p: 'exam/data/cpp.txt', n: 'C++ на русском (Экзамен).txt', c: 190 },
    { p: 'exam/data/ict.doc', n: 'ИКТ (Экзамен).doc', c: 364 }
  ];
  function fromFolders() {
    var st = SP.bank.state(), room = SP.bank.MAX - st.files.length;
    var has = function (name) { return st.files.some(function (f) { return f.name === name; }); };
    var ST = SP.subjectTests;
    var row = function (val, name, sub, cnt) {
      var on = has(name);
      return ST.row({ input: '<input type="checkbox" class="check" value="' + esc(val) + '"' + (on ? ' disabled' : '') + '>', name: name, off: on, sub: on ? SP.t('tester.srcLoaded') : sub, cnt: on ? '' : cnt });
    };
    /* у предмета виден один тест, остальные — под «Ещё N» */
    var subs = ST ? ST.list() : [];
    var body = '<p class="small muted">' + esc(SP.t('tester.srcRoom', { n: room })) + '</p>' +
      subs.map(function (s, si) {
        return ST.group({ id: s.id, head: s.name, color: ST.COLORS[si % ST.COLORS.length], rows: s.tests.map(function (x) {
          var c = ST.cached(s.id, x.i);
          return row('sj|' + s.id + '|' + x.i, x.f.name, c != null ? SP.t('tester.qCount', { n: c }) : SP.t('tester.srcCounting'), c != null ? '' : s.id + '|' + x.i);
        }) });
      }).join('') +
      (subs.length ? '' : '<p class="small subtle">' + esc(SP.t('tester.srcNoSj')) + '</p>') +
      ST.group({ id: 'exam', head: SP.t('sj.exam'), icon: 'graduation-cap', color: ST.COLORS[subs.length % ST.COLORS.length], rows: EXAM.map(function (x, i) { return row('ex|' + i, x.n, SP.t('tester.qCount', { n: x.c })); }) });
    var m = SP.modal({ title: SP.t('tester.fromFolders'), size: 'lg', body: body, actions: [
      { label: SP.t('common.cancel') },
      { label: SP.t('tester.srcLoad'), icon: 'upload', kind: 'primary', close: false, onClick: function (api, b) {
        var vals = SP.$$('input:checked', m.el).map(function (c) { return c.value; });
        if (!vals.length) { SP.toast(SP.t('tester.srcPick'), 'warning'); return false; }
        if (vals.length > room) { SP.toast(SP.t('tester.srcOver', { n: room }), 'warning'); return false; }
        SP.busy(b, true);
        Promise.all(vals.map(function (v) {
          var p = v.split('|');
          if (p[0] === 'sj') return SP.subjectTests.file(p[1], +p[2]).catch(function () { return null; });
          var x = EXAM[+p[1]];
          return fetch(x.p).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) { return new File([bl], x.n, { type: bl.type }); }).catch(function () { return null; });
        })).then(function (files) {
          var ok = files.filter(Boolean);
          if (ok.length < files.length) SP.toast(SP.t('subjects.openFail'), 'danger');
          api.close();
          if (ok.length) SP.bank.ingest(ok).then(function (r) { SP.bank.report(r); render(); });
        });
        return false;
      } }
    ] });
    ST.wire(m.el);
    var upd = function () { var n = SP.$$('input:checked', m.el).length, btn = m.foot.lastChild; btn.querySelector('span').textContent = SP.t('tester.srcLoad') + (n ? ' (' + n + ')' : ''); ST.togs(m.el); };
    SP.$$('input[type=checkbox]', m.el).forEach(function (c) { c.onchange = upd; });
    ST.fill(m.el);
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
          '<pre class="code"><code>&lt;question&gt;2 + 2 = ?\n&lt;variant&gt;3\n&lt;variantright&gt;4\n\n&lt;question&gt;' + esc(SP.t('tester.exMulti')) + '\n&lt;variantright&gt;A\n&lt;variantright&gt;B\n&lt;variant&gt;C\n\n&lt;question&gt;' + esc(SP.t('tester.exKb')) + '\n&lt;variant_keyboard&gt;100\n&lt;explain&gt;' + esc(SP.t('tester.exExplain')) + '</code></pre>',
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
    show: function () { SP.hub.checkUpdate(); render(); },
    refresh: function () { if (!running) render(); }
  });
  SP.on('bank', function () { if (root && SP.views.current() === 'tester') render(); });
})();

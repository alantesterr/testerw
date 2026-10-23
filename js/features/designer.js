/* =====================================================================
   ДИЗАЙНЕР ТЕСТОВ (открывается из Настроек → «Для автора» и из Тестера).
   Шаг 1 — обычные вопросы (варианты ответа), шаг 2 — специальные
   (ввод с клавиатуры, картинки), шаг 3 — сохранение в файл.
   Все изменения сразу попадают в банк вопросов Тестера и Плеера.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc;
  var root = null, step = 1, query = '';

  function st() { return SP.bank.state(); }
  function counts() { var s = st().dz.filter(function (q) { return !E.isSpecial(q); }).length; return [s, st().dz.length - s]; }
  function statusHtml(q) { var p = E.problem(q); return p ? '<span class="badge badge-danger">' + SP.icon('triangle-alert') + esc(p) + '</span>' : '<span class="badge badge-success">' + SP.icon('check') + esc(SP.t('designer.ready')) + '</span>'; }

  function render() {
    if (!root) return;
    var c = counts();
    var html = SP.pageHead({
      title: SP.t('designer.title'),
      sub: '<a href="#/settings" class="small">' + SP.icon('arrow-left', 'ic-sm') + ' ' + esc(SP.t('nav.settings')) + '</a> · ' + esc(SP.t('designer.sub')),
      actions: '<button type="button" class="btn" id="dImport">' + SP.icon('download') + '<span>' + esc(SP.t('designer.import')) + '</span></button>' +
        '<button type="button" class="btn" id="dPreview"' + (st().dz.length ? '' : ' disabled') + '>' + SP.icon('eye') + '<span>' + esc(SP.t('designer.preview')) + '</span></button>' +
        '<button type="button" class="btn btn-danger-outline" id="dClear"' + (st().dz.length || st().bad.length ? '' : ' disabled') + '>' + SP.icon('trash-2') + '<span>' + esc(SP.t('designer.clear')) + '</span></button>'
    });
    html += '<div class="tabs steps" role="tablist">' + [[1, SP.t('designer.step1', { n: c[0] }), 'list-checks'], [2, SP.t('designer.step2', { n: c[1] }), 'keyboard'], [3, SP.t('designer.step3'), 'save']].map(function (x) {
      return '<button type="button" class="tab" role="tab" data-step="' + x[0] + '" aria-selected="' + (step === x[0]) + '">' + SP.icon(x[2], 'ic-sm') + '<span>' + esc(x[1]) + '</span></button>';
    }).join('') + '</div>';
    if (step < 3) {
      var sp = step === 2;
      html += '<div class="row-between"><p class="small muted">' + esc(SP.t(sp ? 'designer.specialHint' : 'designer.simpleHint')) + '</p>' +
        '<button type="button" class="btn btn-primary" id="dAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('designer.add')) + '</span></button></div>' +
        '<div class="row"><div class="input-icon grow">' + SP.icon('search') + '<input type="search" class="input" id="dSearch" placeholder="' + esc(SP.t('designer.search')) + '" value="' + esc(query) + '" aria-label="' + esc(SP.t('designer.search')) + '"></div><span class="small subtle" id="dCount"></span></div>' +
        '<div class="stack" id="dList"></div><div id="dBad"></div>' +
        '<div class="row-between"><button type="button" class="btn" id="dPrev"' + (step === 1 ? ' disabled' : '') + '>' + SP.icon('arrow-left') + '<span>' + esc(SP.t('common.back')) + '</span></button>' +
        '<button type="button" class="btn btn-primary" id="dNext"><span>' + esc(SP.t(sp ? 'designer.toSave' : 'designer.toSpecial')) + '</span>' + SP.icon('arrow-right') + '</button></div>';
    } else html += exportHtml(c);
    root.innerHTML = '<div class="page">' + html + '</div>';
    wire();
    if (step < 3) renderList();
  }

  function exportHtml(c) {
    var kbN = st().dz.filter(E.isKb).length;
    return '<div class="grid-2">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + SP.icon('file-text') + 'TXT</div><div class="card-sub">' + esc(SP.t('designer.txtHint')) + '</div></div></div>' +
      '<div class="stack-sm" role="radiogroup">' + radio('etxt', 'simple', SP.t('designer.onlySimple', { n: c[0] }), true) + radio('etxt', 'special', SP.t('designer.onlySpecial', { n: c[1] })) + radio('etxt', 'all', SP.t('designer.allFile', { n: c[0] + c[1] })) + '</div>' +
      '<button type="button" class="btn btn-primary" id="eTxt">' + SP.icon('download') + '<span>' + esc(SP.t('designer.dlTxt')) + '</span></button></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + SP.icon('file-text') + 'DOCX / DOC</div><div class="card-sub">' + esc(SP.t('designer.docHint')) + '</div></div></div>' +
      '<div class="stack-sm" role="radiogroup">' + radio('edoc', 'normal', SP.t('designer.onlyNormal', { n: st().dz.length - kbN }), true) + radio('edoc', 'kb', SP.t('designer.onlyKb', { n: kbN })) + radio('edoc', 'all', SP.t('designer.allFile', { n: st().dz.length })) + '</div>' +
      '<div class="btn-group"><button type="button" class="btn btn-primary" id="eDocx">' + SP.icon('download') + '<span>DOCX</span></button><button type="button" class="btn" id="eDoc">' + SP.icon('download') + '<span>DOC</span></button></div></section>' +
      '</div>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + SP.icon('file-json') + esc(SP.t('designer.more')) + '</div><div class="card-sub">' + esc(SP.t('designer.jsonHint')) + '</div></div></div>' +
      '<div class="btn-group"><button type="button" class="btn" id="eJson">' + SP.icon('file-json') + '<span>.studyplay.json</span></button>' +
      '<button type="button" class="btn" id="eCopy">' + SP.icon('copy') + '<span>' + esc(SP.t('designer.copyText')) + '</span></button>' +
      '<button type="button" class="btn btn-success" id="ePlay">' + SP.icon('play') + '<span>' + esc(SP.t('designer.play')) + '</span></button></div></section>' +
      '<div class="row"><button type="button" class="btn" id="dPrev">' + SP.icon('arrow-left') + '<span>' + esc(SP.t('common.back')) + '</span></button></div>';
  }
  function radio(name, val, label, checked) { return '<label class="check"><input type="radio" name="' + name + '" value="' + val + '"' + (checked ? ' checked' : '') + '><span>' + esc(label) + '</span></label>'; }

  function card(q, i, k, sp) {
    var kb = E.isKb(q), src = q._f ? (st().files.filter(function (f) { return f.id === q._f; })[0] || {}).name : '';
    var h = '<article class="card dq" data-q="' + i + '"><div class="row-between"><div class="row"><b>' + esc(SP.t('designer.question', { n: k })) + '</b>' + (src ? '<span class="small subtle truncate" style="max-width:14rem">' + esc(src) + '</span>' : '') + '</div>' +
      '<div class="row"><span class="dq-st">' + statusHtml(q) + '</span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-a="delq" aria-label="' + esc(SP.t('designer.delQ')) + '" data-tip="' + esc(SP.t('designer.delQ')) + '">' + SP.icon('trash-2') + '</button></div></div>' +
      '<textarea class="textarea" data-f="q" rows="2" placeholder="' + esc(SP.t('designer.qText')) + '" aria-label="' + esc(SP.t('designer.qText')) + '">' + esc(q.q) + '</textarea>';
    if (sp) {
      h += '<div class="row"><label class="btn btn-sm">' + SP.icon('image') + '<span>' + esc(SP.t(q.img ? 'designer.changeImg' : 'designer.qImg')) + '</span><input type="file" accept="image/*" data-img="q" class="sr-only"></label>' +
        (q.img ? '<button type="button" class="btn btn-ghost btn-sm" data-a="clearimg">' + SP.icon('x') + '<span>' + esc(SP.t('designer.removeImg')) + '</span></button>' : '') +
        '<button type="button" class="btn btn-sm" data-a="type">' + SP.icon(kb ? 'list-checks' : 'keyboard') + '<span>' + esc(SP.t(kb ? 'designer.toChoice' : 'designer.toKb')) + '</span></button></div>' + E.img(q.img, 'dq-img');
    }
    if (kb) {
      h += '<div class="field"><label class="label">' + esc(SP.t('designer.rightAnswer')) + '</label><input class="input" data-f="answer" value="' + esc(q.answer) + '" placeholder="' + esc(SP.t('designer.answerPh')) + '"></div>';
    } else {
      if (!q.opts.length) h += '<div class="alert alert-warning">' + SP.icon('triangle-alert') + '<div class="alert-body"><span>' + esc(SP.t('designer.noOpts')) + '</span><div class="alert-actions"><button type="button" class="btn btn-primary btn-sm" data-a="addopts">' + SP.icon('plus') + '<span>' + esc(SP.t('designer.addOpts')) + '</span></button>' + (sp ? '' : '<button type="button" class="btn btn-sm" data-a="tospecial">' + esc(SP.t('designer.makeSpecial')) + '</button>') + '</div></div></div>';
      h += '<div class="stack-sm">' + q.opts.map(function (o, j) {
        return '<div class="oprow" data-o="' + j + '"><label class="check right-check' + (o.right ? ' on' : '') + '"><input type="checkbox" data-f="r"' + (o.right ? ' checked' : '') + '><span>' + esc(SP.t('designer.right')) + '</span></label>' +
          '<textarea class="textarea op-text" data-f="t" rows="1" placeholder="' + esc(SP.t('designer.option', { n: j + 1 })) + '" aria-label="' + esc(SP.t('designer.option', { n: j + 1 })) + '">' + esc(o.t) + '</textarea>' +
          (sp ? '<label class="btn btn-ghost btn-icon btn-sm" data-tip="' + esc(SP.t('designer.optImg')) + '">' + SP.icon('image') + '<input type="file" accept="image/*" data-img="o" class="sr-only" aria-label="' + esc(SP.t('designer.optImg')) + '"></label>' : '') +
          '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-a="delo" aria-label="' + esc(SP.t('designer.delOpt')) + '" data-tip="' + esc(SP.t('designer.delOpt')) + '">' + SP.icon('x') + '</button>' +
          (sp && o.img ? '<div class="op-img">' + E.img(o.img, 'dq-img') + '<button type="button" class="btn btn-ghost btn-sm" data-a="clearimg">' + esc(SP.t('designer.removeImg')) + '</button></div>' : '') + '</div>';
      }).join('') + '</div><div class="row"><button type="button" class="btn btn-sm" data-a="addo">' + SP.icon('plus') + '<span>' + esc(SP.t('designer.addOpt')) + '</span></button></div>';
    }
    return h + '</article>';
  }

  function renderList() {
    var L = SP.$('#dList', root); if (!L) return;
    var sp = step === 2, dz = st().dz;
    var idx = dz.map(function (q, i) { return i; }).filter(function (i) { return E.isSpecial(dz[i]) === sp; });
    if (sp) idx.forEach(function (i) { dz[i].special = true; });
    var qn = SP.lc(query);
    var shown = idx.filter(function (i) { if (!qn) return true; var q = dz[i]; return SP.lc(q.q + ' ' + (q.answer || '') + ' ' + (q.opts || []).map(function (o) { return o.t; }).join(' ')).indexOf(qn) >= 0; });
    L.innerHTML = shown.length ? shown.map(function (i) { return card(dz[i], i, idx.indexOf(i) + 1, sp); }).join('') :
      '<div class="card"><div class="empty">' + SP.icon(qn ? 'search' : 'list-checks', 'ic-xl') + '<p>' + esc(SP.t(qn ? 'designer.nothing' : 'designer.emptyStep')) + '</p></div></div>';
    var c = SP.$('#dCount', root); if (c) c.textContent = qn ? SP.t('designer.found', { a: shown.length, b: idx.length }) : SP.t('designer.totalN', { n: idx.length });
    renderBad();
    SP.$$('.op-text', L).forEach(autoGrow);
  }
  function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 240) + 'px'; }
  function renderBad() {
    var b = SP.$('#dBad', root); if (!b) return; var bad = st().bad;
    b.innerHTML = bad.length ? '<section class="card bad-box"><div class="card-head"><div><div class="card-title text-danger">' + SP.icon('triangle-alert') + esc(SP.t('designer.badTitle', { n: bad.length })) + '</div><div class="card-sub">' + esc(SP.t('designer.badHint')) + '</div></div></div><div class="stack-sm">' +
      bad.map(function (x, i) { return '<div class="bad-item"><div class="row-between"><b class="small">' + esc(x.reason) + '</b><div class="row"><span class="xsmall subtle">' + esc(x.name || '') + '</span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-bad="' + i + '" aria-label="' + esc(SP.t('designer.hide')) + '" data-tip="' + esc(SP.t('designer.hide')) + '">' + SP.icon('x') + '</button></div></div><div class="xsmall mono subtle">' + esc(x.raw) + '</div></div>'; }).join('') + '</div></section>' : '';
  }

  function tabs() { var c = counts(); var a = SP.$('[data-step="1"] span', root), b = SP.$('[data-step="2"] span', root); if (a) a.textContent = SP.t('designer.step1', { n: c[0] }); if (b) b.textContent = SP.t('designer.step2', { n: c[1] }); }

  function wire() {
    var $ = function (s) { return SP.$(s, root); };
    SP.$$('[data-step]', root).forEach(function (b) { b.onclick = function () { step = +b.getAttribute('data-step'); render(); }; });
    $('#dImport').onclick = importModal;
    $('#dPreview').onclick = preview;
    $('#dClear').onclick = function () {
      SP.confirm({ title: SP.t('designer.clearTitle'), text: SP.t('designer.clearText'), okLabel: SP.t('designer.clear'), danger: true, icon: 'trash-2' }).then(function (ok) { if (ok) { SP.bank.clear(); render(); } });
    };
    var pv = $('#dPrev'); if (pv) pv.onclick = function () { step = Math.max(1, step - 1); render(); };
    var nx = $('#dNext'); if (nx) nx.onclick = function () { step++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    if (step < 3) wireList(); else wireExport();
  }

  function wireList() {
    var $ = function (s) { return SP.$(s, root); };
    $('#dSearch').oninput = SP.debounce(function (e) { query = e.target.value; renderList(); }, 150);
    $('#dAdd').onclick = function () {
      query = ''; $('#dSearch').value = '';
      var q = E.blankQ(); if (step === 2) q.special = true;
      st().dz.push(q); SP.bank.syncLater(); renderList(); tabs();
      var cards = SP.$$('.dq', root); if (cards.length) { cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' }); cards[cards.length - 1].querySelector('textarea').focus(); }
    };
    var L = $('#dList');
    L.addEventListener('input', function (e) {
      var t = e.target, cardEl = t.closest('.dq'); if (!cardEl) return;
      var q = st().dz[+cardEl.getAttribute('data-q')], f = t.getAttribute('data-f'), rowEl = t.closest('.oprow');
      if (f === 'q') q.q = t.value; else if (f === 'answer') q.answer = t.value;
      else if (f === 't') { q.opts[+rowEl.getAttribute('data-o')].t = t.value; autoGrow(t); }
      else if (f === 'r') { q.opts[+rowEl.getAttribute('data-o')].right = t.checked; t.closest('.right-check').classList.toggle('on', t.checked); }
      cardEl.querySelector('.dq-st').innerHTML = statusHtml(q);
      SP.bank.syncLater();
    });
    L.addEventListener('change', function (e) {
      var t = e.target; if (!t.matches('input[type=file][data-img]')) return;
      var file = t.files[0]; if (!file) return;
      var cardEl = t.closest('.dq'), q = st().dz[+cardEl.getAttribute('data-q')];
      SP.readAsDataURL(file).then(function (d) {
        if (t.getAttribute('data-img') === 'q') q.img = d; else q.opts[+t.closest('.oprow').getAttribute('data-o')].img = d;
        renderList(); SP.bank.syncLater();
      });
    });
    L.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var cardEl = b.closest('.dq'), i = +cardEl.getAttribute('data-q'), q = st().dz[i], a = b.getAttribute('data-a');
      var done = function () { renderList(); tabs(); SP.bank.syncLater(); };
      if (a === 'delq') {
        if (!String(q.q).trim()) { st().dz.splice(i, 1); done(); return; }
        SP.confirm({ title: SP.t('designer.delQ'), text: SP.t('designer.delQText'), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) { if (ok) { st().dz.splice(i, 1); done(); } });
        return;
      }
      if (a === 'delo') { if (q.opts.length <= 2) { SP.toast(SP.t('designer.min2'), 'warning'); return; } q.opts.splice(+b.closest('.oprow').getAttribute('data-o'), 1); }
      else if (a === 'addo') q.opts.push({ t: '', right: false, img: '' });
      else if (a === 'addopts') q.opts = E.blankOpts();
      else if (a === 'tospecial') { q.special = true; SP.toast(SP.t('designer.movedSpecial'), 'info'); }
      else if (a === 'type') { q.type = E.isKb(q) ? 'choice' : 'keyboard'; if (E.isKb(q)) { q.opts = []; q.answer = ''; } else q.opts = E.blankOpts(); }
      else if (a === 'clearimg') { var r = b.closest('.oprow'); if (r) q.opts[+r.getAttribute('data-o')].img = ''; else q.img = ''; }
      done();
    });
    $('#dBad').addEventListener('click', function (e) { var b = e.target.closest('[data-bad]'); if (b) { SP.bank.dropBad(+b.getAttribute('data-bad')); renderBad(); } });
  }

  function checkList(list) {
    var bad = list.map(function (q) { var p = E.problem(q); return p ? SP.t('designer.qProblem', { n: st().dz.indexOf(q) + 1, p: p }) : ''; }).filter(Boolean);
    if (bad.length) { SP.modal({ title: SP.t('designer.fixFirst'), body: '<ul>' + bad.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', actions: [{ label: SP.t('common.understood'), kind: 'primary' }] }); return false; }
    return true;
  }
  function radioVal(n) { var r = SP.$('input[name="' + n + '"]:checked', root); return r ? r.value : ''; }
  function wireExport() {
    var dz = st().dz, simple = function () { return dz.filter(function (q) { return !E.isSpecial(q); }); }, spec = function () { return dz.filter(E.isSpecial); };
    SP.$('#eTxt', root).onclick = function () {
      var m = radioVal('etxt'), list = m === 'simple' ? simple() : m === 'special' ? spec() : simple().concat(spec());
      if (!list.length) { SP.toast(SP.t('designer.groupEmpty'), 'warning'); return; }
      if (!checkList(list)) return;
      SP.downloadText(E.buildText(list, true), 'studyplay-' + m + '.txt'); SP.toast(SP.t('designer.saved'), 'success');
    };
    var docList = function () { var m = radioVal('edoc'), n = dz.filter(function (q) { return !E.isKb(q); }), k = dz.filter(E.isKb); return { m: m, list: m === 'normal' ? n : m === 'kb' ? k : n.concat(k) }; };
    var imgNote = function (list) { var c = list.filter(function (q) { return q.img || (q.opts || []).some(function (o) { return o.img; }); }).length; SP.toast(c ? SP.t('designer.noImgInDoc', { n: c }) : SP.t('designer.saved'), c ? 'warning' : 'success'); };
    SP.$('#eDocx', root).onclick = function (ev) {
      var d = docList(); if (!d.list.length) { SP.toast(SP.t('designer.groupEmpty'), 'warning'); return; } if (!checkList(d.list)) return;
      var b = ev.currentTarget; SP.busy(b, true);
      E.mkDocx(E.buildText(d.list, false)).then(function (blob) { SP.download(blob, 'studyplay-' + d.m + '.docx'); imgNote(d.list); }, function (e) { SP.toast(e.message, 'danger'); }).then(function () { SP.busy(b, false); });
    };
    SP.$('#eDoc', root).onclick = function () {
      var d = docList(); if (!d.list.length) { SP.toast(SP.t('designer.groupEmpty'), 'warning'); return; } if (!checkList(d.list)) return;
      SP.download(new Blob([E.makeDocRtf(E.buildText(d.list, false))], { type: 'application/msword' }), 'studyplay-' + d.m + '.doc'); imgNote(d.list);
    };
    SP.$('#eJson', root).onclick = function () { if (!checkList(dz)) return; SP.downloadText(JSON.stringify({ format: 'StudyPlay', version: 1, all: dz.map(E.serializeQ) }, null, 2), 'studyplay-test.studyplay.json', 'application/json'); SP.toast(SP.t('designer.saved'), 'success'); };
    SP.$('#eCopy', root).onclick = function () { if (!checkList(dz)) return; SP.copyText(E.buildText(simple().concat(spec()), true)).then(function () { SP.toast(SP.t('designer.copied'), 'success'); }); };
    SP.$('#ePlay', root).onclick = function () {
      SP.bank.sync(); var all = SP.bank.all();
      if (!all.length) { SP.toast(SP.t('designer.noValid'), 'warning'); return; }
      var skipped = dz.length - all.length;
      SP.toast(SP.t('designer.readyToPlay', { n: all.length }) + (skipped ? ' ' + SP.t('designer.skippedN', { n: skipped }) : ''), skipped ? 'warning' : 'success');
      SP.navigate('tester');
    };
  }

  function importModal() {
    var found = [], bad = [];
    var m = SP.modal({
      title: SP.t('designer.importTitle'), size: 'lg',
      body: '<p class="small muted">' + esc(SP.t('designer.importHint')) + '</p>' +
        '<div class="field"><label class="label" for="imFile">' + esc(SP.t('designer.importFile')) + '</label><input class="input" type="file" id="imFile" accept=".doc,.docx,.txt,.json"></div>' +
        '<div class="field"><label class="label" for="imPaste">' + esc(SP.t('designer.importPaste')) + '</label><textarea class="textarea mono small" id="imPaste" rows="6" placeholder="&lt;question&gt;…\n&lt;variant&gt;…\n&lt;variantright&gt;…"></textarea>' +
        '<div class="row"><button type="button" class="btn btn-sm" id="imRead">' + SP.icon('scan-search') + '<span>' + esc(SP.t('designer.importRead')) + '</span></button></div></div>' +
        '<div id="imRes" aria-live="polite"></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('designer.importAdd'), kind: 'primary', icon: 'plus', onClick: function () {
        if (!found.length) return false;
        var a = Math.max(1, parseInt(SP.$('#imFrom').value, 10) || 1), z = Math.min(found.length, parseInt(SP.$('#imTo').value, 10) || found.length);
        if (a > z) return false;
        SP.bank.addQuestions(found.slice(a - 1, z), bad); step = 1; render();
        SP.toast(SP.t('designer.importDone', { n: z - a + 1 }) + (bad.length ? ' ' + SP.t('bank.withErrors', { n: bad.length }) : ''), bad.length ? 'warning' : 'success');
      } }]
    });
    var show = function (r) {
      found = r.out; bad = r.bad;
      SP.$('#imRes', m.el).innerHTML = !found.length && !bad.length ? '<div class="alert alert-warning">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(SP.t('tester.err.notFound')) + '</div></div>' :
        '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body"><b>' + esc(SP.t('designer.foundQ', { n: found.length })) + (bad.length ? ' · ' + esc(SP.t('bank.withErrors', { n: bad.length })) : '') + '</b>' +
        '<div class="row"><label class="small" for="imFrom">' + esc(SP.t('designer.from')) + '</label><input class="input input-num" type="number" id="imFrom" min="1" max="' + Math.max(1, found.length) + '" value="1">' +
        '<label class="small" for="imTo">' + esc(SP.t('designer.to')) + '</label><input class="input input-num" type="number" id="imTo" min="1" max="' + Math.max(1, found.length) + '" value="' + found.length + '"></div></div></div>';
    };
    SP.$('#imFile', m.el).onchange = function (e) { var f = e.target.files[0]; if (f) E.readFile(f).then(show, function (er) { SP.toast(er.message, 'danger'); }); };
    SP.$('#imRead', m.el).onclick = function () { show(E.parse(SP.$('#imPaste', m.el).value)); };
  }

  function preview() {
    var dz = st().dz; if (!dz.length) return;
    var i = 0, m = SP.modal({ title: SP.t('designer.preview'), size: 'lg', body: '<div id="pvQ"></div>', actions: [
      { label: SP.t('common.prev'), icon: 'arrow-left', close: false, onClick: function () { if (i > 0) { i--; draw(); } return false; } },
      { label: SP.t('common.next'), icon: 'arrow-right', close: false, onClick: function () { if (i < dz.length - 1) { i++; draw(); } return false; } }
    ] });
    var host = SP.$('#pvQ', m.el);
    function draw() {
      var q = dz[i]; if (!q) return;
      host.innerHTML = '';
      var wrap = SP.el('<div class="stack-sm"><p class="small subtle">' + esc(SP.t('designer.pvOf', { i: i + 1, n: dz.length })) + '</p><div id="pvInner"></div></div>');
      host.appendChild(wrap);
      if (E.problem(q)) { SP.$('#pvInner', wrap).innerHTML = '<div class="alert alert-warning">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(E.problem(q)) + '</div></div>'; return; }
      var qq = SP.Quiz(SP.$('#pvInner', wrap), [E.serializeQ(q)], { title: SP.t('designer.preview'), onExit: function () { qq.destroy(); m.close(); } });
    }
    draw();
  }

  SP.views.register('designer', {
    titleKey: 'designer.title',
    mount: function (el) { root = el; render(); },
    show: function () { render(); },
    refresh: render
  });
})();

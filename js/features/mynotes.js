/* =====================================================================
   МОИ КОНСПЕКТЫ: конспекты, которые студент сделал сам (обычно с помощью ИИ по нашему промту).
   • хранятся только на этом устройстве (IndexedDB «studyplay-mynotes»: исходный текст + картинки);
   • показываются тем же экраном, что и конспекты группы (notes.js): «Главное», текст, термины,
     вопросы с «Где в лекции?», задачи, карточки, тест, прогресс;
   • «Добавить конспект»: промт → ответ ИИ → проверка → сохранить (новый или дописать лекции);
   • редактор: правка текста, кнопки-заготовки, вставка картинок, «Скачать файл» (отправить другим),
     «Для сайта» (автор выкладывает конспект всей группе в data/<группа>/notes).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc, F = function () { return SP.myNotesFormat; };
  var IDX = 'sp-mynotes-v1', DB = SP.idb('studyplay-mynotes'), cache = {};

  /* ---------- хранение ---------- */
  function list() { return (SP.store.get(IDX, []) || []).filter(function (m) { return m && m.id; }); }
  function setList(a) { SP.store.set(IDX, a); }
  function metas() { return list().map(function (m) { return { id: m.id, subject: m.subject, short: m.short || m.subject, title: m.title, local: true, file: '' }; }); }
  function rec(id) { return DB.get(id).then(function (r) { if (!r) throw new Error(SP.t('mn.gone')); return r; }); }
  function load(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return rec(id).then(function (r) {
      var p = F().parse(r.source, { images: r.images || {} });
      p.doc.subject = p.doc.subject || r.subject; p.doc.title = r.title || p.doc.title;
      cache[id] = { doc: p.doc, extra: p.extra }; return cache[id];
    });
  }
  function saveRec(id, r, meta) {
    delete cache[id];
    return DB.put(id, r).then(function () {
      var a = list().filter(function (m) { return m.id !== id; });
      a.push({ id: id, subject: meta.subject, short: meta.short || meta.subject, title: meta.title, at: Date.now() });
      setList(a);
      return SP.notes && SP.notes.reload();
    });
  }
  function remove(id) {
    delete cache[id];
    return DB.del(id).then(function () { setList(list().filter(function (m) { return m.id !== id; })); return SP.notes && SP.notes.reload(); });
  }
  function subjectsNames() { return SP.hub.subjectNames(); }
  function newId() { return 'my-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function openNote(id) { location.hash = '#/notes/' + encodeURIComponent(id) + '/0'; }

  /* ---------- проверка текста: что получилось и что не так ---------- */
  function checkHtml(src, images, o) {
    var c = checkCore(src, images);
    if (c.ok && o) { var imp = improveHtml(c.r, o); c.html += imp.html; c.imp = imp; }
    return c;
  }
  function checkCore(src, images) {
    if (!String(src || '').trim()) return { ok: false, html: '<p class="small muted">' + esc(SP.t('mn.waiting')) + '</p>' };
    var r;
    try { r = F().parse(src, { images: images || {} }); } catch (e) { return { ok: false, html: '<div class="alert alert-danger">' + SP.icon('circle-x') + '<div class="alert-body">' + esc(e.message) + '</div></div>' }; }
    var s = r.stats, parts = [
      [SP.t('mn.sLec'), s.lectures], [SP.t('mn.sQs'), s.qs], [SP.t('mn.sTasks'), s.tasks], [SP.t('mn.sCards'), s.cards + s.qs], [SP.t('mn.sTest'), s.tests], [SP.t('mn.sTerms'), s.terms], [SP.t('mn.sSchemes'), s.schemes], [SP.t('mn.sFormulas'), s.formulas], [SP.t('mn.sImgs'), s.imgs]
    ].filter(function (p) { return p[1]; });
    var h = '<div class="mn-ok">' + SP.icon('circle-check') + '<span>' + parts.map(function (p) { return esc(p[0]) + ': <b>' + p[1] + '</b>'; }).join(' · ') + '</span></div>';
    h += '<ul class="mn-lecs">' + r.doc.lectures.map(function (l) { return '<li><b>' + esc(l.label) + '.</b> ' + esc(l.title) + '</li>'; }).join('') + '</ul>';
    if (s.imgsNeeded.length) h += '<p class="small">' + SP.icon('image', 'ic-sm') + ' ' + esc(SP.t('mn.imgsNeed', { n: s.imgsNeeded.length })) + '</p>';
    if (r.warn.length) h += '<details class="mn-warn"><summary>' + SP.icon('triangle-alert', 'ic-sm') + esc(SP.t('mn.warnN', { n: r.warn.length })) + '</summary><ul>' + r.warn.slice(0, 30).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></details>';
    return { ok: true, html: h, r: r };
  }

  /* ---------- шаг 1: короткая анкета → промт (вся логика внутри notes-prompts.js) ---------- */
  var OPT_KEY = 'sp-mynotes-opts';
  function loadOpts(subject) {
    var o = Object.assign({}, SP.NOTES_PROMPTS.defaults, SP.store.get(OPT_KEY, {}) || {});
    o.subject = subject || o.subject || ''; o.bank = '';
    return o;
  }
  function saveOpts(o) { var c = Object.assign({}, o); delete c.bank; delete c.subject; SP.store.set(OPT_KEY, c); }
  function seg(key, opts, cur) {
    return '<div class="segmented seg-wrap" role="group" data-mnopt="' + key + '">' + opts.map(function (x) {
      return '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (String(cur) === String(x[0])) + '">' + esc(SP.t(x[1])) + '</button>';
    }).join('') + '</div>';
  }
  function chip(key, on) { return '<button type="button" class="chip mn-chip" data-mnchip="' + key + '" aria-pressed="' + !!on + '">' + SP.icon(on ? 'check' : 'plus', 'ic-sm') + '<span>' + esc(SP.t('mn.want.' + key)) + '</span></button>'; }
  function qRow(label, ctl, hint) { return '<div class="mn-qrow"><div class="mn-ql">' + esc(SP.t(label)) + (hint ? '<span class="xsmall subtle">' + esc(SP.t(hint)) + '</span>' : '') + '</div><div class="mn-qc">' + ctl + '</div></div>'; }
  function promptBlock(o) {
    return '<div class="mn-step"><div class="mn-step-h"><span class="mn-n">1</span><b>' + esc(SP.t('mn.s1')) + '</b></div>' +
      '<p class="small">' + esc(SP.t('mn.s1Text')) + '</p>' +
      '<div class="mn-quiz">' +
      qRow('mn.q.subject', '<input class="input" data-mnin="subject" value="' + esc(o.subject) + '" placeholder="' + esc(SP.t('mn.q.subjectPh')) + '">') +
      qRow('mn.q.goal', seg('goal', [['rk1', 'mn.goal.rk1'], ['rk2', 'mn.goal.rk2'], ['exam', 'mn.goal.exam'], ['study', 'mn.goal.study']], o.goal)) +
      qRow('mn.q.depth', seg('depth', [['short', 'mn.depth.short'], ['medium', 'mn.depth.medium'], ['full', 'mn.depth.full']], o.depth), 'mn.q.depthHint') +
      qRow('mn.q.want', chip('qs', o.qs) + chip('test', o.test) + chip('cards', o.cards), 'mn.q.wantHint') +
      qRow('mn.q.tasks', seg('tasks', [['auto', 'mn.tasks.auto'], ['yes', 'mn.tasks.yes'], ['no', 'mn.tasks.no']], o.tasks), 'mn.q.tasksHint') +
      '<div class="mn-testsrc"' + (o.test ? '' : ' hidden') + '>' + qRow('mn.q.testSrc', seg('testSrc', [['ai', 'mn.src.ai'], ['mine', 'mn.src.mine'], ['both', 'mn.src.both']], o.testSrc)) +
      '<div class="mn-bank"' + (o.testSrc === 'ai' ? ' hidden' : '') + '><textarea class="textarea mono xsmall" data-mnin="bank" rows="5" placeholder="' + esc(SP.t('mn.bankPh')) + '"></textarea><p class="xsmall subtle mn-bank-n">' + esc(SP.t('mn.bankHint')) + '</p></div></div>' +
      qRow('mn.q.split', seg('split', [['auto', 'mn.split.auto'], ['lectures', 'mn.split.lectures'], ['topics', 'mn.split.topics']], o.split), 'mn.q.splitHint') +
      qRow('mn.q.lang', seg('lang', [['auto', 'mn.lang.auto'], ['ru', 'mn.lang.ru'], ['kk', 'mn.lang.kk']], o.lang)) +
      qRow('mn.q.fmt', seg('fmt', [['markup', 'mn.fmtText'], ['json', 'mn.fmtJson']], o.fmt)) +
      '<div class="mn-fmt-note small" data-mnfmtnote></div>' +
      '</div>' +
      '<div class="row" style="gap:var(--sp-2);flex-wrap:wrap"><button type="button" class="btn btn-primary" data-mncopy>' + SP.icon('copy') + '<span>' + esc(SP.t('mn.copyPrompt')) + '</span></button>' +
      '<button type="button" class="btn btn-ghost" data-mnshow>' + SP.icon('eye') + '<span>' + esc(SP.t('mn.showPrompt')) + '</span></button></div>' +
      '<textarea class="textarea mono xsmall mn-prompt" rows="10" readonly hidden></textarea>' +
      '<details class="mn-tips"><summary>' + esc(SP.t('mn.tipsT')) + '</summary><div data-mntips></div></details></div>';
  }
  function wirePrompt(box, o, onChange) {
    var ta = SP.$('.mn-prompt', box);
    var paint = function () {
      ta.value = SP.NOTES_PROMPTS.build(o);
      SP.$('[data-mnfmtnote]', box).innerHTML = SP.icon(o.fmt === 'json' ? 'file-json' : 'file-text', 'ic-sm') + '<span>' + esc(SP.t(o.fmt === 'json' ? 'mn.fmtJsonNote' : 'mn.fmtTextNote')) + '</span>';
      SP.$('[data-mntips]', box).innerHTML = SP.t(o.fmt === 'json' ? 'mn.tipsJson' : 'mn.tipsText');
      SP.$('.mn-testsrc', box).hidden = !o.test;
      SP.$('.mn-bank', box).hidden = o.testSrc === 'ai';
      var bl = String(o.bank || '').length, bn = SP.$('.mn-bank-n', box);
      if (bn) bn.textContent = bl > 25000 ? SP.t('mn.bankBig') : SP.t('mn.bankHint');
      saveOpts(o); if (onChange) onChange(o);
    };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mnopt] [data-v]');
      if (b) { var g = b.closest('[data-mnopt]'); o[g.getAttribute('data-mnopt')] = b.getAttribute('data-v'); SP.$$('[data-v]', g).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); paint(); return; }
      var c = e.target.closest('[data-mnchip]');
      if (c) { var k = c.getAttribute('data-mnchip'); o[k] = !o[k]; c.setAttribute('aria-pressed', o[k]); c.querySelector('svg').outerHTML = SP.icon(o[k] ? 'check' : 'plus', 'ic-sm'); paint(); }
    });
    SP.$$('[data-mnin]', box).forEach(function (i) { i.addEventListener('input', SP.debounce(function () { o[i.getAttribute('data-mnin')] = i.value; paint(); }, 250)); });
    SP.$('[data-mncopy]', box).onclick = function () {
      if (o.test && o.testSrc !== 'ai' && !String(o.bank || '').trim()) { SP.toast(SP.t('mn.bankEmpty'), 'warning'); var bt = SP.$('[data-mnin="bank"]', box); if (bt) bt.focus(); return; }
      SP.copyText(SP.NOTES_PROMPTS.build(o)).then(function () { SP.toast(SP.t('mn.copied'), 'success', { ms: 6000 }); });
    };
    SP.$('[data-mnshow]', box).onclick = function () { ta.hidden = !ta.hidden; };
    paint();
  }
  /* ---------- «Доработать»: чего не хватает в ответе ИИ — и готовый короткий промт в тот же чат ---------- */
  function improveHtml(r, o) {
    var n = SP.NOTES_PROMPTS.counts[o.depth] || SP.NOTES_PROMPTS.counts.medium, items = [];
    r.stats.per.forEach(function (p, li) {
      var add = function (kind, why) { items.push({ kind: kind, li: li, label: p.label, title: p.title, why: why }); };
      if (o.test && p.tests < n.minTest) add('test', SP.t('mn.imp.test', { n: p.tests }));
      if (o.qs && p.qs < n.minQs) add('qs', SP.t('mn.imp.qs', { n: p.qs }));
      else if (o.qs && p.noWhere) add('where', SP.t('mn.imp.where', { n: p.noWhere }));
      if (o.cards && p.cards < n.minCards) add('cards', SP.t('mn.imp.cards', { n: p.cards }));
      if (o.tasks === 'yes' && !p.tasks) add('tasks', SP.t('mn.imp.tasks'));
      if (!p.sum) add('sum', SP.t('mn.imp.sum'));
      if (p.text < n.minText) add('text', SP.t('mn.imp.text'));
    });
    var rows = items.slice(0, 8).map(function (it, i) {
      return '<div class="mn-imp-row"><span class="grow small"><b>' + esc(it.label) + ':</b> ' + esc(it.why) + '</span><button type="button" class="btn btn-sm" data-mnimp="' + i + '">' + SP.icon('copy', 'ic-sm') + '<span>' + esc(SP.t('mn.impCopy')) + '</span></button></div>';
    }).join('');
    var html = '<div class="mn-imp"><div class="mn-imp-h">' + SP.icon('wand-sparkles', 'ic-sm') + '<b>' + esc(SP.t(items.length ? 'mn.impTitle' : 'mn.impGood')) + '</b></div>' + rows +
      '<div class="mn-imp-row"><span class="grow small muted">' + esc(SP.t('mn.imp.all')) + '</span><button type="button" class="btn btn-sm btn-ghost" data-mnimp="all">' + SP.icon('copy', 'ic-sm') + '<span>' + esc(SP.t('mn.impCopy')) + '</span></button></div>' +
      '<p class="xsmall subtle">' + esc(SP.t('mn.impHow')) + '</p></div>';
    return { html: html, items: items.slice(0, 8) };
  }
  function wireImprove(box, imp, r, o) {
    SP.$$('[data-mnimp]', box).forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-mnimp'), it = k === 'all' ? null : imp.items[+k];
        var txt = SP.NOTES_PROMPTS.improve(it ? it.kind : 'all', it ? { label: it.label, title: it.title } : null, o);
        SP.copyText(txt).then(function () { SP.toast(SP.t('mn.impCopied'), 'success', { ms: 7000 }); });
      };
    });
  }

  /* ---------- «Добавить конспект» ---------- */
  function addDialog(subject, prefill) {
    var opts = loadOpts(subject);
    var mine = list().filter(function (m) { return !subject || SP.lc(m.subject) === SP.lc(subject); });
    var subs = subjectsNames(); if (subject && subs.indexOf(subject) < 0) subs.unshift(subject);
    var body = '<div class="mn">' + promptBlock(opts) +
      '<div class="mn-step"><div class="mn-step-h"><span class="mn-n">2</span><b>' + esc(SP.t('mn.s2')) + '</b></div>' +
      '<p class="small">' + esc(SP.t('mn.s2Text')) + '</p>' +
      '<textarea class="textarea mono small mn-src" id="mnSrc" rows="10" spellcheck="false" placeholder="' + esc(SP.t('mn.srcPh')) + '"></textarea>' +
      '<div class="row" style="gap:var(--sp-2)"><button type="button" class="btn btn-sm" data-mnfile>' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('mn.fromFile')) + '</span></button>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-mnpaste>' + SP.icon('copy', 'ic-sm') + '<span>' + esc(SP.t('mn.paste')) + '</span></button></div>' +
      '<div class="mn-check" id="mnCheck"></div></div>' +
      '<div class="mn-step"><div class="mn-step-h"><span class="mn-n">3</span><b>' + esc(SP.t('mn.s3')) + '</b></div>' +
      '<div class="field"><label class="label" for="mnTitle">' + esc(SP.t('mn.title')) + '</label><input class="input" id="mnTitle" placeholder="' + esc(SP.t('mn.titlePh')) + '"></div>' +
      '<div class="field"><label class="label" for="mnSubj">' + esc(SP.t('mn.subject')) + '</label><select class="input" id="mnSubj">' + subs.map(function (s) { return '<option' + (s === subject ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '<option value="">' + esc(SP.t('mn.otherSubj')) + '</option></select></div>' +
      (mine.length ? '<div class="field"><div class="label">' + esc(SP.t('mn.where')) + '</div><label class="row" style="gap:var(--sp-2)"><input type="radio" name="mnMode" value="new" checked><span>' + esc(SP.t('mn.asNew')) + '</span></label>' +
        mine.map(function (m) { return '<label class="row" style="gap:var(--sp-2)"><input type="radio" name="mnMode" value="' + esc(m.id) + '"><span>' + esc(SP.t('mn.appendTo', { t: m.title })) + '</span></label>'; }).join('') + '</div>' : '') +
      '</div></div>';
    var m = SP.modal({ title: SP.t('mn.addTitle'), size: 'xl', body: body, actions: [
      { label: SP.t('common.cancel') },
      { label: SP.t('mn.saveOpen'), kind: 'primary', icon: 'check', onClick: function () { return save(); } }] });
    var el = m.el, src = SP.$('#mnSrc', el), chk = SP.$('#mnCheck', el), titleIn = SP.$('#mnTitle', el), subjIn = SP.$('#mnSubj', el), last = null;
    wirePrompt(el, opts, function () { if (src && src.value.trim()) run(); });
    var run = function () {
      var c = checkHtml(src.value, null, opts); chk.innerHTML = c.html; last = c.ok ? c.r : null; if (c.imp) wireImprove(chk, c.imp, c.r, opts);
      if (last && !titleIn.value.trim() && last.doc.title) titleIn.placeholder = last.doc.title;
      if (last && last.doc.subject && !subject) { var opt = [].slice.call(subjIn.options).filter(function (o) { return SP.lc(o.value) === SP.lc(last.doc.subject); })[0]; if (opt) subjIn.value = opt.value; }
    };
    src.addEventListener('input', SP.debounce(run, 350));
    if (prefill) { src.value = prefill; run(); } else run();
    SP.$('[data-mnfile]', el).onclick = function () { pickText(function (t) { src.value = t; run(); }); };
    SP.$('[data-mnpaste]', el).onclick = function () { if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { if (t) { src.value = t; run(); } }, function () { src.focus(); SP.toast(SP.t('mn.pasteHand'), 'info'); }); else src.focus(); };
    function save() {
      run();
      if (!last) { src.focus(); SP.toast(SP.t('mn.fixFirst'), 'warning'); return false; }
      var mode = (SP.$('input[name="mnMode"]:checked', el) || {}).value || 'new';
      var subj = subjIn.value || last.doc.subject || subject || SP.t('mn.noSubject');
      if (mode !== 'new') {
        rec(mode).then(function (r) {
          r.source = String(r.source || '').replace(/\s+$/, '') + '\n\n' + stripHeader(src.value);
          var meta = list().filter(function (x) { return x.id === mode; })[0] || { subject: subj, title: r.title };
          return saveRec(mode, r, meta).then(function () { SP.toast(SP.t('mn.appended', { n: last.stats.lectures }), 'success'); openNote(mode); });
        }).catch(function (e) { SP.toast(e.message, 'danger'); });
        return;
      }
      var id = newId(), title = titleIn.value.trim() || last.doc.title || (subj + ' — ' + SP.t('mn.my'));
      saveRec(id, { source: src.value, images: {}, title: title, subject: subj, at: Date.now() }, { subject: subj, title: title, short: subj }).then(function () {
        SP.toast(SP.t('mn.saved'), 'success'); openNote(id);
        if (last.stats.imgsNeeded.length) setTimeout(function () { SP.toast(SP.t('mn.imgsLater', { n: last.stats.imgsNeeded.length }), 'info', { ms: 9000 }); }, 1200);
      }).catch(function (e) { SP.toast(e.message || SP.t('app.fail'), 'danger'); });
    }
    return m;
  }
  /* дописать лекции: шапку «# Конспект:» и «Предмет:» второй раз не повторяем */
  function stripHeader(s) { return String(s || '').replace(/^\s*#\s+(?!#).*\n?/m, function (h) { return /лекция|lecture|дәріс|тема/i.test(h) ? h : ''; }).replace(/^\s*(Предмет|Subject|Пән)\s*:.*\n?/im, ''); }
  function pickText(cb) {
    var inp = SP.el('<input type="file" accept=".txt,.md,.json,.markdown,text/plain,application/json" hidden>'); document.body.appendChild(inp);
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      f.text().then(function (t) {
        /* файл, скачанный из StudyPlay («Скачать файл»), — сразу как конспект с картинками */
        try { var j = JSON.parse(t); if (j && j.format === 'studyplay-notes-file') { importFile(j); return; } } catch (e) { /* обычный текст */ }
        cb(t);
      });
    };
    inp.click();
  }

  /* ---------- обмен: «Скачать файл» и загрузка такого файла ---------- */
  function fileName(t) { return String(t || 'konspekt').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'konspekt'; }
  function exportFile(id) {
    return rec(id).then(function (r) {
      var out = { format: 'studyplay-notes-file', version: 1, title: r.title, subject: r.subject, source: r.source, images: r.images || {} };
      SP.downloadText(JSON.stringify(out), fileName(r.title) + '.studyplay-notes.json', 'application/json');
    });
  }
  function importFile(j) {
    var id = newId();
    return saveRec(id, { source: j.source || '', images: j.images || {}, title: j.title || SP.t('mn.my'), subject: j.subject || '', at: Date.now() }, { subject: j.subject || '', title: j.title || SP.t('mn.my') })
      .then(function () { SP.toast(SP.t('mn.imported', { t: j.title || '' }), 'success'); openNote(id); });
  }
  function importDialog(subject) {
    pickText(function (t) { addDialog(subject, t); });
  }
  /* автор: два файла как у конспектов группы (data/<группа>/notes/<id>.json и <id>.extra.json) + строка для index.json */
  function authorExport(id) {
    return Promise.all([rec(id), load(id)]).then(function (x) {
      var r = x[0], p = x[1], slug = 'my-' + fileName(r.subject || r.title).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Date.now().toString(36).slice(-4);
      /* без служебных полей экрана (_m, _x, _meta) — только сам конспект */
      var doc = JSON.parse(JSON.stringify(p.doc, function (k, v) { return k.charAt(0) === '_' ? undefined : v; })); doc.subject = r.subject; doc.title = r.title;
      SP.downloadText(JSON.stringify(doc), slug + '.json', 'application/json');
      setTimeout(function () { SP.downloadText(JSON.stringify(p.extra), slug + '.extra.json', 'application/json'); }, 400);
      var entry = JSON.stringify({ id: slug, subject: r.subject, short: r.subject, title: r.title, file: slug + '.json' });
      var m = SP.modal({ title: SP.t('mn.authorTitle'), body: SP.t('mn.authorHtml', { dir: 'data/' + (window.SP_GROUP_DIR || '<группа>') + '/notes/' }) +
        '<textarea class="textarea mono xsmall" rows="3" readonly>' + esc(entry) + '</textarea>', actions: [
          { label: SP.t('common.copy'), icon: 'copy', close: false, onClick: function () { SP.copyText(entry).then(function () { SP.toast(SP.t('common.copied'), 'success'); }); return false; } },
          { label: SP.t('common.understood'), kind: 'primary' }] });
      return m;
    });
  }

  /* ---------- редактор ---------- */
  var SNIPS = [
    ['lec', 'book-open', '\n## Лекция N. Название\n### Главное\n- \n### Конспект\n#### Подзаголовок\nТекст.\n### Термины\nТермин — определение\n### Вопросы\n? Вопрос\n= Ответ\n@ Где: Подзаголовок\n### Карточки\nТермин — короткий ответ\n### Тест\n1. Вопрос\n+ верный\n- неверный\n- неверный\n- неверный\n'],
    ['sub', 'type', '\n#### Подзаголовок\n'],
    ['mem', 'sparkles', '\n> Запомни: \n'],
    ['table', 'layers', '\n| Столбец 1 | Столбец 2 |\n|---|---|\n| ... | ... |\n'],
    ['scheme', 'move', '\n```mermaid\nflowchart TD\n  A[Шаг 1] --> B[Шаг 2]\n  B --> C[Шаг 3]\n```\n'],
    ['formula', 'calculator', '\n$$ a^2 + b^2 = c^2 $$\n'],
    ['code', 'code', '\n```cpp\n// код\n```\n'],
    ['q', 'circle-help', '\n? Вопрос\n= Ответ\n@ Где: Подзаголовок\n'],
    ['task', 'square-pen', '\n?? 1 Название задачи\nУсловие\n== Решение и ответ\n'],
    ['card', 'list', '\nТермин — короткий ответ\n'],
    ['test', 'list-checks', '\n1. Вопрос\n+ верный\n- неверный\n- неверный\n- неверный\n'],
    ['img', 'image', '']
  ];
  function edit(id) {
    return rec(id).then(function (r) {
      var images = Object.assign({}, r.images || {}), meta = list().filter(function (x) { return x.id === id; })[0] || {}, edOpts = loadOpts(r.subject);
      var subs = subjectsNames(); if (r.subject && subs.indexOf(r.subject) < 0) subs.unshift(r.subject);
      var body = '<div class="mn mn-ed">' +
        '<div class="row mn-ed-meta"><div class="field grow"><label class="label" for="meT">' + esc(SP.t('mn.title')) + '</label><input class="input" id="meT" value="' + esc(r.title || '') + '"></div>' +
        '<div class="field grow"><label class="label" for="meS">' + esc(SP.t('mn.subject')) + '</label><select class="input" id="meS">' + subs.map(function (s) { return '<option' + (s === r.subject ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="mn-tools" role="toolbar" aria-label="' + esc(SP.t('mn.tools')) + '">' + SNIPS.map(function (s) { return '<button type="button" class="btn btn-sm" data-snip="' + s[0] + '" title="' + esc(SP.t('mn.snip.' + s[0])) + '">' + SP.icon(s[1], 'ic-sm') + '<span>' + esc(SP.t('mn.snip.' + s[0])) + '</span></button>'; }).join('') + '</div>' +
        '<textarea class="textarea mono small mn-src mn-ed-src" id="meSrc" spellcheck="false">' + esc(r.source || '') + '</textarea>' +
        '<div class="mn-phs" id="mePhs"></div><div class="mn-check" id="meCheck"></div>' +
        '<details class="mn-tips"><summary>' + esc(SP.t('mn.cheatT')) + '</summary>' + SP.t('mn.cheatHtml') + '</details></div>';
      var m = SP.modal({ title: SP.t('mn.editTitle'), size: 'xl', body: body, actions: [
        { label: SP.t('common.delete'), icon: 'trash-2', close: false, onClick: function () {
          SP.confirm({ title: SP.t('mn.delTitle'), text: SP.t('mn.delText', { t: r.title }), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) { if (ok) remove(id).then(function () { m.close(); SP.toast(SP.t('mn.deleted'), 'success'); }); });
          return false; } },
        { label: SP.t('mn.download'), icon: 'download', close: false, onClick: function () { persist(false).then(function () { return exportFile(id); }); return false; } },
        { label: SP.t('mn.forSite'), icon: 'users', close: false, onClick: function () { persist(false).then(function () { return authorExport(id); }); return false; } },
        { label: SP.t('mn.saveOpen'), kind: 'primary', icon: 'check', onClick: function () { persist(true).then(function (ok) { if (ok) openNote(id); }); } }] });
      var el = m.el, ta = SP.$('#meSrc', el), chk = SP.$('#meCheck', el), phs = SP.$('#mePhs', el);
      var run = function () {
        var c = checkHtml(ta.value, images, edOpts); chk.innerHTML = c.html; if (c.imp) wireImprove(chk, c.imp, c.r, edOpts);
        /* места под картинки: «Выбрать картинку» прямо здесь */
        var need = []; ta.value.split('\n').forEach(function (l, i) { var mm = l.trim().match(/^\[\[\s*(?:КАРТИНКА|РИСУНОК|ИЗОБРАЖЕНИЕ|ФОТО|СУРЕТ|IMAGE|PICTURE)\s*[:：]\s*(.+?)\s*\]\]$/i); if (mm) need.push({ line: i, cap: mm[1] }); });
        phs.innerHTML = need.length ? '<div class="mn-ph-list"><b class="small">' + esc(SP.t('mn.phTitle')) + '</b>' + need.map(function (n) { return '<div class="mn-ph">' + SP.icon('image', 'ic-sm') + '<span class="grow small">' + esc(n.cap) + '</span><button type="button" class="btn btn-sm" data-phline="' + n.line + '">' + esc(SP.t('mn.pickImg')) + '</button></div>'; }).join('') + '</div>' : '';
      };
      ta.addEventListener('input', SP.debounce(run, 400)); run();
      el.addEventListener('click', function (e) {
        var s = e.target.closest('[data-snip]');
        if (s) {
          var k = s.getAttribute('data-snip');
          if (k === 'img') { pickImage(function (cap, url) { var n = nextImg(images); images[n] = url; insert(ta, '\n![' + cap + '](img:' + n + ')\n'); run(); }); return; }
          insert(ta, SNIPS.filter(function (x) { return x[0] === k; })[0][2]); run(); return;
        }
        var p = e.target.closest('[data-phline]');
        if (p) { var line = +p.getAttribute('data-phline'); pickImage(function (cap, url) { var n = nextImg(images); images[n] = url; var L = ta.value.split('\n'); var c0 = (L[line].match(/[:：]\s*(.+?)\s*\]\]/) || [])[1] || cap; L[line] = '![' + c0 + '](img:' + n + ')'; ta.value = L.join('\n'); run(); }); }
      });
      function persist(close) {
        var c = checkCore(ta.value, images);
        if (!c.ok) { SP.toast(SP.t('mn.fixFirst'), 'warning'); return Promise.resolve(false); }
        /* картинки, которых в тексте больше нет, не храним */
        Object.keys(images).forEach(function (k) { if (ta.value.indexOf('(img:' + k + ')') < 0) delete images[k]; });
        var t = SP.$('#meT', el).value.trim() || r.title, sj = SP.$('#meS', el).value || r.subject;
        r.source = ta.value; r.images = images; r.title = t; r.subject = sj;
        return saveRec(id, r, { subject: sj, title: t, short: sj }).then(function () { if (!close) SP.toast(SP.t('settings.saved'), 'success'); return true; });
      }
      return m;
    });
  }
  function insert(ta, text) {
    var a = ta.selectionStart || ta.value.length, b = ta.selectionEnd || a;
    ta.setRangeText(text, a, b, 'end'); ta.focus(); ta.dispatchEvent(new Event('input'));
  }
  function nextImg(images) { var n = 1; while (images[n]) n++; return n; }
  /* картинка с устройства: уменьшаем до 1600 px по длинной стороне, чтобы конспект не разрастался */
  function pickImage(cb) {
    var inp = SP.el('<input type="file" accept="image/*" hidden>'); document.body.appendChild(inp);
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          cb(f.name.replace(/\.[^.]+$/, ''), /png|gif|svg/i.test(f.type) && f.size < 400000 ? rd.result : c.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = function () { SP.toast(SP.t('mn.imgBad'), 'danger'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  }

  SP.myNotes = { metas: metas, load: load, list: list, add: addDialog, importDialog: importDialog, edit: edit, exportFile: exportFile, remove: remove, authorExport: authorExport };
})();

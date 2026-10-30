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

  /* ---------- проверка текста: что получилось и что не так ---------- */  /* ---------- проверка текста: что получилось и что не так ---------- */
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

  /* ---------- КОНСТРУКТОР КОНСПЕКТА: шаг за шагом ----------
     1) Конспект (обязательно) → потом по желанию: Вопросы, Тест, Карточки, Задачи.
     Каждый шаг — короткий промт про одно дело (notes-prompts.js), ответ вставляется и сразу проверяется,
     «Добавить» дописывает его к черновику; по заголовкам «## Лекция N» сайт кладёт его в нужную лекцию.
     Черновик не теряется: хранится, пока конспект не сохранён. */
  var OPT_KEY = 'sp-mynotes-opts2', DRAFT_KEY = 'sp-mynotes-draft';
  var STEPS = [['konspekt', 'book-open'], ['qs', 'circle-help'], ['test', 'list-checks'], ['cards', 'layers'], ['tasks', 'square-pen']];
  function loadOpts() { return Object.assign({}, SP.NOTES_PROMPTS.defaults, SP.store.get(OPT_KEY, {}) || {}, { bank: '' }); }
  function saveOpts(o) { var c = Object.assign({}, o); delete c.bank; SP.store.set(OPT_KEY, c); }
  function seg(key, opts, cur) {
    return '<div class="segmented seg-wrap" role="group" data-mnopt="' + key + '">' + opts.map(function (x) {
      return '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (String(cur) === String(x[0])) + '">' + esc(/^mn\./.test(x[1]) ? SP.t(x[1]) : x[1]) + '</button>';
    }).join('') + '</div>';
  }
  function qRow(label, ctl, hint) { return '<div class="mn-qrow"><div class="mn-ql">' + esc(SP.t(label)) + (hint ? '<span class="xsmall subtle">' + esc(SP.t(hint)) + '</span>' : '') + '</div><div class="mn-qc">' + ctl + '</div></div>'; }
  function parseSafe(src, images) { try { return F().parse(src, { images: images || {} }); } catch (e) { return null; } }
  function countsOf(r) {
    var c = { lectures: 0, text: 0, qs: 0, test: 0, cards: 0, tasks: 0 }; if (!r) return c;
    c.lectures = r.stats.lectures;
    r.stats.per.forEach(function (p) { if (p.parts) c.text++; c.qs += p.qs; c.test += p.tests; c.cards += p.cards; c.tasks += p.tasks; });
    return c;
  }
  /* только сам конспект (без вопросов/теста/карточек/задач) — для промта в новом чате */
  function konspektOnly(src) {
    var skip = false;
    return String(src).split('\n').filter(function (l) {
      if (/^\s*##\s/.test(l)) skip = false;
      if (/^\s*###\s/.test(l)) skip = /^\s*###\s*(Вопросы|Тест|Карточки|Задачи|Сұрақтар|Тапсырмалар|Questions|Test|Cards|Tasks)/i.test(l);
      return !skip;
    }).join('\n').trim();
  }
  /* лишнее вокруг ответа ИИ: обёртка ```markdown, «Вот ваш конспект:» перед первым заголовком, «ПРОДОЛЖЕНИЕ СЛЕДУЕТ» */
  function cleanChunk(s) {
    var L = String(s || '').replace(/\r/g, '').trim().split('\n'), first = -1;
    for (var i = 0; i < Math.min(L.length, 4); i++) if (/^\s*(#|```)/.test(L[i])) { first = i; break; }
    if (first > 0 && L.slice(0, first).every(function (l) { return l.length < 160 && !/^\s*([?=+\-@]|\d+\.)\s/.test(l); })) L = L.slice(first);
    L = L.filter(function (l) { return !/^\s*\**\s*продолжение следует\s*\**\s*$/i.test(l); });
    if (/^\s*```(markdown|md|text)?\s*$/i.test(L[0] || '')) {
      L.shift();
      while (L.length && !L[L.length - 1].trim()) L.pop();
      if (/^\s*```\s*$/.test(L[L.length - 1] || '')) L.pop();
    }
    return L.join('\n').trim();
  }
  function builder(subject, existingId, prefill) {
    var o = loadOpts(), st = { src: '', images: {}, step: 'konspekt', id: existingId || null, title: '', subject: subject || '' };
    var start = Promise.resolve();
    if (existingId) start = rec(existingId).then(function (r) { st.src = r.source || ''; st.images = r.images || {}; st.title = r.title || ''; st.subject = r.subject || st.subject; st.step = 'next'; });
    else { var d = SP.store.get(DRAFT_KEY, null); if (d && d.src && (Date.now() - d.at) < 7 * 864e5 && (!subject || SP.lc(d.subject || '') === SP.lc(subject))) { st.src = d.src; st.subject = d.subject || st.subject; st.restored = true; } }
    return start.then(open, function (e) { SP.toast(e.message, 'danger'); });

    function open() {
      var parsed = null;
      var m = SP.modal({ title: SP.t(existingId ? 'mn.bTitleMore' : 'mn.bTitle'), size: 'xl', body: '<div class="mnb"><nav class="mnb-steps" id="mnbSteps" aria-label="' + esc(SP.t('mn.bSteps')) + '"></nav><div class="mnb-main" id="mnbMain"></div></div>', actions: [
        { label: SP.t('common.close') },
        { label: SP.t('mn.bSave'), kind: 'primary', icon: 'check', onClick: function () { return save(); } }] });
      var el = m.el, stepsEl = SP.$('#mnbSteps', el), main = SP.$('#mnbMain', el);
      var keepDraft = function () { if (!existingId) SP.store.set(DRAFT_KEY, { src: st.src, subject: st.subject, at: Date.now() }); };
      var reparse = function () { parsed = st.src.trim() ? parseSafe(st.src, st.images) : null; };
      var done = function (k) { var c = countsOf(parsed); return k === 'konspekt' ? c.text > 0 : c[k] > 0; };
      var lecs = function () { return parsed ? parsed.doc.lectures.map(function (l) { return { label: l.label, title: l.title }; }) : []; };

      function paintSteps() {
        var c = countsOf(parsed);
        stepsEl.innerHTML = STEPS.map(function (s) {
          var k = s[0], ok = done(k), locked = k !== 'konspekt' && !done('konspekt');
          var sub = ok ? (k === 'konspekt' ? SP.t('mn.bLecN', { n: c.lectures }) : SP.t('mn.bItemsN', { n: c[k] })) : SP.t(k === 'konspekt' ? 'mn.bNeed' : 'mn.bOpt');
          return '<button type="button" class="mnb-step' + (st.step === k ? ' cur' : '') + (ok ? ' ok' : '') + '" data-step="' + k + '"' + (locked ? ' disabled' : '') + (st.step === k ? ' aria-current="step"' : '') + '>' +
            '<span class="mnb-ic">' + SP.icon(ok ? 'check' : s[1], 'ic-sm') + '</span><span class="mnb-st"><b>' + esc(SP.t('mn.step.' + k)) + '</b><small>' + esc(sub) + '</small></span></button>';
        }).join('');
      }
      function stepOpts(k) {
        if (k === 'konspekt') return qRow('mn.q.subject', '<input class="input" data-mnin="subject" value="' + esc(st.subject) + '" placeholder="' + esc(SP.t('mn.q.subjectPh')) + '">') +
          qRow('mn.q.depth', seg('depth', [['short', 'mn.depth.short'], ['medium', 'mn.depth.medium'], ['full', 'mn.depth.full']], o.depth), 'mn.q.depthHint') +
          qRow('mn.q.split', seg('split', [['auto', 'mn.split.auto'], ['lectures', 'mn.split.lectures'], ['topics', 'mn.split.topics']], o.split)) +
          qRow('mn.q.lang', seg('lang', [['auto', 'mn.lang.auto'], ['ru', 'mn.lang.ru'], ['kk', 'mn.lang.kk']], o.lang));
        if (k === 'qs') return qRow('mn.bHowMany', seg('nQs', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], o.nQs), 'mn.bPerLec');
        if (k === 'cards') return qRow('mn.bHowMany', seg('nCards', [[10, '10'], [15, '15'], [20, '20'], [30, '30']], o.nCards), 'mn.bPerLec');
        if (k === 'tasks') return qRow('mn.bHowMany', seg('nTasks', [[3, '3'], [5, '5'], [8, '8'], [10, '10']], o.nTasks), 'mn.bPerLec');
        return qRow('mn.q.testSrc', seg('testSrc', [['ai', 'mn.src.ai'], ['mine', 'mn.src.mine'], ['both', 'mn.src.both']], o.testSrc)) +
          '<div class="mnb-n"' + (o.testSrc === 'mine' ? ' hidden' : '') + '>' + qRow('mn.bHowMany', seg('nTest', [[10, '10'], [15, '15'], [20, '20'], [30, '30']], o.nTest), 'mn.bPerLec') + '</div>' +
          '<div class="mn-bank"' + (o.testSrc === 'ai' ? ' hidden' : '') + '><textarea class="textarea mono xsmall" data-mnin="bank" rows="5" placeholder="' + esc(SP.t('mn.bankPh')) + '">' + esc(o.bank || '') + '</textarea><p class="xsmall subtle">' + esc(SP.t('mn.bankHint')) + '</p></div>';
      }
      function paintNext() {
        var c = countsOf(parsed);
        main.innerHTML = '<div class="mnb-done">' + SP.icon('circle-check') + '<div><b>' + esc(SP.t('mn.bNextT')) + '</b><div class="small muted">' +
          esc(SP.t('mn.bNextSum', { l: c.lectures, q: c.qs, t: c.test, c: c.cards, z: c.tasks })) + '</div></div></div>' +
          '<p class="small">' + esc(SP.t('mn.bNextText')) + '</p>' +
          '<div class="mnb-next">' + STEPS.slice(1).map(function (s) {
            return '<button type="button" class="btn' + (done(s[0]) ? ' btn-ghost' : '') + '" data-go="' + s[0] + '">' + SP.icon(done(s[0]) ? 'check' : 'plus') + '<span>' + esc(SP.t('mn.step.' + s[0])) + '</span></button>';
          }).join('') + '<button type="button" class="btn btn-ghost" data-go="konspekt">' + SP.icon('book-open') + '<span>' + esc(SP.t('mn.bMoreLec')) + '</span></button></div>' +
          '<button type="button" class="btn btn-primary btn-block mnb-savebig" data-mnbsave>' + SP.icon('check') + '<span>' + esc(SP.t('mn.bSaveNow')) + '</span></button>';
        SP.$$('[data-go]', main).forEach(function (b) { b.onclick = function () { st.step = b.getAttribute('data-go'); paintSteps(); paintMain(); }; });
        SP.$('[data-mnbsave]', main).onclick = save;
      }
      function paintMain() {
        if (st.step === 'next') return paintNext();
        var k = st.step, ic = STEPS.filter(function (s) { return s[0] === k; })[0][1];
        main.innerHTML = '<div class="mnb-h">' + SP.icon(ic) + '<b>' + esc(SP.t('mn.step.' + k)) + '</b></div>' +
          '<p class="small">' + esc(SP.t('mn.bText.' + k)) + '</p>' +
          '<div class="mn-quiz">' + stepOpts(k) + '</div>' +
          '<div class="mnb-copy"><button type="button" class="btn btn-primary" data-mnbcopy>' + SP.icon('copy') + '<span>' + esc(SP.t(k === 'konspekt' ? 'mn.bCopy1' : 'mn.bCopyN')) + '</span></button>' +
          (k !== 'konspekt' ? '<label class="mnb-ctx xsmall"><input type="checkbox" data-mnbctx' + (o.withKonspekt ? ' checked' : '') + '><span>' + esc(SP.t('mn.bNewChat')) + '</span></label>' : '') + '</div>' +
          '<div class="field"><label class="label" for="mnbAns">' + esc(SP.t('mn.bPaste')) + '</label><textarea class="textarea mono small mn-src" id="mnbAns" rows="8" spellcheck="false" placeholder="' + esc(SP.t('mn.bPastePh.' + k)) + '"></textarea>' +
          '<div class="row" style="gap:6px;margin-top:6px"><button type="button" class="btn btn-sm" data-mnbfile>' + SP.icon('upload', 'ic-sm') + '<span>' + esc(SP.t('mn.fromFile')) + '</span></button>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-mnbclip>' + SP.icon('copy', 'ic-sm') + '<span>' + esc(SP.t('mn.paste')) + '</span></button></div></div>' +
          '<div class="mn-check" id="mnbCheck"></div>' +
          '<div class="mnb-acts"><button type="button" class="btn btn-primary" data-mnbadd disabled>' + SP.icon('plus') + '<span>' + esc(SP.t(k === 'konspekt' && done('konspekt') ? 'mn.bAddMore' : 'mn.bAdd')) + '</span></button></div>' +
          '<details class="mn-tips"><summary>' + esc(SP.t('mn.tipsT')) + '</summary>' + SP.t('mn.bTips') + '</details>';
        wireMain(k);
      }
      function wireMain(k) {
        var ans = SP.$('#mnbAns', main), chk = SP.$('#mnbCheck', main), add = SP.$('[data-mnbadd]', main), good = null;
        SP.$$('[data-mnopt] [data-v]', main).forEach(function (b) {
          b.onclick = function () {
            var g = b.closest('[data-mnopt]'), key = g.getAttribute('data-mnopt'), v = b.getAttribute('data-v');
            o[key] = /^n[A-Z]/.test(key) ? +v : v; saveOpts(o);
            SP.$$('[data-v]', g).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
            if (key === 'testSrc') { SP.$('.mn-bank', main).hidden = v === 'ai'; SP.$('.mnb-n', main).hidden = v === 'mine'; }
          };
        });
        SP.$$('[data-mnin]', main).forEach(function (i) { i.oninput = function () { var key = i.getAttribute('data-mnin'); if (key === 'subject') { st.subject = i.value; keepDraft(); } else o[key] = i.value; }; });
        var cx = SP.$('[data-mnbctx]', main); if (cx) cx.onchange = function () { o.withKonspekt = cx.checked; saveOpts(o); };
        SP.$('[data-mnbcopy]', main).onclick = function () {
          if (k === 'test' && o.testSrc !== 'ai' && !String(o.bank || '').trim()) { SP.toast(SP.t('mn.bankEmpty'), 'warning'); var bt = SP.$('[data-mnin="bank"]', main); if (bt) bt.focus(); return; }
          var konsp = o.withKonspekt && parsed ? konspektOnly(st.src) : '';
          SP.copyText(SP.NOTES_PROMPTS.build(k, Object.assign({}, o, { subject: st.subject }), { lectures: lecs(), konspekt: konsp })).then(function () { SP.toast(SP.t(k === 'konspekt' ? 'mn.bCopied1' : 'mn.bCopiedN'), 'success', { ms: 7000 }); });
        };
        var check = function () {
          var t = ans.value.trim(); good = null; add.disabled = true;
          if (!t) { chk.innerHTML = ''; return; }
          var cut = /продолжение следует/i.test(t.split('\n').slice(-3).join('\n'));
          t = cleanChunk(t);
          var r = parseSafe(t, st.images), msg = [], warn = [];
          if (!r) { chk.innerHTML = '<div class="alert alert-danger">' + SP.icon('circle-x') + '<div class="alert-body">' + esc(SP.t('mn.bBad')) + '</div></div>'; return; }
          var c = countsOf(r), have = {}; lecs().forEach(function (l) { have[SP.lc(l.label)] = 1; });
          var count = k === 'konspekt' ? c.text : c[k], cont = false;
          /* продолжение после «дальше» — без заголовка лекции: дописывается в конец последней лекции */
          if (parsed && !/^\s*##\s/m.test(t)) {
            count = 0;
            var both = parseSafe(st.src.replace(/\s+$/, '') + '\n' + t, st.images), size = function (x) { return x ? x.stats.per.reduce(function (a, p) { return a + (p.text || 0); }, 0) : 0; };
            var grow = k === 'konspekt' ? size(both) - size(parsed) : (both ? countsOf(both)[k] - countsOf(parsed)[k] : 0);
            if (both && both.stats.lectures === parsed.stats.lectures && grow > 0) { cont = true; count = grow; r = both; }
          }
          if (!count) { chk.innerHTML = '<div class="alert alert-warning">' + SP.icon('triangle-alert') + '<div class="alert-body">' + esc(SP.t('mn.bNone.' + k)) + '</div></div>'; return; }
          if (cont) msg.push(SP.t('mn.bCont', { l: (function (l) { return l.label + '. ' + l.title; })(parsed.doc.lectures[parsed.doc.lectures.length - 1]) }) + (k !== 'konspekt' ? ' ' + SP.t('mn.bFound.' + k, { n: count }) : ''));
          else if (k === 'konspekt') msg.push(SP.t('mn.bFoundLec', { n: c.text }) + ' — ' + r.doc.lectures.map(function (l) { return l.label + '. ' + l.title; }).join('; '));
          else {
            msg.push(SP.t('mn.bFound.' + k, { n: count }));
            r.stats.per.forEach(function (p) { if (!have[SP.lc(p.label)]) warn.push(SP.t('mn.bNewLec', { l: p.label + '. ' + p.title })); });
            if (k === 'qs') { var nw = r.stats.per.reduce(function (a, p) { return a + p.noWhere; }, 0); if (nw) warn.push(SP.t('mn.imp.where', { n: nw })); }
          }
          if (r.stats.imgsNeeded.length) warn.push(SP.t('mn.imgsNeed', { n: r.stats.imgsNeeded.length }));
          r.warn.forEach(function (w) { if (k === 'konspekt' || !/нет текста/.test(w)) warn.push(w); });
          chk.innerHTML = '<div class="mn-ok">' + SP.icon('circle-check') + '<span>' + msg.map(esc).join('<br>') + '</span></div>' +
            (cut ? '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body">' + esc(SP.t('mn.bCut')) + '<div class="alert-actions"><button type="button" class="btn btn-sm" data-mnbmore>' + SP.icon('copy', 'ic-sm') + '<span>' + esc(SP.t('mn.bCopyMore')) + '</span></button></div></div></div>' : '') +
            (warn.length ? '<details class="mn-warn"' + (warn.length < 3 ? ' open' : '') + '><summary>' + SP.icon('triangle-alert', 'ic-sm') + esc(SP.t('mn.warnN', { n: warn.length })) + '</summary><ul>' + warn.slice(0, 20).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></details>' : '');
          var mb = SP.$('[data-mnbmore]', chk); if (mb) mb.onclick = function () { SP.copyText(SP.NOTES_PROMPTS.more()).then(function () { SP.toast(SP.t('mn.bMoreCopied'), 'success'); }); };
          good = t; add.disabled = false;
        };
        ans.addEventListener('input', SP.debounce(check, 300));
        SP.$('[data-mnbfile]', main).onclick = function () { pickText(function (t) { ans.value = t; check(); }); };
        SP.$('[data-mnbclip]', main).onclick = function () { if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { if (t) { ans.value = t; check(); } }, function () { ans.focus(); SP.toast(SP.t('mn.pasteHand'), 'info'); }); else ans.focus(); };
        add.onclick = function () {
          if (!good) return;
          var chunk = cleanChunk(good);
          st.src = st.src.trim() ? st.src.replace(/\s+$/, '') + '\n\n' + stripHeader(chunk) : chunk;
          ans.value = ''; good = null;
          reparse(); keepDraft();
          if (k === 'konspekt' && !st.subject && parsed && parsed.doc.subject) st.subject = parsed.doc.subject;
          SP.toast(SP.t('mn.bAdded'), 'success');
          /* дальше студент сам выбирает кнопками: «+ Вопросы», «+ Тест»… */
          st.step = 'next'; paintSteps(); paintMain();
        };
      }
      stepsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (!b || b.disabled) return; st.step = b.getAttribute('data-step'); paintSteps(); paintMain(); });
      function save() {
        reparse();
        if (!done('konspekt')) { SP.toast(SP.t('mn.bSaveNeed'), 'warning'); return false; }
        var subj = (st.subject || parsed.doc.subject || SP.t('mn.noSubject')).trim();
        var title = st.title || parsed.doc.title || (subj + ' — ' + SP.t('mn.my'));
        var id = st.id || newId();
        saveRec(id, { source: st.src, images: st.images, title: title, subject: subj, at: Date.now() }, { subject: subj, title: title, short: subj }).then(function () {
          if (!existingId) SP.store.del(DRAFT_KEY);
          m.close(); SP.toast(SP.t('mn.saved'), 'success'); openNote(id);
          if (parsed.stats.imgsNeeded.length) setTimeout(function () { SP.toast(SP.t('mn.imgsLater', { n: parsed.stats.imgsNeeded.length }), 'info', { ms: 9000 }); }, 1200);
        }).catch(function (e) { SP.toast(e.message || SP.t('app.fail'), 'danger'); });
        return false;
      }
      reparse();
      if (st.restored && done('konspekt') && !prefill) st.step = 'next';
      if (st.step === 'next' && !done('konspekt')) st.step = 'konspekt';
      paintSteps(); paintMain();
      if (prefill) { var a0 = SP.$('#mnbAns', main); a0.value = prefill; a0.dispatchEvent(new Event('input')); }
      if (st.restored) SP.toast(SP.t('mn.bRestored'), 'info', { ms: 6000 });
      return m;
    }
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
    pickText(function (t) { builder(subject, null, t); });
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
      var images = Object.assign({}, r.images || {}), meta = list().filter(function (x) { return x.id === id; })[0] || {};
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
        var c = checkCore(ta.value, images); chk.innerHTML = c.html;
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

  SP.myNotes = { metas: metas, load: load, list: list, add: function (s) { return builder(s); }, more: function (id) { return builder(null, id); }, importDialog: importDialog, edit: edit, exportFile: exportFile, remove: remove, authorExport: authorExport };
})();

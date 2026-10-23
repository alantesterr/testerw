/* =====================================================================
   ПРОХОЖДЕНИЕ ТЕСТА (один компонент для Тестера и тестов из папок).
   SP.Quiz(контейнер, вопросы, { title, onExit }) — запускает тест.
   Есть: навигация по номерам, один/несколько ответов, ввод с клавиатуры,
   перевод, поиск в Google, работа над ошибками, итог.
   Клавиши: 1–9 — выбрать вариант, Enter — ответить / дальше.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc;

  SP.Quiz = function (host, questions, opts) {
    opts = opts || {};
    var fresh = function (arr) { return SP.shuffle(arr).map(function (x) { return Object.assign({}, x, { opts: SP.shuffle(x.opts || []) }); }); };
    var full = questions.map(function (x) { return Object.assign({}, x, { opts: (x.opts || []).map(function (o) { return Object.assign({}, o); }) }); });
    var quiz = fresh(full), ans = quiz.map(function () { return null; }), cur = 0, sel = new Set(), round = 1, tr = {}, trOn = {}, finished = false;

    function reset(list) { quiz = list; ans = quiz.map(function () { return null; }); cur = 0; sel = new Set(); tr = {}; trOn = {}; finished = false; show(); }

    function navHtml() {
      var btn = function (i) { var a = ans[i]; return '<button type="button" class="qn' + (a ? (a.ok ? ' ok' : ' bad') : '') + (i === cur ? ' cur' : '') + '" data-i="' + i + '" aria-label="' + esc(SP.t('quiz.goTo', { n: i + 1 })) + '"' + (i === cur ? ' aria-current="step"' : '') + '>' + (i + 1) + '</button>'; };
      if (quiz.length <= 50) return quiz.map(function (_, i) { return btn(i); }).join('');
      var set = {}; [0, 1, quiz.length - 2, quiz.length - 1, cur, cur - 1, cur + 1, cur - 2, cur + 2].forEach(function (i) { if (i >= 0 && i < quiz.length) set[i] = 1; });
      var out = [], prev = -1;
      Object.keys(set).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) { if (prev >= 0 && i - prev > 1) out.push('<span class="qn-gap">…</span>'); out.push(btn(i)); prev = i; });
      return out.join('');
    }

    function show() {
      finished = false;
      var q = quiz[cur], a = ans[cur], kb = E.isKb(q), multi = !kb && q.n > 1, done = ans.filter(Boolean).length;
      var T = trOn[cur] && tr[cur];
      var optsHtml = (q.opts || []).map(function (o, i) {
        var c = ''; if (a) { if (o.right) c = 'right'; else if (a.sel.indexOf(i) >= 0) c = 'wrong'; } else if (sel.has(i)) c = 'sel';
        var on = a ? (o.right || a.sel.indexOf(i) >= 0) : sel.has(i);
        var mark = a ? (o.right ? SP.icon('check') : (a.sel.indexOf(i) >= 0 ? SP.icon('x') : '')) : (on ? SP.icon('check') : '');
        return '<button type="button" class="opt ' + c + '" data-o="' + i + '"' + (a ? ' disabled' : '') + ' aria-pressed="' + on + '">' +
          '<span class="opt-mark ' + (multi ? 'sq' : 'rd') + '" aria-hidden="true">' + mark + '</span>' +
          '<span class="opt-key" aria-hidden="true">' + (i < 9 ? i + 1 : '') + '</span>' +
          '<span class="opt-text">' + E.richHtml(T ? T.o[i] : o.t, true) + E.img(o.img, 'opt-img') + (T ? '<span class="opt-orig">' + esc(o.t) + '</span>' : '') + '</span></button>';
      }).join('');
      var kbHtml = kb ? '<div class="field"><label class="label" for="kbAns">' + esc(SP.t('quiz.typeAnswer')) + '</label><input class="input kb-input" id="kbAns" autocomplete="off" value="' + esc(a ? a.typed : '') + '" placeholder="' + esc(SP.t('quiz.yourAnswer')) + '"' + (a ? ' disabled' : '') + '><span class="hint">' + esc(SP.t('quiz.kbHint')) + '</span></div>' : '';
      var verdict = a ? '<div class="alert ' + (a.ok ? 'alert-success' : 'alert-danger') + '">' + SP.icon(a.ok ? 'circle-check' : 'circle-x') + '<div class="alert-body"><b>' + esc(SP.t(a.ok ? 'quiz.right' : 'quiz.wrong')) + '</b>' + (kb && !a.ok ? '<span>' + esc(SP.t('quiz.correctIs', { a: q.answer })) + '</span>' : '') + '</div></div>' : '';
      var typeLabel = kb ? SP.t('quiz.kindKb') : multi ? SP.t('quiz.kindMulti', { n: q.n }) : SP.t('quiz.kindSingle');
      var primary = '';
      if (!a && kb) primary = '<button type="button" class="btn btn-primary" id="qCheck">' + SP.icon('check') + '<span>' + esc(SP.t('quiz.check')) + '</span></button>';
      else if (!a && multi) primary = '<button type="button" class="btn btn-primary" id="qOk"' + (sel.size ? '' : ' disabled') + '>' + SP.icon('check') + '<span>' + esc(SP.t('quiz.answer')) + '</span></button>';
      var nextBtn = cur < quiz.length - 1
        ? '<button type="button" class="btn ' + (a || (!kb && !multi) ? 'btn-primary' : '') + '" id="qNext">' + esc(SP.t('quiz.next')) + SP.icon('arrow-right') + '</button>'
        : '<button type="button" class="btn ' + (a ? 'btn-success' : '') + '" id="qFin">' + SP.icon('circle-check') + '<span>' + esc(SP.t('quiz.finish')) + '</span></button>';

      host.innerHTML = '<div class="quiz stack">' +
        '<section class="card card-flat quiz-top"><div class="row-between"><div class="stack-sm"><b>' + esc(opts.title || SP.t('nav.tester')) + '</b>' +
        '<span class="small muted">' + (round > 1 ? esc(SP.t('quiz.round', { n: round })) + ' · ' : '') + esc(SP.t('quiz.progress', { i: cur + 1, n: quiz.length, d: done })) + '</span></div>' +
        '<button type="button" class="btn btn-ghost" id="qExit">' + SP.icon('x') + '<span>' + esc(SP.t('quiz.exit')) + '</span></button></div>' +
        '<div class="progress"><i style="width:' + Math.round(done / quiz.length * 100) + '%"></i></div>' +
        '<nav class="qn-list" aria-label="' + esc(SP.t('quiz.nav')) + '">' + navHtml() + '</nav></section>' +
        '<section class="card quiz-card"><div class="row-between"><span class="badge">' + esc(typeLabel) + '</span>' +
        '<div class="row quiz-tools">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="qLupa" data-tip="' + esc(SP.t('quiz.searchTip')) + '">' + SP.icon('search') + '<span>' + esc(SP.t('quiz.search')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="qSuper" data-tip="' + esc(SP.t('quiz.superTip')) + '">' + SP.icon('scan-search') + '<span>' + esc(SP.t('quiz.super')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="qAi" data-tip="' + esc(SP.t('quiz.aiTip')) + '">' + SP.icon('sparkles') + '<span>' + esc(SP.t('quiz.ai')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="qTr">' + SP.icon('languages') + '<span>' + esc(T ? SP.t('quiz.original') : SP.t('quiz.translate')) + '</span></button>' +
        '</div></div>' +
        '<div class="q-text"><span class="q-num">' + (cur + 1) + '.</span>' + E.richHtml(T ? T.q : q.q) + '</div>' + E.img(q.img) +
        (T ? '<div class="q-orig small subtle">' + E.richHtml(q.q, true) + '</div>' : '') +
        (kb ? kbHtml : '<div class="opts" role="group">' + optsHtml + '</div>') + verdict + '</section>' +
        '<div class="quiz-foot"><button type="button" class="btn" id="qBack"' + (cur === 0 ? ' disabled' : '') + '>' + SP.icon('arrow-left') + '<span>' + esc(SP.t('common.back')) + '</span></button>' +
        '<div class="row">' + primary + nextBtn + '</div></div></div>';
      wire(q, a, kb, multi);
    }

    function wire(q, a, kb, multi) {
      var $ = function (s) { return SP.$(s, host); };
      SP.$$('.qn', host).forEach(function (b) { b.onclick = function () { cur = +b.getAttribute('data-i'); sel = new Set(); show(); }; });
      SP.$$('.opt', host).forEach(function (b) { b.onclick = function () { pick(+b.getAttribute('data-o')); }; });
      $('#qExit').onclick = exit;
      $('#qBack').onclick = function () { if (cur > 0) { cur--; sel = new Set(); show(); } };
      var nx = $('#qNext'); if (nx) nx.onclick = function () { cur++; sel = new Set(); show(); };
      var fn = $('#qFin'); if (fn) fn.onclick = finish;
      var ok = $('#qOk'); if (ok) ok.onclick = function () { submitSel(Array.from(sel)); };
      var ck = $('#qCheck'); if (ck) ck.onclick = submitKb;
      var ki = $('#kbAns');
      if (ki) { ki.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!ans[cur]) submitKb(); else if (nx) nx.click(); else if (fn) fn.click(); } }; if (!a) setTimeout(function () { ki.focus(); }, 30); }
      $('#qLupa').onclick = function () { E.google(q.q.replace(/```\w*/g, '') + ' ' + SP.t('quiz.answerWord')); };
      $('#qSuper').onclick = function () { E.google(E.aiPrompt(q)); };
      $('#qAi').onclick = function () { E.google(E.aiPrompt(q), true); };
      $('#qTr').onclick = function () { toggleTr(this); };
    }

    function pick(i) {
      var q = quiz[cur]; if (ans[cur]) return;
      if (q.n === 1) submitSel([i]);
      else { if (sel.has(i)) sel.delete(i); else sel.add(i); show(); }
    }
    function submitSel(s) { var q = quiz[cur]; ans[cur] = { sel: s, ok: E.checkChoice(q, s) }; sel = new Set(); show(); focusNext(); }
    function submitKb() {
      var q = quiz[cur], inp = SP.$('#kbAns', host), typed = inp ? inp.value : '';
      if (!typed.trim()) { if (inp) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); } return; }
      ans[cur] = { sel: [], typed: typed, ok: E.checkKeyboard(q, typed) }; show(); focusNext();
    }
    function focusNext() { var b = SP.$('#qNext', host) || SP.$('#qFin', host); if (b) b.focus(); }

    function toggleTr(btn) {
      var i = cur;
      if (trOn[i]) { trOn[i] = false; return show(); }
      if (tr[i]) { trOn[i] = true; return show(); }
      SP.busy(btn, true);
      var tl = SP.settings.get('trLang') || 'ru';
      E.translateQ(quiz[i], tl).then(function (r) { tr[i] = r; trOn[i] = true; }, function () { E.translateFallback(quiz[i], tl); })
        .then(function () { if (i === cur && !finished) show(); });
    }

    function exit() {
      if (!ans.some(Boolean) || finished) { if (opts.onExit) opts.onExit(); return; }
      SP.confirm({ title: SP.t('quiz.exitTitle'), text: SP.t('quiz.exitText'), okLabel: SP.t('quiz.exit'), danger: true }).then(function (ok) { if (ok && opts.onExit) opts.onExit(); });
    }

    function finish() {
      finished = true;
      var okN = ans.filter(function (a) { return a && a.ok; }).length, bad = ans.filter(function (a) { return a && !a.ok; }).length, skip = ans.length - okN - bad;
      var pct = Math.round(okN / quiz.length * 100);
      var wrong = quiz.filter(function (q, i) { return !ans[i] || !ans[i].ok; });
      var errs = quiz.map(function (q, i) { return { q: q, i: i, a: ans[i] }; }).filter(function (x) { return !x.a || !x.a.ok; }).map(function (x) {
        var right = E.isKb(x.q) ? x.q.answer : x.q.opts.filter(function (o) { return o.right; }).map(function (o) { return o.t; }).join('; ');
        return '<div class="err-item"><div class="row"><span class="badge ' + (x.a ? 'badge-danger' : '') + '">' + (x.i + 1) + '</span>' + (x.a ? '' : '<span class="small subtle">' + esc(SP.t('quiz.skipped')) + '</span>') + '</div>' + E.richHtml(x.q.q, true) + '<div class="small"><b class="text-success">' + esc(SP.t('quiz.correct')) + ':</b> ' + esc(right) + '</div></div>';
      }).join('');
      var tone = pct >= 90 ? 'success' : pct >= 50 ? 'warning' : 'danger';
      host.innerHTML = '<div class="quiz stack">' +
        '<section class="card result-card"><div class="result-score ' + tone + '"><span class="result-pct">' + pct + '%</span><span class="small">' + esc(SP.t(pct >= 90 ? 'quiz.great' : pct >= 50 ? 'quiz.good' : 'quiz.tryAgain')) + '</span></div>' +
        '<div class="result-stats"><div><b class="text-success">' + okN + '</b><span>' + esc(SP.t('quiz.statRight')) + '</span></div><div><b class="text-danger">' + bad + '</b><span>' + esc(SP.t('quiz.statWrong')) + '</span></div><div><b>' + skip + '</b><span>' + esc(SP.t('quiz.statSkip')) + '</span></div><div><b>' + quiz.length + '</b><span>' + esc(SP.t('quiz.statTotal')) + '</span></div></div>' +
        '<p class="muted small">' + esc(round > 1 ? SP.t('quiz.round', { n: round }) + '. ' : '') + esc(wrong.length ? SP.t('quiz.canRedo') : SP.t('quiz.perfect')) + '</p>' +
        '<div class="btn-group">' + (wrong.length ? '<button type="button" class="btn btn-primary" id="rRedo">' + SP.icon('rotate-ccw') + '<span>' + esc(SP.t('quiz.redo', { n: wrong.length })) + '</span></button>' : '') +
        (round > 1 ? '<button type="button" class="btn" id="rFull">' + SP.icon('list-checks') + '<span>' + esc(SP.t('quiz.fullAgain')) + '</span></button>' : '') +
        '<button type="button" class="btn" id="rAgain">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('quiz.again')) + '</span></button>' +
        '<button type="button" class="btn" id="rReview">' + SP.icon('eye') + '<span>' + esc(SP.t('quiz.review')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost" id="rHome">' + SP.icon('house') + '<span>' + esc(SP.t('quiz.toStart')) + '</span></button></div></section>' +
        (errs ? '<section class="card"><div class="card-head"><div class="card-title">' + SP.icon('triangle-alert') + esc(SP.t('quiz.errors')) + '</div></div><div class="stack">' + errs + '</div></section>' : '') + '</div>';
      var $ = function (s) { return SP.$(s, host); };
      var rd = $('#rRedo'); if (rd) rd.onclick = function () { round++; reset(fresh(wrong)); };
      var rf = $('#rFull'); if (rf) rf.onclick = function () { round = 1; reset(fresh(full)); };
      $('#rAgain').onclick = function () { reset(fresh(quiz)); };
      $('#rReview').onclick = function () { cur = 0; show(); };
      $('#rHome').onclick = function () { if (opts.onExit) opts.onExit(); };
      if (opts.onFinish) opts.onFinish({ pct: pct, ok: okN, bad: bad, total: quiz.length });
      var first = rd || $('#rAgain'); if (first) first.focus();
    }

    /* Клавиши 1–9 и Enter, пока тест на экране */
    function onKey(e) {
      if (!host.isConnected || host.offsetParent === null || finished) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (document.querySelector('.modal-backdrop') && !host.closest('.modal-backdrop')) return;
      if (/^[1-9]$/.test(e.key)) { var o = SP.$('.opt[data-o="' + (+e.key - 1) + '"]', host); if (o && !o.disabled) { e.preventDefault(); o.click(); } }
      else if (e.key === 'Enter' && (!t || t === document.body)) {
        var b = SP.$('#qOk:not([disabled])', host) || SP.$('#qNext', host) || SP.$('#qFin', host); if (b) { e.preventDefault(); b.click(); }
      }
    }
    document.addEventListener('keydown', onKey);
    show();
    return { destroy: function () { document.removeEventListener('keydown', onKey); } };
  };
})();

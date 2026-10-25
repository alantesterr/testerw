/* =====================================================================
   РАЗДЕЛ «КОНСПЕКТЫ»: лекции по предметам прямо на сайте.
   Порядок как в PDF: конспект → вопросы / задачи (ответ раскрывается
   кнопкой) → тест по лекции (как в Тестере) → следующая лекция.
   Данные группы: data/<группа>/notes/index.json и файлы конспектов
   (их готовит автор из PDF, формат описан в docs/ДЛЯ-АВТОРА.md).
   Запоминается место чтения и лучший результат каждого теста.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc;
  var root = null, index = null, indexDir = null, docs = {}, openId = null, quiz = null, obs = null, saveT = 0;

  function dir() { return window.SP_GROUP_DIR ? 'data/' + window.SP_GROUP_DIR + '/' : 'data/'; }
  function getJson(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function loadIndex() {
    if (index && indexDir === dir()) return Promise.resolve(index);
    indexDir = dir(); docs = {};
    return getJson(indexDir + 'notes/index.json').then(function (j) { index = (j && j.notes) || []; return index; }, function () { index = []; return index; });
  }
  function loadDoc(meta) {
    if (docs[meta.id]) return Promise.resolve(docs[meta.id]);
    return getJson(dir() + 'notes/' + meta.file).then(function (d) { docs[meta.id] = d; return d; });
  }
  /* ---------- Вид «Как в PDF»: куски настоящих страниц PDF ---------- */
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/';
  var pdfLib = null, pdfDocs = {}, pdfObsNear = null, pdfObsFar = null, pdfWidth = 0, pdfResizeT = 0;
  var MODE_KEY = 'sp-notes-mode';
  function isPhone() { return window.matchMedia('(max-width: 767px)').matches; }
  function mode() { var m = SP.store.get(MODE_KEY, null); return m === 'pdf' || m === 'text' ? m : (isPhone() ? 'text' : 'pdf'); }
  function loadPdfLib() {
    if (pdfLib) return pdfLib;
    pdfLib = import(PDFJS + 'pdf.min.mjs').then(function (lib) {
      try { // воркер с другого сайта запускаем через «обёртку», иначе браузер его не пустит
        var blob = new Blob(['import "' + PDFJS + 'pdf.worker.min.mjs";'], { type: 'text/javascript' });
        lib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(blob), { type: 'module' });
      } catch (e) { lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; }
      return lib;
    });
    pdfLib.catch(function () { pdfLib = null; });
    return pdfLib;
  }
  function pdfDoc(url) {
    if (!pdfDocs[url]) pdfDocs[url] = loadPdfLib().then(function (lib) { return lib.getDocument({ url: url }).promise; });
    pdfDocs[url].catch(function () { delete pdfDocs[url]; });
    return pdfDocs[url];
  }
  function pdfRegionsHtml(regs, d) {
    var W = (d.page && d.page.w) || 595.3;
    return '<div class="nt-pdf">' + regs.map(function (r) {
      return '<div class="nt-pg" data-p="' + r.p + '" data-t="' + r.t + '" data-b="' + r.b + '" style="aspect-ratio:' + W + ' / ' + Math.max(1, r.t - r.b).toFixed(1) + '"></div>';
    }).join('') + '</div>';
  }
  /* Вырезка вопроса/ответа из PDF: тот же масштаб, что у страниц лекции (ширина = доля ширины листа) */
  function cropHtml(regs, d) {
    var W = (d.page && d.page.w) || 595.3;
    return '<div class="nt-crops">' + (regs || []).map(function (r) {
      var x0 = r.x0 == null ? 0 : r.x0, x1 = r.x1 == null ? W : r.x1;
      return '<div class="nt-pg nt-crop" data-p="' + r.p + '" data-t="' + r.t + '" data-b="' + r.b + '" data-x0="' + x0 + '" data-x1="' + x1 + '" style="width:calc(100cqw * ' + ((x1 - x0) / W).toFixed(4) + ');aspect-ratio:' + (x1 - x0).toFixed(1) + ' / ' + Math.max(1, r.t - r.b).toFixed(1) + '"></div>';
    }).join('') + '</div>';
  }
  function unloadPg(el) { el.innerHTML = ''; el.removeAttribute('data-done'); }
  function renderPg(el, url) {
    if (el.getAttribute('data-done') || el.getAttribute('data-busy')) return;
    el.setAttribute('data-busy', '1');
    var p = +el.getAttribute('data-p'), t = +el.getAttribute('data-t'), b = +el.getAttribute('data-b');
    var hasX = el.hasAttribute('data-x0'), x0 = hasX ? +el.getAttribute('data-x0') : 0;
    Promise.all([loadPdfLib(), pdfDoc(url)]).then(function (r) {
      var lib = r[0];
      return r[1].getPage(p).then(function (page) {
        var W = page.view[2], H = page.view[3], x1 = hasX ? +el.getAttribute('data-x1') : W, cw = x1 - x0;
        var w = el.clientWidth || 600;
        var css = w / cw, dpr = Math.min(window.devicePixelRatio || 1, 2), sc = css * dpr;
        var vp = page.getViewport({ scale: sc, offsetX: -x0 * sc, offsetY: -(H - t) * sc });
        var c = document.createElement('canvas');
        c.width = Math.round(cw * sc); c.height = Math.round((t - b) * sc);
        el.innerHTML = ''; el.appendChild(c);
        return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(function () {
          // невидимый текст поверх картинки: можно выделять, копировать и искать (Ctrl+F)
          var tl = document.createElement('div'); tl.className = 'textLayer';
          tl.style.setProperty('--scale-factor', css); tl.style.top = (-(H - t) * css) + 'px'; tl.style.left = (-x0 * css) + 'px';
          el.appendChild(tl);
          return page.getTextContent().then(function (tc) {
            try { lib.renderTextLayer({ textContentSource: tc, container: tl, viewport: page.getViewport({ scale: css }) }); } catch (e) { /* без слоя текста */ }
          });
        });
      });
    }).then(function () { el.setAttribute('data-done', '1'); el.removeAttribute('data-busy'); }, function () {
      el.removeAttribute('data-busy');
      el.innerHTML = '<p class="small muted nt-pg-err">' + esc(SP.t('notes.pdfError')) + '</p>';
    });
  }
  function wirePdf(url) {
    if (pdfObsNear) pdfObsNear.disconnect(); if (pdfObsFar) pdfObsFar.disconnect();
    var pgs = SP.$$('.nt-pg', root); if (!pgs.length) return;
    pdfWidth = pgs[0].clientWidth;
    pdfObsNear = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) renderPg(e.target, url); }); }, { rootMargin: '1200px 0px' });
    pdfObsFar = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting && e.target.getAttribute('data-done')) unloadPg(e.target); }); }, { rootMargin: '4000px 0px' });
    pgs.forEach(function (el) { pdfObsNear.observe(el); pdfObsFar.observe(el); });
    kickPdf();
  }
  /* запасной путь: рисуем страницы рядом с экраном и при прокрутке (если наблюдатель видимости запаздывает) */
  function kickPdf() {
    if (!root || !root.isConnected) return;
    var nt = SP.$('.nt.is-pdfmode', root); if (!nt) return;
    var url = nt.getAttribute('data-pdf'), h = window.innerHeight;
    SP.$$('.nt-pg:not([data-done]):not([data-busy])', root).forEach(function (el) {
      if (el.offsetParent === null) return; // скрытые (ответ закрыт, карточка не текущая) не рисуем
      var r = el.getBoundingClientRect(); if (r.bottom > -1200 && r.top < h + 1200) renderPg(el, url);
    });
  }
  var kickT = 0;
  window.addEventListener('scroll', function () { if (kickT) return; kickT = setTimeout(function () { kickT = 0; kickPdf(); }, 250); }, { passive: true });
  window.addEventListener('resize', function () {
    clearTimeout(pdfResizeT);
    pdfResizeT = setTimeout(function () {
      var pgs = root ? SP.$$('.nt-pg', root) : []; if (!pgs.length) return;
      var w = pgs[0].clientWidth; if (Math.abs(w - pdfWidth) < 40) return;
      pdfWidth = w; var url = pgs[0].closest('.nt').getAttribute('data-pdf');
      pgs.forEach(function (el) { if (el.getAttribute('data-done')) unloadPg(el); });
      wirePdf(url);
    }, 300);
  });

  var posKey = function (id) { return 'sp-notes-pos:' + (window.SP_GROUP_DIR || '') + ':' + id; };
  var bestKey = function (id) { return 'sp-notes-best:' + (window.SP_GROUP_DIR || '') + ':' + id; };

  /* ---------- Список предметов ---------- */
  function renderList() {
    var html = SP.pageHead({ title: SP.t('nav.notes'), sub: esc(SP.t('notes.sub')) });
    if (!index.length) {
      html += '<section class="card"><div class="empty">' + SP.icon('book-open', 'ic-xl') + '<h3>' + esc(SP.t('notes.emptyTitle')) + '</h3><p>' + esc(SP.t('notes.emptyText')) + '</p></div></section>';
    } else {
      html += '<div class="nt-cards">' + index.map(function (m) {
        var pos = SP.store.get(posKey(m.id), null), best = SP.store.get(bestKey(m.id), {}) || {};
        var done = Object.keys(best).length;
        return '<a class="card nt-card" href="#/notes/' + encodeURIComponent(m.id) + '"><span class="nt-card-ic">' + SP.icon('book-open') + '</span>' +
          '<span class="nt-card-body"><b>' + esc(m.short || m.subject) + '</b><span class="small muted">' + esc(m.title || '') + '</span>' +
          '<span class="xsmall subtle">' + esc(pos && pos.label ? SP.t('notes.continue', { where: pos.label }) : SP.t('notes.start')) + (done ? ' · ' + esc(SP.t('notes.testsDone', { n: done })) : '') + '</span></span>' +
          SP.icon('chevron-right') + '</a>';
      }).join('') + '</div>';
      html += '<p class="xsmall subtle">' + esc(SP.t('notes.ruOnly')) + '</p>';
    }
    root.innerHTML = '<div class="page">' + html + '</div>';
  }

  /* ---------- Блоки конспекта ---------- */
  var NOTE_KIND = { 'Запомни': 'remember', 'Важно': 'important', 'Нюанс': 'nuance', 'Совет': 'tip', 'Подсказка': 'tip', 'Ловушка': 'trap', 'Частая ошибка': 'trap', 'Ошибка': 'trap', 'Источник': 'source' };
  function noteHtml(kind, html) {
    var k = NOTE_KIND[kind] || (/^Нюанс/.test(kind) ? 'nuance' : 'remember');
    var icon = k === 'remember' ? 'sparkles' : k === 'trap' ? 'triangle-alert' : k === 'source' ? 'info' : k === 'tip' ? 'circle-help' : 'info';
    return '<aside class="nt-note nk-' + k + '">' + SP.icon(icon, 'ic-sm') + '<div>' + (kind ? '<b>' + esc(kind) + '.</b> ' : '') + html + '</div></aside>';
  }
  function blocksHtml(blocks, ctx) {
    return (blocks || []).map(function (b) { return blockHtml(b, ctx); }).join('');
  }
  function blockHtml(b, ctx) {
    switch (b.t) {
      case 'h': return '<h4 class="nt-h">' + b.html + '</h4>';
      case 'p': return '<p class="nt-p' + (b.cls ? ' ' + b.cls : '') + '">' + b.html + '</p>';
      case 'html': return '<div class="nt-html">' + b.html + '</div>';
      case 'ul': case 'ol': return '<' + b.t + ' class="nt-list">' + b.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</' + b.t + '>';
      case 'table':
        return '<div class="nt-table" tabindex="0"><table>' + b.rows.map(function (r, i) {
          var tag = b.head && i === 0 ? 'th' : 'td';
          return '<tr>' + r.map(function (c) { return '<' + tag + '>' + c + '</' + tag + '>'; }).join('') + '</tr>';
        }).join('') + '</table></div>';
      case 'note': return noteHtml(b.kind, b.html);
      case 'code':
        if (/^Схема/.test(b.cap || '')) return '<figure class="nt-out nt-scheme"><figcaption>' + esc(b.cap) + '</figcaption><pre>' + esc(b.text) + '</pre></figure>';
        return '<figure class="nt-code">' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + E.richHtml('```cpp\n' + b.text + '\n```') + '</figure>';
      case 'out': return '<figure class="nt-out"><figcaption>' + SP.icon('monitor', 'ic-sm') + esc(b.cap || SP.t('notes.out')) + '</figcaption><pre>' + esc(b.text) + '</pre></figure>';
      case 'label': return '<p class="nt-label">' + esc(b.text) + '</p>';
      case 'qa': return qaHtml(b, ctx);
      case 'quiz': return quizCard(b, ctx);
      default: return '';
    }
  }
  function qaHtml(b, ctx) {
    var id = 'nta-' + (ctx.n++);
    var task = !!b.task, refs = (b.refs || []).filter(Boolean);
    var crop = ctx.asPdf && b.qr && b.qr.length; // вид «Как в PDF»: вопрос и ответ — вырезки из самого PDF
    var q = crop ? cropHtml(b.qr, ctx.d) + (task ? plainHtml(b) : '')
      : task ? '<div class="nt-q"><span class="nt-qn">' + esc(SP.t('notes.task', { n: b.num })) + '</span><b>' + esc(b.title) + '</b></div>' + blocksHtml(b.q, ctx) + plainHtml(b)
      : '<div class="nt-q">' + (b.num ? '<span class="nt-qn">' + esc(b.num) + '</span>' : '') + '<span>' + b.q + '</span></div>';
    var aHtml = crop && b.ar && b.ar.length ? cropHtml(b.ar, ctx.d) : blocksHtml(b.a, ctx);
    var refHtml = refs.length ? '<div class="nt-refs">' + refs.map(function (r) { return '<button type="button" class="chip" data-ref="' + esc(r) + '">' + SP.icon('arrow-up', 'ic-sm') + '<span>' + esc(SP.t('notes.toRef', { r: r })) + '</span></button>'; }).join('') + '</div>' : '';
    var hasA = b.a && b.a.length;
    return '<div class="nt-qa' + (task ? ' is-task' : '') + (b.blitz ? ' is-blitz' : '') + (crop ? ' has-crop' : '') + '">' + q + refHtml +
      (hasA ? '<button type="button" class="btn btn-sm nt-reveal" aria-expanded="false" aria-controls="' + id + '" data-task="' + (task ? 1 : 0) + '">' + SP.icon('eye', 'ic-sm') + '<span>' + esc(SP.t(task ? 'notes.showSol' : 'notes.show')) + '</span></button>' +
        '<div class="nt-a" id="' + id + '" hidden>' + aHtml + (b.own ? '<p class="xsmall subtle nt-own">' + SP.icon('info', 'ic-sm') + esc(SP.t('notes.ownAnswer')) + '</p>' : '') + '</div>' : '') + '</div>';
  }
  /* «Простыми словами» к задаче + пример работы программы (из решения в PDF; сам код не показываем) */
  function plainHtml(b) {
    if (!b.plain) return '';
    /* пояснение — просто продолжение условия обычным текстом; ниже пример, как должна работать программа */
    var ex = (b.a || []).filter(function (x) { return x.t === 'out'; })[0];
    return '<p class="nt-p nt-task-more">' + b.plain + '</p>' + (ex ? blockHtml({ t: 'out', cap: SP.t('notes.plainEx'), text: ex.text }, {}) : '');
  }
  /* Вопросы и задачи: «Списком» (подряд) или «По одному» (одна карточка, листать ← →). Выбор общий. */
  var QV_KEY = 'sp-notes-qview';
  function qView() { return SP.store.get(QV_KEY, 'list') === 'one' ? 'one' : 'list'; }
  function carItems(sec) { return SP.$$(':scope > .nt-qa', sec); }
  function carShow(sec, i, focus) {
    var items = carItems(sec); if (!items.length) return;
    i = Math.max(0, Math.min(items.length - 1, i));
    items.forEach(function (q, k) {
      var on = k === i; q.classList.toggle('is-cur', on);
      if (!on) SP.$$('.nt-reveal[aria-expanded="true"]', q).forEach(function (b) { setReveal(b, false); }); // ответ закрываем, чтобы не подсматривать
    });
    sec.setAttribute('data-cur', i);
    var n = SP.$('.nt-car-n', sec); if (n) n.textContent = SP.t('notes.carN', { i: i + 1, n: items.length });
    var pv = SP.$('[data-car="-1"]', sec), nx = SP.$('[data-car="1"]', sec);
    if (pv) pv.disabled = i === 0; if (nx) nx.disabled = i === items.length - 1;
    setTimeout(kickPdf, 0);
    if (focus) { var r = sec.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.6) sec.scrollIntoView({ block: 'start' }); items[i].setAttribute('tabindex', '-1'); items[i].focus({ preventScroll: true }); }
  }
  function carGo(sec, d) { carShow(sec, (+sec.getAttribute('data-cur') || 0) + d, true); }
  function setQView(v) {
    SP.store.set(QV_KEY, v);
    SP.$$('.nt-sec.has-car', root).forEach(function (sec) {
      sec.classList.toggle('is-one', v === 'one');
      SP.$$('[data-qview]', sec).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-qview') === v)); });
    });
  }

  /* Оформление тестов: «Белое» (как PDF) или «Как на сайте». По умолчанию — по виду конспекта. */
  var QS_KEY = 'sp-notes-quizstyle';
  function quizStyle() { var v = SP.store.get(QS_KEY, null); return v === 'paper' || v === 'site' ? v : (mode() === 'pdf' ? 'paper' : 'site'); }
  function quizStyleCls(v) { return v === 'paper' ? 'theme-paper qs-paper' : ('qs-site' + (SP.settings.resolvedTheme() === 'dark' ? ' theme-dark' : '')); }
  function applyQuizStyle(v) {
    SP.store.set(QS_KEY, v);
    SP.$$('.nt-quiz', root).forEach(function (c) {
      c.classList.remove('theme-paper', 'qs-paper', 'qs-site', 'theme-dark');
      quizStyleCls(v).split(' ').forEach(function (k) { c.classList.add(k); });
      SP.$$('[data-qstyle]', c).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-qstyle') === v)); });
    });
  }
  function quizCard(b, ctx) {
    var key = ctx.lec.id + ':' + ctx.sec;
    var best = (SP.store.get(bestKey(openId), {}) || {})[key];
    ctx.quizzes[key] = { qs: b.questions, title: ctx.lec.label + ' · ' + SP.t('notes.test') };
    var qs = quizStyle();
    return '<div class="nt-quiz card ' + quizStyleCls(qs) + '" data-quiz="' + esc(key) + '">' +
      '<div class="nt-qstyle"><span class="xsmall subtle">' + esc(SP.t('notes.qstyle')) + '</span><div class="segmented" role="group" aria-label="' + esc(SP.t('notes.qstyle')) + '">' +
      ['paper', 'site'].map(function (v) { return '<button type="button" data-qstyle="' + v + '" aria-pressed="' + (qs === v) + '">' + esc(SP.t('notes.qstyle.' + v)) + '</button>'; }).join('') + '</div></div>' +
      '<div class="nt-quiz-start"><span class="nt-quiz-ic">' + SP.icon('list-checks') + '</span>' +
      '<div class="grow"><b>' + esc(SP.t('notes.testTitle', { l: ctx.lec.label })) + '</b><div class="small muted">' + esc(SP.t('notes.testN', { n: b.questions.length })) +
      (best != null ? ' · <span class="text-' + (best >= 90 ? 'success' : best >= 50 ? 'warning' : 'danger') + '">' + esc(SP.t('notes.best', { p: best })) + '</span>' : '') + '</div></div>' +
      '<button type="button" class="btn btn-primary" data-qstart="' + esc(key) + '">' + SP.icon('play') + '<span>' + esc(SP.t(best != null ? 'notes.testAgain' : 'notes.testStart')) + '</span></button></div>' +
      '<div class="nt-quiz-host"></div></div>';
  }
  function secLabel(lec, s) {
    if (s.id) return s.id + ' ' + s.title;
    return s.title || SP.t('notes.sec.text');
  }

  /* ---------- Режим чтения ---------- */
  function renderDoc(meta, d) {
    var asPdf = mode() === 'pdf' && !!meta.pdf && !!d.page;
    var ctx = { n: 0, quizzes: {}, asPdf: asPdf, d: d }, toc = [], refMap = {};
    var body = '';
    if (asPdf && (d.introPdf || []).length) {
      body += '<section class="nt-intro nt-intro-pdf" id="nt-intro">' + pdfRegionsHtml(d.introPdf, d) + '</section>';
    } else if ((d.intro || []).length) {
      body += '<section class="card nt-intro" id="nt-intro"><h2 class="nt-intro-t">' + esc(d.title || meta.title) + '</h2>' + (d.sub ? '<p class="muted small">' + esc(d.sub) + '</p>' : '') +
        blocksHtml(d.intro.filter(function (b) { return !(b.t === 'p' && /^(Философия: подготовка|Подготовка к РК1|Программирование I)/.test((b.html || '').replace(/<[^>]+>/g, ''))); }), ctx) + '</section>';
    }
    d.lectures.forEach(function (lec, li) {
      var lid = 'nt-' + li;
      refMap[lec.n] = lid;
      var items = [];
      var pdfHead = asPdf && lec.sections.some(function (s) { return s.withHeader && s.pdf && s.pdf.length; });
      /* в виде PDF заголовок лекции и «Источник» уже есть на картинке — свои прячем (для чтения с экрана оставляем) */
      body += '<section class="nt-lec' + (pdfHead ? ' is-pdfhead' : '') + '" id="' + lid + '" data-label="' + esc(lec.label) + '"><h2 class="nt-lec-t"><span class="nt-lec-n">' + esc(lec.label) + '</span>' + esc(lec.title) + '</h2>';
      if (lec.source) body += '<div class="nt-src">' + noteHtml('Источник', lec.source) + '</div>';
      lec.sections.forEach(function (s, si) {
        var sid = lid + '-' + si;
        if (s.id) refMap[s.id] = sid;
        ctx.lec = lec; ctx.sec = si; ctx.blitz = !!s.blitz;
        var isQ = s.kind === 'qa' || s.kind === 'tasks';
        var pdfSec = asPdf && s.pdf && s.pdf.length;
        var title = s.title ? (s.id ? '<span class="nt-sec-id">' + esc(s.id) + '</span>' : '') + esc(s.title) : '';
        var nQa = (s.blocks || []).filter(function (b) { return b.t === 'qa' && b.a && b.a.length; }).length;
        var car = isQ && !pdfSec && nQa > 1, one = car && qView() === 'one';
        body += '<section class="nt-sec nk-' + s.kind + (pdfSec ? ' is-pdf' : '') + (car ? ' has-car' : '') + (one ? ' is-one' : '') + '" id="' + sid + '" data-label="' + esc(lec.label + (s.title ? ' · ' + (s.id ? s.id + ' ' : '') + s.title : '')) + '">' +
          (title ? '<div class="nt-sec-head"><h3 class="nt-sec-t">' + title + '</h3><div class="nt-sec-tools">' +
            (car ? '<div class="segmented nt-qview" role="group" aria-label="' + esc(SP.t('notes.qview')) + '">' + ['list', 'one'].map(function (v) { return '<button type="button" data-qview="' + v + '" aria-pressed="' + (qView() === v) + '">' + SP.icon(v === 'list' ? 'list' : 'square', 'ic-sm') + '<span>' + esc(SP.t('notes.qview.' + v)) + '</span></button>'; }).join('') + '</div>' : '') +
            (isQ && nQa > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-allans="' + sid + '" aria-pressed="false">' + SP.icon('eye', 'ic-sm') + '<span>' + esc(SP.t('notes.showAll')) + '</span></button>' : '') + '</div></div>' : '') +
          (pdfSec ? pdfRegionsHtml(s.pdf, d) : blocksHtml(s.blocks, ctx)) +
          (car ? '<div class="nt-car"><button type="button" class="btn" data-car="-1">' + SP.icon('chevron-left') + '<span>' + esc(SP.t('common.back')) + '</span></button><span class="nt-car-n" aria-live="polite"></span><button type="button" class="btn btn-primary" data-car="1"><span>' + esc(SP.t('quiz.next')) + '</span>' + SP.icon('chevron-right') + '</button></div>' : '') + '</section>';
        if (s.title) items.push({ id: sid, label: (s.id ? s.id + ' ' : '') + s.title, kind: s.kind });
      });
      body += '</section>';
      toc.push({ id: lid, label: lec.label, title: lec.title, items: items });
    });
    var tocHtml = '<ol class="nt-toc-list">' + (d.intro && d.intro.length ? '<li><a href="#" data-goto="nt-intro" class="nt-toc-l">' + esc(SP.t('notes.intro')) + '</a></li>' : '') + toc.map(function (t) {
      return '<li><a href="#" data-goto="' + t.id + '" class="nt-toc-l"><b>' + esc(t.label) + '</b> <span>' + esc(t.title) + '</span></a><ol>' + t.items.map(function (it) {
        return '<li><a href="#" data-goto="' + it.id + '" class="nt-toc-s nk-' + it.kind + '">' + esc(it.label) + '</a></li>';
      }).join('') + '</ol></li>';
    }).join('') + '</ol>';
    var focus = document.documentElement.classList.contains('nt-focus');
    var canPdf = !!meta.pdf && !!d.page;
    root.innerHTML = '<div class="nt' + (asPdf ? ' is-pdfmode' : '') + '" data-pdf="' + esc(meta.pdf ? encodeURI(meta.pdf) : '') + '">' +
      '<header class="nt-bar"><a class="btn btn-ghost btn-sm nt-back" href="#/notes">' + SP.icon('chevron-left') + '<span>' + esc(SP.t('nav.notes')) + '</span></a>' +
      '<b class="nt-bar-t">' + esc(meta.short || meta.subject) + '</b>' +
      (canPdf ? '<div class="segmented nt-mode" role="group" aria-label="' + esc(SP.t('notes.view')) + '">' +
        [['pdf', 'file-text'], ['text', 'type']].map(function (m) { return '<button type="button" data-ntmode="' + m[0] + '" aria-pressed="' + (mode() === m[0]) + '" data-tip="' + esc(SP.t('notes.view.' + m[0])) + '">' + SP.icon(m[1], 'ic-sm') + '<span>' + esc(SP.t('notes.view.' + m[0])) + '</span></button>'; }).join('') + '</div>' : '') +
      '<div class="nt-bar-a"><button type="button" class="btn btn-ghost btn-sm nt-toc-btn" id="ntToc">' + SP.icon('list') + '<span>' + esc(SP.t('notes.toc')) + '</span></button>' +
      (meta.pdf ? '<a class="btn btn-ghost btn-sm" href="' + esc(encodeURI(meta.pdf)) + '" target="_blank" rel="noopener">' + SP.icon('file-text') + '<span>' + esc(SP.t('notes.pdf')) + '</span></a>' : '') +
      '<button type="button" class="btn btn-sm" id="ntFocus" aria-pressed="' + focus + '">' + SP.icon(focus ? 'minimize' : 'maximize') + '<span>' + esc(SP.t(focus ? 'notes.focusExit' : 'notes.focus')) + '</span></button></div></header>' +
      '<div class="nt-layout"><nav class="nt-toc" aria-label="' + esc(SP.t('notes.toc')) + '">' + tocHtml + '</nav><article class="nt-doc' + (asPdf ? ' nt-paper theme-paper subj-' + esc(meta.id) : '') + '">' + body + '</article></div></div>';
    wireDoc(meta, ctx, refMap, tocHtml);
    if (asPdf) wirePdf(encodeURI(meta.pdf));
    SP.$$('[data-ntmode]', root).forEach(function (bt) {
      bt.onclick = function () {
        var m = bt.getAttribute('data-ntmode'); if (m === mode()) return;
        var pos = SP.store.get(posKey(meta.id), null);
        SP.store.set(MODE_KEY, m); stopQuiz();
        renderDoc(meta, d);
        if (pos && pos.id && document.getElementById(pos.id)) scrollToId(pos.id, false);
        var nb = SP.$('[data-ntmode="' + m + '"]', root); if (nb) nb.focus();
      };
    });
  }

  function scrollToId(id, smooth) {
    var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    var h = el.querySelector('h2, h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function setReveal(btn, open) {
    var a = document.getElementById(btn.getAttribute('aria-controls')); if (!a) return;
    a.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(kickPdf, 0); // открытый ответ-вырезку дорисовать сразу
    var task = btn.getAttribute('data-task') === '1';
    btn.innerHTML = SP.icon(open ? 'eye-off' : 'eye', 'ic-sm') + '<span>' + esc(SP.t(open ? (task ? 'notes.hideSol' : 'notes.hide') : (task ? 'notes.showSol' : 'notes.show'))) + '</span>';
  }
  function stopQuiz() {
    if (!quiz) return;
    try { quiz.q.destroy(); } catch (e) { /* ничего */ }
    var card = quiz.card; quiz = null;
    if (card && card.isConnected) { SP.$('.nt-quiz-host', card).innerHTML = ''; SP.$('.nt-quiz-start', card).hidden = false; }
  }
  function wireDoc(meta, ctx, refMap, tocHtml) {
    var $ = function (s) { return SP.$(s, root); };
    root.onclick = function (e) {
      var g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); scrollToId(g.getAttribute('data-goto'), true); return; }
      var rv = e.target.closest('.nt-reveal');
      if (rv) { setReveal(rv, rv.getAttribute('aria-expanded') !== 'true'); return; }
      var all = e.target.closest('[data-allans]');
      if (all) {
        var on = all.getAttribute('aria-pressed') !== 'true', sec = document.getElementById(all.getAttribute('data-allans'));
        SP.$$('.nt-reveal', sec).forEach(function (b) { setReveal(b, on); });
        all.setAttribute('aria-pressed', String(on));
        all.innerHTML = SP.icon(on ? 'eye-off' : 'eye', 'ic-sm') + '<span>' + esc(SP.t(on ? 'notes.hideAll' : 'notes.showAll')) + '</span>';
        return;
      }
      var rf = e.target.closest('[data-ref]');
      if (rf) {
        var r = rf.getAttribute('data-ref').split(/[–-]/)[0].trim(), target = refMap[r];
        if (!target) { var lec = r.match(/^(\d+[А-Я]?)/); target = lec && refMap[lec[1]]; }
        if (target) scrollToId(target, true);
        return;
      }
      var qv = e.target.closest('[data-qview]');
      if (qv) { var sec0 = qv.closest('.nt-sec'); setQView(qv.getAttribute('data-qview')); var nb = SP.$('[data-qview="' + qv.getAttribute('data-qview') + '"]', sec0); if (nb) nb.focus(); return; }
      var cb = e.target.closest('[data-car]');
      if (cb) { carGo(cb.closest('.nt-sec'), +cb.getAttribute('data-car')); return; }
      var qst = e.target.closest('[data-qstyle]');
      if (qst) { applyQuizStyle(qst.getAttribute('data-qstyle')); return; }
      var qs = e.target.closest('[data-qstart]');
      if (qs) {
        var key = qs.getAttribute('data-qstart'), info = ctx.quizzes[key], card = qs.closest('.nt-quiz');
        stopQuiz();
        SP.$('.nt-quiz-start', card).hidden = true;
        var host = SP.$('.nt-quiz-host', card);
        var q = SP.Quiz(host, info.qs, {
          title: info.title,
          onExit: function () { stopQuiz(); card.scrollIntoView({ block: 'center' }); },
          onFinish: function (r) { var best = SP.store.get(bestKey(meta.id), {}) || {}; if (best[key] == null || r.pct > best[key]) { best[key] = r.pct; SP.store.set(bestKey(meta.id), best); } }
        });
        quiz = { q: q, card: card };
        card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    };
    /* карточки «По одному»: начальное состояние, стрелки ← → (когда фокус в разделе) и свайп на телефоне */
    SP.$$('.nt-sec.has-car', root).forEach(function (sec) {
      carShow(sec, 0, false);
      sec.addEventListener('keydown', function (e) {
        if (!sec.classList.contains('is-one') || e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.target.closest('input, textarea, select, [contenteditable]')) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); carGo(sec, e.key === 'ArrowRight' ? 1 : -1); }
      });
      var sx = null, sy = 0;
      sec.addEventListener('touchstart', function (e) { if (sec.classList.contains('is-one') && e.touches.length === 1 && !e.target.closest('pre, .code, .nt-table')) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } else sx = null; }, { passive: true });
      sec.addEventListener('touchend', function (e) {
        if (sx == null) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 50) carGo(sec, dx < 0 ? 1 : -1);
      }, { passive: true });
    });
    /* оглавление: на ПК кнопка прячет/показывает левую колонку, на узком экране — открывает окно */
    var tocOff = !!SP.store.get('sp-notes-toc-off', false), ntEl = SP.$('.nt', root);
    var wide = function () { return window.matchMedia('(min-width: 1100px)').matches; };
    ntEl.classList.toggle('toc-off', tocOff);
    $('#ntToc').setAttribute('aria-pressed', String(wide() && !tocOff));
    $('#ntToc').onclick = function () {
      if (wide()) {
        tocOff = !ntEl.classList.contains('toc-off'); ntEl.classList.toggle('toc-off', tocOff); SP.store.set('sp-notes-toc-off', tocOff);
        this.setAttribute('aria-pressed', String(!tocOff)); this.setAttribute('data-tip', SP.t(tocOff ? 'notes.tocShow' : 'notes.tocHide'));
        if (SP.$('.nt-pg', root)) setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50); // перерисовать PDF под новую ширину
        return;
      }
      var m = SP.modal({ title: SP.t('notes.toc'), body: '<nav class="nt-toc nt-toc-m">' + tocHtml + '</nav>' });
      m.el.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (!g) return; e.preventDefault(); m.close(); setTimeout(function () { scrollToId(g.getAttribute('data-goto'), false); }, 30); });
    };
    $('#ntFocus').onclick = function () { setFocus(!document.documentElement.classList.contains('nt-focus')); };
    /* где я сейчас: подсветка в оглавлении и запоминание места */
    if (obs) obs.disconnect();
    var secs = SP.$$('.nt-sec[data-label], .nt-lec', root), tocLinks = SP.$$('.nt-layout > .nt-toc [data-goto]', root);
    obs = new IntersectionObserver(function () {
      var top = null;
      secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top < window.innerHeight * 0.35) top = s; });
      if (!top) return;
      var id = top.id;
      tocLinks.forEach(function (a) { var on = a.getAttribute('data-goto') === id || (top.closest('.nt-lec') && a.getAttribute('data-goto') === top.closest('.nt-lec').id && a.classList.contains('nt-toc-l')); a.classList.toggle('on', a.getAttribute('data-goto') === id); if (on && a.getAttribute('data-goto') === id) { try { a.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ничего */ } } });
      clearTimeout(saveT); saveT = setTimeout(function () { SP.store.set(posKey(meta.id), { id: id, label: top.getAttribute('data-label') || '' }); }, 400);
    }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    secs.forEach(function (s) { obs.observe(s); });
  }
  function setFocus(on) {
    var html = document.documentElement;
    html.classList.toggle('nt-focus', on);
    try {
      if (on && !document.fullscreenElement && html.requestFullscreen) html.requestFullscreen().catch(function () { });
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { });
    } catch (e) { /* ничего */ }
    var b = SP.$('#ntFocus', root);
    if (b) { b.setAttribute('aria-pressed', String(on)); b.innerHTML = SP.icon(on ? 'minimize' : 'maximize') + '<span>' + esc(SP.t(on ? 'notes.focusExit' : 'notes.focus')) + '</span>'; }
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('nt-focus')) setFocus(false); });

  /* ---------- Маршрут ---------- */
  function show(params) {
    if (!root) return;
    params = params || [];
    var want = params[0] || null;
    /* тот же конспект уже открыт — не перерисовываем, чтобы не сбить место и тест */
    if (want && want === openId && SP.$('.nt-doc', root)) { if (params[1]) scrollToId(params[1], true); return; }
    stopQuiz(); if (obs) { obs.disconnect(); obs = null; } openId = null;
    root.innerHTML = '<div class="page"><p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('notes.loading')) + '</p></div>';
    loadIndex().then(function () {
      var meta = want && index.filter(function (m) { return m.id === want; })[0];
      if (!meta) { setFocus(false); renderList(); return; }
      return loadDoc(meta).then(function (d) {
        openId = meta.id; renderDoc(meta, d);
        var pos = SP.store.get(posKey(meta.id), null);
        var target = params[1] || (pos && pos.id);
        if (target && document.getElementById(target)) setTimeout(function () { scrollToId(target, false); }, 30);
        else window.scrollTo(0, 0);
      });
    }).catch(function () {
      root.innerHTML = '<div class="page"><section class="card"><div class="empty">' + SP.icon('cloud-off', 'ic-xl') + '<h3>' + esc(SP.t('notes.loadError')) + '</h3></div></section></div>';
    });
  }

  SP.views.register('notes', {
    titleKey: 'nav.notes',
    mount: function (el) { root = el; },
    show: function (params) { show(params); },
    hide: function () { stopQuiz(); setFocus(false); },
    refresh: function () { var p = openId ? [openId] : []; openId = null; show(p); }
  });
  SP.on('auth', function () { index = null; docs = {}; if (root && SP.views.current() === 'notes') { openId = null; show([]); } });
})();

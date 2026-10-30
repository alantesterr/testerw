/* =====================================================================
   КОНСПЕКТЫ: лекция открывается из папки предмета (#/notes/<конспект>/<лекция>).
   У лекции вкладки: Текст · Вопросы / Задачи · Карточки (если есть) · Тест.
   - Текст: «Как в PDF» (кусочки настоящих страниц) или «Текстом».
   - Вопросы и задачи — по одной карточке, листать свайпом, стрелками или кнопками.
     После «Показать ответ» появляются «Знал / Повторить».
     «Где в лекции?» открывает нужное место в тексте и даёт вернуться обратно.
   - Тест — тот же движок, что в Тестере (SP.Quiz).
   Данные: data/<группа>/notes/index.json, файлы конспектов и <id>.extra.json
   (выжимки «Главное за 1 минуту», термины, к какому разделу относится задача).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc;
  var root = null, index = null, indexDir = null, docs = {}, extras = {};
  var cur = null, quiz = null, returnTo = null;

  function dir() { return window.SP_GROUP_DIR ? 'data/' + window.SP_GROUP_DIR + '/' : 'data/'; }
  function getJson(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  /* конспекты группы (data/<группа>/notes) + свои конспекты с этого устройства (mynotes.js) */
  function loadIndex() {
    if (index && indexDir === dir()) return Promise.resolve(index);
    indexDir = dir(); docs = {}; extras = {};
    var mine = function () { return SP.myNotes ? SP.myNotes.metas() : []; };
    return getJson(indexDir + 'notes/index.json').then(function (j) { index = ((j && j.notes) || []).concat(mine()); return index; }, function () { index = mine(); return index; });
  }
  function loadDoc(meta) {
    if (docs[meta.id]) return Promise.resolve(docs[meta.id]);
    if (meta.local) return SP.myNotes.load(meta.id).then(function (r) { extras[meta.id] = r.extra; docs[meta.id] = prepare(meta, r.doc, r.extra); return docs[meta.id]; });
    return Promise.all([
      getJson(dir() + 'notes/' + meta.file),
      getJson(dir() + 'notes/' + meta.id + '.extra.json').catch(function () { return {}; })
    ]).then(function (r) { extras[meta.id] = r[1] || {}; docs[meta.id] = prepare(meta, r[0], r[1] || {}); return docs[meta.id]; });
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
  /* Вырезка вопроса/ответа из PDF: тот же масштаб, что у страниц лекции */
  function cropHtml(regs, d) {
    var W = (d.page && d.page.w) || 595.3;
    var base = d.subject === 'C++' ? 516 : 528;
    return '<div class="nt-crops">' + (regs || []).map(function (r) {
      var x0 = r.x0 == null ? 0 : r.x0, x1 = r.x1 == null ? W : r.x1;
      return '<div class="nt-pg nt-crop" data-p="' + r.p + '" data-t="' + r.t + '" data-b="' + r.b + '" data-x0="' + x0 + '" data-x1="' + x1 + '" style="width:' + Math.min(100, (x1 - x0) / base * 100).toFixed(2) + '%;aspect-ratio:' + (x1 - x0).toFixed(1) + ' / ' + Math.max(1, r.t - r.b).toFixed(1) + '"></div>';
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
            /* только текст внутри вырезки — иначе через выделение/поиск можно достать скрытые ответы */
            tc.items = tc.items.filter(function (it) {
              var x = it.transform[4], y = it.transform[5];
              return y >= b - 1 && y <= t + 1 && x >= x0 - 1 && x + (it.width || 0) <= x1 + 2;
            });
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
  /* запасной путь: рисуем страницы рядом с экраном и при прокрутке */
  function kickPdf() {
    if (!root || !root.isConnected) return;
    var nt = SP.$('.nt[data-pdf]', root); if (!nt || !nt.getAttribute('data-pdf')) return;
    var url = nt.getAttribute('data-pdf'), h = window.innerHeight;
    SP.$$('.nt-pg:not([data-done]):not([data-busy])', root).forEach(function (el) {
      if (el.offsetParent === null) return; // скрытые (ответ закрыт) не рисуем
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

  /* ---------- Хранилище (на устройстве) ---------- */
  var key = function (kind, id) { return 'sp-notes-' + kind + ':' + (window.SP_GROUP_DIR || '') + ':' + id; };
  function getS(kind, id) { return SP.store.get(key(kind, id), {}) || {}; }
  function setS(kind, id, v) { SP.store.set(key(kind, id), v); }
  function patchS(kind, id, k, v) { var o = getS(kind, id); if (v == null) delete o[k]; else o[k] = v; setS(kind, id, o); return o; }

  /* ---------- Блоки конспекта ---------- */
  var NOTE_KIND = { 'Запомни': 'remember', 'Важно': 'important', 'Нюанс': 'nuance', 'Совет': 'tip', 'Подсказка': 'tip', 'Ловушка': 'trap', 'Частая ошибка': 'trap', 'Ошибка': 'trap', 'Источник': 'source' };
  function noteHtml(kind, html) {
    var k = NOTE_KIND[kind] || (/^Нюанс/.test(kind) ? 'nuance' : 'remember');
    var icon = k === 'remember' ? 'sparkles' : k === 'trap' ? 'triangle-alert' : k === 'source' ? 'info' : k === 'tip' ? 'circle-help' : 'info';
    return '<aside class="nt-note nk-' + k + '">' + SP.icon(icon, 'ic-sm') + '<div>' + (kind ? '<b>' + esc(kind) + '.</b> ' : '') + html + '</div></aside>';
  }
  function blocksHtml(blocks, ctx) {
    // место блока в PDF (страница, высота) — по нему «Где в лекции?» находит блок в виде «Текстом»
    return (blocks || []).map(function (b) {
      var h = blockHtml(b, ctx);
      return b.src ? h.replace(/^<(\w+)/, '<$1 data-sp="' + b.src.p + '" data-sy="' + b.src.y + '"') : h;
    }).join('');
  }
  function T(html, ctx) { return ctx && ctx.terms ? termsHtml(html || '', ctx) : (html || ''); }
  function blockHtml(b, ctx) {
    switch (b.t) {
      case 'h': return '<h4 class="nt-h">' + b.html + '</h4>';
      case 'p': return '<p class="nt-p' + (b.cls ? ' ' + b.cls : '') + '">' + T(b.html, ctx) + '</p>';
      case 'html': return '<div class="nt-html">' + T(b.html, ctx) + '</div>';
      case 'ul': case 'ol': return '<' + b.t + ' class="nt-list">' + b.items.map(function (i) { return '<li>' + T(i, ctx) + '</li>'; }).join('') + '</' + b.t + '>';
      case 'table':
        return '<div class="nt-table" tabindex="0"><table>' + b.rows.map(function (r, i) {
          var tag = b.head && i === 0 ? 'th' : 'td';
          return '<tr>' + r.map(function (c) { return '<' + tag + '>' + c + '</' + tag + '>'; }).join('') + '</tr>';
        }).join('') + '</table></div>';
      case 'note': return noteHtml(b.kind, T(b.html, ctx));
      case 'code':
        if (/^Схема/.test(b.cap || '')) return '<figure class="nt-out nt-scheme"><figcaption>' + esc(b.cap) + '</figcaption><pre>' + esc(b.text) + '</pre></figure>';
        /* подсветка — для C/C++ (и когда язык не указан), остальные языки — просто моноширинным */
        if (b.lang && !/^(cpp|c\+\+|c|h|hpp|cc)$/i.test(b.lang)) return '<figure class="nt-code">' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '<div class="rich"><div class="code"><div class="code-h"><span>' + esc(b.lang) + '</span><button type="button" class="btn btn-ghost btn-sm" data-copycode>' + esc(SP.t('common.copy')) + '</button></div><pre><code>' + esc(b.text) + '</code></pre></div></div></figure>';
        return '<figure class="nt-code">' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + E.richHtml('```cpp\n' + b.text + '\n```') + '</figure>';
      /* свои конспекты: картинка, место под картинку, формула, схема (рисуются после вывода — renderVisuals) */
      case 'img':
        if (b.ph || !b.src) return '<figure class="nt-img nt-img-ph">' + SP.icon('image') + '<figcaption><b>' + esc(SP.t('mn.imgHere')) + '</b> ' + esc(b.cap || '') + '</figcaption></figure>';
        return '<figure class="nt-img"><img src="' + esc(b.src) + '" alt="' + esc(b.cap || '') + '" loading="lazy">' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '</figure>';
      case 'math': return '<div class="nt-math" data-tex="' + esc(b.tex) + '">' + esc(b.tex) + '</div>';
      case 'mermaid': return '<figure class="nt-mermaid">' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '<div class="nt-mm" data-mm="' + esc(b.text) + '"><pre>' + esc(b.text) + '</pre></div></figure>';
      case 'out': return '<figure class="nt-out"><figcaption>' + SP.icon('monitor', 'ic-sm') + esc(b.cap || SP.t('notes.out')) + '</figcaption><pre>' + esc(b.text) + '</pre></figure>';
      case 'label': return '<p class="nt-label">' + esc(b.text) + '</p>';
      default: return '';
    }
  }
  /* Формулы (KaTeX) и схемы (Mermaid) своих конспектов: библиотеки грузятся, только если они нужны */
  var KATEX = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/', MERMAID = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js', libs = {}, mmTheme = '';
  function lib(name, url, css) {
    if (!libs[name]) libs[name] = new Promise(function (ok, no) {
      if (css) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = css; document.head.appendChild(l); }
      var s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = function () { delete libs[name]; no(new Error('load')); }; document.head.appendChild(s);
    });
    return libs[name];
  }
  function renderVisuals(box) {
    if (!box) return;
    var tex = SP.$$('.nt-tex:not([data-ok]), .nt-math:not([data-ok])', box);
    if (tex.length) lib('katex', KATEX + 'katex.min.js', KATEX + 'katex.min.css').then(function () {
      tex.forEach(function (el) { try { window.katex.render(el.getAttribute('data-tex'), el, { displayMode: el.classList.contains('nt-math'), throwOnError: false }); el.setAttribute('data-ok', '1'); } catch (e) { /* остаётся текстом */ } });
    }, function () { /* без интернета — формула видна как текст */ });
    var mm = SP.$$('.nt-mm:not([data-ok])', box);
    if (mm.length) lib('mermaid', MERMAID).then(function () {
      var M = window.mermaid, th = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
      if (mmTheme !== th) { M.initialize({ startOnLoad: false, securityLevel: 'strict', theme: th, flowchart: { useMaxWidth: true, htmlLabels: false } }); mmTheme = th; }
      mm.forEach(function (el, i) {
        var id = 'mm' + Date.now() + '_' + i;
        el.setAttribute('data-ok', 'busy');
        M.render(id, el.getAttribute('data-mm')).then(function (r) { el.innerHTML = r.svg; el.setAttribute('data-ok', '1'); }, function () {
          var junk = document.getElementById('d' + id) || document.getElementById(id); if (junk && !el.contains(junk)) junk.remove();
          el.setAttribute('data-ok', 'err'); el.insertAdjacentHTML('afterbegin', '<p class="xsmall subtle">' + esc(SP.t('mn.mmBad')) + '</p>');
        });
      });
    }, function () { });
  }

  /* Термины: первое упоминание в лекции подчёркнуто, по нажатию — определение */
  function termsHtml(html, ctx) {
    var list = ctx.terms, used = ctx.used;
    return html.split(/(<[^>]+>)/).map(function (part, i, arr) {
      if (part.charAt(0) === '<' || /<(code|a)[^>]*>$/i.test(arr[i - 1] || '')) return part;
      list.forEach(function (t, ti) {
        if (used[ti]) return;
        var m = part.match(new RegExp('(^|[^А-Яа-яЁёA-Za-z])(' + t[0] + '[А-Яа-яЁёa-z]*)', 'i'));
        if (m) { used[ti] = 1; var at = m.index + m[1].length; part = part.slice(0, at) + '\u0001' + ti + '\u0002' + m[2] + '\u0003' + part.slice(at + m[2].length); }
      });
      return part.replace(/\u0001(\d+)\u0002([^\u0003]+)\u0003/g, '<button type="button" class="lx-term" data-term="$1">$2</button>');
    }).join('');
  }

  /* ---------- Модель лекции: что идёт во вкладки ---------- */
  function prepare(meta, d, x) {
    var where = x.where || {};
    d.lectures.forEach(function (lec) {
      var M = { text: [], qs: [], tasks: [], tests: [], cards: [] };
      lec.sections.forEach(function (s, si) {
        if (s.kind === 'text') { M.text.push(si); return; }
        if (s.kind === 'test') { (s.blocks || []).forEach(function (b) { if (b.t === 'quiz' && b.questions && b.questions.length) M.tests.push({ key: lec.id + ':' + si, qs: b.questions, title: s.title || '' }); }); return; }
        (s.blocks || []).forEach(function (b, bi) {
          if (b.t !== 'qa') return;
          var it = { key: lec.id + ':' + si + ':' + bi, b: b, si: si };
          /* название задачи: своё или из заголовка раздела («Тема 3 · Задача 3.1 · Карамель» → «Карамель») */
          var tt = (x.titles || {})[lec.id + ':' + (b.num || '')];
          if (tt) it.title = tt;
          else if (!b.title && s.kind === 'tasks' && s.title) { var parts = s.title.split('·').map(function (z) { return z.trim(); }); it.title = parts.length > 2 ? parts.slice(2).join(' · ') : parts[parts.length - 1]; var mm = s.title.match(/Задача\s+([\dА-ЯA-Z.]+)/i); if (mm && !b.num) it.num = mm[1]; }
          if (b.task || s.kind === 'tasks') {
            /* «Где в лекции?» для задачи: раздел из .extra.json (или «@ Где:» своего конспекта), иначе текст прямо перед задачей */
            var w = where[it.key] != null ? where[it.key] : where[lec.id + ':' + (b.num || '')];
            if (w == null && b.where) { var wl = SP.lc(b.where); var fw = lec.sections.findIndex(function (z) { return z.kind === 'text' && z.title && (SP.lc(z.title) === wl || SP.lc(z.title).indexOf(wl) >= 0 || wl.indexOf(SP.lc(z.title)) >= 0); }); if (fw >= 0) w = fw; }
            if (w != null) it.whereSi = lec.sections.findIndex(function (z, zi) { return z.kind === 'text' && (zi === w || z.id === w || (z.title && z.title === w)); });
            if (it.whereSi == null || it.whereSi < 0) { for (var k = si - 1; k >= 0; k--) { if (lec.sections[k].kind === 'text') { it.whereSi = k; break; } if (lec.sections[k].kind !== 'tasks') break; } }
            if (it.whereSi == null || it.whereSi < 0) it.whereSi = M.text[1] != null ? M.text[1] : M.text[0];
            M.tasks.push(it);
          } else M.qs.push(it);
        });
      });
      /* карточки: свои (ИИ сделал раздел «Карточки») + вопросы с текстовым ответом (кроме конспектов «только PDF») */
      (lec.cards || []).forEach(function (c, ci) { if (c && c.q) M.cards.push({ key: lec.id + ':c' + ci, q: c.q, a: c.a || '', mem: c.mem || '' }); });
      if (!d.pdfOnly) M.qs.forEach(function (it) {
        var a = (it.b.a || []).filter(function (z) { return z.t !== 'note'; })[0], mem = (it.b.a || []).filter(function (z) { return z.t === 'note'; })[0];
        var front = typeof it.b.q === 'string' ? it.b.q : '';
        if (front && a) M.cards.push({ key: it.key, q: front, a: a.t === 'p' ? '<p>' + a.html + '</p>' : (a.html || ''), mem: mem ? mem.html : '' });
      });
      lec._m = M;
    });
    d._x = x; d._meta = meta;
    return d;
  }
  function tabsOf(lec) {
    var M = lec._m, t = [];
    if (M.text.length) t.push(['text', SP.t('lx.tab.text'), '']);
    if (M.qs.length) t.push(['qs', SP.t('lx.tab.qs'), M.qs.length]);
    if (M.tasks.length) t.push(['tasks', SP.t('lx.tab.tasks'), M.tasks.length]);
    if (M.cards.length) t.push(['cards', SP.t('lx.tab.cards'), M.cards.length]);
    if (M.tests.length) t.push(['test', SP.t('lx.tab.test'), M.tests.reduce(function (n, q) { return n + q.qs.length; }, 0)]);
    return t;
  }
  /* оглавление слева (ПК): можно спрятать, выбор запоминается */
  function tocOff() { return !!SP.store.get('sp-notes-toc-off', false); }
  function asPdfOf(d, meta) { return (mode() === 'pdf' || !!d.pdfOnly) && !!meta.pdf && !!d.page; }

  /* ---------- Для папки предмета: список лекций и прогресс ---------- */
  function lecStats(meta, d, lec) {
    var M = lec._m, marks = getS('marks', meta.id), best = getS('best', meta.id), read = getS('read', meta.id);
    var ok = function (arr) { return arr.filter(function (it) { return marks[it.key] === 'know'; }).length; };
    var bests = M.tests.map(function (q) { return best[q.key]; }).filter(function (v) { return v != null; });
    return { read: Math.round(read[lec.id] || 0), qs: M.qs.length, qsOk: ok(M.qs), tasks: M.tasks.length, tasksOk: ok(M.tasks), tests: M.tests.length, best: bests.length ? Math.max.apply(null, bests) : null };
  }
  function forSubject(name) {
    var n = SP.lc(SP.hub.cleanName(name || ''));
    return loadIndex().then(function () {
      var metas = index.filter(function (m) { return SP.lc(SP.hub.cleanName(m.subject || '')) === n; });
      return Promise.all(metas.map(function (m) { return loadDoc(m).then(function (d) { return { meta: m, doc: d }; }, function () { return null; }); }));
    }).then(function (r) { return r.filter(Boolean); });
  }
  function continueOf(meta) { return SP.store.get(key('pos', meta.id), null); }
  /* есть ли у предмета конспект (для списка папок); список конспектов грузится один раз */
  var idxAsked = false;
  function has(name) {
    if (!index || indexDir !== dir()) { if (!idxAsked) { idxAsked = true; loadIndex().then(function () { idxAsked = false; SP.emit('notes-index'); }); } return false; }
    var n = SP.lc(SP.hub.cleanName(name || ''));
    return index.some(function (m) { return SP.lc(SP.hub.cleanName(m.subject || '')) === n; });
  }

  /* ---------- Экран лекции ---------- */
  function subjectId(meta) {
    var n = SP.lc(SP.hub.cleanName(meta.subject || '')), s = (SP.hub.data().subjects || []).filter(function (x) { return SP.lc(SP.hub.cleanName(x.name)) === n; })[0];
    return s ? s.id : null;
  }
  function backHref(meta) { var id = subjectId(meta); return '#/subjects' + (id ? '/' + encodeURIComponent(id) : ''); }
  function lecHref(meta, li) { return '#/notes/' + encodeURIComponent(meta.id) + '/' + li; }

  function render(keepScroll) {
    stopQuiz(); hideTerm();
    var meta = cur.meta, d = cur.d, lec = d.lectures[cur.li], tabs = tabsOf(lec);
    if (!tabs.some(function (t) { return t[0] === cur.tab; })) cur.tab = tabs[0] ? tabs[0][0] : 'text';
    SP.store.set(key('pos', meta.id), { li: cur.li, tab: cur.tab, label: lec.label });
    var asPdf = asPdfOf(d, meta), canPdf = !!meta.pdf && !!d.page && !d.pdfOnly;
    var n = d.lectures.length;
    var head = '<header class="lx-head"><div class="lx-bar">' +
      '<a class="btn btn-ghost btn-icon" href="' + esc(backHref(meta)) + '" aria-label="' + esc(SP.t('lx.back')) + '" data-tip="' + esc(SP.t('lx.back')) + '">' + SP.icon('chevron-left') + '</a>' +
      '<div class="lx-title"><b>' + esc(lec.label) + '</b><span>' + esc(meta.short || meta.subject) + '</span></div>' +
      '<a class="btn btn-ghost btn-icon' + (cur.li === 0 ? ' is-off' : '') + '" href="' + (cur.li > 0 ? esc(lecHref(meta, cur.li - 1)) : '#') + '" aria-label="' + esc(SP.t('lx.prevLec')) + '" data-tip="' + esc(SP.t('lx.prevLec')) + '"' + (cur.li === 0 ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + SP.icon('chevron-up') + '</a>' +
      '<a class="btn btn-ghost btn-icon' + (cur.li >= n - 1 ? ' is-off' : '') + '" href="' + (cur.li < n - 1 ? esc(lecHref(meta, cur.li + 1)) : '#') + '" aria-label="' + esc(SP.t('lx.nextLec')) + '" data-tip="' + esc(SP.t('lx.nextLec')) + '"' + (cur.li >= n - 1 ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + SP.icon('chevron-down') + '</a>' +
      '<span class="lx-bar-a">' + SP.focus.btn(true, 'btn-ghost') + '</span>' +
      '</div><div class="lx-tabs" role="tablist" aria-label="' + esc(SP.t('lx.parts')) + '">' + tabs.map(function (t) {
        return '<button type="button" role="tab" data-lxtab="' + t[0] + '" aria-selected="' + (cur.tab === t[0]) + '">' + esc(t[1]) + (t[2] !== '' ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
      }).join('') + '</div><div class="lx-prog" aria-hidden="true"' + (cur.tab === 'text' ? '' : ' hidden') + '><i></i></div></header>';
    var body = cur.tab === 'text' ? textView(meta, d, lec, asPdf, canPdf)
      : cur.tab === 'qs' ? cardsList(meta, d, lec, 'qs', asPdf)
      : cur.tab === 'tasks' ? cardsList(meta, d, lec, 'tasks', asPdf)
      : cur.tab === 'cards' ? flashView(meta, lec) : testView(meta, lec);
    var needPdf = asPdf || d.pdfOnly;
    root.innerHTML = '<div class="nt lx' + (needPdf ? ' is-pdfmode' : '') + '" data-pdf="' + esc(meta.pdf && needPdf ? encodeURI(meta.pdf) : '') + '">' + head + '<div class="lx-body">' + body + '</div></div>';
    wire();
    renderVisuals(root);
    if (needPdf && meta.pdf) wirePdf(encodeURI(meta.pdf));
    if (!keepScroll) window.scrollTo(0, 0);
    onScroll();
  }

  /* --- Текст --- */
  function textView(meta, d, lec, asPdf, canPdf) {
    var x = d._x || {}, sum = (x.sum || {})[lec.id] || [];
    var ctx = { n: 0, d: d, terms: !asPdf && x.terms && x.terms.length ? x.terms : null, used: {} };
    var toc = [], secs = '';
    lec._m.text.forEach(function (si) {
      var s = lec.sections[si], sid = 'lx-s' + si;
      var pdfSec = asPdf && s.pdf && s.pdf.length;
      if (s.title) toc.push('<a href="#" data-lxgo="' + sid + '"><span>' + esc((s.id ? s.id + ' ' : '') + s.title) + '</span></a>');
      secs += '<section class="nt-sec nk-text' + (pdfSec ? ' is-pdf' : '') + '" id="' + sid + '">' +
        (s.title && !pdfSec ? '<div class="nt-sec-head"><h3 class="nt-sec-t">' + (s.id ? '<span class="nt-sec-id">' + esc(s.id) + '</span>' : '') + esc(s.title) + '</h3></div>' : '') +
        (pdfSec ? pdfRegionsHtml(s.pdf, d) : blocksHtml(s.blocks, ctx)) + '</section>';
    });
    var hasToc = toc.length > 1;
    var tools = '<div class="lx-tools">' + (hasToc && tocOff() ? '<button type="button" class="btn btn-sm lx-tocbtn" data-lxtoc>' + SP.icon('panel-left-open', 'ic-sm') + '<span>' + esc(SP.t('notes.toc')) + '</span></button>' : '') + (canPdf ? '<div class="segmented" role="group" aria-label="' + esc(SP.t('notes.view')) + '">' +
      [['pdf', 'file-text'], ['text', 'type']].map(function (m) { return '<button type="button" data-ntmode="' + m[0] + '" aria-pressed="' + (mode() === m[0]) + '">' + SP.icon(m[1], 'ic-sm') + '<span>' + esc(SP.t('notes.view.' + m[0])) + '</span></button>'; }).join('') + '</div>' : '') +
      (meta.pdf ? '<a class="btn btn-ghost btn-sm" href="' + esc(encodeURI(meta.pdf)) + '" target="_blank" rel="noopener">' + SP.icon('external-link', 'ic-sm') + '<span>' + esc(SP.t('notes.pdf')) + '</span></a>' : '') + '</div>';
    var top = '<div class="lx-intro"><div class="lx-eyebrow">' + esc(SP.t('lx.lecOf', { l: lec.label, n: d.lectures.length })) + '</div><h1 class="lx-h1">' + esc(lec.title) + '</h1>' + tools +
      (sum.length ? '<details class="lx-sum"><summary>' + SP.icon('zap', 'ic-sm') + '<span>' + esc(SP.t('lx.sum')) + '</span>' + SP.icon('chevron-down', 'ic-sm lx-sum-chev') + '</summary><ul>' + sum.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></details>' : '') + '</div>';
    var tabs = tabsOf(lec), nx = tabs[1];
    var end = '<div class="lx-end"><span class="small muted">' + esc(SP.t(lec._m.tasks.length ? 'lx.endTasks' : 'lx.endQs')) + '</span>' + (nx ? '<button type="button" class="btn btn-primary" data-lxtab="' + nx[0] + '">' + esc(SP.t('lx.nextTab', { t: nx[1] })) + SP.icon('chevron-right') + '</button>' : '') + '</div>';
    return '<div class="lx-text' + (toc.length > 1 && !tocOff() ? ' has-toc' : '') + (toc.length > 1 && tocOff() ? ' toc-off' : '') + '">' + (toc.length > 1 ? '<nav class="lx-toc" aria-label="' + esc(SP.t('notes.toc')) + '"><div class="lx-toc-h"><b>' + esc(SP.t('notes.toc')) + '</b><button type="button" class="btn btn-ghost btn-sm" data-lxtoc data-tip="' + esc(SP.t('notes.tocHide')) + '" aria-label="' + esc(SP.t('notes.tocHide')) + '">' + SP.icon('panel-left-close', 'ic-sm') + '<span>' + esc(SP.t('lx.hide')) + '</span></button></div>' + toc.join('') + '</nav>' : '') +
      '<div class="lx-main">' + top + '<article class="nt-doc' + (asPdf ? ' nt-paper theme-paper subj-' + esc(meta.id) : '') + '" id="lxDoc"><section class="nt-lec">' + secs + '</section></article>' + end + '</div></div>';
  }

  /* --- Вопросы / задачи: по одной карточке --- */
  function idxOf(meta, lec, kind) { var n = lec._m[kind].length, i = getS('qi', meta.id)[lec.id + ':' + kind] || 0; return Math.max(0, Math.min(n - 1, i)); }
  function cardsList(meta, d, lec, kind, asPdf) {
    var items = lec._m[kind], i = idxOf(meta, lec, kind), it = items[i], b = it.b, marks = getS('marks', meta.id), st = marks[it.key] || '';
    /* на телефоне вырезки из PDF слишком мелкие — если есть текст, показываем текстом */
    var isTask = kind === 'tasks', crop = asPdf && b.qr && b.qr.length && (!isPhone() || d.pdfOnly);
    var word = SP.t(isTask ? 'lx.task' : 'lx.q');
    var good = items.filter(function (x) { return marks[x.key] === 'know'; }).length, again = items.filter(function (x) { return marks[x.key] === 'again'; }).length;
    var dots = items.length <= 80 ? '<div class="lx-dots">' + items.map(function (x, j) { var m = marks[x.key]; return '<button type="button" data-lxi="' + j + '" class="' + (j === i ? 'cur ' : '') + (m === 'know' ? 'ok' : m === 'again' ? 'again' : '') + '" aria-label="' + esc(word + ' ' + (j + 1)) + '"></button>'; }).join('') + '</div>'
      : '<div class="lx-bar2"><i style="width:' + ((i + 1) / items.length * 100) + '%"></i></div>';
    var q, a;
    if (isTask) {
      var title = '<div class="lx-qh"><span class="lx-qn">' + esc(b.num || it.num || i + 1) + '</span><b>' + esc(b.title || it.title || word + ' ' + (i + 1)) + '</b></div>';
      q = title + (crop ? cropHtml(b.qr, d) : blocksHtml(b.q, { d: d })) + plainHtml(b);
      if (d.subject === 'C++' || /cpp/i.test(meta.id)) {
        var code = getS('code', meta.id)[it.key];
        q += '<div class="lx-editor"><div class="eh"><span>' + SP.icon('code', 'ic-sm') + esc(SP.t('lx.yourCode')) + '</span><button type="button" class="btn btn-ghost btn-sm" data-lxreset>' + esc(SP.t('lx.codeReset')) + '</button></div>' +
          '<textarea spellcheck="false" autocapitalize="off" autocomplete="off" data-lxcode aria-label="' + esc(SP.t('lx.yourCode')) + '">' + esc(code != null ? code : TEMPLATE) + '</textarea></div>';
      }
      a = crop && b.ar && b.ar.length ? cropHtml(b.ar, d) : blocksHtml(b.a, { d: d });
    } else {
      q = crop ? cropHtml(b.qr, d) : '<div class="lx-qh"><span class="lx-qn">' + (i + 1) + '</span><b class="lx-qt">' + (typeof b.q === 'string' ? b.q : '') + '</b></div>' + (Array.isArray(b.q) ? blocksHtml(b.q, { d: d }) : '');
      a = crop && b.ar && b.ar.length ? cropHtml(b.ar, d) : blocksHtml(b.a, { d: d });
    }
    /* «Где в лекции?» — только там, где известно точное место ответа (вопросы Философии); у задач не показываем */
    var hasWhere = !isTask && (!!b.src || !!b.where);
    var whereBtn = hasWhere ? '<button type="button" class="btn btn-ghost btn-sm lx-where" data-lxwhere>' + SP.icon('map-pin', 'ic-sm') + '<span>' + esc(SP.t('lx.where')) + '</span></button>' : '';
    var hasA = (b.a && b.a.length) || (b.ar && b.ar.length);
    var stTxt = st ? '<span class="lx-st ' + st + '">' + esc(SP.t(st === 'know' ? (isTask ? 'lx.mSolved' : 'lx.mKnew') : 'lx.mAgain')) + '</span>' : '';
    var card = '<div class="lx-card' + (crop ? ' nt-paper theme-paper subj-' + esc(meta.id) : '') + (st ? ' st-' + st : '') + '" data-swipe data-key="' + esc(it.key) + '">' +
      '<div class="lx-q">' + q + '</div>' + stTxt +
      (hasA ? '<div class="lx-a" hidden>' + a + '</div>' : '') +
      '<div class="lx-acts" data-before>' + (hasA ? '<button type="button" class="btn btn-primary" data-lxreveal>' + SP.icon('eye', 'ic-sm') + '<span>' + esc(SP.t(isTask ? (d.subject === 'C++' ? 'lx.check' : 'notes.showSol') : 'notes.show')) + '</span></button>' : '') +
      (isTask && b.plain && d.subject === 'C++' ? '<button type="button" class="btn btn-sm" data-lxhint>' + esc(SP.t('lx.hint')) + '</button>' : '') + whereBtn + '</div>' +
      (isTask && b.plain && d.subject === 'C++' ? '<div class="lx-hint" hidden><b>' + esc(SP.t('lx.hint')) + '.</b> ' + esc(b.plain) + '</div>' : '') +
      '<div class="lx-mark" hidden data-after><span>' + esc(SP.t(isTask ? 'lx.gotIt' : 'lx.knewIt')) + '</span>' +
      '<button type="button" class="btn' + (st === 'know' ? ' on-ok' : '') + '" data-lxmark="know">' + SP.icon('check', 'ic-sm') + '<span>' + esc(SP.t(isTask ? 'lx.solved' : 'lx.knew')) + '</span></button>' +
      '<button type="button" class="btn' + (st === 'again' ? ' on-warn' : '') + '" data-lxmark="again">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('lx.again')) + '</span></button>' + whereBtn + '</div></div>';
    var last = i >= items.length - 1, tabs = tabsOf(lec), ti = tabs.map(function (t) { return t[0]; }).indexOf(kind), nx = tabs[ti + 1];
    var pager = '<div class="lx-pager"><button type="button" class="btn" data-lxstep="-1"' + (i === 0 ? ' disabled' : '') + '>' + SP.icon('chevron-left') + '<span>' + esc(SP.t('common.back')) + '</span></button>' +
      (!last ? '<button type="button" class="btn btn-primary" data-lxstep="1"><span>' + esc(SP.t('quiz.next')) + '</span>' + SP.icon('chevron-right') + '</button>'
        : nx ? '<button type="button" class="btn btn-primary" data-lxtab="' + nx[0] + '"><span>' + esc(SP.t('lx.nextTab', { t: nx[1] })) + '</span>' + SP.icon('chevron-right') + '</button>' : '<span></span>') + '</div>';
    return '<div class="lx-cards"><div class="lx-meta"><span>' + esc(SP.t('lx.nOf', { w: word, i: i + 1, n: items.length })) + '</span><span>' + SP.icon('check', 'ic-sm') + good + ' · ' + SP.icon('rotate-ccw', 'ic-sm') + again + '</span></div>' + dots + card + pager +
      '<p class="xsmall subtle lx-swipehint">' + esc(SP.t('lx.swipeHint')) + '</p></div>';
  }
  var TEMPLATE = '#include <iostream.h>\n#include <conio.h>\n\nint main()\n{\n    \n\n    getch();\n    return 0;\n}';
  /* пример работы программы под условием задачи (сам код решения не показываем) */
  function plainHtml(b) {
    var ex = (b.a || []).filter(function (x) { return x.t === 'out'; })[0];
    return ex ? blockHtml({ t: 'out', cap: SP.t('notes.plainEx'), text: ex.text }, {}) : '';
  }

  /* --- Карточки для запоминания --- */
  var deck = null;
  function flashView(meta, lec) {
    var all = lec._m.cards, known = getS('cards', meta.id);
    if (!deck || deck.lec !== meta.id + lec.id) deck = { lec: meta.id + lec.id, list: all.slice().sort(function (a, b) { return (known[a.key] === 1) - (known[b.key] === 1); }), i: 0, yes: 0, no: 0 };
    var head = '<p class="small muted">' + esc(SP.t('lx.cardsHint')) + '</p>';
    if (deck.i >= deck.list.length) return '<div class="lx-cards">' + head + '<div class="lx-score"><b>' + deck.yes + '/' + (deck.yes + deck.no) + '</b><span class="muted">' + esc(SP.t('lx.cardsDone')) + '</span><button type="button" class="btn" data-lxdeck>' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('lx.again2')) + '</span></button></div></div>';
    var c = deck.list[deck.i];
    return '<div class="lx-cards">' + head + '<div class="lx-meta"><span>' + (deck.i + 1) + ' / ' + deck.list.length + '</span><span>' + esc(SP.t('lx.cardsStat', { y: deck.yes, n: deck.no })) + '</span></div>' +
      '<div class="lx-fc" id="lxFc"><div class="lx-fc-in" tabindex="0" role="button" aria-label="' + esc(SP.t('lx.flip')) + '"><div class="lx-face f"><span class="k">' + esc(SP.t('lx.q')) + '</span><h3>' + c.q + '</h3><span class="tap">' + esc(SP.t('lx.tapFlip')) + '</span></div>' +
      '<div class="lx-face b"><span class="k">' + esc(SP.t('lx.answer')) + '</span><div class="a">' + c.a + '</div>' + (c.mem ? '<div class="mem"><b>' + esc(SP.t('lx.remember')) + ':</b> ' + c.mem + '</div>' : '') + '</div></div></div>' +
      '<div class="lx-mark2"><button type="button" class="btn" data-lxcard="0">' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('lx.dontKnow')) + '</span></button><button type="button" class="btn" data-lxcard="1">' + SP.icon('check', 'ic-sm') + '<span>' + esc(SP.t('lx.knew')) + '</span></button></div></div>';
  }

  /* --- Тест: движок Тестера --- */
  function testView(meta, lec) {
    var tests = lec._m.tests, ti = Math.min(cur.test || 0, tests.length - 1), t = tests[ti], best = getS('best', meta.id)[t.key];
    return '<div class="lx-test">' + (tests.length > 1 ? '<div class="lx-chips">' + tests.map(function (q, j) { return '<button type="button" class="chip" data-lxtest="' + j + '" aria-pressed="' + (j === ti) + '">' + esc(q.title || SP.t('lx.tab.test')) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="card nt-quiz"><div class="nt-quiz-start"><span class="nt-quiz-ic">' + SP.icon('list-checks') + '</span><div class="grow"><b>' + esc(t.title || SP.t('notes.testTitle', { l: lec.label })) + '</b><div class="small muted">' + esc(SP.t('notes.testN', { n: t.qs.length })) +
      (best != null ? ' · <span class="text-' + (best >= 90 ? 'success' : best >= 50 ? 'warning' : 'danger') + '">' + esc(SP.t('notes.best', { p: best })) + '</span>' : '') + '</div></div>' +
      '<button type="button" class="btn btn-primary" data-lxqstart>' + SP.icon('play') + '<span>' + esc(SP.t(best != null ? 'notes.testAgain' : 'notes.testStart')) + '</span></button></div><div class="nt-quiz-host"></div></div></div>';
  }
  function stopQuiz() { if (!quiz) return; try { quiz.destroy(); } catch (e) { /* ничего */ } quiz = null; }

  /* ---------- События ---------- */
  function setTab(t) { cur.tab = t; returnTo = null; hideBack(); render(); }
  function step(dlt) {
    var lec = cur.d.lectures[cur.li], kind = cur.tab, n = lec._m[kind].length, i = idxOf(cur.meta, lec, kind) + dlt;
    if (i < 0 || i >= n) return;
    patchS('qi', cur.meta.id, lec.id + ':' + kind, i);
    render(true); slideIn(dlt);
  }
  function slideIn(d) {
    var c = SP.$('.lx-card', root); if (!c) return;
    c.classList.add(d > 0 ? 'in-r' : 'in-l');
    var top = SP.$('.lx-head', root).getBoundingClientRect().bottom;
    if (c.getBoundingClientRect().top < top) window.scrollTo(0, Math.max(0, window.scrollY + c.getBoundingClientRect().top - top - 60));
  }
  function wire() {
    var meta = cur.meta, lec = cur.d.lectures[cur.li];
    root.onclick = function (e) {
      var t = e.target.closest('[data-lxtab]'); if (t) { setTab(t.getAttribute('data-lxtab')); return; }
      var off = e.target.closest('a.is-off'); if (off) { e.preventDefault(); return; }
      if (e.target.closest('[data-lxtoc]')) { SP.store.set('sp-notes-toc-off', !tocOff()); var y = window.scrollY; render(true); window.scrollTo(0, y); if (SP.$('.nt-pg', root)) setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50); return; }
      var g = e.target.closest('[data-lxgo]'); if (g) { e.preventDefault(); var el = document.getElementById(g.getAttribute('data-lxgo')); if (el) el.scrollIntoView({ block: 'start' }); return; }
      var tm = e.target.closest('.lx-term'); if (tm) { e.stopPropagation(); showTerm(tm); return; }
      var md = e.target.closest('[data-ntmode]');
      if (md) { var m = md.getAttribute('data-ntmode'); if (m !== mode()) { SP.store.set(MODE_KEY, m); render(); } return; }
      var rv = e.target.closest('[data-lxreveal]');
      if (rv) { var c = rv.closest('.lx-card'), a = SP.$('.lx-a', c); if (a) a.hidden = false; SP.$('[data-before]', c).hidden = true; SP.$('[data-after]', c).hidden = false; var h = SP.$('.lx-hint', c); if (h) h.hidden = true; setTimeout(kickPdf, 0); return; }
      var hn = e.target.closest('[data-lxhint]'); if (hn) { var hh = SP.$('.lx-hint', hn.closest('.lx-card')); hh.hidden = !hh.hidden; return; }
      var mk = e.target.closest('[data-lxmark]');
      if (mk) {
        var card = mk.closest('.lx-card'), v = mk.getAttribute('data-lxmark'); patchS('marks', meta.id, card.getAttribute('data-key'), v);
        SP.$$('[data-lxmark]', card).forEach(function (x) { x.classList.toggle('on-ok', x === mk && v === 'know'); x.classList.toggle('on-warn', x === mk && v === 'again'); });
        setTimeout(function () { var n = lec._m[cur.tab].length; if (idxOf(meta, lec, cur.tab) < n - 1) step(1); else render(true); }, 350);
        return;
      }
      var st = e.target.closest('[data-lxstep]'); if (st) { step(+st.getAttribute('data-lxstep')); return; }
      var di = e.target.closest('[data-lxi]'); if (di) { patchS('qi', meta.id, lec.id + ':' + cur.tab, +di.getAttribute('data-lxi')); render(true); return; }
      var wh = e.target.closest('[data-lxwhere]'); if (wh) { showWhere(wh.closest('.lx-card').getAttribute('data-key')); return; }
      var rs = e.target.closest('[data-lxreset]'); if (rs) { var ta = SP.$('[data-lxcode]', rs.closest('.lx-card')); ta.value = TEMPLATE; patchS('code', meta.id, rs.closest('.lx-card').getAttribute('data-key'), null); return; }
      var fc = e.target.closest('.lx-fc-in'); if (fc) { SP.$('#lxFc', root).classList.toggle('flip'); return; }
      var cd = e.target.closest('[data-lxcard]');
      if (cd) {
        var yes = cd.getAttribute('data-lxcard') === '1', cc = deck.list[deck.i]; patchS('cards', meta.id, cc.key, yes ? 1 : 0);
        if (yes) deck.yes++; else { deck.no++; deck.list.splice(Math.min(deck.i + 3, deck.list.length), 0, cc); }
        deck.i++; render(true); return;
      }
      if (e.target.closest('[data-lxdeck]')) { deck = null; render(true); return; }
      var pg = isPhone() && e.target.closest('.nt-pg'); if (pg && pg.querySelector('canvas') && !e.target.closest('button, a')) { zoom(pg); return; }
      var tt = e.target.closest('[data-lxtest]'); if (tt) { cur.test = +tt.getAttribute('data-lxtest'); render(true); return; }
      if (e.target.closest('[data-lxqstart]')) { startQuiz(); return; }
    };
    SP.$$('[data-lxcode]', root).forEach(function (ta) {
      var k = ta.closest('.lx-card').getAttribute('data-key');
      ta.addEventListener('input', SP.debounce(function () { patchS('code', meta.id, k, ta.value); }, 300));
      ta.addEventListener('keydown', function (e) { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); } });
    });
    var sw = SP.$('[data-swipe]', root);
    if (sw) {
      var sx = null, sy = 0;
      sw.addEventListener('touchstart', function (e) { if (e.touches.length === 1 && !e.target.closest('pre, textarea, .nt-table, .code')) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } else sx = null; }, { passive: true });
      sw.addEventListener('touchend', function (e) { if (sx == null) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1); }, { passive: true });
    }
    var fl = SP.$('#lxFc', root);
    if (fl) SP.$('.lx-fc-in', fl).onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fl.classList.toggle('flip'); } };
  }
  function startQuiz() {
    var meta = cur.meta, lec = cur.d.lectures[cur.li], tests = lec._m.tests, t = tests[Math.min(cur.test || 0, tests.length - 1)];
    var card = SP.$('.nt-quiz', root); SP.$('.nt-quiz-start', card).hidden = true;
    /* тест сразу показывает «верно / неверно», когда знает число верных вариантов (n).
       В конспектах поле n значило другое (сколько раз вопрос повторяется в базе ★) — пересчитываем */
    var qs = t.qs.map(function (q) { var o = q.opts || []; return Object.assign({}, q, { type: q.type || 'choice', n: o.filter(function (x) { return x.right; }).length || 1 }); });
    quiz = SP.Quiz(SP.$('.nt-quiz-host', card), qs, {
      title: lec.label + ' · ' + SP.t('notes.test'),
      onExit: function () { stopQuiz(); render(true); },
      onFinish: function (r) { var b = getS('best', meta.id); if (b[t.key] == null || r.pct > b[t.key]) { b[t.key] = r.pct; setS('best', meta.id, b); } }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!cur || SP.views.current() !== 'notes' || (cur.tab !== 'qs' && cur.tab !== 'tasks')) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });

  /* ---------- «Где в лекции?» и обратно ---------- */
  function showWhere(itemKey) {
    var lec = cur.d.lectures[cur.li], kind = cur.tab, items = lec._m[kind], it = items.filter(function (x) { return x.key === itemKey; })[0]; if (!it) return;
    returnTo = { tab: kind, n: items.indexOf(it) + 1, task: kind === 'tasks', num: it.b.num };
    cur.tab = 'text'; render();
    setTimeout(function () {
      var target = null, off = 0, lineH = 0;
      if (it.b.src && !returnTo.task) {
        var p = it.b.src.p, y = it.b.src.y;
        SP.$$('.nt-sec.nk-text .nt-pdf .nt-pg', root).some(function (el) {
          var t = +el.getAttribute('data-t'), b = +el.getAttribute('data-b');
          if (+el.getAttribute('data-p') === p && y <= t && y >= b) { target = el; off = (t - y - 11) / (t - b) * el.offsetHeight; lineH = 40 / (t - b) * el.offsetHeight; return true; }
          return false;
        });
        if (!target) SP.$$('.nt-sec.nk-text [data-sp]', root).forEach(function (el) { var sp = +el.getAttribute('data-sp'), sy = +el.getAttribute('data-sy'); if (sp < p || (sp === p && sy >= y - 1)) target = el; });
      } else if (it.b.where && !returnTo.task) {
        /* свой конспект: «@ Где: подзаголовок» — ищем раздел или подзаголовок с таким названием */
        var wl = SP.lc(it.b.where);
        SP.$$('.nt-sec.nk-text .nt-sec-t, .nt-sec.nk-text .nt-h', root).some(function (el) { var tx = SP.lc(el.textContent.trim()); if (tx && (tx === wl || tx.indexOf(wl) >= 0 || wl.indexOf(tx) >= 0)) { target = el.closest('.nt-sec-head') || el; return true; } return false; });
      } else if (it.whereSi != null) target = document.getElementById('lx-s' + it.whereSi);
      showBack();
      if (!target) { SP.toast(SP.t('notes.whereNone'), 'info'); return; }
      var bar = SP.$('.lx-head', root).getBoundingClientRect().bottom;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + Math.max(0, off) - bar - (returnTo.task ? 8 : 60) });
      var fl = document.createElement('div'); fl.className = 'nt-flash';
      if (target.classList.contains('nt-pg')) { fl.style.top = Math.max(0, off - 4) + 'px'; fl.style.height = Math.max(28, lineH) + 'px'; target.appendChild(fl); }
      else target.classList.add('lx-flash');
      setTimeout(function () { fl.remove(); target.classList.remove('lx-flash'); }, 3500);
      setTimeout(kickPdf, 300);
    }, 40);
  }
  function showBack() {
    hideBack(); if (!returnTo) return;
    var r = returnTo, bk = SP.el('<button type="button" class="btn btn-primary lx-backq">' + SP.icon('arrow-up') + '<span>' + esc(SP.t(r.task ? 'lx.backTask' : 'lx.backQ', { n: r.task && r.num ? r.num : r.n })) + '</span></button>');
    bk.onclick = function () { returnTo = null; hideBack(); cur.tab = r.tab; render(); };
    document.body.appendChild(bk);
  }
  function hideBack() { var o = SP.$('.lx-backq'); if (o) o.remove(); }

  /* телефон: кусок PDF мелкий — по нажатию открываем его на весь экран крупнее (листается в стороны, можно приближать) */
  function zoom(pg) {
    var url = SP.$('.nt[data-pdf]', root).getAttribute('data-pdf'); if (!url) return;
    var ov = SP.el('<div class="lx-zoom" role="dialog" aria-modal="true" aria-label="' + esc(SP.t('lx.zoom')) + '"><button type="button" class="btn btn-icon lx-zoom-x" aria-label="' + esc(SP.t('common.close')) + '">' + SP.icon('x') + '</button><div class="lx-zoom-sc"></div></div>');
    var big = pg.cloneNode(false); big.removeAttribute('data-done'); big.removeAttribute('data-busy'); big.className = 'nt-pg lx-zoom-pg'; big.style.width = '';
    SP.$('.lx-zoom-sc', ov).appendChild(big); document.body.appendChild(ov); document.documentElement.classList.add('lx-zoom-on');
    var close = function () { ov.remove(); document.documentElement.classList.remove('lx-zoom-on'); document.removeEventListener('keydown', onK); };
    var onK = function (e) { if (e.key === 'Escape') close(); };
    SP.$('.lx-zoom-x', ov).onclick = close; document.addEventListener('keydown', onK);
    renderPg(big, url);
  }

  /* термин: короткое определение рядом со словом */
  var pop = null;
  function showTerm(btn) {
    var t = ((cur.d._x || {}).terms || [])[+btn.getAttribute('data-term')]; if (!t) return;
    hideTerm();
    pop = SP.el('<div class="lx-pop" role="tooltip"><b>' + esc(t[1]) + '</b>' + esc(t[2]) + '</div>');
    document.body.appendChild(pop);
    var r = btn.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
    pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + window.scrollX + r.width / 2 - w / 2)) + 'px';
  }
  function hideTerm() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('click', function (e) { if (pop && !e.target.closest('.lx-term, .lx-pop')) hideTerm(); });

  /* сколько текста прочитано: полоска под вкладками + отметка в папке */
  var scT = 0;
  function onScroll() {
    if (!cur || !root || SP.views.current() !== 'notes' || cur.tab !== 'text') return;
    var doc = SP.$('#lxDoc', root), bar = SP.$('.lx-prog i', root); if (!doc || !bar) return;
    var r = doc.getBoundingClientRect(), p = Math.max(0, Math.min(100, (window.innerHeight - r.top) / Math.max(1, r.height) * 100));
    bar.style.width = p + '%';
    var lec = cur.d.lectures[cur.li], rd = getS('read', cur.meta.id);
    if (p > (rd[lec.id] || 0) + 2 || (p > 97 && (rd[lec.id] || 0) < 100)) { clearTimeout(scT); scT = setTimeout(function () { patchS('read', cur.meta.id, lec.id, p > 97 ? 100 : Math.round(p)); }, 300); }
  }
  window.addEventListener('scroll', function () { onScroll(); }, { passive: true });

  /* ---------- Маршрут ---------- */
  function show(params) {
    if (!root) return;
    params = params || [];
    var want = params[0] || null, li = params[1] != null && params[1] !== '' ? +params[1] : null;
    if (!want) { SP.navigate('subjects'); return; }
    if (cur && cur.meta.id === want && li === cur.li && SP.$('.lx', root)) return;
    document.documentElement.classList.add('lx-on');
    root.innerHTML = '<div class="page"><p class="muted">' + SP.icon('loader-circle', 'spin') + ' ' + esc(SP.t('notes.loading')) + '</p></div>';
    loadIndex().then(function () {
      var meta = index.filter(function (m) { return m.id === want; })[0];
      if (!meta) { SP.navigate('subjects'); return; }
      return loadDoc(meta).then(function (d) {
        var pos = continueOf(meta) || {};
        if (li == null || isNaN(li)) li = pos.li || 0;
        li = Math.max(0, Math.min(d.lectures.length - 1, li));
        var tab = cur && cur.meta.id === meta.id && cur.li === li ? cur.tab : (pos.li === li && pos.tab) || 'text';
        cur = { meta: meta, d: d, li: li, tab: tab, test: 0 }; deck = null; returnTo = null; hideBack();
        render();
      });
    }).catch(function () {
      root.innerHTML = '<div class="page"><section class="card"><div class="empty">' + SP.icon('cloud-off', 'ic-xl') + '<h3>' + esc(SP.t('notes.loadError')) + '</h3></div></section></div>';
    });
  }

  SP.notes = { forSubject: forSubject, lecStats: lecStats, continueOf: continueOf, href: lecHref, has: has, visuals: renderVisuals,
    /* свой конспект добавили, изменили или удалили — список и открытый конспект перечитать */
    reload: function () { index = null; docs = {}; extras = {}; idxAsked = false; cur = null; return loadIndex().then(function () { SP.emit('notes-index'); }); } };
  SP.views.register('notes', {
    titleKey: 'nav.notes',
    mount: function (el) { root = el; },
    show: function (params) { show(params); },
    hide: function () { stopQuiz(); hideBack(); hideTerm(); document.documentElement.classList.remove('lx-on'); },
    refresh: function () { if (cur && root && SP.views.current() === 'notes') render(true); }
  });
  SP.on('auth', function () { index = null; docs = {}; extras = {}; cur = null; });
})();

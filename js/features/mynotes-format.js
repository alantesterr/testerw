/* =====================================================================
   МОИ КОНСПЕКТЫ — ФОРМАТ. Конспект, который сделал ИИ (или человек), → внутренний вид
   конспектов StudyPlay (как data/<группа>/notes/*.json), чтобы он показывался тем же экраном:
   «Главное за 1 минуту», текст с подзаголовками и терминами, вопросы с ответами и «Где в лекции?»,
   задачи с решением, карточки, тест.
   Принимает два вида:
     1) текстовая разметка (её советуем — бесплатные ИИ почти не ошибаются);
     2) JSON { "format": "studyplay-notes", ... } (и внутренний формат сайта как есть).
   Ничего не знает про экран: только разбор и проверка. Экран — mynotes.js и notes.js.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- строка → HTML: **жирный**, *курсив*, ==маркер==, `код`, $формула$, [ссылка](https://…) ---------- */
  function inline(s) {
    s = String(s == null ? '' : s);
    var keep = [];
    var hold = function (html) { keep.push(html); return '\u0000' + (keep.length - 1) + '\u0000'; };
    s = s.replace(/`([^`\n]+)`/g, function (m, c) { return hold('<code class="inline">' + esc(c) + '</code>'); });
    s = s.replace(/\$([^$\n]{1,300})\$/g, function (m, t) { return hold('<span class="nt-tex" data-tex="' + esc(t) + '">' + esc(t) + '</span>'); });
    s = s.replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^)\s]+)\)/g, function (m, t, u) { return hold('<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(t) + '</a>'); });
    s = esc(s)
      .replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>').replace(/__([^_\n]+?)__/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<i>$2</i>')
      .replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return keep[+i]; });
  }
  /* для теста, «Главного», названий — без разметки */
  function plain(s) { return String(s == null ? '' : s).replace(/\*\*|__|==|`/g, '').replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2').replace(/\s+/g, ' ').trim(); }

  /* ---------- блоки текста: абзацы, списки, таблицы, «Запомни», код, схемы, формулы, картинки ---------- */
  var NOTE_RE = /^>\s*(Запомни|Важно|Нюанс|Совет|Подсказка|Ловушка|Частая ошибка|Ошибка|Пример|Определение|Итог|Есте сақта|Маңызды|Remember|Important|Tip|Example)\s*[:.!—-]\s*(.*)$/i;
  var NOTE_NAME = { 'remember': 'Запомни', 'important': 'Важно', 'tip': 'Совет', 'example': 'Пример', 'есте сақта': 'Запомни', 'маңызды': 'Важно' };
  function blocks(lines, ctx) {
    var out = [], para = [], i = 0;
    var flush = function () { if (para.length) { out.push({ t: 'p', html: inline(para.join(' ')) }); para = []; } };
    while (i < lines.length) {
      var raw = lines[i], ln = raw.replace(/\s+$/, ''), tr = ln.trim();
      if (!tr) { flush(); i++; continue; }
      /* ```язык … ``` — код, схема (mermaid), вывод программы */
      var f = tr.match(/^(```|~~~)\s*([\w+#.-]*)\s*(.*)$/);
      if (f) {
        flush(); var lang = f[2].toLowerCase(), cap = f[3] || '', body = []; i++;
        while (i < lines.length && !/^\s*(```|~~~)\s*$/.test(lines[i])) body.push(lines[i++]);
        i++;
        var text = body.join('\n').replace(/\s+$/, '');
        if (lang === 'mermaid' || lang === 'схема' && /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|mindmap|timeline|gantt)/.test(text.trim())) out.push({ t: 'mermaid', text: text, cap: cap });
        else if (/^(вывод|output|out|результат)$/.test(lang)) out.push({ t: 'out', text: text, cap: cap });
        else if (/^(схема|scheme|text|txt|plain|)$/.test(lang)) out.push({ t: 'code', cap: cap ? 'Схема · ' + cap : 'Схема', text: text });
        else out.push({ t: 'code', lang: lang, cap: cap, text: text });
        continue;
      }
      /* $$ формула $$ */
      if (/^\$\$/.test(tr)) {
        flush(); var tex = tr.replace(/^\$\$/, '');
        if (/\$\$$/.test(tex) && tex.length > 2) tex = tex.replace(/\$\$$/, '');
        else { i++; while (i < lines.length && !/\$\$\s*$/.test(lines[i])) tex += '\n' + lines[i++]; if (i < lines.length) tex += '\n' + lines[i].replace(/\$\$\s*$/, ''); }
        out.push({ t: 'math', tex: tex.trim() }); i++; continue;
      }
      /* таблица | a | b | */
      if (/^\|.*\|\s*$/.test(tr)) {
        flush(); var rows = [], head = false;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          var r = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
          if (r.every(function (c) { return /^:?-{2,}:?$/.test(c); })) head = rows.length === 1; else rows.push(r.map(inline));
          i++;
        }
        if (rows.length) out.push({ t: 'table', head: head, rows: rows });
        continue;
      }
      /* картинка: ![подпись](ссылка или img:N) и место под картинку [[КАРТИНКА: что изобразить]] */
      var im = tr.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
      if (im) { flush(); var src = im[2]; var ref = src.match(/^img:(\w+)$/i); out.push(ref ? { t: 'img', ref: ref[1], cap: im[1], src: ctx && ctx.images && ctx.images[ref[1]] || '' } : { t: 'img', src: /^(https?:|data:image\/)/i.test(src) ? src : '', cap: im[1] }); i++; continue; }
      var ph = tr.match(/^\[\[\s*(?:КАРТИНКА|РИСУНОК|ИЗОБРАЖЕНИЕ|ФОТО|СУРЕТ|IMAGE|PICTURE)\s*[:：]\s*(.+?)\s*\]\]$/i);
      if (ph) { flush(); out.push({ t: 'img', ph: true, cap: ph[1] }); i++; continue; }
      /* «> Запомни: …» и просто «> цитата» */
      if (/^>/.test(tr)) {
        flush(); var nm = tr.match(NOTE_RE), kind = '', txt = [];
        if (nm) { kind = NOTE_NAME[nm[1].toLowerCase()] || nm[1].charAt(0).toUpperCase() + nm[1].slice(1).toLowerCase(); txt.push(nm[2]); } else txt.push(tr.replace(/^>\s?/, ''));
        i++;
        while (i < lines.length && /^\s*>/.test(lines[i]) && !NOTE_RE.test(lines[i].trim())) txt.push(lines[i++].trim().replace(/^>\s?/, ''));
        out.push({ t: 'note', kind: kind, html: inline(txt.join(' ')) });
        continue;
      }
      /* подзаголовок внутри текста/ответа */
      var hh = tr.match(/^#{3,6}\s+(.+)$/);
      if (hh) { flush(); out.push({ t: 'h', html: '<b>' + inline(hh[1].replace(/#+$/, '').trim()) + '</b>' }); i++; continue; }
      /* списки */
      var li = tr.match(/^([-*•–])\s+(.+)$/), oi = tr.match(/^(\d{1,3})[.)]\s+(.+)$/);
      if (li || oi) {
        flush(); var tag = li ? 'ul' : 'ol', items = [];
        while (i < lines.length) {
          var t2 = lines[i].trim(), a = t2.match(/^([-*•–])\s+(.+)$/), b = t2.match(/^(\d{1,3})[.)]\s+(.+)$/);
          if (tag === 'ul' && a) items.push(inline(a[2]));
          else if (tag === 'ol' && b) items.push(inline(b[2]));
          else if (t2 && items.length && /^\s{2,}\S/.test(lines[i]) && !a && !b) items[items.length - 1] += ' ' + inline(t2);
          else break;
          i++;
        }
        out.push({ t: tag, items: items });
        continue;
      }
      para.push(tr); i++;
    }
    flush();
    return out;
  }

  /* ---------- разделы лекции по названию заголовка ---------- */
  function partOf(h) {
    var x = String(h).toLowerCase().replace(/[*_:#.]/g, '').trim();
    if (/^(главное|кратко|коротко|суть за|главное за|негізгі|summary|key points)/.test(x)) return 'sum';
    if (/^(конспект|текст|содержание|материал|теория|мәтін|text|notes)(?![а-яёәіңғүұқөһa-z])/.test(x)) return 'text';
    if (/^(термин|понятия|словарь|глоссарий|терминдер|terms|glossary)/.test(x)) return 'terms';
    if (/^(вопрос|сұрақ|questions)/.test(x)) return 'qs';
    if (/^(задач|практик|упражнен|есеп|tasks|exercises|problems)/.test(x)) return 'tasks';
    if (/^(карточк|флеш|карточкалар|cards|flashcards)/.test(x)) return 'cards';
    if (/^(тест|проверь себя|quiz|test)/.test(x)) return 'test';
    return '';
  }
  var LEC_RE = /^(лекция|лекции|тема|занятие|семинар|практика|урок|глава|модуль|дәріс|тақырып|сабақ|lecture|topic|lesson|chapter|unit)(?![а-яёәіңғүұқөһa-z])/i;   /* \b в JS не работает с кириллицей */
  function lectureHead(text, idx) {
    var t = plain(text).replace(/^#+\s*/, '');
    var m = t.match(/^((?:лекция|тема|занятие|семинар|практика|урок|глава|модуль|дәріс|тақырып|сабақ|lecture|topic|lesson|chapter|unit)\s*№?\s*([\dIVXLC]+(?:[.-][\dIVXLC]+)*))\s*[.:—–-]?\s*(.*)$/i);
    if (m) return { label: m[1].replace(/\s+/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }), n: m[2], title: m[3] || m[1] };
    return { label: 'Лекция ' + (idx + 1), n: String(idx + 1), title: t, auto: true };
  }

  /* ---------- текстовая разметка ---------- */
  function parseMarkup(src, ctx) {
    var lines = unwrap(String(src || '').replace(/\r/g, '').replace(/ /g, ' ')).split('\n');
    var res = { subject: '', title: '', lectures: [] }, terms = [], sum = {}, warn = [], cur = null, part = null, buf = [], partTitle = '', inFence = false;
    var newLec = function (h) { flush(); var hd = lectureHead(h, res.lectures.length); cur = { id: 'l' + (res.lectures.length + 1), n: hd.n, label: hd.label, title: hd.title, sections: [], cards: [], _sum: [], _auto: !!hd.auto }; res.lectures.push(cur); part = 'text'; partTitle = ''; };
    var need = function () { if (!cur) newLec(res.title || 'Лекция 1'); };
    function flush() {
      if (!buf.length) return;
      var lines2 = buf; buf = [];
      if (!lines2.some(function (l) { return l.trim(); })) return;
      need();
      if (part === 'sum') lines2.forEach(function (l) { var m = l.trim().match(/^(?:[-*•–]|\d+[.)])\s*(.+)$/) || (l.trim() ? [0, l.trim()] : null); if (m) cur._sum.push(plain(m[1])); });
      else if (part === 'terms') lines2.forEach(function (l) { var m = l.trim().replace(/^[-*•–]\s*/, '').match(/^(.{2,80}?)\s*(?:—|–|:|\s-\s)\s*(.+)$/); if (m) terms.push([plain(m[1]), plain(m[2])]); });
      else if (part === 'qs') cur.sections.push({ kind: 'qa', title: partTitle || 'Вопросы', blocks: parseQA(lines2, ctx, warn, cur) });
      else if (part === 'tasks') cur.sections.push({ kind: 'tasks', title: partTitle || 'Задачи', blocks: parseTasks(lines2, ctx, warn, cur) });
      else if (part === 'cards') parseCards(lines2, cur);
      else if (part === 'test') { var qs = parseTest(lines2, warn, cur); if (qs.length) cur.sections.push({ kind: 'test', title: partTitle || 'Тест', blocks: [{ t: 'quiz', questions: qs }] }); }
      else textSections(lines2, ctx, cur, partTitle);
    }
    var sawHead = false;
    var CHATTER = /^(продолжение следует|\(?продолжение\)?|дальше\.?|конец( конспекта)?\.?|если (нужно|хотите|надо)|надеюсь|хотите,? (я|чтобы)|могу (также|ещё|сделать)|готов(о|а)?[,!.]|вот (ваш |твой )?конспект|конечно[,!])/i;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i], tr = ln.trim();
      if (!inFence && CHATTER.test(tr) && !/^[#?=@+\-|>]/.test(tr)) continue;   /* служебные фразы ИИ */
      if (!sawHead && !/^#/.test(tr) && !/^(предмет|дисциплина|subject|пән)\s*:/i.test(tr) && !/^\*\*[^*]{2,80}\*\*:?$/.test(tr)) continue;   /* вступление до первого заголовка */
      if (/^#/.test(tr) || /^\*\*[^*]{2,80}\*\*:?$/.test(tr)) sawHead = true;
      if (/^(```|~~~)/.test(tr)) inFence = !inFence;
      if (inFence || /^(```|~~~)/.test(tr)) { buf.push(ln); continue; }
      var hm = tr.match(/^(#{1,6})\s*(.+?)\s*#*$/) || (/^\*\*[^*]{2,80}\*\*:?$/.test(tr) ? [tr, '###', tr.replace(/\*\*|:$/g, '')] : null);
      if (hm) {
        var level = hm[1].length, h = hm[2].replace(/\*\*/g, '').trim();
        /* «#### …» (и глубже) — всегда подзаголовок текста, даже «Задачи философии» или «Тест Тьюринга» */
        if (level >= 4) { if (part === 'text' || part == null) { flush(); need(); part = 'text'; buf.push('\u0002' + h); } else buf.push(ln); continue; }
        var pk = partOf(h);
        if (level === 1 && /^(конспект|курс|предмет)\s*[:.—-]/i.test(h)) { res.title = h.replace(/^(конспект|курс|предмет)\s*[:.—-]\s*/i, ''); continue; }
        if (level === 1 && !LEC_RE.test(h) && !res.lectures.length) { res.title = h; continue; }
        if (LEC_RE.test(h) && !pk && level <= 2) { newLec(h); continue; }
        if (pk && level >= 2) { flush(); need(); part = pk; partTitle = pk === 'text' ? '' : (/^(вопросы|задачи|тест|карточки|термины|главное.*)$/i.test(h) ? '' : h); continue; }
        if (level <= 2 && !pk && !cur) { newLec(h); continue; }
        if (level <= 2 && !pk) { newLec(h); continue; }
        if (part === 'text' || part == null) { flush(); need(); part = 'text'; buf.push('\u0002' + h); continue; }   /* подраздел текста */
        buf.push(ln); continue;
      }
      var sm = !res.lectures.length && tr.match(/^(предмет|дисциплина|subject|пән)\s*:\s*(.+)$/i);
      if (sm) { res.subject = sm[2].trim(); continue; }
      buf.push(ln);
    }
    flush();
    return finish(res, terms, warn);
  }
  /* ИИ часто заворачивает весь ответ (или каждую его часть после «продолжи») в ```markdown … ```.
     Такую обёртку узнаём по тому, что сразу за ней идёт заголовок «#», и убираем; настоящие блоки кода не трогаем. */
  function unwrap(text) {
    var L = text.split('\n'), out = [], inner = false, wrap = false;
    var nextIsHead = function (i) { for (var j = i + 1; j < L.length; j++) { if (L[j].trim()) return /^#/.test(L[j].trim()); } return false; };
    for (var i = 0; i < L.length; i++) {
      var tr = L[i].trim();
      if (!inner) {
        if (/^```\s*(markdown|md|text|txt|plaintext)?\s*$/i.test(tr) && !wrap && nextIsHead(i)) { wrap = true; continue; }
        if (tr === '```' && wrap) { wrap = false; continue; }
        if (/^(```|~~~)/.test(tr)) inner = true;
      } else if (/^(```|~~~)\s*$/.test(tr)) inner = false;
      out.push(L[i]);
    }
    return out.join('\n');
  }
  /* текст → разделы (каждый «#### Заголовок» — отдельный раздел с пунктом в оглавлении) */
  function textSections(lines, ctx, lec, firstTitle) {
    var secs = [], cur = { kind: 'text', title: firstTitle || '', lines: [] };
    lines.forEach(function (l) {
      if (l.charAt(0) === '\u0002') { if (cur.lines.some(function (x) { return x.trim(); }) || cur.title) secs.push(cur); cur = { kind: 'text', title: plain(l.slice(1)), lines: [] }; }
      else cur.lines.push(l);
    });
    if (cur.lines.some(function (x) { return x.trim(); }) || cur.title) secs.push(cur);
    secs.forEach(function (s) { lec.sections.push({ kind: 'text', title: s.title, blocks: blocks(s.lines, ctx) }); });
  }
  /* ? Вопрос / = Ответ / @ Где: подзаголовок */
  var Q_RE = /^(?:\?\s*|вопрос\s*\d*\s*[:.)]\s*|q\s*\d*\s*[:.)]\s*|сұрақ\s*\d*\s*[:.)]\s*)(.+)$/i;
  var A_RE = /^(?:=\s*|ответ\s*[:.)]\s*|a\s*[:.)]\s*|жауап\s*[:.)]\s*)(.*)$/i;
  var W_RE = /^@\s*(?:где|где в лекции|where|қайда)?\s*[:：]?\s*(.+)$/i;
  function parseQA(lines, ctx, warn, lec) {
    var out = [], it = null;
    var push = function () { if (!it) return; if (!it.a.some(function (x) { return x.trim(); })) warn.push(lec.label + ': у вопроса «' + plain(it.q).slice(0, 60) + '» нет ответа'); out.push({ t: 'qa', q: inline(it.q), a: blocks(it.a, ctx), where: it.where || '' }); it = null; };
    lines.forEach(function (l) {
      var tr = l.trim(), q = tr.match(Q_RE), a = tr.match(A_RE), w = tr.match(W_RE);
      if (q) { push(); it = { q: q[1].trim(), a: [], inA: false }; return; }
      if (!it) { if (tr) { var nq = tr.match(/^\d{1,3}[.)]\s+(.+\?)\s*$/); if (nq) it = { q: nq[1], a: [], inA: false }; } return; }
      if (w && (it.inA || it.a.length)) { it.where = plain(w[1]); return; }
      if (a && !it.inA) { it.inA = true; if (a[1].trim()) it.a.push(a[1]); return; }
      if (!it.inA && tr && !it.a.length) { it.q += ' ' + tr; return; }
      it.inA = true; it.a.push(l);
    });
    push();
    return out;
  }
  /* ?? 1.1 Название / условие / == решение */
  function parseTasks(lines, ctx, warn, lec) {
    var out = [], it = null, n = 0;
    var push = function () { if (!it) return; if (!it.a.some(function (x) { return x.trim(); })) warn.push(lec.label + ': у задачи «' + (it.title || it.num) + '» нет решения'); out.push({ t: 'qa', task: true, num: it.num, title: it.title, q: blocks(it.q, ctx), a: blocks(it.a, ctx), where: it.where || '' }); it = null; };
    lines.forEach(function (l) {
      var tr = l.trim();
      var st = tr.match(/^(?:\?\?\s*|задача\s*|task\s*|есеп\s*)(№?\s*[\d.]+[а-яa-z]?)?\s*[.:)—-]?\s*(.*)$/i);
      if (st && (/^\?\?/.test(tr) || /^(задача|task|есеп)\s*№?\s*[\d.]*\s*[.:)—-]/i.test(tr))) {
        push(); n++; it = { num: (st[1] || String(n)).replace(/^№\s*/, '').trim(), title: plain(st[2] || ''), q: [], a: [], inA: false }; return;
      }
      if (!it) return;
      var a = tr.match(/^(?:==\s*|решение\s*[:.)]?\s*|ответ\s*[:.)]\s*|шешуі\s*[:.)]?\s*|solution\s*[:.)]?\s*)(.*)$/i);
      var w = tr.match(W_RE);
      if (w && it.inA) { it.where = plain(w[1]); return; }
      if (a && !it.inA && (/^==/.test(tr) || /^(решение|шешуі|solution)(?![а-яёәіңғүұқөһa-z])/i.test(tr) || /^ответ\s*[:.)]/i.test(tr))) { it.inA = true; if (a[1].trim()) it.a.push(a[1]); return; }
      (it.inA ? it.a : it.q).push(l);
    });
    push();
    return out;
  }
  /* «Лицевая сторона — обратная» или ? / = */
  function parseCards(lines, lec) {
    var q = null;
    lines.forEach(function (l) {
      var tr = l.trim().replace(/^[-*•–]\s+/, ''); if (!tr) return;
      var qm = tr.match(Q_RE), am = tr.match(A_RE);
      if (qm) { q = qm[1]; return; }
      if (am && q) { lec.cards.push({ q: inline(q), a: '<p>' + inline(am[1]) + '</p>' }); q = null; return; }
      var m = tr.match(/^(.{1,200}?)\s+(?:—|–|-|→|=>)\s+(.+)$/) || tr.match(/^(.{1,120}?)\s*[:：]\s+(.+)$/);
      if (m) lec.cards.push({ q: inline(m[1]), a: '<p>' + inline(m[2]) + '</p>' });
    });
  }
  /* 1. Вопрос / + верный / - неверный (верных может быть несколько) */
  function parseTest(lines, warn, lec) {
    var out = [], q = null;
    var push = function () {
      if (!q) return;
      if (q.opts.length < 2) warn.push(lec.label + ', тест: у вопроса «' + q.q.slice(0, 60) + '» меньше двух вариантов');
      else if (!q.opts.some(function (o) { return o.right; })) warn.push(lec.label + ', тест: у вопроса «' + q.q.slice(0, 60) + '» не отмечен верный ответ (+)');
      else out.push({ q: q.q, type: 'choice', opts: q.opts, n: q.opts.filter(function (o) { return o.right; }).length });
      q = null;
    };
    lines.forEach(function (l) {
      var tr = l.trim(); if (!tr) return;
      var o = tr.match(/^([+\-*✓✔✗✘×]|\[[xх ✓]?\])\s*(.+)$/i);
      var lo = tr.match(/^[a-fа-е][.)]\s+(.+)$/i);
      var qq = tr.match(/^(?:\d{1,3}[.)]|\?|вопрос\s*\d*[:.)])\s*(.+)$/i);
      if (o && q) { var right = /^[+*✓✔]|^\[[xх✓]\]/i.test(o[1]); q.opts.push({ t: plain(o[2].replace(/\s*\((верно|правильно|true|correct)\)\s*$/i, '')), right: right || /\((верно|правильно|true|correct)\)\s*$/i.test(o[2]) }); return; }
      if (lo && q) { q.opts.push({ t: plain(lo[1].replace(/\s*(\((верно|правильно)\)|✓|✔)\s*$/i, '')), right: /(\((верно|правильно)\)|✓|✔)\s*$/i.test(lo[1]) }); return; }
      if (qq) { push(); q = { q: plain(qq[1]), opts: [] }; return; }
      if (q && !q.opts.length) q.q += ' ' + plain(tr);
    });
    push();
    return out;
  }

  /* ---------- JSON ---------- */
  function looseJson(src) {
    var s = String(src || '').replace(/^\s*```[\w-]*\s*\n?/, '').replace(/\n?```\s*$/, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0) throw new Error('В тексте нет JSON-объекта { … }.');
    if (b < a) throw new Error('JSON оборвался на середине. Напишите ИИ «дальше» и вставьте продолжение сразу под этим текстом — или попросите конспект в формате «Текст».');
    s = s.slice(a, b + 1);
    try { return JSON.parse(s); } catch (e1) {
      var fixed = s.replace(/[“”«»]/g, function (c) { return c === '«' || c === '»' ? c : '"'; }).replace(/,\s*([}\]])/g, '$1');
      try { return JSON.parse(fixed); } catch (e2) {
        var pos = +((String(e2.message).match(/position\s+(\d+)/) || [])[1]); var line = isNaN(pos) ? null : fixed.slice(0, pos).split('\n').length;
        throw new Error('JSON с ошибкой' + (line ? ' (строка ' + line + ')' : '') + ': ' + e2.message + '. Попросите ИИ прислать JSON заново или используйте текстовый формат.');
      }
    }
  }
  /* все JSON-объекты верхнего уровня { … } подряд (кавычки и экранирование учитываются); последний может быть оборван */
  function jsonChunks(s) {
    var out = [], depth = 0, start = -1, inStr = false, escp = false;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (inStr) { if (escp) escp = false; else if (c === '\\') escp = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') { inStr = depth > 0; continue; }
      if (c === '{') { if (depth === 0) start = i; depth++; }
      else if (c === '}' && depth > 0) { depth--; if (depth === 0) { out.push(s.slice(start, i + 1)); start = -1; } }
    }
    if (start >= 0) out.push(s.slice(start));   /* оборванный кусок — looseJson объяснит, что делать */
    return out.length ? out : [s];
  }
  function md(x) { return Array.isArray(x) ? x.join('\n') : String(x == null ? '' : x); }
  function parseJson(obj, ctx) {
    /* внутренний формат сайта (как data/…/notes/*.json) — берём как есть */
    if (obj && Array.isArray(obj.lectures) && obj.lectures.some(function (l) { return Array.isArray(l.sections); })) {
      var x = obj.extra || {}; return { doc: obj, extra: { sum: x.sum || {}, terms: x.terms || [], where: x.where || {}, titles: x.titles || {} }, warn: [] };
    }
    if (!obj || !Array.isArray(obj.lectures)) throw new Error('В JSON нет списка "lectures".');
    var res = { subject: obj.subject || '', title: obj.title || '', lectures: [] }, terms = [], warn = [];
    obj.lectures.forEach(function (L, li) {
      var hd = lectureHead(L.title || L.name || ('Лекция ' + (li + 1)), li);
      var lec = { id: 'l' + (li + 1), n: hd.n, label: L.label || hd.label, title: hd.title, sections: [], cards: [], _sum: (L.summary || L.main || []).map(plain), _auto: !L.label && !!hd.auto };
      var textLines = md(L.text || L.content || L.konspekt).split('\n').map(function (l) { var h = l.trim().match(/^#{2,6}\s+(.+)$/); return h ? '\u0002' + h[1] : l; });
      textSections(textLines, ctx, lec, '');
      (L.terms || []).forEach(function (t) { if (t && (t.term || t[0])) terms.push([plain(t.term || t[0]), plain(t.def || t.definition || t[1] || '')]); });
      var qs = (L.questions || []).map(function (q) { return { t: 'qa', q: inline(q.q || q.question || ''), a: blocks(md(q.a || q.answer).split('\n'), ctx), where: plain(q.where || '') }; }).filter(function (b) { return b.q; });
      if (qs.length) lec.sections.push({ kind: 'qa', title: 'Вопросы', blocks: qs });
      var ts = (L.tasks || []).map(function (t, ti) { return { t: 'qa', task: true, num: String(t.num || ti + 1), title: plain(t.title || ''), q: blocks(md(t.q || t.task || t.condition).split('\n'), ctx), a: blocks(md(t.a || t.solution || t.answer).split('\n'), ctx), where: plain(t.where || '') }; });
      if (ts.length) lec.sections.push({ kind: 'tasks', title: 'Задачи', blocks: ts });
      (L.cards || []).forEach(function (c) { if (c && (c.q || c.front)) lec.cards.push({ q: inline(c.q || c.front), a: '<p>' + inline(c.a || c.back || '') + '</p>' }); });
      var tq = (L.test || L.quiz || []).map(function (q) {
        var opts = (q.options || q.opts || []).map(function (o) { return typeof o === 'string' ? { t: plain(o), right: false } : { t: plain(o.t || o.text || ''), right: !!(o.right || o.correct) }; });
        var cor = [].concat(q.correct != null ? q.correct : q.answer != null ? q.answer : []);
        cor.forEach(function (c) { if (typeof c === 'number' && opts[c]) opts[c].right = true; else if (typeof c === 'string') opts.forEach(function (o) { if (o.t === plain(c)) o.right = true; }); });
        if (!opts.some(function (o) { return o.right; })) { warn.push(lec.label + ', тест: не отмечен верный ответ у «' + plain(q.q || q.question).slice(0, 60) + '»'); return null; }
        return { q: plain(q.q || q.question || ''), type: 'choice', opts: opts, n: opts.filter(function (o) { return o.right; }).length };
      }).filter(Boolean);
      if (tq.length) lec.sections.push({ kind: 'test', title: 'Тест', blocks: [{ t: 'quiz', questions: tq }] });
      res.lectures.push(lec);
    });
    return finish(res, terms, warn);
  }

  /* ---------- общий конец: «Главное», термины, проверки ---------- */
  function finish(res, terms, warn) {
    var sum = {}, seen = {};
    /* одна и та же лекция могла прийти кусками (обрыв → «дальше», кнопка «Доработать») — склеиваем по названию «Лекция N» */
    var byLabel = {}, merged = [];
    res.lectures.forEach(function (l) {
      var k = l._auto ? null : SP.lc(l.label), t = k && byLabel[k];
      if (!t) { if (k) byLabel[k] = l; merged.push(l); return; }
      /* текст пришёл заново с «Суть простыми словами» — это переписанная версия (кнопка «Доработать»): заменяет старый */
      var newText = l.sections.filter(function (x) { return x.kind === 'text'; });
      if (newText.length && /суть простыми словами|қарапайым тілмен|in simple words/i.test(newText[0].title || '')) t.sections = t.sections.filter(function (x) { return x.kind !== 'text'; });
      t.sections = t.sections.concat(l.sections); t.cards = t.cards.concat(l.cards);
      l._sum.forEach(function (s) { if (t._sum.indexOf(s) < 0) t._sum.push(s); });
      if ((!t.title || t.title === t.label) && l.title) t.title = l.title;
    });
    res.lectures = merged;
    /* в лекции один раздел вопросов, один задач, один тест (дописанное добавляется в конец) */
    res.lectures.forEach(function (l) {
      var out = [], one = {};
      l.sections.forEach(function (s) {
        if (s.kind === 'text') { out.push(s); return; }
        var t = one[s.kind];
        if (!t) { one[s.kind] = s; out.push(s); return; }
        if (s.kind === 'test') t.blocks[0].questions = t.blocks[0].questions.concat(s.blocks[0].questions);
        else t.blocks = t.blocks.concat(s.blocks);
      });
      /* одинаковые вопросы (прислали заново с «@ Где:» и т. п.) — остаётся последняя версия на месте первой */
      var dedupe = function (arr, key) {
        var pos = {}, res = [];
        arr.forEach(function (x) { var k = key(x); if (k && pos[k] != null) res[pos[k]] = x; else { if (k) pos[k] = res.length; res.push(x); } });
        return res;
      };
      var qk = function (b) { return SP.lc(plain(String(typeof b.q === 'string' ? b.q : '').replace(/<[^>]+>/g, ''))); };
      out.forEach(function (s) {
        if (s.kind === 'qa') s.blocks = dedupe(s.blocks, qk);
        if (s.kind === 'test') s.blocks[0].questions = dedupe(s.blocks[0].questions, function (q) { return SP.lc(q.q); });
      });
      l.cards = dedupe(l.cards, function (c) { return SP.lc(plain(String(c.q).replace(/<[^>]+>/g, ''))); });
      /* текст — всегда перед вопросами и тестом */
      l.sections = out.filter(function (s) { return s.kind === 'text'; }).concat(out.filter(function (s) { return s.kind !== 'text'; }));
      delete l._auto;
    });
    res.lectures = res.lectures.filter(function (l) { return l.sections.length || l._sum.length || l.cards.length; });
    res.lectures.forEach(function (l, i) { l.id = 'l' + (i + 1); if (l._sum.length) sum[l.id] = l._sum; delete l._sum; if (!l.sections.some(function (s) { return s.kind === 'text'; })) warn.push(l.label + ': нет текста лекции (раздел «### Конспект»)'); });
    /* термин: основа слова для подчёркивания в тексте (без окончания) */
    var tl = terms.filter(function (t) { var k = t[0].toLowerCase(); if (!t[0] || !t[1] || seen[k]) return false; seen[k] = 1; return true; }).map(function (t) {
      var w = t[0], stem = w.length > 6 ? w.slice(0, -2) : w.length > 4 ? w.slice(0, -1) : w;
      return [stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), w, t[1]];
    });
    return { doc: res, extra: { sum: sum, terms: tl }, warn: warn };
  }
  function stats(r) {
    var s = { lectures: 0, qs: 0, tasks: 0, tests: 0, cards: 0, terms: (r.extra.terms || []).length, imgsNeeded: [], imgs: 0, schemes: 0, formulas: 0, per: [] };
    (r.doc.lectures || []).forEach(function (l) {
      s.lectures++; s.cards += (l.cards || []).length;
      /* по лекции — для кнопок «Доработать»: чего не хватает */
      var p = { label: l.label, title: l.title, sum: ((r.extra.sum || {})[l.id] || []).length, text: 0, parts: 0, qs: 0, noWhere: 0, tests: 0, cards: (l.cards || []).length, tasks: 0 };
      l.sections.forEach(function (sec) {
        if (sec.kind === 'text') { p.parts++; p.text += JSON.stringify(sec.blocks || []).replace(/<[^>]+>|"[a-z]+":/g, '').length; }
        (sec.blocks || []).forEach(function (b) { if (b.t === 'qa') { if (b.task || sec.kind === 'tasks') p.tasks++; else { p.qs++; if (!b.where && !b.src) p.noWhere++; } } if (b.t === 'quiz') p.tests += b.questions.length; });
      });
      s.per.push(p);
      var walk = function (bs) { (bs || []).forEach(function (b) { if (b.t === 'img') { if (b.ph || !b.src) s.imgsNeeded.push(b.cap || ''); else s.imgs++; } if (b.t === 'mermaid') s.schemes++; if (b.t === 'math') s.formulas++; if (b.a) walk(b.a); if (Array.isArray(b.q)) walk(b.q); }); };
      l.sections.forEach(function (sec) {
        walk(sec.blocks);
        (sec.blocks || []).forEach(function (b) { if (b.t === 'qa') { if (b.task || sec.kind === 'tasks') s.tasks++; else s.qs++; } if (b.t === 'quiz') s.tests += b.questions.length; });
      });
    });
    return s;
  }

  /* ---------- вход: текст от ИИ (или файл) → { doc, extra, warn, stats } ---------- */
  function parse(src, ctx) {
    ctx = ctx || {};
    var s = String(src || '').trim();
    if (!s) throw new Error('Пусто: вставьте ответ ИИ.');
    var body = s.replace(/^```[\w-]*\s*\n?/, '').trim();
    var r;
    if (/^\{/.test(body)) {
      /* JSON может прийти несколькими объектами (первый ответ + «Доработать») — читаем все и объединяем лекции */
      var objs = jsonChunks(s).map(looseJson);
      var first = objs[0], all = { format: first.format, subject: first.subject, title: first.title, lectures: [] };
      objs.forEach(function (o) { if (o && Array.isArray(o.lectures)) all.lectures = all.lectures.concat(o.lectures); });
      r = objs.length === 1 && !(first.lectures || []).some(function (l) { return !Array.isArray(l.sections); }) ? parseJson(first, ctx) : parseJson(all, ctx);
    } else r = parseMarkup(s, ctx);
    if (!r.doc.lectures || !r.doc.lectures.length) throw new Error('Не нашёл ни одной лекции. Проверьте, что ИИ ответил в формате из промта (заголовок «## Лекция 1. …»).');
    r.stats = stats(r);
    return r;
  }

  SP.myNotesFormat = { parse: parse, blocks: blocks, inline: inline, plain: plain };
})();

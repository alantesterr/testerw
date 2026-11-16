/* =====================================================================
   КАРТОЧКИ — устные вопросы и билеты (вкладка «Карточки» в папке предмета).
   По умолчанию вкладки нет: она появляется, только когда разработчик
   добавил в папку файл с типом «Карточки» (Разработчик → Папки → «＋ Карточки»).

   Формат файла (.txt или .docx):
     # Билет 1                 ← необязательно: группа карточек
     Вопрос: текст вопроса
     Ответ: текст ответа (можно в несколько строк)
     (пустая строка между карточками)
   Тоже понимается: «В:» / «О:», «Q:» / «A:». Без меток — первая строка
   блока = вопрос, остальные строки = ответ.

   Учить: карточка → «Показать ответ» → сам ставишь «Не знаю / Частично / Знаю».
   «Вытянуть билет» — случайный билет (или 3 случайные карточки, если билетов нет).
   Оценки хранятся в браузере: sp-cards { id: { s: 0|1|2, t: время } }.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var KEY = 'sp-cards', cache = {};
  var marks = SP.store.get(KEY, {}) || {};
  function mark(id) { return marks[id] ? marks[id].s : -1; }
  function setMark(id, s) { marks[id] = { s: s, t: Date.now() }; SP.store.set(KEY, marks); }
  function hid(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 'c' + (h >>> 0).toString(36); }

  /* ---------- Разбор текста ---------- */
  /* метки только с двоеточием: «в) пункт» в ответе — не новый вопрос; «#include» без пробела — не билет */
  var QRE = /^\s*(?:вопрос|question|сұрақ|q|в)\s*:\s*/i, ARE = /^\s*(?:ответ|answer|жауап|a|о)\s*:\s*/i, TRE = /^\s*#{1,3}\s+(.+?)\s*$/;
  function parse(text) {
    var out = [], group = '', cur = null, labeled = QRE.test(text.split('\n').filter(function (l) { return l.trim(); })[0] || '') || /\n\s*(?:вопрос|q)\s*:/i.test(text);
    var push = function () { if (cur && cur.q.trim()) { cur.q = cur.q.trim(); cur.a = cur.a.replace(/\s+$/, '').replace(/^\n+/, ''); cur.id = hid(cur.q); cur.g = group; out.push(cur); } cur = null; };
    String(text).replace(/\r/g, '').split('\n').forEach(function (line) {
      var t = line.match(TRE);
      if (t) { push(); group = t[1]; return; }   /* «# Билет 1»; «#include» без пробела — не билет */
      if (labeled) {
        if (QRE.test(line)) { push(); cur = { q: line.replace(QRE, ''), a: '', inA: false }; return; }
        if (!cur) return;
        if (ARE.test(line)) { cur.inA = true; cur.a += line.replace(ARE, '') + '\n'; return; }
        if (cur.inA) cur.a += line + '\n'; else cur.q += '\n' + line;
      } else {
        if (!line.trim()) { push(); return; }
        if (!cur) cur = { q: line, a: '' }; else cur.a += line + '\n';
      }
    });
    push();
    out.forEach(function (c) { delete c.inA; });
    return out;
  }

  /* ---------- Загрузка файла с сайта ---------- */
  function load(f) {
    if (cache[f.path]) return Promise.resolve(cache[f.path]);
    return SP.hub.fetchSite(f.path).then(function (x) { return x.r.blob(); }).then(function (b) {
      if (/\.docx$/i.test(f.name || f.path)) return Promise.all([SP.lib('mammoth'), b.arrayBuffer()]).then(function (r) { return r[0].extractRawText({ arrayBuffer: r[1] }); }).then(function (x) { return x.value; });
      return b.arrayBuffer().then(function (ab) {
        var t = new TextDecoder('utf-8').decode(ab);
        if (/�/.test(t)) try { t = new TextDecoder('windows-1251').decode(ab); } catch (e) { /* оставляем как есть */ }
        return t;
      });
    }).then(function (t) { var list = parse(t); cache[f.path] = list; return list; });
  }
  function stats(list) {
    var r = { n: list.length, know: 0, part: 0, no: 0, fresh: 0 };
    list.forEach(function (c) { var m = mark(c.id); if (m === 2) r.know++; else if (m === 1) r.part++; else if (m === 0) r.no++; else r.fresh++; });
    return r;
  }
  function tickets(list) { var g = {}, order = []; list.forEach(function (c) { if (!c.g) return; if (!g[c.g]) { g[c.g] = []; order.push(c.g); } g[c.g].push(c); }); return order.map(function (k) { return { name: k, cards: g[k] }; }); }

  /* ---------- Вкладка в папке ---------- */
  function folderHtml(s) {
    return '<p class="small muted">' + esc(SP.t('cards.intro')) + '</p><div class="list" id="cdList">' + (s.cards || []).map(function (f, i) {
      return '<div class="list-row cd-file" data-i="' + i + '"><div class="list-row-main">' + SP.icon('layers', 'subtle') + '<span class="meta"><b>' + esc(f.name.replace(/\.[^.]+$/, '')) + '</b><small data-cst>' + esc(SP.t('dev.loading')) + '</small></span></div>' +
        '<div class="btn-group"><button type="button" class="btn btn-sm btn-primary" data-learn="' + i + '">' + SP.icon('play', 'ic-sm') + '<span>' + esc(SP.t('cards.learn')) + '</span></button>' +
        '<button type="button" class="btn btn-sm" data-ticket="' + i + '">' + SP.icon('sparkles', 'ic-sm') + '<span>' + esc(SP.t('cards.ticket')) + '</span></button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-weak="' + i + '" hidden>' + SP.icon('rotate-ccw', 'ic-sm') + '<span>' + esc(SP.t('cards.weak')) + '</span></button></div></div>';
    }).join('') + '</div>';
  }
  function wireFolder(box, s) {
    if (!box) return;
    (s.cards || []).forEach(function (f, i) {
      var row = SP.$('.cd-file[data-i="' + i + '"]', box);
      load(f).then(function (list) {
        var st = stats(list), tk = tickets(list);
        SP.$('[data-cst]', row).textContent = SP.t('cards.stat', { n: st.n, k: st.know, p: st.part, w: st.no }) + (tk.length ? ' · ' + SP.t('cards.tickets', { n: tk.length }) : '');
        SP.$('[data-weak]', row).hidden = !(st.no + st.part);
      }).catch(function (e) { SP.$('[data-cst]', row).textContent = e.message; });
    });
    var go = function (attr, mode) {
      SP.$$('[' + attr + ']', box).forEach(function (b) {
        b.onclick = function () {
          var f = s.cards[+b.getAttribute(attr)];
          load(f).then(function (list) { study(f, list, mode, function () { wireFolder(box, s); }); }).catch(function (e) { SP.toast(e.message, 'danger'); });
        };
      });
    };
    go('data-learn', 'learn'); go('data-ticket', 'ticket'); go('data-weak', 'weak');
  }

  /* ---------- Учить ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickSet(list, mode) {
    if (mode === 'ticket') {
      var tk = tickets(list);
      if (tk.length) { var t = tk[Math.floor(Math.random() * tk.length)]; return { title: t.name, cards: t.cards }; }
      return { title: SP.t('cards.ticket'), cards: shuffle(list).slice(0, 3) };
    }
    if (mode === 'weak') return { title: SP.t('cards.weak'), cards: shuffle(list.filter(function (c) { var m = mark(c.id); return m === 0 || m === 1; })) };
    /* сначала незнакомые и новые, потом «частично», «знаю» — в конце */
    var rank = function (c) { var m = mark(c.id); return m === 0 ? 0 : m === -1 ? 1 : m === 1 ? 2 : 3; };
    return { title: SP.t('cards.learn'), cards: shuffle(list).sort(function (a, b) { return rank(a) - rank(b); }) };
  }
  function study(f, list, mode, done) {
    var set = pickSet(list, mode), i = 0, open = false, res = [0, 0, 0];
    if (!set.cards.length) { SP.toast(SP.t('cards.none'), 'info'); return; }
    var m = SP.modal({ title: f.name.replace(/\.[^.]+$/, '') + ' · ' + set.title, size: 'lg', bodyClass: 'cd-body', body: '<div class="cd" id="cdBox"></div>', onClose: function () { document.removeEventListener('keydown', key, true); if (done) done(); } });
    var box = SP.$('#cdBox', m.el);
    var txt = function (s) { return esc(s).replace(/\n/g, '<br>'); };
    function paint() {
      if (i >= set.cards.length) {
        box.innerHTML = '<div class="cd-end"><h3>' + esc(SP.t('cards.done')) + '</h3><div class="cd-res"><span class="cd-r2">' + esc(SP.t('cards.know')) + ': ' + res[2] + '</span><span class="cd-r1">' + esc(SP.t('cards.part')) + ': ' + res[1] + '</span><span class="cd-r0">' + esc(SP.t('cards.no')) + ': ' + res[0] + '</span></div>' +
          '<div class="btn-group">' + (res[0] + res[1] ? '<button type="button" class="btn btn-primary" id="cdWeak">' + SP.icon('rotate-ccw') + '<span>' + esc(SP.t('cards.weak')) + '</span></button>' : '') +
          '<button type="button" class="btn" id="cdTicket">' + SP.icon('sparkles') + '<span>' + esc(SP.t('cards.ticket')) + '</span></button>' +
          '<button type="button" class="btn btn-ghost" id="cdClose">' + esc(SP.t('common.close')) + '</button></div></div>';
        var again = function (md) { set = pickSet(list, md); i = 0; open = false; res = [0, 0, 0]; if (!set.cards.length) { m.close(); return; } paint(); };
        var w = SP.$('#cdWeak', box); if (w) w.onclick = function () { again('weak'); };
        SP.$('#cdTicket', box).onclick = function () { again('ticket'); };
        SP.$('#cdClose', box).onclick = function () { m.close(); };
        return;
      }
      var c = set.cards[i], mk = mark(c.id);
      box.innerHTML = '<div class="cd-top"><span class="small muted">' + (i + 1) + ' / ' + set.cards.length + (c.g ? ' · ' + esc(c.g) : '') + '</span>' + (mk >= 0 ? '<span class="badge cd-b' + mk + '">' + esc(SP.t(['cards.no', 'cards.part', 'cards.know'][mk])) + '</span>' : '') + '</div>' +
        '<div class="cd-prog"><i style="width:' + (i / set.cards.length * 100) + '%"></i></div>' +
        '<button type="button" class="cd-card' + (open ? ' open' : '') + '" id="cdFlip" aria-expanded="' + open + '"><div class="cd-q">' + txt(c.q) + '</div>' +
        (open ? '<div class="cd-a">' + (c.a ? txt(c.a) : '<span class="subtle">' + esc(SP.t('cards.noAnswer')) + '</span>') + '</div>' : '<div class="cd-hint">' + esc(SP.t('cards.tap')) + '</div>') + '</button>' +
        (open ? '<div class="cd-rate"><button type="button" class="btn cd-r0" data-rate="0">' + esc(SP.t('cards.no')) + ' <kbd>1</kbd></button><button type="button" class="btn cd-r1" data-rate="1">' + esc(SP.t('cards.part')) + ' <kbd>2</kbd></button><button type="button" class="btn cd-r2" data-rate="2">' + esc(SP.t('cards.know')) + ' <kbd>3</kbd></button></div>'
          : '<div class="cd-rate"><button type="button" class="btn btn-primary btn-block" id="cdShow">' + SP.icon('eye') + '<span>' + esc(SP.t('cards.show')) + '</span> <kbd>␣</kbd></button></div>');
      SP.$('#cdFlip', box).onclick = function () { if (!open) { open = true; paint(); } };
      var sh = SP.$('#cdShow', box); if (sh) { sh.onclick = function () { open = true; paint(); }; sh.focus(); }
      SP.$$('[data-rate]', box).forEach(function (b) { b.onclick = function () { rate(+b.getAttribute('data-rate')); }; });
    }
    function rate(v) { var c = set.cards[i]; setMark(c.id, v); res[v]++; i++; open = false; paint(); }
    function key(e) {
      if (!m.el.isConnected || i >= set.cards.length || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!open && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); open = true; paint(); }
      else if (open && /^[123]$/.test(e.key)) { e.preventDefault(); rate(+e.key - 1); }
    }
    document.addEventListener('keydown', key, true);
    paint();
  }

  SP.cards = { parse: parse, load: load, folderHtml: folderHtml, wireFolder: wireFolder, study: study };
})();

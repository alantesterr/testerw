/* =====================================================================
   ДАННЫЕ: лекции, вопросы и задачи берутся из конспекта StudyPlay
   (data/ir-252/notes/cpp15.json). Здесь же — повторение (какой вопрос
   задать следующим) и сохранение прогресса на устройстве.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.DG = window.DG || {};
  var SAVE_KEY = 'sp-dungeon-v1';

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  D.esc = esc;
  var strip = function (h) { var d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  D.strip = strip;

  /* мини-markdown для вопросов: ```cpp блоки и `код` */
  D.md = function (s) {
    s = String(s || '');
    var out = '', parts = s.split(/```(?:\w+)?\n?/);
    parts.forEach(function (p, i) {
      if (i % 2) out += '<pre class="code">' + esc(p.replace(/\n$/, '')) + '</pre>';
      else out += esc(p.replace(/^\n+|\n+$/g, '')).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    });
    return out;
  };
  /* блоки конспекта (p, code, out, ul, ol, note, table, h) → HTML */
  D.blocks = function (bl) {
    return (bl || []).map(function (b) {
      switch (b.t) {
        case 'p': return '<p>' + b.html + '</p>';
        case 'h': return '<p><b>' + b.html + '</b></p>';
        case 'code': return (b.cap && !/^(Код|Схема)$/.test(b.cap) ? '<p><i>' + esc(b.cap) + '</i></p>' : '') + '<pre class="code">' + esc(b.text) + '</pre>';
        case 'out': return '<pre class="code" style="color:#FAC775">' + esc(b.text) + '</pre>';
        case 'ul': case 'ol': return '<' + b.t + '>' + b.items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</' + b.t + '>';
        case 'note': return '<p><b>' + esc(b.kind || '') + '.</b> ' + b.html + '</p>';
        case 'table': return '<pre class="code" style="color:#ece8f6">' + esc(b.rows.map(function (r) { return r.map(strip).join(' | '); }).join('\n')) + '</pre>';
        default: return b.html ? '<p>' + b.html + '</p>' : '';
      }
    }).join('');
  };

  /* ключевые слова: идентификаторы кода, значки операций, русские слова (по корню) */
  var STOP = { the: 1, is: 1, of: 1, what: 1, which: 1, and: 1, in: 1, to: 1, a: 1, an: 1, be: 1, are: 1, for: 1, with: 1, this: 1, that: 1, output: 1, correct: 1, answer: 1, no: 1, value: 1, following: 1, used: 1, called: 1, does: 1, int: 1, cout: 1, endl: 1, return: 1, main: 1,
    'является': 1, 'который': 1, 'которые': 1, 'можно': 1, 'нельзя': 1, 'вывод': 1, 'программ': 1, 'значен': 1, 'перемен': 1 };
  function toks(s) {
    s = String(s || '').replace(/<[^>]+>/g, ' ').toLowerCase(); var set = {};
    (s.match(/[a-z_][a-z0-9_]{1,}/g) || []).forEach(function (w) { if (!STOP[w]) set[w] = 1; });
    (s.match(/\+\+|--|&&|\|\||::|->|%|\?|!=|==|\[\]|\*|&/g) || []).forEach(function (w) { set['#' + w] = 1; });
    (s.match(/[а-яё]{5,}/g) || []).forEach(function (w) { var st = w.slice(0, 6); if (!STOP[st] && !STOP[w]) set[st] = 1; });
    return set;
  }
  function overlap(a, b) { var n = 0; for (var k in a) if (b[k]) n += k.charAt(0) === '#' ? 0.5 : (/[a-z]/.test(k) ? 2 : 1); return n; }
  D.toks = toks; D.overlap = overlap;

  /* блоки лекции для книжки — полноценная вёрстка: таблицы, заметки, код и вывод */
  var NOTE_CLS = { 'Запомни': 'n-note', 'Важно': 'n-warn', 'Совет': 'n-tip', 'Нюанс': 'n-trick', 'Частая ошибка': 'n-err', 'Ошибка': 'n-err', 'Ловушка': 'n-err' };
  D.bookHtml = function (bl) {
    return (bl || []).map(function (b) {
      switch (b.t) {
        case 'p': return '<p>' + b.html + '</p>';
        case 'h': return '<h4>' + b.html + '</h4>';
        case 'code':
          if (b.cap === 'Схема') return '<pre class="scheme">' + esc(b.text) + '</pre>';
          return '<figure class="bk-code' + (b.cap === 'Неправильно' ? ' bad' : b.cap === 'Правильно' ? ' good' : '') + '">' + (b.cap && b.cap !== 'Код' ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '<pre>' + esc(b.text) + '</pre></figure>';
        case 'out': return '<figure class="bk-out"><figcaption>Вывод программы</figcaption><pre>' + esc(b.text) + '</pre></figure>';
        case 'ul': case 'ol': return '<' + b.t + '>' + b.items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</' + b.t + '>';
        case 'note': return '<aside class="bk-note ' + (NOTE_CLS[b.kind] || 'n-note') + '"><b>' + esc(b.kind || 'Запомни') + '.</b> ' + b.html + '</aside>';
        case 'table': return '<div class="bk-table"><table>' + b.rows.map(function (r, i) { var tg = b.head && i === 0 ? 'th' : 'td'; return '<tr>' + r.map(function (c2) { return '<' + tg + '>' + c2 + '</' + tg + '>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
        default: return b.html ? '<p>' + b.html + '</p>' : '';
      }
    }).join('');
  };

  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'q' + (h >>> 0).toString(36); }

  /* сложность вопроса: 0 — простой (теория), 1 — средний, 2 — сложный (код) */
  function diffOf(q) {
    var t = q.q || '';
    if (/```/.test(t)) return /What is the output|выведет/i.test(t) && t.length > 160 ? 2 : (q.type === 'keyboard' ? 1 : 2);
    if (q.type === 'keyboard') return 1;
    return 0;
  }

  /* ---------- предметы ----------
     cpp  — этажи из конспекта C++ (лекции → комнаты по разделам);
     arch — темы силлабуса из data/subjects/arch: topics.json + tNN.txt в формате Тестера.
     D.floors — этажи ТЕКУЩЕГО предмета (вся игра работает с ним). */
  D.SUBJ = {};
  D.useSubject = function (id) {
    if (!D.SUBJ[id]) id = 'cpp';
    D.subjId = id; D.subj = D.SUBJ[id]; D.floors = D.subj.floors;
    if (D.save && D.save.subj !== id) { D.save.subj = id; D.persist(); }
  };
  D.load = function () {
    return Promise.all([loadCpp(), loadArch().catch(function (e) { console.warn('arch', e); })]).then(function () { D.useSubject(D.save.subj || 'cpp'); return D.floors; });
  };
  /* разбор файла теста: <question> <variant> <variantright> <variant_keyboard> <explain> */
  D.parseTxt = function (text) {
    return String(text).replace(/\r/g, '').split(/<question>/i).slice(1).map(function (raw) {
      var ex = '', m = raw.match(/<explain>([\s\S]*?)(?:<\/explain>|$)/i);
      if (m) { ex = m[1].trim(); raw = raw.replace(m[0], ''); }
      var parts = raw.split(/<(variantright|variant_keyboard|variant)>/i), q = { q: parts[0].trim(), opts: [], type: 'choice', ex: ex };
      for (var k = 1; k < parts.length; k += 2) {
        var tag = parts[k].toLowerCase(), t = (parts[k + 1] || '').trim();
        if (tag === 'variant_keyboard') { q.type = 'keyboard'; q.answer = t; } else if (t) q.opts.push({ t: t, right: tag === 'variantright' });
      }
      return q;
    }).filter(function (q) { return q.q && (q.type === 'keyboard' ? q.answer : q.opts.length > 1); });
  };
  var ROOM_SIZE = 10;
  function loadArch() {
    var base = '../data/subjects/arch/';
    return fetch(base + 'topics.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (meta) {
      var ready = meta.topics.filter(function (t) { return t.file; });
      return Promise.all(ready.map(function (t) { return fetch(base + t.file, { cache: 'no-cache' }).then(function (r) { return r.text(); }); })).then(function (txts) {
        var floors = ready.map(function (t, i) {
          var pool = D.parseTxt(txts[i]).map(function (q) {
            var it = { id: hash('arch|' + q.q + '|' + (q.answer || '') + q.opts.map(function (o) { return o.t; }).join('|')), q: q.q, opts: q.opts, type: q.type, answer: q.answer, ex: q.ex };
            it.diff = diffOf(it); return it;
          });
          /* комнаты — подряд по 10 вопросов (в файле вопросы идут по подтемам), последняя — босс темы */
          var n = Math.max(1, Math.ceil(pool.length / ROOM_SIZE)), rooms = [];
          for (var k = 0; k < n; k++) {
            var a = Math.floor(k * pool.length / n), b = Math.floor((k + 1) * pool.length / n);
            rooms.push({ k: k, sec: null, secs: [], boss: false, tasks: [], label: 'вопросы ' + (a + 1) + '–' + b, qs: pool.slice(a, b).map(function (q) { return q.id; }) });
          }
          rooms.push({ k: n, sec: null, secs: [], boss: true, tasks: [], qs: pool.map(function (q) { return q.id; }) });
          var byId = {}; pool.forEach(function (q) { q.topic = t.n; byId[q.id] = q; });
          return { n: t.n, id: 'arch-' + t.n, label: 'Тема ' + t.n, title: t.title, rk: t.rk, texts: [], pool: pool, byId: byId, tasks: [], taskById: {}, rooms: rooms, final: false, subj: 'arch' };
        });
        D.SUBJ.arch = { id: 'arch', title: meta.title, short: 'Архитектура', floors: floors, topics: meta.topics, unitWord: 'Тема' };
      });
    });
  }
  function loadCpp() {
    return fetch('../data/ir-252/notes/cpp15.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (doc) {
      D.doc = doc;
      var floors = doc.lectures.map(function (lec, i) {
        var texts = [], pool = [], tasks = [];
        lec.sections.forEach(function (s) {
          if (s.kind === 'text' && s.title) texts.push({ id: s.id, title: s.title, blocks: s.blocks });
          if (s.kind === 'test') (s.blocks || []).forEach(function (b) { (b.questions || []).forEach(function (q) {
            var it = { id: hash(q.q + '|' + (q.answer || '') + (q.opts || []).map(function (o) { return o.t; }).join('|')), q: q.q, opts: q.opts || [], type: q.type || 'choice', answer: q.answer };
            it.diff = diffOf(it); pool.push(it);
          }); });
          if (s.kind === 'tasks') (s.blocks || []).forEach(function (b) { if (b.t === 'qa') tasks.push({ id: hash('task' + lec.id + b.num), num: b.num, title: b.title, q: b.q, a: b.a }); });
        });
        /* комнаты: разделы лекции идут по порядку, 3–7 комнат + босс; в комнате может быть 1–2 раздела */
        var n = Math.max(1, Math.min(7, texts.length || 1));
        var rooms = [];
        for (var k = 0; k < n; k++) {
          var a = Math.floor(k * texts.length / n), b = Math.max(a + 1, Math.floor((k + 1) * texts.length / n));
          var secs = texts.slice(a, b); secs.forEach(function (s) { s.tok = toks(s.title + ' ' + D.blocks(s.blocks)); });
          rooms.push({ k: k, sec: secs[0] || null, secs: secs, boss: false, qs: [] });
        }
        /* каждый вопрос — в комнату с самым похожим разделом (по коду и словам) */
        var cap = Math.max(3, Math.ceil(pool.length / n * 1.5));
        var scored = pool.map(function (q) {
          var qt = toks(q.q + ' ' + (q.opts || []).map(function (o) { return o.t; }).join(' ') + ' ' + (q.answer || ''));
          var sc = rooms.map(function (r) { return r.secs.reduce(function (m, s) { return Math.max(m, overlap(qt, s.tok)); }, 0); });
          var order = sc.map(function (_, i) { return i; }).sort(function (a, b) { return sc[b] - sc[a]; });
          return { q: q, sc: sc, order: order, margin: sc[order[0]] - (sc[order[1]] || 0) };
        }).sort(function (a, b) { return b.margin - a.margin; });   /* сначала самые «однозначные» */
        scored.forEach(function (x) {
          var pick = -1;
          for (var i = 0; i < x.order.length; i++) { var ri = x.order[i]; if (x.sc[ri] > 0 && rooms[ri].qs.length < cap) { pick = ri; break; } }
          if (pick < 0) { pick = 0; rooms.forEach(function (r, ri) { if (r.qs.length < rooms[pick].qs.length) pick = ri; }); }
          x.q.room = pick; rooms[pick].qs.push(x.q.id);
        });
        /* пустая комната (раздел без вопросов) — берёт у самой большой соседней */
        rooms.forEach(function (r, ri) { if (r.qs.length) return; var big = rooms.reduce(function (m, x) { return x.qs.length > m.qs.length ? x : m; }, rooms[0]); r.qs = big.qs.splice(0, Math.floor(big.qs.length / 2)); });
        /* задания — в комнату с самым похожим разделом (если похожих нет — по кругу) */
        rooms.forEach(function (r) { r.tasks = []; });
        tasks.forEach(function (t, ti) {
          var tt = toks((t.title || '') + ' ' + D.blocks(t.q)), best = -1, pick = ti % n;
          rooms.forEach(function (r, ri) { var sc = r.secs.reduce(function (m, s) { return Math.max(m, overlap(tt, s.tok)); }, 0); if (sc > best && sc >= 2) { best = sc; pick = ri; } });
          rooms[pick].tasks.push(t.id);
        });
        rooms.push({ k: n, sec: null, secs: texts, boss: true, tasks: [], qs: pool.map(function (q) { return q.id; }) });
        var taskById = {}; tasks.forEach(function (t) { taskById[t.id] = t; });
        var byId = {}; pool.forEach(function (q) { byId[q.id] = q; });
        return { n: i + 1, id: lec.id, label: lec.label, title: lec.title, texts: texts, pool: pool, byId: byId, tasks: tasks, taskById: taskById, rooms: rooms, final: lec.label === 'Итог', subj: 'cpp' };
      });
      D.SUBJ.cpp = { id: 'cpp', title: 'C++ (ООП)', short: 'C++', floors: floors, unitWord: 'Этаж' };
      return floors;
    });
  }

  /* ---------- сохранение ----------
     v2 (ноябрь 2026): несколько предметов (subj), место в подземелье помнит предмет (at.s).
     Сохранение v1 переносится как есть: HP, IQ, повторение и комнаты не теряются. */
  var fresh = function () { return { v: 2, subj: 'cpp', hp: 5, maxHp: 5, iq: 0, streak: 0, lastDay: '', ticks: 0, srs: {}, rooms: {}, at: null, seenIntro: false, best: 0 }; };
  D.save = (function () {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || (s.v !== 1 && s.v !== 2)) return fresh();
      if (s.v === 1) { s.v = 2; s.subj = 'cpp'; if (s.at) s.at.s = 'cpp'; }
      return Object.assign(fresh(), s);
    } catch (e) { return fresh(); }
  })();
  D.persist = function () { try { localStorage.setItem(SAVE_KEY, JSON.stringify(D.save)); } catch (e) { /* приватный режим — играем без сохранения */ } };

  /* огонёк: день засчитывается после первого ответа */
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  var dayNum = function (s) { var p = s.split('-'); return Math.round(new Date(+p[0], +p[1] - 1, +p[2]).getTime() / 864e5); };
  D.streakAlive = function () { var s = D.save; if (!s.lastDay) return false; var gap = dayNum(today()) - dayNum(s.lastDay); return gap <= 1 || (gap === 2 && s.inv && s.inv.items && s.inv.items.ice > 0); };
  D.doneToday = function () { return D.save.lastDay === today(); };
  D.touchStreak = function () {
    var s = D.save, t = today(); if (s.lastDay === t) return false;
    var gap = s.lastDay ? dayNum(t) - dayNum(s.lastDay) : 99;
    var saved = false;
    if (gap === 2 && s.inv && s.inv.items && s.inv.items.ice > 0) { s.inv.items.ice--; saved = true; }
    s.streak = (gap === 1 || saved) ? s.streak + 1 : 1; s.lastDay = t; D.iceSaved = saved; return true;
  };

  /* ---------- повторение (уровень знания 0–5 у каждого вопроса) ---------- */
  var GAP = [0, 4, 10, 25, 60, 150];
  D.level = function (id) { var r = D.save.srs[id]; return r ? r.l : 0; };
  D.mastery = function (ids) { if (!ids.length) return 0; var s = 0; ids.forEach(function (id) { s += D.level(id); }); return Math.round(s / (ids.length * 5) * 100); };
  /* прогресс предмета/темы: доля вопросов, на которые хотя бы раз ответили верно (без подсказки) */
  D.solvedOnce = function (id) { var r = D.save.srs[id]; return !!r && r.n - r.w > 0; };
  D.progress = function (ids) { if (!ids.length) return 0; return Math.round(ids.filter(D.solvedOnce).length / ids.length * 100); };
  D.subjIds = function (sj) { return (sj || D.subj).floors.reduce(function (a, f) { return a.concat(f.pool.map(function (q) { return q.id; })); }, []); };
  D.record = function (id, ok) {
    var s = D.save, r = s.srs[id] || { l: 0, n: 0, w: 0, due: 0 };
    s.ticks++; r.n++;
    if (ok) { r.l = Math.min(5, r.l + 1); r.due = s.ticks + GAP[r.l]; r.bad = false; }
    else { r.w++; r.l = Math.max(0, r.l - 1); r.due = s.ticks + 4 + Math.floor(Math.random() * 5); r.bad = true; }
    s.srs[id] = r;
  };
  /* «к повтору» — последний ответ был ошибкой (или «не знал», или с подсказкой) */
  D.isBad = function (id) { var r = D.save.srs[id]; if (!r) return false; return r.bad != null ? r.bad : (r.w > 0 && r.l === 0); };
  D.seen = function (id) { return !!D.save.srs[id]; };
  D.stats = function (ids) {
    var st = { total: ids.length, seen: 0, bad: 0, unseen: 0 };
    ids.forEach(function (id) { if (D.seen(id)) st.seen++; else st.unseen++; if (D.isBad(id)) st.bad++; });
    st.clean = st.total > 0 && st.unseen === 0 && st.bad === 0; return st;
  };
  /* выбор из набора: ошибки с подошедшей очередью → новые → остальные ошибки → самые слабые */
  D.pickFrom = function (floor, ids, recent) {
    var s = D.save, t = s.ticks, nr = function (id) { return recent.indexOf(id) < 0; };
    var dueBad = ids.filter(function (id) { return D.isBad(id) && s.srs[id].due <= t && nr(id); });
    if (dueBad.length) return floor.byId[dueBad[Math.floor(Math.random() * dueBad.length)]];
    var fresh = ids.filter(function (id) { return !D.seen(id) && nr(id); });
    if (fresh.length) return floor.byId[fresh[Math.floor(Math.random() * fresh.length)]];
    var bad = ids.filter(function (id) { return D.isBad(id) && nr(id); }).sort(function (a, b) { return s.srs[a].due - s.srs[b].due; });
    if (bad.length) return floor.byId[bad[0]];
    var rest = ids.filter(nr); if (!rest.length) rest = ids.slice();
    rest.sort(function (a, b) { return (D.level(a) - D.level(b)) || (s.srs[a].due - s.srs[b].due); });
    var top = rest.slice(0, Math.min(4, rest.length));
    return floor.byId[top[Math.floor(Math.random() * top.length)]];
  };
  D.badIds = function (floor) { return floor.pool.map(function (q) { return q.id; }).filter(D.isBad); };
  /* выбрать следующий вопрос: сначала «вернувшиеся» ошибки, потом новые, потом слабые; знакомое — сложнее */
  D.pick = function (floor, room, recent) {
    var s = D.save, t = s.ticks, roomIds = room.qs, all = floor.pool.map(function (q) { return q.id; });
    var notRecent = function (id) { return recent.indexOf(id) < 0; };
    var due = all.filter(function (id) { var r = s.srs[id]; return r && r.w > 0 && r.l < 3 && r.due <= t && notRecent(id); });
    if (due.length && Math.random() < 0.7) return floor.byId[due[Math.floor(Math.random() * due.length)]];
    var fresh = roomIds.filter(function (id) { return !s.srs[id] && notRecent(id); });
    if (fresh.length) return floor.byId[fresh[Math.floor(Math.random() * fresh.length)]];
    /* всё в комнате уже видели: если комната освоена — берём вопросы сложнее из всего этажа */
    var roomM = D.mastery(roomIds);
    var cand = roomIds.filter(notRecent);
    if (roomM >= 60) { var maxD = Math.max.apply(null, roomIds.map(function (id) { return floor.byId[id].diff; })); var harder = all.filter(function (id) { return floor.byId[id].diff > maxD - (maxD === 2 ? 1 : 0) && notRecent(id) && D.level(id) < 5; }); if (harder.length) cand = harder; }
    if (!cand.length) cand = all.filter(notRecent);
    if (!cand.length) cand = all;
    cand.sort(function (a, b) { return (D.level(a) - D.level(b)) || ((s.srs[a] ? s.srs[a].due : 0) - (s.srs[b] ? s.srs[b].due : 0)); });
    var top = cand.slice(0, Math.min(5, cand.length));
    return floor.byId[top[Math.floor(Math.random() * top.length)]];
  };
})();

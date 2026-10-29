/* =====================================================================
   РАЗДЕЛ «ОЦЕНКИ» — журнал в стиле приложения Shokan.
   Предметы подтягиваются из расписания, можно добавлять свои.
   Вводятся: текущие оценки (по одной или среднее), РК1, РК2, экзамен.
   Считаются сами:
       рейтинг = текущая·60% + РК1·20% + РК2·20%
       итог    = рейтинг·60% + экзамен·40%
   и подсказка, сколько нужно для 70+ и с запасом для 72.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var root = null, editing = null;

  /* ПОРОГИ ЦВЕТА КОЛЕЦ — меняйте только здесь.
     пусто → серое кольцо с «—»; 0–49 красный (0 — настоящая оценка);
     50–69 жёлтый; 70–89 синий; 90–100 зелёный (как на скриншотах Shokan). */
  var RING = [{ min: 90, cls: 'green' }, { min: 70, cls: 'blue' }, { min: 50, cls: 'yellow' }, { min: 0, cls: 'red' }];
  function ringCls(v) { if (v == null) return ''; for (var i = 0; i < RING.length; i++) if (v >= RING[i].min) return RING[i].cls + (v === 0 ? ' zero' : ''); return ''; }
  function tone(v) { return v == null ? '' : v >= 90 ? 'success' : v >= 70 ? 'accent' : v >= 50 ? 'warning' : 'danger'; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function num(v) { if (v === '' || v == null) return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
  function who() { return String(((SP.auth.user() || {}).login) || '').toLowerCase(); }

  /* ---------- Журнал ---------- */
  function jKey() { return 'sp-journal-v1:' + who(); }
  function jState() { var s = SP.store.get(jKey(), null); if (!s || !Array.isArray(s.items)) s = { items: [] }; return s; }
  function jSave(s) { SP.store.set(jKey(), s); }
  function ring(label, v, emptyTxt) {
    /* Как в Shokan: целое число, пусто — серый «0» (или emptyTxt, например «—», где оценки не бывает) */
    var txt = v == null ? (emptyTxt || '0') : String(Math.round(v)), c = 2 * Math.PI * 16, len = Math.max(0, Math.min(100, v || 0)) / 100 * c;
    return '<div class="jr-ring"><span>' + esc(label) + '</span><div class="ring ' + ringCls(v) + '" role="img" aria-label="' + esc(label + ': ' + txt) + '"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="bg" cx="20" cy="20" r="16"/>' +
      (len ? '<circle class="fg" cx="20" cy="20" r="16" stroke-dasharray="' + len.toFixed(2) + ' ' + c.toFixed(2) + '"/>' : '') + '</svg><b>' + esc(txt) + '</b></div></div>';
  }
  function teachLabel(t) {
    t = String(t || '').trim(); if (!t) return '';
    return SP.t(/[,;]/.test(t) ? 'jr.teachers' : 'jr.teacher') + ': ' + t;
  }
  /* Журнал сам подтягивает все предметы из расписания (кроме удалённых вручную)
     и один раз переносит данные из старого калькулятора оценок. */
  function syncJournal() {
    var st = jState(), changed = false, hidden = (st.hidden || []).map(SP.lc);
    if (!st.calcMigrated) {
      calcState().s.forEach(function (s) {
        var nm = String(s.name || '').trim(); if (!nm) return;
        var had = st.items.some(function (x) { return SP.lc(x.name) === SP.lc(nm); });
        var it = upsert(st, nm, {});
        if (!had || (!it.rk1 && !it.rk2 && !it.exam && !(it.grades || []).length)) {
          it.rk1 = num(s.rk1); it.rk2 = num(s.rk2); it.exam = num(s.exam);
          it.mode = s.mode === 'avg' ? 'avg' : 'list'; if (it.mode === 'avg') it.cur = num(s.avg); else it.grades = (s.grades || []).slice();
        }
      });
      st.calcMigrated = true; changed = true;
    }
    /* Раньше 0 значил «пусто». Теперь 0 — настоящая оценка, поэтому старые нули один раз убираем */
    if (!st.zeroV2) {
      st.items.forEach(function (it) { ['cur', 'rk1', 'rk2', 'exam'].forEach(function (k) { if (num(it[k]) === 0) it[k] = null; }); });
      st.zeroV2 = true; changed = true;
    }
    SP.hub.data().subjects.forEach(function (s) {
      var nm = SP.hub.cleanName(s.name); if (!nm || hidden.indexOf(SP.lc(nm)) >= 0) return;
      if (!st.items.some(function (x) { return SP.lc(x.name) === SP.lc(nm); })) { upsert(st, nm, { teachers: s.teacher || '' }); changed = true; }
    });
    if (changed) jSave(st);
  }
  function journalHtml() {
    syncJournal();
    var st = jState();
    var h = '<div class="btn-group jr-bar"><button type="button" class="btn" id="jrHow">' + SP.icon('circle-help') + '<span>' + esc(SP.t('jr.how')) + '</span></button>' +
      (isWinPc() ? '<button type="button" class="btn" id="jrRun">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('jr.plRun')) + '</span></button>' : '') +
      '<button type="button" class="btn" id="jrPl">' + SP.icon('upload') + '<span>' + esc(SP.t('jr.plLoad')) + '</span></button>' +
      '<input type="file" id="jrPlFile" accept=".json,application/json,text/plain" hidden>' +
      '<button type="button" class="btn btn-primary" id="jrAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('grades.addSubject')) + '</span></button></div>';
    if (!st.items.length) {
      return h + '<section class="card"><div class="empty">' + SP.icon('graduation-cap', 'ic-xl') + '<h3>' + esc(SP.t('jr.emptyTitle')) + '</h3><p>' + esc(SP.t('jr.emptyText')) + '</p></div></section>';
    }
    return h + '<div class="jr-grid">' + st.items.map(function (it) { return editing === it.id ? editCard(it) : card(it); }).join('') + '</div>';
  }
  /* Ср. тек. — из оценок по одной (или введённое среднее); рейтинг и итоговая только считаются */
  function jCalc(it) {
    var g = (it.grades || []).map(Number).filter(function (x) { return !isNaN(x); });
    /* пусто = «ещё нет оценки»; 0 — настоящий ноль */
    var c = it.mode !== 'avg' && g.length ? g.reduce(function (a, b) { return a + b; }, 0) / g.length : num(it.cur);
    /* Оценки из Platonus и вы их не меняли — берём «Ср.тек.» как в Platonus (там «н» и веса учтены по-своему) */
    if (it.pl && it.pl.avg != null && it.mode !== 'avg' && (it.grades || []).join(',') === it.pl.g) c = it.pl.avg;
    var r1 = num(it.rk1), r2 = num(it.rk2), e = num(it.exam);
    /* «ДЗ = 0» из Platonus, загруженный раньше, — тоже «ещё нет» */
    if (e === 0 && it.pl && it.pl.exams) { var ek0 = examKeyOf(it.pl.exams); if (ek0 && !/^экз/i.test(ek0) && num(it.pl.exams[ek0]) === 0) e = null; }
    /* Рейтинг — как в Platonus: виден сразу, ещё не стоящий РК считается как 0 */
    var R = c != null || r1 != null || r2 != null ? 0.6 * (c || 0) + 0.2 * (r1 || 0) + 0.2 * (r2 || 0) : null;
    /* Итоговая — только когда стоит экзамен */
    var F = R != null && e != null ? 0.6 * R + 0.4 * e : null;
    return { c: c, r1: r1, r2: r2, e: e, R: R, F: F };
  }
  /* Подсказка: сколько нужно набрать для 70+ (считается до 71).
     Если ещё ничего не введено — подсказки нет. */
  function jHint(v) {
    if (v.c == null && v.r1 == null && v.r2 == null && v.e == null) return { text: '', cls: '', n72: null };
    /* Цель — 71: ровно 70 на деле не засчитывается, поэтому запас учтён сразу */
    var w = { c: v.c, r1: v.r1, r2: v.r2, e: v.e }, n70 = need(w, 71), n72 = n70;
    if (!n70) return { text: v.F >= 71 ? SP.t('grades.ok70') : SP.t('grades.below70'), cls: v.F >= 71 ? 'text-success' : 'text-danger', n72: null };
    var NM = { c: SP.t('jr.cur'), r1: SP.t('jr.rk1'), r2: SP.t('jr.rk2'), e: SP.t('jr.exam') };
    var fmtN = function (x) { return x <= 0 ? SP.t('grades.enough') : x > 100 ? SP.t('grades.notEnough') : '≥ ' + Math.ceil(x); };
    return { text: SP.t('jr.need', { list: n70.un.map(function (k) { return NM[k]; }).join(', '), x: fmtN(n70.x), y: fmtN(n72.x) }), cls: n72.x > 100 ? 'text-danger' : '', n72: n72 };
  }
  function card(it) {
    var v = jCalc(it), hn = jHint(v);
    /* В Platonus нет экзамена (физкультура — «ДЗ», практика и т. п.) — пишем его название и «—» вместо 0 */
    var ek = it.pl ? (it.pl.examKey != null ? it.pl.examKey : examKeyOf(it.pl.exams || {})) : null, noExam = ek != null && !/^экз/i.test(ek);
    var exLabel = noExam && ek ? ek : SP.t('jr.exam');
    return '<article class="jr-card" data-id="' + esc(it.id) + '"><div class="jr-top"><div class="jr-title"><h3 class="jr-name">' + esc(it.name || '—') + '</h3>' +
      '<div class="jr-teach">' + (it.teachers ? esc(teachLabel(it.teachers)) : '&nbsp;') + '</div></div>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-edit="' + esc(it.id) + '" aria-label="' + esc(SP.t('jr.edit')) + '" data-tip="' + esc(SP.t('jr.edit')) + '">' + SP.icon('chevron-right') + '</button></div>' +
      '<div class="jr-rings">' + ring(SP.t('jr.cur'), v.c) + ring(SP.t('jr.rating'), v.R) + ring(exLabel, v.e, noExam ? '—' : '') + ring(SP.t('jr.final'), v.F, noExam ? '—' : '') +
      /* РК — только когда поставлен (как в Shokan) */
      (v.r1 != null ? ring(SP.t('jr.rk1'), v.r1) : '') + (v.r2 != null ? ring(SP.t('jr.rk2'), v.r2) : '') +
      /* Нет ни одного РК — пустое место под строку, чтобы все карточки были одной высоты */
      (v.r1 == null && v.r2 == null ? ring(SP.t('jr.rk1'), null).replace('class="jr-ring"', 'class="jr-ring jr-ph" aria-hidden="true"') : '') + '</div>' +
      /* подсказка; если её нет — пустое место той же высоты */
      '<p class="small jr-hint ' + hn.cls + (hn.text ? '' : ' jr-ph') + '"' + (hn.text ? '' : ' aria-hidden="true"') + '>' + SP.icon('info', 'ic-sm') + '<span>' + esc(hn.text || '—') + '</span></p></article>';
  }
  /* ---------- Оценки из файла программы «Мои оценки» (Platonus) ---------- */
  /* «C ++ Builder» и «C++Builder» → «c++ builder» */
  function normName(s) { return SP.lc(String(s || '')).replace(/ё/g, 'е').replace(/\s*\+\s*/g, '+').replace(/\+\+(?=[a-zа-я])/gi, '++ ').replace(/[^a-zа-яәіңғүұқөһ0-9+#]+/gi, ' ').trim(); }
  /* Ищем карточку с тем же предметом: точное совпадение, потом «одно содержит другое», потом общие слова */
  function findItem(st, name) {
    var n = normName(name); if (!n) return null;
    var best = null, score = 0;
    st.items.forEach(function (it) {
      var m = normName(it.name); if (!m) return;
      var s = m === n ? 3 : (m.length >= 5 && n.indexOf(m) >= 0) || (n.length >= 5 && m.indexOf(n) >= 0) ? 2 : 0;
      if (!s) {
        var a = n.split(' ').filter(function (w) { return w.length > 2; }), b = m.split(' ').filter(function (w) { return w.length > 2; });
        var common = a.filter(function (w) { return b.indexOf(w) >= 0; }).length, min = Math.min(a.length, b.length);
        if (min && common / min >= 0.6) s = 1 + common / 10;
        /* Название на другом языке: совпали латинские слова вроде «Borland», «C++» */
        else {
          var lat = a.filter(function (w) { return /[a-z+#]/.test(w) && b.indexOf(w) >= 0; }).length;
          if (lat >= 2 || (lat === 1 && min <= 2)) s = 0.5 + lat / 10;
        }
      }
      if (s > score) { score = s; best = it; }
    });
    return best;
  }
  /* Столбец экзамена: «Экз.», у физкультуры «ДЗ», у практики «Практика» и т. п. */
  var EXAM_SKIP = /^(ср\.?\s*тек|рк\s*\d|рейтинг|итог)/i;
  function examKeyOf(ex) {
    var keys = Object.keys(ex).filter(function (x) { return !EXAM_SKIP.test(x.trim()); });
    return keys.filter(function (x) { return /^экз/i.test(x.trim()); })[0] || keys[0] || '';
  }
  function importPlatonus(data) {
    if (!data || data.format !== 'studyplay-grades' || !data.subjects) throw new Error('format');
    var subs = Array.isArray(data.subjects) ? data.subjects : [data.subjects];
    var st = jState(), upd = 0, added = 0;
    st.hidden = st.hidden || [];
    subs.forEach(function (s) {
      var name = String(s.subject || '').trim(); if (!name) return;
      var ex = s.exams || {}, cur = s.current ? (Array.isArray(s.current) ? s.current : [s.current]) : [];
      var it = findItem(st, name);
      /* Предмет без единой оценки (например, практика) новой карточкой не добавляем */
      var hasAny = cur.length || Object.keys(ex).some(function (k) { return num(ex[k]) != null; });
      if (!it && !hasAny) return;
      if (!it) {
        it = { id: SP.uid('j'), name: name, teachers: '', mode: 'list', grades: [], cur: null, rk1: null, rk2: null, exam: null };
        st.items.push(it); added++;
        st.hidden = st.hidden.filter(function (h) { return SP.lc(h) !== SP.lc(name); });
      } else upd++;
      var keep = {}; Object.keys(ex).forEach(function (k) { if (ex[k] !== '' && ex[k] != null) keep[k] = String(ex[k]); });
      var list = cur.filter(function (x) { return x && x.date; }).map(function (x) { return { type: String(x.type || ''), date: String(x.date), mark: String(x.mark == null ? '' : x.mark) }; });
      /* Текущие — по одной, как в Platonus («н», «т» и прочие буквы пропускаем) */
      var marks = list.map(function (x) { return num(x.mark); }).filter(function (x) { return x != null; });
      var c = num(keep['Ср.тек.']), ek = examKeyOf(keep);
      if (marks.length) { it.mode = 'list'; it.grades = marks; }
      else if (c != null) { it.mode = 'avg'; it.cur = c; }
      it.rk1 = num(keep['РК 1']); it.rk2 = num(keep['РК 2']); it.exam = ek ? num(keep[ek]) : null;
      /* У «ДЗ» (физкультура) Platonus пишет 0, пока зачёт не поставлен — это «ещё нет», а не ноль */
      if (ek && !/^экз/i.test(ek) && it.exam === 0) it.exam = null;
      if (!it.teachers && s.tutor) it.teachers = String(s.tutor);
      it.pl = { at: data.taken, exams: keep, examKey: ek, avg: c, g: marks.join(','), current: list };
    });
    st.plAt = data.taken || new Date().toISOString();
    jSave(st);
    return { upd: upd, added: added };
  }
  function editCard(it) {
    var f = function (k, label, val, full, type) {
      return '<div class="field' + (full ? ' full' : '') + '"><label class="label" for="je-' + k + '">' + esc(label) + '</label><input class="input" id="je-' + k + '" data-k="' + k + '"' + (type === 'num' ? ' inputmode="decimal" placeholder="0–100"' : '') + ' value="' + esc(val == null ? '' : val) + '"></div>';
    };
    var avg = it.mode === 'avg', chips = (it.grades || []).map(function (x, j) { return '<button type="button" class="mark ' + tone(+x) + '" data-jdel="' + j + '" aria-label="' + esc(SP.t('grades.delMark', { v: x })) + '" data-tip="' + esc(SP.t('grades.delMarkTip')) + '">' + esc(x) + SP.icon('x', 'ic-sm') + '</button>'; }).join('');
    var v = jCalc(it), out = function (k, label, val) { return '<div><span>' + esc(label) + '</span><b data-jr="' + k + '" class="' + (val == null ? '' : 'text-' + tone(val)) + '">' + (val == null ? '—' : f1(val)) + '</b></div>'; };
    return '<article class="jr-card" data-id="' + esc(it.id) + '"><div class="jr-edit">' +
      f('name', SP.t('grades.subjectName'), it.name, true) + f('teachers', SP.t('jr.teacherField'), it.teachers, true) +
      '<div class="field full"><span class="label">' + esc(SP.t('jr.cur')) + '</span><div class="segmented"><button type="button" data-jm="list" aria-pressed="' + !avg + '">' + esc(SP.t('grades.oneByOne')) + '</button><button type="button" data-jm="avg" aria-pressed="' + avg + '">' + esc(SP.t('grades.avgAtOnce')) + '</button></div>' +
      (avg ? '<input class="input input-num" id="je-cur" data-k="cur" inputmode="decimal" placeholder="0–100" aria-label="' + esc(SP.t('grades.currentAvg')) + '" value="' + esc(it.cur == null ? '' : it.cur) + '">'
        : (chips ? '<div class="marks">' + chips + '</div>' : '') + '<div class="row row-nowrap"><input class="input" id="je-newg" inputmode="decimal" placeholder="' + esc(SP.t('grades.newMark')) + '" aria-label="' + esc(SP.t('grades.newMark')) + '"><button type="button" class="btn btn-icon" data-jadd aria-label="' + esc(SP.t('grades.addMark')) + '" data-tip="' + esc(SP.t('grades.addMark')) + '">' + SP.icon('plus') + '</button></div>') + '</div>' +
      f('rk1', SP.t('jr.rk1'), it.rk1, false, 'num') + f('rk2', SP.t('jr.rk2'), it.rk2, false, 'num') + f('exam', SP.t('jr.exam'), it.exam, false, 'num') + '</div>' +
      '<div class="cv-res jr-res">' + out('c', SP.t('jr.cur'), v.c) + out('r', SP.t('jr.rating'), v.R) + out('f', SP.t('jr.final'), v.F) + '</div>' +
      '<p class="small cv-hint" data-jhint></p>' +
      '<div class="jr-actions"><button type="button" class="btn btn-danger-outline btn-sm" data-del="' + esc(it.id) + '">' + SP.icon('trash-2') + '<span>' + esc(SP.t('common.delete')) + '</span></button>' +
      '<span class="grow"></span><button type="button" class="btn btn-sm" data-cancel>' + esc(SP.t('common.cancel')) + '</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-save="' + esc(it.id) + '">' + SP.icon('check') + '<span>' + esc(SP.t('common.save')) + '</span></button></div></article>';
  }
  function upsert(st, name, patch) {
    var it = st.items.filter(function (x) { return SP.lc(x.name) === SP.lc(name); })[0];
    if (!it) { it = { id: SP.uid('j'), name: name, teachers: '', mode: 'list', grades: [], cur: null, rk1: null, rk2: null, exam: null }; st.items.push(it); }
    Object.keys(patch).forEach(function (k) { if (patch[k] != null && patch[k] !== '') it[k] = patch[k]; });
    return it;
  }
  /* ---------- Расчёт (общий с прежним калькулятором) ---------- */
  function calcKey() { return 'studyplay-calc-v1:' + who(); }
  function calcState() { var s = SP.store.get(calcKey(), null); if (!s || !Array.isArray(s.s)) s = { s: [] }; return s; }
  var W = { c: 0.36, r1: 0.12, r2: 0.12, e: 0.4 };
  function need(v, T) {
    var un = Object.keys(W).filter(function (k) { return v[k] == null; }); if (!un.length) return null;
    var K = 0; Object.keys(W).forEach(function (k) { if (v[k] != null) K += W[k] * v[k]; });
    return { un: un, x: (T - K) / un.reduce(function (a, k) { return a + W[k]; }, 0) };
  }
  /* ---------- Отрисовка и события ---------- */
  function render() {
    if (!root) return;
    var html = SP.pageHead({ title: SP.t('nav.grades') });
    html += journalHtml();
    root.innerHTML = '<div class="page">' + html + '</div>';
    wire();
  }
  function wire() { wireJournal(); dragCards(); }

  /* Перетаскивание карточек предметов: на ПК — зажать мышью и тащить,
     на телефоне — подержать палец ~0,4 с (лёгкая вибрация) и тащить. Порядок сохраняется. */
  var dragWin = {};
  function dragCards() {
    var grid = SP.$('.jr-grid', root); if (!grid || editing) return;
    var drag = null, timer = 0;
    var skip = function (t) { return t.closest('button, a, input, textarea, select, label, summary, .jr-pl-list'); };
    function begin(card) {
      drag.on = true; card.classList.add('jr-dragging'); grid.classList.add('jr-sorting');
      if (drag.touch && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* без вибрации */ } }
    }
    function moveTo(x, y) {
      var el = document.elementFromPoint(x, y), over = el && el.closest('.jr-card[data-id]');
      if (!over || over === drag.card || over.parentNode !== grid) return;
      var r = over.getBoundingClientRect(), after = (y > r.top + r.height / 2) || (Math.abs(y - (r.top + r.height / 2)) < r.height / 4 && x > r.left + r.width / 2);
      grid.insertBefore(drag.card, after ? over.nextSibling : over);
    }
    function finish() {
      clearTimeout(timer);
      if (drag && drag.on) {
        drag.card.classList.remove('jr-dragging'); grid.classList.remove('jr-sorting');
        var ids = SP.$$('.jr-card[data-id]', grid).map(function (c) { return c.getAttribute('data-id'); });
        var st = jState(); st.items.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); }); jSave(st);
        drag.block = true; setTimeout(function () { drag = null; }, 0);
      } else drag = null;
    }
    grid.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || skip(e.target)) return;
      var card = e.target.closest('.jr-card[data-id]'); if (!card) return;
      drag = { card: card, x: e.clientX, y: e.clientY, on: false, touch: e.pointerType !== 'mouse' };
      if (drag.touch) timer = setTimeout(function () { if (drag && !drag.on) begin(card); }, 400);
    });
    /* обработчики окна — одни на весь раздел, работают с текущей сеткой */
    dragWin.move = function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y, far = Math.abs(dx) + Math.abs(dy) > 8;
      if (!drag.on) { if (!drag.touch && far) begin(drag.card); else if (drag.touch && far) { clearTimeout(timer); drag = null; return; } else return; }
      e.preventDefault(); moveTo(e.clientX, e.clientY);
    };
    dragWin.up = finish;
    dragWin.cancel = function () { if (drag && drag.on) finish(); else { clearTimeout(timer); drag = null; } };
    if (!dragWin.wired) {
      dragWin.wired = true;
      window.addEventListener('pointermove', function (e) { if (dragWin.move) dragWin.move(e); });
      window.addEventListener('pointerup', function (e) { if (dragWin.up) dragWin.up(e); });
      window.addEventListener('pointercancel', function (e) { if (dragWin.cancel) dragWin.cancel(e); });
    }
    /* пока тащим пальцем — страница не прокручивается */
    grid.addEventListener('touchmove', function (e) { if (drag && drag.on) e.preventDefault(); }, { passive: false });
    grid.addEventListener('contextmenu', function (e) { if (drag) e.preventDefault(); });
    /* после перетаскивания не открывать карточку случайным кликом */
    grid.addEventListener('click', function (e) { if (drag && drag.block) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  function wireJournal() {
    var $ = function (s) { return SP.$(s, root); };
    var on = function (s, fn) { var el = $(s); if (el) el.onclick = fn; };
    var addNew = function () { var st = jState(), it = { id: SP.uid('j'), name: '', teachers: '', mode: 'list', grades: [], cur: null, rk1: null, rk2: null, exam: null }; st.items.push(it); jSave(st); editing = it.id; render(); var i = $('#je-name'); if (i) i.focus(); };
    /* «+ Предмет»: если что-то удалено — предлагаем вернуть (на выбор) или создать новый */
    on('#jrAdd', function () {
      var hidden = jState().hidden || [];
      if (!hidden.length) return addNew();
      var m = SP.modal({ title: SP.t('grades.addSubject'), body: '<p class="small muted">' + esc(SP.t('jr.restoreText')) + '</p><div class="stack-sm">' + hidden.map(function (n, i) { return '<button type="button" class="btn btn-block wrap" data-restore="' + i + '">' + SP.icon('undo-2') + '<span>' + esc(n) + '</span></button>'; }).join('') + '</div>',
        actions: [{ label: SP.t('grades.newSubject'), icon: 'plus', kind: 'primary', onClick: addNew }] });
      SP.$$('[data-restore]', m.el).forEach(function (b) { b.onclick = function () {
        var st = jState(), nm = st.hidden[+b.getAttribute('data-restore')]; st.hidden.splice(+b.getAttribute('data-restore'), 1);
        var sj = SP.hub.data().subjects.filter(function (s) { return SP.lc(SP.hub.cleanName(s.name)) === SP.lc(nm); })[0];
        upsert(st, nm, { teachers: sj ? sj.teacher || '' : '' }); jSave(st); m.close(); render(); SP.toast(SP.t('jr.restored', { name: nm }), 'success');
      }; });
    });
    on('#jrRun', runProgram);
    on('#jrPl', function () {
      var st = jState();
      /* Первый раз — сначала короткая инструкция, откуда взять файл */
      if (!st.plAt && !SP.store.get('sp-pl-seen', false)) {
        SP.store.set('sp-pl-seen', true);
        var m = SP.modal({ title: SP.t('jr.plHowTitle'), size: 'lg', body: SP.t('jr.plHowHtml') + '<div class="row" style="justify-content:flex-end;margin-top:var(--sp-4)"><button type="button" class="btn btn-primary" data-plpick>' + SP.icon('upload') + '<span>' + esc(SP.t('jr.plPick')) + '</span></button></div>' });
        var b = SP.$('[data-plpick]', m.el); if (b) b.onclick = function () { m.close(); $('#jrPlFile').click(); };
        return;
      }
      $('#jrPlFile').click();
    });
    var fileIn = $('#jrPlFile');
    if (fileIn) fileIn.onchange = function () {
      var f = fileIn.files && fileIn.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var res = importPlatonus(JSON.parse(String(r.result).replace(/^﻿/, '')));
          editing = null; render();
          SP.toast(SP.t('jr.plDone', { n: res.upd + res.added }) + (res.added ? ' ' + SP.t('jr.plAdded', { n: res.added }) : ''), 'success');
        } catch (e) { SP.toast(SP.t('jr.plBad'), 'danger'); }
      };
      r.onerror = function () { SP.toast(SP.t('jr.plBad'), 'danger'); };
      r.readAsText(f, 'utf-8');
      fileIn.value = '';
    };
    on('#jrHow', function () { SP.modal({ title: SP.t('jr.how'), size: 'lg', body: SP.t('jr.howHtml') }); });
    SP.$$('[data-edit]', root).forEach(function (b) { b.onclick = function () { editing = b.getAttribute('data-edit'); render(); var i = $('#je-newg') || $('#je-cur'); if (i) i.focus(); }; });
    /* Правка на месте: каждое поле сохраняется сразу, расчёт обновляется */
    var ec = SP.$('.jr-edit', root) && SP.$('.jr-edit', root).closest('.jr-card');
    if (ec) {
      var getIt = function (st) { return st.items.filter(function (x) { return x.id === editing; })[0]; };
      var refresh = function (it) { var v = jCalc(it); [['c', v.c], ['r', v.R], ['f', v.F]].forEach(function (p) { var e = SP.$('[data-jr="' + p[0] + '"]', ec); e.className = p[1] == null ? '' : 'text-' + tone(p[1]); e.textContent = p[1] == null ? '—' : f1(p[1]); });
        var hn = jHint(v), hp = SP.$('[data-jhint]', ec); hp.textContent = hn.text; hp.className = 'small cv-hint ' + hn.cls;
        /* В пустых полях — примерный балл для 72 */
        [['rk1', 'r1'], ['rk2', 'r2'], ['exam', 'e']].forEach(function (p) { var i = SP.$('[data-k="' + p[0] + '"]', ec); if (i) i.placeholder = hn.n72 && hn.n72.un.indexOf(p[1]) >= 0 && hn.n72.x > 0 && hn.n72.x <= 100 ? '≈' + Math.ceil(hn.n72.x) : '0–100'; });
      };
      if (getIt(jState())) refresh(getIt(jState()));
      var again = function (focusSel) { render(); var n = SP.$(focusSel, root); if (n) n.focus(); };
      ec.addEventListener('input', function (e) {
        var k = e.target.getAttribute('data-k'); if (!k) return;
        var st = jState(), it = getIt(st); if (!it) return;
        it[k] = (k === 'name' || k === 'teachers') ? e.target.value : e.target.value.trim() === '' ? null : num(e.target.value);
        jSave(st); refresh(it);
      });
      var addG = function () {
        var inp = SP.$('#je-newg', ec), v = num(inp.value); if (v == null) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
        var st = jState(), it = getIt(st); (it.grades = it.grades || []).push(v); jSave(st); again('#je-newg');
      };
      ec.addEventListener('click', function (e) {
        var b = e.target.closest('[data-jadd],[data-jdel],[data-jm]'); if (!b) return;
        var st = jState(), it = getIt(st); if (!it) return;
        if (b.hasAttribute('data-jadd')) return addG();
        if (b.hasAttribute('data-jdel')) { it.grades.splice(+b.getAttribute('data-jdel'), 1); jSave(st); return again('#je-newg'); }
        it.mode = b.getAttribute('data-jm'); jSave(st); again('[data-jm="' + it.mode + '"]');
      });
      var ng = SP.$('#je-newg', ec); if (ng) ng.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); addG(); } });
    }
    SP.$$('[data-cancel]', root).forEach(function (b) {
      b.onclick = function () { var st = jState(); st.items = st.items.filter(function (x) { return x.id !== editing || String(x.name).trim(); }); jSave(st); editing = null; render(); };
    });
    SP.$$('[data-save]', root).forEach(function (b) {
      b.onclick = function () {
        var st = jState(), it = st.items.filter(function (x) { return x.id === b.getAttribute('data-save'); })[0]; if (!it) return;
        var card = b.closest('.jr-card'), g = function (k) { return SP.$('[data-k="' + k + '"]', card).value; };
        var name = g('name').trim(); if (!name) { var ni = SP.$('[data-k="name"]', card); ni.setAttribute('aria-invalid', 'true'); ni.focus(); return; }
        it.name = name; it.teachers = g('teachers').trim(); st.hidden = (st.hidden || []).filter(function (h) { return SP.lc(h) !== SP.lc(name); });
        jSave(st); editing = null; render(); SP.toast(SP.t('settings.saved'), 'success');
      };
    });
    SP.$$('[data-del]', root).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        SP.confirm({ title: SP.t('grades.delSubject'), text: SP.t('jr.delText'), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
          if (!ok) return; var st = jState(), gone = st.items.filter(function (x) { return x.id === id; })[0];
          if (gone && gone.name) { st.hidden = st.hidden || []; st.hidden.push(gone.name); } /* не возвращать из расписания */
          st.items = st.items.filter(function (x) { return x.id !== id; }); jSave(st); editing = null; render();
        });
      };
    });
    SP.$$('.jr-edit input', root).forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var s = i.closest('.jr-card').querySelector('[data-save]'); if (s) s.click(); } else if (e.key === 'Escape') { var c = i.closest('.jr-card').querySelector('[data-cancel]'); if (c) c.click(); } }); });
  }

  SP.grades = { ringCls: ringCls, RING: RING };
  /* ---------- Оценки, переданные программой «Мои оценки» прямо в ссылке ----------
     Ссылка: #/grades/pl/<данные>. Часть после # браузер никуда не отправляет.
     Данные — JSON, сжатый deflate и записанный base64url. После загрузки ссылка очищается. */
  function fromLink(s) {
    var b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    var bytes = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('old'));
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(JSON.parse);
  }
  function show(params) {
    if (params && params[0] === 'pl' && params[1]) {
      var data = params[1];
      try { history.replaceState(null, '', location.pathname + location.search + '#/grades'); } catch (e) { /* ничего */ }
      fromLink(data).then(function (d) {
        var res = importPlatonus(d); editing = null; render();
        SP.toast(SP.t('jr.plDone', { n: res.upd + res.added }) + (res.added ? ' ' + SP.t('jr.plAdded', { n: res.added }) : ''), 'success');
      }).catch(function (e) { SP.toast(e && e.message === 'old' ? SP.t('jr.plOld') : SP.t('jr.plBadLink'), 'danger'); });
    }
    render();
  }
  SP.views.register('grades', { titleKey: 'nav.grades', mount: function (el) { root = el; }, show: show, refresh: render });
  /* ---------- Кнопка «Обновить из Platonus» (Windows) ----------
     Сайт запускает программу «Мои оценки» через ссылку studyplay-grades: (её подключает файл
     «Подключить к StudyPlay.bat»). Программа сама входит в Platonus, кладёт оценки в буфер обмена
     с меткой «studyplay-grades:» и закрывается; эта вкладка забирает их, когда вы к ней вернётесь. */
  var PREFIX = 'studyplay-grades:', waitUntil = 0, waitTimer = null, clipWarned = false;
  function isWinPc() { return /Windows/i.test(navigator.userAgent) && !/Mobile|Phone/i.test(navigator.userAgent); }
  function runProgram() {
    var a = document.createElement('a'); a.href = PREFIX + 'run'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    SP.toast(SP.t('jr.plRunToast'), 'info', { html: false });
    waitUntil = Date.now() + 5 * 60 * 1000; clipWarned = false;
    clearInterval(waitTimer); waitTimer = setInterval(checkClip, 1500);
  }
  function checkClip() {
    if (!waitUntil || Date.now() > waitUntil) { waitUntil = 0; clearInterval(waitTimer); return; }
    if (!document.hasFocus() || !navigator.clipboard || !navigator.clipboard.readText) return;
    navigator.clipboard.readText().then(function (t) {
      t = String(t || '').trim(); if (!waitUntil || t.indexOf(PREFIX) !== 0) return;
      waitUntil = 0; clearInterval(waitTimer);
      return fromLink(t.slice(PREFIX.length)).then(function (d) {
        var res = importPlatonus(d); editing = null; render();
        SP.toast(SP.t('jr.plDone', { n: res.upd + res.added }) + (res.added ? ' ' + SP.t('jr.plAdded', { n: res.added }) : ''), 'success');
        try { navigator.clipboard.writeText(''); } catch (e) { /* ничего */ }
      });
    }).catch(function () {
      if (!clipWarned) { clipWarned = true; SP.toast(SP.t('jr.plClip'), 'warning'); }
    });
  }
  window.addEventListener('focus', function () { if (waitUntil) checkClip(); });
  /* Оценки обновились в другой вкладке (например, её открыла программа) — эта вкладка перерисуется сама */
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('sp-journal-v1') < 0 || !root || root.hidden || editing) return;
    render();
  });
})();

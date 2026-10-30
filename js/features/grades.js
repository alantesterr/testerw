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
  /* «В картотеке нет преподавателя по данной дисциплине» и т. п. — значит, преподаватель не указан */
  function noTeacher(t) { return /нет\s+преподавател|картотек|оқытушы\s+жоқ|no\s+teacher/i.test(String(t || '')); }
  function teachLabel(t) {
    t = String(t || '').trim(); if (!t || noTeacher(t)) return '';
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
    /* Убираем «В картотеке нет преподавателя…», если уже сохранилось */
    st.items.forEach(function (it) { if (it.teachers && noTeacher(it.teachers)) { it.teachers = ''; changed = true; } });
    if (changed) jSave(st);
  }
  function journalHtml() {
    syncJournal();
    var st = jState();
    var h = '<div class="btn-group jr-bar"><button type="button" class="btn" id="jrHow">' + SP.icon('circle-help') + '<span>' + esc(SP.t('jr.how')) + '</span></button>' +
      /* «Обновить оценки» — у тех, кто настроил автообновление на этом устройстве (Настройки → Автообновление) */
      (SP.pl.visible() ? '<button type="button" class="btn" id="jrRun">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('jr.plRun')) + '</span></button>' : '') +
      (SP.pl.visible() && IS_WEBAPP ? '<button type="button" class="btn btn-ghost" id="jrPaste">' + SP.icon('copy') + '<span>' + esc(SP.t('app.paste')) + '</span></button>' : '') +
      '<input type="file" id="jrJFile" accept=".json,application/json,text/plain" hidden>' +
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
    return '<article class="jr-card" data-id="' + esc(it.id) + '"><div class="jr-top"><div class="jr-title"><h3 class="jr-name">' + esc(it.name || '—') + '</h3>' +
      '<div class="jr-teach">' + (it.teachers ? esc(teachLabel(it.teachers)) : '&nbsp;') + '</div></div>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-edit="' + esc(it.id) + '" aria-label="' + esc(SP.t('jr.edit')) + '" data-tip="' + esc(SP.t('jr.edit')) + '">' + SP.icon('chevron-right') + '</button></div>' +
      '<div class="jr-rings">' + ring(SP.t('jr.cur'), v.c) + ring(SP.t('jr.rating'), v.R) + ring(SP.t('jr.exam'), v.e) + ring(SP.t('jr.final'), v.F) +
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
    var st = jState(), upd = 0, added = 0, news = [];
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
      if (noTeacher(it.teachers)) it.teachers = '';
      if (!it.teachers && s.tutor && !noTeacher(s.tutor)) it.teachers = String(s.tutor);
      /* Что появилось нового с прошлого обновления (в первый раз молчим — иначе «новое» всё) */
      var prev = it.pl;
      if (prev) {
        var fresh = [], seen = {}, kf = function (x) { return x.date + '|' + x.type + '|' + x.mark; };
        (prev.current || []).forEach(function (x) { seen[kf(x)] = (seen[kf(x)] || 0) + 1; });
        list.forEach(function (x) { var q = kf(x); if (seen[q]) seen[q]--; else fresh.push(x.mark); });
        var pe = prev.exams || {};
        [['РК 1', SP.t('jr.rk1')], ['РК 2', SP.t('jr.rk2')], [ek, SP.t('jr.exam')]].forEach(function (p) {
          if (!p[0]) return;
          var nv = num(keep[p[0]]), ov = num(pe[p[0]]);
          if (p[0] === ek && !/^экз/i.test(ek) && nv === 0) nv = null;   /* «ДЗ = 0» — ещё не поставлен */
          if (nv != null && nv !== ov) fresh.push(p[1] + ': ' + String(Math.round(nv * 100) / 100));
        });
        if (fresh.length) news.push({ name: it.name || name, marks: fresh });
      }
      it.pl = { at: data.taken, exams: keep, examKey: ek, avg: c, g: marks.join(','), current: list };
    });
    st.plAt = data.taken || new Date().toISOString();
    jSave(st);
    return { upd: upd, added: added, news: news };
  }
  /* Уведомление справа снизу: «Новая оценка · Философия: 95» */
  function notifyNews(news) {
    if (!news || !news.length) return;
    var cnt = news.reduce(function (a, n) { return a + n.marks.length; }, 0);
    var html = '<b>' + esc(SP.t(cnt > 1 ? 'jr.newMany' : 'jr.newOne')) + '</b>' + news.map(function (n) {
      return '<div>' + esc(n.name) + ': <b>' + esc(n.marks.join(', ')) + '</b></div>';
    }).join('');
    SP.toast(html, 'success', { html: true, ms: 12000 });
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
    if (SP.ui2) SP.ui2.grades(root);
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
    on('#jrDl', downloadDialog);
    var jf = $('#jrJFile');
    if (jf) jf.onchange = function () {
      var f = jf.files && jf.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(String(r.result).replace(/^﻿/, ''));
          /* Файл программы «Мои оценки» («Сохранить для StudyPlay») тоже подходит */
          if (d && d.format === 'studyplay-grades') { var res = importPlatonus(d); editing = null; render(); notifyNews(res.news); if (d.subjects.length) SP.toast(SP.t('jr.jDone', { n: res.upd + res.added }), 'success'); withTimetable(d); return; }
          var n = importJournal(d);
          editing = null; render(); SP.toast(SP.t('jr.jDone', { n: n }), 'success');
        } catch (e) { SP.toast(SP.t('jr.jBad'), 'danger'); }
      };
      r.readAsText(f, 'utf-8'); jf.value = '';
    };
    /* «Скачать» (Excel, файл для другого устройства) спрятан: функция downloadDialog осталась, кнопки нет */
    on('#jrRun', function () { plClick('pl'); });
    on('#jrPaste', pasteUpdate);
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
          var pd = JSON.parse(String(r.result).replace(/^﻿/, '')), res = importPlatonus(pd);
          editing = null; render();
          notifyNews(res.news);   /* сообщаем только о новых оценках */
          withTimetable(pd);
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
        var st = jState(), before = JSON.parse(JSON.stringify(st)), gone = st.items.filter(function (x) { return x.id === id; })[0];
        if (gone && gone.name) { st.hidden = st.hidden || []; st.hidden.push(gone.name); } /* не возвращать из расписания */
        st.items = st.items.filter(function (x) { return x.id !== id; }); jSave(st); editing = null; render();
        SP.undo(SP.t('jr.deleted', { name: gone ? gone.name : '' }), function () { jSave(before); render(); });
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
    /* iPhone (Scriptable): данные сжаты LZ-string — #/grades/lz/<данные> */
    if (params && params[0] === 'lz' && params[1]) {
      try { history.replaceState(null, '', location.pathname + location.search + '#/grades'); } catch (e) { /* ничего */ }
      importLz(params[1]).catch(function () { SP.toast(SP.t('jr.plBadLink'), 'danger'); });
    }
    if (params && params[0] === 'pl' && params[1]) {
      var data = params[1];
      try { history.replaceState(null, '', location.pathname + location.search + '#/grades'); } catch (e) { /* ничего */ }
      fromLink(data).then(function (d) {
        var res = importPlatonus(d); editing = null; render();
        notifyNews(res.news);   /* сообщаем только о новых оценках */
        withTimetable(d);
      }).catch(function (e) { SP.toast(e && e.message === 'old' ? SP.t('jr.plOld') : SP.t('jr.plBadLink'), 'danger'); });
    }
    render();
  }
  SP.views.register('grades', { titleKey: 'nav.grades', mount: function (el) { root = el; }, show: show, refresh: render });
  /* ---------- Скачать оценки (например, чтобы скинуть себе в Telegram) ---------- */
  function gradesCsv() {
    var q = function (v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var n = function (v) { return v == null ? '' : String(Math.round(v * 100) / 100).replace('.', ','); };
    var head = [SP.t('jr.csvSubject'), SP.t('jr.cur'), SP.t('jr.rk1'), SP.t('jr.rk2'), SP.t('jr.rating'), SP.t('jr.exam'), SP.t('jr.final'), SP.t('jr.csvMarks')];
    var lines = [head.map(q).join(';')].concat(jState().items.map(function (it) {
      var v = jCalc(it);
      return [it.name, n(v.c), n(v.r1), n(v.r2), n(v.R), n(v.e), n(v.F), it.mode === 'avg' ? '' : (it.grades || []).join(' ')].map(q).join(';');
    }));
    return '﻿' + lines.join('\r\n');   /* BOM и «;» — Excel сразу понимает кириллицу и столбцы */
  }
  function downloadDialog() {
    var day = new Date().toISOString().slice(0, 10);
    var m = SP.modal({ title: SP.t('jr.dl'), body: '<div class="stack-sm">' +
      '<button type="button" class="btn btn-block wrap" data-gdl="csv">' + SP.icon('file-text') + '<span><b>' + esc(SP.t('jr.dlCsv')) + '</b><br><span class="small muted">' + esc(SP.t('jr.dlCsvHint')) + '</span></span></button>' +
      '<button type="button" class="btn btn-block wrap" data-gdl="json">' + SP.icon('file-json') + '<span><b>' + esc(SP.t('jr.dlJson')) + '</b><br><span class="small muted">' + esc(SP.t('jr.dlJsonHint')) + '</span></span></button>' +
      '<button type="button" class="btn btn-ghost btn-block wrap" data-gdl="load">' + SP.icon('upload') + '<span>' + esc(SP.t('jr.jLoad')) + '</span></button></div>' });
    SP.$$('[data-gdl]', m.el).forEach(function (b) { b.onclick = function () {
      var k = b.getAttribute('data-gdl'); m.close();
      if (k === 'csv') SP.downloadText(gradesCsv(), 'ocenki-' + day + '.csv', 'text/csv;charset=utf-8');
      else if (k === 'json') SP.downloadText(JSON.stringify({ format: 'studyplay-journal', version: 1, savedAt: new Date().toISOString(), items: jState().items }, null, 1), 'studyplay-ocenki-' + day + '.json', 'application/json');
      else { var f = SP.$('#jrJFile', root); if (f) f.click(); }
    }; });
  }
  /* Файл с другого устройства: карточки с теми же названиями обновляются, новые добавляются */
  function importJournal(d) {
    if (!d || d.format !== 'studyplay-journal' || !Array.isArray(d.items)) throw new Error('format');
    var st = jState(), n = 0;
    d.items.forEach(function (x) {
      if (!x || !String(x.name || '').trim()) return;
      var it = st.items.filter(function (y) { return SP.lc(y.name) === SP.lc(x.name); })[0];
      var keep = it ? it.id : SP.uid('j');
      if (!it) { it = {}; st.items.push(it); }
      Object.keys(x).forEach(function (k) { it[k] = x[k]; }); it.id = keep; n++;
      st.hidden = (st.hidden || []).filter(function (h) { return SP.lc(h) !== SP.lc(x.name); });
    });
    jSave(st); return n;
  }
  /* ---------- Кнопки «Обновить из Platonus» и «Обновить расписание» (Windows) ----------
     Сайт запускает программу «Мои оценки» через ссылку studyplay-grades:… (её подключает кнопка «Подключить» в окне программы).
     Программа сама входит в Platonus (оценки) или в Timetable (расписание), кладёт результат в буфер
     обмена с меткой и закрывается; эта вкладка забирает его, когда вы к ней вернётесь.
     За раз — одно задание; второе ждёт в очереди, чтобы ответы не перепутались в буфере. */
  var PREFIX = 'studyplay-grades:', TT_PREFIX = 'studyplay-timetable:', waitUntil = 0, waitTimer = null, clipWarned = false, waitKind = '', queue = [];
  /* pl — оценки из Platonus, tt — расписание из Timetable: у каждого свой откат и своя периодичность */
  var KIND = {
    pl: { arg: 'run', last: 'sp-pl-last', auto: 'plAuto', night: true, toast: 'jr.plRunToast' },
    tt: { arg: 'schedule', last: 'sp-tt-last', auto: 'ttAuto', night: false, toast: 'jr.ttRunToast' }
  };
  /* Кнопки Platonus скрыты, пока в Настройках → Инструменты не снята галочка */
  function plHidden() { return SP.settings.get('plHide') !== false; }
  function isWinPc() { return /Windows/i.test(navigator.userAgent) && !/Mobile|Phone/i.test(navigator.userAgent); }
  /* Откат: не чаще 1 входа в минуту на каждый сайт — общий для всех вкладок (и программа следит сама) */
  var COOL_MS = 60000, retry = {};
  function coolLeft(k) { var t = +SP.store.get(KIND[k].last, 0) || 0; return Math.max(0, t + COOL_MS - Date.now()); }
  function runProgram(quiet, k) {
    k = KIND[k] ? k : 'pl';
    if (IS_APP) return appRun(quiet, k);   /* Android-приложение: сайт сам заходит в Platonus/Timetable */
    if (IS_IOS) return iosRun(quiet, k);   /* iPhone: кнопку выполняет скрипт StudyPlay в Scriptable */
    if (waitUntil) {   /* программа уже работает — встанем в очередь */
      if (waitKind !== k && queue.indexOf(k) < 0) queue.push(k);
      if (!quiet) SP.toast(SP.t('jr.plQueued'), 'info');
      return;
    }
    var left = coolLeft(k);
    if (left > 0) {
      if (quiet) { if (!retry[k]) retry[k] = setTimeout(function () { retry[k] = null; runProgram(true, k); }, left + 500); }   /* автообновление — тихо после отката */
      else SP.toast(SP.t(k === 'tt' ? 'jr.ttCool' : 'jr.plCool', { s: Math.ceil(left / 1000) }), 'warning');
      return;
    }
    SP.store.set(KIND[k].last, Date.now());
    var a = document.createElement('a'); a.href = PREFIX + KIND[k].arg; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    if (!quiet) SP.toast(SP.t(KIND[k].toast), 'info', { html: false });
    busy(true); waitKind = k;
    waitUntil = Date.now() + 3 * 60 * 1000; clipWarned = false;
    clearInterval(waitTimer); waitTimer = setInterval(checkClip, 1500);
  }
  function waitDone() {
    waitUntil = 0; waitKind = ''; clearInterval(waitTimer); busy(false);
    var n = queue.shift(); if (n) setTimeout(function () { runProgram(true, n); }, 1500);
  }
  /* Нажатие кнопки: если на этом ПК программа ещё не настроена — тот же мастер настройки;
     ночью для Platonus — вопрос «всё равно попробовать?» */
  function plClick(k) {
    if (!IS_APP && !IS_IOS && !SP.store.get('sp-pl-run-ok', false)) { setupWizard(); return; }
    if (KIND[k].night && plNight()) {
      SP.confirm({ title: SP.t('jr.plNightTitle'), text: SP.t('jr.plNightText'), okLabel: SP.t('jr.plNightGo'), icon: 'clock' }).then(function (ok) { if (ok) runProgram(false, k); });
      return;
    }
    runProgram(false, k);
  }
  function setupModal() { SP.modal({ title: SP.t('jr.plSetupTitle'), size: 'lg', body: SP.t('jr.plSetupHtml') + '<p><a class="btn" href="downloads/studyplay-grades.zip" download>' + SP.icon('download') + '<span>' + esc(SP.t('jr.plDownload')) + '</span></a></p>' }); }
  SP.pl = { visible: function () { return !plHidden() && (isWinPc() || IS_APP || IS_IOS); }, run: plClick, phone: phoneModal };

  /* ---------- iPhone / iPad: кнопки на сайте запускают скрипт StudyPlay в Scriptable ----------
     Ссылка scriptable:///run/StudyPlay?mode=pl|tt открывает Scriptable; скрипт берёт оценки или расписание
     и сам возвращает в Safari на сайт с данными (#/grades/lz/…). Автообновления на iPhone с сайта нет —
     для этого «Команды» → «Автоматизация». */
  /* данные от скрипта iPhone, сжатые LZ-string (из ссылки или из буфера обмена) */
  function importLz(lzData) {
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js').then(function () {
      var d = JSON.parse(window.LZString.decompressFromEncodedURIComponent(lzData) || 'null');
      var res = importPlatonus(d); editing = null; render();
      notifyNews(res.news);
      withTimetable(d);
    });
  }
  /* Веб-приложение на экране «Домой» (iPhone): своя память, отдельная от Safari, и открыть его ссылкой нельзя.
     Скрипт кладёт данные в буфер обмена, человек возвращается «◀ StudyPlay» и нажимает «Вставить обновление». */
  var IS_WEBAPP = window.navigator.standalone === true;
  var WAIT_IOS = 'sp-ios-wait', pasteBar = null;
  function pasteUpdate() {
    if (!navigator.clipboard || !navigator.clipboard.readText) { SP.toast(SP.t('app.pasteNone'), 'warning'); return; }
    navigator.clipboard.readText().then(function (t) {
      t = String(t || '').trim();
      if (t.indexOf('studyplay-lz:') !== 0) { SP.toast(SP.t('app.pasteNone'), 'warning'); return; }
      SP.store.del(WAIT_IOS); hidePasteBar();
      return importLz(t.slice('studyplay-lz:'.length)).then(function () { try { navigator.clipboard.writeText(''); } catch (e) { /* ничего */ } });
    }).catch(function () { SP.toast(SP.t('app.pasteNone'), 'warning'); });
  }
  function hidePasteBar() { if (pasteBar) { pasteBar.remove(); pasteBar = null; } }
  function showPasteBar() {
    if (pasteBar || !IS_WEBAPP) return;
    var w = SP.store.get(WAIT_IOS, 0); if (!w || Date.now() - w > 10 * 60 * 1000) return;
    pasteBar = SP.el('<div class="pl-paste" role="status"><span>' + esc(SP.t('app.pasteHint')) + '</span><button type="button" class="btn btn-primary btn-sm">' + SP.icon('copy') + '<span>' + esc(SP.t('app.paste')) + '</span></button><button type="button" class="btn btn-ghost btn-sm" aria-label="' + esc(SP.t('common.close')) + '">' + SP.icon('x') + '</button></div>');
    var bs = pasteBar.querySelectorAll('button');
    bs[0].onclick = pasteUpdate;
    bs[1].onclick = function () { SP.store.del(WAIT_IOS); hidePasteBar(); };
    document.body.appendChild(pasteBar);
  }
  if (IS_WEBAPP) {
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') showPasteBar(); });
    window.addEventListener('focus', showPasteBar);
    setTimeout(showPasteBar, 800);
  }
  var IS_IOS = !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
  function iosRun(quiet, k) {
    if (quiet) return;   /* открывать Scriptable само по себе не будем */
    var left = coolLeft(k);
    if (left > 0) { SP.toast(SP.t(k === 'tt' ? 'jr.ttCool' : 'jr.plCool', { s: Math.ceil(left / 1000) }), 'warning'); return; }
    if (!SP.store.get('sp-ios-ok', false)) return iosSetup(k);
    SP.store.set(KIND[k].last, Date.now());
    SP.toast(SP.t('app.iosRun'), 'info');
    /* в каком браузере нажали — туда скрипт и вернёт (у каждого браузера своя память, данные должны прийти сюда) */
    var ua = navigator.userAgent, br = IS_WEBAPP ? 'webapp' : /CriOS/.test(ua) ? 'chrome' : /FxiOS/.test(ua) ? 'firefox' : /EdgiOS/.test(ua) ? 'edge' : /YaBrowser/.test(ua) ? 'yandex' : 'safari';
    if (IS_WEBAPP) { SP.store.set(WAIT_IOS, Date.now()); hidePasteBar(); }
    var a = document.createElement('a'); a.href = 'scriptable:///run/StudyPlay?mode=' + k + '&browser=' + br; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }
  /* первый раз — как поставить Scriptable и скрипт; «Уже настроено» — и сразу обновить */
  function iosSetup(k) {
    phoneModal(function (m) {
      var row = SP.el('<div class="row" style="justify-content:flex-end;margin-top:var(--sp-3)"><button type="button" class="btn btn-primary">' + SP.icon('refresh-cw') + '<span>' + esc(SP.t('app.iosReady')) + '</span></button></div>');
      row.querySelector('button').onclick = function () { SP.store.set('sp-ios-ok', true); m.close(); iosRun(false, k); };
      SP.$('.modal-body', m.el) ? SP.$('.modal-body', m.el).appendChild(row) : m.el.appendChild(row);
    });
  }

  /* ---------- Приложение StudyPlay для Android ----------
     Внутри приложения открыт этот же сайт, но у приложения нет браузерного запрета на чужие сайты:
     сайт сам входит в Platonus и Timetable через общий сборщик js/sync/collector.js.
     Логин и пароль хранятся только в защищённом хранилище телефона. */
  var CAP = window.Capacitor, IS_APP = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  var CREDS_KEY = 'studyplay-creds', RUNNER = 'kz.studyplay.check';
  function plug(n) { return CAP && CAP.Plugins && CAP.Plugins[n]; }
  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) scripts[src] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { delete scripts[src]; no(new Error('load')); }; document.head.appendChild(s); });
    return scripts[src];
  }
  function appCreds() {
    var ss = plug('SecureStoragePlugin');
    var p = ss ? ss.get({ key: CREDS_KEY }).then(function (r) { return r && r.value; }, function () { return null; }) : Promise.resolve(SP.store.get(CREDS_KEY, null));
    return p.then(function (v) { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } });
  }
  function saveAppCreds(c) {
    var ss = plug('SecureStoragePlugin');
    var p = ss ? ss.set({ key: CREDS_KEY, value: JSON.stringify(c) }) : Promise.resolve(SP.store.set(CREDS_KEY, c));
    return p.then(function () { return syncRunner(c); });
  }
  /* фоновая проверка оценок (раз в ~30 минут, даже когда приложение закрыто) получает логин и настройку уведомлений */
  function syncRunner(c) {
    var br = plug('BackgroundRunner'); if (!br) return Promise.resolve();
    var details = c ? { login: c.login, pw: c.pw, notify: SP.settings.get('appNotify') !== false } : { notify: false };
    return br.dispatchEvent({ label: RUNNER, event: 'setCreds', details: details }).catch(function () { /* старое приложение */ });
  }
  function credsModal() {
    return appCreds().then(function (old) {
      old = old || {};
      return new Promise(function (done) {
        var same = !old.tt;
        var m = SP.modal({ title: SP.t('app.credsTitle'), body: '<p class="small muted">' + esc(SP.t('app.credsText')) + '</p>' +
          '<div class="field"><label class="label" for="apL">' + esc(SP.t('app.login')) + '</label><input class="input" id="apL" autocomplete="username" value="' + esc(old.login || '') + '"></div>' +
          '<div class="field"><label class="label" for="apP">' + esc(SP.t('app.password')) + '</label><input class="input" id="apP" type="password" autocomplete="current-password" value="' + esc(old.pw || '') + '"></div>' +
          '<label class="row" style="gap:var(--sp-2)"><input type="checkbox" id="apSame"' + (same ? ' checked' : '') + '><span>' + esc(SP.t('app.same')) + '</span></label>' +
          '<div id="apTt"' + (same ? ' hidden' : '') + '><div class="field"><label class="label" for="apTL">' + esc(SP.t('app.ttLogin')) + '</label><input class="input" id="apTL" value="' + esc((old.tt && old.tt.login) || '') + '"></div>' +
          '<div class="field"><label class="label" for="apTP">' + esc(SP.t('app.ttPassword')) + '</label><input class="input" id="apTP" type="password" value="' + esc((old.tt && old.tt.pw) || '') + '"></div></div>',
          actions: [{ label: SP.t('common.cancel'), onClick: function () { done(null); } }, { label: SP.t('common.save'), kind: 'primary', onClick: function () {
            var g = function (id) { return SP.$('#' + id, m.el).value; };
            var c = { login: g('apL').trim(), pw: g('apP') };
            if (!SP.$('#apSame', m.el).checked) c.tt = { login: g('apTL').trim(), pw: g('apTP') };
            if (!c.login || !c.pw) { SP.$('#apP', m.el).focus(); return false; }
            saveAppCreds(c).then(function () { SP.toast(SP.t('settings.saved'), 'success'); done(c); });
          } }] });
        var cb = SP.$('#apSame', m.el); cb.onchange = function () { SP.$('#apTt', m.el).hidden = cb.checked; };
      });
    });
  }
  function askCode(text) { return Promise.resolve(window.prompt(text, '') || ''); }
  function appRun(quiet, k) {
    if (waitUntil) { if (waitKind !== k && queue.indexOf(k) < 0) queue.push(k); if (!quiet) SP.toast(SP.t('jr.plQueued'), 'info'); return; }
    var left = coolLeft(k);
    if (left > 0) {
      if (quiet) { if (!retry[k]) retry[k] = setTimeout(function () { retry[k] = null; runProgram(true, k); }, left + 500); }
      else SP.toast(SP.t(k === 'tt' ? 'jr.ttCool' : 'jr.plCool', { s: Math.ceil(left / 1000) }), 'warning');
      return;
    }
    appCreds().then(function (cr) {
      if (cr && cr.login && cr.pw) return cr;
      if (quiet) return null;
      return credsModal();
    }).then(function (cr) {
      if (!cr || waitUntil) return;
      waitKind = k; waitUntil = Date.now() + 3 * 60 * 1000;
      SP.store.set(KIND[k].last, Date.now());
      busy(true);
      if (!quiet) SP.toast(SP.t(k === 'tt' ? 'jr.ttRunToast' : 'app.runToast'), 'info');
      return loadScript('js/sync/collector.js?v=' + ASSET_V).then(function () {
        return window.SPCollect.collect({ http: window.SPCollect.fetchHttp(), creds: { pl: cr, tt: cr.tt || cr }, grades: k === 'pl', timetable: k === 'tt',
          calendar: SP.hub.calendar(), ask: quiet ? null : askCode });
      }).then(function (res) {
        if (res.calendar) SP.hub.setCalendar(res.calendar);
        var b = res.bundle;
        if (k === 'pl' && b.hasGrades) { var r = importPlatonus(b); editing = null; render(); notifyNews(r.news); askAutoOnce(); }
        if (k === 'tt' && b.timetable) notifyTt(SP.hub.importTimetable(b.timetable));
        /* ночью и без сети при автообновлении молчим; при нажатии — объясняем */
        res.errors.forEach(function (e) { if (!quiet || !/не отвечает/.test(e.message)) SP.toast(esc(e.message), 'warning', { html: true, ms: 9000 }); });
      });
    }).catch(function (e) { if (!quiet) SP.toast(SP.t('app.fail'), 'danger'); }).then(function () { if (waitKind === k) waitDone(); });
  }
  /* версия файлов сайта (?v=… у скриптов) — чтобы сборщик обновлялся вместе с сайтом */
  var ASSET_V = ((document.querySelector('script[src*="grades.js"]') || {}).src || '').split('v=')[1] || String(Date.now());
  /* ссылки и файлы внутри приложения открывает js/core/app.js (встроенная вкладка браузера, просмотр PDF) */
  SP.app = IS_APP ? { creds: credsModal, notify: function (on) {
    SP.settings.set('appNotify', !!on);
    var br = plug('BackgroundRunner');
    var p = on && br && br.requestPermissions ? br.requestPermissions({ apis: ['notifications'] }).catch(function () { }) : Promise.resolve();
    return p.then(function () { return appCreds(); }).then(syncRunner);
  } } : null;

  /* ---------- Мастер «Автообновление оценок и расписания» ----------
     Показывается один раз сразу после регистрации (и один раз тем, кто уже зарегистрирован),
     потом — из Настроек. Сайт сам понимает устройство и показывает только его шаги:
       win — ПК с Windows (программа StudyPlay.vbs), app — Android-приложение (логин прямо здесь),
       ios — iPhone/iPad (Scriptable), android — Android через браузер (совет поставить приложение),
       other — Mac и прочее (автообновления нет).
     «Готово» включает кнопки «Обновить оценки» / «Обновить расписание», «Пропустить» — нет
     (включить потом: Настройки → Автообновление). */
  var SETUP_SEEN = 'sp-setup-seen';
  function deviceKind() {
    if (IS_APP) return 'app';
    if (IS_IOS) return 'ios';
    if (isWinPc()) return 'win';
    if (/Android/i.test(navigator.userAgent)) return 'android';
    return 'other';
  }
  function setupWizard() {
    var kind = deviceKind(), done = function () { SP.store.set(SETUP_SEEN, true); };
    var enable = function () { SP.settings.set('plHide', false); done(); if (root && !root.hidden) render(); };
    var body = '<p>' + esc(SP.t('setup.intro')) + '</p>' + SP.t('setup.' + kind);
    var acts = [];
    if (kind === 'app') {
      body += '<div class="stack-sm" style="margin-top:var(--sp-3)">' +
        '<div class="field"><label class="label" for="wzL">' + esc(SP.t('app.login')) + '</label><input class="input" id="wzL" autocomplete="username"></div>' +
        '<div class="field"><label class="label" for="wzP">' + esc(SP.t('app.password')) + '</label><input class="input" id="wzP" type="password" autocomplete="current-password"></div>' +
        '<label class="row" style="gap:var(--sp-2)"><input type="checkbox" id="wzSame" checked><span>' + esc(SP.t('app.same')) + '</span></label>' +
        '<div id="wzTt" hidden><div class="field"><label class="label" for="wzTL">' + esc(SP.t('app.ttLogin')) + '</label><input class="input" id="wzTL"></div>' +
        '<div class="field"><label class="label" for="wzTP">' + esc(SP.t('app.ttPassword')) + '</label><input class="input" id="wzTP" type="password"></div></div>' +
        '<label class="row" style="gap:var(--sp-2)"><input type="checkbox" id="wzNotify" checked><span>' + esc(SP.t('app.notify')) + '</span></label></div>';
      acts = [{ label: SP.t('setup.skip'), onClick: done }, { label: SP.t('setup.saveCheck'), kind: 'primary', onClick: function () {
        var g = function (id) { return SP.$('#' + id, m.el).value; };
        var c = { login: g('wzL').trim(), pw: g('wzP') };
        if (!SP.$('#wzSame', m.el).checked) c.tt = { login: g('wzTL').trim(), pw: g('wzTP') };
        if (!c.login || !c.pw) { SP.$(c.login ? '#wzP' : '#wzL', m.el).focus(); return false; }
        SP.settings.set('appNotify', SP.$('#wzNotify', m.el).checked);
        SP.store.set(ASK_AUTO, true); enable();
        saveAppCreds(c).then(function () { return SP.app.notify(SP.$('#wzNotify', m.el) ? SP.$('#wzNotify', m.el).checked : true); }).then(function () { runProgram(false, 'pl'); });
      } }];
    } else if (kind === 'win') {
      body += '<p><a class="btn" href="downloads/studyplay-grades.zip" download>' + SP.icon('download') + '<span>' + esc(SP.t('jr.plDownload')) + '</span></a></p>';
      acts = [{ label: SP.t('setup.skip'), onClick: done }, { label: SP.t('setup.doneCheck'), kind: 'primary', onClick: function () { SP.store.set('sp-pl-run-ok', true); SP.store.set(ASK_AUTO, true); enable(); runProgram(false, 'pl'); } }];
    } else if (kind === 'ios') {
      body += '<p class="row" style="gap:var(--sp-2);flex-wrap:wrap"><button type="button" class="btn" data-ios>' + SP.icon('copy') + '<span>' + esc(SP.t('app.iosCopy')) + '</span></button></p>';
      acts = [{ label: SP.t('setup.skip'), onClick: done }, { label: SP.t('setup.doneCheck'), kind: 'primary', onClick: function () { SP.store.set('sp-ios-ok', true); enable(); iosRun(false, 'pl'); } }];
    } else if (kind === 'android') {
      body += '<p><a class="btn btn-primary" href="' + APK_URL + '">' + SP.icon('download') + '<span>' + esc(SP.t('app.apk')) + '</span></a></p>';
      acts = [{ label: SP.t('common.understood'), kind: 'primary', onClick: done }];
    } else {
      acts = [{ label: SP.t('common.understood'), kind: 'primary', onClick: done }];
    }
    var m = SP.modal({ title: SP.t('setup.title'), size: 'lg', body: body, actions: acts });
    var cb = SP.$('#wzSame', m.el); if (cb) cb.onchange = function () { SP.$('#wzTt', m.el).hidden = cb.checked; };
    var ib = SP.$('[data-ios]', m.el);
    if (ib) ib.onclick = function () { fetch('downloads/StudyPlay-iPhone.js', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(SP.copyText).then(function () { SP.toast(SP.t('common.copied'), 'success'); }, function () { SP.toast(SP.t('app.fail'), 'danger'); }); };
    return m;
  }
  /* один раз: сразу после регистрации или при первом заходе после обновления сайта */
  (function firstRun() {
    var tries = 0;
    var tick = function () {
      if (SP.store.get(SETUP_SEEN, false) || tries++ > 600) return;
      var ready = SP.auth && SP.auth.user && SP.auth.user() && !document.body.classList.contains('auth-open') && !SP.$('.modal-backdrop, [role="dialog"]');
      /* показали — больше сами не показываем (закрыли крестиком = «пропустить») */
      if (ready) setTimeout(function () { if (!SP.store.get(SETUP_SEEN, false)) { SP.store.set(SETUP_SEEN, true); setupWizard(); } }, 600); else setTimeout(tick, 1000);
    };
    setTimeout(tick, 1500);
  })();
  SP.pl.setup = setupWizard; SP.pl.kind = deviceKind;

  /* ---------- «Как часто обновлять?» — один раз, сразу после первого удачного обновления из мастера ----------
     Только там, где сайт умеет обновлять сам: ПК с Windows и Android-приложение
     (на iPhone — «Команды», в браузере телефона — нечем). */
  var ASK_AUTO = 'sp-ask-auto', quietKick = false;
  function askAutoOnce() {
    if (!SP.store.get(ASK_AUTO, false) || !/^(win|app)$/.test(deviceKind())) return;
    SP.store.del(ASK_AUTO);
    setTimeout(autoModal, 1500);   /* сначала пусть человек увидит свои оценки */
  }
  function autoModal() {
    var pick = { pl: SP.settings.get('plAuto') || 30, tt: SP.settings.get('ttAuto') || 180 };
    var seg = function (k, opts) {
      return '<div class="segmented seg-wrap" role="group" data-auto="' + k + '">' + opts.map(function (o) {
        return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (+pick[k] === o[0]) + '">' + esc(SP.t(o[1])) + '</button>';
      }).join('') + '</div>';
    };
    var m = SP.modal({ title: SP.t('setup.autoTitle'), body:
      '<p>' + esc(SP.t('setup.autoText')) + '</p>' +
      '<div class="stack-sm"><div class="label">' + esc(SP.t('setup.autoGrades')) + '</div>' + seg('pl', [[0, 'setup.never'], [15, 'setup.m15'], [30, 'setup.m30'], [60, 'setup.h1'], [180, 'setup.h3']]) + '</div>' +
      '<div class="stack-sm" style="margin-top:var(--sp-3)"><div class="label">' + esc(SP.t('setup.autoTt')) + '</div>' + seg('tt', [[0, 'setup.byButton'], [60, 'setup.h1'], [180, 'setup.h3'], [360, 'setup.h6'], [1440, 'setup.day']]) + '</div>' +
      '<p class="small muted" style="margin-top:var(--sp-3)">' + esc(SP.t(IS_APP ? 'setup.autoNoteApp' : 'setup.autoNotePc')) + '</p>',
      actions: [{ label: SP.t('common.save'), kind: 'primary', onClick: function () {
        quietKick = true;   /* только что обновились — сразу второй раз в Platonus не идём */
        SP.settings.set('plAuto', pick.pl); SP.settings.set('ttAuto', pick.tt);
        quietKick = false;
        SP.toast(SP.t('settings.saved'), 'success');
      } }] });
    SP.$$('[data-auto]', m.el).forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        pick[g.getAttribute('data-auto')] = +b.getAttribute('data-v');
        SP.$$('[data-v]', g).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      });
    });
  }

  /* ---------- «StudyPlay на телефоне»: Android-приложение и iPhone (Scriptable) ---------- */
  var APK_URL = 'https://github.com/alantesterr/testerw/releases/download/android-latest/StudyPlay.apk';
  function phoneModal(after) {
    var m = SP.modal({ title: SP.t('app.phoneTitle'), size: 'lg', body: SP.t('app.phoneHtml') +
      '<div class="row" style="gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">' +
      '<a class="btn btn-primary" href="' + APK_URL + '">' + SP.icon('download') + '<span>' + esc(SP.t('app.apk')) + '</span></a>' +
      '<button type="button" class="btn" data-ios>' + SP.icon('copy') + '<span>' + esc(SP.t('app.iosCopy')) + '</span></button>' +
      '<a class="btn btn-ghost" href="downloads/StudyPlay-iPhone.js" download>' + SP.icon('file-text') + '<span>' + esc(SP.t('app.iosFile')) + '</span></a></div>' });
    var b = SP.$('[data-ios]', m.el);
    if (b) b.onclick = function () {
      fetch('downloads/StudyPlay-iPhone.js', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(SP.copyText).then(function () { SP.toast(SP.t('common.copied'), 'success'); }, function () { SP.toast(SP.t('app.fail'), 'danger'); });
    };
    if (typeof after === 'function') after(m);
  }
  /* «Получить всё» в программе: расписание со ссылками едет вместе с оценками (ссылка, файл, буфер) */
  function withTimetable(d) {
    if (d && d.calendar) SP.hub.setCalendar(d.calendar);   /* академический календарь из Platonus */
    if (!d || !d.timetable) return;
    try { notifyTt(SP.hub.importTimetable(d.timetable)); } catch (e) { SP.toast(SP.t('jr.ttBad'), 'danger'); }
  }
  /* Сообщение после обновления расписания: только если что-то поменялось */
  function notifyTt(res) {
    var list = function (a) { return '<ul class="small" style="margin:.25rem 0 0;padding-left:1.1rem">' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
    if (res.first) return SP.toast(esc(SP.t('jr.ttFirst', { n: res.lessons })), 'success', { html: true, ms: 8000 });
    if (res.news.length) {
      var seen = {}, rows = res.news.filter(function (x) { var k = x.name + x.date; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 6).map(function (x) {
        return '<b>' + esc(x.name) + '</b> · ' + esc(x.date.slice(8, 10) + '.' + x.date.slice(5, 7));
      });
      return SP.toast('<b>' + esc(SP.t(res.news.length > 1 ? 'jr.ttNewLinks' : 'jr.ttNewLink')) + '</b>' + list(rows) + (res.changed ? '<div class="small">' + esc(SP.t('jr.ttChanged')) + '</div>' : ''), 'success', { html: true, ms: 12000 });
    }
    if (res.changed) SP.toast(esc(SP.t('jr.ttChanged')), 'success', { html: true, ms: 8000 });
  }
  /* Маленький крутящийся значок справа снизу, пока идёт обновление (не меньше 2 секунд, не дольше минуты) */
  var busyEl = null, busyAt = 0, busyMax = null;
  function busy(on) {
    clearTimeout(busyMax);
    if (on) {
      if (!busyEl) {
        busyEl = document.createElement('div'); busyEl.className = 'pl-busy'; busyEl.setAttribute('role', 'status');
        busyEl.innerHTML = SP.icon('refresh-cw') + '<span class="sr-only">' + esc(SP.t('jr.plBusy')) + '</span>';
        busyEl.title = SP.t('jr.plBusy');
        document.body.appendChild(busyEl);
      }
      busyAt = Date.now(); busyEl.classList.add('on');
      busyMax = setTimeout(function () { busy(false); }, 60000);
    } else if (busyEl) {
      var el = busyEl;
      setTimeout(function () { el.classList.remove('on'); }, Math.max(0, 2000 - (Date.now() - busyAt)));
    }
  }
  function checkClip() {
    if (!waitUntil || Date.now() > waitUntil) { waitDone(); return; }
    if (!document.hasFocus() || !navigator.clipboard || !navigator.clipboard.readText) return;
    navigator.clipboard.readText().then(function (t) {
      t = String(t || '').trim(); if (!waitUntil) return;
      var isTt = t.indexOf(TT_PREFIX) === 0; if (!isTt && t.indexOf(PREFIX) !== 0) return;
      var asked = waitKind; waitDone();
      try { navigator.clipboard.writeText(''); } catch (e) { /* ничего */ }
      fromLink(t.slice((isTt ? TT_PREFIX : PREFIX).length)).then(function (d) {
        if (isTt) return notifyTt(SP.hub.importTimetable(d));
        var res = importPlatonus(d); editing = null; render();
        notifyNews(res.news);   /* сообщаем только о новых оценках */
        withTimetable(d);
        askAutoOnce();
        /* просили расписание, а пришли оценки — программа подключена по-старому */
        if (asked === 'tt' && !d.timetable) SP.toast(esc(SP.t('jr.ttOld')), 'warning', { html: true, ms: 15000 });
      }).catch(function () { SP.toast(SP.t(isTt ? 'jr.ttBad' : 'jr.plBadLink'), 'danger'); });
    }, function () {
      if (!clipWarned) { clipWarned = true; SP.toast(SP.t('jr.plClip'), 'warning'); }
    });
  }
  window.addEventListener('focus', function () { if (waitUntil) checkClip(); });

  /* ---------- Автообновление ----------
     Настройки → Инструменты: «Автообновление из Platonus, мин» и «Автообновление расписания, мин»
     (0 — выключено). Сайт сам «нажимает» кнопку сразу при открытии и дальше каждые N минут,
     пока вкладка открыта. Работает только на Windows и когда кнопки Platonus не скрыты.
     Вкладка не на экране — обновление откладывается до возвращения к ней. */
  var auto = { pl: { timer: null, due: false }, tt: { timer: null, due: false } };
  function autoMin(k) { var v = parseFloat(SP.settings.get(KIND[k].auto)); return v > 0 ? Math.max(1, v) : 0; }
  function autoOn(k) { return autoMin(k) > 0 && !plHidden() && (isWinPc() || IS_APP); }
  /* Ночной перерыв Platonus: обычно не работает примерно с 23:00 до 7:00 (к Timetable не относится) */
  function plNight() { var h = new Date().getHours(); return h >= 23 || h < 7; }
  function autoRun(k) {
    if (!autoOn(k) || (KIND[k].night && plNight())) return;
    if (document.visibilityState !== 'visible' || editing) { auto[k].due = true; return; }
    auto[k].due = false; runProgram(true, k);
  }
  function autoSchedule() {
    Object.keys(auto).forEach(function (k) {
      clearInterval(auto[k].timer); auto[k].timer = null;
      if (autoOn(k)) auto[k].timer = setInterval(function () { autoRun(k); }, autoMin(k) * 60000);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') Object.keys(auto).forEach(function (k) { if (auto[k].due) autoRun(k); });
  });
  SP.on('settings', function (e) {
    if (!e || ['plAuto', 'ttAuto', 'plHide'].indexOf(e.key) < 0) return;
    autoSchedule();
    if (e.key === 'plHide' && root && !root.hidden && !editing) render();   /* кнопка «Обновить оценки» появилась/исчезла */
    if (quietKick) return;
    if (e.key === 'plAuto' && autoOn('pl')) autoRun('pl');
    if (e.key === 'ttAuto' && autoOn('tt')) autoRun('tt');
  });
  /* при открытии сайта — сразу (сначала оценки, потом расписание) */
  var openedWithData = /\/pl\//.test(location.hash);   /* сайт открыла программа и уже принесла оценки */
  window.addEventListener('load', function () { setTimeout(function () { autoSchedule(); if (!openedWithData) autoRun('pl'); autoRun('tt'); }, 2000); });
  /* Оценки обновились в другой вкладке (например, её открыла программа) — эта вкладка перерисуется сама */
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('sp-journal-v1') < 0 || !root || root.hidden || editing) return;
    render();
  });
})();

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
  function ring(label, v) {
    /* Как в Shokan: целое число, пусто — серый «0» */
    var txt = v == null ? '0' : String(Math.round(v)), c = 2 * Math.PI * 16, len = Math.max(0, Math.min(100, v || 0)) / 100 * c;
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
    var r1 = num(it.rk1), r2 = num(it.rk2), e = num(it.exam);
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
  function wire() { wireJournal(); }
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
  SP.views.register('grades', { titleKey: 'nav.grades', mount: function (el) { root = el; render(); }, show: render, refresh: render });
})();

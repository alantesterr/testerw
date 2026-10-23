/* =====================================================================
   РАЗДЕЛ «ОЦЕНКИ».
   • «Журнал» — карточки предметов в стиле приложения Shokan: четыре
     кольца «Ср. тек.», «Рейтинг», «Экзамен», «Итоговая». Доступа к
     Platonus нет, поэтому значения вводит сам студент (прямо на
     карточке) или переносит из калькулятора.
   • «Калькулятор оценок» — расчёт рейтинга и нужного балла на экзамене:
       рейтинг = текущая·60% + РК1·20% + РК2·20%
       итог    = рейтинг·60% + экзамен·40%
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var root = null, tab = SP.store.get('sp-grades-tab2', 'calc'), editing = null;
  if (tab !== 'journal' && tab !== 'calc') tab = 'calc';

  /* ПОРОГИ ЦВЕТА КОЛЕЦ — меняйте только здесь.
     0 или пусто → серое пустое кольцо; 1–49 красный; 50–69 жёлтый;
     70–89 синий; 90–100 зелёный (как на скриншотах Shokan). */
  var RING = [{ min: 90, cls: 'green' }, { min: 70, cls: 'blue' }, { min: 50, cls: 'yellow' }, { min: 0.01, cls: 'red' }];
  function ringCls(v) { if (!v) return ''; for (var i = 0; i < RING.length; i++) if (v >= RING[i].min) return RING[i].cls; return ''; }
  function tone(v) { return v == null ? '' : v >= 90 ? 'success' : v >= 70 ? 'accent' : v >= 50 ? 'warning' : 'danger'; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function num(v) { if (v === '' || v == null) return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
  function who() { return String(((SP.auth.user() || {}).login) || '').toLowerCase(); }

  /* ---------- Журнал ---------- */
  function jKey() { return 'sp-journal-v1:' + who(); }
  function jState() { var s = SP.store.get(jKey(), null); if (!s || !Array.isArray(s.items)) s = { items: [] }; return s; }
  function jSave(s) { SP.store.set(jKey(), s); }
  function ring(label, v) {
    var val = v == null ? 0 : v, c = 2 * Math.PI * 16, len = Math.max(0, Math.min(100, val)) / 100 * c;
    return '<div class="jr-ring"><span>' + esc(label) + '</span><div class="ring ' + ringCls(val) + '" role="img" aria-label="' + esc(label + ': ' + f1(val)) + '"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="bg" cx="20" cy="20" r="16"/>' +
      (len ? '<circle class="fg" cx="20" cy="20" r="16" stroke-dasharray="' + len.toFixed(2) + ' ' + c.toFixed(2) + '"/>' : '') + '</svg><b>' + esc(f1(val)) + '</b></div></div>';
  }
  function teachLabel(t) {
    t = String(t || '').trim(); if (!t) return '';
    return SP.t(/[,;]/.test(t) ? 'jr.teachers' : 'jr.teacher') + ': ' + t;
  }
  function journalHtml() {
    var st = jState();
    var h = '<div class="row-between"><div class="jr-legend"><span><i style="background:var(--ring-green)"></i>90–100</span><span><i style="background:var(--ring-blue)"></i>70–89</span><span><i style="background:var(--ring-yellow)"></i>50–69</span><span><i style="background:var(--ring-red)"></i>1–49</span></div>' +
      '<div class="btn-group"><button type="button" class="btn" id="jrFromCalc">' + SP.icon('calculator') + '<span>' + esc(SP.t('jr.fromCalc')) + '</span></button>' +
      '<button type="button" class="btn btn-primary" id="jrAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('grades.addSubject')) + '</span></button></div></div>';
    if (!st.items.length) {
      return h + '<section class="card"><div class="empty">' + SP.icon('graduation-cap', 'ic-xl') + '<h3>' + esc(SP.t('jr.emptyTitle')) + '</h3><p>' + esc(SP.t('jr.emptyText')) + '</p>' +
        '<div class="btn-group"><button type="button" class="btn btn-primary" id="jrFromSched">' + SP.icon('calendar-days') + '<span>' + esc(SP.t('jr.fromSchedule')) + '</span></button></div></div></section>';
    }
    return h + '<div class="jr-grid">' + st.items.map(function (it) { return editing === it.id ? editCard(it) : card(it); }).join('') + '</div>';
  }
  function card(it) {
    return '<article class="jr-card" data-id="' + esc(it.id) + '"><div class="jr-top"><div class="jr-title"><h3 class="jr-name">' + esc(it.name || '—') + '</h3>' +
      (it.teachers ? '<div class="jr-teach">' + esc(teachLabel(it.teachers)) + '</div>' : '') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-edit="' + esc(it.id) + '" aria-label="' + esc(SP.t('jr.edit')) + '" data-tip="' + esc(SP.t('jr.edit')) + '">' + SP.icon('chevron-right') + '</button></div>' +
      '<div class="jr-rings">' + ring(SP.t('jr.cur'), it.cur) + ring(SP.t('jr.rating'), it.rating) + ring(SP.t('jr.exam'), it.exam) + ring(SP.t('jr.final'), it.final) + '</div></article>';
  }
  function editCard(it) {
    var f = function (k, label, val, full, type) {
      return '<div class="field' + (full ? ' full' : '') + '"><label class="label" for="je-' + k + '">' + esc(label) + '</label><input class="input" id="je-' + k + '" data-k="' + k + '"' + (type === 'num' ? ' inputmode="decimal" placeholder="0–100"' : '') + ' value="' + esc(val == null ? '' : val) + '"></div>';
    };
    return '<article class="jr-card" data-id="' + esc(it.id) + '"><div class="jr-edit">' +
      f('name', SP.t('grades.subjectName'), it.name, true) + f('teachers', SP.t('jr.teacherField'), it.teachers, true) +
      f('cur', SP.t('jr.cur'), it.cur, false, 'num') + f('rating', SP.t('jr.rating'), it.rating, false, 'num') +
      f('exam', SP.t('jr.exam'), it.exam, false, 'num') + f('final', SP.t('jr.final'), it.final, false, 'num') + '</div>' +
      '<div class="jr-actions"><button type="button" class="btn btn-danger-outline btn-sm" data-del="' + esc(it.id) + '">' + SP.icon('trash-2') + '<span>' + esc(SP.t('common.delete')) + '</span></button>' +
      '<span class="grow"></span><button type="button" class="btn btn-sm" data-cancel>' + esc(SP.t('common.cancel')) + '</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-save="' + esc(it.id) + '">' + SP.icon('check') + '<span>' + esc(SP.t('common.save')) + '</span></button></div></article>';
  }
  function upsert(st, name, patch) {
    var it = st.items.filter(function (x) { return SP.lc(x.name) === SP.lc(name); })[0];
    if (!it) { it = { id: SP.uid('j'), name: name, teachers: '', cur: null, rating: null, exam: null, final: null }; st.items.push(it); }
    Object.keys(patch).forEach(function (k) { if (patch[k] != null && patch[k] !== '') it[k] = patch[k]; });
    return it;
  }
  function fromCalc() {
    var cs = calcState(), st = jState(), n = 0;
    cs.s.forEach(function (s) {
      if (!String(s.name || '').trim()) return;
      var v = vals(s), R = v.c != null && v.r1 != null && v.r2 != null ? 0.6 * v.c + 0.2 * v.r1 + 0.2 * v.r2 : null, F = R != null && v.e != null ? 0.6 * R + 0.4 * v.e : null;
      var r1 = function (x) { return x == null ? null : Math.round(x); };
      upsert(st, s.name.trim(), { cur: r1(v.c), rating: r1(R), exam: r1(v.e), final: r1(F) }); n++;
    });
    jSave(st); tab = 'journal'; SP.store.set('sp-grades-tab2', tab); render();
    SP.toast(n ? SP.t('jr.moved', { n: n }) : SP.t('jr.calcEmpty'), n ? 'success' : 'warning');
  }
  function fromSchedule() {
    var st = jState(), n = 0;
    SP.hub.data().subjects.forEach(function (s) { var nm = SP.hub.cleanName(s.name); if (!nm) return; var before = st.items.length; upsert(st, nm, { teachers: s.teacher || '' }); if (st.items.length > before) n++; });
    jSave(st); render(); SP.toast(SP.t('jr.added', { n: n }), n ? 'success' : 'info');
  }

  /* ---------- Калькулятор ---------- */
  function calcKey() { return 'studyplay-calc-v1:' + who(); }
  function calcState() { var s = SP.store.get(calcKey(), null); if (!s || !Array.isArray(s.s)) s = { s: [] }; return s; }
  var W = { c: 0.36, r1: 0.12, r2: 0.12, e: 0.4 };
  function cur(s) { var g = (s.grades || []).map(Number).filter(function (x) { return !isNaN(x); }); return s.mode === 'avg' ? num(s.avg) : (g.length ? g.reduce(function (a, b) { return a + b; }, 0) / g.length : null); }
  function vals(s) { return { c: cur(s), r1: num(s.rk1), r2: num(s.rk2), e: num(s.exam) }; }
  function need(v, T) {
    var un = Object.keys(W).filter(function (k) { return v[k] == null; }); if (!un.length) return null;
    var K = 0; Object.keys(W).forEach(function (k) { if (v[k] != null) K += W[k] * v[k]; });
    return { un: un, x: (T - K) / un.reduce(function (a, k) { return a + W[k]; }, 0) };
  }
  function calcHtml() {
    var st = calcState();
    var h = '<section class="card card-flat"><div class="row-between"><p class="small muted">' + esc(SP.t('grades.formula')) + '</p>' +
      '<div class="btn-group"><button type="button" class="btn" id="cvToJournal"' + (st.s.length ? '' : ' disabled') + '>' + SP.icon('graduation-cap') + '<span>' + esc(SP.t('jr.toJournal')) + '</span></button>' +
      '<button type="button" class="btn btn-primary" id="cvAdd">' + SP.icon('plus') + '<span>' + esc(SP.t('grades.addSubject')) + '</span></button></div></div></section>';
    h += '<div class="stack" id="cvList">' + (st.s.length ? st.s.map(calcCard).join('') : '<section class="card"><div class="empty">' + SP.icon('calculator', 'ic-xl') + '<p>' + esc(SP.t('grades.calcEmpty')) + '</p></div></section>') + '</div>';
    return h + '<p class="xsmall subtle">' + esc(SP.t('grades.colors')) + ' ' + esc(SP.t('grades.calcHint')) + '</p>';
  }
  function calcCard(s, i) {
    var chips = (s.grades || []).map(function (x, j) { return '<button type="button" class="mark ' + tone(+x) + '" data-a="delg" data-j="' + j + '" aria-label="' + esc(SP.t('grades.delMark', { v: x })) + '" data-tip="' + esc(SP.t('grades.delMarkTip')) + '">' + esc(x) + SP.icon('x', 'ic-sm') + '</button>'; }).join('');
    return '<article class="card cv-card" data-i="' + i + '"><div class="row row-nowrap"><input class="input grow" data-f="name" value="' + esc(s.name) + '" placeholder="' + esc(SP.t('grades.subjectName')) + '" aria-label="' + esc(SP.t('grades.subjectName')) + '">' +
      '<button type="button" class="btn btn-ghost btn-icon" data-a="del" aria-label="' + esc(SP.t('grades.delSubject')) + '" data-tip="' + esc(SP.t('grades.delSubject')) + '">' + SP.icon('trash-2') + '</button></div>' +
      '<div class="segmented"><button type="button" data-a="mode" data-m="list" aria-pressed="' + (s.mode !== 'avg') + '">' + esc(SP.t('grades.oneByOne')) + '</button><button type="button" data-a="mode" data-m="avg" aria-pressed="' + (s.mode === 'avg') + '">' + esc(SP.t('grades.avgAtOnce')) + '</button></div>' +
      (s.mode === 'avg' ? '<div class="field"><label class="label">' + esc(SP.t('grades.currentAvg')) + '</label><input class="input input-num" data-f="avg" inputmode="decimal" value="' + esc(s.avg) + '" placeholder="0–100"></div>'
        : (chips ? '<div class="marks">' + chips + '</div>' : '') + '<div class="row row-nowrap"><input class="input" data-f="newg" inputmode="decimal" placeholder="' + esc(SP.t('grades.newMark')) + '" aria-label="' + esc(SP.t('grades.newMark')) + '"><button type="button" class="btn btn-icon" data-a="addg" aria-label="' + esc(SP.t('grades.addMark')) + '" data-tip="' + esc(SP.t('grades.addMark')) + '">' + SP.icon('plus') + '</button></div><span class="xsmall subtle cv-sm"></span>') +
      '<div class="cv-g3"><div class="field"><label class="label">' + esc(SP.t('grades.rk1')) + '</label><input class="input" data-f="rk1" inputmode="decimal" value="' + esc(s.rk1) + '"></div><div class="field"><label class="label">' + esc(SP.t('grades.rk2')) + '</label><input class="input" data-f="rk2" inputmode="decimal" value="' + esc(s.rk2) + '"></div><div class="field"><label class="label">' + esc(SP.t('grades.exam')) + '</label><input class="input" data-f="exam" inputmode="decimal" value="' + esc(s.exam) + '"></div></div>' +
      '<div class="cv-res"><div><span>' + esc(SP.t('grades.avgCurrent')) + '</span><b data-r="c">—</b></div><div><span>' + esc(SP.t('grades.rating')) + '</span><b data-r="r">—</b></div><div><span>' + esc(SP.t('grades.final')) + '</span><b data-r="f">—</b></div></div>' +
      '<p class="small cv-hint"></p></article>';
  }
  function upd(card, s) {
    var v = vals(s), R = v.c != null && v.r1 != null && v.r2 != null ? 0.6 * v.c + 0.2 * v.r1 + 0.2 * v.r2 : null, F = R != null && v.e != null ? 0.6 * R + 0.4 * v.e : null;
    var put = function (k, val) { var e = card.querySelector('[data-r=' + k + ']'); e.className = val == null ? '' : 'text-' + tone(val); e.textContent = val == null ? '—' : f1(val); };
    put('c', v.c); put('r', R); put('f', F);
    var sm = card.querySelector('.cv-sm'); if (sm) sm.textContent = SP.t('grades.marksN', { n: (s.grades || []).length }) + (v.c != null ? ' · ' + SP.t('grades.avgIs', { v: f1(v.c) }) : '');
    var n70 = need(v, 70), n72 = need(v, 72), h = card.querySelector('.cv-hint');
    var NM = { c: SP.t('grades.current'), r1: SP.t('grades.rk1'), r2: SP.t('grades.rk2'), e: SP.t('grades.exam') };
    var fmtN = function (x) { return x <= 0 ? SP.t('grades.enough') : x > 100 ? SP.t('grades.notEnough') : '≥ ' + Math.ceil(x); };
    SP.$$('[data-f=rk1],[data-f=rk2],[data-f=exam]', card).forEach(function (i) { var k = { rk1: 'r1', rk2: 'r2', exam: 'e' }[i.getAttribute('data-f')]; i.placeholder = (n72 && n72.un.indexOf(k) >= 0 && n72.x > 0 && n72.x <= 100) ? '≈' + Math.ceil(n72.x) : '0–100'; });
    if (!n70) { h.textContent = F >= 70 ? SP.t('grades.ok70') : SP.t('grades.below70'); h.className = 'small cv-hint ' + (F >= 70 ? 'text-success' : 'text-danger'); }
    else { h.className = 'small cv-hint'; h.textContent = SP.t('grades.need', { list: n70.un.map(function (k) { return NM[k]; }).join(', '), x: fmtN(n70.x), y: fmtN(n72.x) }); }
  }

  /* ---------- Отрисовка и события ---------- */
  function render() {
    if (!root) return;
    var html = SP.pageHead({ title: SP.t('nav.grades'), sub: esc(SP.t('jr.sub')) });
    html += '<div class="tabs" role="tablist">' +
      '<button type="button" class="tab" role="tab" data-tab="calc" aria-selected="' + (tab === 'calc') + '">' + SP.icon('calculator', 'ic-sm') + '<span>' + esc(SP.t('grades.calc')) + '</span></button>' +
      '<button type="button" class="tab" role="tab" data-tab="journal" aria-selected="' + (tab === 'journal') + '">' + SP.icon('graduation-cap', 'ic-sm') + '<span>' + esc(SP.t('grades.journal')) + '</span></button></div>';
    html += tab === 'journal' ? journalHtml() : calcHtml();
    root.innerHTML = '<div class="page">' + html + '</div>';
    wire();
  }
  function wire() {
    var $ = function (s) { return SP.$(s, root); };
    SP.$$('[data-tab]', root).forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); editing = null; SP.store.set('sp-grades-tab2', tab); render(); }; });
    if (tab === 'journal') { wireJournal(); return; }
    var st = calcState(), sv = function () { SP.store.set(calcKey(), st); };
    var list = $('#cvList');
    SP.$$('.cv-card', root).forEach(function (c) { upd(c, st.s[+c.getAttribute('data-i')]); });
    var addSub = function (name) {
      st.s.push({ name: name || '', mode: 'list', grades: [], avg: '', rk1: '', rk2: '', exam: '' }); sv(); render();
      var cards = SP.$$('.cv-card', root), last = cards[cards.length - 1]; if (last) { last.scrollIntoView({ block: 'center' }); if (!name) last.querySelector('[data-f=name]').focus(); }
    };
    $('#cvAdd').onclick = function () {
      var names = SP.hub.subjectNames().filter(function (n) { return !st.s.some(function (x) { return SP.lc(x.name) === SP.lc(n); }); });
      if (!names.length) { addSub(''); return; }
      var m = SP.modal({ title: SP.t('grades.addSubject'), body: '<p class="small muted">' + esc(SP.t('grades.pickSubject')) + '</p><div class="stack-sm">' + names.map(function (n) { return '<button type="button" class="btn btn-block wrap" data-pick="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div>',
        actions: [{ label: SP.t('grades.newSubject'), icon: 'plus', kind: 'primary', onClick: function () { addSub(''); } }] });
      SP.$$('[data-pick]', m.el).forEach(function (b) { b.onclick = function () { m.close(); addSub(b.getAttribute('data-pick')); }; });
    };
    var tj = $('#cvToJournal'); if (tj) tj.onclick = fromCalc;
    if (!list) return;
    list.addEventListener('input', function (e) {
      var c = e.target.closest('.cv-card'); if (!c) return; var f = e.target.getAttribute('data-f'); if (!f || f === 'newg') return;
      var s = st.s[+c.getAttribute('data-i')]; s[f] = e.target.value; sv(); upd(c, s);
    });
    var addG = function (c) {
      var s = st.s[+c.getAttribute('data-i')], inp = c.querySelector('[data-f=newg]'), v = num(inp.value);
      if (v == null) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
      (s.grades = s.grades || []).push(v); sv(); var i = +c.getAttribute('data-i'); render();
      var ni = SP.$('.cv-card[data-i="' + i + '"] [data-f=newg]', root); if (ni) ni.focus();
    };
    list.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute('data-f') === 'newg') { e.preventDefault(); addG(e.target.closest('.cv-card')); } });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; var c = b.closest('.cv-card'), s = c && st.s[+c.getAttribute('data-i')], a = b.getAttribute('data-a');
      if (a === 'addg') addG(c);
      else if (a === 'delg') { s.grades.splice(+b.getAttribute('data-j'), 1); sv(); render(); }
      else if (a === 'mode') { s.mode = b.getAttribute('data-m'); sv(); render(); }
      else if (a === 'del') SP.confirm({ title: SP.t('grades.delSubject'), text: SP.t('grades.delSubjectText', { name: s.name || '—' }), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) { if (ok) { st.s.splice(+c.getAttribute('data-i'), 1); sv(); render(); } });
    });
  }
  function wireJournal() {
    var $ = function (s) { return SP.$(s, root); };
    var on = function (s, fn) { var el = $(s); if (el) el.onclick = fn; };
    on('#jrFromCalc', fromCalc); on('#jrFromSched', fromSchedule);
    on('#jrAdd', function () { var st = jState(), it = { id: SP.uid('j'), name: '', teachers: '', cur: null, rating: null, exam: null, final: null }; st.items.push(it); jSave(st); editing = it.id; render(); var i = $('#je-name'); if (i) i.focus(); });
    SP.$$('[data-edit]', root).forEach(function (b) { b.onclick = function () { editing = b.getAttribute('data-edit'); render(); var i = $('#je-cur'); if (i) i.focus(); }; });
    SP.$$('[data-cancel]', root).forEach(function (b) {
      b.onclick = function () { var st = jState(); st.items = st.items.filter(function (x) { return x.id !== editing || String(x.name).trim(); }); jSave(st); editing = null; render(); };
    });
    SP.$$('[data-save]', root).forEach(function (b) {
      b.onclick = function () {
        var st = jState(), it = st.items.filter(function (x) { return x.id === b.getAttribute('data-save'); })[0]; if (!it) return;
        var card = b.closest('.jr-card'), g = function (k) { return SP.$('[data-k="' + k + '"]', card).value; };
        var name = g('name').trim(); if (!name) { var ni = SP.$('[data-k="name"]', card); ni.setAttribute('aria-invalid', 'true'); ni.focus(); return; }
        it.name = name; it.teachers = g('teachers').trim();
        ['cur', 'rating', 'exam', 'final'].forEach(function (k) { it[k] = num(g(k)); });
        jSave(st); editing = null; render(); SP.toast(SP.t('settings.saved'), 'success');
      };
    });
    SP.$$('[data-del]', root).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        SP.confirm({ title: SP.t('grades.delSubject'), text: SP.t('jr.delText'), okLabel: SP.t('common.delete'), danger: true, icon: 'trash-2' }).then(function (ok) {
          if (!ok) return; var st = jState(); st.items = st.items.filter(function (x) { return x.id !== id; }); jSave(st); editing = null; render();
        });
      };
    });
    SP.$$('.jr-edit input', root).forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var s = i.closest('.jr-card').querySelector('[data-save]'); if (s) s.click(); } else if (e.key === 'Escape') { var c = i.closest('.jr-card').querySelector('[data-cancel]'); if (c) c.click(); } }); });
  }

  SP.grades = { ringCls: ringCls, RING: RING };
  SP.views.register('grades', { titleKey: 'nav.grades', mount: function (el) { root = el; render(); }, show: render, refresh: render });
})();

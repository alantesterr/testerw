/* =====================================================================
   РАЗДЕЛ «ОЦЕНКИ».
   Вкладка «Журнал» — оценки из Platonus (через сервер-посредник).
   Вкладка «Калькулятор» — расчёт рейтинга и нужного балла на экзамене:
     рейтинг = текущая·60% + РК1·20% + РК2·20%
     итог    = рейтинг·60% + экзамен·40%
   Формат ответа Platonus официально не описан, поэтому журнал
   разбирается «гибко»: ищутся названия предметов и баллы. Если что-то
   отображается неверно — кнопка «Исходные данные» покажет, что пришло,
   и это место легко поправить в функции normalize() ниже.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var root = null, tab = SP.store.get('sp-grades-tab', 'journal'), termIdx = null;

  /* ---------- Разбор журнала Platonus ---------- */
  var NAME_KEYS = /^(subjectname|subject_name|subjectnameru|subjectnamekz|subjectnameen|disciplinename|discipline|subject|name|title)$/i;
  var METRIC = [
    ['current', /^(current|currentmark|avg|average|avgcurrent|tekush|tk|currentprogress|attestation)$/i],
    ['rk1', /^(rk1|rating1|rk_1|midterm1|firstrating|r1|ratingone)$/i],
    ['rk2', /^(rk2|rating2|rk_2|midterm2|secondrating|r2|ratingtwo)$/i],
    ['admission', /^(admission|admissionrating|rating|ratingadmission|rd|rdop|dopusk)$/i],
    ['exam', /^(exam|exammark|examination|final|finalexam|e)$/i],
    ['total', /^(total|totalmark|itog|result|finalmark|grade|mark|sum)$/i],
    ['letter', /^(letter|lettermark|alphamark|lettergrade|traditional|traditionalmark)$/i]
  ];
  function numeric(v) { if (v == null || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function findName(o) {
    var keys = Object.keys(o);
    for (var i = 0; i < keys.length; i++) if (NAME_KEYS.test(keys[i]) && typeof o[keys[i]] === 'string' && o[keys[i]].trim().length > 2) return o[keys[i]].trim();
    return null;
  }
  function collectMarks(arr) {
    /* массив отметок: [{ mark: 90, date: ..., type: ... }] */
    return arr.map(function (m) {
      if (typeof m !== 'object' || !m) return null;
      var v = null, label = '';
      Object.keys(m).forEach(function (k) {
        if (v === null && /^(mark|grade|value|ball|score|point)$/i.test(k)) v = numeric(m[k]);
        if (!label && /^(date|lessondate|markdate|day)$/i.test(k)) label = String(m[k]).slice(0, 10);
        if (!label && /^(type|typename|lessontype|kind)$/i.test(k) && typeof m[k] === 'string') label = m[k];
      });
      return v === null ? null : { v: v, label: label };
    }).filter(Boolean);
  }
  function normalize(data) {
    var out = [], seen = {};
    (function walk(node, depth) {
      if (!node || depth > 7) return;
      if (Array.isArray(node)) { node.forEach(function (x) { walk(x, depth + 1); }); return; }
      if (typeof node !== 'object') return;
      var name = findName(node);
      if (name) {
        var row = { name: name, metrics: {}, marks: [], teacher: '' };
        Object.keys(node).forEach(function (k) {
          var v = node[k];
          if (/tutor|teacher|prepod/i.test(k) && typeof v === 'string') row.teacher = v;
          for (var i = 0; i < METRIC.length; i++) {
            if (METRIC[i][1].test(k)) {
              if (METRIC[i][0] === 'letter') { if (typeof v === 'string' && v.trim()) row.metrics.letter = v.trim(); }
              else { var n = numeric(v); if (n !== null && n >= 0 && n <= 100) row.metrics[METRIC[i][0]] = n; }
            }
          }
          if (Array.isArray(v) && v.length && typeof v[0] === 'object') { var ms = collectMarks(v); if (ms.length) row.marks = row.marks.concat(ms); }
        });
        if (row.metrics.current == null && row.marks.length) row.metrics.current = Math.round(row.marks.reduce(function (a, m) { return a + m.v; }, 0) / row.marks.length * 10) / 10;
        if (Object.keys(row.metrics).length || row.marks.length) {
          var key = SP.lc(name);
          if (!seen[key]) { seen[key] = row; out.push(row); }
          else { Object.assign(seen[key].metrics, row.metrics); seen[key].marks = seen[key].marks.concat(row.marks); }
          return;
        }
      }
      Object.keys(node).forEach(function (k) { walk(node[k], depth + 1); });
    })(data, 0);
    return out;
  }

  /* цвет по баллу: 90+ зелёный, 70–89 синий, 50–69 жёлтый, ниже 50 красный */
  function tone(v) { return v == null ? '' : v >= 90 ? 'success' : v >= 70 ? 'accent' : v >= 50 ? 'warning' : 'danger'; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }

  /* ---------- Калькулятор (как на старом сайте) ---------- */
  function calcKey() { return 'studyplay-calc-v1:' + String(((SP.auth.user() || {}).login) || '').toLowerCase(); }
  function calcState() { var s = SP.store.get(calcKey(), null); if (!s || !Array.isArray(s.s)) s = { s: [] }; return s; }
  var W = { c: 0.36, r1: 0.12, r2: 0.12, e: 0.4 };
  function num(v) { if (v === '' || v == null) return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
  function cur(s) { var g = (s.grades || []).map(Number).filter(function (x) { return !isNaN(x); }); return s.mode === 'avg' ? num(s.avg) : (g.length ? g.reduce(function (a, b) { return a + b; }, 0) / g.length : null); }
  function vals(s) { return { c: cur(s), r1: num(s.rk1), r2: num(s.rk2), e: num(s.exam) }; }
  function need(v, T) {
    var un = Object.keys(W).filter(function (k) { return v[k] == null; }); if (!un.length) return null;
    var K = 0; Object.keys(W).forEach(function (k) { if (v[k] != null) K += W[k] * v[k]; });
    return { un: un, x: (T - K) / un.reduce(function (a, k) { return a + W[k]; }, 0) };
  }

  function render() {
    if (!root) return;
    var g = SP.data.grades();
    var html = SP.pageHead({
      title: SP.t('nav.grades'),
      sub: (tab === 'journal' && g) ? SP.data.syncLine() : esc(SP.t('grades.subGuest')),
      actions: tab === 'journal' ? '<button type="button" class="btn" id="grImport">' + SP.icon('upload') + '<span>' + esc(SP.t(g ? 'grades.update' : 'grades.import')) + '</span></button>' : ''
    });
    html += '<div class="tabs" role="tablist">' +
      '<button type="button" class="tab" role="tab" data-tab="journal" aria-selected="' + (tab === 'journal') + '">' + SP.icon('graduation-cap', 'ic-sm') + '<span>' + esc(SP.t('grades.journal')) + '</span></button>' +
      '<button type="button" class="tab" role="tab" data-tab="calc" aria-selected="' + (tab === 'calc') + '">' + SP.icon('calculator', 'ic-sm') + '<span>' + esc(SP.t('grades.calc')) + '</span></button></div>';
    html += tab === 'journal' ? journalHtml() : calcHtml();
    root.innerHTML = '<div class="page">' + html + '</div>';
    wire();
  }

  function journalHtml() {
    var g = SP.data.grades();
    var h = '';
    if (!g) {
      return '<section class="card"><div class="empty">' + SP.icon('graduation-cap', 'ic-xl') + '<h3>' + esc(SP.t('grades.noData')) + '</h3><p>' + esc(SP.t('grades.noDataText')) + '</p>' +
        '<div class="btn-group"><button type="button" class="btn btn-primary" id="grImport2">' + SP.icon('upload') + '<span>' + esc(SP.t('grades.import')) + '</span></button>' +
        '<button type="button" class="btn" id="grHelp">' + SP.icon('circle-help') + '<span>' + esc(SP.t('grades.howTo')) + '</span></button>' +
        '<button type="button" class="btn btn-ghost" data-tab-go="calc">' + SP.icon('calculator') + '<span>' + esc(SP.t('grades.openCalc')) + '</span></button></div></div></section>';
    }
    var p = g.profile || {};
    h += '<section class="card card-flat profile-strip"><span class="avatar">' + SP.icon('user') + '</span><div class="grow"><b>' + esc(p.name || (SP.auth.user() || {}).name || '') + '</b><div class="small muted">' + esc([p.group, p.course ? SP.t('grades.course', { n: p.course }) : '', p.profession].filter(Boolean).join(' · ')) + '</div></div>' +
      (p.gpa != null && p.gpa !== '' ? '<div class="gpa"><span class="xsmall subtle">GPA</span><b>' + esc(p.gpa) + '</b></div>' : '') + '</section>';
    var journals = g.journals || [];
    if (!journals.length) return h + '<section class="card"><div class="empty">' + SP.icon('graduation-cap', 'ic-xl') + '<p>' + esc(SP.t('grades.empty')) + '</p></div></section>';
    if (termIdx === null || !journals[termIdx]) termIdx = journals.length - 1;
    if (journals.length > 1) {
      h += '<div class="segmented" role="group" aria-label="' + esc(SP.t('grades.term')) + '">' + journals.map(function (j, i) {
        return '<button type="button" data-term="' + i + '" aria-pressed="' + (i === termIdx) + '">' + esc(j.label || SP.t('grades.termLabel', { y: j.year, t: j.term })) + '</button>';
      }).join('') + '</div>';
    }
    var rows = normalize(journals[termIdx].data);
    if (!rows.length) {
      h += '<section class="card"><div class="empty">' + SP.icon('triangle-alert', 'ic-xl') + '<h3>' + esc(SP.t('grades.cantRead')) + '</h3><p>' + esc(SP.t('grades.cantReadText')) + '</p></div></section>';
    } else {
      h += '<div class="grade-grid">' + rows.map(function (r) {
        var m = r.metrics, main = m.total != null ? m.total : m.admission != null ? m.admission : m.current;
        var metric = function (k, label) { return m[k] == null ? '' : '<div class="gm"><span>' + esc(label) + '</span><b class="text-' + tone(m[k]) + '">' + esc(f1(m[k])) + '</b></div>'; };
        return '<article class="card grade-card"><div class="row-between row-nowrap"><h3 class="grade-name">' + esc(r.name) + '</h3>' +
          (main != null ? '<span class="grade-main ' + tone(main) + '">' + esc(f1(main)) + '</span>' : '') + '</div>' +
          (r.teacher ? '<div class="small muted">' + esc(r.teacher) + '</div>' : '') +
          '<div class="gm-row">' + metric('current', SP.t('grades.current')) + metric('rk1', SP.t('grades.rk1')) + metric('rk2', SP.t('grades.rk2')) + metric('admission', SP.t('grades.admission')) + metric('exam', SP.t('grades.exam')) + metric('total', SP.t('grades.total')) +
          (m.letter ? '<div class="gm"><span>' + esc(SP.t('grades.letter')) + '</span><b>' + esc(m.letter) + '</b></div>' : '') + '</div>' +
          (r.marks.length ? '<div class="marks">' + r.marks.slice(-30).map(function (x) { return '<span class="mark ' + tone(x.v) + '" title="' + esc(x.label) + '">' + esc(f1(x.v)) + '</span>'; }).join('') + '</div>' : '') +
          '</article>';
      }).join('') + '</div>';
    }
    h += '<p class="xsmall subtle">' + esc(SP.t('grades.colors')) + ' <button type="button" class="link-btn" id="grRaw">' + esc(SP.t('grades.raw')) + '</button> · <button type="button" class="link-btn" id="grHelp">' + esc(SP.t('grades.howTo')) + '</button></p>';
    return h;
  }

  function calcHtml() {
    var st = calcState();
    var h = '<section class="card card-flat"><div class="row-between"><p class="small muted">' + esc(SP.t('grades.formula')) + '</p>' +
      '<div class="row">' + (SP.data.grades() ? '<button type="button" class="btn" id="cvFill">' + SP.icon('download') + '<span>' + esc(SP.t('grades.fromPlatonus')) + '</span></button>' : '') +
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

  function wire() {
    var $ = function (s) { return SP.$(s, root); };
    SP.$$('[data-tab]', root).forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); SP.store.set('sp-grades-tab', tab); render(); }; });
    SP.$$('[data-tab-go]', root).forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab-go'); SP.store.set('sp-grades-tab', tab); render(); }; });
    SP.$$('[data-term]', root).forEach(function (b) { b.onclick = function () { termIdx = +b.getAttribute('data-term'); render(); }; });
    [$('#grImport'), $('#grImport2')].forEach(function (b) { if (b) b.onclick = importFlow; });
    [$('#grHelp')].forEach(function (b) { if (b) b.onclick = howTo; });
    var raw = $('#grRaw'); if (raw) raw.onclick = function () {
      var g = SP.data.grades();
      SP.modal({ title: SP.t('grades.raw'), size: 'lg', body: '<p class="small muted">' + esc(SP.t('grades.rawText')) + '</p><textarea class="textarea mono xsmall" rows="16" readonly>' + esc(JSON.stringify(g && g.journals, null, 2)) + '</textarea>',
        actions: [{ label: SP.t('common.download'), icon: 'download', close: false, onClick: function () { SP.downloadText(JSON.stringify(g, null, 2), 'platonus-journal.json', 'application/json'); return false; } }, { label: SP.t('common.close'), kind: 'primary' }] });
    };
    if (tab !== 'calc') return;
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
    var fill = $('#cvFill'); if (fill) fill.onclick = function () {
      var g = SP.data.grades(), js = g && g.journals || [], rows = js.length ? normalize(js[js.length - 1].data) : [], n = 0;
      rows.forEach(function (r) {
        var s = st.s.filter(function (x) { return SP.lc(x.name) === SP.lc(r.name); })[0];
        if (!s) { s = { name: r.name, mode: 'avg', grades: [], avg: '', rk1: '', rk2: '', exam: '' }; st.s.push(s); }
        if (r.metrics.current != null) { s.mode = 'avg'; s.avg = String(r.metrics.current); }
        if (r.metrics.rk1 != null) s.rk1 = String(r.metrics.rk1);
        if (r.metrics.rk2 != null) s.rk2 = String(r.metrics.rk2);
        if (r.metrics.exam != null) s.exam = String(r.metrics.exam);
        n++;
      });
      sv(); render(); SP.toast(n ? SP.t('grades.filled', { n: n }) : SP.t('grades.cantRead'), n ? 'success' : 'warning');
    };
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

  /* ---------- Импорт журнала из файла или вставленного текста ---------- */
  function extract(text) {
    text = String(text || '').trim();
    try { return JSON.parse(text); } catch (e) { /* не чистый JSON — ищем JSON внутри */ }
    var m = text.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) { /* не нашли */ } }
    return null;
  }
  function doImport(raw) {
    var parsed = extract(raw);
    if (!parsed) { SP.toast(SP.t('grades.importBad'), 'danger'); return false; }
    var r = SP.data.importGrades(parsed);
    if (!r.ok) { SP.toast(SP.t('grades.cantRead'), 'danger'); return false; }
    tab = 'journal'; termIdx = null; SP.store.set('sp-grades-tab', tab); render();
    SP.toast(SP.t('grades.imported', { n: r.terms }), 'success');
    return true;
  }
  function importFlow() {
    var m = SP.modal({
      title: SP.t('grades.import'), size: 'lg',
      body: '<div class="alert alert-info">' + SP.icon('info') + '<div class="alert-body"><span>' + esc(SP.t('grades.importIntro')) + '</span> <button type="button" class="link-btn" id="giHow">' + esc(SP.t('grades.howTo')) + '</button></div></div>' +
        '<div class="field"><label class="label" for="giFile">' + esc(SP.t('grades.importFile')) + '</label><input class="input" type="file" id="giFile" accept=".json,.txt,.html,.htm,application/json"></div>' +
        '<div class="field"><label class="label" for="giPaste">' + esc(SP.t('grades.importPaste')) + '</label><textarea class="textarea mono small" id="giPaste" rows="7" placeholder=\'{"journals":[ … ]}\'></textarea></div>',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('grades.importAdd'), kind: 'primary', icon: 'upload', onClick: function () {
        var txt = SP.$('#giPaste', m.el).value.trim();
        if (!txt) { SP.toast(SP.t('grades.importEmpty'), 'warning'); return false; }
        if (!doImport(txt)) return false;
      } }]
    });
    SP.$('#giHow', m.el).onclick = howTo;
    SP.$('#giFile', m.el).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) { if (doImport(t)) m.close(); });
    };
  }
  function howTo() {
    var cfg = window.SP_CONFIG || {};
    SP.modal({
      title: SP.t('grades.howTo'), size: 'lg',
      body: '<p>' + esc(SP.t('grades.how1')) + '</p>' +
        '<ol class="stack-sm"><li>' + esc(SP.t('grades.how2')) + '</li><li>' + esc(SP.t('grades.how3')) + '</li><li>' + esc(SP.t('grades.how4')) + '</li></ol>' +
        '<div class="alert alert-warning">' + SP.icon('shield-check') + '<div class="alert-body"><span>' + esc(SP.t('grades.howSafe')) + '</span></div></div>',
      actions: [
        { label: SP.t('grades.openPlatonus'), icon: 'external-link', close: false, onClick: function () { window.open(cfg.PLATONUS_JOURNAL_URL || cfg.PLATONUS_URL, '_blank', 'noopener'); return false; } },
        { label: SP.t('common.understood'), kind: 'primary' }
      ]
    });
  }

  SP.grades = { normalize: normalize, doImport: doImport, openImport: importFlow };
  SP.views.register('grades', {
    titleKey: 'nav.grades',
    mount: function (el) { root = el; render(); },
    show: render,
    refresh: render
  });
  SP.on('data', function () { if (root && SP.views.current() === 'grades') render(); });
})();

/* =====================================================================
   БАНК ВОПРОСОВ — общий для Тестера, Дизайнера и Плеера.
   files — загруженные файлы (до 10), dz — вопросы в редакторе,
   bad — вопросы с ошибками разметки, all — готовые к тесту вопросы.
   Ключи хранения совпадают со старым сайтом.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine;
  var MAX = 10;
  var st = { files: [], dz: [], bad: [], all: [], name: '' };

  /* восстановление */
  (function restore() {
    var m = SP.store.get('studyplay-files', null);
    if (m) { st.files = Array.isArray(m.files) ? m.files : []; st.bad = Array.isArray(m.bad) ? m.bad : []; }
    var b = SP.store.get('studyplay-bank', null);
    if (b && Array.isArray(b.all)) { st.all = b.all.map(E.normalizeQ); st.name = b.name || ''; }
    st.dz = st.all.map(function (q) { return JSON.parse(JSON.stringify(q)); });
    if (st.all.length && !st.files.length) { var id = SP.uid('f'); st.files = [{ id: id, name: st.name || 'Test', count: st.all.length, bad: 0 }]; st.dz.forEach(function (q) { q._f = id; }); }
    var d = SP.store.get('studyplay-draft', null);
    if (d && Array.isArray(d.dz) && (d.dz.length || !st.dz.length)) {
      st.dz = d.dz.map(function (q) {
        var r = Object.assign({}, q); r.type = r.type === 'keyboard' ? 'keyboard' : 'choice'; r.img = r.img || '';
        if (r.type === 'keyboard') { r.opts = []; r.answer = r.answer || ''; } else r.opts = (r.opts || []).map(function (o) { return { t: o.t || '', right: !!o.right, img: o.img || '' }; });
        return r;
      });
      sync(true);
    }
  })();

  var draftWarned = false;
  function sync(silent) {
    st.all = st.dz.filter(function (q) { return !E.problem(q); }).map(function (q) { var s = E.serializeQ(q); if (q._f) s._f = q._f; return s; });
    st.name = st.files.length ? st.files.map(function (f) { return f.name; }).join(', ') : (st.dz.length ? SP.t('designer.title') : '');
    SP.store.set('studyplay-bank', { name: st.name, all: st.all });
    SP.store.set('studyplay-files', { multi: true, files: st.files, bad: st.bad });
    if (!SP.store.set('studyplay-draft', { ts: Date.now(), dz: st.dz }) && !draftWarned) { draftWarned = true; SP.toast(SP.t('bank.draftFull'), 'warning'); }
    if (!silent) SP.emit('bank');
  }
  var syncLater = SP.debounce(function () { sync(); }, 500);

  SP.bank = {
    MAX: MAX,
    state: function () { return st; },
    all: function () { return st.all; },
    sync: sync, syncLater: syncLater,
    /* Загрузить файлы с тестами; возвращает отчёт для уведомления */
    ingest: function (list) {
      list = Array.prototype.slice.call(list || []);
      var res = [], errs = [], over = 0;
      return list.reduce(function (p, f) {
        return p.then(function () {
          return E.readFile(f).then(function (r) {
            if (!r.out.length && !r.bad.length) throw new Error(SP.t('tester.err.notFound'));
            res.push({ f: f, r: r });
          }).catch(function (e) { errs.push(f.name + ': ' + e.message); });
        });
      }, Promise.resolve()).then(function () {
        var room = MAX - st.files.length;
        if (res.length > room) { over = res.length - Math.max(0, room); res.splice(Math.max(0, room)); }
        var added = 0, badN = 0, noOpt = 0;
        res.forEach(function (x) {
          var id = SP.uid('f');
          x.r.out.forEach(function (q) { q._f = id; });
          st.files.push({ id: id, name: x.f.name, count: x.r.out.length, bad: x.r.bad.length });
          st.dz.push.apply(st.dz, x.r.out);
          x.r.bad.forEach(function (b) { st.bad.push(Object.assign({}, b, { f: id, name: x.f.name })); });
          added += x.r.out.length; badN += x.r.bad.length;
          noOpt += x.r.out.filter(function (q) { return !E.isKb(q) && !q.opts.length; }).length;
        });
        if (res.length) sync();
        return { ok: res.length > 0, added: added, files: res.length, bad: badN, noOpt: noOpt, over: over, errs: errs };
      });
    },
    report: function (r) {
      var parts = [];
      if (r.files) parts.push(SP.t('bank.loaded', { n: r.added, f: r.files }));
      if (r.bad) parts.push(SP.t('bank.withErrors', { n: r.bad }));
      if (r.noOpt) parts.push(SP.t('bank.noOptions', { n: r.noOpt }));
      if (r.over) parts.push(SP.t('bank.limit', { max: MAX, n: r.over }));
      r.errs.forEach(function (e) { parts.push(e); });
      if (parts.length) SP.toast(parts.join('\n'), r.errs.length && !r.files ? 'danger' : (r.bad || r.noOpt || r.over || r.errs.length) ? 'warning' : 'success', { ms: 7000 });
    },
    removeFile: function (id) {
      st.files = st.files.filter(function (f) { return f.id !== id; });
      st.dz = st.dz.filter(function (q) { return q._f !== id; });
      st.bad = st.bad.filter(function (b) { return b.f !== id; });
      sync();
    },
    addQuestions: function (list, bad) {
      if (st.dz.length === 1 && !String(st.dz[0].q).trim()) st.dz = [];
      st.dz = st.dz.concat(list.map(E.normalizeQ));
      (bad || []).forEach(function (b) { st.bad.push(Object.assign({}, b, { name: SP.t('designer.import') })); });
      sync();
    },
    clear: function () { st.files = []; st.dz = []; st.bad = []; sync(); },
    dropBad: function (i) { st.bad.splice(i, 1); st.files.forEach(function (f) { f.bad = st.bad.filter(function (x) { return x.f === f.id; }).length; }); sync(); }
  };
  window.addEventListener('beforeunload', function () { sync(true); });
})();

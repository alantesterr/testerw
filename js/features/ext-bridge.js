/* =====================================================================
   СВЯЗЬ С РАСШИРЕНИЕМ CHROME «тесты во время видео».
   Расширение (bridge.js) пишет «hello» — сайт отдаёт ему файлы из Тестера
   (каждый файл — свой «предмет» с галочкой в расширении) и список ошибок.
   Ответы, данные во время видео, приходят обратно («results») и пишутся
   в общую память ошибок (SP.mem) и в ошибки файлов Тестера.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, qid = E.qid;
  function has() { return document.documentElement.hasAttribute('data-sp-ext'); }
  function keyOf(f) { return 't:' + SP.bank.fileKey(f); }
  function files() {
    var st = SP.bank.state(), all = SP.bank.all();
    return st.files.map(function (f) {
      var seen = {}, qs = [];
      all.forEach(function (q) {
        if (q._f !== f.id && !(!q._f && st.files.length === 1)) return;
        var id = qid(q); if (seen[id]) return; seen[id] = 1;
        qs.push({ id: id, q: q.q, img: q.img || '', ex: q.ex || '', type: q.type, answer: q.answer || '', opts: (q.opts || []).map(function (o) { return { t: o.t, right: !!o.right, img: o.img || '' }; }), _q: q });
      });
      return { f: f, key: keyOf(f), qs: qs };
    });
  }
  function send() {
    if (!has()) return;
    var bank = {}, errs = {};
    files().forEach(function (x) {
      bank[x.key] = { name: x.f.name.replace(/\.[^.]+$/, ''), qs: x.qs.map(function (q) { var c = Object.assign({}, q); delete c._q; return c; }) };
      errs[x.key] = x.qs.filter(function (q) { return SP.mem.isBad(q.id) || (SP.tester.isErr && SP.tester.isErr(q._q)); }).map(function (q) { return q.id; });
    });
    window.postMessage({ from: 'sp-exam', type: 'bank', v: 'tester', bank: bank, errs: errs }, '*');
  }
  function results(list) {
    var map = {}, n = 0;
    files().forEach(function (x) { x.qs.forEach(function (q) { map[q.id] = q._q; }); });
    (list || []).forEach(function (r) {
      var q = r && map[r.qid]; if (!q) return;
      SP.mem.record(r.qid, !!r.ok);
      if (!r.ok && SP.tester.noteWrong) SP.tester.noteWrong(q, SP.t('ext.during'));
      n++;
    });
    window.postMessage({ from: 'sp-exam', type: 'results-ok', ids: (list || []).map(function (r) { return r.rid; }) }, '*');
    if (n) { SP.toast(SP.t('ext.got', { n: n }), 'success'); var v = SP.views.get('tester'); if (SP.views.current() === 'tester' && v.refresh) v.refresh(); }
    send();
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.from !== 'sp-ext') return;
    if (e.data.type === 'hello') send();
    if (e.data.type === 'results') results(e.data.results);
  });
  /* загрузил или убрал файл в Тестере — расширение сразу получает новый набор */
  var t = 0;
  SP.on('bank', function () { clearTimeout(t); t = setTimeout(send, 400); });
  SP.extBridge = { send: send, connected: has };
})();

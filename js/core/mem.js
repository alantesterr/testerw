/* =====================================================================
   ПАМЯТЬ ОШИБОК — общая для Тестера и Плеера (localStorage «sp-mem-v1»).
   Работает незаметно: человек просто отвечает, а ошибки сами
   возвращаются через время.

   • Ошибся → вопрос вернётся через 3–7 других вопросов (не сразу).
   • Ответил верно после ошибки → ещё раз через 10–20 вопросов.
   • Выучен, когда 2 раза подряд ответил верно.
   • Счётчик «t» — сколько ответов дано всего: по нему считается «через время».
   Вопрос узнаётся по SP.testEngine.qid (текст + варианты), поэтому один и
   тот же вопрос в Тестере и в Плеере — одна запись.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var KEY = 'sp-mem-v1', MAX = 6000;
  var st = SP.store.get(KEY, null);
  if (!st || typeof st !== 'object' || !st.q) st = { t: 0, q: {} };
  var rnd = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  function save() {
    var ids = Object.keys(st.q);
    if (ids.length > MAX) ids.sort(function (a, b) { return (st.q[a].at || 0) - (st.q[b].at || 0); }).slice(0, ids.length - MAX).forEach(function (id) { delete st.q[id]; });
    SP.store.set(KEY, st);
  }
  function rec(id) { return st.q[id] || null; }
  var M = {
    record: function (id, ok) {
      if (!id) return;
      st.t++;
      var r = st.q[id] || (st.q[id] = { c: 0, w: 0, n: 0, bad: false, due: 0 });
      r.n++; r.at = Date.now();
      if (ok) {
        r.c++;
        if (r.bad) { if (r.c >= 2) r.bad = false; else r.due = st.t + rnd(10, 20); }
      } else {
        r.c = 0; r.w++; r.bad = true; r.due = st.t + rnd(3, 7);
      }
      save();
    },
    tick: function () { return st.t; },
    seen: function (id) { return !!rec(id); },
    isBad: function (id) { var r = rec(id); return !!(r && r.bad); },
    isDue: function (id) { var r = rec(id); return !!(r && r.bad && r.due <= st.t); },
    due: function (id) { var r = rec(id); return r ? r.due : 0; },
    learned: function (id) { var r = rec(id); return !!(r && !r.bad && r.c >= 1); },
    /* Выбрать n вопросов из списка: ошибки, которым пора (до 40%), новые, потом остальные ошибки,
       и немного уже выученных — для закрепления. Порядок перемешан, чтобы повторы не бросались в глаза. */
    pick: function (list, n, idOf) {
      var items = list.map(function (q) { return { q: q, id: idOf(q) }; });
      var dueBad = items.filter(function (x) { return M.isDue(x.id); }).sort(function (a, b) { return M.due(a.id) - M.due(b.id); });
      var fresh = SP.shuffle(items.filter(function (x) { return !M.seen(x.id); }));
      var waitBad = items.filter(function (x) { return M.isBad(x.id) && !M.isDue(x.id); }).sort(function (a, b) { return M.due(a.id) - M.due(b.id); });
      var known = SP.shuffle(items.filter(function (x) { return M.seen(x.id) && !M.isBad(x.id); }));
      var out = [], used = {};
      var take = function (arr, k) { for (var i = 0; i < arr.length && k > 0 && out.length < n; i++) { if (used[arr[i].id]) continue; used[arr[i].id] = 1; out.push(arr[i].q); k--; } };
      take(dueBad, Math.ceil(n * 0.4));
      take(known, Math.floor(n / 10));
      take(fresh, n); take(waitBad, n); take(dueBad, n); take(known, n);
      return SP.shuffle(out);
    },
    reset: function () { st = { t: 0, q: {} }; save(); }
  };
  SP.mem = M;
})();

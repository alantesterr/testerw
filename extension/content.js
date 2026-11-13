/* StudyPlay — тесты во время видео.
   Работает на любом сайте (и во фреймах — там часто сидят плееры).
   Считает время, пока реально играет видео со звуком; когда набирается
   заданное время — ставит видео на паузу и показывает вопросы. */
(function () {
  'use strict';
  if (window.__spVideoQuiz) return; window.__spVideoQuiz = 1;
  var DEF = { on: true, every: 15, warn: 30, count: 3, subjects: ['phil', 'arch', 'cpp', 'ict'], mode: 'mix', skip: false, off: [], pausedUntil: 0 };
  var cfg = Object.assign({}, DEF), open = false, warned = false, acc = 0;

  function topHost() {
    try { var a = location.ancestorOrigins; if (a && a.length) return new URL(a[a.length - 1]).hostname; } catch (e) {}
    return location.hostname;
  }
  function siteOff() {
    var h = topHost().replace(/^www\./, '');
    return (cfg.off || []).some(function (s) { s = String(s).trim().replace(/^www\./, ''); return s && (h === s || h.slice(-s.length - 1) === '.' + s); });
  }
  function active() { return cfg.on && !(cfg.pausedUntil > Date.now()) && !siteOff(); }
  function load(cb) { chrome.storage.local.get(['cfg'], function (d) { cfg = Object.assign({}, DEF, d.cfg || {}); if (cb) cb(); }); }
  load();
  chrome.storage.onChanged.addListener(function (ch) { if (ch.cfg) load(); });
  /* кнопка «Проверить сейчас» в окошке расширения: тест в главном окне вкладки, видео во фреймах — на паузу */
  chrome.runtime.onMessage.addListener(function (m) {
    if (!m || m.type !== 'sp-quiz-now') return;
    if (window === window.top) startQuiz();
    else document.querySelectorAll('video').forEach(function (v) { v.pause(); });
  });

  function playingVideo() {
    var vs = document.querySelectorAll('video');
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i];
      if (!v.paused && !v.ended && v.readyState > 2 && !v.muted && v.volume > 0 && v.offsetWidth > 200 && v.offsetHeight > 100) return v;
    }
    return null;
  }

  /* каждую секунду: если видео играет — копим время; раз в 5 с пишем в общий счётчик */
  setInterval(function () {
    if (open || !active() || !chrome.runtime || !chrome.runtime.id) return;
    if (!playingVideo()) return;
    acc++;
    if (acc < 5) return;
    var add = acc; acc = 0;
    chrome.storage.local.get(['watched'], function (d) {
      var w = (d.watched || 0) + add, need = Math.max(1, cfg.every) * 60;
      chrome.storage.local.set({ watched: w });
      if (w >= need) startQuiz();
      else if (!warned && cfg.warn > 0 && w >= need - cfg.warn) { warned = true; warn(Math.round(need - w)); }
    });
  }, 1000);

  /* ---------- Оверлей (Shadow DOM, чтобы стили сайта не мешали) ---------- */
  var CSS = ':host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.bg{position:fixed;inset:0;z-index:2147483647;background:rgba(8,10,14,.82);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.box{background:#161a21;color:#e8ebf0;border:1px solid #2a303b;border-radius:18px;width:min(640px,100%);max-height:92vh;overflow:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.h{display:flex;justify-content:space-between;gap:8px;color:#9aa3b2;font-size:13px;margin-bottom:10px}' +
    '.q{font-size:17px;font-weight:600;line-height:1.45;margin-bottom:14px;white-space:pre-wrap;word-break:break-word}' +
    '.o{display:flex;gap:10px;width:100%;text-align:left;padding:11px 13px;margin:0 0 8px;border-radius:12px;border:1.5px solid #2a303b;background:#1d222b;color:#e8ebf0;font-size:15px;cursor:pointer;white-space:pre-wrap;word-break:break-word}' +
    '.o:hover{border-color:#6d8bff}.o b{flex:none;width:22px;height:22px;border-radius:6px;background:#11151b;display:grid;place-items:center;font-size:12px}' +
    '.o.r{border-color:#2fb36b;background:#142a1d;color:#6fd28f}.o.w{border-color:#e5484d;background:#2e1416;color:#ff8b8e}.o.s{border-color:#6d8bff}' +
    '.v{padding:10px 12px;border-radius:12px;font-weight:600;margin-top:6px}.v.ok{background:#142a1d;color:#6fd28f}.v.bad{background:#2e1416;color:#ff8b8e}' +
    '.ex{margin-top:8px;padding:10px 12px;border-radius:12px;background:#1d222b;color:#c9d0db;font-size:14px;white-space:pre-wrap}' +
    '.nav{display:flex;gap:8px;margin-top:14px;justify-content:flex-end}.btn{padding:10px 16px;border-radius:10px;border:1px solid #2a303b;background:#1d222b;color:#e8ebf0;font-size:14px;cursor:pointer}' +
    '.btn.p{background:#3b6cf6;border-color:#3b6cf6;color:#fff}.btn:disabled{opacity:.5;cursor:default}' +
    'pre{background:#0f1217;border:1px solid #2a303b;border-radius:10px;padding:10px;overflow:auto;font:13px/1.45 Consolas,monospace;white-space:pre;margin:8px 0}' +
    'code{font-family:Consolas,monospace;background:#0f1217;padding:1px 5px;border-radius:5px}img{max-width:100%;border-radius:8px;background:#fff;display:block;margin-top:8px}' +
    '.big{font-size:40px;font-weight:800;text-align:center;margin:8px 0}.c{text-align:center}.t{position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#161a21;color:#e8ebf0;border:1px solid #2a303b;border-radius:12px;padding:12px 16px;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.4)}' +
    'input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid #2a303b;background:#0f1217;color:#e8ebf0;font-size:15px}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rich(t) {
    return String(t || '').split(/```[\w+#-]*\n?([\s\S]*?)```/).map(function (p, i) {
      return i % 2 ? '<pre>' + esc(p.replace(/\n$/, '')) + '</pre>' : esc(p).replace(/`([^`\n]+)`/g, '<code>$1</code>');
    }).join('');
  }
  function im(src) { return src ? '<img src="' + esc(src) + '">' : ''; }
  function mount() {
    var host = document.createElement('div'), root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = '<style>' + CSS + '</style>';
    var fs = document.fullscreenElement;
    if (fs && fs.tagName === 'VIDEO') { try { document.exitFullscreen(); } catch (e) {} fs = null; }
    (fs || document.documentElement).appendChild(host);
    return { host: host, root: root };
  }
  function warn(sec) {
    var m = mount(), d = document.createElement('div'); d.className = 't';
    d.textContent = '📚 StudyPlay: через ' + sec + ' сек — вопросы';
    m.root.appendChild(d); setTimeout(function () { m.host.remove(); }, 6000);
  }

  /* ---------- Подбор вопросов ---------- */
  function pick(d, n) {
    var bank = d.bank || {}, errs = d.errs || {}, pool = [], errPool = [];
    (cfg.subjects || []).forEach(function (id) {
      var b = bank[id]; if (!b) return; var e = {}; (errs[id] || []).forEach(function (q) { e[q] = 1; });
      b.qs.forEach(function (q) { var x = { s: id, name: b.name, q: q }; pool.push(x); if (e[q.id]) errPool.push(x); });
    });
    function rnd(a, k) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a.slice(0, k); }
    if (cfg.mode === 'errors' && errPool.length) return rnd(errPool, n);
    if (cfg.mode === 'mix' && errPool.length) { var half = Math.ceil(n / 2), a = rnd(errPool, half), ids = a.map(function (x) { return x.q.id; }); return a.concat(rnd(pool.filter(function (x) { return ids.indexOf(x.q.id) < 0; }), n - a.length)); }
    return rnd(pool, n);
  }

  function startQuiz() {
    if (open) return; open = true;
    chrome.storage.local.get(['bank', 'errs'], function (d) {
      var list = pick(d, Math.max(1, cfg.count | 0));
      var paused = [];
      document.querySelectorAll('video').forEach(function (v) { if (!v.paused) { v.pause(); paused.push(v); } });
      var m = mount(), bg = document.createElement('div'); bg.className = 'bg'; m.root.appendChild(bg);
      /* сайт не должен ловить клавиши, пока открыт тест */
      var stopKeys = function (e) { e.stopPropagation(); }; ['keydown', 'keyup', 'keypress'].forEach(function (t) { bg.addEventListener(t, stopKeys); });
      var keepPaused = setInterval(function () { paused.forEach(function (v) { if (!v.paused) v.pause(); }); }, 400);
      function close() {
        clearInterval(keepPaused); m.host.remove(); open = false; warned = false;
        chrome.storage.local.set({ watched: 0 });
        paused.forEach(function (v) { try { v.play(); } catch (e) {} });
      }
      if (!list.length) {
        bg.innerHTML = '<div class="box c"><p class="q">📚 StudyPlay</p><p>Вопросов пока нет. Открой сайт «Экзамен» (StudyPlay → Папки → Экзамен) — вопросы загрузятся в расширение сами.</p><div class="nav" style="justify-content:center"><button class="btn p">Продолжить просмотр</button></div></div>';
        bg.querySelector('.btn').onclick = close; return;
      }
      var i = 0, right = 0;
      function step() {
        if (i >= list.length) {
          bg.innerHTML = '<div class="box c"><div class="h"><span>📚 StudyPlay</span></div><div class="big">' + right + ' / ' + list.length + '</div><p>' + (right === list.length ? 'Отлично! Все ответы верные.' : 'Ошибки сохранены — разберёшь их в «Экзамене».') + '</p><div class="nav" style="justify-content:center"><button class="btn p">▶ Продолжить просмотр</button></div></div>';
          var b = bg.querySelector('.btn'); b.onclick = close; b.focus(); return;
        }
        var x = list[i], q = x.q, kb = q.type === 'keyboard', multi = !kb && q.opts.filter(function (o) { return o.right; }).length > 1, done = false, sel = [];
        var order = q.opts.map(function (o, k) { return k; }).sort(function () { return Math.random() - 0.5; });
        bg.innerHTML = '<div class="box"><div class="h"><span>📚 ' + esc(x.name) + '</span><span>' + (i + 1) + ' из ' + list.length + '</span></div><div class="q">' + rich(q.q) + im(q.img) + '</div>' +
          (kb ? '<input placeholder="Введи ответ">' : order.map(function (k, n) { var o = q.opts[k]; return '<button class="o" data-k="' + k + '"><b>' + (n + 1) + '</b><span>' + rich(o.t) + im(o.img) + '</span></button>'; }).join('')) +
          '<div class="res"></div><div class="nav">' + (cfg.skip ? '<button class="btn sk">Пропустить</button>' : '') + ((kb || multi) ? '<button class="btn p ck">Проверить</button>' : '') + '<button class="btn p nx" style="display:none">Дальше →</button></div></div>';
        var btns = bg.querySelectorAll('.o'), nx = bg.querySelector('.nx'), ck = bg.querySelector('.ck'), inp = bg.querySelector('input');
        function finish(ok) {
          if (done) return; done = true; if (ok) right++;
          btns.forEach(function (b) { var k = +b.getAttribute('data-k'); b.disabled = true; if (q.opts[k].right) b.classList.add('r'); else if (sel.indexOf(k) >= 0) b.classList.add('w'); });
          bg.querySelector('.res').innerHTML = '<div class="v ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ Верно' : '✗ Ошибка' + (kb ? ': правильно — ' + esc(q.answer) : '')) + '</div>' + (q.ex ? '<div class="ex">' + rich(q.ex) + '</div>' : '');
          if (ck) ck.style.display = 'none'; nx.style.display = ''; nx.focus();
          save(x.s, q.id, ok);
        }
        function check() {
          if (kb) return finish(String(inp.value).trim().toLowerCase().replace(/\s+/g, ' ') === String(q.answer).trim().toLowerCase().replace(/\s+/g, ' '));
          if (!sel.length) return;
          var r = q.opts.map(function (o, k) { return o.right ? k : -1; }).filter(function (k) { return k >= 0; });
          finish(sel.length === r.length && sel.every(function (k) { return r.indexOf(k) >= 0; }));
        }
        btns.forEach(function (b) {
          b.onclick = function () {
            if (done) return; var k = +b.getAttribute('data-k');
            if (multi) { var j = sel.indexOf(k); if (j >= 0) sel.splice(j, 1); else sel.push(k); b.classList.toggle('s', j < 0); return; }
            sel = [k]; check();
          };
        });
        if (ck) ck.onclick = check;
        nx.onclick = function () { i++; step(); };
        var sk = bg.querySelector('.sk'); if (sk) sk.onclick = function () { i++; step(); };
        if (inp) { setTimeout(function () { inp.focus(); }, 50); inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!done) check(); else nx.click(); } }; }
        bg.onkeydown = function (e) {
          var n = parseInt(e.key, 10);
          if (!done && n >= 1 && n <= btns.length) btns[n - 1].click();
          else if (e.key === 'Enter' && done) { e.preventDefault(); nx.click(); }
        };
        bg.tabIndex = -1; if (!inp) bg.focus();
      }
      step();
    });
  }

  /* ответ: в очередь для сайта + локально обновляем список ошибок */
  function save(subj, qid, ok) {
    chrome.storage.local.get(['pending', 'errs', 'streak', 'stats'], function (d) {
      var p = d.pending || [], errs = d.errs || {}, st = d.streak || {}, stats = d.stats || { r: 0, w: 0 };
      p.push({ rid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), subj: subj, qid: qid, ok: ok });
      var e = errs[subj] || (errs[subj] = []), key = subj + '|' + qid, at = e.indexOf(qid);
      if (ok) { stats.r++; if (at >= 0) { st[key] = (st[key] || 0) + 1; if (st[key] >= 2) { e.splice(at, 1); delete st[key]; } } }
      else { stats.w++; if (at < 0) e.push(qid); st[key] = 0; }
      chrome.storage.local.set({ pending: p.slice(-2000), errs: errs, streak: st, stats: stats });
    });
  }
})();

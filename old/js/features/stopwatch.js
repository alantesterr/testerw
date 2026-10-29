/* =====================================================================
   ПЛАВАЮЩИЙ СЕКУНДОМЕР (включается в Настройках → Инструменты).
   Время сохраняется, даже если закрыть вкладку.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var KEY = 'studyplay-stopwatch-v1';
  var st = Object.assign({ acc: 0, startedAt: null, min: false }, SP.store.get(KEY, {}) || {});
  var el = null, timer = 0;
  var elapsed = function () { return st.acc + (st.startedAt ? Date.now() - st.startedAt : 0); };
  var fmt = function (ms) { var t = Math.floor(ms / 1000); return SP.pad2(t / 3600) + ':' + SP.pad2((t % 3600) / 60) + ':' + SP.pad2(t % 60); };
  function persist() { SP.store.set(KEY, st); }

  function paint() {
    if (!el) return;
    var run = !!st.startedAt;
    el.querySelector('.sw-time').textContent = fmt(elapsed());
    var p = el.querySelector('[data-sw=play]');
    p.innerHTML = SP.icon(run ? 'pause' : 'play'); p.setAttribute('aria-label', SP.t(run ? 'stopwatch.pause' : 'stopwatch.start'));
    el.querySelector('[data-sw=reset]').disabled = !run && elapsed() === 0;
    el.classList.toggle('run', run); el.classList.toggle('min', st.min);
  }
  function mount() {
    if (el) return;
    /* кнопка «скрыть / раскрыть» — справа, у края экрана: при раскрытии она остаётся на месте,
       а «обнулить» и «пауза» появляются слева — двойной клик не попадёт в «обнулить» */
    el = SP.el('<div class="stopwatch" role="timer" aria-live="off">' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-sw="reset">' + SP.icon('rotate-ccw') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-sw="play"></button>' +
      '<span class="sw-time mono">00:00:00</span>' +
      '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-sw="min">' + SP.icon('timer') + '</button></div>');
    document.body.appendChild(el);
    el.querySelector('[data-sw=min]').setAttribute('aria-label', SP.t('stopwatch.toggle'));
    el.querySelector('[data-sw=reset]').setAttribute('aria-label', SP.t('stopwatch.reset'));
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sw]'); if (!b) return;
      var a = b.getAttribute('data-sw');
      if (a !== 'min' && Date.now() - (el._opened || 0) < 500) return; // клик сразу после раскрытия — случайный
      if (a === 'min' && st.min) el._opened = Date.now();
      if (a === 'play') { if (st.startedAt) { st.acc += Date.now() - st.startedAt; st.startedAt = null; } else st.startedAt = Date.now(); }
      if (a === 'reset') { st.acc = 0; st.startedAt = null; }
      if (a === 'min') st.min = !st.min;
      persist(); paint();
    });
    timer = setInterval(paint, 500); paint();
  }
  function unmount() { if (!el) return; clearInterval(timer); el.remove(); el = null; }
  function sync() { if (SP.settings.get('stopwatch')) mount(); else unmount(); }
  SP.on('settings', function (e) { if (e.key === 'stopwatch') sync(); });
  SP.on('lang', function () { if (el) { unmount(); mount(); } });
  SP.stopwatch = { sync: sync };
})();

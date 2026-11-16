/* =====================================================================
   ПЕРЕТАСКИВАНИЕ СПИСКОВ (как в «Оценках»):
   на ПК — зажать мышью и тащить, на телефоне — подержать палец ~0,4 с
   (лёгкая вибрация) и тащить. Используют «Папки» и «Разработчик».

   SP.dragSort(box, {
     item:   '.list-row[data-dk]'   что можно тащить (меняется местами с соседями в том же родителе),
     key:    'data-dk'              атрибут с id элемента,
     skip:   'button.btn, a'        где тащить не начинаем (мелкие кнопки),
     same:   function (a, b)        можно ли ставить a рядом с b (например, оба закреплены),
     target: '.sj-item[data-sub]'   куда ещё можно бросить, в любом месте страницы (например, другая папка),
     onSort: function (ids, list)   новый порядок,
     onDrop: function (target, el)  бросили на target
   })
   Обработчики вешаются на box один раз; при перерисовке достаточно вызвать снова
   (параметры обновятся).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, drag = null, timer = 0, block = false;

  function begin() {
    drag.on = true; drag.el.classList.add('dg-dragging'); drag.list.classList.add('dg-sorting');
    document.documentElement.classList.add('dg-active');
    try { window.getSelection().removeAllRanges(); } catch (e) { /* нечего снимать */ }
    if (drag.touch && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* без вибрации */ } }
  }
  function setTarget(t) {
    if (drag.tg === t) return;
    if (drag.tg) drag.tg.classList.remove('dg-over');
    drag.tg = t; if (t) t.classList.add('dg-over');
    drag.el.classList.toggle('dg-away', !!t);
  }
  function hover(x, y) {
    var o = drag.o, el = document.elementFromPoint(x, y); if (!el) return;
    var tg = o.target ? el.closest(o.target) : null;
    setTarget(tg && !tg.contains(drag.el) && !drag.el.contains(tg) ? tg : null);
    if (drag.tg) return;
    var over = el.closest(o.item);
    if (!over || over === drag.el || over.parentNode !== drag.list) return;
    if (o.same && !o.same(drag.el, over)) return;
    var r = over.getBoundingClientRect(), cy = r.top + r.height / 2;
    var after = y > cy || (Math.abs(y - cy) < r.height / 4 && x > r.left + r.width / 2 && r.width < drag.list.clientWidth * 0.7);
    drag.list.insertBefore(drag.el, after ? over.nextSibling : over);
  }
  /* у края экрана — плавно прокручиваем страницу */
  function edgeScroll(y) { var e = 70; if (y < e) window.scrollBy(0, -12); else if (y > innerHeight - e) window.scrollBy(0, 12); }
  function finish(undo) {
    clearTimeout(timer);
    var d = drag; drag = null;
    if (!d || !d.on) return;
    d.el.classList.remove('dg-dragging', 'dg-away'); d.list.classList.remove('dg-sorting');
    document.documentElement.classList.remove('dg-active');
    block = true; setTimeout(function () { block = false; }, 0);
    if (d.tg) d.tg.classList.remove('dg-over');
    if (undo || d.tg) d.list.insertBefore(d.el, d.next);
    if (undo) return;
    if (d.tg) { if (d.o.onDrop) d.o.onDrop(d.tg, d.el); return; }
    var ids = SP.$$(d.o.item, d.list).filter(function (x) { return x.parentNode === d.list; }).map(function (x) { return x.getAttribute(d.o.key || 'data-dk'); });
    if (ids.join('\n') !== d.before && d.o.onSort) d.o.onSort(ids, d.list);
  }
  function cancel() { if (drag && drag.on) finish(false); else { clearTimeout(timer); drag = null; } }

  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y, far = Math.abs(dx) + Math.abs(dy) > 8;
    if (!drag.on) {
      if (!far) return;
      if (drag.touch) { clearTimeout(timer); drag = null; return; }   // палец сдвинулся раньше — это прокрутка
      begin();
    }
    e.preventDefault(); hover(e.clientX, e.clientY); edgeScroll(e.clientY);
  });
  window.addEventListener('pointerup', function () { finish(false); });
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drag && drag.on) finish(true); });

  SP.dragSort = function (box, o) {
    if (!box) return;
    box._dg = o;
    if (box._dgWired) return;
    box._dgWired = true;
    box.addEventListener('pointerdown', function (e) {
      var opt = box._dg; if (!opt || opt.off || e.button !== 0) return;
      var el = e.target.closest(opt.item); if (!el || !box.contains(el)) return;
      if (opt.skip && e.target.closest(opt.skip)) return;
      if (e.target.closest('input, textarea, select')) return;
      var list = el.parentNode;
      drag = { box: box, o: opt, el: el, list: list, next: el.nextSibling, x: e.clientX, y: e.clientY, on: false, tg: null, touch: e.pointerType !== 'mouse',
        before: SP.$$(opt.item, list).filter(function (x) { return x.parentNode === list; }).map(function (x) { return x.getAttribute(opt.key || 'data-dk'); }).join('\n') };
      if (drag.touch) timer = setTimeout(function () { if (drag && !drag.on) begin(); }, 400);
    });
    /* пока тащим пальцем — страница не прокручивается; у ссылок нет «родного» перетаскивания */
    box.addEventListener('touchmove', function (e) { if (drag && drag.on) e.preventDefault(); }, { passive: false });
    box.addEventListener('contextmenu', function (e) { if (drag) e.preventDefault(); });
    box.addEventListener('dragstart', function (e) { if (e.target.closest && box._dg && e.target.closest(box._dg.item)) e.preventDefault(); });
    /* после перетаскивания не открывать файл случайным кликом */
    box.addEventListener('click', function (e) { if (block) { e.stopPropagation(); e.preventDefault(); } }, true);
  };
})();

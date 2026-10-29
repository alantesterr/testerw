/* =====================================================================
   Общие элементы интерфейса:
   SP.toast(текст, вид)      — всплывающее сообщение (info|success|warning|danger)
   SP.modal({...})           — модальное окно
   SP.confirm({...})         — окно «Вы уверены?» → Promise<true|false>
   SP.menu(кнопка, пункты)   — выпадающее меню
   SP.busy(кнопка, true)     — кнопка в состоянии «загрузка»
   Подсказки: любой элемент с data-tip показывает подсказку при наведении.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var ICONS = { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-x' };

  /* ---------------- Всплывающие сообщения ---------------- */
  function region() {
    var r = document.getElementById('toastRegion');
    if (!r) { r = SP.el('<div class="toast-region" id="toastRegion" role="status" aria-live="polite"></div>'); document.body.appendChild(r); }
    return r;
  }
  SP.toast = function (msg, kind, opts) {
    kind = kind || 'info'; opts = opts || {};
    var el = SP.el('<div class="toast ' + kind + '">' + SP.icon(ICONS[kind] || 'info') +
      '<div class="toast-body"></div><button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="' + SP.esc(SP.t('common.close')) + '">' + SP.icon('x') + '</button></div>');
    var body = el.querySelector('.toast-body');
    if (opts.html) body.innerHTML = msg; else body.textContent = msg;
    var close = function () { el.classList.add('leaving'); setTimeout(function () { el.remove(); }, 220); };
    el.querySelector('button').onclick = close;
    region().appendChild(el);
    var list = region().children; if (list.length > 4) list[0].remove();
    setTimeout(close, opts.ms || (kind === 'danger' ? 8000 : 4500));
    return { close: close };
  };

  /* ---------------- Модальные окна ---------------- */
  var openModals = [];
  SP.modal = function (o) {
    o = o || {};
    var last = document.activeElement;
    var back = SP.el('<div class="modal-backdrop"><div class="modal ' + (o.size ? 'modal-' + o.size : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h2></h2><button type="button" class="btn btn-ghost btn-icon" data-close aria-label="' + SP.esc(SP.t('common.close')) + '">' + SP.icon('x') + '</button></div>' +
      '<div class="modal-body"></div>' + '<div class="modal-foot"></div></div></div>');
    var dlg = back.firstElementChild, body = back.querySelector('.modal-body'), foot = back.querySelector('.modal-foot');
    back.querySelector('h2').textContent = o.title || '';
    var titleId = SP.uid('mt-'); back.querySelector('h2').id = titleId; dlg.setAttribute('aria-labelledby', titleId);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    if (o.bodyClass) body.classList.add(o.bodyClass);
    var api = {
      el: back, body: body, foot: foot,
      close: function (val) {
        if (!back.isConnected) return;
        back.remove(); openModals = openModals.filter(function (m) { return m !== api; });
        if (!openModals.length) document.documentElement.classList.remove('modal-open');
        document.removeEventListener('keydown', onKey, true);
        if (last && last.focus) try { last.focus(); } catch (e) { /* ничего */ }
        if (o.onClose) o.onClose(val);
      }
    };
    (o.actions || []).forEach(function (a) {
      var b = SP.el('<button type="button" class="btn ' + (a.kind ? 'btn-' + a.kind : '') + '"></button>');
      b.innerHTML = (a.icon ? SP.icon(a.icon) : '') + '<span></span>'; b.querySelector('span').textContent = a.label;
      b.onclick = function () { var r = a.onClick ? a.onClick(api, b) : undefined; if (r !== false && a.close !== false) api.close(a.value); };
      foot.appendChild(b);
    });
    if (!foot.children.length) foot.remove();
    back.addEventListener('mousedown', function (e) { if (e.target === back && o.dismissible !== false) api.close(); });
    back.querySelector('[data-close]').onclick = function () { api.close(); };
    function onKey(e) {
      if (openModals[openModals.length - 1] !== api) return;
      if (e.key === 'Escape' && o.dismissible !== false) { e.stopPropagation(); api.close(); }
      if (e.key === 'Tab') trap(e, dlg);
    }
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(back); openModals.push(api);
    document.documentElement.classList.add('modal-open'); /* фон под окном не листается */
    SP.applyI18n(back);
    setTimeout(function () {
      var f = dlg.querySelector('[autofocus]') || dlg.querySelector('.modal-body input, .modal-body textarea, .modal-body select') || foot.querySelector('.btn-primary') || dlg.querySelector('[data-close]');
      if (f) f.focus();
    }, 30);
    return api;
  };
  function trap(e, root) {
    var f = SP.$$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }

  SP.confirm = function (o) {
    return new Promise(function (res) {
      var done = false;
      SP.modal({
        title: o.title || SP.t('common.confirm'),
        body: '<p>' + SP.esc(o.text || '') + '</p>',
        actions: [
          { label: o.cancelLabel || SP.t('common.cancel'), onClick: function () { done = true; res(false); } },
          { label: o.okLabel || SP.t('common.ok'), kind: o.danger ? 'danger' : 'primary', icon: o.icon, onClick: function () { done = true; res(true); } }
        ],
        onClose: function () { if (!done) res(false); }
      });
    });
  };

  /* ---------------- Выпадающее меню ---------------- */
  var curMenu = null;
  SP.closeMenu = function () { if (curMenu) { curMenu.remove(); curMenu = null; } };
  SP.menu = function (anchor, items) {
    SP.closeMenu();
    var m = SP.el('<div class="menu-pop" role="menu"></div>');
    items.forEach(function (it) {
      if (it === '-') { m.appendChild(document.createElement('hr')); return; }
      var b = SP.el('<button type="button" role="menuitem" class="' + (it.danger ? 'danger' : '') + '">' + (it.icon ? SP.icon(it.icon) : '') + '<span></span></button>');
      b.querySelector('span').textContent = it.label;
      if (it.disabled) b.disabled = true;
      b.onclick = function (e) { e.stopPropagation(); SP.closeMenu(); if (it.onClick) it.onClick(); };
      m.appendChild(b);
    });
    document.body.appendChild(m); curMenu = m;
    var r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    var y = r.bottom + 4; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
    m.style.top = y + 'px';
    var first = m.querySelector('button:not([disabled])'); if (first) first.focus();
    m.addEventListener('keydown', function (e) {
      var bs = SP.$$('button:not([disabled])', m), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
      if (e.key === 'Escape') { SP.closeMenu(); anchor.focus(); }
    });
    return m;
  };
  document.addEventListener('mousedown', function (e) { if (curMenu && !curMenu.contains(e.target)) SP.closeMenu(); });
  window.addEventListener('resize', SP.closeMenu);
  window.addEventListener('scroll', function () { SP.closeMenu(); }, { passive: true, capture: true });

  /* ---------------- Кнопка «загрузка» ---------------- */
  SP.busy = function (btn, on) {
    if (!btn) return;
    if (on) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
    else { btn.removeAttribute('aria-busy'); btn.disabled = false; }
  };

  /* ---------------- Подсказки при наведении ---------------- */
  var tip = null, tipFor = null, tipT = 0;
  function showTip(el) {
    var text = el.getAttribute('data-tip'); if (!text) return;
    if (el.hasAttribute('data-tip-collapsed') && document.documentElement.getAttribute('data-sidebar') !== 'collapsed') return;
    if (!tip) { tip = SP.el('<div class="tooltip" role="tooltip"></div>'); document.body.appendChild(tip); }
    tip.textContent = text; tipFor = el;
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, x, y;
    if (el.hasAttribute('data-tip-right')) { x = r.right + 10; y = r.top + r.height / 2 - h / 2; }
    else { x = r.left + r.width / 2 - w / 2; y = r.bottom + 8; if (y + h > innerHeight - 8) y = r.top - h - 8; }
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
    tip.classList.add('show');
  }
  function hideTip() { clearTimeout(tipT); if (tip) tip.classList.remove('show'); tipFor = null; }
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (!el || el === tipFor) return;
    hideTip(); tipT = setTimeout(function () { showTip(el); }, 250);
  });
  document.addEventListener('mouseout', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) hideTip();
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el && el.matches(':focus-visible')) showTip(el); else hideTip();
  });
  document.addEventListener('mousedown', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true, capture: true });

  /* Кнопка с иконкой и подписью */
  SP.btn = function (o) {
    var cls = 'btn' + (o.kind ? ' btn-' + o.kind : '') + (o.size ? ' btn-' + o.size : '') + (o.iconOnly ? ' btn-icon' : '') + (o.cls ? ' ' + o.cls : '');
    var attrs = (o.id ? ' id="' + o.id + '"' : '') + (o.attrs || '') + (o.disabled ? ' disabled' : '');
    if (o.iconOnly) attrs += ' aria-label="' + SP.esc(o.label) + '" data-tip="' + SP.esc(o.label) + '"';
    return '<button type="button" class="' + cls + '"' + attrs + '>' + (o.icon ? SP.icon(o.icon) : '') + (o.iconOnly ? '' : '<span>' + SP.esc(o.label) + '</span>') + '</button>';
  };
})();

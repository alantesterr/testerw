/* =====================================================================
   РАЗДЕЛ «ДОМАШКА» (#/homework, #/homework/<предмет>): список домашних заданий.
   Сверху переключатель «Домашка · Оценки» (Оценки убраны из меню, чтобы оно
   влезало на телефон). Строка «Добавить задание…» + маленькие кнопки
   «Предмет» и «Срок». Предмет подставляется сам — пара, которая идёт сейчас
   или только что закончилась; срок — «К следующей паре» этого предмета.
   • Своё задание — только у тебя (localStorage sp-hw).
   • «Группе» — видит вся группа: файл data/<группа>/homework.json.
     Писать туда может только разработчик (есть ключ GitHub, см. «Разработчик»);
     остальные этой кнопки не видят.
   Нажал на кружок — сделано: задание зачёркивается и уходит вниз в «Сделано»
   (10 секунд можно отменить). Нажал на текст — окно: изменить, удалить, папка.
   Отметки «сделано» у заданий группы — свои у каждого (sp-hw-done), «убрать
   сделанное» прячет их (sp-hw-hide). Число просроченных и на сегодня-завтра —
   кружок у «Домашки» в меню. В папке предмета сверху — его несделанная домашка.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, esc = SP.esc;
  var KEY = 'sp-hw', DONE = 'sp-hw-done', HIDE = 'sp-hw-hide', GKEY = 'sp-hw-group';
  var root = null, gBusy = false, filter = '';
  /* фото к заданиям: сами снимки — в IndexedDB sp-hw-photos (только на этом устройстве),
     какие фото у какого задания — sp-hw-ph { id задания: [id фото] } (и для своих, и для заданий группы) */
  var PH = 'sp-hw-ph', db = SP.idb('sp-hw-photos'), phUrl = {}, pend = [];
  /* subject / due: null — «как сайт подскажет», '' — «без предмета / без срока» */
  var form = { text: '', subject: null, due: null, group: false };

  /* ---------- Данные ---------- */
  function mine() { var x = SP.store.get(KEY, null); return x && Array.isArray(x.items) ? x : { items: [] }; }
  function saveMine(x) { SP.store.set(KEY, x); badge(); }
  function doneMap() { return SP.store.get(DONE, {}) || {}; }
  function hideMap() { return SP.store.get(HIDE, {}) || {}; }
  function gdir() { return window.SP_GROUP_DIR || ''; }
  function group() { var x = SP.store.get(GKEY + ':' + gdir(), null); return x && Array.isArray(x.items) ? x : { items: [] }; }
  function isDev() { return !!(SP.devCore && SP.devCore.hasKey() && gdir()); }
  /* задания группы — из data/<группа>/homework.json (без интернета — последняя сохранённая копия) */
  function loadGroup() {
    var d = gdir(); if (!d || location.protocol === 'file:') return Promise.resolve();
    return fetch('data/' + d + '/homework.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : r.status === 404 ? { items: [] } : null; })
      .then(function (j) {
        if (!j || !Array.isArray(j.items)) return;
        var old = group();
        /* только что опубликовал сам, а GitHub Pages ещё не обновился — не откатываем список назад */
        if (old.pending && Date.now() - old.pending < 5 * 60000 && String(j.version || '') < String(old.version || '')) return;
        SP.store.set(GKEY + ':' + d, { version: j.version || '', items: j.items });
        badge();
      }).catch(function () { /* без интернета — то, что было */ });
  }
  function all() {
    var dm = doneMap(), hm = hideMap();
    var a = mine().items.map(function (x) { return Object.assign({ own: true }, x); });
    var g = group().items.filter(function (x) { return !hm[x.id]; }).map(function (x) { return Object.assign({ grp: true, done: dm[x.id] || 0 }, x); });
    return g.concat(a);
  }
  /* ---------- Фото ---------- */
  function phMap() { return SP.store.get(PH, {}) || {}; }
  function photosOf(id) { return phMap()[id] || []; }
  function setPhotos(id, list) { var m = phMap(); if (list.length) m[id] = list; else delete m[id]; SP.store.set(PH, m); }
  function dropPhotos(list) { (list || []).forEach(function (p) { db.del(p).catch(function () { }); if (phUrl[p]) { URL.revokeObjectURL(phUrl[p]); delete phUrl[p]; } }); }
  /* фото уменьшаем до 1600 px по длинной стороне (JPEG) — ~200–400 КБ вместо 3–5 МБ, текст на доске читается */
  function shrink(file) {
    return new Promise(function (ok, no) {
      var u = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { if (b) ok(b); else no(new Error(SP.t('hw.photoBad'))); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(u); no(new Error(SP.t('hw.photoBad'))); };
      img.src = u;
    });
  }
  /* выбрать фото: на телефоне — «Снять фото» или «Галерея» (решает телефон); не больше 6 за раз */
  function pickPhotos() {
    return new Promise(function (ok) {
      var inp = SP.el('<input type="file" accept="image/*" multiple hidden>'); document.body.appendChild(inp);
      inp.onchange = function () {
        var files = Array.prototype.slice.call(inp.files || [], 0, 6); inp.remove();
        if (!files.length) return ok([]);
        SP.toast(SP.t('hw.photoSaving'), 'info', { ms: 2000 });
        Promise.all(files.map(function (f) { return shrink(f).then(function (b) { var id = SP.uid('ph-'); return db.put(id, b).then(function () { return id; }); }); }))
          .then(function (ids) { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { }); ok(ids); })
          .catch(function (e) { SP.toast(e.message || SP.t('hw.photoBad'), 'danger', { ms: 7000 }); ok([]); });
      };
      inp.click();
    });
  }
  function thumbsHtml(owner, list, max) {
    if (!list.length) return '';
    var n = max || 3;
    return '<span class="hw-phs">' + list.slice(0, n).map(function (p, i) { return '<button type="button" class="hw-ph" data-phv="' + esc(owner) + '|' + i + '" aria-label="' + esc(SP.t('hw.photo')) + '"><img data-ph="' + esc(p) + '" alt=""></button>'; }).join('') +
      (list.length > n ? '<button type="button" class="hw-ph hw-ph-more" data-phv="' + esc(owner) + '|' + n + '">+' + (list.length - n) + '</button>' : '') + '</span>';
  }
  /* подставить картинки в <img data-ph> (из IndexedDB, один раз на фото) */
  /* фото бывает двух видов: «ph-…» — на этом телефоне (IndexedDB), «data/…» — на сайте (фото задания группы) */
  function isRemote(p) { return /^data\//.test(p); }
  function allPhotos(x) { return (x.photos || []).concat(photosOf(x.id)); }
  /* удалить одно фото задания: своё — с телефона, фото группы — у всех (только разработчик) */
  function canDelPhoto(p) { return !isRemote(p) || isDev(); }
  function delPhoto(x, p) {
    if (isRemote(p)) { if (isDev()) publishGroup('delPhoto', { id: x.id, photo: p }); return; }
    setPhotos(x.id, photosOf(x.id).filter(function (q) { return q !== p; })); dropPhotos([p]); render();
  }
  function fillThumbs(scope) {
    SP.$$('img[data-ph]', scope).forEach(function (img) {
      var id = img.getAttribute('data-ph');
      if (phUrl[id]) { img.src = phUrl[id]; return; }
      if (isRemote(id)) { img.src = id; return; }
      db.get(id).then(function (b) {
        if (!b) { var t = img.closest('.hw-ph'); if (t) t.classList.add('gone'); return; }
        phUrl[id] = phUrl[id] || URL.createObjectURL(b); img.src = phUrl[id];
      }).catch(function () { });
    });
  }
  function urlOf(id) { return phUrl[id] ? Promise.resolve(phUrl[id]) : isRemote(id) ? Promise.resolve(id) : db.get(id).then(function (b) { if (!b) return ''; phUrl[id] = URL.createObjectURL(b); return phUrl[id]; }); }
  /* просмотр фото на весь экран: листать, открыть отдельно (можно увеличить), удалить */
  /* canDel(p) — можно ли удалить это фото (фото группы удаляет только разработчик) */
  function viewPhotos(list, start, onDelete, canDel) {
    var i = start || 0;
    var m = SP.modal({ title: SP.t('hw.photo'), size: 'lg', bodyClass: 'hw-view', body: '<img id="hvImg" alt=""><div class="hw-view-bar"><button type="button" class="btn btn-icon" id="hvPrev" aria-label="←">' + SP.icon('chevron-left') + '</button><span id="hvN"></span><button type="button" class="btn btn-icon" id="hvNext" aria-label="→">' + SP.icon('chevron-right') + '</button></div>',
      actions: (onDelete ? [{ label: SP.t('hw.photoDel'), icon: 'trash-2', kind: 'danger-outline', close: false, onClick: function () {
        var p = list[i]; list.splice(i, 1); onDelete(p); if (!list.length) { m.close(); return false; } i = Math.min(i, list.length - 1); show(); return false;
      } }] : []).concat([{ label: SP.t('hw.photoOpen'), icon: 'external-link', close: false, onClick: function () { urlOf(list[i]).then(function (u) { if (u) window.open(u, '_blank'); }); return false; } }]) });
    function show() {
      urlOf(list[i]).then(function (u) { var im = SP.$('#hvImg', m.el); if (im) im.src = u; });
      SP.$('#hvN', m.el).textContent = (i + 1) + ' / ' + list.length;
      SP.$('#hvPrev', m.el).disabled = i === 0; SP.$('#hvNext', m.el).disabled = i >= list.length - 1;
      SP.$('.hw-view-bar', m.el).hidden = list.length < 2;
      var delB = onDelete && SP.$('.modal-foot .btn-danger-outline', m.el); if (delB) delB.hidden = !!canDel && !canDel(list[i]);
    }
    SP.$('#hvPrev', m.el).onclick = function () { if (i > 0) { i--; show(); } };
    SP.$('#hvNext', m.el).onclick = function () { if (i < list.length - 1) { i++; show(); } };
    /* смахнуть влево/вправо — следующее/предыдущее фото */
    var sx = null, im = SP.$('#hvImg', m.el);
    im.addEventListener('touchstart', function (e) { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    im.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) SP.$(dx < 0 ? '#hvNext' : '#hvPrev', m.el).click(); });
    show();
  }
  /* фото, которые больше ни к чему не привязаны (закрыл сайт, не добавив задание), — убираем */
  function cleanup() {
    var used = {}; Object.keys(phMap()).forEach(function (k) { phMap()[k].forEach(function (p) { used[p] = 1; }); }); pend.forEach(function (p) { used[p] = 1; });
    db.keys().then(function (ks) { (ks || []).forEach(function (k) { if (!used[k]) db.del(k).catch(function () { }); }); }).catch(function () { });
  }

  /* задание группы, срок которого прошёл больше недели назад, уже не висит в «Просрочено» */
  function isDone(x) { var n = daysTo(x.due); return !!x.done || (x.grp && n !== null && n < -7); }

  /* ---------- Даты ---------- */
  function iso(d) { return d.getFullYear() + '-' + SP.pad2(d.getMonth() + 1) + '-' + SP.pad2(d.getDate()); }
  function today() { var d = new Date(); d.setHours(12, 0, 0, 0); return d; }
  function plus(n) { var d = today(); d.setDate(d.getDate() + n); return iso(d); }
  function daysTo(s) { if (!s) return null; var d = new Date(s + 'T12:00:00'); return Math.round((d - today()) / 864e5); }
  function dueLabel(s) {
    var n = daysTo(s); if (n === null) return '';
    if (n === 0) return SP.t('hw.today'); if (n === 1) return SP.t('hw.tomorrow'); if (n === -1) return SP.t('hw.yesterday');
    var d = new Date(s + 'T12:00:00');
    return SP.t('hw.wd').split(',')[(d.getDay() + 6) % 7] + ', ' + SP.pad2(d.getDate()) + '.' + SP.pad2(d.getMonth() + 1);
  }
  function toMin(t) { var m = String(t || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 0; }
  function lessonsOf(name) { var s = findSubject(name); return s ? (SP.hub.data().schedule || []).filter(function (l) { return l.subjectId === s.id; }) : []; }
  /* «К следующей паре»: ближайший день, когда у предмета есть пара (после сегодняшнего) */
  function nextLesson(name) {
    var days = {}; lessonsOf(name).forEach(function (l) { days[+l.day] = 1; });
    var wd = (today().getDay() + 6) % 7;
    for (var k = 1; k <= 7; k++) if (days[(wd + k) % 7]) return plus(k);
    return '';
  }
  /* какой предмет подставить: пара сегодня, которая уже началась (или начнётся через 10 минут), — самая поздняя */
  function smartSubject() {
    var d = SP.hub.data(), wd = (new Date().getDay() + 6) % 7, now = new Date().getHours() * 60 + new Date().getMinutes();
    var slot = {}; (d.timeSlots || []).forEach(function (t) { slot[t.id] = t; });
    var best = null, bs = -1;
    (d.schedule || []).forEach(function (l) {
      var t = slot[l.slotId]; if (+l.day !== wd || !t) return;
      var st = toMin(t.start); if (st <= now + 10 && st > bs) { bs = st; best = l; }
    });
    var s = best && SP.hub.getSubject(best.subjectId);
    return s ? SP.hub.cleanName(s.name) : '';
  }
  function curSubject() { return form.subject === null ? (filter || smartSubject()) : form.subject; }
  function curDue() { return form.due === null ? nextLesson(curSubject()) : form.due; }
  function findSubject(name) { if (!name) return null; var n = SP.lc(name); return SP.hub.data().subjects.filter(function (s) { return SP.lc(SP.hub.cleanName(s.name)) === n; })[0]; }
  function subjectNames() { var o = []; SP.hub.data().subjects.forEach(function (s) { var n = SP.hub.cleanName(s.name); if (o.indexOf(n) < 0) o.push(n); }); return o; }

  /* ---------- Переключатель «Домашка · Оценки» (и в «Оценках» тоже) ---------- */
  function switchHtml(cur) {
    var n = all().filter(function (x) { return !isDone(x); }).length;
    return '<nav class="hw-switch" aria-label="' + esc(SP.t('hw.switch')) + '">' +
      '<a href="#/homework"' + (cur === 'homework' ? ' aria-current="page"' : '') + '>' + SP.icon('notebook-pen', 'ic-sm') + '<span>' + esc(SP.t('nav.homework')) + '</span>' + (n ? '<b class="hw-n">' + n + '</b>' : '') + '</a>' +
      '<a href="#/grades"' + (cur === 'grades' ? ' aria-current="page"' : '') + '>' + SP.icon('graduation-cap', 'ic-sm') + '<span>' + esc(SP.t('nav.grades')) + '</span></a></nav>';
  }
  /* кружок с числом у «Домашки» в меню: просрочено + сегодня + завтра */
  function badge() {
    var n = all().filter(function (x) { var d = daysTo(x.due); return !isDone(x) && d !== null && d <= 1; }).length;
    var h = document.documentElement;
    if (n) h.style.setProperty('--hw-n', '"' + (n > 9 ? '9+' : n) + '"'); else h.style.removeProperty('--hw-n');
    h.classList.toggle('hw-badge', n > 0);
  }

  /* ---------- Отрисовка ---------- */
  function linkify(t) { return esc(t).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<span class="hw-url">' + u + '</span>'; }).replace(/\n/g, '<br>'); }
  function rowHtml(x) {
    var n = daysTo(x.due), late = !isDone(x) && n !== null && n < 0;
    var meta = [];
    if (x.subject && !filter) meta.push('<span class="hw-subj">' + SP.icon('folder', 'ic-sm') + esc(x.subject) + '</span>');
    if (x.due) meta.push('<span class="hw-due' + (late ? ' late' : n === 0 ? ' now' : '') + '">' + SP.icon('clock', 'ic-sm') + esc(dueLabel(x.due)) + '</span>');
    if (x.grp) meta.push('<span class="hw-grp">' + SP.icon('megaphone', 'ic-sm') + esc(SP.t('hw.forGroup')) + '</span>');
    return '<li class="hw-item' + (isDone(x) ? ' done' : '') + (late ? ' late' : '') + '" data-hw="' + esc(x.id) + '">' +
      '<button type="button" class="hw-check" role="checkbox" aria-checked="' + !!x.done + '" data-hwtog="' + esc(x.id) + '" aria-label="' + esc(SP.t(x.done ? 'hw.undone' : 'hw.markDone')) + '">' + SP.icon('check') + '</button>' +
      '<div class="hw-main"><button type="button" class="hw-body" data-hwopen="' + esc(x.id) + '"><span class="hw-text">' + linkify(x.text) + '</span>' + (meta.length ? '<span class="hw-meta">' + meta.join('') + '</span>' : '') + '</button>' +
      thumbsHtml(x.id, allPhotos(x)) + '</div></li>';
  }
  function sections(list) {
    var by = { late: [], today: [], tomorrow: [], week: [], later: [], none: [], done: [] };
    list.forEach(function (x) {
      var n = daysTo(x.due);
      if (isDone(x)) by.done.push(x);
      else if (n === null) by.none.push(x);
      else if (n < 0) by.late.push(x); else if (n === 0) by.today.push(x); else if (n === 1) by.tomorrow.push(x);
      else if (n <= 7) by.week.push(x); else by.later.push(x);
    });
    var sortDue = function (a, b) { return String(a.due).localeCompare(String(b.due)) || String(a.at || '').localeCompare(String(b.at || '')); };
    Object.keys(by).forEach(function (k) { by[k].sort(k === 'done' ? function (a, b) { return (b.done || 0) - (a.done || 0); } : sortDue); });
    return by;
  }
  /* строка добавления: поле + «＋», под ним маленькие кнопки «Предмет», «Срок», «Группе» */
  function formHtml() {
    var s = curSubject(), d = curDue();
    return '<section class="card hw-add" id="hwForm">' +
      '<div class="hw-add-row"><textarea class="textarea" id="hwText" rows="1" enterkeyhint="done" placeholder="' + esc(SP.t('hw.ph')) + '" aria-label="' + esc(SP.t('hw.ph')) + '">' + esc(form.text) + '</textarea>' +
      '<button type="button" class="btn btn-primary btn-icon hw-plus" id="hwAdd" aria-label="' + esc(SP.t('hw.add')) + '" data-tip="' + esc(SP.t('hw.add')) + '">' + SP.icon('plus') + '</button></div>' +
      '<div class="hw-chips">' +
      '<button type="button" class="hw-chip' + (s ? ' on' : '') + '" id="hwSubjBtn">' + SP.icon('folder', 'ic-sm') + '<span>' + esc(s || SP.t('hw.subject')) + '</span>' + SP.icon('chevron-down', 'ic-sm') + '</button>' +
      '<button type="button" class="hw-chip' + (d ? ' on' : '') + '" id="hwDueBtn">' + SP.icon('clock', 'ic-sm') + '<span>' + esc(d ? dueLabel(d) : SP.t('hw.date')) + '</span>' + SP.icon('chevron-down', 'ic-sm') + '</button>' +
      '<button type="button" class="hw-chip' + (pend.length ? ' on' : '') + '" id="hwPhoto">' + SP.icon('camera', 'ic-sm') + '<span>' + esc(pend.length ? SP.t('hw.photoN', { n: pend.length }) : SP.t('hw.photo')) + '</span></button>' +
      (isDev() ? '<button type="button" class="hw-chip' + (form.group ? ' on' : '') + '" id="hwGroup" aria-pressed="' + form.group + '" data-tip="' + esc(SP.t('hw.toGroupTip')) + '">' + SP.icon('megaphone', 'ic-sm') + '<span>' + esc(SP.t('hw.toGroup')) + '</span></button>' : '') +
      '</div>' + (pend.length ? '<div class="hw-pend">' + pend.map(function (p, i) { return '<span class="hw-ph"><img data-ph="' + esc(p) + '" alt=""><button type="button" class="hw-unpend" data-unpend="' + i + '" aria-label="' + esc(SP.t('hw.photoDel')) + '">' + SP.icon('x') + '</button></span>'; }).join('') + '</div>' : '') + '</section>';
  }
  function filterHtml(list) {
    var cnt = {}, order = [];
    list.forEach(function (x) { if (isDone(x) || !x.subject) return; if (!cnt[x.subject]) { cnt[x.subject] = 0; order.push(x.subject); } cnt[x.subject]++; });
    if (filter && !cnt[filter]) { cnt[filter] = 0; order.unshift(filter); }
    if (order.length < 2 && !filter) return '';
    return '<div class="hw-filter" role="group" aria-label="' + esc(SP.t('hw.filter')) + '"><button type="button" class="hw-chip' + (filter ? '' : ' on') + '" data-hwf="">' + esc(SP.t('hw.all')) + '</button>' +
      order.map(function (n) { return '<button type="button" class="hw-chip' + (filter === n ? ' on' : '') + '" data-hwf="' + esc(n) + '">' + esc(n) + (cnt[n] ? ' <b>' + cnt[n] + '</b>' : '') + '</button>'; }).join('') + '</div>';
  }
  function render() {
    if (!root) return;
    var full = all(), list = filter ? full.filter(function (x) { return x.subject === filter; }) : full;
    var by = sections(list), left = list.length - by.done.length;
    /* без подзаголовка — число несделанных на переключателе, так короче на телефоне */
    var html = SP.pageHead({ title: SP.t('nav.homework') });
    html += switchHtml('homework') + formHtml() + filterHtml(full);
    var sec = [['late', 'triangle-alert'], ['today', 'zap'], ['tomorrow', 'calendar-days'], ['week', 'calendar-days'], ['later', 'calendar-days'], ['none', 'list']];
    var body = sec.map(function (s) {
      var a = by[s[0]]; if (!a.length) return '';
      return '<section class="hw-sec hw-' + s[0] + '"><h2 class="section-title">' + SP.icon(s[1], 'ic-sm') + esc(SP.t('hw.sec.' + s[0])) + ' <span class="count">' + a.length + '</span></h2><ul class="hw-list">' + a.map(rowHtml).join('') + '</ul></section>';
    }).join('');
    if (!left) body = '<div class="hw-empty">' + SP.icon('circle-check', 'ic-xl') + '<p>' + esc(SP.t(list.length ? 'hw.emptyDone' : filter ? 'hw.emptyFilter' : 'hw.empty')) + '</p></div>' + body;
    if (by.done.length) body += '<details class="hw-sec hw-donebox"' + (SP.store.get('sp-hw-doneopen', false) ? ' open' : '') + '><summary class="section-title">' + SP.icon('circle-check', 'ic-sm') + esc(SP.t('hw.sec.done')) + ' <span class="count">' + by.done.length + '</span>' + SP.icon('chevron-down', 'ds-chev') + '</summary>' +
      '<ul class="hw-list">' + by.done.slice(0, 30).map(rowHtml).join('') + '</ul>' + (isDev() && by.done.some(function (x) { return x.grp; }) ? '<p class="small muted hw-devnote">' + SP.icon('megaphone', 'ic-sm') + ' ' + esc(SP.t('hw.devKeep')) + '</p>' : '') + '<button type="button" class="btn btn-ghost btn-sm" id="hwClear">' + SP.icon('trash-2', 'ic-sm') + '<span>' + esc(SP.t('hw.clearDone')) + '</span></button></details>';
    root.innerHTML = '<div class="page hw-page">' + html + body + '</div>';
    wire(); grow(); fillThumbs(root);
  }

  /* ---------- Действия ---------- */
  function find(id) { return all().filter(function (x) { return x.id === id; })[0]; }
  function setDone(x, on) {
    if (x.grp) { var dm = doneMap(); if (on) dm[x.id] = on; else delete dm[x.id]; SP.store.set(DONE, dm); badge(); }
    else { var m = mine(); m.items.forEach(function (it) { if (it.id === x.id) it.done = on; }); saveMine(m); }
  }
  function toggle(id) {
    var x = find(id); if (!x) return;
    var now = x.done ? 0 : Date.now();
    setDone(x, now);
    var li = SP.$('[data-hw="' + id + '"]', root);
    /* сначала зачёркиваем на месте, потом задание переезжает вниз; 10 секунд можно отменить */
    if (li && now) {
      li.classList.add('done', 'hw-bye'); SP.$('.hw-check', li).setAttribute('aria-checked', 'true');
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) { /* без вибрации */ }
      setTimeout(render, 450);
      SP.undo(SP.t('hw.doneToast'), function () { setDone(x, 0); render(); });
    } else render();
  }
  function add() {
    var t = SP.$('#hwText', root), text = t.value.trim();
    if (!text && !pend.length) { t.focus(); return; }
    /* только фото, без текста — тоже задание («Задание на фото») */
    var it = { text: text || SP.t('hw.photoTask'), subject: curSubject(), due: curDue(), at: new Date().toISOString() };
    var id = form.group && isDev() ? 'g-' + SP.uid('') : SP.uid('hw-');
    if (form.group && isDev()) { var ph = pend; pend = []; publishGroup('add', Object.assign({ id: id }, it), null, ph); }
    else { if (pend.length) { setPhotos(id, pend.slice()); pend = []; } var m = mine(); m.items.push(Object.assign({ id: id, done: 0 }, it)); saveMine(m); SP.toast(SP.t('hw.added'), 'success'); }
    /* предмет оставляем (часто задают несколько заданий по одному предмету), срок — снова «как подскажет сайт» */
    form.text = ''; form.due = null; render();
    var n = SP.$('#hwText', root); if (n) n.focus();
  }
  /* меню «Предмет»: без предмета + все папки */
  function pickSubject(btn, cur, set) {
    var items = [{ label: SP.t('hw.noSubject'), icon: cur ? 'x' : 'check', onClick: function () { set(''); } }, '-'];
    subjectNames().forEach(function (n) { items.push({ label: n, icon: n === cur ? 'check' : 'folder', onClick: function () { set(n); } }); });
    var m = SP.menu(btn, items); if (m) m.classList.add('hw-menu');
  }
  /* меню «Срок» */
  function pickDue(btn, subj, cur, set) {
    var nx = nextLesson(subj), items = [];
    if (nx) items.push({ label: SP.t('hw.dueNext') + ' · ' + dueLabel(nx), icon: cur === nx ? 'check' : 'calendar-days', onClick: function () { set(nx); } });
    [[plus(0), 'hw.dueToday'], [plus(1), 'hw.dueTomorrow'], [plus(7), 'hw.dueWeek']].forEach(function (q) {
      if (q[0] === nx) return;
      items.push({ label: SP.t(q[1]) + (q[1] === 'hw.dueWeek' ? ' · ' + dueLabel(q[0]) : ''), icon: cur === q[0] ? 'check' : 'clock', onClick: function () { set(q[0]); } });
    });
    items.push({ label: SP.t('hw.pickDate'), icon: 'calendar-days', onClick: function () { dateDialog(cur, set); } });
    items.push('-', { label: SP.t('hw.noDue'), icon: cur ? 'x' : 'check', onClick: function () { set(''); } });
    SP.menu(btn, items);
  }
  function dateDialog(cur, set) {
    var m = SP.modal({ title: SP.t('hw.pickDate'), body: '<input class="input" type="date" id="hwDd" value="' + esc(cur || plus(1)) + '">',
      actions: [{ label: SP.t('common.cancel') }, { label: SP.t('common.save'), kind: 'primary', onClick: function () { var v = SP.$('#hwDd', m.el).value; if (v) set(v); } }] });
    var i = SP.$('#hwDd', m.el); if (i) i.focus();
  }
  /* окно задания: текст, предмет, срок; удалить; открыть папку; отправить группе */
  function open(x) {
    var canEdit = x.own || isDev(), st = { subject: x.subject || '', due: x.due || '' };
    var chips = function () {
      return '<button type="button" class="hw-chip' + (st.subject ? ' on' : '') + '" id="heS">' + SP.icon('folder', 'ic-sm') + '<span>' + esc(st.subject || SP.t('hw.subject')) + '</span>' + SP.icon('chevron-down', 'ic-sm') + '</button>' +
        '<button type="button" class="hw-chip' + (st.due ? ' on' : '') + '" id="heD">' + SP.icon('clock', 'ic-sm') + '<span>' + esc(st.due ? dueLabel(st.due) : SP.t('hw.date')) + '</span>' + SP.icon('chevron-down', 'ic-sm') + '</button>';
    };
    var sj = findSubject(x.subject);
    var body = canEdit ? '<div class="stack"><textarea class="textarea" id="heT" rows="4">' + esc(x.text) + '</textarea><div class="hw-chips" id="heC">' + chips() + '</div>' +
        (x.grp ? '<p class="small muted">' + SP.icon('megaphone', 'ic-sm') + ' ' + esc(SP.t('hw.grpEditNote')) + '</p>' : '') + '</div>'
      : '<div class="stack"><div class="hw-full">' + linkifyA(x.text) + '</div><div class="hw-meta">' + (x.subject ? '<span>' + SP.icon('folder', 'ic-sm') + esc(x.subject) + '</span>' : '') + (x.due ? '<span>' + SP.icon('clock', 'ic-sm') + esc(dueLabel(x.due)) + '</span>' : '') + '<span class="hw-grp">' + SP.icon('megaphone', 'ic-sm') + esc(SP.t('hw.forGroup')) + '</span></div></div>';
    if (canEdit) body += '<div class="hw-links">' + linksOf(x.text) + '</div>';
    /* фото — у любого задания (и у задания группы: снимок остаётся только у тебя) */
    body += '<div class="hw-phrow" id="heP"></div>';
    var acts = [];
    if (canEdit) acts.push({ label: SP.t(x.grp ? 'hw.delGroup' : 'common.delete'), icon: 'trash-2', kind: 'danger-outline', onClick: function () { remove(x); } });
    if (sj) acts.push({ label: SP.t('hw.openFolder'), icon: 'folder-open', onClick: function () { SP.navigate('subjects', [sj.id]); } });
    if (x.own && isDev()) acts.push({ label: SP.t('hw.shareGroup'), icon: 'megaphone', onClick: function () {
      publishGroup('add', { id: 'g-' + SP.uid(''), text: x.text, subject: x.subject || '', due: x.due || '', at: new Date().toISOString() }, function () {
        var mm = mine(); mm.items = mm.items.filter(function (it) { return it.id !== x.id; }); saveMine(mm); setPhotos(x.id, []);
      }, photosOf(x.id));
    } });
    if (canEdit) acts.push({ label: SP.t('common.save'), kind: 'primary', icon: 'check', onClick: function (api) {
      var text = SP.$('#heT', api.el).value.trim(); if (!text) return false;
      if (x.grp) publishGroup('edit', { id: x.id, text: text, subject: st.subject, due: st.due });
      else { var mm = mine(); mm.items.forEach(function (it) { if (it.id === x.id) { it.text = text; it.subject = st.subject; it.due = st.due; } }); saveMine(mm); render(); }
    } });
    else acts.push({ label: SP.t(x.done ? 'hw.undone' : 'hw.markDone'), kind: 'primary', icon: 'check', onClick: function () { toggle(x.id); } });
    var m = SP.modal({ title: SP.t(canEdit ? 'hw.editTitle' : 'hw.viewTitle'), body: body, actions: acts, bodyClass: 'hw-modal' });
    var wireChips = function () {
      var s = SP.$('#heS', m.el), d = SP.$('#heD', m.el);
      if (s) s.onclick = function () { pickSubject(s, st.subject, function (v) { st.subject = v; SP.$('#heC', m.el).innerHTML = chips(); wireChips(); }); };
      if (d) d.onclick = function () { pickDue(d, st.subject, st.due, function (v) { st.due = v; SP.$('#heC', m.el).innerHTML = chips(); wireChips(); }); };
    };
    wireChips();
    var paintP = function () {
      var box = SP.$('#heP', m.el); if (!box) return;
      var cur = find(x.id) || x, list = allPhotos(cur);
      box.innerHTML = thumbsHtml(x.id, list, 8) + '<button type="button" class="hw-chip" id="heAddP">' + SP.icon('camera', 'ic-sm') + '<span>' + esc(SP.t('hw.photoAdd')) + '</span></button>' +
        (x.grp && isDev() ? '<p class="small muted hw-phnote">' + esc(SP.t('hw.photoGrpNote')) + '</p>' : '');
      fillThumbs(box);
      /* у задания группы разработчик загружает фото для всех; остальные — фото только себе */
      SP.$('#heAddP', box).onclick = function () { pickPhotos().then(function (ids) {
        if (!ids.length) return;
        if (x.grp && isDev()) { m.close(); publishGroup('addPhotos', { id: x.id }, null, ids); return; }
        setPhotos(x.id, photosOf(x.id).concat(ids)); paintP(); render();
      }); };
      SP.$$('[data-phv]', box).forEach(function (b) { b.onclick = function () { viewPhotos(allPhotos(find(x.id) || x), +b.getAttribute('data-phv').split('|')[1], function (p) { if (isRemote(p)) m.close(); delPhoto(find(x.id) || x, p); paintP(); }, canDelPhoto); }; });
    };
    paintP();
  }
  function urls(t) { return (String(t).match(/https?:\/\/[^\s<]+/g) || []).map(function (u) { return u.replace(/[).,;]+$/, ''); }); }
  function linkifyA(t) { return esc(t).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'; }).replace(/\n/g, '<br>'); }
  function linksOf(t) { return urls(t).map(function (u) { return '<a class="btn btn-sm" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + SP.icon('external-link', 'ic-sm') + '<span>' + esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)) + '</span></a>'; }).join(''); }
  function remove(x) {
    if (x.grp) {
      SP.confirm({ title: SP.t('hw.delGroup'), text: SP.t('hw.delGroupText'), danger: true, okLabel: SP.t('common.delete') }).then(function (ok) { if (ok) { publishGroup('del', { id: x.id }); dropPhotos(photosOf(x.id)); setPhotos(x.id, []); } });
      return;
    }
    var m = mine(), i = -1; m.items.forEach(function (it, k) { if (it.id === x.id) i = k; });
    if (i < 0) return;
    var it = m.items.splice(i, 1)[0]; saveMine(m); render();
    SP.undo(SP.t('hw.deleted'), function () { var mm = mine(); mm.items.splice(Math.min(i, mm.items.length), 0, it); saveMine(mm); render(); }, function () { dropPhotos(photosOf(it.id)); setPhotos(it.id, []); });
  }
  /* разработчик: записать задание в data/<группа>/homework.json (свежий файл с GitHub + правка + коммит, без точки сохранения).
     files — id фото на этом телефоне: они загружаются в data/<группа>/homework/<id>.jpg тем же коммитом,
     в задании — photos: [пути]. Удалил задание или фото — файлы стираются из репозитория. */
  function publishGroup(op, it, then, files) {
    if (!isDev() || gBusy) return;
    var core = SP.devCore, d = gdir(), path = 'data/' + d + '/homework.json', dirP = 'data/' + d + '/homework/';
    gBusy = true; SP.toast(SP.t(files && files.length ? 'hw.publishingPh' : 'hw.publishing'), 'info');
    Promise.all((files || []).map(function (p) { return db.get(p).then(function (b) { return b ? { path: dirP + p + '.jpg', blob: b } : null; }); })).then(function (ups) {
      ups = ups.filter(Boolean);
      var paths = ups.map(function (u) { return u.path; });
      return core.remoteFile(path).then(function (j) {
        var list = j && Array.isArray(j.items) ? j.items : [], del = [];
        if (op === 'add') { if (paths.length) it.photos = paths; list.push(it); }
        else if (op === 'edit') list.forEach(function (x) { if (x.id === it.id) { x.text = it.text; x.subject = it.subject; x.due = it.due; } });
        else if (op === 'addPhotos') list.forEach(function (x) { if (x.id === it.id) x.photos = (x.photos || []).concat(paths); });
        else if (op === 'delPhoto') list.forEach(function (x) { if (x.id === it.id) { x.photos = (x.photos || []).filter(function (q) { return q !== it.photo; }); if (!x.photos.length) delete x.photos; del.push(it.photo); } });
        else list = list.filter(function (x) { if (x.id === it.id) del = del.concat(x.photos || []); return x.id !== it.id; });
        /* задания со сроком больше месяца назад убираем из файла сами (и их фото) */
        list = list.filter(function (x) { var n = daysTo(x.due), keep = n === null || n > -31; if (!keep) del = del.concat(x.photos || []); return keep; });
        var out = { version: core.nextVersion(j && j.version), updatedAt: new Date().toISOString(), items: list };
        var base = [{ path: path, content: JSON.stringify(out, null, 2) + '\n' }].concat(ups.map(function (u) { return { path: u.path, blob: u.blob }; }));
        var rm = del.filter(function (p) { return p.indexOf(dirP) === 0; }).map(function (p) { return { path: p, del: true }; });
        var msg = SP.t('hw.commit', { g: d });
        /* файла фото уже нет в репозитории — тогда без удаления */
        return core.commitFiles(base.concat(rm), msg, { noTag: true }).catch(function (e) { if (!rm.length) throw e; return core.commitFiles(base, msg, { noTag: true }); }).then(function () {
          /* загруженные фото сразу видны разработчику (GitHub Pages обновится через 1–2 минуты); копии на телефоне больше не нужны */
          ups.forEach(function (u) { phUrl[u.path] = URL.createObjectURL(u.blob); });
          if (files && files.length) dropPhotos(files);
          SP.store.set(GKEY + ':' + d, { version: out.version, items: list, pending: Date.now() });
          if (then) then();
          SP.toast(SP.t('hw.published'), 'success', { ms: 7000 });
        });
      });
    }).catch(function (e) {
      /* не получилось (нет интернета) — новое задание возвращаем в строку, чтобы не потерять */
      if (op === 'add' && !then) { form.text = form.text || it.text; pend = (files || []).concat(pend); }
      SP.toast(e.message || String(e), 'danger', { ms: 9000 });
    }).then(function () { gBusy = false; badge(); render(); });
  }
  /* поле растёт по тексту (до 6 строк) */
  function grow() { var t = root && SP.$('#hwText', root); if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 160) + 'px'; }
  function wire() {
    var q = function (s) { return SP.$(s, root); };
    var t = q('#hwText');
    if (t) {
      t.oninput = function () { form.text = t.value; grow(); };
      t.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); add(); } };
    }
    var a = q('#hwAdd'); if (a) a.onclick = add;
    var sb = q('#hwSubjBtn'); if (sb) sb.onclick = function () { pickSubject(sb, curSubject(), function (v) { form.subject = v; form.due = null; repaintForm(); }); };
    var db = q('#hwDueBtn'); if (db) db.onclick = function () { pickDue(db, curSubject(), curDue(), function (v) { form.due = v; repaintForm(); }); };
    var g = q('#hwGroup'); if (g) g.onclick = function () { form.group = !form.group; repaintForm(); };
    var ph = q('#hwPhoto'); if (ph) ph.onclick = function () { pickPhotos().then(function (ids) { if (ids.length) { pend = pend.concat(ids); repaintForm(); } }); };
    SP.$$('[data-unpend]', root).forEach(function (b) { b.onclick = function () { var p = pend.splice(+b.getAttribute('data-unpend'), 1); dropPhotos(p); repaintForm(); }; });
    SP.$$('.hw-list [data-phv]', root).forEach(function (b) { b.onclick = function () {
      var v = b.getAttribute('data-phv').split('|'), id = v[0];
      var x = find(id); if (x) viewPhotos(allPhotos(x), +v[1], function (p) { delPhoto(x, p); }, canDelPhoto);
    }; });
    SP.$$('[data-hwf]', root).forEach(function (b) { b.onclick = function () { filter = b.getAttribute('data-hwf'); form.subject = null; form.due = null; history.replaceState(null, '', '#/homework' + (filter ? '/' + encodeURIComponent(filter) : '')); render(); }; });
    SP.$$('[data-hwtog]', root).forEach(function (b) { b.onclick = function () { toggle(b.getAttribute('data-hwtog')); }; });
    SP.$$('[data-hwopen]', root).forEach(function (b) { b.onclick = function () { var x = find(b.getAttribute('data-hwopen')); if (x) open(x); }; });
    var cl = q('#hwClear'); if (cl) cl.onclick = function () {
      var m = mine(), was = m.items.slice(), hm = hideMap(), wasH = Object.assign({}, hm);
      m.items = m.items.filter(function (x) { return !x.done; });
      /* разработчик задания группы не прячет: они остаются в «Сделано», чтобы потом удалить их у всех */
      if (!isDev()) all().forEach(function (x) { if (x.grp && isDone(x)) hm[x.id] = 1; });
      var gone = was.length - m.items.length + Object.keys(hm).length - Object.keys(wasH).length;
      saveMine(m); SP.store.set(HIDE, hm); render();
      /* через 10 секунд (не нажали «Отменить») — стираем и фото этих заданий */
      SP.undo(SP.t('hw.cleared', { n: gone }), function () { var mm = mine(); mm.items = was; saveMine(mm); SP.store.set(HIDE, wasH); render(); }, function () {
        was.concat(group().items).forEach(function (x) { if ((x.done && was.indexOf(x) >= 0) || (hm[x.id] && !wasH[x.id])) { dropPhotos(photosOf(x.id)); setPhotos(x.id, []); } });
      });
    };
    var dbx = q('.hw-donebox'); if (dbx) dbx.addEventListener('toggle', function () { SP.store.set('sp-hw-doneopen', dbx.open); });
  }
  /* строку добавления перерисовываем отдельно — текст и фокус не теряются */
  function repaintForm() {
    var f = SP.$('#hwForm', root); if (!f) return;
    var ae = document.activeElement && document.activeElement.id;
    f.outerHTML = formHtml(); wire(); grow(); fillThumbs(root);
    var n = ae && SP.$('#' + ae, root); if (n) n.focus();
  }

  /* для папки предмета: несделанная домашка по этому предмету (коротко, сверху) */
  function folderHtml(s) {
    var name = SP.hub.cleanName(s.name), ln = SP.lc(name);
    var a = all().filter(function (x) { return !isDone(x) && SP.lc(x.subject || '') === ln; });
    if (!a.length) return '';
    a.sort(function (x, y) { return String(x.due || '9').localeCompare(String(y.due || '9')); });
    return '<a class="hw-strip" href="#/homework/' + encodeURIComponent(name) + '">' + SP.icon('notebook-pen', 'ic-sm') + '<span><b>' + esc(SP.t('hw.inFolder', { n: a.length })) + '</b> ' +
      esc(a.slice(0, 2).map(function (x) { return (x.due ? dueLabel(x.due) + ': ' : '') + x.text.split('\n')[0].slice(0, 60); }).join(' · ')) + '</span>' + SP.icon('chevron-right', 'ic-sm') + '</a>';
  }

  SP.homework = { folderHtml: folderHtml, switchHtml: switchHtml, badge: badge };
  SP.views.register('homework', {
    titleKey: 'nav.homework',
    mount: function (el) { root = el; },
    show: function (params) {
      var f = params && params[0] ? decodeURIComponent(params[0]) : '';
      if (f !== filter) { filter = f; form.subject = null; form.due = null; }
      render(); loadGroup().then(render);
    },
    refresh: render
  });
  SP.on('hub', function () { badge(); if (root && SP.views.current() === 'homework') render(); });
  /* кружок в меню — сразу при запуске и раз в 10 минут (наступает новый день) */
  setTimeout(function () { badge(); loadGroup(); cleanup(); }, 1500);
  setInterval(badge, 10 * 60000);
})();

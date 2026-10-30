/* =====================================================================
   ДАННЫЕ РАСПИСАНИЯ И ПАПОК ПРЕДМЕТОВ (без отображения).
   Слои данных (кто важнее — выше):
     1. «Своё» — расписание, которое студент загрузил файлом.
     2. «Timetable» — расписание, полученное с timetable.kgu.kz.
     3. «Курс» — файлы автора на GitHub: data/<группа>/schedule.json
        и manifest.json (материалы, тесты, ссылки для всей группы).
   Папки предметов собираются из всех слоёв. Личные материалы, ссылки,
   тесты и заметки хранятся в браузере и не стираются при обновлениях.
   Ключи хранения те же, что у старого сайта — данные переносятся сами.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var STORE = 'studyplay-academic-hub-v1';
  var IDB = SP.idb('studyplay-academic');
  var DEFAULT_TIMES = [['08:30:00', '09:20:00'], ['09:30:00', '10:20:00'], ['10:30:00', '11:20:00'], ['11:30:00', '12:20:00'], ['12:30:00', '13:20:00'], ['13:30:00', '14:20:00'], ['14:30:00', '15:20:00'], ['15:30:00', '16:20:00']];
  function defaultSlots() { return DEFAULT_TIMES.map(function (t, i) { return { id: 'slot' + i, start: t[0], end: t[1] }; }); }
  var lc = SP.lc, esc = SP.esc, uid = function () { return SP.uid('sp-'); };

  /* ---------- Загрузка / сохранение ---------- */
  function emptyData() { return { version: 2, updatedAt: new Date().toISOString(), own: null, schedule: [], timeSlots: defaultSlots(), subjects: [], shared: [], pins: {}, order: {}, hidden: {}, removed: {}, pref: 'auto', source: '' }; }
  function normalize(x) {
    if (!x || typeof x !== 'object') return emptyData();
    var d = emptyData();
    d.subjects = Array.isArray(x.subjects) ? x.subjects.map(function (s) { return Object.assign({}, s, { materials: Array.isArray(s.materials) ? s.materials : [], tests: Array.isArray(s.tests) ? s.tests : [], notes: String(s.notes || '') }); }) : [];
    d.pins = x.pins && typeof x.pins === 'object' ? x.pins : {};
    d.pref = x.pref || 'auto';
    ['order', 'hidden', 'removed'].forEach(function (k) { d[k] = x[k] && typeof x[k] === 'object' ? x[k] : {}; });
    if (x.own && Array.isArray(x.own.schedule)) d.own = x.own;
    else if (x.scheduleOwn || (x.scheduleOwn === undefined && Array.isArray(x.schedule) && x.schedule.length && x.version !== 2)) {
      d.own = { schedule: Array.isArray(x.schedule) ? x.schedule : [], timeSlots: Array.isArray(x.timeSlots) && x.timeSlots.length ? x.timeSlots : defaultSlots() };
    }
    return d;
  }
  var data = normalize(SP.store.get(STORE, null));

  var hasOwn = function (s) { return (s.materials || []).length || (s.tests || []).length || String(s.notes || '').trim(); };
  function persistView() {
    return {
      version: 2, updatedAt: data.updatedAt, own: data.own, pins: data.pins, order: data.order, hidden: data.hidden, removed: data.removed, pref: data.pref, shared: [],
      subjects: data.subjects.filter(function (s) { return !s.base || hasOwn(s); }).map(function (s) {
        var r = Object.assign({}, s); delete r.base;
        r.materials = (s.materials || []).filter(function (f) { return !f.base; });
        r.tests = (s.tests || []).filter(function (f) { return !f.base; });
        return r;
      })
    };
  }
  function save() {
    data.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORE, JSON.stringify(persistView(), function (k, v) { return (k === 'content' && this && this.stored) ? undefined : v; }));
      return true;
    } catch (e) { SP.toast(SP.t('hub.storageFull'), 'danger'); return false; }
  }

  /* Файлы (содержимое) лежат в IndexedDB, в списке — только описание */
  function allFiles() {
    return data.subjects.reduce(function (a, x) { return a.concat(x.materials || [], x.tests || []); }, [])
      .concat(data.shared.reduce(function (a, g) { return a.concat(g.subjects.reduce(function (b, s) { return b.concat(s.tests || []); }, [])); }, []))
      .filter(function (f) { return !f.base && f.kind !== 'link'; });
  }
  function persistFile(f) { if (!f.content) return Promise.resolve(); return IDB.put(f.id, f.content).then(function () { f.stored = true; }, function () { f.stored = false; }); }
  function dropFile(f) { if (f && f.id) IDB.del(f.id).catch(function () { }); }
  function loadAllContent() {
    var changed = false;
    return allFiles().reduce(function (p, f) {
      return p.then(function () {
        if (f.content && !f.stored) return persistFile(f).then(function () { if (f.stored) changed = true; });
        if (!f.content && f.stored) return IDB.get(f.id).then(function (c) { if (c) f.content = c; else f.missing = true; }, function () { f.missing = true; });
      });
    }, Promise.resolve()).then(function () { if (changed) save(); });
  }

  /* ---------- Названия предметов и занятий ---------- */
  var CODE_RE = /^[\s(\[№#]*(?:[A-Za-zА-Яа-яЁё]{1,6}[-‑–]?\s?)?\d{2,}[\s)\].:–—-]*/u;
  function cleanName(n) { var s = String(n == null ? '' : n).replace(/\s+/g, ' ').trim(); var r = s.replace(CODE_RE, '').trim(); return r || s; }
  var ABBR_RE = /^(.*?)[\s ]+(СПЗ|СРОП|СРО|ЛЗ|ЛР|ПЗ|Л|П|С)$/u;
  function kindAbbr(k) {
    k = String(k || '').trim(); var x = k.toLowerCase(); if (!x) return '';
    if (x.indexOf('лекц') === 0 || x.indexOf('дәріс') === 0 || x.indexOf('lect') === 0) return 'Л';
    if (x.indexOf('лаборат') === 0 || x.indexOf('зертхан') === 0 || x.indexOf('lab') === 0) return 'ЛЗ';
    if (x.indexOf('практ') === 0 || x.indexOf('pract') === 0) return 'П';
    if (x.indexOf('семин') === 0 || x.indexOf('semin') === 0) return 'С';
    return k;
  }
  function kindClass(ab) { return ({ 'Л': 'k-lecture', 'П': 'k-practice', 'ПЗ': 'k-practice', 'ЛЗ': 'k-lab', 'ЛР': 'k-lab', 'С': 'k-seminar', 'СПЗ': 'k-seminar' })[ab] || 'k-other'; }
  function lessonView(l, sj) {
    var name = cleanName(l.name || (sj && sj.name) || SP.t('hub.subject')), ab = '';
    var m1 = name.match(/^(.*?)\s*[—–-]\s*(Лекция|Практика|Практическое занятие|Лабораторная(?: работа)?|Семинар)$/iu);
    if (m1 && m1[1].trim()) { name = m1[1].trim(); ab = kindAbbr(m1[2]); }
    else { var m = name.match(ABBR_RE); if (m && m[1].trim()) { name = m[1].trim(); ab = m[2]; } }
    if (!ab) ab = kindAbbr(l.kind);
    var room = [l.room, l.building ? '(' + l.building + ')' : ''].filter(Boolean).join(' ');
    var teacher = String(l.teacher || (sj && sj.teacher) || '').trim(), hours = String(l.hours || l.load || '').trim();
    var hm = teacher.match(/\s*(\(\s*\d+\s*\/\s*\d+\s*ч?\s*\))\s*$/); if (hm) { teacher = teacher.slice(0, hm.index).trim(); if (!hours) hours = hm[1]; }
    if (hours && !/^\(/.test(hours)) hours = '(' + hours + ')';
    return { name: name, ab: ab, cls: kindClass(ab), room: room, teacher: teacher, hours: hours };
  }

  function getSubject(id) { return data.subjects.filter(function (s) { return s.id === id; })[0]; }
  function findMine(sj) {
    var kn = lc(cleanName(sj.name)), kc = lc(sj.code);
    return data.subjects.filter(function (x) { return x.id === sj.id && (!kn || !x.name || lc(cleanName(x.name)) === kn); })[0] ||
      data.subjects.filter(function (x) { return kn && lc(cleanName(x.name)) === kn && (!kc || !x.code || lc(x.code) === kc); })[0] || null;
  }
  function normUrl(u) {
    u = String(u || '').trim(); if (!u) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    try { var x = new URL(u); if (!/^https?:$/.test(x.protocol)) return ''; return x.href; } catch (e) { return ''; }
  }
  var sameFile = function (a, b) { return a.name === b.name && (a.size || 0) === (b.size || 0); };
  function mergeNotes(a, b, label) {
    a = String(a || ''); b = String(b || '').trim();
    if (!b || a.trim() === b || a.indexOf(b) >= 0) return a;
    return a.trim() ? a.replace(/\s+$/, '') + '\n\n' + (label || SP.t('hub.fromImport')) + '\n' + b : b;
  }

  /* ---------- Слой «Курс» (файлы автора в репозитории GitHub) ---------- */
  function baseKey() { return 'studyplay-base-v1' + (window.SP_GROUP_DIR ? ':' + window.SP_GROUP_DIR : ''); }
  var base = SP.store.get(baseKey(), null);
  function buildBase(man, sch) {
    man = man || {}; sch = sch || {}; var files = [];
    (Array.isArray(man.files) ? man.files : []).forEach(function (f) { if (f && f.name) files.push(f); });
    (Array.isArray(man.links) ? man.links : []).forEach(function (l) { if (l && l.url) files.push(Object.assign({}, l, { kind: 'link', name: l.name || l.url })); });
    return {
      version: String(man.version || sch.version || ''), fetchedAt: Date.now(),
      timeSlots: Array.isArray(sch.timeSlots) && sch.timeSlots.length ? sch.timeSlots : null,
      subjects: Array.isArray(sch.subjects) ? sch.subjects : (Array.isArray(man.subjects) ? man.subjects : []),
      schedule: Array.isArray(sch.schedule) ? sch.schedule : [], files: files
    };
  }
  function fetchBase() {
    if (location.protocol === 'file:' || navigator.onLine === false) return Promise.resolve(null);
    var get = function (u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
    var gd = window.SP_GROUP_DIR ? 'data/' + window.SP_GROUP_DIR + '/' : 'data/';
    return Promise.all([get(gd + 'manifest.json'), get(gd + 'schedule.json')]).then(function (r) {
      if (!r[0] && !r[1] && window.SP_LEGACY && gd !== 'data/') return Promise.all([get('data/manifest.json'), get('data/schedule.json')]);
      return r;
    }).then(function (r) { return (!r[0] && !r[1]) ? null : buildBase(r[0], r[1]); });
  }
  var baseChanged = function (r) { return !base || base.version !== r.version || (!r.version && JSON.stringify([base.schedule, base.files]) !== JSON.stringify([r.schedule, r.files])); };

  function stripLayers() {
    data.subjects.forEach(function (s) {
      s.materials = (s.materials || []).filter(function (f) { return !f.base; });
      s.tests = (s.tests || []).filter(function (f) { return !f.base; });
    });
    data.subjects = data.subjects.filter(function (s) { return !s.base || hasOwn(s); });
  }
  function ensureSubject(bs, tag) {
    if (!bs || !bs.name) return null;
    /* папку курса удалили вручную — не создаём её снова */
    if (tag && data.removed && data.removed[lc(cleanName(bs.name))]) return null;
    var m = findMine(bs);
    if (!m) { m = { id: String(bs.id || 'base-' + lc(cleanName(bs.name))), name: bs.name, code: bs.code || '', teacher: bs.teacher || '', materials: [], tests: [], notes: '', base: tag || true }; if (getSubject(m.id)) m.id = uid(); data.subjects.push(m); }
    else { if (!m.teacher && bs.teacher) m.teacher = bs.teacher; if (!m.code && bs.code) m.code = bs.code; }
    return m;
  }

  /* Собрать все слои заново */
  function applyLayers() {
    stripLayers();
    var B = base || { subjects: [], schedule: [], files: [], timeSlots: null, version: '' };
    var idMap = new Map();
    (B.subjects || []).forEach(function (bs) { var m = ensureSubject(bs, 'course'); if (m) idMap.set(bs.id, m.id); });
    var bm = new Map(), bt = new Map();
    (B.files || []).forEach(function (bf) {
      var m = bf.subjectId && idMap.has(bf.subjectId) ? getSubject(idMap.get(bf.subjectId)) : (bf.subject ? findMine({ name: bf.subject, code: '' }) : null);
      if (!m && bf.subject) m = ensureSubject({ name: bf.subject }, 'course');
      if (!m) return;
      var isLink = bf.kind === 'link' || (bf.url && !bf.path), isTest = bf.kind === 'test';
      var own = isTest ? m.tests : m.materials;
      if (isLink) { var u = normUrl(bf.url); if (!u || own.some(function (x) { return x.kind === 'link' && normUrl(x.url) === u; })) return; }
      else if (own.some(function (x) { return x.name === bf.name; })) return;
      var item = isLink ? { id: 'base:' + normUrl(bf.url), kind: 'link', name: bf.name, url: normUrl(bf.url), note: bf.note || '', base: true }
        : { id: 'base:' + (bf.path || bf.name), name: bf.name, path: bf.path, type: bf.type || '', size: bf.size || 0, base: true };
      var mp = isTest ? bt : bm; if (!mp.has(m.id)) mp.set(m.id, []); mp.get(m.id).push(item);
    });
    data.subjects.forEach(function (s) {
      if (bm.has(s.id)) s.materials = bm.get(s.id).concat(s.materials);
      if (bt.has(s.id)) s.tests = bt.get(s.id).concat(s.tests);
    });

    /* Слой Timetable */
    var tt = SP.data && SP.data.timetable(), ttMap = new Map();
    if (tt && Array.isArray(tt.subjects)) tt.subjects.forEach(function (ts) { var m = ensureSubject(ts, 'timetable'); if (m) ttMap.set(ts.id, m.id); });

    /* Какое расписание показать */
    var avail = availableSources(), pref = data.pref;
    var src = (pref !== 'auto' && avail.indexOf(pref) >= 0) ? pref : (avail.indexOf('own') >= 0 ? 'own' : avail.indexOf('timetable') >= 0 ? 'timetable' : avail.indexOf('course') >= 0 ? 'course' : '');
    data.source = src;
    if (src === 'own') { data.schedule = data.own.schedule; data.timeSlots = data.own.timeSlots && data.own.timeSlots.length ? data.own.timeSlots : defaultSlots(); }
    else if (src === 'timetable') { data.timeSlots = tt.timeSlots && tt.timeSlots.length ? tt.timeSlots : defaultSlots(); data.schedule = tt.schedule.map(function (l) { return Object.assign({}, l, { subjectId: ttMap.get(l.subjectId) || l.subjectId }); }); }
    else if (src === 'course') { data.timeSlots = B.timeSlots && B.timeSlots.length ? B.timeSlots : defaultSlots(); data.schedule = B.schedule.map(function (l) { return Object.assign({}, l, { subjectId: idMap.get(l.subjectId) || l.subjectId }); }); }
    else { data.schedule = []; data.timeSlots = defaultSlots(); }
    data.baseVersion = B.version || '';
    SP.emit('hub');
  }
  function availableSources() {
    var a = [];
    if (data.own && data.own.schedule && data.own.schedule.length) a.push('own');
    var tt = SP.data && SP.data.timetable(); if (tt && tt.schedule && tt.schedule.length) a.push('timetable');
    if (base && base.schedule && base.schedule.length) a.push('course');
    return a;
  }

  function refreshBase(manual) {
    return fetchBase().then(function (r) {
      if (!r) { if (manual) SP.toast(SP.t('hub.courseFail'), 'danger'); return false; }
      var changed = baseChanged(r);
      if (!changed && !manual) return false;
      base = r; SP.store.set(baseKey(), base); applyLayers();
      if (manual || changed) SP.toast(changed ? SP.t('hub.courseUpdated', { v: r.version || '—' }) : SP.t('hub.courseActual'), 'success');
      return changed;
    });
  }
  /* Проверка новой версии курса (тихо, раз в минуту) */
  var lastChk = 0, pendBase = null;
  function checkUpdate() {
    if (Date.now() - lastChk < 60000) return Promise.resolve(null);
    lastChk = Date.now();
    return fetchBase().then(function (r) { if (r && base && baseChanged(r)) { pendBase = r; SP.emit('hub-update', r); } return pendBase; });
  }
  function acceptUpdate() { if (!pendBase) return; base = pendBase; pendBase = null; SP.store.set(baseKey(), base); applyLayers(); SP.toast(SP.t('hub.courseUpdated', { v: base.version || '—' }), 'success'); }

  /* Путь к файлу курса на сайте (с учётом папки группы и разных записей кириллицы) */
  var encSeg = function (x) { try { return encodeURIComponent(decodeURIComponent(x)); } catch (e) { return encodeURIComponent(x); } };
  function siteCands(p) {
    p = String(p || '').trim().replace(/\\/g, '/').replace(/^\.?\//, '');
    if (/^https?:\/\//i.test(p)) return [p];
    var d = window.SP_GROUP_DIR, c = [];
    var add = function (x) { x = x.split('/').map(encSeg).join('/'); if (c.indexOf(x) < 0) c.push(x); };
    [p, p.normalize('NFC'), p.normalize('NFD')].forEach(function (q) {
      add(q);
      if (d) {
        if (q.indexOf('data/files/') === 0) add('data/' + d + '/files/' + q.slice(11));
        var pre = 'data/' + d + '/files/'; if (q.indexOf(pre) === 0) add('data/files/' + q.slice(pre.length));
        if (q.indexOf('data/') !== 0) { add('data/' + d + '/' + q); add('data/' + q); }
      }
    });
    return c;
  }
  function fetchSite(p, head) {
    if (location.protocol === 'file:') return Promise.reject(new Error(SP.t('hub.fileProtocol')));
    var cs = siteCands(p), st = 0, i = 0;
    function next() {
      if (i >= cs.length) return Promise.reject(new Error((st ? 'HTTP ' + st : SP.t('err.OFFLINE')) + ' — ' + SP.t('hub.fileNotFound', { path: decodeURI(cs[0]) })));
      var u = cs[i++];
      return fetch(u, { method: head ? 'HEAD' : 'GET', cache: 'no-cache' }).then(function (r) { if (r.ok) return { r: r, u: u }; st = st || r.status; return next(); }, next);
    }
    return next();
  }

  /* ---------- Импорт расписания из HTML (Timetable или сохранённая страница) ---------- */
  function parseScheduleHtml(text) {
    var doc = new DOMParser().parseFromString(text, 'text/html');
    var DN = [['понедельник', 'дүйсенбі', 'monday'], ['вторник', 'сейсенбі', 'tuesday'], ['среда', 'сәрсенбі', 'wednesday'], ['четверг', 'бейсенбі', 'thursday'], ['пятница', 'жұма', 'friday'], ['суббота', 'сенбі', 'saturday']];
    var dayOf = function (txt) { var t = lc(txt); for (var i = 0; i < DN.length; i++) for (var j = 0; j < DN[i].length; j++) if (t.indexOf(DN[i][j]) === 0) return i; return -1; };
    var best = null;
    SP.$$('table', doc).some(function (t) {
      return Array.prototype.some.call(t.rows, function (tr) {
        var cells = Array.prototype.slice.call(tr.cells), idx = cells.map(function (c) { return dayOf(c.textContent); });
        if (idx.filter(function (i) { return i >= 0; }).length >= 3) {
          best = { table: t, head: tr, cols: cells.map(function (c, ci) { return { ci: ci, day: idx[ci] }; }).filter(function (x) { return x.day >= 0; }) };
          return true;
        }
        return false;
      });
    });
    if (!best) throw new Error(SP.t('hub.htmlNoTable'));
    var lines = function (el) {
      var out = [], cur = '';
      var flush = function () { var s = cur.replace(/\s+/g, ' ').trim(); if (s) out.push(s); cur = ''; };
      var walk = function (n) {
        if (n.nodeType === 3) { cur += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        var tg = n.tagName;
        /* поле «Мессенджер: ID конференции» — там преподаватель оставляет ссылку */
        if (tg === 'INPUT') { var v = String(n.getAttribute('value') || '').trim(); if (v && n.type !== 'hidden') { flush(); out.push(LINK_MARK + v); } return; }
        if (/^(SCRIPT|STYLE|BUTTON|SELECT|TEXTAREA|SVG)$/.test(tg)) return;
        if (tg === 'BR') { flush(); return; }
        var blk = /^(DIV|P|LI|TR|TABLE|UL|OL|H\d)$/.test(tg); if (blk) flush();
        Array.prototype.forEach.call(n.childNodes, walk); if (blk) flush();
      };
      walk(el); flush(); return out;
    };
    var NOISE = /мессенджер|id\s*конф|^[▲▼▴▾⏶⏷\s]+$|^undefined$|^null$/i, CODE = /^\s*\d{3,}\)\s*/;
    var rows = [], slotMap = new Map(), all = Array.prototype.slice.call(best.table.rows);
    all.slice(all.indexOf(best.head) + 1).forEach(function (tr) {
      var cells = Array.prototype.slice.call(tr.cells); if (cells.length < 2) return;
      var tm = (cells[0].textContent.match(/\d{1,2}:\d{2}/g) || []); if (tm.length < 2) return;
      var fix = function (t) { return t.length === 4 ? '0' + t : t; };
      var st = fix(tm[0]) + ':00', en = fix(tm[1]) + ':00', key = st + '|' + en;
      if (!slotMap.has(key)) slotMap.set(key, { id: 'slot' + slotMap.size, start: st, end: en });
      var offset = cells.length - best.head.cells.length;
      best.cols.forEach(function (c) {
        var cell = cells[c.ci + offset]; if (!cell) return;
        var ls = lines(cell).filter(function (x) { return x.charAt(0) === LINK_MARK || !NOISE.test(x); });
        if (!ls.some(function (x) { return x.charAt(0) !== LINK_MARK; })) return;
        var groups = [];
        ls.forEach(function (x) { if (x.charAt(0) !== LINK_MARK && (!groups.length || (CODE.test(x) && groups[groups.length - 1].length > 1))) groups.push([x]); else if (groups.length) groups[groups.length - 1].push(x); });
        groups.forEach(function (g) {
          var name = g[0], room = '', teacher = [], link = '';
          g.slice(1).forEach(function (x) {
            if (x.charAt(0) === LINK_MARK) { if (!link) link = x.slice(1); return; }
            if (!room && /\(.+\)|корпус|ауд|ғимарат/i.test(x) && !/\d+\s*\/\s*\d+\s*ч/.test(x)) room = x; else teacher.push(x);
          });
          rows.push({ day: c.day, slotKey: key, name: name, room: room, teacher: teacher.join(' '), link: link });
        });
      });
    });
    if (!rows.length) throw new Error(SP.t('hub.htmlNoLessons'));
    var slots = Array.from(slotMap.values()).sort(function (a, b) { return a.start.localeCompare(b.start); });
    var subjects = [], byName = new Map();
    var schedule = rows.map(function (r, i) {
      var bn = cleanName(r.name), m = bn.match(ABBR_RE); if (m && m[1].trim()) bn = m[1].trim();
      var k = lc(bn), sj = byName.get(k);
      if (!sj) { sj = { id: 'subj-' + (byName.size + 1) + '-' + uid().slice(-4), code: '', name: bn, teacher: '', materials: [], tests: [], notes: '' }; byName.set(k, sj); subjects.push(sj); }
      if (!sj.teacher && r.teacher) sj.teacher = r.teacher.replace(/\s*\(\s*\d+\s*\/\s*\d+\s*ч?\s*\)\s*$/, '').trim();
      var slot = slots.filter(function (s) { return s.start + '|' + s.end === r.slotKey; })[0];
      return { id: 'lesson-' + (i + 1), day: r.day, slotId: slot.id, subjectId: sj.id, name: r.name, room: r.room, building: '', teacher: r.teacher };
    });
    /* ссылки привязаны к конкретной неделе, поэтому идут отдельно от расписания */
    var links = rows.filter(function (r) { return r.link; }).map(function (r) { return { day: r.day, start: r.slotKey.split('|')[0], name: r.name, url: r.link }; });
    return { timeSlots: slots, subjects: subjects, schedule: schedule, links: links };
  }
  var LINK_MARK = '\u0001';

  /* ---------- Слой «Timetable»: расписание и ссылки от программы «Мои оценки» ----------
     Программа присылает несколько недель (HTML таблиц как на timetable.kgu.kz).
     Расписание берём с текущей недели (или ближайшей, где есть пары), ссылки — со всех недель по датам. */
  var TT_KEY = 'sp-timetable-v1';
  function isoDay(d) { return d.getFullYear() + '-' + SP.pad2(d.getMonth() + 1) + '-' + SP.pad2(d.getDate()); }
  function mondayOf(d) { var x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function ttLinkKey(start, name) { return String(start).slice(0, 5) + '|' + lc(cleanName(name)); }
  function importTimetable(payload) {
    if (!payload || payload.format !== 'studyplay-timetable' || !Array.isArray(payload.weeks)) throw new Error('format');
    var weeks = payload.weeks.map(function (w) {
      var p; try { p = parseScheduleHtml(w.html); } catch (e) { p = { schedule: [], subjects: [], timeSlots: [], links: [] }; }
      p.monday = String(w.monday || ''); return p;
    }).filter(function (w) { return /^\d{4}-\d{2}-\d{2}$/.test(w.monday); }).sort(function (a, b) { return a.monday.localeCompare(b.monday); });
    var now = isoDay(mondayOf(new Date())), full = weeks.filter(function (w) { return w.schedule.length; });
    var pick = full.filter(function (w) { return w.monday === now; })[0] || full.filter(function (w) { return w.monday > now; })[0] || full[full.length - 1];
    if (!pick) throw new Error('empty');
    /* постоянные id предметов — чтобы папки и порядок не «прыгали» от обновления к обновлению */
    var ids = {};
    pick.subjects.forEach(function (s) { var nid = 'tt:' + lc(cleanName(s.name)); ids[s.id] = nid; s.id = nid; });
    pick.schedule.forEach(function (l) { l.subjectId = ids[l.subjectId] || l.subjectId; });

    var old = SP.store.get(TT_KEY, null), first = !old;
    var sig = function (t) { if (!t) return ''; var st = {}; (t.timeSlots || []).forEach(function (s) { st[s.id] = s.start; }); return JSON.stringify((t.schedule || []).map(function (l) { return [l.day, st[l.slotId], l.name, l.room, l.teacher]; }).sort()); };
    /* ссылки: недели, которые пришли, заменяем целиком; более старые остаются */
    var links = Object.assign({}, old && old.links), news = [];
    weeks.forEach(function (w) {
      var m = new Date(w.monday + 'T12:00:00');
      for (var d = 0; d < 6; d++) delete links[isoDay(new Date(m.getTime() + d * 864e5))];
      w.links.forEach(function (k) {
        var date = isoDay(new Date(m.getTime() + k.day * 864e5)), key = ttLinkKey(k.start, k.name);
        (links[date] = links[date] || {})[key] = k.url;
        var was = old && old.links && old.links[date] && old.links[date][key];
        if (!first && was !== k.url) news.push({ date: date, name: cleanName(k.name).replace(ABBR_RE, '$1'), url: k.url });
      });
    });
    var next = { at: new Date().toISOString(), monday: pick.monday, timeSlots: pick.timeSlots, subjects: pick.subjects, schedule: pick.schedule, links: links };
    var changed = !first && sig(old) !== sig(next);
    SP.store.set(TT_KEY, next);
    if (first) { data.pref = 'timetable'; save(); }
    applyLayers();
    return { first: first, changed: changed, lessons: pick.schedule.length, news: news };
  }
  function ttLink(date, start, name) {
    var t = SP.store.get(TT_KEY, null), day = t && t.links && t.links[isoDay(date)];
    return day ? day[ttLinkKey(start, name)] || '' : '';
  }

  /* ---------- Импорт файлов расписания StudyPlay (JSON / HTML) ---------- */
  function mergeFiles(target, incoming) {
    var n = 0;
    return (Array.isArray(incoming) ? incoming : []).reduce(function (p, raw) {
      return p.then(function () {
        if (!raw || !raw.name) return;
        if (raw.kind === 'link' || (raw.url && !raw.content)) {
          var u = normUrl(raw.url); if (!u) return;
          if (target.some(function (x) { return x.kind === 'link' && normUrl(x.url) === u; })) return;
          target.push({ id: uid(), kind: 'link', name: raw.name, url: u, note: raw.note || '', pinned: !!raw.pinned }); n++; return;
        }
        if (!raw.content || target.some(function (x) { return sameFile(x, raw); })) return;
        var f = Object.assign({}, raw, { id: uid(), stored: false }); delete f.missing; delete f.base;
        return persistFile(f).then(function () { target.push(f); n++; });
      });
    }, Promise.resolve()).then(function () { return n; });
  }

  function importFiles(list) {
    var rep = { files: 0, subj: 0, items: 0, notes: 0, sched: 0, schedSkipped: false, lost: 0, errs: [] };
    return loadAllContent().then(function () {
      return list.reduce(function (p, f) {
        return p.then(function () {
          return f.text().then(function (txt) {
            var parsed;
            if (/\.html?$/i.test(f.name) || /^\s*</.test(txt)) parsed = parseScheduleHtml(txt);
            else { try { parsed = JSON.parse(txt); } catch (x) { throw new Error(SP.t('hub.importBad')); } }
            if (!parsed || typeof parsed !== 'object' || (!Array.isArray(parsed.subjects) && !Array.isArray(parsed.schedule))) throw new Error(SP.t('hub.importEmpty'));
            var inc = Array.isArray(parsed.schedule) ? parsed.schedule : [];
            inc.forEach(function (l) { var d = Number(l.day); if (!Number.isInteger(d) || d < 0 || d > 5) throw new Error(SP.t('hub.importDay', { name: l.name || '?' })); });
            var takeP = Promise.resolve(inc.length > 0);
            if (inc.length && data.own && data.own.schedule.length) {
              takeP = SP.confirm({ title: SP.t('hub.replaceTitle'), text: SP.t('hub.replaceText', { name: f.name }), okLabel: SP.t('hub.replace') });
            }
            return takeP.then(function (take) {
              if (inc.length && !take) rep.schedSkipped = true;
              var mapped = new Map();
              return (Array.isArray(parsed.subjects) ? parsed.subjects : []).reduce(function (q, sj) {
                return q.then(function () {
                  if (!sj || typeof sj !== 'object') return;
                  var m = findMine(sj);
                  if (!m) { m = { id: (sj.id && !getSubject(sj.id)) ? String(sj.id) : uid(), name: sj.name || SP.t('hub.noName'), code: sj.code || '', teacher: sj.teacher || '', materials: [], tests: [], notes: '' }; data.subjects.push(m); rep.subj++; }
                  else { delete m.base; if (!m.code && sj.code) m.code = sj.code; if (!m.teacher && sj.teacher) m.teacher = sj.teacher; }
                  mapped.set(sj.id, m.id);
                  return mergeFiles(m.materials, sj.materials).then(function (a) { rep.items += a; return mergeFiles(m.tests, sj.tests); }).then(function (b) {
                    rep.items += b; var before = m.notes; m.notes = mergeNotes(m.notes, sj.notes); if (m.notes !== before) rep.notes++;
                  });
                });
              }, Promise.resolve()).then(function () {
                if (inc.length && take) {
                  var sched = inc.map(function (l) { return Object.assign({}, l, { subjectId: mapped.get(l.subjectId) || l.subjectId }); }).filter(function (l) { var ok = !!getSubject(l.subjectId); if (!ok) rep.lost++; return ok; });
                  data.own = { schedule: sched, timeSlots: Array.isArray(parsed.timeSlots) && parsed.timeSlots.length ? parsed.timeSlots : defaultSlots() };
                  data.pref = 'own'; rep.sched = sched.length;
                }
                rep.files++;
              });
            });
          }).catch(function (err) { rep.errs.push(f.name + ': ' + err.message); });
        });
      }, Promise.resolve());
    }).then(function () { if (rep.files) { save(); applyLayers(); } return rep; });
  }

  /* Резервная копия: расписание + все папки (с файлами) одним JSON */
  function exportAll() {
    return loadAllContent().then(function () {
      var miss = allFiles().filter(function (f) { return !f.content; }).length;
      var clean = function (f) { var r = Object.assign({}, f); delete r.stored; delete r.missing; return r; };
      var out = {
        format: 'StudyPlay-Academic', version: 2, updatedAt: new Date().toISOString(),
        timeSlots: data.timeSlots, schedule: data.schedule,
        subjects: data.subjects.map(function (x) {
          var r = Object.assign({}, x); delete r.base;
          r.materials = (x.materials || []).filter(function (f) { return !f.base && (f.content || f.kind === 'link'); }).map(clean);
          r.tests = (x.tests || []).filter(function (f) { return !f.base && f.content; }).map(clean);
          return r;
        })
      };
      SP.downloadText(JSON.stringify(out), 'studyplay-schedule.json', 'application/json');
      SP.toast(miss ? SP.t('hub.exportMissing', { n: miss }) : SP.t('hub.exportOk'), miss ? 'warning' : 'success');
    });
  }

  /* Для автора: schedule.json и manifest.json для папки группы на GitHub */
  function nextVersion() {
    var t = new Date().toISOString().slice(0, 10), m = String((base && base.version) || '').match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/);
    return m && m[1] === t ? t + '.' + (+m[2] + 1) : t + '.1';
  }
  function exportGithub(which) {
    var safe = function (n) { return String(n || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'subject'; };
    var ver = nextVersion(), files = [], dir = window.SP_GROUP_DIR || '';
    data.subjects.forEach(function (s) {
      var sd = safe(cleanName(s.name));
      [[s.materials, 'material'], [s.tests, 'test']].forEach(function (pair) {
        (pair[0] || []).forEach(function (f) {
          if (f.kind === 'link') files.push({ subject: s.name, kind: 'link', name: f.name, url: f.url, note: f.note || '' });
          else files.push({ subject: s.name, kind: pair[1], name: f.name, path: f.base && f.path ? f.path : 'data/' + (dir ? dir + '/' : '') + 'files/' + sd + '/' + f.name, size: f.size || 0 });
        });
      });
    });
    if (which === 'manifest') {
      SP.downloadText(JSON.stringify({ version: ver, files: files }, null, 2), 'manifest.json', 'application/json');
      SP.toast(SP.t('hub.manifestOk', { v: ver, dir: dir || '…' }), 'success', { ms: 9000 });
    } else {
      var sched = { version: ver, updatedAt: new Date().toISOString(), timeSlots: data.timeSlots, subjects: data.subjects.map(function (s) { return { id: s.id, code: s.code || '', name: s.name, teacher: s.teacher || '' }; }), schedule: data.schedule };
      SP.downloadText(JSON.stringify(sched, null, 2), 'schedule.json', 'application/json');
      SP.toast(SP.t('hub.scheduleOk', { v: ver, dir: dir || '…' }), 'success', { ms: 9000 });
    }
  }

  /* ---------- Файлы сокурсника (тесты и заметки отдельно, пока не сохранены) ---------- */
  function importShared(files) {
    var ok = 0, nt = 0, nn = 0, errs = [];
    return files.reduce(function (p, f) {
      return p.then(function () {
        return f.text().then(function (txt) {
          var parsed; try { parsed = JSON.parse(txt); } catch (x) { throw new Error(SP.t('hub.importBad')); }
          if (!parsed || !Array.isArray(parsed.subjects)) throw new Error(SP.t('hub.importEmpty'));
          var sig = f.name + '|' + f.size; if (data.shared.some(function (g) { return g.sig === sig; })) throw new Error(SP.t('hub.sharedDup'));
          var subjects = [];
          return parsed.subjects.reduce(function (q, raw) {
            return q.then(function () {
              if (!raw || typeof raw !== 'object') return;
              var sj = { id: String(raw.id || uid()), name: String(raw.name || SP.t('hub.noName')), code: String(raw.code || ''), teacher: String(raw.teacher || ''), tests: [], notes: String(raw.notes || '').trim() };
              var mine = findMine(sj);
              return (Array.isArray(raw.tests) ? raw.tests : []).reduce(function (r2, t) {
                return r2.then(function () {
                  if (!t || !t.name || !t.content) return;
                  if (mine && mine.tests.some(function (x) { return sameFile(x, t); })) return;
                  var nf = Object.assign({}, t, { id: uid(), stored: false }); delete nf.missing;
                  return persistFile(nf).then(function () { sj.tests.push(nf); });
                });
              }, Promise.resolve()).then(function () {
                if (mine && sj.notes && String(mine.notes || '').indexOf(sj.notes) >= 0) sj.notes = '';
                if (sj.tests.length || sj.notes) subjects.push(sj);
              });
            });
          }, Promise.resolve()).then(function () {
            if (!subjects.length) throw new Error(SP.t('hub.sharedNothing'));
            data.shared.push({ id: uid(), sig: sig, name: f.name.replace(/\.(json|studyplay)$/i, ''), subjects: subjects });
            ok++; subjects.forEach(function (s) { nt += s.tests.length; if (s.notes) nn++; });
          });
        }).catch(function (e) { errs.push(f.name + ': ' + e.message); });
      });
    }, Promise.resolve()).then(function () {
      if (ok) SP.emit('hub');
      if (errs.length) SP.toast(SP.t('hub.notAdded') + ' ' + errs.join('; '), 'danger');
      else if (ok) SP.toast(SP.t('hub.sharedOk', { t: nt, n: nn }), 'success', { ms: 8000 });
      return ok;
    });
  }
  function mateOf(m) {
    var r = [];
    data.shared.forEach(function (g) { g.subjects.forEach(function (x) { var f = findMine(x); if (f && f.id === m.id) r.push({ g: g, sj: x }); }); });
    return r;
  }
  function mergeAllShared() {
    if (!data.shared.length) return Promise.resolve(null);
    var nt = 0, nn = 0;
    data.shared.forEach(function (g) {
      g.subjects.forEach(function (sj) {
        var m = findMine(sj);
        if (!m) { m = { id: getSubject(sj.id) ? uid() : sj.id, name: sj.name, code: sj.code, teacher: sj.teacher, materials: [], tests: [], notes: '' }; data.subjects.push(m); }
        else { delete m.base; if (!m.teacher) m.teacher = sj.teacher; if (!m.code) m.code = sj.code; }
        sj.tests.forEach(function (f) { if (m.tests.some(function (x) { return sameFile(x, f); })) { dropFile(f); return; } m.tests.push(f); nt++; });
        var before = m.notes; m.notes = mergeNotes(m.notes, sj.notes, SP.t('hub.mateNotesLabel')); if (m.notes !== before) nn++;
      });
    });
    data.shared = []; save(); SP.emit('hub');
    return Promise.resolve({ nt: nt, nn: nn });
  }

  /* ---------- Публичный интерфейс ---------- */
  SP.hub = {
    data: function () { return data; },
    save: save,
    applyLayers: applyLayers,
    availableSources: availableSources,
    setPref: function (p) { data.pref = p; save(); applyLayers(); },
    /* Удалить папки: свои — совсем, папки курса/Timetable — запомнить как удалённые */
    removeSubjects: function (ids) {
      var set = {}; ids.forEach(function (i) { set[i] = 1; });
      data.subjects.forEach(function (s) {
        if (!set[s.id]) return;
        (s.materials || []).concat(s.tests || []).forEach(dropFile);
        if (s.base) data.removed[lc(cleanName(s.name))] = 1;
      });
      data.subjects = data.subjects.filter(function (s) { return !set[s.id]; });
      if (data.own) data.own.schedule = data.own.schedule.filter(function (x) { return !set[x.subjectId]; });
      save(); applyLayers();
    },
    restoreRemoved: function () { data.removed = {}; save(); applyLayers(); },
    clearOwn: function () { data.own = null; if (data.pref === 'own') data.pref = 'auto'; save(); applyLayers(); },
    setOwn: function (timeSlots, schedule) { data.own = { timeSlots: timeSlots, schedule: schedule }; data.pref = 'own'; save(); applyLayers(); },
    getSubject: getSubject, findMine: findMine, cleanName: cleanName, lessonView: lessonView, kindClass: kindClass,
    normUrl: normUrl, sameFile: sameFile, uid: uid,
    persistFile: persistFile, dropFile: dropFile, loadAllContent: loadAllContent, idb: IDB,
    base: function () { return base; },
    refreshBase: refreshBase, checkUpdate: checkUpdate, acceptUpdate: acceptUpdate, pendingUpdate: function () { return pendBase; },
    fetchSite: fetchSite, parseScheduleHtml: parseScheduleHtml, importTimetable: importTimetable, ttLink: ttLink,
    importFiles: importFiles, exportAll: exportAll, exportGithub: exportGithub,
    importShared: importShared, mateOf: mateOf, mergeAllShared: mergeAllShared,
    subjectNames: function () { var seen = {}; return data.subjects.map(function (x) { return cleanName(x.name); }).filter(function (n) { if (!n || seen[n]) return false; seen[n] = 1; return true; }); },
    defaultSlots: defaultSlots,
    /* Пересчитать после смены группы (другая папка курса) */
    reloadBase: function () { base = SP.store.get(baseKey(), null); applyLayers(); return refreshBase(false); }
  };

  SP.on('data', function () { applyLayers(); });
  SP.on('auth', function () { SP.hub.reloadBase(); });
  applyLayers();
  IDB.ready().then(function () { return loadAllContent(); }).then(function () { SP.emit('hub'); });
  if (!base) refreshBase(false); else setTimeout(function () { checkUpdate(); }, 1500);
})();

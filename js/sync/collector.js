/* =====================================================================
   СБОРЩИК StudyPlay — оценки из Platonus, расписание со ссылками из Timetable,
   академический календарь. Один файл для всех телефонов:
     • Android-приложение StudyPlay (сайт внутри приложения, запросы идут напрямую);
     • iPhone — скрипт в приложении Scriptable (скачивает этот файл с сайта при каждом запуске).
   Поэтому, когда меняется сайт, телефоны меняются вместе с ним.
   Без DOM: только запросы и регулярные выражения. Пароль никуда, кроме самих
   platonus.kgu.kz и timetable.kgu.kz, не отправляется.
   Результат — тот же формат, что у программы для Windows («studyplay-grades»
   с вложенными timetable и calendar), сайт принимает его теми же функциями.
   ===================================================================== */
(function (root) {
  'use strict';
  var PL = 'https://platonus.kgu.kz', TT = 'https://timetable.kgu.kz';
  var NET_RX = /\(50[234]\)|\b50[234]\b|шлюз|недоступ|тайм-?аут|timed out|timeout|network|соедин|connect|resolve|разреш|failed to fetch|offline/i;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var noon = function (s) { return new Date(s + 'T12:00:00'); };
  var mondayOf = function (d) { var x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  var decode = function (s) {
    return String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  };
  /* пауза между запросами; в Scriptable нет setTimeout — там просто без паузы */
  var sleep = function (ms) { return new Promise(function (r) { if (typeof root.setTimeout === 'function') root.setTimeout(r, ms); else r(); }); };
  function json(text, what) { try { return JSON.parse(text); } catch (e) { throw new Error('Неожиданный ответ ' + what + '.'); } }

  /* ---------- http: обёртка с «банкой» cookies (для Scriptable и фоновой проверки) ----------
     raw(method, url, headers, body) → Promise<{ status, text, cookies: ['a=b', …] }> */
  function jarHttp(raw) {
    var jar = {};
    return function (method, url, o) {
      o = o || {};
      var host = url.replace(/^https?:\/\/([^/]+).*$/, '$1'), headers = Object.assign({}, o.headers), body = null;
      var c = Object.keys(jar[host] || {}).map(function (k) { return k + '=' + jar[host][k]; }).join('; ');
      if (c) headers.Cookie = c;
      if (o.json !== undefined) { headers['Content-Type'] = 'application/json; charset=UTF-8'; body = JSON.stringify(o.json); }
      if (o.form) { headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'; body = formBody(o.form); }
      return raw(method, url, headers, body).then(function (r) {
        (r.cookies || []).forEach(function (s) { var m = String(s).match(/^\s*([^=;\s]+)=([^;]*)/); if (m) (jar[host] = jar[host] || {})[m[1]] = m[2]; });
        return r;
      });
    };
  }
  /* обычный fetch (Android-приложение: запросы и cookies обрабатывает сам телефон) */
  function fetchHttp(f) {
    f = f || root.fetch.bind(root);
    return function (method, url, o) {
      o = o || {};
      var headers = Object.assign({}, o.headers), body;
      if (o.json !== undefined) { headers['Content-Type'] = 'application/json; charset=UTF-8'; body = JSON.stringify(o.json); }
      if (o.form) { headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'; body = formBody(o.form); }
      return f(url, { method: method, headers: headers, body: body, credentials: 'include' }).then(function (r) {
        return r.text().then(function (t) { return { status: r.status, text: t }; });
      });
    };
  }
  function formBody(f) { return Object.keys(f).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(f[k] == null ? '' : f[k]); }).join('&'); }
  function check(r, what) { if (r.status >= 500) throw new Error(what + ' не отвечает (' + r.status + ').'); return r; }

  /* ---------- Platonus: вход, журнал, текущие оценки, календарь ---------- */
  async function platonus(h, cr, o) {
    var st = o.status || function () { };
    st('Вход на platonus.kgu.kz…');
    check(await h('GET', PL + '/'), 'Platonus');
    var r = json((await h('POST', PL + '/rest/api/login', { json: { login: cr.login, iin: null, icNumber: null, password: cr.pw }, headers: { language: '1' } })).text, 'Platonus');
    if (r.login_status === 'verificationCode') {
      var code = o.ask ? await o.ask('На почту ' + (r.email || '') + ' отправлен код подтверждения. Введите 6 цифр:') : '';
      if (!code) throw new Error('Вход отменён: код не введён.');
      r = json((await h('POST', PL + '/rest/api/verifyCode', { json: { challengeId: r.challengeId, code: String(code).trim() }, headers: { language: '1' } })).text, 'Platonus');
    }
    if (r.login_status !== 'success') throw new Error('Не удалось войти в Platonus: ' + (r.message || 'проверьте логин и пароль'));
    var auth = { token: r.auth_token, sid: r.sid, language: '1' };
    await h('GET', PL + '/login', { headers: auth });
    var out = {};
    if (o.grades !== false) {
      st('Открываю журнал оценок…');
      var html = check(await h('GET', PL + '/student_register', { headers: auth }), 'Platonus').text;
      var sid = (html.match(/name="studentID"\s+value="(\d+)"/) || [])[1];
      var sel = function (name) {
        var s = (html.match(new RegExp('<select[^>]*name="' + name + '"[^>]*>([\\s\\S]*?)</select>', 'i')) || [])[1] || '';
        return (s.match(/VALUE="(-?\d+)"\s*selected/i) || [])[1];
      };
      var year = sel('year'), term = sel('term');
      if (!sid || !year || !term) throw new Error('Не удалось определить студента или семестр в журнале Platonus.');
      var subjects = json(check(await h('GET', PL + '/journal/' + year + '/' + term + '/' + sid, { headers: auth }), 'Platonus').text, 'журнала');
      var marks = {};
      for (var i = 0; i < subjects.length; i++) {
        var s = subjects[i]; st('Загружаю текущие оценки (' + (i + 1) + ' из ' + subjects.length + ')…');
        try { marks[s.subjectID] = json((await h('GET', PL + '/subject/' + year + '/' + term + '/' + s.subjectID + '/' + sid + '?queryID=' + s.queryID, { headers: auth })).text, 'оценок'); }
        catch (e) { marks[s.subjectID] = []; }
      }
      out.grades = buildGrades(subjects, marks, year, term);
    }
    if (o.calendar) {
      try { st('Обновляю академический календарь…'); out.calendar = parseCalendar((await h('GET', PL + '/calendarview', { headers: auth })).text); } catch (e) { /* без календаря — тоже можно */ }
    }
    return out;
  }

  /* Журнал Platonus → предметы для сайта (как Build-Result + StudyPlay-Json в программе для Windows) */
  function cleanSubject(n) { return String(n || '').replace(/\(_[^)]*\)\s*$/, '').trim(); }
  function lessonType(n) {
    var suf = String(n || '').trim().split('-').pop();
    if (/^Lab$/.test(suf)) return 'Лабораторная';
    if (/^L$/.test(suf)) return 'Лекция';
    if (/^(P|S)$/.test(suf)) return 'Практика';
    if (/^SRO|^SRS/.test(suf)) return 'СРО';
    return String(n || '').trim();
  }
  function fmt(v) {
    if (typeof v !== 'number') return String(v == null ? '' : v);
    return Math.floor(v) === v ? String(v) : String(Math.round(v * 100) / 100);
  }
  function markDate(d) {
    if (d && typeof d === 'object' && d.Year) return new Date(d.Year, d.Month - 1, d.Day, 12);
    var m = String(d || '').match(/\/Date\((-?\d+)/); if (m) return new Date(+m[1]);
    var x = new Date(d); return isNaN(x) ? null : x;
  }
  function buildGrades(subjects, marks, year, term) {
    var subs = (subjects || []).map(function (s) {
      var name = cleanSubject(s.subjectName), exams = {};
      (s.exams || []).forEach(function (e) { if (e && e.name && e.mark != null && String(e.mark) !== '' && exams[e.name] === undefined) exams[e.name] = String(e.mark); });
      var cur = [];
      (marks[s.subjectID] || []).forEach(function (ct) {
        if (!ct || !ct.Marks) return;
        Object.keys(ct.Marks).forEach(function (mk) {
          var mm = ct.Marks[mk] && ct.Marks[mk].Marks; if (!mm) return;
          Object.keys(mm).forEach(function (dk) {
            (Array.isArray(mm[dk]) ? mm[dk] : [mm[dk]]).forEach(function (m) {
              if (!m || !(m.MarkType === 1 || m.MarkType === 17 || m.MarkType >= 100)) return;
              var useName = m.MarkType >= 100 || ((m.Mark === -1 || m.AddMarkTypeID !== 0) && m.MarkName);
              var d = markDate(m.MarkDate); if (!d) return;
              cur.push({ type: lessonType(ct.Name), date: ymd(d), mark: useName ? String(m.MarkName) : m.Mark === -3 ? 'т' : fmt(m.Mark) });
            });
          });
        });
      });
      cur.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      return { subject: name, tutor: String(s.tutorList || ''), exams: exams, current: cur };
    });
    return { year: String(year), term: String(term), subjects: subs };
  }

  /* ---------- академический календарь (platonus.kgu.kz/calendarview) ---------- */
  var MONTHS = { 'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12 };
  function calRange(text, y1, y2) {
    var pp = String(text).replace(/\s+/g, ' ').trim().split(/\s*[-–—]\s*/).map(function (p) {
      var m = p.match(/^(\d{1,2})(?:\s+(\S+))?/); return m ? { d: +m[1], mon: MONTHS[String(m[2] || '').toLowerCase()] } : null;
    }).filter(Boolean);
    if (!pp.length || !pp[pp.length - 1].mon) return null;
    var last = pp[pp.length - 1]; if (!pp[0].mon) pp[0].mon = last.mon;
    var mk = function (p) { return new Date(p.mon >= 8 ? y1 : y2, p.mon - 1, p.d, 12); };
    var from = mk(pp[0]), to = mk(last); if (to < from) to.setFullYear(to.getFullYear() + 1);
    return { from: ymd(from), to: ymd(to) };
  }
  function parseCalendar(html) {
    html = String(html).replace(/<!--[\s\S]*?-->/g, '');
    var hy = html.match(/(\d{4})\s*-\s*(\d{4})\s+учебный/); if (!hy) throw new Error('На странице нет академического календаря.');
    var y1 = +hy[1], y2 = +hy[2], sems = [], events = [], card = -1, m;
    var rx = /<h4[^>]*>([\s\S]*?)<\/h4>|<td class="tdPeriodName">([\s\S]*?)<\/td>\s*<td class="tdPeriod">([\s\S]*?)<\/td>/g;
    while ((m = rx.exec(html))) {
      if (m[1] != null) { card++; sems.push({ name: decode(m[1]), start: '', end: '', weeks: 0 }); continue; }
      if (card < 0) continue;
      var name = decode(m[2]), val = decode(m[3]);
      if (/^Всего недель/.test(name)) { sems[card].weeks = parseInt(val.replace(/\D/g, ''), 10) || 0; continue; }
      var r = calRange(val, y1, y2); if (!r) continue;
      if (/^Начало семестра/.test(name)) { sems[card].start = r.from; continue; }
      if (/^Конец семестра/.test(name)) { sems[card].end = r.to; continue; }
      var kind = /Рубежн/.test(name) ? 'rk' : /сесси|аттестац/i.test(name) ? 'session' : /каникул/i.test(name) ? 'holiday' : /практик/i.test(name) ? 'practice' : /регистрац/i.test(name) ? 'registration' : 'other';
      events.push({ sem: card, kind: kind, name: name, from: r.from, to: r.to });
    }
    sems = sems.filter(function (s) { return s.start && s.end; });
    if (!sems.length) throw new Error('Не удалось прочитать даты семестров.');
    return { format: 'studyplay-calendar', version: 1, year: y1 + '-' + y2, taken: new Date().toISOString(), semesters: sems, events: events };
  }
  /* текущий семестр вместе с сессией: [с, по] (даты) или null */
  function calendarRange(cal, today) {
    if (!cal || !cal.semesters || !cal.semesters.length) return null;
    today = today || new Date();
    var t = ymd(today), ranges = cal.semesters.map(function (s, i) {
      var to = s.end; (cal.events || []).forEach(function (e) { if (e.sem === i && e.kind === 'session' && e.to > to) to = e.to; });
      return [s.start, to];
    });
    return ranges.filter(function (r) { return t <= r[1]; })[0] || ranges[ranges.length - 1];
  }

  /* ---------- Timetable: недели семестра, ссылки преподавателей ---------- */
  function timetableWeeks(page, cal, today) {
    today = today || new Date();
    var all = [], m, rx = /<option[^>]*>(\d{2})-(\d{2})-(\d{4})<\/option>/g;
    while ((m = rx.exec(page))) all.push(m[3] + '-' + m[2] + '-' + m[1]);
    all.sort();
    var r = calendarRange(cal, today);
    if (r) {
      var from = ymd(mondayOf(noon(r[0])));
      var pick = all.filter(function (w) { return w >= from && w <= r[1]; });
      if (pick.length) return pick;
    }
    var mon = mondayOf(today), lo = ymd(new Date(mon.getTime() - 56 * 864e5)), hi = ymd(new Date(mon.getTime() + 7 * 864e5));
    var fb = all.filter(function (w) { return w >= lo && w <= hi; });
    return fb.length ? fb : [ymd(mon)];
  }
  /* из таблицы убираем всё, что сайту не нужно (скрипты, стили, служебные атрибуты) — ссылка остаётся в value="" */
  function slim(html) {
    return String(html).replace(/\s(onclick|style|id|name|class|placeholder|readonly|title|href|type|size|align|border|valign)(="[^"]*")?(?=[\s>])/g, '')
      .replace(/<\/?font[^>]*>/g, '').replace(/\s{2,}/g, ' ');
  }
  async function timetable(h, cr, o) {
    var st = o.status || function () { };
    st('Вход на timetable.kgu.kz…');
    check(await h('GET', TT + '/index.php?page=login'), 'Timetable');
    await h('POST', TT + '/index.php?page=login', { form: { language: '1', username: cr.login, password: cr.pw, subEnter: 'Войти' } });
    var page = check(await h('GET', TT + '/index.php?page=student_timetable'), 'Timetable').text;
    var sid = (page.match(/id="STstudentID"\s+value="(\d+)"/) || [])[1];
    if (!sid || sid === '0') throw new Error('Не удалось войти в Timetable: проверьте логин и пароль.');
    var pick = timetableWeeks(page, o.calendarData), weeks = [];
    for (var i = 0; i < pick.length; i++) {
      st('Загружаю расписание (' + (i + 1) + ' из ' + pick.length + ')…');
      var p = pick[i].split('-');
      var html = (await h('POST', TT + '/ajax/load_student_table.php', { form: { studentID: sid, begd: p[2], begm: p[1], begy: p[0] } })).text;
      weeks.push({ monday: pick[i], html: slim(html) });
      await sleep(150);
    }
    var out = { format: 'studyplay-timetable', version: 2, taken: new Date().toISOString(), weeks: weeks };
    if (o.calendarData) out.calendar = o.calendarData;
    return out;
  }

  /* ---------- всё вместе ----------
     o: { http, creds: { pl: {login,pw}, tt: {login,pw} }, grades, timetable, calendar (данные или null),
          calendarMaxAgeDays (30), ask(text) → Promise<string>, status(text) }
     → Promise<{ bundle, errors: [], calendar }>, bundle — формат «studyplay-grades» */
  async function collect(o) {
    var h = o.http, errors = [], bundle = { format: 'studyplay-grades', version: 1, taken: new Date().toISOString(), year: '', term: '', subjects: [] };
    var cal = o.calendar || null;
    var stale = !o.skipCalendar && (!cal || !cal.taken || (Date.now() - new Date(cal.taken).getTime()) > (o.calendarMaxAgeDays || 30) * 864e5);
    var plCr = o.creds && o.creds.pl, ttCr = (o.creds && o.creds.tt) || plCr;
    if ((o.grades || (o.timetable && stale)) && plCr && plCr.login && plCr.pw) {
      try {
        var p = await platonus(h, plCr, { grades: !!o.grades, calendar: stale, ask: o.ask, status: o.status });
        if (p.grades) { bundle.year = p.grades.year; bundle.term = p.grades.term; bundle.subjects = p.grades.subjects; bundle.hasGrades = true; }
        if (p.calendar) cal = p.calendar;
      } catch (e) { if (o.grades) errors.push({ site: 'pl', message: friendly(e, 'pl') }); }
    }
    if (o.timetable && ttCr && ttCr.login && ttCr.pw) {
      try { bundle.timetable = await timetable(h, ttCr, { calendarData: cal, status: o.status }); }
      catch (e) { errors.push({ site: 'tt', message: friendly(e, 'tt') }); }
    }
    if (cal) bundle.calendar = cal;
    return { bundle: bundle, errors: errors, calendar: cal };
  }
  function friendly(e, site) {
    var msg = String((e && e.message) || e);
    if (NET_RX.test(msg)) return site === 'pl' ? 'Platonus сейчас не отвечает. Обычно он не работает ночью — примерно с 23:00 до 7:00.' : 'Timetable сейчас не отвечает. Попробуйте позже.';
    return msg;
  }

  /* Что нового в оценках по сравнению с прошлым разом — для уведомлений («Философия: 90») */
  function gradeNews(prev, next) {
    if (!prev || !prev.length) return [];
    var by = {}; prev.forEach(function (s) { by[s.subject] = s; });
    var out = [];
    (next || []).forEach(function (s) {
      var p = by[s.subject]; if (!p) return;
      var cnt = {}; (p.current || []).forEach(function (c) { var k = c.date + '|' + c.type + '|' + c.mark; cnt[k] = (cnt[k] || 0) + 1; });
      var fresh = [];
      (s.current || []).forEach(function (c) { var k = c.date + '|' + c.type + '|' + c.mark; if (cnt[k]) cnt[k]--; else fresh.push(c.mark); });
      Object.keys(s.exams || {}).forEach(function (k) { if (/^(РК|Экз|Итог|ДЗ)/i.test(k) && s.exams[k] !== (p.exams || {})[k] && /\d/.test(s.exams[k])) fresh.push(k + ': ' + s.exams[k]); });
      if (fresh.length) out.push(s.subject + ': ' + fresh.join(', '));
    });
    return out;
  }

  /* ---------- iPhone: скрипт для приложения Scriptable ----------
     Сам скрипт на телефоне — несколько строк: скачивает этот файл и вызывает runScriptable(env). */
  async function runScriptable(env) {
    var SITE = env.site || 'https://alantesterr.github.io/testerw/';
    var KC = 'studyplay-creds', K_LAST = 'studyplay-last', K_CAL = 'studyplay-calendar';
    var Alert = env.Alert, Keychain = env.Keychain;
    var load = function (k) { try { return Keychain.contains(k) ? JSON.parse(Keychain.get(k)) : null; } catch (e) { return null; } };
    var save = function (k, v) { Keychain.set(k, JSON.stringify(v)); };
    var arg = String((env.args && (env.args.shortcutParameter || (env.args.queryParameters || {}).mode)) || '').toLowerCase();
    var interactive = !!(env.config && env.config.runsInApp) || arg === 'open' || arg === 'setup';

    async function askCreds() {
      var a = new Alert(); a.title = 'StudyPlay'; a.message = 'Логин и пароль от Platonus. Хранятся только на этом iPhone (в связке ключей).';
      var old = load(KC) || {};
      a.addTextField('Логин', old.login || ''); a.addSecureTextField('Пароль', ''); a.addAction('Сохранить'); a.addCancelAction('Отмена');
      if (await a.present() === -1) return null;
      var c = { login: a.textFieldValue(0).trim(), pw: a.textFieldValue(1) };
      var b = new Alert(); b.title = 'Timetable'; b.message = 'В Timetable тот же логин и пароль?'; b.addAction('Да, тот же'); b.addAction('Нет, другой');
      if (await b.present() === 1) {
        var t = new Alert(); t.title = 'Timetable'; t.addTextField('Логин Timetable', c.login); t.addSecureTextField('Пароль Timetable', ''); t.addAction('Сохранить');
        await t.present(); c.tt = { login: t.textFieldValue(0).trim(), pw: t.textFieldValue(1) };
      }
      if (!c.login || !c.pw) return null;
      save(KC, c); return c;
    }
    var cr = load(KC);
    if (arg === 'setup' || !cr) {
      if (!interactive && !cr) return env.Script && env.Script.complete && env.Script.complete();
      cr = await askCreds(); if (!cr) return;
    }
    var R = env.Request;
    var http = jarHttp(function (method, url, headers, body) {
      var q = new R(url); q.method = method; q.headers = headers; if (body != null) q.body = body;
      return q.loadString().then(function (text) {
        var res = q.response || {}, cookies = (res.cookies || []).map(function (c) { return c.name + '=' + c.value; });
        return { status: res.statusCode || 200, text: text, cookies: cookies };
      }, function (e) { throw new Error(String((e && e.message) || e)); });
    });
    var ask = async function (text) { var a = new Alert(); a.title = 'Platonus'; a.message = text; a.addTextField('Код', ''); a.addAction('OK'); a.addCancelAction('Отмена'); return (await a.present()) === -1 ? '' : a.textFieldValue(0); };
    var run = function (c) { return collect({ http: http, creds: { pl: c, tt: c.tt || c }, grades: true, timetable: true, calendar: load(K_CAL), ask: interactive ? ask : null }); };
    var res = await run(cr);
    /* пароль сменился — при ручном запуске спросим новый и попробуем ещё раз */
    if (interactive && res.errors.some(function (x) { return /Не удалось войти/.test(x.message); })) {
      var w = new Alert(); w.title = 'Не удалось войти'; w.message = res.errors.map(function (x) { return x.message; }).join('\n\n') + '\n\nВвести логин и пароль заново?';
      w.addAction('Ввести заново'); w.addCancelAction('Нет');
      if (await w.present() === 0) { var c2 = await askCreds(); if (c2) { cr = c2; res = await run(cr); } }
    }
    if (res.calendar) save(K_CAL, res.calendar);
    var b = res.bundle, last = load(K_LAST);
    var news = b.hasGrades ? gradeNews(last && last.subjects, b.subjects) : [];
    if (b.hasGrades) save(K_LAST, { subjects: b.subjects, at: b.taken });
    var lz = env.LZString, link = SITE + '#/grades/lz/' + lz.compressToEncodedURIComponent(JSON.stringify(b));
    if (interactive) {
      if (res.errors.length) { var e = new Alert(); e.title = 'Не всё получилось'; e.message = res.errors.map(function (x) { return x.message; }).join('\n\n'); e.addAction('OK'); await e.present(); }
      if (b.hasGrades || b.timetable) env.Safari.open(link);
    } else if (news.length) {
      var n = new env.Notification(); n.title = news.length > 1 ? 'Новые оценки' : 'Новая оценка'; n.body = news.slice(0, 4).join('\n'); n.openURL = link; await n.schedule();
    }
    if (env.Script && env.Script.complete) env.Script.complete();
  }

  root.SPCollect = {
    collect: collect, jarHttp: jarHttp, fetchHttp: fetchHttp, gradeNews: gradeNews, runScriptable: runScriptable,
    /* для проверки и для сайта */
    buildGrades: buildGrades, parseCalendar: parseCalendar, calendarRange: calendarRange, timetableWeeks: timetableWeeks, friendly: friendly
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

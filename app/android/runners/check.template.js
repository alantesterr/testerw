/* =====================================================================
   Фоновая проверка оценок для Android-приложения StudyPlay.
   Запускается системой примерно раз в 30 минут, даже когда приложение закрыто.
   Перед этим кодом при сборке вставляется js/sync/collector.js (общий сборщик).
   Логин и пароль приходят из приложения событием setCreds и лежат в хранилище приложения.
   ===================================================================== */
addEventListener('setCreds', function (resolve, reject, args) {
  try { CapacitorKV.set('creds', JSON.stringify(args || {})); resolve(); } catch (e) { reject(e); }
});

addEventListener('check', async function (resolve, reject) {
  try {
    var h = new Date().getHours();
    if (h >= 23 || h < 7) return resolve();                      /* ночью Platonus обычно не работает */
    var raw = CapacitorKV.get('creds'), cr = raw && raw.value ? JSON.parse(raw.value) : null;
    if (!cr || !cr.login || !cr.pw || cr.notify === false) return resolve();

    var http = globalThis.SPCollect.jarHttp(async function (method, url, headers, body) {
      var r = await fetch(url, { method: method, headers: headers, body: body || undefined });
      var text = await r.text(), cookies = [];
      try { var sc = r.headers && r.headers.get && r.headers.get('set-cookie'); if (sc) cookies = String(sc).split(/,(?=\s*[^;,=\s]+=)/); } catch (e) { /* без cookies */ }
      return { status: r.status, text: text, cookies: cookies };
    });
    var res = await globalThis.SPCollect.collect({ http: http, creds: { pl: cr }, grades: true, timetable: false, skipCalendar: true });
    var b = res.bundle; if (!b.hasGrades) return resolve();

    var lastRaw = CapacitorKV.get('last'), last = lastRaw && lastRaw.value ? JSON.parse(lastRaw.value) : null;
    var news = globalThis.SPCollect.gradeNews(last, b.subjects);
    CapacitorKV.set('last', JSON.stringify(b.subjects));
    if (news.length) {
      CapacitorNotifications.schedule([{
        id: Math.floor(Date.now() / 1000) % 2000000000,
        title: news.length > 1 ? 'Новые оценки' : 'Новая оценка',
        body: news.slice(0, 4).join('\n')
      }]);
    }
    resolve();
  } catch (e) { resolve(); }   /* фоновые ошибки не показываем */
});

/* =====================================================================
   ОФЛАЙН-РЕЖИМ И БЫСТРОЕ ОТКРЫТИЕ (Service Worker).
   Браузер ставит этот файл один раз и дальше сам отвечает на запросы сайта:
     • код и стили (js/, css/, assets/, библиотеки с cdnjs, шрифты) —
       сразу из памяти телефона: у них в адресе версия ?v=…, поэтому новая
       версия сайта = новый адрес, старая копия удаляется сама;
     • страница index.html и всё из data/ (группы, расписание, тесты) —
       сначала из интернета (свежее), а если интернета нет или он очень
       медленный (дольше 3 с) — сохранённая копия.
   Поэтому без интернета открываются расписание и тесты, которые уже
   открывались хотя бы раз.
   Менять этот файл почти никогда не нужно. Если что-то сломалось с
   кэшем — увеличьте номер в CACHE, и у всех память очистится.
   В Android-приложении (?app=android) не используется.
   ===================================================================== */
var CACHE = 'sp-cache-1';
var SKIP = /\/(holostoy|dungeon|extension|old|app|tools|downloads)\//;
var CDN = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

/* при установке — сразу положить в память всё, что подключает index.html */
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return fetch('./index.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (html) {
      var list = ['./', './index.html', './manifest.webmanifest', './assets/favicon.svg', './data/groups.json'];
      html.replace(/(?:src|href)="([^"#]+\?v=[^"]+)"/g, function (_, u) { list.push(u); });
      return Promise.all(list.map(function (u) { return c.add(u).catch(function () { }); }));
    });
  }).catch(function () { }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function put(key, res) {
  if (!res || !(res.ok || res.type === 'opaque')) return;
  var copy = res.clone();
  caches.open(CACHE).then(function (c) {
    /* та же страница/файл со старой версией ?v= больше не нужна */
    var u = new URL(typeof key === 'string' ? key : key.url);
    if (u.search && u.origin === location.origin) c.keys().then(function (ks) {
      ks.forEach(function (k) { var x = new URL(k.url); if (x.pathname === u.pathname && x.search !== u.search) c.delete(k); });
    });
    return c.put(key, copy);
  }).catch(function () { });
}
/* код и стили: сразу из памяти, нет в памяти — из сети и запомнить */
function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) { put(req, res); return res; });
  });
}
/* данные: из сети, но не дольше 3 с; нет сети — сохранённая копия */
function networkFirst(req, key) {
  return new Promise(function (resolve, reject) {
    var done = false, finish = function (r) { if (!done && r) { done = true; resolve(r); } };
    var fromCache = function () { return caches.match(key, { ignoreSearch: true }); };
    var timer = setTimeout(function () { fromCache().then(finish); }, 3000);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res.ok) put(key, res);
      if (res.ok || res.status === 404) return finish(res);
      return fromCache().then(function (h) { finish(h || res); });
    }, function () {
      clearTimeout(timer);
      fromCache().then(function (h) { if (h) finish(h); else if (!done) reject(new Error('offline')); });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var u = new URL(req.url);
  if (u.origin !== location.origin) { if (CDN.test(req.url)) e.respondWith(cacheFirst(req)); return; }
  var scope = new URL(self.registration.scope).pathname, path = u.pathname.slice(scope.length - 1);
  if (SKIP.test(path) || /[?&]app=android/.test(u.search)) return;
  if (req.mode === 'navigate' || path === '/' || path === '/index.html') { e.respondWith(networkFirst(req, new URL('./index.html', self.registration.scope).href)); return; }
  if (path.indexOf('/data/') === 0) { e.respondWith(networkFirst(req, u.origin + u.pathname)); return; }
  if (u.search && /^\/(js|css|assets)\//.test(path)) { e.respondWith(cacheFirst(req)); return; }
  if (/^\/assets\//.test(path) || path === '/manifest.webmanifest') e.respondWith(cacheFirst(req));
});

/* =====================================================================
   Хранилище в браузере.
   - SP.store — маленькие данные (настройки, прогресс) в localStorage.
   - SP.idb(имяБазы) — большие файлы (видео, PDF, тесты) в IndexedDB.
   Всё обёрнуто в try/catch: в приватном режиме хранилище может быть
   недоступно — тогда сайт просто работает без сохранения.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;

  SP.store = {
    get: function (key, def) {
      try { var v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    raw: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    setRaw: function (key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } },
    del: function (key) { try { localStorage.removeItem(key); } catch (e) { /* ничего */ } },
    keys: function () { try { return Object.keys(localStorage); } catch (e) { return []; } }
  };

  /* IndexedDB: одна «полка» (object store) files в каждой базе */
  var dbs = {};
  SP.idb = function (name) {
    if (dbs[name]) return dbs[name];
    var dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (ok, no) {
        if (!window.indexedDB) return no(new Error('IndexedDB'));
        var r = indexedDB.open(name, 1);
        r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains('files')) r.result.createObjectStore('files'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { no(r.error); };
        r.onblocked = function () { no(new Error('blocked')); };
      });
      dbp.catch(function () { dbp = null; });
      return dbp;
    }
    function tx(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (ok, no) {
          var t = db.transaction('files', mode), rq = fn(t.objectStore('files'));
          t.oncomplete = function () { ok(rq && rq.result); };
          t.onerror = function () { no(t.error); };
          t.onabort = function () { no(t.error); };
        });
      });
    }
    dbs[name] = {
      ready: function () { return open().then(function () { return true; }, function () { return false; }); },
      put: function (id, v) { return tx('readwrite', function (s) { return s.put(v, id); }); },
      get: function (id) { return tx('readonly', function (s) { return s.get(id); }); },
      del: function (id) { return tx('readwrite', function (s) { return s.delete(id); }); },
      keys: function () { return tx('readonly', function (s) { return s.getAllKeys(); }); },
      clear: function () { return tx('readwrite', function (s) { return s.clear(); }); }
    };
    return dbs[name];
  };
})();

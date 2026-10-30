/* =====================================================================
   САЙТ ВНУТРИ ANDROID-ПРИЛОЖЕНИЯ StudyPlay
   Во встроенном окне приложения (WebView) нет того, что умеет обычный браузер:
   он не показывает PDF, не открывает новые вкладки и не скачивает файлы.
   Здесь всё это заменяется:
     • PDF (файлы папок, лекции) — свой просмотрщик на pdf.js прямо в приложении;
     • ссылки на другие сайты и «новые вкладки» — встроенная вкладка браузера поверх приложения
       (кнопка «Назад» возвращает в StudyPlay);
     • «Скачать» — системное меню «Поделиться»: сохранить, открыть в другом приложении, отправить.
   В обычном браузере этот файл почти ничего не делает.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, CAP = window.Capacitor;
  var IS_APP = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  SP.isApp = IS_APP;
  var esc = SP.esc;
  var plug = function (n) { return CAP && CAP.Plugins && CAP.Plugins[n]; };
  var abs = function (u) { try { return new URL(u, document.baseURI || location.href).href; } catch (e) { return String(u); } };
  var isPdf = function (u) { return /\.pdf($|[?#])/i.test(String(u)); };
  var fileName = function (u) { try { return decodeURIComponent(String(u).split(/[?#]/)[0].split('/').pop()) || 'file'; } catch (e) { return 'file'; } };

  /* ---------- PDF: страницы рисуются pdf.js (тот же, что в конспектах «Как в PDF») ---------- */
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/', pdfLib = null;
  function loadPdfLib() {
    if (pdfLib) return pdfLib;
    pdfLib = import(PDFJS + 'pdf.min.mjs').then(function (lib) {
      try {
        var blob = new Blob(['import "' + PDFJS + 'pdf.worker.min.mjs";'], { type: 'text/javascript' });
        lib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(blob), { type: 'module' });
      } catch (e) { lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; }
      return lib;
    });
    pdfLib.catch(function () { pdfLib = null; });
    return pdfLib;
  }
  /* нарисовать PDF (ссылка или Blob) в контейнер: страницы по ширине, рисуются, когда до них долистали */
  SP.pdfRender = function (box, src) {
    box.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
    var dataP = src instanceof Blob ? src.arrayBuffer().then(function (b) { return { data: new Uint8Array(b) }; }) : Promise.resolve({ url: abs(src) });
    return Promise.all([loadPdfLib(), dataP]).then(function (r) { return r[0].getDocument(r[1]).promise; }).then(function (doc) {
      box.innerHTML = '<div class="pdfv">' + Array.from({ length: doc.numPages }, function (_, i) { return '<div class="pdfv-pg" data-p="' + (i + 1) + '"><span class="pdfv-n">' + (i + 1) + ' / ' + doc.numPages + '</span></div>'; }).join('') + '</div>';
      var pages = box.querySelectorAll('.pdfv-pg');
      var draw = function (el) {
        if (el.getAttribute('data-done')) return; el.setAttribute('data-done', '1');
        doc.getPage(+el.getAttribute('data-p')).then(function (pg) {
          var w = el.clientWidth || box.clientWidth || 360, v0 = pg.getViewport({ scale: 1 }), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
          var v = pg.getViewport({ scale: (w / v0.width) * dpr }), c = document.createElement('canvas');
          c.width = Math.floor(v.width); c.height = Math.floor(v.height); c.style.width = '100%';
          el.style.aspectRatio = v0.width + ' / ' + v0.height;
          el.appendChild(c);
          return pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
        }).catch(function () { el.removeAttribute('data-done'); });
      };
      pages.forEach(function (el, i) { el.style.aspectRatio = '595 / 842'; if (i < 2) draw(el); });
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) draw(e.target); }); }, { root: null, rootMargin: '600px 0px' });
        pages.forEach(function (el) { io.observe(el); });
      } else pages.forEach(draw);
      return doc;
    });
  };
  /* PDF на весь экран: «Поделиться» — сохранить или открыть в другом приложении */
  SP.pdfView = function (src, title) {
    var name = title || (src instanceof Blob ? 'document.pdf' : fileName(src));
    var m = SP.modal({ title: name, size: 'xl', body: '<div class="pdfv-wrap"></div>', actions: [
      { label: SP.t('common.download'), icon: 'download', kind: 'primary', close: false, onClick: function () {
        (src instanceof Blob ? Promise.resolve(src) : fetch(abs(src)).then(function (r) { return r.blob(); })).then(function (b) { SP.download(b, /\.pdf$/i.test(name) ? name : name + '.pdf'); });
        return false;
      } }] });
    var box = SP.$('.pdfv-wrap', m.el);
    SP.pdfRender(box, src).catch(function () {
      /* pdf.js не справился — открываем как обычную ссылку (браузер телефона покажет или скачает) */
      if (!(src instanceof Blob)) { m.close(); openExternal(abs(src)); }
      else box.innerHTML = '<div class="empty">' + SP.icon('file', 'ic-xl') + '<p>' + esc(SP.t('subjects.noPreviewText')) + '</p></div>';
    });
    return m;
  };

  if (!IS_APP) { SP.openUrl = function (u) { window.open(u, '_blank', 'noopener'); }; return; }
  document.documentElement.classList.add('is-app');

  /* ---------- ссылки: встроенная вкладка браузера поверх приложения ---------- */
  function openExternal(u) {
    var br = plug('Browser');
    if (br && /^https?:/i.test(u)) return br.open({ url: u, presentationStyle: 'fullscreen' }).catch(function () { location.href = u; });
    location.href = u;
  }
  SP.openUrl = function (u) {
    if (!u) return;
    u = abs(u);
    if (isPdf(u)) { SP.pdfView(u); return; }
    openExternal(u);
  };
  /* «новая вкладка» во встроенном окне не открывается — перехватываем */
  var nativeOpen = window.open;
  window.open = function (u) {
    if (u && String(u) !== 'about:blank') SP.openUrl(String(u));
    return null;
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(javascript|mailto|tel|blob|data):/i.test(href)) {
      if (/^(blob|data):/i.test(href) && a.hasAttribute('download')) { e.preventDefault(); fetch(href).then(function (r) { return r.blob(); }).then(function (b) { SP.download(b, a.getAttribute('download') || 'file'); }); }
      return;
    }
    var u = abs(href), external = u.indexOf(location.origin + '/') !== 0;
    if (a.hasAttribute('download')) { e.preventDefault(); fetch(u).then(function (r) { return r.blob(); }).then(function (b) { SP.download(b, a.getAttribute('download') || fileName(u)); }, function () { openExternal(u); }); return; }
    if (a.target === '_blank' || external || isPdf(u)) { e.preventDefault(); SP.openUrl(u); }
  }, true);

  /* ---------- «Скачать»: меню телефона «Поделиться» (сохранить в файлы, открыть в другом приложении) ---------- */
  var webDownload = SP.download;
  SP.download = function (blob, name) {
    var fs = plug('Filesystem'), sh = plug('Share');
    if (!fs || !sh) return webDownload(blob, name);
    name = String(name || 'studyplay-file').replace(/[\\/:*?"<>|]+/g, '_');
    var rd = new FileReader();
    rd.onload = function () {
      var b64 = String(rd.result).split(',')[1] || '';
      fs.writeFile({ path: name, data: b64, directory: 'CACHE' }).then(function (r) {
        return sh.share({ title: name, files: [r.uri], dialogTitle: SP.t('app.shareTitle') });
      }).catch(function (e) { if (!/cancel/i.test(String(e && e.message))) SP.toast(SP.t('app.fail'), 'danger'); });
    };
    rd.onerror = function () { SP.toast(SP.t('app.fail'), 'danger'); };
    rd.readAsDataURL(blob);
  };
})();

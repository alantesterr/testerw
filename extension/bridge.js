/* Мост между сайтом «Экзамен» и расширением:
   сайт отдаёт вопросы и список ошибок, расширение отдаёт ответы, данные во время видео. */
(function () {
  document.documentElement.setAttribute('data-sp-ext', '1');
  function hello() { window.postMessage({ from: 'sp-ext', type: 'hello' }, '*'); }
  function sendResults() {
    chrome.storage.local.get('pending', function (d) {
      var p = d.pending || [];
      if (p.length) window.postMessage({ from: 'sp-ext', type: 'results', results: p }, '*');
    });
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.from !== 'sp-exam') return;
    if (e.data.type === 'bank') {
      chrome.storage.local.set({ bank: e.data.bank, errs: e.data.errs, bankV: e.data.v, bankAt: Date.now() });
      sendResults();
    }
    if (e.data.type === 'results-ok') {
      var ids = e.data.ids || [];
      chrome.storage.local.get('pending', function (d) {
        chrome.storage.local.set({ pending: (d.pending || []).filter(function (x) { return ids.indexOf(x.rid) < 0; }) });
      });
    }
  });
  if (document.readyState === 'complete') setTimeout(hello, 300);
  else window.addEventListener('load', function () { setTimeout(hello, 300); });
})();

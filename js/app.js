/* =====================================================================
   ЗАПУСК САЙТА.
   1. Применяем язык и тему.
   2. Если студент ещё не входил — показываем экран «Вход / Регистрация».
   3. Строим каркас (боковая панель, разделы) и открываем раздел из ссылки.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;

  function boot() {
    SP.setLang(SP.settings.get('lang') || 'ru', true);
    var start = function () {
      document.getElementById('app').hidden = false;
      SP.shell.start();
      SP.stopwatch.sync();
      SP.data.autoRefresh();
      setInterval(function () { SP.data.autoRefresh(); }, 15 * 60 * 1000);
    };
    if (SP.auth.loggedIn()) start();
    else SP.auth.showScreen().then(start);
  }

  /* Если какая-то ошибка в коде — показываем понятное сообщение, а не белый экран */
  window.addEventListener('error', function (e) {
    console.error(e.error || e.message);
    if (SP.toast && document.body) SP.toast(SP.t('err.SCRIPT'), 'danger');
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

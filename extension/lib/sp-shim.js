/* Минимум из StudyPlay, нужный движку тестов (lib/test-engine.js — копия js/features/test-engine.js) */
window.SP = window.SP || {};
(function (SP) {
  SP.esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  SP.cleanSpaces = function (t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); };
  SP.t = function (k) { return { 'tester.err.notFound': 'В файле не найдено ни одного вопроса', 'tester.err.noDocxLib': 'Не удалось прочитать .docx' }[k] || k; };
  SP.lang = function () { return 'ru'; };
  SP.icon = function () { return ''; };
  SP.copyText = function () { return Promise.resolve(); };
})(window.SP);

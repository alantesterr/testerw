/* Окошко настроек расширения */
var DEF = { on: true, every: 15, warn: 30, count: 3, subjects: ['phil', 'arch', 'cpp', 'ict'], mode: 'mix', skip: false, off: [], pausedUntil: 0 };
var NAMES = { phil: 'Философия', arch: 'Архитектура компьютера', cpp: 'C++', ict: 'ИКТ' };
var EXAM_URL = 'https://alantesterr.github.io/testerw/exam/index.html';
var cfg, $ = function (id) { return document.getElementById(id); };

function save() { chrome.storage.local.set({ cfg: cfg }); paint(); }
function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

function paint() {
  chrome.storage.local.get(['watched', 'bank', 'errs', 'pending', 'stats', 'bankAt'], function (d) {
    var paused = cfg.pausedUntil > Date.now();
    $('stTxt').textContent = !cfg.on ? 'Выключено' : paused ? 'Пауза до ' + new Date(cfg.pausedUntil).toLocaleTimeString().slice(0, 5) : 'Включено';
    var need = cfg.every * 60, w = d.watched || 0;
    $('status').textContent = 'Просмотрено ' + Math.floor(w / 60) + ' мин ' + (w % 60) + ' сек из ' + cfg.every + ' мин до вопросов';
    $('prog').style.width = Math.min(100, w / need * 100) + '%';
    var b = d.bank || {}, n = 0, e = 0;
    Object.keys(b).forEach(function (k) { n += b[k].qs.length; e += ((d.errs || {})[k] || []).length; });
    var st = d.stats || { r: 0, w: 0 };
    $('bankInfo').textContent = n ? 'Вопросов в расширении: ' + n + ' · в ошибках: ' + e + ' · ответов во время видео: ✓ ' + st.r + ' ✗ ' + st.w + ((d.pending || []).length ? ' · ждут отправки на сайт: ' + d.pending.length : '') + (d.bankAt ? ' · обновлено ' + new Date(d.bankAt).toLocaleDateString() : '')
      : 'Вопросы ещё не загружены — нажми «Открыть Экзамен».';
  });
}

chrome.storage.local.get('cfg', function (d) {
  cfg = Object.assign({}, DEF, d.cfg || {});
  $('on').checked = cfg.on; $('every').value = cfg.every; $('warn').value = cfg.warn; $('count').value = cfg.count; $('mode').value = cfg.mode; $('skip').checked = cfg.skip;
  $('off').value = (cfg.off || []).join('\n');
  $('subs').innerHTML = Object.keys(NAMES).map(function (k) { return '<label class="ck"><input type="checkbox" data-s="' + k + '"' + (cfg.subjects.indexOf(k) >= 0 ? ' checked' : '') + '> ' + NAMES[k] + '</label>'; }).join('');
  document.querySelectorAll('[data-s]').forEach(function (c) {
    c.onchange = function () { cfg.subjects = Array.prototype.slice.call(document.querySelectorAll('[data-s]:checked')).map(function (x) { return x.getAttribute('data-s'); }); save(); };
  });
  paint();
});

$('on').onchange = function () { cfg.on = this.checked; if (cfg.on) cfg.pausedUntil = 0; save(); };
['every', 'warn', 'count'].forEach(function (k) { $(k).onchange = function () { var v = parseInt(this.value, 10); if (!(v >= 0)) v = DEF[k]; if (k !== 'warn') v = Math.max(1, v); cfg[k] = v; this.value = v; save(); }; });
$('mode').onchange = function () { cfg.mode = this.value; save(); };
$('skip').onchange = function () { cfg.skip = this.checked; save(); };
$('off').onchange = function () { cfg.off = this.value.split(/\n|,/).map(function (s) { return host(/^https?:/.test(s.trim()) ? s.trim() : 'https://' + s.trim()); }).filter(Boolean); this.value = cfg.off.join('\n'); save(); };
$('offHere').onclick = function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (t) {
    var h = t[0] && host(t[0].url); if (!h) return;
    if (cfg.off.indexOf(h) < 0) cfg.off.push(h); $('off').value = cfg.off.join('\n'); save();
  });
};
$('pause').onclick = function () { cfg.pausedUntil = Date.now() + 3600e3; save(); };
$('now').onclick = function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (t) {
    if (!t[0]) return;
    chrome.tabs.sendMessage(t[0].id, { type: 'sp-quiz-now' }, function () { void chrome.runtime.lastError; });
    window.close();
  });
};
$('openExam').onclick = function () { chrome.tabs.create({ url: EXAM_URL }); };
setInterval(paint, 2000);

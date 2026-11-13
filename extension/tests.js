/* Страница «Мои тесты»: загрузка своих файлов с тестами в расширение */
var E = SP.testEngine, $ = function (id) { return document.getElementById(id); };
function esc(s) { return SP.esc(s); }
function paint() {
  chrome.storage.local.get(['my', 'myErrs'], function (d) {
    var my = d.my || [], me = d.myErrs || {};
    $('list').innerHTML = my.length ? my.map(function (t) {
      var e = (me['my:' + t.id] || []).length;
      return '<div class="it"><label class="sw" title="Показывать во время видео"><input type="checkbox" data-on="' + t.id + '"' + (t.on ? ' checked' : '') + '><span></span></label>' +
        '<div class="n"><b>' + esc(t.name) + '</b><span class="muted">' + t.qs.length + ' вопросов' + (e ? ' · в ошибках: ' + e : '') + '</span></div><button data-rm="' + t.id + '">Удалить</button></div>';
    }).join('') : '<p class="muted">Своих тестов пока нет.</p>';
    document.querySelectorAll('[data-on]').forEach(function (c) { c.onchange = function () { upd(function (my) { my.forEach(function (t) { if (t.id === c.getAttribute('data-on')) t.on = c.checked; }); }); }; });
    document.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { if (confirm('Удалить этот тест из расширения?')) upd(function (my) { return my.filter(function (t) { return t.id !== b.getAttribute('data-rm'); }); }); }; });
  });
}
function upd(f) { chrome.storage.local.get('my', function (d) { var my = d.my || [], r = f(my); chrome.storage.local.set({ my: r || my }, paint); }); }
function ingest(files) {
  var msg = $('msg'); msg.className = 'muted'; msg.textContent = 'Читаю файлы…';
  var ok = [], bad = [];
  Promise.all(Array.prototype.map.call(files, function (f) {
    return E.readFile(f).then(function (r) {
      if (!r.out.length) { bad.push(f.name + ': вопросы не найдены'); return; }
      var seen = {};
      var qs = r.out.map(function (q) { var id = E.qid(q); seen[id] = (seen[id] || 0) + 1; return { id: seen[id] > 1 ? id + '#' + seen[id] : id, q: q.q, img: q.img || '', ex: q.ex || '', type: q.type, answer: q.answer || '', opts: (q.opts || []).map(function (o) { return { t: o.t, right: !!o.right, img: o.img || '' }; }) }; });
      ok.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: f.name.replace(/\.(txt|docx?|json)$/i, ''), on: true, qs: qs, bad: (r.bad || []).length });
    }, function (e) { bad.push(f.name + ': ' + (e && e.message || 'не удалось прочитать')); });
  })).then(function () {
    upd(function (my) { return my.concat(ok); });
    msg.className = bad.length ? 'err' : 'muted';
    msg.textContent = (ok.length ? 'Загружено: ' + ok.map(function (t) { return t.name + ' (' + t.qs.length + ')'; }).join(', ') + '. ' : '') + bad.join('; ');
  });
}
$('pick').onclick = function () {
  var i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.txt,.doc,.docx';
  i.onchange = function () { if (i.files.length) ingest(i.files); }; i.click();
};
var dz = $('drop');
dz.ondragover = function (e) { e.preventDefault(); dz.classList.add('over'); };
dz.ondragleave = function () { dz.classList.remove('over'); };
dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files.length) ingest(e.dataTransfer.files); };
paint();

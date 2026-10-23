/* =====================================================================
   ДВИЖОК ТЕСТОВ (общий для Тестера, Дизайнера, Плеера и папок).
   Формат файла:
     <question>Текст вопроса
     <variant>неверный вариант
     <variantright>верный вариант
     <variant_keyboard>ответ, который вводят с клавиатуры
     <question_image>data:image/...</question_image>
     <variant_image>data:image/...</variant_image>
   Код в вопросах: ```cpp ... ``` (блок) и `код` (в строке).
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var esc = SP.esc, clean = SP.cleanSpaces;

  /* ---------- Подсветка кода C++ ---------- */
  var S = function (w) { var o = {}; w.split(' ').forEach(function (x) { o[x] = 1; }); return o; };
  var HL_CTRL = S('if else for while do switch case default break continue return goto try catch throw');
  var HL_KW = S('alignas auto class const constexpr delete enum explicit extern friend inline namespace new noexcept nullptr operator private protected public sizeof static struct template this typedef typename using virtual volatile override final true false');
  var HL_TY = S('int long short unsigned signed char bool float double void string wstring vector map set multiset unordered_map unordered_set queue priority_queue stack deque list array pair tuple size_t cout cin cerr endl std greater less ios_base');
  var HL_RE = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(^[ \t]*#[ \t]*\w+(?:[ \t]*<[^>\n]*>)?)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\b\d[\w.]*)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)/gm;
  function hlCode(src) {
    var out = '', last = 0, m; HL_RE.lastIndex = 0;
    while ((m = HL_RE.exec(src))) {
      out += esc(src.slice(last, m.index)); last = HL_RE.lastIndex; var t = m[0], c = null;
      if (m[1]) c = 'hl-cm';
      else if (m[2]) { var k = /^(\s*#\s*\w+)(\s*<[^>\n]*>)?/.exec(t); out += '<span class="hl-pp">' + esc(k[1]) + '</span>' + (k[2] ? '<span class="hl-st">' + esc(k[2]) + '</span>' : ''); continue; }
      else if (m[3]) c = 'hl-st'; else if (m[4]) c = 'hl-nu';
      else c = HL_CTRL[t] ? 'hl-ct' : HL_KW[t] ? 'hl-kw' : HL_TY[t] ? 'hl-ty' : m[5] ? 'hl-fn' : null;
      out += c ? '<span class="' + c + '">' + esc(t) + '</span>' : esc(t);
    }
    return out + esc(src.slice(last));
  }
  /* Текст вопроса → HTML (блоки кода, `код` в строке, переносы строк) */
  function richHtml(text, plain) {
    text = String(text == null ? '' : text); var out = '';
    text.split(/```[\w+#-]*\n?([\s\S]*?)```/).forEach(function (p, i) {
      if (i % 2) out += '<div class="code">' + (plain ? '' : '<div class="code-h"><span>C++</span><button type="button" class="btn btn-ghost btn-sm" data-copycode>' + esc(SP.t('common.copy')) + '</button></div>') + '<pre><code>' + hlCode(p.replace(/\n$/, '')) + '</code></pre></div>';
      else if (p.trim()) out += '<div class="tx">' + p.replace(/^\n|\n$/g, '').split(/`([^`\n]+)`/).map(function (s, k) { return !s ? '' : k % 2 ? '<code class="inline">' + esc(s) + '</code>' : esc(s); }).join('') + '</div>';
    });
    return '<div class="rich">' + out + '</div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copycode]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var pre = b.closest('.code').querySelector('pre');
    SP.copyText(pre ? pre.textContent : '').then(function () { b.textContent = SP.t('common.copied'); setTimeout(function () { b.textContent = SP.t('common.copy'); }, 1500); });
  }, true);
  function img(src, cls) { return src ? '<img class="' + (cls || 'q-img') + '" src="' + esc(src) + '" alt="' + esc(SP.t('tester.image')) + '" loading="lazy">' : ''; }

  /* ---------- Разбор текста ---------- */
  var KNOWN_TAGS_RE = /<\/?(?:question|variantright|variant_keyboard|variant|question_image|image_question|questionimage|variant_image|image_variant)(?:\s[^>]*)?>/gi;
  function cleanTxt(s) { return String(s == null ? '' : s).replace(KNOWN_TAGS_RE, '').replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim(); }
  function rawPreview(raw) { return clean(String(raw).replace(/data:image\/[^<\s]*/g, '[img]').replace(/<variantright>/gi, ' + ').replace(/<variant_keyboard>/gi, ' = ').replace(/<variant>/gi, ' - ').replace(/<[^>]+>/g, ' ')).slice(0, 260); }

  function parse(text) {
    var out = [], bad = [];
    String(text).split(/<question(?:\s[^>]*)?>/i).slice(1).forEach(function (raw) {
      var fail = function (r) { bad.push({ raw: rawPreview(raw), reason: r }); };
      var qImg = (raw.match(/<(?:question_image|image_question|questionimage)>([\s\S]*?)<\/(?:question_image|image_question|questionimage)>/i) || [])[1] || '';
      var keyboard = raw.match(/<variant_keyboard>([\s\S]*?)(?=<\/?(?:variant|variantright|variant_keyboard|question_image|variant_image)>|$)/i);
      var body = raw.replace(/<(?:question_image|image_question|questionimage)>[\s\S]*?<\/(?:question_image|image_question|questionimage)>/ig, '');
      var parts = body.split(/<(variantright|variant|variant_keyboard)>/i), qtxt = cleanTxt(parts[0]);
      var opts = [], answer = '', kbd = false;
      for (var i = 1; i < parts.length; i += 2) {
        var tag = parts[i].toLowerCase(), ro = parts[i + 1] || '';
        if (tag === 'variant_keyboard') { kbd = true; answer = clean(ro.split(/<\//)[0]); continue; }
        var im = (ro.match(/<(?:variant_image|image_variant)>([\s\S]*?)<\/(?:variant_image|image_variant)>/i) || [])[1] || '';
        var t = cleanTxt(ro.replace(/<(?:variant_image|image_variant)>[\s\S]*?<\/(?:variant_image|image_variant)>/ig, ''));
        if (t) opts.push({ t: t, right: tag === 'variantright', img: im.trim() });
      }
      if (!qtxt) { fail(SP.t('tester.err.noText')); return; }
      if (kbd || keyboard) {
        if (!answer && keyboard) answer = clean(keyboard[1].split(/<\//)[0]);
        if (!answer) { fail(SP.t('tester.err.noAnswer')); return; }
        out.push({ q: qtxt, img: qImg.trim(), type: 'keyboard', answer: answer, opts: [], n: 1 }); return;
      }
      if (!opts.length) { out.push({ q: qtxt, img: qImg.trim(), type: 'choice', opts: [], n: 0 }); return; }
      if (opts.length < 2) { fail(SP.t('tester.err.oneOpt')); return; }
      if (!opts.some(function (o) { return o.right; })) opts[0].right = true;
      if (opts.every(function (o) { return o.right; })) { fail(SP.t('tester.err.allRight')); return; }
      out.push({ q: qtxt, img: qImg.trim(), type: 'choice', opts: opts, n: opts.filter(function (o) { return o.right; }).length });
    });
    return { out: out, bad: bad };
  }

  function normalizeQ(q) {
    var r;
    if (q.type === 'keyboard' || (q.answer !== undefined && (!q.opts || !q.opts.length))) r = { q: String(q.q || ''), img: q.img || '', type: 'keyboard', answer: String(q.answer == null ? '' : q.answer), opts: [], n: 1 };
    else {
      var opts = (q.opts || q.options || []).map(function (o) { return { t: String(o.t != null ? o.t : (o.text != null ? o.text : '')), right: !!(o.right != null ? o.right : o.correct), img: o.img || '' }; });
      if (opts.length && !opts.some(function (o) { return o.right; })) opts[0].right = true;
      r = { q: String(q.q || q.question || ''), img: q.img || '', type: 'choice', opts: opts, n: opts.filter(function (o) { return o.right; }).length };
    }
    if (q._f) r._f = q._f;
    if (q.special) r.special = true;
    return r;
  }
  function problem(q) {
    if (!String(q.q || '').trim()) return SP.t('tester.err.noText');
    if (q.type === 'keyboard') return String(q.answer || '').trim() ? '' : SP.t('tester.err.noAnswer');
    var o = (q.opts || []).filter(function (x) { return String(x.t).trim(); });
    if (!o.length) return SP.t('tester.err.noOpts');
    if (o.length < 2) return SP.t('tester.err.min2');
    if (!o.some(function (x) { return x.right; })) return SP.t('tester.err.noRight');
    if (o.every(function (x) { return x.right; })) return SP.t('tester.err.allRight');
    return '';
  }
  function serializeQ(q) {
    if (q.type === 'keyboard') return { q: q.q, img: q.img || '', type: 'keyboard', answer: q.answer, opts: [], n: 1 };
    var opts = q.opts.filter(function (x) { return String(x.t).trim(); }).map(function (o) { return { t: String(o.t).trim(), right: !!o.right, img: o.img || '' }; });
    return { q: String(q.q).trim(), img: q.img || '', type: 'choice', opts: opts, n: opts.filter(function (o) { return o.right; }).length };
  }
  var isKb = function (q) { return q.type === 'keyboard'; };
  var isSpecial = function (q) { return !!(q.special || isKb(q) || q.img || (q.opts || []).some(function (o) { return o.img; })); };

  /* Стабильный номер вопроса (для сохранения прогресса в плеере) */
  function qid(q) {
    var s = q.q + '|' + (q.type === 'keyboard' ? q.answer : (q.opts || []).map(function (o) { return (o.right ? '+' : '-') + o.t; }).sort().join('|'));
    var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'q' + (h >>> 0).toString(36);
  }
  function checkKeyboard(q, typed) { return clean(typed).toLocaleLowerCase() === clean(q.answer).toLocaleLowerCase(); }
  function checkChoice(q, sel) {
    var right = q.opts.map(function (o, i) { return o.right ? i : -1; }).filter(function (i) { return i >= 0; });
    return sel.length === right.length && sel.every(function (i) { return right.indexOf(i) >= 0; });
  }

  /* ---------- Чтение файлов ---------- */
  function readTextDocument(f) {
    var name = f.name.toLowerCase();
    if (/\.docx$/.test(name)) {
      if (!window.mammoth) return Promise.reject(new Error(SP.t('tester.err.noDocxLib')));
      return f.arrayBuffer().then(function (ab) { return window.mammoth.extractRawText({ arrayBuffer: ab }); }).then(function (r) { return r.value; });
    }
    if (/\.txt$/.test(name)) return f.text();
    if (/\.doc$/.test(name)) {
      return f.arrayBuffer().then(function (ab) {
        var bytes = new Uint8Array(ab), t = '';
        try { t = new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (e) { /* ничего */ }
        if (t.indexOf('<question>') < 0) try { t = new TextDecoder('windows-1251', { fatal: false }).decode(bytes); } catch (e) { /* ничего */ }
        if (/^\s*\{\\rtf/i.test(t)) t = t.replace(/\\par[d]?/gi, '\n').replace(/\\'[0-9a-f]{2}/gi, '').replace(/\\[a-z]+\d* ?/gi, '').replace(/[{}]/g, '');
        return t;
      });
    }
    return Promise.reject(new Error(SP.t('tester.err.format')));
  }
  function readFile(file) {
    if (/\.(json|studyplay)$/i.test(file.name)) {
      return file.text().then(function (txt) {
        var obj = JSON.parse(txt), arr = obj.all || obj.questions;
        if (!Array.isArray(arr)) throw new Error(SP.t('tester.err.json'));
        var out = [], bad = [];
        arr.map(normalizeQ).forEach(function (q) { var p = (!isKb(q) && !(q.opts || []).length) ? '' : problem(q); if (p) bad.push({ raw: rawPreview(q.q), reason: p }); else out.push(q); });
        return { out: out, bad: bad };
      });
    }
    return readTextDocument(file).then(parse);
  }
  function validateFile(f) {
    return readFile(f).then(function (r) { return r.out.length ? '' : SP.t('tester.err.notFound'); }, function (e) { return e.message; });
  }

  /* ---------- Экспорт ---------- */
  function fmtQ(q, withImg) {
    var s = '<question>' + String(q.q).trim() + '\n';
    if (withImg && q.img) s += '<question_image>' + q.img + '</question_image>\n';
    if (isKb(q)) return s + '<variant_keyboard>' + String(q.answer).trim();
    return s + q.opts.filter(function (o) { return String(o.t).trim(); }).map(function (o) { return (o.right ? '<variantright>' : '<variant>') + String(o.t).trim() + (withImg && o.img ? '<variant_image>' + o.img + '</variant_image>' : ''); }).join('\n');
  }
  function buildText(list, withImg) { return list.map(function (q) { return fmtQ(q, withImg); }).join('\n\n') + '\n'; }
  function makeDocRtf(text) {
    var e = String(text).replace(/\\/g, '\\\\').replace(/[{}]/g, function (c) { return '\\' + c; }).replace(/\r?\n/g, '\\par\n').replace(/[^\x00-\x7f]/g, function (ch) { var c = ch.charCodeAt(0); return '\\u' + (c > 32767 ? c - 65536 : c) + '?'; });
    return '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 ' + e + '}';
  }
  function mkDocx(text) {
    if (!window.JSZip) return Promise.reject(new Error(SP.t('tester.err.noDocxLib')));
    var Z = new window.JSZip(), x = function (t) { return t.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }, H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var paras = text.split('\n').map(function (l) { return l ? '<w:p><w:r><w:t xml:space="preserve">' + x(l) + '</w:t></w:r></w:p>' : '<w:p/>'; }).join('');
    Z.file('[Content_Types].xml', H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    Z.file('_rels/.rels', H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    Z.file('word/document.xml', H + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + paras + '<w:sectPr/></w:body></w:document>');
    return Z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /* ---------- Перевод и поиск ---------- */
  function translate(text, tl) {
    return fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + encodeURIComponent(tl || 'ru') + '&dt=t&q=' + encodeURIComponent(text))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return j[0].map(function (x) { return x[0]; }).join(''); });
  }
  function translateQ(q, tl) {
    var texts = [q.q].concat((q.opts || []).map(function (o) { return o.t; }));
    return Promise.all(texts.map(function (t) { return translate(t, tl); })).then(function (res) { return { q: res[0], o: res.slice(1) }; });
  }
  function translateFallback(q, tl) {
    window.open('https://translate.google.com/?sl=auto&tl=' + (tl || 'ru') + '&op=translate&text=' + encodeURIComponent(q.q + '\n\n' + (q.opts || []).map(function (o, j) { return (j + 1) + ') ' + o.t; }).join('\n')), '_blank', 'noopener');
  }
  function aiPrompt(q) {
    return (SP.t('tester.aiQ') + ' ' + q.q + '\n' + SP.t('tester.aiOpts') + '\n' + (q.opts || []).map(function (o, i) { return (i + 1) + ') ' + o.t; }).join('\n') + '\n' + SP.t('tester.aiAsk')).slice(0, 1500);
  }
  function google(text, ai) { window.open('https://www.google.com/search?q=' + encodeURIComponent(text) + (ai ? '&udm=50' : ''), '_blank', 'noopener'); }

  SP.testEngine = {
    parse: parse, normalizeQ: normalizeQ, problem: problem, serializeQ: serializeQ, isKb: isKb, isSpecial: isSpecial,
    qid: qid, checkKeyboard: checkKeyboard, checkChoice: checkChoice,
    readFile: readFile, readTextDocument: readTextDocument, validateFile: validateFile,
    buildText: buildText, fmtQ: fmtQ, makeDocRtf: makeDocRtf, mkDocx: mkDocx,
    richHtml: richHtml, img: img, translateQ: translateQ, translateFallback: translateFallback,
    aiPrompt: aiPrompt, google: google,
    blankQ: function () { return { q: '', opts: [0, 1, 2, 3].map(function () { return { t: '', right: false, img: '' }; }), img: '', type: 'choice', answer: '' }; },
    blankOpts: function () { return [0, 1, 2, 3].map(function () { return { t: '', right: false, img: '' }; }); }
  };
})();

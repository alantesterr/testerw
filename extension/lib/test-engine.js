/* =====================================================================
   ДВИЖОК ТЕСТОВ (общий для Тестера, Дизайнера, Плеера и папок).
   Формат файла:
     <question>Текст вопроса
     <variant>неверный вариант
     <variantright>верный вариант
     <variant_keyboard>ответ, который вводят с клавиатуры
     <question_image>data:image/...</question_image>
     <variant_image>data:image/...</variant_image>
     <explain>пояснение — показывается после ответа (последним в вопросе)
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
  var KNOWN_TAGS_RE = /<\/?(?:question|variantright|variant_keyboard|variant|question_image|image_question|questionimage|variant_image|image_variant|explain)(?:\s[^>]*)?>/gi;
  function cleanTxt(s) { return String(s == null ? '' : s).replace(KNOWN_TAGS_RE, '').replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim(); }
  function rawPreview(raw) { return clean(String(raw).replace(/data:image\/[^<\s]*/g, '[img]').replace(/<variantright>/gi, ' + ').replace(/<variant_keyboard>/gi, ' = ').replace(/<variant>/gi, ' - ').replace(/<[^>]+>/g, ' ')).slice(0, 260); }

  function parse(text) {
    var out = [], bad = [];
    String(text).split(/<question(?:\s[^>]*)?>/i).slice(1).forEach(function (raw) {
      var fail = function (r) { bad.push({ raw: rawPreview(raw), reason: r }); };
      /* пояснение к ответу: <explain>текст (до </explain> или до конца вопроса) — показывается после ответа */
      var exM = raw.match(/<explain>([\s\S]*?)(?:<\/explain>|$)/i), ex = exM ? cleanTxt(exM[1]) : '';
      if (exM) raw = raw.replace(exM[0], '');
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
        out.push({ q: qtxt, img: qImg.trim(), ex: ex, type: 'keyboard', answer: answer, opts: [], n: 1 }); return;
      }
      if (!opts.length) { out.push({ q: qtxt, img: qImg.trim(), ex: ex, type: 'choice', opts: [], n: 0 }); return; }
      if (opts.length < 2) { fail(SP.t('tester.err.oneOpt')); return; }
      if (!opts.some(function (o) { return o.right; })) opts[0].right = true;
      if (opts.every(function (o) { return o.right; })) { fail(SP.t('tester.err.allRight')); return; }
      out.push({ q: qtxt, img: qImg.trim(), ex: ex, type: 'choice', opts: opts, n: opts.filter(function (o) { return o.right; }).length });
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
    if (q.ex || q.explain) r.ex = String(q.ex || q.explain);
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
    var r, ex = String(q.ex || '').trim();
    if (q.type === 'keyboard') r = { q: q.q, img: q.img || '', type: 'keyboard', answer: q.answer, opts: [], n: 1 };
    else {
      var opts = q.opts.filter(function (x) { return String(x.t).trim(); }).map(function (o) { return { t: String(o.t).trim(), right: !!o.right, img: o.img || '' }; });
      r = { q: String(q.q).trim(), img: q.img || '', type: 'choice', opts: opts, n: opts.filter(function (o) { return o.right; }).length };
    }
    if (ex) r.ex = ex;
    return r;
  }
  /* Блок «Пояснение» под вердиктом (если в файле был <explain>) */
  function explainHtml(q) {
    return q && String(q.ex || '').trim() ? '<div class="q-explain"><div class="q-explain-h">' + SP.icon('book-open') + '<b>' + esc(SP.t('quiz.explain')) + '</b></div>' + richHtml(String(q.ex), true) + '</div>' : '';
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
  /* Картинки и таблицы из Word. В тексте картинка временно стоит меткой \u0002адрес\u0003; потом метка
     становится <question_image> (если стоит до первого варианта) или <variant_image> (если после варианта). */
  var IMG_A = '\u0002', IMG_B = '\u0003';
  function placeImages(text) {
    return String(text).replace(/\u0002([^\u0003]*)\u0003/g, function (m, src, at, all) {
      if (!src) return '';
      var before = all.slice(0, at), q = before.lastIndexOf('<question'), v = Math.max(before.lastIndexOf('<variant>'), before.lastIndexOf('<variantright>'));
      return v > q ? '<variant_image>' + src + '</variant_image>' : '\n<question_image>' + src + '</question_image>\n';
    });
  }
  /* Таблица (например, ячейки Excel в вопросе) → картинка, чтобы выглядела как в Word */
  function tableImg(rows) {
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    if (!rows.length) return '';
    var cols = Math.max.apply(null, rows.map(function (r) { return r.length; })), cv = document.createElement('canvas'), c = cv.getContext('2d');
    var font = '15px Arial, sans-serif', pad = 10, rh = 30, w = [];
    c.font = font;
    for (var j = 0; j < cols; j++) w[j] = Math.max(36, Math.max.apply(null, rows.map(function (r) { return c.measureText(String(r[j] || '').trim()).width; })) + pad * 2);
    var W = w.reduce(function (a, b) { return a + b; }, 0) + 1, H = rows.length * rh + 1;
    cv.width = W * 2; cv.height = H * 2; c.scale(2, 2);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.strokeStyle = '#9aa3b2'; c.lineWidth = 1; c.font = font; c.textBaseline = 'middle'; c.fillStyle = '#111827';
    rows.forEach(function (r, i) {
      var x = 0.5;
      for (var j = 0; j < cols; j++) { c.strokeRect(x, i * rh + 0.5, w[j], rh); c.fillText(String(r[j] || '').trim(), x + pad, i * rh + rh / 2 + 0.5); x += w[j]; }
    });
    return cv.toDataURL('image/png');
  }
  /* DOCX: текст + картинки + таблицы (mammoth → HTML → текст с метками) */
  function docxToText(html) {
    var doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html'), out = [];
    (function walk(n) {
      if (n.nodeType === 3) { out.push(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'img') { out.push(IMG_A + (n.getAttribute('src') || '') + IMG_B); return; }
      if (tag === 'table') {
        var rows = [].map.call(n.querySelectorAll('tr'), function (tr) { return [].map.call(tr.children, function (td) { return td.textContent.replace(/\s+/g, ' '); }); });
        var hasTag = /<(question|variant)/i.test(n.textContent);
        if (hasTag) { [].forEach.call(n.childNodes, walk); out.push('\n'); return; }   /* вопросы, свёрстанные таблицей, — читаем как текст */
        out.push(IMG_A + tableImg(rows) + IMG_B + '\n'); return;
      }
      if (tag === 'br') { out.push('\n'); return; }
      [].forEach.call(n.childNodes, walk);
      if (/^(p|li|h[1-6]|div|tr)$/.test(tag)) out.push('\n');
    })(doc.body.firstChild);
    return placeImages(out.join(''));
  }
  /* Старый Word (.doc): текст внутри хранится в UTF-16; картинки — в том же файле по порядку,
     а в тексте на их месте стоит символ \x01. Таблицы — ячейки через \x07. */
  function b64(bytes) { var s = '', CH = 0x8000; for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); return btoa(s); }
  function docPictures(bytes) {
    var out = [], n = bytes.length;
    for (var i = 0; i < n - 8; i++) {
      if (bytes[i] === 0x89 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x4E && bytes[i + 3] === 0x47 && bytes[i + 4] === 0x0D && bytes[i + 5] === 0x0A) {
        for (var j = i + 8; j < n - 8; j++) if (bytes[j] === 0x49 && bytes[j + 1] === 0x45 && bytes[j + 2] === 0x4E && bytes[j + 3] === 0x44) { out.push('data:image/png;base64,' + b64(bytes.subarray(i, j + 8))); i = j + 7; break; }
      } else if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF && (bytes[i + 3] & 0xF0) === 0xE0) {
        for (var k = i + 4; k < n - 1; k++) if (bytes[k] === 0xFF && bytes[k + 1] === 0xD9) { out.push('data:image/jpeg;base64,' + b64(bytes.subarray(i, k + 2))); i = k + 1; break; }
      }
    }
    return out;
  }
  function docTable(seg) {
    var t = seg.split('\x07'); if (t[t.length - 1] === '') t.pop();
    for (var n = 2; n <= 12; n++) {
      if (t.length % (n + 1)) continue;
      var ok = true; for (var i = n; i < t.length; i += n + 1) if (t[i].trim()) { ok = false; break; }
      if (!ok) continue;
      var rows = []; for (var r = 0; r < t.length; r += n + 1) rows.push(t.slice(r, r + n));
      return tableImg(rows);
    }
    return '';
  }
  /* Файл старого Word — это «папка в файле» (Compound File): потоки WordDocument, 1Table/0Table, Data
     лежат кусками-секторами вперемешку. Собираем нужный поток по цепочке секторов. */
  function cfbStreams(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), u32 = function (o) { return dv.getUint32(o, true); };
    var ss = 1 << dv.getUint16(0x1E, true), mss = 1 << dv.getUint16(0x20, true), cutoff = u32(0x38);
    var sec = function (n) { return 512 + n * ss; }, END = 0xFFFFFFFA;
    var fatSecs = []; for (var i = 0; i < 109; i++) { var v = u32(0x4C + i * 4); if (v < END) fatSecs.push(v); }
    for (var dif = u32(0x44), guard = 0; dif < END && guard < 1000; guard++) { for (var k = 0; k < ss / 4 - 1; k++) { var w = u32(sec(dif) + k * 4); if (w < END) fatSecs.push(w); } dif = u32(sec(dif) + ss - 4); }
    var fat = []; fatSecs.forEach(function (s) { for (var k = 0; k < ss / 4; k++) fat.push(u32(sec(s) + k * 4)); });
    var chain = function (start, table, size, read) { var out = [], n = start, g = 0; while (n < END && g++ < 1e6) { out.push(read(n)); n = table[n]; } var all = new Uint8Array(out.reduce(function (a, b) { return a + b.length; }, 0)), p = 0; out.forEach(function (b) { all.set(b, p); p += b.length; }); return size != null ? all.subarray(0, size) : all; };
    var big = function (n) { var o = sec(n); return bytes.subarray(o, Math.min(bytes.length, o + ss)); };
    var dir = chain(u32(0x30), fat, null, big), ents = [];
    for (var e = 0; e + 128 <= dir.length; e += 128) {
      var nl = dir[e + 0x40] | (dir[e + 0x41] << 8), name = '';
      for (var c = 0; c + 1 < nl - 1; c += 2) name += String.fromCharCode(dir[e + c] | (dir[e + c + 1] << 8));
      var dd = new DataView(dir.buffer, dir.byteOffset + e, 128);
      ents.push({ name: name, type: dir[e + 0x42], start: dd.getUint32(0x74, true), size: dd.getUint32(0x78, true) });
    }
    var root = ents[0], mini = root ? chain(root.start, fat, root.size, big) : new Uint8Array(0);
    var miniFat = u32(0x3C) < END ? (function () { var b = chain(u32(0x3C), fat, null, big), a = []; for (var k = 0; k + 4 <= b.length; k += 4) a.push((b[k] | (b[k + 1] << 8) | (b[k + 2] << 16) | (b[k + 3] << 24)) >>> 0); return a; })() : [];
    var get = function (name) {
      var en = ents.filter(function (x) { return x.name === name && x.type === 2; })[0]; if (!en) return null;
      if (en.size < cutoff) return chain(en.start, miniFat, en.size, function (n) { return mini.subarray(n * mss, n * mss + mss); });
      return chain(en.start, fat, en.size, big);
    };
    return { get: get };
  }
  /* Текст документа по «таблице кусков» (piece table): куски бывают в UTF-16 и в 8-битной кодировке */
  function docPieceText(cf) {
    var wd = cf.get('WordDocument'); if (!wd || wd.length < 0x1AA) return '';
    var dw = new DataView(wd.buffer, wd.byteOffset, wd.byteLength);
    var tbl = cf.get((dw.getUint16(0x0A, true) & 0x0200) ? '1Table' : '0Table'); if (!tbl) return '';
    var fcClx = dw.getUint32(0x01A2, true), lcbClx = dw.getUint32(0x01A6, true);
    var clx = tbl.subarray(fcClx, fcClx + lcbClx), p = 0, dc = new DataView(clx.buffer, clx.byteOffset, clx.byteLength);
    while (p < clx.length && clx[p] === 0x01) p += 3 + dc.getUint16(p + 1, true);
    if (clx[p] !== 0x02) return '';
    var lcb = dc.getUint32(p + 1, true), plc = p + 5, n = (lcb - 4) / 12, out = '';
    var d16 = new TextDecoder('utf-16le'), d8 = new TextDecoder('windows-1252');
    for (var i = 0; i < n; i++) {
      var cp0 = dc.getUint32(plc + i * 4, true), cp1 = dc.getUint32(plc + (i + 1) * 4, true), pcd = plc + (n + 1) * 4 + i * 8;
      var fc = dc.getUint32(pcd + 2, true), comp = fc & 0x40000000, len = cp1 - cp0;
      if (comp) { var o8 = (fc & 0x3FFFFFFF) / 2; out += d8.decode(wd.subarray(o8, o8 + len)); }
      else out += d16.decode(wd.subarray(fc, fc + len * 2));
    }
    /* только основной текст (без колонтитулов и сносок): ccpText из FIB */
    var ccpText = dw.getUint32(0x4C, true);
    return ccpText > 0 && ccpText <= out.length ? out.slice(0, ccpText) : out;
  }
  function docBinaryText(bytes) {
    var cf = null, t = '';
    try { cf = cfbStreams(bytes); t = docPieceText(cf); } catch (e) { t = ''; }
    if (t.indexOf('<question>') < 0) return '';
    t = t.slice(t.indexOf('<question>'));
    /* поля Word: «\x13 код \x14 результат \x15» — код (например HYPERLINK "…") убираем, результат оставляем */
    t = t.replace(/\x13[^\x13\x14\x15]*\x14/g, '').replace(/\x13[^\x13\x15]*\x15/g, '').replace(/[\x13\x15]/g, '');
    /* таблицы → картинка */
    t = t.replace(/(?:[^\r\x07<]*\x07){3,}/g, function (seg) { var src = docTable(seg); return src ? '\r' + IMG_A + src + IMG_B + '\r' : seg.replace(/\x07+/g, ' '); });
    /* картинки: каждая метка \x01 (подряд идущие — одна картинка) → следующая картинка файла */
    var data = null; try { data = cf.get('Data'); } catch (e) { data = null; }
    var pics = data ? docPictures(data) : [], marks = t.match(/\x01[\x01\s]*/g) || [], k = 0;
    t = t.replace(/\x01[\x01\s]*/g, function () { return pics.length === marks.length ? IMG_A + pics[k++] + IMG_B + '\n' : ' '; });
    t = t.replace(/\r/g, '\n').replace(/[\x0b\x0c]/g, '\n').replace(/[\x00-\x01\x04-\x08\x0e-\x1f]/g, ' ');
    return placeImages(t);
  }
  function readTextDocument(f) {
    var name = f.name.toLowerCase();
    if (/\.docx$/.test(name)) {
      if (!window.mammoth) return Promise.reject(new Error(SP.t('tester.err.noDocxLib')));
      return f.arrayBuffer().then(function (ab) {
        return window.mammoth.convertToHtml({ arrayBuffer: ab }).then(function (r) {
          var t = docxToText(r.value);
          if (/<question/i.test(t)) return t;
          return window.mammoth.extractRawText({ arrayBuffer: ab }).then(function (x) { return x.value; });
        }, function () { return window.mammoth.extractRawText({ arrayBuffer: ab }).then(function (x) { return x.value; }); });
      });
    }
    if (/\.txt$/.test(name)) return f.text();
    if (/\.doc$/.test(name)) {
      return f.arrayBuffer().then(function (ab) {
        var bytes = new Uint8Array(ab), t = '';
        try { t = new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (e) { /* ничего */ }
        if (t.indexOf('<question>') < 0) try { t = new TextDecoder('windows-1251', { fatal: false }).decode(bytes); } catch (e) { /* ничего */ }
        if (/^\s*\{\\rtf/i.test(t)) return t.replace(/\\par[d]?/gi, '\n').replace(/\\'[0-9a-f]{2}/gi, '').replace(/\\[a-z]+\d* ?/gi, '').replace(/[{}]/g, '');
        /* настоящий старый Word: текст в UTF-16 + картинки внутри файла */
        if (bytes[0] === 0xD0 && bytes[1] === 0xCF) { var d = docBinaryText(bytes); if (d) return d; }
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
  /* withEx — дописать пояснение <explain> (StudyPlay его понимает, Платонус — нет) */
  function fmtQ(q, withImg, withEx) {
    var s = '<question>' + String(q.q).trim() + '\n', ex = withEx && String(q.ex || '').trim() ? '\n<explain>' + String(q.ex).trim() : '';
    if (withImg && q.img) s += '<question_image>' + q.img + '</question_image>\n';
    if (isKb(q)) return s + '<variant_keyboard>' + String(q.answer).trim() + ex;
    return s + q.opts.filter(function (o) { return String(o.t).trim(); }).map(function (o) { return (o.right ? '<variantright>' : '<variant>') + String(o.t).trim() + (withImg && o.img ? '<variant_image>' + o.img + '</variant_image>' : ''); }).join('\n') + ex;
  }
  function buildText(list, withImg, withEx) { return list.map(function (q) { return fmtQ(q, withImg, withEx); }).join('\n\n') + '\n'; }
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
  /* Запрос к ИИ: язык ответа = язык сайта (RU/KZ/EN), указан явно в начале и в конце */
  var LANG_NAME = { ru: 'русском (Russian)', kk: 'қазақ тілінде (Kazakh)', en: 'English' };
  function aiPrompt(q) {
    var lang = SP.lang(), head = SP.t('tester.aiLang', { lang: LANG_NAME[lang] || LANG_NAME.ru });
    var body = SP.t('tester.aiQ') + ' ' + q.q + '\n' + SP.t('tester.aiOpts') + '\n' + (q.opts || []).map(function (o, i) { return (i + 1) + ') ' + o.t; }).join('\n');
    var tail = SP.t('tester.aiAsk') + ' ' + head;
    return head + '\n' + body.slice(0, 1500 - head.length - tail.length - 4) + '\n' + tail;
  }
  var HL = { ru: 'ru', kk: 'kk', en: 'en' };
  function google(text, ai) { window.open('https://www.google.com/search?q=' + encodeURIComponent(text) + '&hl=' + (HL[SP.lang()] || 'ru') + (ai ? '&udm=50' : ''), '_blank', 'noopener'); }

  SP.testEngine = {
    parse: parse, normalizeQ: normalizeQ, problem: problem, serializeQ: serializeQ, isKb: isKb, isSpecial: isSpecial,
    qid: qid, checkKeyboard: checkKeyboard, checkChoice: checkChoice,
    readFile: readFile, readTextDocument: readTextDocument, validateFile: validateFile,
    buildText: buildText, fmtQ: fmtQ, makeDocRtf: makeDocRtf, mkDocx: mkDocx,
    richHtml: richHtml, img: img, explainHtml: explainHtml, translateQ: translateQ, translateFallback: translateFallback,
    aiPrompt: aiPrompt, google: google,
    blankQ: function () { return { q: '', opts: [0, 1, 2, 3].map(function () { return { t: '', right: false, img: '' }; }), img: '', type: 'choice', answer: '' }; },
    blankOpts: function () { return [0, 1, 2, 3].map(function () { return { t: '', right: false, img: '' }; }); }
  };
})();

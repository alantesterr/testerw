/* =====================================================================
   ПРЕДМЕТЫ, ОРУЖИЕ, ЛУТ И ПЕРЕВОД ВОПРОСОВ (этап 3).
   Иконки зелий и оружия — из набора 0x72 (CC0), остальное нарисовано.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.DG, A = window.DA, S = D.save;
  var X = window.DX = {};

  /* ---------- каталог ---------- */
  X.ITEMS = {
    potion:   { name: 'Малое зелье', desc: '+1 сердечко', price: 40, icon: 'flask_red', key: 'P', rar: 0 },
    bigpot:   { name: 'Большое зелье', desc: 'все сердечки восстановлены', price: 120, icon: 'flask_big_red', rar: 1 },
    fifty:    { name: 'Свиток 50/50', desc: 'убирает 2 неверных варианта', price: 60, icon: '@scroll', key: 'H', rar: 0, assist: true },
    bulb:     { name: 'Лампа-подсказка', desc: 'намёк из лекции к вопросу', price: 45, icon: '@bulb', key: 'L', rar: 0, assist: true },
    google:   { name: 'Око Google', desc: 'поиск вопроса в Google', price: 35, icon: '@google', key: 'G', rar: 0, assist: true },
    ai:       { name: 'Кристалл ИИ', desc: 'ИИ объяснит вопрос', price: 70, icon: '@ai', key: 'I', rar: 1, assist: true },
    shield:   { name: 'Щит', desc: 'следующая ошибка без урона', price: 70, icon: '@shield', key: 'S', rar: 0 },
    feather:  { name: 'Перо феникса', desc: 'оживляет с 3 сердцами (само)', price: 400, icon: '@feather', rar: 3 },
    ice:      { name: 'Ледяной кристалл', desc: 'спасёт огонёк, если пропустишь 1 день (само)', price: 150, icon: '@ice', rar: 1 }
  };
  X.HOTBAR = ['potion', 'bigpot', 'fifty', 'bulb', 'google', 'ai', 'shield'];
  X.WEAPONS = {
    wood:   { name: 'Деревянный меч', desc: 'обычный удар, не ломается', icon: 'weapon_rusty_sword', dur: 0, rar: 0 },
    steel:  { name: 'Стальной клинок', desc: 'урон ×2', icon: 'weapon_knight_sword', dur: 30, price: 180, rar: 1 },
    dagger: { name: 'Кинжал удачи', desc: '50%: урон ×2', icon: 'weapon_katana', dur: 30, price: 150, rar: 1 },
    staff:  { name: 'Посох рассечения', desc: '33%: снести половину сердец монстра', icon: 'weapon_red_magic_staff', dur: 25, price: 260, rar: 2 },
    hammer: { name: 'Молот берсерка', desc: 'урон ×3, но ошибка отнимает 2 ♥', icon: 'weapon_big_hammer', dur: 20, price: 300, rar: 2 },
    legend: { name: 'Клинок Страуструпа', desc: 'урон ×2 и 5%: убить любого с одного удара', icon: 'weapon_golden_sword', dur: 40, price: 650, rar: 3 }
  };
  X.RAR = ['обычное', 'редкое', 'эпическое', 'легендарное'];
  X.RAR_COL = ['#4a4370', '#378ADD', '#7F77DD', '#EF9F27'];
  X.REPAIR = 80;

  /* ---------- инвентарь ---------- */
  if (!S.inv) S.inv = { items: { potion: 2, fifty: 1, bulb: 1 }, weapons: [{ k: 'wood', dur: 0 }], hand: 0 };
  if (!S.cfg) {
    var sp = {}; try { sp = JSON.parse(localStorage.getItem('sp-settings') || '{}') || {}; } catch (e) { /* нет настроек StudyPlay */ }
    S.cfg = { trLang: sp.trLang === 'kk' ? 'kk' : 'ru', autoTr: !!sp.autoTr };
  }
  X.count = function (k) { return S.inv.items[k] || 0; };
  X.add = function (k, n) { S.inv.items[k] = (S.inv.items[k] || 0) + (n || 1); };
  X.take = function (k) { if (!X.count(k)) return false; S.inv.items[k]--; return true; };
  X.weapon = function () { var w = S.inv.weapons[S.inv.hand] || S.inv.weapons[0]; return w; };
  X.addWeapon = function (k) { var W = X.WEAPONS[k]; S.inv.weapons.push({ k: k, dur: W.dur }); };

  /* урон оружия: base — сколько сердец снимает удар без оружия */
  X.hit = function (base, mon) {
    var w = X.weapon(), W = X.WEAPONS[w.k], broken = W.dur && w.dur <= 0, dmg = base, note = '';
    if (!broken) {
      if (w.k === 'steel') dmg = base * 2;
      else if (w.k === 'dagger') { if (Math.random() < 0.5) { dmg = base * 2; note = 'Удача ×2!'; } }
      else if (w.k === 'staff') { if (Math.random() < 0.33) { dmg = Math.max(base, Math.ceil(mon.max / 2)); note = 'Рассечение!'; } }
      else if (w.k === 'hammer') dmg = base * 3;
      else if (w.k === 'legend') { if (Math.random() < 0.05) { dmg = mon.hp; note = 'КЛИНОК СТРАУСТРУПА!'; } else dmg = base * 2; }
      if (W.dur) { w.dur--; if (w.dur === 0) note = (note ? note + ' ' : '') + W.name + ' сломался — почини в лавке'; }
    }
    return { dmg: dmg, note: note };
  };
  X.hurtCost = function () { var w = X.weapon(), W = X.WEAPONS[w.k]; return w.k === 'hammer' && !(W.dur && w.dur <= 0) ? 2 : 1; };

  /* ---------- лут ---------- */
  function pickW(rare) { var pool = Object.keys(X.WEAPONS).filter(function (k) { return k !== 'wood' && X.WEAPONS[k].rar === rare; }); return pool[Math.floor(Math.random() * pool.length)]; }
  X.loot = function (kind) {
    /* kind: 'chest' — обычный сундук, 'boss' — железный сундук босса */
    var out = { iq: kind === 'boss' ? 30 + Math.floor(Math.random() * 21) : 10 + Math.floor(Math.random() * 16), items: [], weapon: null };
    var common = ['potion', 'potion', 'fifty', 'bulb', 'google', 'shield'], rare = ['ai', 'bigpot', 'ice'];
    var n = kind === 'boss' ? 2 : 1;
    for (var i = 0; i < n; i++) out.items.push(Math.random() < (kind === 'boss' ? 0.4 : 0.15) ? rare[Math.floor(Math.random() * rare.length)] : common[Math.floor(Math.random() * common.length)]);
    S.pity = (S.pity || 0) + 1;
    var r = Math.random(), wChance = kind === 'boss' ? 0.45 : 0.08;
    if (S.pity >= 10 || r < wChance) {
      var roll = Math.random(), rar = kind === 'boss' ? (roll < 0.08 ? 3 : roll < 0.4 ? 2 : 1) : (roll < 0.02 ? 3 : roll < 0.2 ? 2 : 1);
      if (S.pity >= 10) rar = Math.max(rar, 2);
      out.weapon = pickW(rar); S.pity = 0;
    }
    if (kind === 'boss' && Math.random() < 0.05) out.items.push('feather');
    out.items.forEach(function (k) { X.add(k); }); if (out.weapon) X.addWeapon(out.weapon); S.iq += out.iq;
    return out;
  };

  /* ---------- иконки ---------- */
  var PIX = {
    scroll: { p: { a: '#F1E4C8', b: '#BA7517', t: '#7F77DD' }, r: ['bbbbbbbbbb', '.aaaaaaaa.', '.atttttta.', '.aaaaaaaa.', '.atttaaaa.', '.aaaaaaaa.', 'bbbbbbbbbb'] },
    bulb: { p: { a: '#FFD25A', b: '#fff3b0', g: '#888780' }, r: ['...aaaa...', '..abbaaa..', '.abbaaaaa.', '.aaaaaaaa.', '..aaaaaa..', '...aaaa...', '...gggg...', '...gggg...', '....gg....'] },
    shield: { p: { a: '#378ADD', b: '#B5D4F4', e: '#FFD25A' }, r: ['.eeeeeeee.', 'eaaaaaaaae', 'eabaaaaaae', 'eabaaaaaae', 'eaaaaaaaae', '.eaaaaaae.', '..eaaaae..', '...eaae...', '....ee....'] },
    feather: { p: { a: '#F0997B', b: '#FAC775' }, r: ['.........ab', '........aab', '.......aab.', '......aab..', '.....aab...', '....aab....', '...aab.....', '..a........', '.a.........'] },
    ice: { p: { a: '#85B7EB', b: '#E6F1FB' }, r: ['....a....', '...aba...', '..abbba..', 'aabbbbbaa', '..abbba..', '...aba...', '....a....'] },
    google: { p: { b: '#4285F4', r: '#EA4335', y: '#FBBC05', g: '#34A853' }, r: ['..rrrrr..', '.rr...rr.', 'yy.......', 'yy...bbbb', 'yy....bb.', '.gg...bb.', '..ggggg..'] },
    ai: { p: { a: '#5DCAA5', b: '#E1F5EE', c: '#0F6E56' }, r: ['....a....', '...aba...', '..abbba..', '.abbcbba.', 'abbcccbba', '.abbcbba.', '..abbba..', '...aba...', '....a....'] }
  };
  var cache = {};
  X.iconUrl = function (name) {
    if (cache[name]) return cache[name];
    var cv = document.createElement('canvas'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    if (name.charAt(0) === '@') {
      var o = PIX[name.slice(1)], w = 0; o.r.forEach(function (r) { w = Math.max(w, r.length); });
      cv.width = w * 4; cv.height = o.r.length * 4;
      o.r.forEach(function (r, j) { for (var i = 0; i < r.length; i++) { var col = o.p[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i * 4, j * 4, 4, 4); } } });
    } else {
      var t = A.tiles[name]; if (!t) return '';
      var s = Math.max(1, Math.floor(40 / Math.max(t.w, t.h))); cv.width = t.w * s; cv.height = t.h * s;
      x.drawImage(A.sheet, t.x, t.y, t.w, t.h, 0, 0, t.w * s, t.h * s);
    }
    return (cache[name] = cv.toDataURL());
  };
  X.itemIcon = function (k) { var it = X.ITEMS[k] || X.WEAPONS[k]; return it ? X.iconUrl(it.icon) : ''; };

  /* ---------- ПЕРЕВОД (Google Translate, как в Тестере StudyPlay) ---------- */
  var TR_KEY = 'sp-dungeon-tr', trCache = {};
  try { trCache = JSON.parse(localStorage.getItem(TR_KEY) || '{}') || {}; } catch (e) { trCache = {}; }
  function saveTr() { try { var k = Object.keys(trCache); if (k.length > 600) k.slice(0, 200).forEach(function (x) { delete trCache[x]; }); localStorage.setItem(TR_KEY, JSON.stringify(trCache)); } catch (e) { /* без кэша */ } }
  function gt(text, tl) {
    return fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t&q=' + encodeURIComponent(text))
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return j[0].map(function (x) { return x[0]; }).join(''); });
  }
  /* переводим только обычный текст: блоки ```код``` и `код` не трогаем */
  function trProse(s, tl) {
    var codes = [], src = s.replace(/`[^`]+`/g, function (m) { codes.push(m); return '⟦' + (codes.length - 1) + '⟧'; });
    if (!/[A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]{2,}/.test(src)) return Promise.resolve(s);
    return gt(src, tl).then(function (t) { return t.replace(/⟦\s*(\d+)\s*⟧/g, function (_, i) { return codes[+i] || ''; }); });
  }
  X.trText = function (s, tl) {
    s = String(s || ''); var key = tl + '|' + s; if (trCache[key]) return Promise.resolve(trCache[key]);
    var parts = s.split(/(```[\s\S]*?```)/);
    return Promise.all(parts.map(function (p) { return /^```/.test(p) || !p.trim() ? Promise.resolve(p) : trProse(p, tl); }))
      .then(function (r) { var out = r.join(''); trCache[key] = out; saveTr(); return out; });
  };
  /* вариант похож на код — не переводим */
  X.isCodeLike = function (t) {
    t = String(t || '').trim(); if (/^`[^`]*`$/.test(t)) t = t.slice(1, -1);
    var words = t.match(/[A-Za-z]{3,}/g) || [], hard = /[{}=<>#\[\]]|\+\+|&&|\|\||::|->|%[a-z]\b|\w\(/.test(t) ||
      (/\b(int|void|float|double|char|bool|const|cout|cin|return|class|struct|sizeof|unsigned|long|short)\b/.test(t) && /[;(*&]/.test(t));
    if (words.length >= 2 && !hard) return false;          /* обычная фраза, хоть и с «;» или скобками */
    return hard || /[;()%]/.test(t) || !words.length;
  };
  X.trQuestion = function (q, tl) {
    return Promise.all([X.trText(q.q, tl)].concat((q.opts || []).map(function (o) { return X.isCodeLike(o.t) ? Promise.resolve(o.t) : X.trText(String(o.t).replace(/^`([^`]*)`$/, '$1'), tl); })))
      .then(function (r) { return { q: r[0], o: r.slice(1) }; });
  };
  X.LANGS = { ru: 'Русский', kk: 'Қазақша' };
})();

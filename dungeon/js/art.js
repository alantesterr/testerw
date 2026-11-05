/* =====================================================================
   ГРАФИКА: загрузка наборов (CC0), герой (рисуется кодом), фоны сцен,
   факелы, монстры с анимациями.
   Наборы: Luiz Melo «Monsters Creatures Fantasy», 0x72 «DungeonTileset II».
   ===================================================================== */
(function () {
  'use strict';
  var A = window.DA = {};
  var W = 480, H = 270;
  A.W = W; A.H = H;

  var img = function (src) { return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { no(new Error(src)); }; i.src = src; }); };

  /* ---------- атлас 0x72 ---------- */
  A.tiles = {};
  A.anim = {};           /* имя → [кадры] */
  var LM = ['mushroom', 'goblin', 'skeleton', 'flyingeye'];
  var LM_FILES = { mushroom: ['idle', 'attack', 'takehit', 'death'], goblin: ['idle', 'attack', 'takehit', 'death'], skeleton: ['idle', 'attack', 'takehit', 'death'], flyingeye: ['flight', 'attack', 'takehit', 'death'] };
  A.lm = {};

  A.load = function () {
    var jobs = [img('assets/dungeon.png'), fetch('assets/dungeon_tiles.txt').then(function (r) { return r.text(); })];
    LM.forEach(function (m) { LM_FILES[m].forEach(function (f) { jobs.push(img('assets/monsters/' + m + '/' + f + '.png').then(function (i) { (A.lm[m] = A.lm[m] || {})[f === 'flight' ? 'idle' : f] = i; })); }); });
    return Promise.all(jobs).then(function (r) {
      A.sheet = r[0];
      r[1].split(/\r?\n/).forEach(function (line) {
        var p = line.trim().split(/\s+/); if (p.length < 5) return;
        var t = { x: +p[1], y: +p[2], w: +p[3], h: +p[4] }; A.tiles[p[0]] = t;
        var m = p[0].match(/^(.*?)(?:_anim)?_f(\d+)$/); if (m) { (A.anim[m[1]] = A.anim[m[1]] || [])[+m[2]] = t; }
      });
      buildHero(); buildHeartIcons();
    });
  };
  A.tile = function (c, name, x, y, s, flip) {
    var t = A.tiles[name]; if (!t) return; s = s || 1;
    if (flip) { c.save(); c.translate(x + t.w * s, y); c.scale(-1, 1); c.drawImage(A.sheet, t.x, t.y, t.w, t.h, 0, 0, t.w * s, t.h * s); c.restore(); }
    else c.drawImage(A.sheet, t.x, t.y, t.w, t.h, x, y, t.w * s, t.h * s);
  };
  A.frame = function (c, t, x, y, s, flip) {
    if (!t) return; s = s || 1;
    if (flip) { c.save(); c.translate(x + t.w * s, y); c.scale(-1, 1); c.drawImage(A.sheet, t.x, t.y, t.w, t.h, 0, 0, t.w * s, t.h * s); c.restore(); }
    else c.drawImage(A.sheet, t.x, t.y, t.w, t.h, x, y, t.w * s, t.h * s);
  };

  /* ---------- сердечки для HUD (из атласа) ---------- */
  function buildHeartIcons() {
    A.heartUrl = {};
    ['ui_heart_full', 'ui_heart_empty', 'ui_heart_half'].forEach(function (n) {
      var t = A.tiles[n]; if (!t) return; var cv = document.createElement('canvas'); cv.width = t.w * 3; cv.height = t.h * 3;
      var x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(A.sheet, t.x, t.y, t.w, t.h, 0, 0, t.w * 3, t.h * 3); A.heartUrl[n] = cv.toDataURL();
    });
  }

  /* ---------- ГЕРОЙ: пиксельный парень в бирюзовом плаще ---------- */
  var HW = 48, HH = 44, HX = 18;   /* холст кадра; HX — центр тела, ноги внизу */
  var PAL = { o: '#120e18', hair: '#1f1d2b', hairL: '#3a3852', skin: '#f2c4a0', skinS: '#d4977a', eye: '#14101c',
    coat: '#13807a', coatD: '#0b5752', coatL: '#2fb3a8', shirt: '#b23a40', shirtD: '#7e2530', pants: '#2b2a38', pantsD: '#1d1c27', boot: '#17141f',
    blade: '#e6e9f2', bladeD: '#9aa0b4', hilt: '#c8922a', guard: '#ffd25a' };
  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function line(c, x0, y0, x1, y1, col, th) {
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx - dy; th = th || 1;
    for (var i = 0; i < 200; i++) { px(c, x0, y0, th, th, col); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } }
  }
  function drawHeroPose(c, pose) {
    /* pose: {legF, legB, lift, coatTail, arm:'idle'|'up'|'slash'|'follow'|'hurt', bob, lean} */
    var b = pose.bob || 0, X = HX + (pose.lean || 0);
    /* задняя нога */
    px(c, X - 3 + pose.legB, 30 + b, 3, 9 - (pose.liftB || 0), PAL.pantsD); px(c, X - 4 + pose.legB, 39 - (pose.liftB || 0), 5, 2, PAL.boot);
    /* передняя нога */
    px(c, X + 1 + pose.legF, 30 + b, 3, 9 - (pose.liftF || 0), PAL.pants); px(c, X + 1 + pose.legF, 39 - (pose.liftF || 0), 5, 2, PAL.boot);
    /* плащ: развевающийся хвост сзади */
    var tail = pose.coatTail || 0;
    for (var y = 18; y <= 35; y++) {
      var k = (y - 18) / 17, l = Math.round(X - 5 - k * (2 + tail)), r = Math.round(X + 5 + k * 1.5);
      px(c, l, y + b, r - l + 1, 1, PAL.coat); px(c, l, y + b, 2, 1, PAL.coatD); px(c, r - 1, y + b, 1, 1, PAL.coatL);
    }
    /* рубашка и пояс */
    px(c, X, 19 + b, 3, 9, PAL.shirt); px(c, X, 19 + b, 1, 9, PAL.shirtD); px(c, X - 4, 28 + b, 9, 1, PAL.pantsD);
    /* воротник */
    px(c, X - 3, 17 + b, 3, 3, PAL.coatD); px(c, X + 3, 17 + b, 3, 3, PAL.coatD);
    /* голова */
    var hy = 6 + b;
    px(c, X - 3, hy + 3, 10, 9, PAL.skin); px(c, X - 3, hy + 10, 10, 2, PAL.skinS); px(c, X + 1, hy + 12, 3, 2, PAL.skinS);
    /* глаз и рот (смотрит вправо) */
    px(c, X + 4, hy + 6, 1, 2, PAL.eye); px(c, X + 4, hy + 10, 2, 1, PAL.skinS);
    /* волосы: острые пряди */
    px(c, X - 4, hy, 11, 5, PAL.hair); px(c, X - 5, hy + 2, 3, 9, PAL.hair); px(c, X + 5, hy + 3, 3, 3, PAL.hair);
    px(c, X - 1, hy - 2, 2, 2, PAL.hair); px(c, X + 2, hy - 3, 2, 3, PAL.hair); px(c, X + 5, hy - 1, 2, 2, PAL.hair); px(c, X - 4, hy - 1, 2, 2, PAL.hair);
    px(c, X + 6, hy + 5, 2, 3, PAL.hair); px(c, X + 2, hy + 4, 2, 2, PAL.hair);
    px(c, X, hy + 1, 4, 1, PAL.hairL); px(c, X - 3, hy + 2, 2, 1, PAL.hairL);
    /* рука + меч */
    var sx = X + 4, sy = 19 + b, hx, hyy, tx, ty;
    if (pose.arm === 'up') { hx = X + 2; hyy = 12 + b; tx = X - 8; ty = -2 + b; }
    else if (pose.arm === 'slash') { hx = X + 10; hyy = 21 + b; tx = X + 27; ty = 19 + b; }
    else if (pose.arm === 'follow') { hx = X + 8; hyy = 26 + b; tx = X + 20; ty = 38 + b; }
    else if (pose.arm === 'hurt') { hx = X + 3; hyy = 26 + b; tx = X + 12; ty = 36 + b; }
    else { hx = X + 6; hyy = 26 + b; tx = X + 15; ty = 36 + b; }
    line(c, sx, sy, hx, hyy, PAL.coat, 3); line(c, sx + 1, sy, hx, hyy, PAL.coatL, 1);
    line(c, hx, hyy, tx, ty, PAL.blade, 2); line(c, hx + 1, hyy + 1, tx, ty, PAL.bladeD, 1);
    px(c, hx - 1, hyy - 1, 3, 3, PAL.guard); px(c, hx, hyy, 2, 2, PAL.skin);
  }
  function outline(cv) {
    var c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height), p = d.data, w = cv.width, h = cv.height;
    var a = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && p[(y * w + x) * 4 + 3] > 0; };
    var o = c.createImageData(w, h), q = o.data;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;
      if (p[i + 3] > 0) { q[i] = p[i]; q[i + 1] = p[i + 1]; q[i + 2] = p[i + 2]; q[i + 3] = 255; }
      else if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) { q[i] = 18; q[i + 1] = 14; q[i + 2] = 24; q[i + 3] = 255; }
    }
    c.putImageData(o, 0, 0); return cv;
  }
  function mk(pose) { var cv = document.createElement('canvas'); cv.width = HW; cv.height = HH; drawHeroPose(cv.getContext('2d'), pose); return outline(cv); }
  function buildHero() {
    A.hero = {
      idle: [mk({ legF: 0, legB: 0, bob: 0 }), mk({ legF: 0, legB: 0, bob: 1, coatTail: 1 })],
      walk: [mk({ legF: 3, legB: -3, coatTail: 3, liftB: 1 }), mk({ legF: 1, legB: -1, bob: -1, coatTail: 4 }), mk({ legF: -3, legB: 3, coatTail: 3, liftF: 1 }), mk({ legF: -1, legB: 1, bob: -1, coatTail: 4 })],
      attack: [mk({ legF: 2, legB: -2, arm: 'up', lean: -1 }), mk({ legF: 4, legB: -4, arm: 'slash', lean: 2, coatTail: 5 }), mk({ legF: 3, legB: -3, arm: 'follow', lean: 1, coatTail: 3 })],
      hurt: [mk({ legF: -1, legB: 1, arm: 'hurt', lean: -2, coatTail: 2 })]
    };
  }
  /* нарисовать героя: x — центр, y — пол */
  A.drawHero = function (c, anim, f, x, y, s, flash) {
    var list = A.hero[anim] || A.hero.idle, n = list.length; f = Math.floor(f) || 0;
    var fr = list[((f % n) + n) % n]; s = s || 2;
    c.drawImage(fr, Math.round(x - HX * s), Math.round(y - 41 * s), HW * s, HH * s);
    if (flash) { c.save(); c.globalCompositeOperation = 'source-atop'; c.restore(); }
  };

  /* ---------- монстры ---------- */
  /* lm — Luiz Melo (кадры 150×150, анимации), t — 0x72 (маленькие, масштаб 2) */
  A.MON = {
    mushroom: { lm: 'mushroom', name: 'Гриб', s: 1.4, h: 52 },
    goblin: { lm: 'goblin', name: 'Гоблин', s: 1.4, h: 52 },
    skeleton: { lm: 'skeleton', name: 'Скелет', s: 1.4, h: 56 },
    eye: { lm: 'flyingeye', name: 'Летающий глаз', s: 1.4, h: 48, fly: true },
    imp: { t: 'imp_idle', name: 'Бесёнок', s: 3 },
    tzombie: { t: 'tiny_zombie_idle', name: 'Зомби-малыш', s: 3 },
    slug: { t: 'slug', name: 'Слизень', s: 3 },
    skelet: { t: 'skelet_idle', name: 'Костяшка', s: 3 },
    orc: { t: 'orc_warrior_idle', name: 'Орк', s: 3 },
    shaman: { t: 'orc_shaman_idle', name: 'Орк-шаман', s: 3 },
    masked: { t: 'masked_orc_idle', name: 'Орк в маске', s: 3 },
    necro: { t: 'necromancer', name: 'Некромант', s: 3 },
    chort: { t: 'chort_idle', name: 'Чёрт', s: 3 },
    wogol: { t: 'wogol_idle', name: 'Воггол', s: 3 },
    swampy: { t: 'swampy', name: 'Болотник', s: 3 },
    twin: { t: 'wogol_idle', name: 'Двойник', s: 3, twin: true },
    sophist: { t: 'necromancer', name: 'Софист', s: 3 },
    sage: { t: 'wizzard_m_idle', name: 'Мудрец', s: 2.6 },
    overlord: { t: 'big_demon_idle', name: 'Владыка Экзамена', s: 4.4, boss: true },
    ogre: { t: 'ogre_idle', name: 'Огр', s: 3.4, boss: true },
    bzombie: { t: 'big_zombie_idle', name: 'Большой зомби', s: 3.4, boss: true },
    demon: { t: 'big_demon_idle', name: 'Демон', s: 3.4, boss: true }
  };
  /* состояния: idle / attack / hit / death; t — время в состоянии (мс) */
  A.drawMonster = function (c, key, state, t, x, y, alpha) {
    var M = A.MON[key]; if (!M) return;
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
    if (M.lm) {
      var set = A.lm[M.lm], sh = state === 'hit' ? set.takehit : state === 'attack' ? set.attack : state === 'death' ? set.death : set.idle;
      var n = Math.round(sh.width / 150), fps = state === 'idle' ? 8 : 14, f = Math.floor(t / 1000 * fps);
      if (state === 'death') f = Math.min(n - 1, f); else f %= n;
      /* в кадрах Luiz Melo персонаж в центре 150×150, ноги примерно на 100-й строке */
      c.translate(x, y); c.scale(-1, 1);
      var k = M.s; c.drawImage(sh, f * 150, 0, 150, 150, -75 * k, (-100 - (M.fly ? 18 : 0)) * k, 150 * k, 150 * k);
    } else {
      var fr = A.anim[M.t] || [A.tiles[M.t]], k = Math.floor(t / 120) % fr.length, tt = fr[k] || fr[0], s = M.s;
      var dx = 0, rot = 0;
      if (state === 'attack') dx = -Math.sin(Math.min(1, t / 300) * Math.PI) * 30;
      if (state === 'hit') dx = Math.sin(t / 30) * 3 + 6;
      if (state === 'death') { rot = Math.min(1, t / 500) * 1.2; c.globalAlpha *= Math.max(0, 1 - t / 700); }
      c.translate(x + dx, y); c.rotate(rot); c.scale(-1, 1);
      c.drawImage(A.sheet, tt.x, tt.y, tt.w, tt.h, -tt.w * s / 2, -tt.h * s, tt.w * s, tt.h * s);
      if (state === 'hit' && t < 160) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; c.drawImage(A.sheet, tt.x, tt.y, tt.w, tt.h, -tt.w * s / 2, -tt.h * s, tt.w * s, tt.h * s); }
    }
    c.restore();
  };
  A.monHeight = function (key) { var M = A.MON[key]; if (M.lm) return M.h * M.s * 0.72; var t = (A.anim[M.t] || [A.tiles[M.t]])[0]; return t.h * M.s; };
  A.monDur = function (key, state) { var M = A.MON[key]; if (M.lm) { var sh = A.lm[M.lm][state === 'hit' ? 'takehit' : state]; return sh ? Math.round(sh.width / 150) / 14 * 1000 : 400; } return state === 'death' ? 700 : 350; };

  /* сердечки над головой (пиксельные, из атласа) */
  A.hearts = function (c, cx, y, n, max) {
    var w = 12, x0 = Math.round(cx - max * w / 2);
    for (var i = 0; i < max; i++) A.tile(c, i < n ? 'ui_heart_full' : 'ui_heart_empty', x0 + i * w, y, 0.9);
  };

  /* ---------- алтарь знаний: каменная подставка и парящая книга ---------- */
  A.altar = function (c, x, y, t, used) {
    var bob = Math.round(Math.sin(t / 400) * 2);
    if (!used) {
      var g = c.createRadialGradient(x, y - 44, 4, x, y - 44, 46);
      g.addColorStop(0, 'rgba(160,150,255,' + (0.45 + 0.1 * Math.sin(t / 300)) + ')'); g.addColorStop(1, 'rgba(127,119,221,0)');
      c.fillStyle = g; c.fillRect(x - 50, y - 92, 100, 100);
    }
    c.fillStyle = '#3a3742'; c.fillRect(x - 16, y - 6, 32, 6);
    c.fillStyle = '#5c5966'; c.fillRect(x - 11, y - 30, 22, 24);
    c.fillStyle = '#4a4752'; c.fillRect(x - 11, y - 22, 22, 2); c.fillRect(x - 11, y - 14, 22, 2);
    c.fillStyle = '#6e6b78'; c.fillRect(x - 15, y - 34, 30, 5);
    var by = y - 52 + bob;
    c.fillStyle = used ? '#4a4370' : '#3C3489'; c.fillRect(x - 13, by, 26, 14);
    c.fillStyle = used ? '#b9b2a0' : '#F1E4C8'; c.fillRect(x - 11, by + 1, 10, 11); c.fillRect(x + 1, by + 1, 10, 11);
    c.fillStyle = used ? '#7d7a92' : '#7F77DD'; for (var i = 0; i < 4; i++) { c.fillRect(x - 9, by + 3 + i * 2, 6, 1); c.fillRect(x + 3, by + 3 + i * 2, 6, 1); }
    if (!used && Math.floor(t / 180) % 4 === 0) { c.fillStyle = '#CECBF6'; c.fillRect(x - 18 + (Math.floor(t / 90) % 36), by - 6, 1, 1); }
  };

  /* ---------- факел ---------- */
  A.torch = function (c, x, y, t) {
    var f = Math.sin(t / 90) + Math.sin(t / 37) * 0.5;
    var g = c.createRadialGradient(x, y - 6, 2, x, y - 6, 70 + f * 4);
    g.addColorStop(0, 'rgba(255,190,90,0.32)'); g.addColorStop(1, 'rgba(255,150,40,0)');
    c.fillStyle = g; c.fillRect(x - 80, y - 86, 160, 160);
    c.fillStyle = '#2c2630'; c.fillRect(x - 2, y, 4, 9); c.fillStyle = '#4a4252'; c.fillRect(x - 4, y - 1, 8, 3);
    var h = 9 + Math.round(f * 1.5);
    c.fillStyle = '#e0441c'; c.fillRect(x - 3, y - h + 2, 6, h - 1);
    c.fillStyle = '#ff9a1f'; c.fillRect(x - 2, y - h + 3, 4, h - 3);
    c.fillStyle = '#ffe28a'; c.fillRect(x - 1, y - 4, 2, 3);
    if ((Math.floor(t / 140) % 3) === 0) { c.fillStyle = '#ffb347'; c.fillRect(x + (Math.floor(t / 70) % 3) - 1, y - h - 2, 1, 1); }
  };

  /* ---------- фоны ---------- */
  function wall(c, y0, y1, dark) {
    for (var y = y0; y < y1; y += 16) for (var x = 0; x < W; x += 16) A.tile(c, 'wall_mid', x, y);
    for (var x2 = 0; x2 < W; x2 += 16) A.tile(c, 'wall_top_mid', x2, y0 - 16);
    if (dark) { c.fillStyle = 'rgba(8,6,16,' + dark + ')'; c.fillRect(0, y0 - 16, W, y1 - y0 + 16); }
  }
  function floorRow(c, y0) {
    for (var y = y0; y < H; y += 16) for (var x = 0; x < W; x += 16) { var k = ((x * 7 + y * 13) >> 4) % 8; A.tile(c, 'floor_' + (k === 7 ? 3 : k === 6 ? 2 : 1), x, y); }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y0, W, 6);
  }
  function vignette(c, k) {
    var g = c.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (k || 0.6) + ')'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  A.FLOOR_Y = 214;

  A.bgRoom = function (c, t, opt) {
    opt = opt || {};
    c.fillStyle = '#0c0a12'; c.fillRect(0, 0, W, H);
    wall(c, 32, A.FLOOR_Y, 0.25);
    /* колонны и знамёна */
    [70, 200, 330, 450].forEach(function (x, i) { A.tile(c, 'column', x - 8, A.FLOOR_Y - 48); if (i < 3) A.tile(c, ['wall_banner_red', 'wall_banner_blue', 'wall_banner_green'][(i + (opt.seed || 0)) % 3], x + 57, 70); });
    if (opt.goo) A.tile(c, 'wall_goo', 150, 110);
    if (opt.hole) A.tile(c, 'wall_hole_1', 400, 140);
    floorRow(c, A.FLOOR_Y);
    [135, 265, 395].forEach(function (x) { A.torch(c, x, 96, t + x * 7); });
    /* дверь-выход справа */
    if (opt.exit) { A.tile(c, 'doors_frame_left', W - 52, A.FLOOR_Y - 32); A.tile(c, opt.exitOpen ? 'doors_leaf_open' : 'doors_leaf_closed', W - 52, A.FLOOR_Y - 32); }
    vignette(c, 0.55);
  };

  A.bgHall = function (c, t) {
    c.fillStyle = '#0c0a12'; c.fillRect(0, 0, W, H);
    wall(c, 32, A.FLOOR_Y, 0.15);
    floorRow(c, A.FLOOR_Y);
    /* четыре двери: Архитектура, C++ (большая), Философия, ИКТ; дверь текущего предмета светится */
    var doors = [{ x: 64, key: 'arch' }, { x: 184, key: 'cpp', big: true }, { x: 304, key: 'phil' }, { x: 420, key: 'ict' }];
    doors.forEach(function (d) {
      var s = d.big ? 3 : 2.4, w = 32 * s, h = 32 * s, x = d.x - w / 2, y = A.FLOOR_Y - h;
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x - 6, y - 8, w + 12, h + 8);
      A.tile(c, 'doors_leaf_closed', x, y, s);
      if (d.key === (A.hallGlow || 'cpp')) { c.fillStyle = 'rgba(93,202,165,' + (0.12 + 0.06 * Math.sin(t / 300)) + ')'; c.fillRect(x, y, w, h); }
    });
    A.torch(c, 124, 100, t); A.torch(c, 244, 100, t + 300); A.torch(c, 362, 100, t + 600);
    vignette(c, 0.5);
    return doors;
  };

  A.bgHouse = function (c, t) {
    /* деревянная комната с камином, окном, кроватью и полкой */
    for (var y = 0; y < A.FLOOR_Y; y += 12) for (var x = 0; x < W + 48; x += 48) { c.fillStyle = ((x / 48 + y / 12) % 2) ? '#4a301a' : '#43291a'; c.fillRect(x + ((y / 12) % 2 ? 24 : 0) - 24, y, 47, 11); }
    c.fillStyle = '#2e1c0f'; for (var yy = 11; yy < A.FLOOR_Y; yy += 12) c.fillRect(0, yy, W, 1);
    for (var fy = A.FLOOR_Y; fy < H; fy += 8) for (var fx = -16; fx < W; fx += 32) { c.fillStyle = '#6b4526'; c.fillRect(fx + (fy % 16 ? 16 : 0), fy, 31, 7); }
    /* окно с луной */
    c.fillStyle = '#2b2236'; c.fillRect(56, 50, 54, 64); c.fillStyle = '#1b2a4a'; c.fillRect(60, 54, 46, 56);
    c.fillStyle = '#e8eefc'; c.beginPath(); c.arc(92, 70, 7, 0, 7); c.fill(); c.fillStyle = '#1b2a4a'; c.beginPath(); c.arc(95, 68, 6, 0, 7); c.fill();
    c.fillStyle = '#4a301a'; c.fillRect(82, 54, 3, 56); c.fillRect(60, 80, 46, 3);
    /* камин */
    c.fillStyle = '#5e5a66'; c.fillRect(196, 70, 88, 144); c.fillStyle = '#4a4752'; for (var by = 74; by < 214; by += 10) for (var bx = 196; bx < 284; bx += 22) c.fillRect(bx + (by % 20 ? 11 : 0), by, 20, 1);
    c.fillStyle = '#16121c'; c.fillRect(214, 150, 52, 64); c.fillRect(220, 144, 40, 6);
    var f = Math.sin(t / 80) * 2;
    c.fillStyle = '#e0441c'; c.fillRect(224, 182 - f, 32, 32 + f); c.fillStyle = '#ff9a1f'; c.fillRect(230, 190 - f, 20, 24 + f); c.fillStyle = '#ffe28a'; c.fillRect(236, 202, 8, 12);
    var g = c.createRadialGradient(240, 200, 10, 240, 200, 150); g.addColorStop(0, 'rgba(255,170,70,.35)'); g.addColorStop(1, 'rgba(255,140,40,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#7a7684'; c.fillRect(190, 64, 100, 8);
    /* полка с книгами-конспектами */
    c.fillStyle = '#2e1c0f'; c.fillRect(312, 70, 70, 4); c.fillRect(312, 104, 70, 4);
    ['#a32d2d', '#185fa5', '#3b6d11', '#ba7517', '#534ab7', '#0f6e56'].forEach(function (col, i) { c.fillStyle = col; c.fillRect(316 + i * 10, 56 + (i % 2) * 3, 8, 14 - (i % 2) * 3); c.fillRect(316 + i * 10, 90 + (i % 3), 8, 14 - (i % 3)); });
    /* кровать */
    c.fillStyle = '#5a3a1e'; c.fillRect(392, 176, 78, 38); c.fillStyle = '#8f2f37'; c.fillRect(398, 168, 70, 16); c.fillStyle = '#efe6d8'; c.fillRect(448, 164, 18, 10);
    /* дверь на улицу слева */
    c.fillStyle = '#2b1a0d'; c.fillRect(8, 130, 40, 84); c.fillStyle = '#6b4526'; c.fillRect(12, 134, 32, 80); c.fillStyle = '#ffd25a'; c.fillRect(38, 172, 3, 3);
    vignette(c, 0.45);
  };

  A.bgYard = function (c, t) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#2a2552'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 60; i++) { var x = (i * 97) % W, y = (i * 53) % 110; c.fillStyle = (Math.floor(t / 400) + i) % 7 ? '#c9d3ff' : '#5a6290'; c.fillRect(x, y, 1, 1); }
    c.fillStyle = '#f2f4ff'; c.beginPath(); c.arc(410, 46, 14, 0, 7); c.fill();
    /* холмы и деревья */
    c.fillStyle = '#16233a'; c.beginPath(); c.moveTo(0, 170); c.quadraticCurveTo(120, 120, 240, 160); c.quadraticCurveTo(360, 120, 480, 160); c.lineTo(480, 270); c.lineTo(0, 270); c.fill();
    [[40, 150], [95, 160], [430, 152], [470, 166]].forEach(function (p) { c.fillStyle = '#0f1a14'; c.beginPath(); c.moveTo(p[0], p[1] - 46); c.lineTo(p[0] - 18, p[1]); c.lineTo(p[0] + 18, p[1]); c.fill(); c.fillRect(p[0] - 2, p[1], 4, 10); });
    c.fillStyle = '#1f3d22'; c.fillRect(0, A.FLOOR_Y, W, H - A.FLOOR_Y); for (var gx = 0; gx < W; gx += 6) { c.fillStyle = '#2d5a2c'; c.fillRect(gx, A.FLOOR_Y - ((gx * 7) % 4), 2, 4); }
    /* домик слева */
    c.fillStyle = '#5a3a1e'; c.fillRect(20, 150, 86, 64); c.fillStyle = '#7a2a2a'; c.beginPath(); c.moveTo(12, 152); c.lineTo(63, 114); c.lineTo(114, 152); c.fill();
    c.fillStyle = '#ffcf6a'; c.fillRect(34, 166, 16, 14); c.fillStyle = '#2b1a0d'; c.fillRect(70, 176, 20, 38);
    /* вход в подземелье: каменная арка и лестница вниз */
    c.fillStyle = '#5c5966'; c.fillRect(250, 112, 120, 102); c.fillStyle = '#4a4752'; for (var sy = 116; sy < 214; sy += 10) for (var sx = 250; sx < 370; sx += 20) c.fillRect(sx + (sy % 20 ? 10 : 0), sy, 18, 1);
    c.fillStyle = '#07060c'; c.fillRect(272, 146, 76, 68); c.beginPath(); c.arc(310, 146, 38, Math.PI, 0); c.fill();
    for (var st = 0; st < 6; st++) { c.fillStyle = st % 2 ? '#3a3742' : '#2c2a33'; c.fillRect(280 + st * 3, 168 + st * 8, 60 - st * 6, 6); }
    c.fillStyle = '#6e6b78'; c.fillRect(276, 100, 68, 14);
    A.torch(c, 244, 140, t); A.torch(c, 376, 140, t + 400);
    vignette(c, 0.45);
  };
})();

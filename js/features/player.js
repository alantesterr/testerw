/* =====================================================================
   РАЗДЕЛ «ПЛЕЕР»: видео/аудио с компьютера или YouTube.
   Идея: считается только реальный просмотр (перемотка не засчитывается).
   Каждые N минут просмотра видео останавливается и появляются вопросы
   из Тестера. За warnSec секунд (по умолчанию 30) — предупреждение.

   Прогресс вопросов сохраняется (localStorage «sp-player-quiz»):
   какие вопросы уже были, ответы (верно/неверно), текущая порция.
   Под плеером — лента вопросов: пройденные, текущий, предстоящие.

   Горячие клавиши (как на YouTube): Пробел/K, ←/→, J/L, ↑/↓, M, F, I, 0–9.
   Пока курсор в поле ввода — клавиши плеера НЕ перехватываются.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP, E = SP.testEngine, esc = SP.esc, fmt = SP.fmtTime, clamp = SP.clamp;
  var root = null, built = false;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- Состояние ---------------- */
  var queue = [], current = -1, activeKind = null;
  var ytPlayer = null, ytOK = false, pendingYT = null;
  var vol = 1, muted = false, rate = 1, quality = 'auto', ytNative = false, autoMini = true, qSeen = false;
  var watch = 0, nextAt = 1200, intervalSec = 1200, qPerTest = 5, requireTest = true;
  var quizOpen = false, savedPos = 0, lastWall = performance.now(), lastMT = null, warned = false, saveTick = 0;
  var scrubbing = false, scrubPct = 0, hideT = null, touchMode = false, lastIcon = '', snackT = null;
  var idb = SP.idb('studyplay');
  var feedSel = null; // выбранный пункт ленты

  /* ---------------- Прогресс вопросов (сохраняется) ---------------- */
  var PQ_KEY = 'sp-player-quiz';
  var pq = SP.store.get(PQ_KEY, null);
  function bankMap() { var m = {}; SP.bank.all().forEach(function (q) { m[E.qid(q)] = q; }); return m; }
  /* «Подпись» набора вопросов: если набор поменялся, прогресс начинается заново (история остаётся) */
  function bankSig() {
    var s = SP.bank.all().map(E.qid).sort().join(','), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return SP.bank.all().length + ':' + (h >>> 0).toString(36);
  }
  function ensurePq() {
    var sig = bankSig();
    if (!pq || pq.sig !== sig) {
      var keepHistory = pq && Array.isArray(pq.history) ? pq.history : [];
      var map = bankMap(), ids = Object.keys(map);
      var seen = {}; keepHistory.forEach(function (h) { seen[h.id] = 1; });
      pq = { sig: sig, pool: SP.shuffle(ids.filter(function (id) { return !seen[id]; })), errs: (pq && pq.errs || []).filter(function (id) { return map[id]; }), history: keepHistory, batch: null, done: 0, redoN: 0 };
      if (!pq.pool.length && ids.length) pq.pool = SP.shuffle(ids);
      savePq();
    }
    return pq;
  }
  function savePq() { SP.store.set(PQ_KEY, pq); }
  function answerText(q, r) {
    if (!q) return '';
    if (E.isKb(q)) return r && r.typed != null ? r.typed : '';
    return (r && r.sel ? r.sel : []).map(function (t) { return t; }).join('; ');
  }
  function rightText(q) { return !q ? '' : E.isKb(q) ? q.answer : q.opts.filter(function (o) { return o.right; }).map(function (o) { return o.t; }).join('; '); }

  /* ---------------- Разметка ---------------- */
  function build() {
    root.innerHTML = '<div class="page wide player-page">' +
      SP.pageHead({ title: SP.t('nav.player'), sub: '<span data-i18n="player.sub"></span>', actions:
        '<button type="button" class="btn btn-primary" id="pPick">' + SP.icon('upload') + '<span data-i18n="player.addFiles"></span></button>' }) +
      '<div class="player-layout"><div class="player-main stack">' +
      '<div class="pslot" id="pslot"><div class="player" id="player" tabindex="-1">' +
      '  <div class="stage" id="stage"><video id="mediaVideo" playsinline preload="metadata"></video><div class="audio-art" id="audioArt">' + SP.icon('volume-2') + '</div><audio id="mediaAudio" preload="metadata"></audio><div id="ytWrap"></div></div>' +
      '  <button type="button" class="empty-msg" id="emptyMsg">' + SP.icon('upload', 'ic-xl') + '<span data-i18n="player.empty"></span></button>' +
      '  <div class="click-layer" id="clickLayer"></div>' +
      '  <div class="ptitle" id="ptitle"></div>' +
      '  <div class="mini-head" id="miniHead"><span class="mh-title" id="miniTitle"></span><button type="button" class="mh-b" id="miniSize" data-i18n-attr="aria-label:player.miniSize;title:player.miniSize">' + SP.icon('maximize') + '</button><button type="button" class="mh-b" id="miniBack" data-i18n-attr="aria-label:player.miniBack;title:player.miniBack">' + SP.icon('x') + '</button></div>' +
      '  <div class="nat-bar" id="natBar"><button type="button" id="natOurs" data-i18n="player.ourButtons"></button><button type="button" id="natMini" data-i18n="player.mini"></button><button type="button" id="natFs" data-i18n="player.fullscreen"></button></div>' +
      '  <div class="osd" id="osd"></div>' +
      '  <div class="p-warn" id="testToast" role="status"><span class="p-warn-ic">' + SP.icon('timer') + '</span><div><b data-i18n="player.soon"></b><span class="xsmall" data-i18n="player.soonText"></span></div><b class="p-warn-t" id="toastTime">00:30</b></div>' +
      '  <div class="snack" id="snack" role="status"></div>' +
      '  <div class="controls" id="controls"><div class="seek" id="seek"><div class="seek-track"><div class="seek-buf" id="seekBuf"></div><div class="seek-fill" id="seekFill"></div><div class="seek-knob" id="seekKnob"></div></div><div class="seek-tip" id="seekTip">0:00</div></div>' +
      '   <div class="bar"><button type="button" class="cb" id="playBtn"></button><button type="button" class="cb" id="nextBtn"></button>' +
      '    <div class="vol"><button type="button" class="cb" id="muteBtn"></button><div class="vol-slider" id="volSlider"><div class="vs-track" id="volTrack"><div class="vs-fill" id="volFill"></div><div class="vs-knob" id="volKnob"></div></div></div></div>' +
      '    <span class="time" id="timeLabel">00:00 / 00:00</span><span class="spacer"></span>' +
      '    <button type="button" class="cb" id="gearBtn"></button><button type="button" class="cb" id="miniBtn"></button><button type="button" class="cb" id="fsBtn"></button></div></div>' +
      '  <div class="pmenu" id="menu"></div>' +
      '  <div class="quiz-ov" id="quizModal" role="dialog" aria-modal="true"><div class="quiz-card-p" id="quizCard"></div></div>' +
      '</div><div class="mini-ph" id="miniPh"><div class="stack-sm" style="align-items:center"><span data-i18n="player.inMini"></span><button type="button" class="btn" id="miniRestore">' + SP.icon('arrow-up') + '<span data-i18n="player.miniBack"></span></button></div></div></div>' +
      '<section class="card card-flat now-card"><div class="row-between"><div class="stack-sm grow"><h2 class="now-title" id="nowTitle"></h2><span class="small muted" id="nowMeta"></span></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="keysBtn" aria-expanded="false">' + SP.icon('keyboard') + '<span data-i18n="player.keys"></span></button></div>' +
      '<div class="keys" id="keysList" hidden><span><kbd>Space</kbd>/<kbd>K</kbd> <span data-i18n="player.kPause"></span></span><span><kbd>←</kbd><kbd>→</kbd> ±5 s</span><span><kbd>J</kbd><kbd>L</kbd> ±10 s</span><span><kbd>↑</kbd><kbd>↓</kbd> <span data-i18n="player.kVol"></span></span><span><kbd>M</kbd> <span data-i18n="player.kMute"></span></span><span><kbd>F</kbd> <span data-i18n="player.fullscreen"></span></span><span><kbd>I</kbd> <span data-i18n="player.mini"></span></span><span><kbd>0</kbd>–<kbd>9</kbd> <span data-i18n="player.kJump"></span></span></div></section>' +
      '<section class="card feed-card" id="feedCard"></section>' +
      '</div>' +
      '<aside class="player-side stack">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + SP.icon('list-checks') + '<span data-i18n="player.testsTitle"></span></div><div class="card-sub" id="bankStatus"></div></div></div>' +
      '<div class="stack">' +
      '<div class="row"><a class="btn btn-sm" href="#/tester">' + SP.icon('upload') + '<span data-i18n="player.loadTests"></span></a></div>' +
      '<div class="field"><span class="label" data-i18n="player.every"></span><div class="row row-nowrap"><input class="input input-num" id="minInput" type="number" min="0" max="1440" inputmode="numeric" data-i18n-attr="aria-label:player.minutes"><span class="small muted" data-i18n="player.min"></span><input class="input input-num" id="secInput" type="number" min="0" max="59" inputmode="numeric" data-i18n-attr="aria-label:player.seconds"><span class="small muted" data-i18n="player.sec"></span></div></div>' +
      '<div class="field"><label class="label" for="questionsInput" data-i18n="player.perTest"></label><input class="input input-num" id="questionsInput" type="number" min="1" max="100" inputmode="numeric"></div>' +
      '<div class="field"><label class="label" for="warnInput" data-i18n="player.warnLabel"></label><div class="row row-nowrap"><input class="input input-num" id="warnInput" type="number" min="5" max="300" inputmode="numeric"><span class="small muted" data-i18n="player.sec"></span></div><span class="hint" data-i18n="player.warnHint"></span></div>' +
      '<label class="check"><input id="blockInput" type="checkbox"><span data-i18n="player.require"></span></label>' +
      '<button type="button" class="btn btn-primary" id="applySettings">' + SP.icon('save') + '<span data-i18n="common.save"></span></button>' +
      '<div class="stack-sm"><div class="progress"><i id="watchProgress"></i></div><span class="xsmall muted" id="watchText"></span></div>' +
      '</div></section>' +
      '<section class="card"><div class="card-head"><div class="card-title">' + SP.icon('list-video') + '<span data-i18n="player.queue"></span> <span class="subtle small" id="queueCount"></span></div></div>' +
      '<div class="playlist" id="playlist"></div>' +
      '<form class="row row-nowrap url-row" id="urlForm"><input class="input" id="urlInput" type="url" inputmode="url" data-i18n-attr="placeholder:player.urlPh;aria-label:player.urlPh"><button type="submit" class="btn btn-icon" data-i18n-attr="aria-label:common.add;data-tip:common.add">' + SP.icon('plus') + '</button></form>' +
      '<p class="xsmall subtle" data-i18n="player.storeNote"></p></section>' +
      '</aside></div></div>' +
      '<input id="fileInput" type="file" accept="video/*,audio/*" multiple hidden>';
    SP.applyI18n(root);
    built = true;
    init();
  }

  /* ---------------- Подключение логики (один раз) ---------------- */
  var player, video, audio, audioArt, ytWrap, emptyMsg, clickLayer, osd, controls, menu, seek, seekFill, seekBuf, seekKnob, seekTip;
  var playBtn, nextBtn, muteBtn, gearBtn, fsBtn, volSlider, volTrack, volFill, volKnob, timeLabel, nowTitle, nowMeta, ptitle;
  var toast, toastTime, snackEl, quizModal, quizCard, playlistEl, queueCount, fileInput, urlInput, watchProgress, watchText;
  var pslot, miniBtn, miniHead, miniTitle;
  function T(k, p) { return SP.t(k, p); }
  function setBtn(b, icon, labelKey) { b.innerHTML = SP.icon(icon); var l = T(labelKey); b.setAttribute('aria-label', l); b.setAttribute('title', l); }

  var isYT = function () { return activeKind === 'youtube'; };
  var isAudioKind = function () { return !!activeKind && /audio$/.test(activeKind); };
  var mEl = function () { return isAudioKind() ? audio : video; };
  var M = {
    ready: function () { try { return isYT() ? ytOK : (!!activeKind && mEl().readyState >= 1); } catch (e) { return false; } },
    time: function () { try { return isYT() ? (ytOK ? (ytPlayer.getCurrentTime() || 0) : 0) : (activeKind ? (mEl().currentTime || 0) : 0); } catch (e) { return 0; } },
    dur: function () { try { if (isYT()) return ytOK ? (ytPlayer.getDuration() || 0) : 0; var d = activeKind ? mEl().duration : 0; return isFinite(d) ? d : 0; } catch (e) { return 0; } },
    playing: function () { try { return isYT() ? (ytOK && ytPlayer.getPlayerState() === 1) : (!!activeKind && !mEl().paused && !mEl().ended); } catch (e) { return false; } },
    play: function () { try { if (isYT()) { if (ytOK) ytPlayer.playVideo(); } else if (activeKind) { var p = mEl().play(); if (p && p.catch) p.catch(function () { }); } } catch (e) { /* ничего */ } },
    pause: function () { try { if (isYT()) { if (ytOK) ytPlayer.pauseVideo(); } else if (activeKind) mEl().pause(); } catch (e) { /* ничего */ } },
    seek: function (t) { var d = M.dur(); t = Math.max(0, d ? Math.min(t, d) : t); try { if (isYT()) { if (ytOK) ytPlayer.seekTo(t, true); } else if (activeKind) mEl().currentTime = t; } catch (e) { /* ничего */ } },
    applyAudio: function () { try { if (isYT()) { if (ytOK) { ytPlayer.setVolume(Math.round(vol * 100)); if (muted) ytPlayer.mute(); else ytPlayer.unMute(); } } else [video, audio].forEach(function (e) { e.volume = vol; e.muted = muted; }); } catch (e) { /* ничего */ } },
    applyRate: function () { try { if (isYT()) { if (ytOK) ytPlayer.setPlaybackRate(rate); } else [video, audio].forEach(function (e) { e.defaultPlaybackRate = rate; e.playbackRate = rate; }); } catch (e) { /* ничего */ } }
  };

  function snack(t) { snackEl.textContent = t; snackEl.classList.add('show'); clearTimeout(snackT); snackT = setTimeout(function () { snackEl.classList.remove('show'); }, 3500); }
  function flash(html, side) { osd.className = 'osd' + (side ? ' ' + side : ''); osd.innerHTML = html; void osd.offsetWidth; osd.classList.add('go'); }
  function showControls() { player.classList.remove('idle'); clearTimeout(hideT); if (M.playing() && !quizOpen) hideT = setTimeout(hideControls, 2500); }
  function hideControls() { if (!M.playing() || menu.classList.contains('open') || controls.matches(':hover') || scrubbing || quizOpen) return; player.classList.add('idle'); }

  var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
  function toggleFS() {
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { var r = player.requestFullscreen || player.webkitRequestFullscreen; if (r) r.call(player); }
  }
  function onFS() { var on = fsEl() === player; player.classList.toggle('fs', on); setBtn(fsBtn, on ? 'minimize' : 'maximize', on ? 'player.exitFs' : 'player.fullscreen'); showControls(); }

  /* ----- Мини-плеер ----- */
  var MINI_KEY = 'studyplay-mini', MINI_SIZES = [280, 360, 480, 640];
  var miniOn = false, miniAuto = false, mini = { x: null, y: null, w: 360 }, suppressClick = false, miniDrag = null;
  (function () { var m = SP.store.get(MINI_KEY, null); if (m && isFinite(m.w)) { mini.w = m.w; if (isFinite(m.x)) mini.x = m.x; if (isFinite(m.y)) mini.y = m.y; } })();
  var saveMini = function () { SP.store.set(MINI_KEY, mini); };
  var miniW = function () { return Math.max(200, Math.min(mini.w, window.innerWidth - 16)); };
  function placeMini() {
    var w = miniW(), h = Math.round(w * 9 / 16);
    if (mini.x === null || mini.y === null) { mini.x = window.innerWidth - w - 16; mini.y = window.innerHeight - h - 16 - (window.innerWidth < 768 ? 72 : 0); }
    mini.x = clamp(mini.x, 8, Math.max(8, window.innerWidth - w - 8)); mini.y = clamp(mini.y, 8, Math.max(8, window.innerHeight - h - 8));
    player.style.width = w + 'px'; player.style.left = mini.x + 'px'; player.style.top = mini.y + 'px';
  }
  function setMini(on, auto) {
    on = !!on; if (on === miniOn) return;
    if (on) { if (current < 0) { snack(T('player.pickFirst')); return; } if (fsEl()) return; }
    miniOn = on; miniAuto = on && !!auto;
    player.classList.toggle('mini', on); pslot.classList.toggle('has-mini', on); miniBtn.classList.toggle('active', on);
    setBtn(miniBtn, 'picture-in-picture-2', on ? 'player.miniBack' : 'player.mini');
    menu.classList.remove('open');
    if (on) { placeMini(); miniTitle.textContent = nowTitle.textContent; } else player.style.left = player.style.top = player.style.width = '';
    showControls();
  }
  function slotRatio() { var r = pslot.getBoundingClientRect(); if (!r.height) return 1; var vis = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)); return vis / r.height; }
  function evalMini() {
    if (SP.views.current() !== 'player') return;
    var r = slotRatio();
    if (r < 0.4) { if (autoMini && !miniOn && current >= 0 && !fsEl() && M.playing()) setMini(true, true); }
    else if (r >= 0.6 && miniOn && miniAuto) setMini(false);
  }
  function dragStart(e, layer) { if (!miniOn || fsEl() === player || e.button > 0) return; if (e.target.closest && e.target.closest('.mh-b')) return; miniDrag = { sx: e.clientX, sy: e.clientY, ox: mini.x, oy: mini.y, moved: false, layer: layer }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* ничего */ } }
  function dragMove(e) { var d = miniDrag; if (!d) return; var dx = e.clientX - d.sx, dy = e.clientY - d.sy; if (!d.moved && Math.hypot(dx, dy) < 5) return; d.moved = true; mini.x = d.ox + dx; mini.y = d.oy + dy; placeMini(); }
  function dragEnd() { var d = miniDrag; miniDrag = null; if (!d || !d.moved) return; saveMini(); if (d.layer) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 80); } }

  /* ----- Управление ----- */
  function togglePlay() { if (current < 0) return; var was = M.playing(); if (was) M.pause(); else M.play(); flash(SP.icon(was ? 'pause' : 'play')); }
  function seekBy(d) { if (current < 0) return; M.seek(M.time() + d); lastMT = null; flash(SP.icon(d > 0 ? 'rotate-ccw' : 'rotate-ccw', d > 0 ? 'flip' : '') + '<span>' + (d > 0 ? '+' : '−') + Math.abs(d) + ' s</span>', d > 0 ? 'r' : 'l'); updateUI(); }
  function setVol(v, silent) { vol = clamp(v, 0, 1); muted = vol === 0; M.applyAudio(); updateVolUI(); persistPrefs(); if (!silent) flash(SP.icon(vol === 0 ? 'volume-x' : 'volume-2') + '<span>' + Math.round(vol * 100) + '%</span>'); }
  function toggleMute() { muted = !muted; if (!muted && vol === 0) vol = 0.5; M.applyAudio(); updateVolUI(); persistPrefs(); flash(SP.icon(muted ? 'volume-x' : 'volume-2') + '<span>' + (muted ? T('player.muted') : Math.round(vol * 100) + '%') + '</span>'); }
  function updateVolUI() { var v = muted ? 0 : vol; setBtn(muteBtn, v === 0 ? 'volume-x' : v < 0.5 ? 'volume-1' : 'volume-2', 'player.kMute'); volFill.style.width = (v * 100) + '%'; volKnob.style.left = (v * 100) + '%'; }
  function setRate(r) { rate = r; M.applyRate(); persistPrefs(); renderMenu(); flash('<span>' + r + '×</span>'); }
  var YTQ = { auto: 'default', '1080': 'hd1080', '720': 'hd720', '480': 'large', '360': 'medium', '240': 'small', '144': 'tiny' };
  var YTN = { highres: '4K+', hd2880: '2880p', hd2160: '2160p', hd1440: '1440p', hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p', unknown: '—' };
  var ytNow = function () { try { if (isYT() && ytOK) return ytPlayer.getPlaybackQuality() || ''; } catch (e) { /* ничего */ } return ''; };
  var ytAvail = function () { try { if (isYT() && ytOK) return ytPlayer.getAvailableQualityLevels() || []; } catch (e) { /* ничего */ } return []; };
  function setQuality(q) {
    quality = q; persistPrefs();
    if (isYT() && ytOK && queue[current]) {
      var code = YTQ[q] || 'default', t = M.time(), was = M.playing();
      try { ytPlayer.setPlaybackQuality(code); } catch (e) { /* ничего */ }
      try { var o = { videoId: queue[current].videoId, startSeconds: t, suggestedQuality: code }; if (was) ytPlayer.loadVideoById(o); else ytPlayer.cueVideoById(o); lastMT = null; } catch (e) { /* ничего */ }
      setTimeout(function () { if (!(isYT() && ytOK)) return; var now = ytNow(); if (q !== 'auto' && now !== YTQ[q]) snack(T('player.ytIgnored', { q: YTN[now] || '—' })); if (menu.classList.contains('open')) renderMenu(); }, 2500);
    }
    renderMenu();
  }
  function syncNative() { player.classList.toggle('ytn', activeKind === 'youtube' && ytNative); }
  function toggleNative() { ytNative = !ytNative; persistPrefs(); syncNative(); if (isYT() && current >= 0) { var was = M.playing(); menu.classList.remove('open'); loadItem(current, was); } else renderMenu(); }

  function renderMenu() {
    var speeds = [0.5, 0.75, 1, 1.1, 1.2, 1.25, 1.35, 1.5, 1.75, 2];
    var QL = [['auto', T('player.auto')], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p'], ['240', '240p'], ['144', '144p']];
    var h = '<h4>' + esc(T('player.speed')) + '</h4><div class="chips">' + speeds.map(function (s) { return '<button type="button" class="chip' + (Math.abs(s - rate) < 0.001 ? ' on' : '') + '" data-rate="' + s + '">' + s + '×</button>'; }).join('') + '</div>' +
      '<div class="row row-nowrap"><input class="input input-num" id="customRate" type="number" min="0.25" max="4" step="0.05" value="' + rate + '" aria-label="' + esc(T('player.speed')) + '"><button type="button" class="btn btn-sm" id="applyCustomRate">' + esc(T('common.apply')) + '</button></div>';
    h += '<h4>' + esc(T('player.quality')) + '</h4>';
    if (isYT()) {
      var av = ytAvail(), now = ytNow();
      h += '<div class="chips">' + QL.map(function (x) { var dim = x[0] !== 'auto' && av.length && av.indexOf(YTQ[x[0]]) < 0; return '<button type="button" class="chip' + (x[0] === quality ? ' on' : '') + (dim ? ' dim' : '') + '" data-q="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<small>' + esc(T('player.nowPlaying', { q: YTN[now] || '…' })) + '</small><div class="chips"><button type="button" class="chip' + (ytNative ? ' on' : '') + '" data-nat="1">' + esc(T('player.ytNative')) + '</button></div><small>' + esc(T('player.ytNativeHint')) + '</small>';
    } else h += '<small>' + esc(T(activeKind ? 'player.qualityLocal' : 'player.qualityNone')) + '</small>';
    h += '<h4>' + esc(T('player.mini')) + '</h4><div class="chips"><button type="button" class="chip' + (autoMini ? ' on' : '') + '" data-am="1">' + esc(T(autoMini ? 'player.autoMiniOn' : 'player.autoMiniOff')) + '</button></div>';
    menu.innerHTML = h;
  }
  function closeMenu() { menu.classList.remove('open'); showControls(); }

  /* ----- Очередь ----- */
  function kindText(k) { return k === 'youtube' ? 'YouTube' : /audio$/.test(k) ? T('player.audio') : T('player.video'); }
  function renderQueue() {
    queueCount.textContent = queue.length ? '(' + queue.length + ')' : '';
    if (!queue.length) { playlistEl.innerHTML = '<p class="small subtle">' + esc(T('player.queueEmpty')) + '</p>'; return; }
    playlistEl.innerHTML = queue.map(function (it, i) {
      var pct = it.duration ? Math.min(100, (it.position || 0) / it.duration * 100) : 0;
      var img = it.kind === 'youtube' && it.videoId ? '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(it.videoId) + '/mqdefault.jpg" alt="" onerror="this.remove()">' : '';
      return '<div class="qi' + (i === current ? ' active' : '') + '" data-i="' + i + '"><button type="button" class="qi-main" data-play="' + i + '"><span class="qthumb">' + img + SP.icon(/audio$/.test(it.kind) ? 'volume-2' : 'play') + '<i style="width:' + pct + '%"></i></span>' +
        '<span class="meta"><b>' + esc(it.name) + '</b><small>' + esc(kindText(it.kind)) + (it.duration ? ' · ' + fmt(it.duration) : '') + '</small></span></button>' +
        '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="' + i + '" aria-label="' + esc(T('player.remove')) + '" data-tip="' + esc(T('player.remove')) + '">' + SP.icon('x') + '</button></div>';
    }).join('');
  }
  function removeItem(i) {
    var it = queue[i]; if (!it) return;
    if (/^local/.test(it.kind)) { try { URL.revokeObjectURL(it.src); } catch (e) { /* ничего */ } idb.del(it.id).catch(function () { }); }
    var wasCur = current === i; queue.splice(i, 1);
    if (wasCur) { teardown(); current = -1; activeKind = null; resetStage(); if (queue.length) loadItem(Math.min(i, queue.length - 1), false); }
    else if (current > i) current--;
    renderQueue(); persistQueue();
  }
  function persistPrefs() { SP.store.set('studyplay-prefs', { vol: vol, muted: muted, rate: rate, quality: quality, ytNative: ytNative, autoMini: autoMini }); }
  function persistQueue() {
    SP.store.set('studyplay-queue', { currentId: queue[current] ? queue[current].id : null, items: queue.map(function (x) { return { id: x.id, name: x.name, kind: x.kind, src: /^local/.test(x.kind) ? '' : x.src, videoId: x.videoId, position: x.position, duration: x.duration, stored: x.stored }; }) });
  }
  function saveProgress() {
    if (current >= 0 && queue[current]) {
      var it = queue[current];
      if (M.ready()) { var d = M.dur(), t = M.time(); it.position = (d && t > d - 1) ? 0 : t; if (d) it.duration = d; }
      var bar = playlistEl.querySelector('.qi.active .qthumb i'); if (bar && it.duration) bar.style.width = Math.min(100, (it.position || 0) / it.duration * 100) + '%';
    }
    persistQueue(); SP.store.set('studyplay-timer', { watch: watch, nextAt: nextAt });
  }
  function teardown() {
    try { video.pause(); audio.pause(); } catch (e) { /* ничего */ }
    [video, audio].forEach(function (e) { e.onloadedmetadata = null; e.removeAttribute('src'); try { e.load(); } catch (x) { /* ничего */ } });
    if (ytPlayer) { try { ytPlayer.destroy(); } catch (e) { /* ничего */ } ytPlayer = null; }
    ytOK = false; pendingYT = null; ytWrap.innerHTML = '';
  }
  function resetStage() { syncNative(); if (miniOn) setMini(false); video.style.display = 'none'; audioArt.style.display = 'none'; emptyMsg.style.display = 'grid'; nowTitle.textContent = T('player.noVideo'); nowMeta.textContent = T('player.noVideoMeta'); ptitle.textContent = ''; updateUI(); }
  function detectYouTube(url) {
    try { var u = new URL(url); if (u.hostname.indexOf('youtu.be') >= 0) return u.pathname.slice(1) || null; if (u.hostname.indexOf('youtube.com') >= 0) { if (u.searchParams.get('v')) return u.searchParams.get('v'); var m = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/); if (m) return m[1]; } } catch (e) { /* ничего */ }
    return null;
  }
  function setTitle(item) { nowTitle.textContent = item.name; ptitle.textContent = item.name; miniTitle.textContent = item.name; }
  function addFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      var isA = /^audio\//.test(f.type) || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name);
      var item = { id: SP.uid('m'), name: f.name, kind: isA ? 'local-audio' : 'local-video', src: URL.createObjectURL(f), position: 0, duration: 0, stored: false };
      queue.push(item);
      idb.put(item.id, f).then(function () { item.stored = true; persistQueue(); }, function () { snack(T('player.notStored', { name: f.name })); });
    });
    renderQueue(); persistQueue();
    if (current < 0 && queue.length) loadItem(0, true);
  }
  function addUrl(url) {
    url = String(url || '').trim(); if (!url) return;
    var yt = detectYouTube(url), isA = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url);
    if (!yt && !/^https?:\/\//i.test(url)) { snack(T('player.badUrl')); return; }
    queue.push({ id: SP.uid('m'), name: yt ? 'YouTube · ' + yt : (decodeURIComponent(url.split('/').pop().split('?')[0]) || T('player.video')), kind: yt ? 'youtube' : (isA ? 'direct-audio' : 'direct-video'), src: url, videoId: yt, position: 0, duration: 0 });
    renderQueue(); persistQueue(); if (current < 0) loadItem(queue.length - 1, true);
  }
  function loadItem(i, autoplay) {
    if (autoplay === undefined) autoplay = true;
    var item = queue[i]; if (!item) return;
    if (current >= 0) saveProgress();
    teardown(); current = i; activeKind = item.kind; syncNative(); emptyMsg.style.display = 'none'; setTitle(item);
    if (item.kind === 'youtube') { video.style.display = 'none'; audioArt.style.display = 'none'; nowMeta.textContent = T('player.ytMeta'); loadYT(item, autoplay); }
    else {
      var isA = isAudioKind(), el = mEl();
      video.style.display = isA ? 'none' : 'block'; audioArt.style.display = isA ? 'grid' : 'none';
      nowMeta.textContent = /^local/.test(item.kind) ? T(isA ? 'player.localAudio' : 'player.localVideo') : T('player.direct');
      el.onloadedmetadata = function () {
        item.duration = el.duration || 0;
        if (item.position > 1 && item.position < (el.duration || 0) - 1) el.currentTime = item.position;
        M.applyAudio(); M.applyRate(); renderQueue(); updateUI();
        if (autoplay && !quizOpen && SP.views.current() === 'player') { var p = el.play(); if (p && p.catch) p.catch(function () { }); }
      };
      el.src = item.src;
    }
    renderQueue(); renderMenu(); updateUI(); persistQueue();
  }
  function loadYT(item, autoplay) {
    qSeen = false; ytOK = false; ytWrap.innerHTML = '<div id="ytHost"></div>';
    var make = function () {
      var vars = { controls: ytNative ? 1 : 0, disablekb: ytNative ? 0 : 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, start: Math.floor(item.position || 0), autoplay: autoplay ? 1 : 0 };
      if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
      ytPlayer = new window.YT.Player('ytHost', { videoId: item.videoId, playerVars: vars, events: {
        onReady: function () {
          ytOK = true; M.applyAudio(); M.applyRate(); if (quality !== 'auto') { try { ytPlayer.setPlaybackQuality(YTQ[quality]); } catch (e) { /* ничего */ } }
          try { var t = ytPlayer.getVideoData().title; if (t && item.name.indexOf('YouTube ·') === 0) { item.name = t; setTitle(item); renderQueue(); persistQueue(); } } catch (e) { /* ничего */ }
          item.duration = M.dur(); renderQueue(); updateUI();
          if (autoplay && !quizOpen) ytPlayer.playVideo();
        },
        onStateChange: function (e) {
          if (e.data === 1 && quizOpen) { ytPlayer.pauseVideo(); return; }
          if (e.data === 0) { item.position = 0; nextItem(); }
          if (e.data === 1) { lastWall = performance.now(); lastMT = M.time(); M.applyRate(); if (!qSeen) { qSeen = true; if (quality !== 'auto') { try { ytPlayer.setPlaybackQuality(YTQ[quality]); } catch (x) { /* ничего */ } } } }
          showControls(); updateUI();
        },
        onError: function () { snack(T('player.ytError')); }
      } });
    };
    if (window.YT && window.YT.Player) make();
    else { pendingYT = make; if (!$('yt-api')) { var s = document.createElement('script'); s.id = 'yt-api'; s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); } }
  }
  function nextItem() { if (current >= 0 && queue[current]) queue[current].position = 0; if (current + 1 < queue.length) loadItem(current + 1, true); else { showControls(); updateUI(); } }

  /* ----- Таймер вопросов ----- */
  var warnAt = function () { return Math.min(Number(SP.settings.get('warnSec')) || 30, Math.floor(intervalSec / 2)); };
  function beep() {
    try {
      var A = window.AudioContext || window.webkitAudioContext, c = new A(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      o.start(); o.stop(c.currentTime + 0.55); setTimeout(function () { c.close(); }, 800);
    } catch (e) { /* ничего */ }
  }
  function updateToast() {
    var left = nextAt - watch;
    if (!quizOpen && left > 0 && left <= warnAt() && SP.bank.all().length) {
      toast.classList.add('show'); toastTime.textContent = fmt(left);
      if (!warned) { warned = true; toast.classList.add('pulse'); setTimeout(function () { toast.classList.remove('pulse'); }, 6000); beep(); }
    } else { toast.classList.remove('show', 'pulse'); if (left > warnAt()) warned = false; }
  }
  function tick() {
    if (!built) return;
    evalMini();
    var now = performance.now(), dt = Math.min(1.5, (now - lastWall) / 1000); lastWall = now;
    if (!quizOpen && M.playing()) {
      var mt = M.time();
      if (lastMT !== null && Math.abs(mt - lastMT) < 3 + rate) watch += dt; /* перемотка не считается */
      lastMT = mt;
      if (watch >= nextAt) openQuiz();
      if (++saveTick % 20 === 0) saveProgress();
    } else lastMT = M.time();
    updateUI();
  }
  var lastFeedTick = 0;
  function updateUI() {
    var d = M.dur(), t = scrubbing ? scrubPct * d : M.time(), pct = d ? clamp(t / d * 100, 0, 100) : 0;
    seekFill.style.width = pct + '%'; seekKnob.style.left = pct + '%';
    var buf = 0;
    try { if (isYT()) { if (ytOK) buf = (ytPlayer.getVideoLoadedFraction() || 0) * 100; } else if (activeKind && d) { var b = mEl().buffered; if (b.length) buf = b.end(b.length - 1) / d * 100; } } catch (e) { /* ничего */ }
    seekBuf.style.width = clamp(buf, 0, 100) + '%';
    timeLabel.textContent = fmt(t) + ' / ' + fmt(d);
    var ic = M.playing() ? 'pause' : 'play';
    if (ic !== lastIcon) { lastIcon = ic; setBtn(playBtn, ic, ic === 'pause' ? 'player.pause' : 'player.play'); }
    var span = Math.max(1, intervalSec), start = nextAt - span;
    watchProgress.style.width = clamp((watch - start) / span * 100, 0, 100) + '%';
    watchText.textContent = T('player.watched', { w: fmt(watch), l: fmt(Math.max(0, nextAt - watch)) });
    updateToast();
    if (Date.now() - lastFeedTick > 1000) { lastFeedTick = Date.now(); var nt = $('feedNext'); if (nt) nt.textContent = fmt(Math.max(0, nextAt - watch)); }
  }

  /* ---------------- Вопросы во время просмотра ---------------- */
  function takeBatch() {
    ensurePq();
    var map = bankMap();
    if (!pq.pool.length) return null;
    var ids = pq.pool.splice(0, Math.min(qPerTest, pq.pool.length)).filter(function (id) { return map[id]; });
    pq.batch = { kind: 'main', ids: ids, qi: 0, results: [], order: {} };
    savePq(); return pq.batch;
  }
  function openQuiz() {
    if (quizOpen) return;
    if (!SP.bank.all().length) { snack(T('player.noBank')); nextAt = watch + intervalSec; return; }
    ensurePq();
    if (!pq.batch || pq.batch.qi >= pq.batch.ids.length) {
      if (!takeBatch()) { pq.pool = SP.shuffle(Object.keys(bankMap())); savePq(); takeBatch(); }
    }
    savedPos = M.time(); M.pause(); quizOpen = true;
    toast.classList.remove('show', 'pulse'); menu.classList.remove('open'); player.classList.remove('idle'); clearTimeout(hideT);
    saveProgress(); renderQ(); quizModal.classList.add('show'); renderFeed();
  }
  function closeQuiz(resume) {
    quizModal.classList.remove('show'); quizOpen = false;
    nextAt = watch + intervalSec; warned = false;
    if (Math.abs(M.time() - savedPos) > 1) M.seek(savedPos);
    lastMT = null; lastWall = performance.now();
    if (resume) M.play();
    saveProgress(); showControls(); updateUI(); renderFeed();
    try { player.focus({ preventScroll: true }); } catch (e) { /* ничего */ }
  }
  var qsel = new Set(), qAnswered = null, trc = {}, trOnP = {};
  function curQ() { var b = pq && pq.batch; if (!b) return null; var q = bankMap()[b.ids[b.qi]]; if (!q) return null; if (!b.order[b.ids[b.qi]]) { b.order[b.ids[b.qi]] = SP.shuffle(q.opts.map(function (_, i) { return i; })); savePq(); } var ord = b.order[b.ids[b.qi]]; return Object.assign({}, q, { opts: ord.map(function (i) { return q.opts[i]; }) }); }
  function shell(inner) {
    var b = pq.batch, sub = (b.kind === 'redo' ? T('player.redoRound', { n: pq.redoN }) : T('player.testTime')) + ' · ' + T('player.stoppedAt', { t: fmt(savedPos) });
    var canSkip = !requireTest && pq.done === 0;
    quizCard.innerHTML = '<div class="pq-head"><div><b>' + SP.icon('list-checks') + ' ' + esc(T('player.questions')) + '</b><span class="xsmall subtle">' + esc(sub) + '</span></div>' +
      (canSkip ? '<button type="button" class="btn btn-sm" id="qskip">' + esc(T('player.skip')) + '</button>' : '') + '</div><div class="pq-body">' + inner + '</div>';
    var sk = $('qskip'); if (sk) sk.onclick = function () { closeQuiz(true); };
    quizCard.scrollTop = 0;
  }
  function renderQ() {
    var b = pq.batch; if (!b) { closeQuiz(true); return; }
    /* если ответ уже дан (окно закрыли до «Дальше») — не задаём вопрос повторно */
    if (b.results.length > b.qi) { b.qi = b.results.length; savePq(); }
    if (b.qi >= b.ids.length) { renderResult(finalizeBatch()); return; }
    var q = curQ();
    if (!q) { b.qi++; savePq(); renderQ(); return; }
    var kb = E.isKb(q), multi = !kb && q.n > 1, k = b.qi, Tt = trOnP[k] && trc[k];
    qsel = new Set(); qAnswered = null;
    var note = pq.done === 0 ? T('player.noteFirst', { t: fmt(savedPos) }) : T('player.noteNext', { t: fmt(savedPos) });
    shell('<p class="xsmall muted">' + esc(note) + '</p>' +
      '<div class="row-between"><span class="badge">' + esc(T('player.qOf', { i: b.qi + 1, n: b.ids.length })) + '</span><span class="xsmall subtle">' + esc(kb ? T('quiz.kindKb') : multi ? T('quiz.kindMulti', { n: q.n }) : T('quiz.kindSingle')) + '</span></div>' +
      '<div class="q-text" id="pqText">' + E.richHtml(Tt ? Tt.q : q.q) + '</div>' + E.img(q.img) +
      (kb ? '<div class="field"><label class="label" for="pqInput">' + esc(T('quiz.typeAnswer')) + '</label><input class="input kb-input" id="pqInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(T('quiz.yourAnswer')) + '"><span class="hint">' + esc(T('quiz.kbHint')) + '</span></div>'
        : '<div class="opts" id="pqOpts">' + q.opts.map(function (o, i) { return '<button type="button" class="opt" data-i="' + i + '" aria-pressed="false"><span class="opt-mark ' + (multi ? 'sq' : 'rd') + '"></span><span class="opt-key">' + (i < 9 ? i + 1 : '') + '</span><span class="opt-text">' + E.richHtml(Tt ? Tt.o[i] : o.t, true) + E.img(o.img, 'opt-img') + '</span></button>'; }).join('') + '</div>') +
      '<div id="pqVerdict"></div>' +
      '<div class="row quiz-tools" role="group" aria-label="' + esc(T('quiz.tools')) + '">' + SP.quizTools('pq', !!Tt) + '</div>' +
      '<div class="pq-foot">' + (pq.done > 0 || !requireTest ? '<button type="button" class="btn" id="pqLeave">' + SP.icon('play') + '<span>' + esc(T('player.backToVideo')) + '</span></button>' : '<span></span>') +
      '<div class="row"><button type="button" class="btn" id="pqRes" hidden>' + SP.icon('list-checks') + '<span>' + esc(T('player.showResult')) + '</span></button>' +
      '<button type="button" class="btn btn-primary" id="pqGo" disabled>' + esc(T(kb ? 'quiz.check' : 'quiz.answer')) + '</button></div></div>');
    var go = $('pqGo');
    $('pqSuper').onclick = function () { E.google(E.aiPrompt(q)); };
    $('pqAi').onclick = function () { E.google(E.aiPrompt(q), true); };
    $('pqTr').onclick = function () {
      var btn = this; if (trOnP[k]) { trOnP[k] = false; return renderQ(); } if (trc[k]) { trOnP[k] = true; return renderQ(); }
      var tl = SP.settings.get('trLang') || 'ru'; SP.busy(btn, true);
      E.translateQ(q, tl).then(function (r) { trc[k] = r; trOnP[k] = true; }, function () { E.translateFallback(q, tl); }).then(function () { if (quizOpen && pq.batch && pq.batch.qi === k && !qAnswered) renderQ(); else SP.busy(btn, false); });
    };
    if (SP.settings.get('autoTr') && trOnP[k] === undefined) { trOnP[k] = false; $('pqTr').click(); }
    var lv = $('pqLeave'); if (lv) lv.onclick = function () { closeQuiz(true); };
    if (kb) {
      var inp = $('pqInput');
      /* Поле ввода: печатаем свободно, клавиши плеера не срабатывают */
      inp.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (!go.disabled) go.click(); }
      });
      inp.addEventListener('input', function () { if (!qAnswered) go.disabled = !inp.value.trim(); });
      setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }, 50);
    } else {
      $('pqOpts').onclick = function (e) {
        var btn = e.target.closest('.opt'); if (!btn || qAnswered) return;
        var i = +btn.getAttribute('data-i');
        if (multi) { if (qsel.has(i)) qsel.delete(i); else qsel.add(i); } else { qsel.clear(); qsel.add(i); }
        SP.$$('#pqOpts .opt').forEach(function (x, j) { var on = qsel.has(j); x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); x.querySelector('.opt-mark').innerHTML = on ? SP.icon('check') : ''; });
        go.disabled = !qsel.size;
      };
    }
    go.onclick = function () {
      if (!qAnswered) { answer(q, kb); return; }
      pq.batch.qi++; savePq();
      /* Последний вопрос порции: сразу возвращаемся к видео (раньше здесь открывался экран результата) */
      if (pq.batch.qi >= pq.batch.ids.length) { finalizeBatch(); closeQuiz(true); return; }
      renderQ(); renderFeed();
    };
    $('pqRes').onclick = function () { pq.batch.qi++; savePq(); renderResult(finalizeBatch()); };
  }
  function answer(q, kb) {
    var b = pq.batch, id = b.ids[b.qi], ok, r = {};
    if (kb) { var typed = $('pqInput').value; ok = E.checkKeyboard(q, typed); r.typed = typed; $('pqInput').disabled = true; }
    else {
      var sel = Array.from(qsel); ok = E.checkChoice(q, sel); r.sel = sel.map(function (i) { return q.opts[i].t; });
      SP.$$('#pqOpts .opt').forEach(function (x, j) {
        x.disabled = true; x.classList.remove('sel'); var mk = x.querySelector('.opt-mark');
        if (q.opts[j].right) { x.classList.add('right'); mk.innerHTML = SP.icon('check'); } else if (qsel.has(j)) { x.classList.add('wrong'); mk.innerHTML = SP.icon('x'); }
      });
    }
    qAnswered = { ok: ok };
    b.results.push({ id: id, ok: ok });
    if (ok) pq.errs = pq.errs.filter(function (x) { return x !== id; }); else if (pq.errs.indexOf(id) < 0) pq.errs.push(id);
    pq.history.push(Object.assign({ id: id, ok: ok, at: Date.now(), pos: Math.round(savedPos), q: q.q.slice(0, 600), right: rightText(q).slice(0, 400), kb: kb }, r));
    savePq();
    $('pqVerdict').innerHTML = '<div class="alert ' + (ok ? 'alert-success' : 'alert-danger') + '">' + SP.icon(ok ? 'circle-check' : 'circle-x') + '<div class="alert-body"><b>' + esc(T(ok ? 'quiz.right' : 'quiz.wrong')) + '</b>' + (!ok ? '<span>' + esc(T('quiz.correctIs', { a: rightText(q) })) + '</span>' : '') + '</div></div>';
    var go = $('pqGo'); go.disabled = false;
    var last = b.qi === b.ids.length - 1;
    go.innerHTML = last ? SP.icon('play') + '<span>' + esc(T('player.resume')) + '</span>' : '<span>' + esc(T('quiz.next')) + '</span>';
    var rs = $('pqRes'); if (rs) rs.hidden = !last;
    go.focus();
    renderFeed();
  }
  /* Закрыть порцию вопросов: посчитать итог и сохранить его (результат можно посмотреть позже) */
  function finalizeBatch() {
    var b = pq.batch; if (!b) return pq.lastResult || null;
    var okN = b.results.filter(function (r) { return r.ok; }).length, n = b.ids.length || 1;
    var sum = { at: Date.now(), kind: b.kind, ok: okN, n: n, pct: Math.round(okN / n * 100), bad: b.results.filter(function (r) { return !r.ok; }).map(function (r) { return r.id; }) };
    pq.done++; pq.lastResult = sum; pq.batch = null; savePq();
    return sum;
  }
  function renderResult(sum) {
    sum = sum || pq.lastResult; if (!sum) { closeQuiz(true); return; }
    var okN = sum.ok, n = sum.n, pct = sum.pct;
    var map = bankMap(), total = Object.keys(map).length, seen = total - pq.pool.length;
    var badList = (sum.bad || []).map(function (id) { var q = map[id]; return q ? '<div class="err-item">' + E.richHtml(q.q, true) + '<div class="small"><b class="text-success">' + esc(T('quiz.correct')) + ':</b> ' + esc(rightText(q)) + '</div></div>' : ''; }).join('');
    if (!quizOpen) { savedPos = M.time(); M.pause(); quizOpen = true; quizModal.classList.add('show'); }
    shell('<div class="result-score ' + (pct >= 90 ? 'success' : pct >= 50 ? 'warning' : 'danger') + '"><span class="result-pct">' + pct + '%</span><span class="small">' + esc(T('player.resultOf', { a: okN, n: n })) + '</span></div>' +
      '<p class="small muted">' + esc(T('player.seenOf', { a: seen, n: total })) + (pq.errs.length ? ' · ' + esc(T('player.errsN', { n: pq.errs.length })) : '') + '</p>' +
      (pq.pool.length ? '' : '<div class="alert alert-success">' + SP.icon('circle-check') + '<div class="alert-body">' + esc(T(pq.errs.length ? 'player.allSeenErrs' : 'player.allSeen')) + '</div></div>') +
      (badList ? '<div class="stack-sm">' + badList + '</div>' : '') +
      '<div class="pq-foot wrap">' + (pq.errs.length ? '<button type="button" class="btn" id="pqRedo">' + SP.icon('rotate-ccw') + '<span>' + esc(T('quiz.redo', { n: pq.errs.length })) + '</span></button>' : '') +
      (pq.pool.length ? '<button type="button" class="btn" id="pqMore">' + SP.icon('list-checks') + '<span>' + esc(T('player.more', { n: pq.pool.length })) + '</span></button>' : '<button type="button" class="btn" id="pqRound">' + SP.icon('refresh-cw') + '<span>' + esc(T('player.newRound')) + '</span></button>') +
      '<button type="button" class="btn btn-primary" id="pqResume">' + SP.icon('play') + '<span>' + esc(T('player.resume')) + '</span></button></div>');
    $('pqResume').onclick = function () { closeQuiz(true); };
    var mo = $('pqMore'); if (mo) mo.onclick = function () { takeBatch(); renderQ(); renderFeed(); };
    var rd = $('pqRound'); if (rd) rd.onclick = function () { pq.pool = SP.shuffle(Object.keys(bankMap())); pq.errs = []; pq.redoN = 0; savePq(); takeBatch(); renderQ(); renderFeed(); };
    var re = $('pqRedo'); if (re) re.onclick = startRedo;
    $('pqResume').focus();
    renderFeed();
  }
  function startRedo() {
    ensurePq(); if (!pq.errs.length) return;
    pq.redoN++; pq.batch = { kind: 'redo', ids: SP.shuffle(pq.errs.slice()), qi: 0, results: [], order: {} }; savePq();
    if (!quizOpen) { savedPos = M.time(); M.pause(); quizOpen = true; quizModal.classList.add('show'); }
    renderQ(); renderFeed();
  }

  /* ---------------- Лента вопросов под плеером ---------------- */
  function renderFeed() {
    var el = $('feedCard'); if (!el) return;
    var hasBank = SP.bank.all().length > 0;
    if (hasBank) ensurePq();
    var hist = pq ? pq.history : [], okN = hist.filter(function (h) { return h.ok; }).length, b = pq && pq.batch;
    /* оставшиеся вопросы текущей порции: первый из них — «текущий», если вопросы открыты */
    var remaining = b ? b.ids.slice(b.results.length) : [];
    var hasCurrent = quizOpen && remaining.length > 0;
    var upcoming = hasCurrent ? remaining.slice(1) : remaining;
    var nextBatch = pq ? pq.pool.slice(0, qPerTest) : [];
    var html = '<div class="card-head"><div><div class="card-title">' + SP.icon('list-checks') + esc(T('player.feedTitle')) + '</div>' +
      '<div class="card-sub">' + (hasBank ? esc(T('player.feedSub', { a: hist.length, ok: okN, bad: hist.length - okN })) : esc(T('player.noBankShort'))) + '</div></div>' +
      '<div class="row">' + (pq && pq.errs.length ? '<button type="button" class="btn btn-sm" id="feedRedo">' + SP.icon('rotate-ccw') + '<span>' + esc(T('quiz.redo', { n: pq.errs.length })) + '</span></button>' : '') +
      (hasBank ? '<button type="button" class="btn btn-sm btn-primary" id="feedNow"' + (current < 0 ? ' disabled' : '') + '>' + SP.icon('play') + '<span>' + esc(T('player.askNow')) + '</span></button>' : '') + '</div></div>';
    if (!hasBank) { el.innerHTML = html + '<div class="empty">' + SP.icon('list-checks', 'ic-xl') + '<p>' + esc(T('player.noBankText')) + '</p><a class="btn btn-primary" href="#/tester">' + SP.icon('upload') + '<span>' + esc(T('player.loadTests')) + '</span></a></div>'; wireFeed(); return; }
    html += '<div class="feed-legend xsmall"><span><i class="lg ok"></i>' + esc(T('player.lgRight')) + '</span><span><i class="lg bad"></i>' + esc(T('player.lgWrong')) + '</span><span><i class="lg cur"></i>' + esc(T('player.lgCurrent')) + '</span><span><i class="lg next"></i>' + esc(T('player.lgNext')) + '</span>' +
      '<span class="grow"></span><span class="subtle">' + esc(T('player.nextIn')) + ' <b id="feedNext">' + fmt(Math.max(0, nextAt - watch)) + '</b></span></div>';
    var n = 0, pills = hist.map(function (h, i) { n++; return '<button type="button" class="qn ' + (h.ok ? 'ok' : 'bad') + (feedSel === i ? ' sel' : '') + '" data-h="' + i + '" aria-label="' + esc(T('player.pillDone', { n: n, r: T(h.ok ? 'quiz.right' : 'quiz.wrong') })) + '">' + n + '</button>'; });
    if (hasCurrent) { n++; pills.push('<span class="qn cur" aria-label="' + esc(T('player.lgCurrent')) + '">' + n + '</span>'); }
    upcoming.concat(nextBatch).forEach(function () { n++; pills.push('<span class="qn next" aria-label="' + esc(T('player.lgNext')) + '">' + n + '</span>'); });
    html += '<div class="qn-list feed-list">' + (pills.join('') || '<span class="small subtle">' + esc(T('player.feedEmpty')) + '</span>') + '</div>';
    if (feedSel !== null && hist[feedSel]) {
      var h = hist[feedSel];
      html += '<div class="card card-flat feed-detail"><div class="row-between"><span class="badge ' + (h.ok ? 'badge-success' : 'badge-danger') + '">' + SP.icon(h.ok ? 'circle-check' : 'circle-x') + esc(T(h.ok ? 'quiz.right' : 'quiz.wrong')) + '</span><span class="xsmall subtle">' + esc(T('player.atVideo', { t: fmt(h.pos || 0) })) + ' · ' + esc(SP.fmtDateTime(h.at)) + '</span></div>' +
        E.richHtml(h.q, true) + '<div class="small"><b>' + esc(T('player.yourAnswer')) + ':</b> ' + esc((h.kb ? h.typed : (h.sel || []).join('; ')) || '—') + '</div><div class="small"><b class="text-success">' + esc(T('quiz.correct')) + ':</b> ' + esc(h.right) + '</div></div>';
    }
    if (pq && pq.lastResult) html += '<div class="row-between feed-last"><span class="small">' + esc(T('player.lastResult', { p: pq.lastResult.pct, a: pq.lastResult.ok, n: pq.lastResult.n })) + '</span><button type="button" class="btn btn-sm" id="feedResult"' + (quizOpen ? ' disabled' : '') + '>' + SP.icon('list-checks') + '<span>' + esc(T('player.showResult')) + '</span></button></div>';
    html += '<div class="row-between"><span class="xsmall subtle">' + esc(T('player.feedSaved')) + '</span><button type="button" class="btn btn-sm btn-danger-outline" id="feedReset"' + (hist.length || (pq && pq.errs.length) ? '' : ' disabled') + '>' + SP.icon('rotate-ccw') + '<span>' + esc(T('player.resetProgress')) + '</span></button></div>';
    el.innerHTML = html; wireFeed();
  }
  function wireFeed() {
    SP.$$('[data-h]', root).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-h'); feedSel = feedSel === i ? null : i; renderFeed(); }; });
    var r = $('feedRedo'); if (r) r.onclick = startRedo;
    var fr = $('feedResult'); if (fr) fr.onclick = function () { renderResult(pq.lastResult); renderFeed(); };
    var nw = $('feedNow'); if (nw) nw.onclick = function () { openQuiz(); };
    var rs = $('feedReset'); if (rs) rs.onclick = function () {
      SP.confirm({ title: T('player.resetTitle'), text: T('player.resetText'), okLabel: T('player.resetProgress'), danger: true, icon: 'rotate-ccw' }).then(function (ok) {
        if (!ok) return; pq = null; SP.store.del(PQ_KEY); feedSel = null; ensurePq(); renderFeed(); SP.toast(T('player.resetDone'), 'success');
      });
    };
  }

  /* ---------------- Настройки тестов ---------------- */
  function syncSettingsUI() {
    $('minInput').value = Math.floor(intervalSec / 60); $('secInput').value = intervalSec % 60;
    $('questionsInput').value = qPerTest; $('blockInput').checked = requireTest; $('warnInput').value = SP.settings.get('warnSec');
  }
  function loadSettings() {
    var s = SP.store.get('studyplay-settings2', {}) || {};
    if (s.intervalSec) intervalSec = s.intervalSec; if (s.q) qPerTest = s.q; if (typeof s.require === 'boolean') requireTest = s.require;
    nextAt = intervalSec;
    var t = SP.store.get('studyplay-timer', null); if (t && isFinite(t.watch) && isFinite(t.nextAt)) { watch = t.watch; nextAt = t.nextAt; }
    var p = SP.store.get('studyplay-prefs', {}) || {};
    if (typeof p.vol === 'number') vol = p.vol; if (typeof p.muted === 'boolean') muted = p.muted; if (p.rate) rate = p.rate;
    if (p.quality && YTQ[String(p.quality)]) quality = String(p.quality);
    if (typeof p.ytNative === 'boolean') ytNative = p.ytNative; if (typeof p.autoMini === 'boolean') autoMini = p.autoMini;
    syncSettingsUI();
  }
  function applySettings() {
    var m = Math.max(0, parseInt($('minInput').value, 10) || 0), s = clamp(parseInt($('secInput').value, 10) || 0, 0, 59);
    intervalSec = clamp(m * 60 + s, 10, 86400);
    qPerTest = clamp(parseInt($('questionsInput').value, 10) || 5, 1, 100);
    requireTest = $('blockInput').checked;
    SP.settings.set('warnSec', clamp(parseInt($('warnInput').value, 10) || 30, 5, 300));
    nextAt = watch + intervalSec; warned = false;
    SP.store.set('studyplay-settings2', { intervalSec: intervalSec, q: qPerTest, require: requireTest });
    syncSettingsUI(); saveProgress(); updateUI(); renderFeed(); SP.toast(T('player.saved'), 'success');
  }
  function bankUI() {
    var n = SP.bank.all().length, st = $('bankStatus');
    st.innerHTML = n ? '<span class="text-success">' + SP.icon('circle-check', 'ic-sm') + ' ' + esc(T('player.bankN', { n: n })) + '</span>' : '<span class="text-warning">' + SP.icon('triangle-alert', 'ic-sm') + ' ' + esc(T('player.noBankShort')) + '</span>';
  }

  function restore() {
    var s = SP.store.get('studyplay-queue', null);
    if (!s || !Array.isArray(s.items) || !s.items.length) return;
    s.items.reduce(function (p, it) {
      return p.then(function () {
        if (/^local/.test(it.kind)) {
          if (!it.stored) return;
          return idb.get(it.id).then(function (b) { if (!b) return; it.src = URL.createObjectURL(b); queue.push(it); }, function () { });
        }
        queue.push(it);
      });
    }, Promise.resolve()).then(function () {
      if (!queue.length) { persistQueue(); return; }
      renderQueue();
      var idx = queue.map(function (x) { return x.id; }).indexOf(s.currentId); if (idx < 0) idx = 0;
      loadItem(idx, false);
      var p = queue[idx].position || 0; if (p > 1) snack(T('player.restored', { t: fmt(p) }));
    });
  }

  function init() {
    player = $('player'); video = $('mediaVideo'); audio = $('mediaAudio'); audioArt = $('audioArt'); ytWrap = $('ytWrap');
    emptyMsg = $('emptyMsg'); clickLayer = $('clickLayer'); osd = $('osd'); controls = $('controls'); menu = $('menu');
    seek = $('seek'); seekFill = $('seekFill'); seekBuf = $('seekBuf'); seekKnob = $('seekKnob'); seekTip = $('seekTip');
    playBtn = $('playBtn'); nextBtn = $('nextBtn'); muteBtn = $('muteBtn'); gearBtn = $('gearBtn'); fsBtn = $('fsBtn');
    volSlider = $('volSlider'); volTrack = $('volTrack'); volFill = $('volFill'); volKnob = $('volKnob');
    timeLabel = $('timeLabel'); nowTitle = $('nowTitle'); nowMeta = $('nowMeta'); ptitle = $('ptitle');
    toast = $('testToast'); toastTime = $('toastTime'); snackEl = $('snack'); quizModal = $('quizModal'); quizCard = $('quizCard');
    playlistEl = $('playlist'); queueCount = $('queueCount'); fileInput = $('fileInput'); urlInput = $('urlInput');
    watchProgress = $('watchProgress'); watchText = $('watchText');
    pslot = $('pslot'); miniBtn = $('miniBtn'); miniHead = $('miniHead'); miniTitle = $('miniTitle');

    setBtn(nextBtn, 'skip-forward', 'player.next'); setBtn(gearBtn, 'settings', 'player.settings');
    setBtn(fsBtn, 'maximize', 'player.fullscreen'); setBtn(miniBtn, 'picture-in-picture-2', 'player.mini');

    player.addEventListener('mousemove', showControls);
    player.addEventListener('pointerdown', function (e) { touchMode = e.pointerType === 'touch'; showControls(); });
    player.addEventListener('mouseleave', function () { clearTimeout(hideT); if (M.playing()) hideT = setTimeout(hideControls, 600); });
    controls.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && e.detail) b.blur(); });
    document.addEventListener('fullscreenchange', onFS); document.addEventListener('webkitfullscreenchange', onFS);
    [miniHead, clickLayer].forEach(function (el) {
      el.addEventListener('pointerdown', function (e) { dragStart(e, el === clickLayer); });
      el.addEventListener('pointermove', dragMove); el.addEventListener('pointerup', dragEnd); el.addEventListener('pointercancel', dragEnd);
    });
    miniBtn.onclick = function () { setMini(!miniOn, false); };
    $('miniBack').onclick = function () { setMini(false); };
    $('miniRestore').onclick = function () { setMini(false); };
    $('miniSize').onclick = function () { var i = MINI_SIZES.indexOf(mini.w); mini.w = MINI_SIZES[(i + 1) % MINI_SIZES.length]; placeMini(); saveMini(); };
    $('natOurs').onclick = toggleNative; $('natMini').onclick = function () { setMini(!miniOn, false); }; $('natFs').onclick = toggleFS;
    window.addEventListener('resize', function () { if (miniOn) placeMini(); });

    var seekPct = function (e) { var r = seek.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
    seek.addEventListener('pointerdown', function (e) { if (!M.dur()) return; scrubbing = true; seek.classList.add('drag'); seek.setPointerCapture(e.pointerId); scrubPct = seekPct(e); updateUI(); });
    seek.addEventListener('pointermove', function (e) { var p = seekPct(e); seekTip.style.left = (p * 100) + '%'; seekTip.textContent = fmt(p * M.dur()); if (scrubbing) { scrubPct = p; updateUI(); } });
    seek.addEventListener('pointerup', function () { if (!scrubbing) return; scrubbing = false; seek.classList.remove('drag'); M.seek(scrubPct * M.dur()); lastMT = null; updateUI(); });
    seek.addEventListener('pointercancel', function () { scrubbing = false; seek.classList.remove('drag'); });
    var volDrag = false, volFrom = function (e) { var r = volTrack.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
    volSlider.addEventListener('pointerdown', function (e) { volDrag = true; volSlider.classList.add('drag'); volSlider.setPointerCapture(e.pointerId); setVol(volFrom(e), true); });
    volSlider.addEventListener('pointermove', function (e) { if (volDrag) setVol(volFrom(e), true); });
    volSlider.addEventListener('pointerup', function () { volDrag = false; volSlider.classList.remove('drag'); });

    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.rate) setRate(Number(b.dataset.rate));
      if (b.dataset.q) setQuality(b.dataset.q);
      if (b.dataset.nat) toggleNative();
      if (b.dataset.am) { autoMini = !autoMini; persistPrefs(); renderMenu(); if (!autoMini && miniOn && miniAuto) setMini(false); }
      if (b.id === 'applyCustomRate') { var v = clamp(Number($('customRate').value) || 1, 0.25, 4); setRate(Math.round(v * 100) / 100); }
    });
    gearBtn.onclick = function () { renderMenu(); menu.classList.toggle('open'); showControls(); };
    document.addEventListener('click', function (e) { if (menu.classList.contains('open') && !menu.contains(e.target) && !gearBtn.contains(e.target)) closeMenu(); });
    clickLayer.addEventListener('click', function () {
      if (suppressClick) { suppressClick = false; return; }
      if (menu.classList.contains('open')) { closeMenu(); return; }
      if (touchMode && player.classList.contains('idle')) { showControls(); return; }
      if (current < 0) { fileInput.click(); return; }
      togglePlay();
    });
    clickLayer.addEventListener('dblclick', function () { if (current >= 0) toggleFS(); });
    emptyMsg.onclick = function () { fileInput.click(); };
    playBtn.onclick = togglePlay;
    nextBtn.onclick = function () { if (current + 1 < queue.length) loadItem(current + 1, true); else snack(T('player.lastInQueue')); };
    muteBtn.onclick = toggleMute; fsBtn.onclick = toggleFS;

    playlistEl.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-rm]'); if (rm) { removeItem(+rm.getAttribute('data-rm')); return; }
      var pl = e.target.closest('[data-play]'); if (pl) loadItem(+pl.getAttribute('data-play'), true);
    });
    $('pPick').onclick = function () { fileInput.click(); };
    fileInput.addEventListener('change', function (e) { addFiles(e.target.files); e.target.value = ''; });
    $('urlForm').onsubmit = function (e) { e.preventDefault(); addUrl(urlInput.value); urlInput.value = ''; };
    $('applySettings').onclick = applySettings;
    $('keysBtn').onclick = function () { var l = $('keysList'); l.hidden = !l.hidden; this.setAttribute('aria-expanded', String(!l.hidden)); };
    window.addEventListener('beforeunload', saveProgress);
    document.addEventListener('visibilitychange', function () { if (document.hidden) saveProgress(); });
    window.onYouTubeIframeAPIReady = function () { if (pendingYT) { var f = pendingYT; pendingYT = null; f(); } };

    [video, audio].forEach(function (el) {
      el.addEventListener('play', function () { if (quizOpen) { el.pause(); return; } lastWall = performance.now(); lastMT = el.currentTime; showControls(); updateUI(); });
      el.addEventListener('pause', function () { if (current >= 0) saveProgress(); showControls(); updateUI(); });
      el.addEventListener('timeupdate', updateUI);
      el.addEventListener('ended', function () { if (current >= 0 && queue[current]) queue[current].position = 0; nextItem(); });
      el.addEventListener('error', function () { if (el.getAttribute('src')) snack(T('player.cantPlay')); });
    });

    loadSettings(); updateVolUI(); bankUI(); renderQueue(); renderMenu(); resetStage(); updateUI(); renderFeed();
    setInterval(tick, 250);
    restore();
  }

  /* ---------------- Горячие клавиши ---------------- */
  document.addEventListener('keydown', function (e) {
    if (!built || SP.views.current() !== 'player') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    /* 1) Печатаем в поле — плеер не мешает */
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"],[contenteditable=""]')) return;
    if (document.querySelector('.modal-backdrop')) return;
    /* 2) Открыты вопросы: цифры выбирают вариант, Enter — ответить/дальше */
    if (quizOpen) {
      if (/^[1-9]$/.test(e.key)) { var o = quizCard.querySelector('.opt[data-i="' + (+e.key - 1) + '"]'); if (o && !o.disabled) { e.preventDefault(); o.click(); } }
      else if (e.key === 'Enter') { var g = $('pqGo') || $('pqResume'); if (g && !g.disabled && t !== g) { e.preventDefault(); g.click(); } }
      return;
    }
    var c = e.code, act = function (fn, rep) { e.preventDefault(); if (rep || !e.repeat) fn(); };
    if (t && t.closest && t.closest('button,a') && (c === 'Space' || c === 'Enter')) return; /* пробел на кнопке нажимает кнопку */
    if (c === 'Space' || c === 'KeyK') act(togglePlay);
    else if (c === 'ArrowLeft') act(function () { seekBy(-5); }, true);
    else if (c === 'ArrowRight') act(function () { seekBy(5); }, true);
    else if (c === 'KeyJ') act(function () { seekBy(-10); }, true);
    else if (c === 'KeyL') act(function () { seekBy(10); }, true);
    else if (c === 'ArrowUp' && current >= 0) act(function () { muted = false; setVol(vol + 0.05); }, true);
    else if (c === 'ArrowDown' && current >= 0) act(function () { muted = false; setVol(vol - 0.05); }, true);
    else if (c === 'KeyM') act(toggleMute);
    else if (c === 'KeyF') act(toggleFS);
    else if (c === 'KeyI') act(function () { setMini(!miniOn, false); });
    else if (c === 'Escape') { if (menu.classList.contains('open')) closeMenu(); }
    else if (/^(Digit|Numpad)[0-9]$/.test(c) && current >= 0) { var d = +c.slice(-1); act(function () { M.seek(M.dur() * d / 10); lastMT = null; }); }
    else return;
    showControls();
  });

  SP.views.register('player', {
    titleKey: 'nav.player',
    mount: function (el) { root = el; build(); },
    show: function () { if (built) { bankUI(); renderFeed(); } },
    hide: function () {
      if (!built) return;
      if (fsEl()) try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ничего */ }
      if (miniOn) setMini(false);
      M.pause(); saveProgress();
    },
    refresh: function () {
      if (!built) return;
      SP.applyI18n(root); renderQueue(); renderMenu(); bankUI(); renderFeed(); lastIcon = ''; updateVolUI(); updateUI();
      setBtn(nextBtn, 'skip-forward', 'player.next'); setBtn(gearBtn, 'settings', 'player.settings'); setBtn(miniBtn, 'picture-in-picture-2', miniOn ? 'player.miniBack' : 'player.mini'); onFS();
      if (current < 0) resetStage(); else { var it = queue[current]; if (it) { nowMeta.textContent = it.kind === 'youtube' ? T('player.ytMeta') : /^local/.test(it.kind) ? T(isAudioKind() ? 'player.localAudio' : 'player.localVideo') : T('player.direct'); } }
      if (quizOpen) { if (pq && pq.batch) renderQ(); }
    }
  });
  SP.on('bank', function () { if (built) { bankUI(); renderFeed(); } });
})();

/* =====================================================================
   ЛОКАЛЬНЫЙ ПРОФИЛЬ (без паролей).

   Сайт статический (GitHub Pages) и не входит на Platonus/Timetable за
   студента. Поэтому «вход» здесь — это простой профиль на устройстве:
   имя (необязательно) и группа. Группа нужна, чтобы показать материалы
   и расписание именно вашей группы (папка data/<группа>/ на GitHub).

   Расписание и оценки студент загружает файлами, которые сам сохраняет
   из Platonus и Timetable (см. docs/КАК-ПОЛЬЗОВАТЬСЯ.md).

   Профиль хранится в localStorage под ключом «sp-auth».
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var KEY = 'sp-auth';
  var state = SP.store.get(KEY, null);

  /* перенос старого входа со старого сайта: берём только имя и группу, пароль игнорируем */
  if (!state) {
    var old = SP.store.get('studyplay-auth-v1', null);
    if (old && old.login) state = { mode: 'local', user: { name: old.name || old.login, group: old.group || '', nameSet: !!old.name } };
  }

  function save() { SP.store.set(KEY, state); SP.emit('auth', state); }
  function applyGroup() {
    var g = SP.groups.resolve(state && state.user && state.user.group);
    window.SP_GROUP = g ? g.name : '';
    window.SP_GROUP_DIR = g ? g.folder : '';
    window.SP_LEGACY = g ? g.legacy : false;
  }

  SP.auth = {
    state: function () { return state; },
    user: function () { return state ? Object.assign({ guest: true }, state.user || {}) : null; },
    isGuest: function () { return !!state; },
    isLinked: function () { return false; },   /* автоматического входа в вуз нет */
    loggedIn: function () { return !!state && !state.out; },
    /* «Выйти»: вернуться на экран входа (имя и группа подставятся — можно поменять группу или устройство) */
    signOut: function () {
      return SP.confirm({ title: SP.t('auth.outTitle'), text: SP.t('auth.outText'), okLabel: SP.t('auth.out'), icon: 'log-out' }).then(function (ok) {
        if (!ok) return;
        state = state || { mode: 'local', user: {} }; state.out = true; SP.store.set(KEY, state);
        location.hash = ''; location.reload();
      });
    },

    setGroup: function (g) {
      if (!state) state = { mode: 'local', user: {} };
      state.user = state.user || {}; state.user.group = SP.group.format(g);
      save(); applyGroup(); SP.hub.reloadBase();
    },
    updateProfile: function (p) {
      if (!state) state = { mode: 'local', user: {} };
      state.user = Object.assign({}, state.user, p);
      if (p && p.name) state.user.nameSet = true;
      if (p && 'group' in p) state.user.group = SP.group.format(p.group);
      save(); applyGroup();
      if (p && 'group' in p && SP.hub) SP.hub.reloadBase();
    },

    logout: function () {
      return SP.confirm({ title: SP.t('auth.resetTitle'), text: SP.t('auth.resetText'), okLabel: SP.t('auth.reset'), danger: true, icon: 'log-out' }).then(function (ok) {
        if (!ok) return;
        ['sp-auth', 'sp-cache-grades', 'sp-sync'].forEach(SP.store.del);
        location.hash = ''; location.reload();
      });
    },

    explain: function () {
      SP.modal({ title: SP.t('auth.howTitle'), size: 'lg', body: SP.t('auth.howHtml'), actions: [{ label: SP.t('common.understood'), kind: 'primary' }] });
    },

    /* Экран первого запуска: имя + группа + продолжить */
    showScreen: function () {
      return new Promise(function (resolve) { renderScreen(resolve); });
    }
  };

  applyGroup();
  SP.groups.load().then(applyGroup);

  function renderScreen(resolve) {
    document.body.classList.add('auth-open');
    var root = SP.$('#auth');
    var u = (state && state.user) || {};

    function langSeg() {
      return '<div class="segmented" role="group" aria-label="' + SP.esc(SP.t('settings.language')) + '">' + SP.LANGS.map(function (l) {
        return '<button type="button" data-lang="' + l.code + '" aria-pressed="' + (SP.lang() === l.code) + '" title="' + SP.esc(l.name) + '">' + l.short + '</button>';
      }).join('') + '</div>';
    }
    var dev = SP.settings.get('device') || SP.settings.detected;
    function devSeg() {
      return '<div class="segmented seg-block" role="radiogroup" aria-labelledby="suDevL">' + [['phone', 'smartphone'], ['pc', 'monitor']].map(function (d) {
        return '<button type="button" role="radio" data-dev="' + d[0] + '" aria-checked="' + (dev === d[0]) + '" aria-pressed="' + (dev === d[0]) + '">' + SP.icon(d[1], 'ic-sm') + '<span>' + SP.esc(SP.t('auth.dev.' + d[0])) + '</span></button>';
      }).join('') + '</div>';
    }
    function draw() {
      root.innerHTML =
        '<div class="auth-top"><div class="sb-brand"><span class="logo">' + SP.icon('book-open') + '</span><span>StudyPlay</span></div>' + langSeg() + '</div>' +
        '<div class="auth-card card card-pad-lg"><form class="stack" id="setupForm" novalidate>' +
        '<div class="stack-sm"><h1 class="auth-title">' + SP.esc(SP.t('auth.welcomeTitle')) + '</h1><p class="muted small">' + SP.esc(SP.t('auth.welcomeSub')) + '</p></div>' +
        '<div class="field"><label class="label" for="suName">' + SP.esc(SP.t('auth.yourName')) + '</label><input class="input" id="suName" autocomplete="name" value="' + SP.esc(u.name || '') + '" placeholder="' + SP.esc(SP.t('auth.yourNamePh')) + '"></div>' +
        '<div class="field"><label class="label" for="suGroup">' + SP.esc(SP.t('auth.group')) + '</label>' +
        '<div class="ac"><input class="input" id="suGroup" value="' + SP.esc(u.group || '') + '" placeholder="' + SP.esc(SP.t('auth.groupPh')) + '"></div>' +
        '<span class="error-text" id="suGroupErr" role="alert"></span>' +
        '<span class="hint">' + SP.esc(SP.t('auth.groupHint')) + '</span></div>' +
        '<div class="field"><div class="label" id="suDevL">' + SP.esc(SP.t('auth.device')) + '</div>' + devSeg() +
        '<span class="hint">' + SP.esc(SP.t('auth.deviceHint', { d: SP.t('auth.dev.' + SP.settings.detected).toLowerCase() })) + '</span></div>' +
        '<button type="submit" class="btn btn-primary btn-lg btn-block">' + SP.icon('arrow-right') + '<span>' + SP.esc(SP.t('auth.start')) + '</span></button>' +
        '<button type="button" class="link-btn small" id="suHow">' + SP.icon('shield-check', 'ic-sm') + ' ' + SP.esc(SP.t('auth.how')) + '</button>' +
        '</form></div>' +
        '<p class="auth-foot subtle xsmall">' + SP.esc(SP.t('auth.footer')) + '</p>';
      SP.$$('[data-lang]', root).forEach(function (b) { b.onclick = function () { SP.settings.set('lang', b.getAttribute('data-lang')); draw(); }; });
      SP.$('#suHow', root).onclick = SP.auth.explain;
      SP.$$('[data-dev]', root).forEach(function (b) { b.onclick = function () { dev = b.getAttribute('data-dev'); SP.$$('[data-dev]', root).forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on); x.setAttribute('aria-pressed', on); }); }; });
      SP.group.attach(SP.$('#suGroup', root), SP.$('#suGroupErr', root));
      SP.$('#setupForm', root).onsubmit = function (e) {
        e.preventDefault();
        var name = SP.$('#suName', root).value.trim(), gi = SP.$('#suGroup', root), group = SP.group.format(gi.value);
        if (group && !SP.group.valid(group)) { SP.$('#suGroupErr', root).textContent = SP.t('group.invalid'); gi.setAttribute('aria-invalid', 'true'); gi.focus(); return; }
        state = { mode: 'local', user: { name: name, group: group, nameSet: !!name } };
        SP.settings.applyDevice(dev);
        save(); applyGroup(); SP.hub.reloadBase();
        root.innerHTML = ''; document.body.classList.remove('auth-open');
        resolve(state);
      };
      setTimeout(function () { var f = SP.$('#suName', root); if (f) f.focus(); }, 40);
    }
    draw();
  }
})();

/* =====================================================================
   ДАННЫЕ ОЦЕНОК (локально, без сети).
   Оценки студент приносит файлом из Platonus (JSON журнала или
   сохранённая страница). Здесь мы только храним последний импорт в
   браузере и показываем, когда он был сделан.
   Расписание из Timetable загружается через раздел «Расписание»
   (файл .json или сохранённая HTML-страница) и живёт в hub.js.
   ===================================================================== */
(function () {
  'use strict';
  var SP = window.SP;
  var K_GR = 'sp-cache-grades', K_ST = 'sp-sync';
  var sync = SP.store.get(K_ST, { grades: {} }) || { grades: {} };
  function setStatus(patch) { sync.grades = Object.assign({}, sync.grades, patch); SP.store.set(K_ST, sync); }

  SP.data = {
    grades: function () { return SP.store.get(K_GR, null); },
    timetable: function () { return null; }, /* автозагрузки из Timetable нет — расписание грузится файлом */
    status: function () { return sync; },
    /* кнопка «обновить» ведёт к импорту файла; авто-обновления нет */
    refresh: function () { return Promise.resolve(false); },
    autoRefresh: function () { },

    /* Принять журнал Platonus: объект JSON или массив журналов */
    importGrades: function (raw) {
      var journals = toJournals(raw);
      if (!journals.length) return { ok: false, code: 'PARSE_ERROR' };
      var at = new Date().toISOString();
      var prof = pickProfile(raw);
      SP.store.set(K_GR, { at: at, profile: prof, journals: journals, source: 'import' });
      setStatus({ at: at, error: null });
      if (prof) {
        var u = SP.auth.user() || {}, p = {};
        if (prof.name && !u.nameSet) p.name = prof.name;
        if (prof.group && !u.group) p.group = prof.group;
        if (prof.course) p.course = prof.course;
        if (prof.profession) p.profession = prof.profession;
        if (Object.keys(p).length) SP.auth.updateProfile(p);
      }
      SP.emit('data', sync);
      return { ok: true, terms: journals.length };
    },
    clearGrades: function () { SP.store.del(K_GR); setStatus({ at: null, error: null }); SP.emit('data', sync); },

    /* «Загружено 5 минут назад» для шапки раздела «Оценки» */
    syncLine: function () {
      var st = sync.grades || {};
      if (!st.at) return '';
      return '<span class="sync-line" title="' + SP.esc(SP.fmtDateTime(st.at)) + '"><span class="dot"></span>' + SP.esc(SP.t('data.importedAt', { when: SP.relTime(st.at) })) + '</span>';
    }
  };

  /* Из разных форм ответа Platonus делаем список «семестров» с данными */
  function toJournals(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      /* [{year,term,data}] или просто массив записей журнала */
      if (raw.length && raw[0] && (raw[0].data || raw[0].journal) && (raw[0].year || raw[0].term)) {
        return raw.map(function (j, i) { return { label: j.label || labelFor(j), year: j.year, term: j.term, data: j.data || j.journal }; });
      }
      return [{ label: '', data: raw }];
    }
    if (typeof raw === 'object') {
      if (Array.isArray(raw.journals)) return toJournals(raw.journals);
      if (raw.data || raw.journal) return [{ label: raw.label || labelFor(raw), year: raw.year, term: raw.term, data: raw.data || raw.journal }];
      /* целый объект — отдаём как есть, normalize() в grades.js разберёт */
      return [{ label: '', data: raw }];
    }
    return [];
  }
  function labelFor(j) { return j.year && j.term ? SP.t('grades.termLabel', { y: j.year, t: j.term }) : ''; }
  function pickProfile(raw) {
    var p = raw && (raw.profile || raw.personInfo || raw.student);
    if (!p || typeof p !== 'object') return null;
    var name = [p.lastName, p.firstName, p.patronymic].filter(Boolean).join(' ').trim() || p.name || p.fio || '';
    return {
      name: name || undefined,
      group: p.groupName || p.group || undefined,
      course: p.courseNumber || p.course || undefined,
      profession: p.professionName || p.profession || undefined,
      gpa: p.gpa
    };
  }
})();

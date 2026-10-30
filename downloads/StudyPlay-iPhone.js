// StudyPlay для iPhone и iPad — скрипт для бесплатного приложения Scriptable (App Store).
// Берёт оценки из Platonus и расписание со ссылками из Timetable и открывает StudyPlay в Safari.
// Вся логика скачивается с сайта StudyPlay при каждом запуске — этот скрипт обновлять не нужно.
// Логин и пароль хранятся только на этом iPhone (в связке ключей) и уходят только в Platonus и Timetable.
//
// Запуск вручную (▶) — получить всё и открыть StudyPlay.
// Из «Команд» по расписанию — тихая проверка: при новой оценке придёт уведомление.
// Сменить логин и пароль — запустить с параметром setup (или удалить скрипт и добавить заново).

const SITE = 'https://alantesterr.github.io/testerw/';
const load = (url) => new Request(url).loadString();
const LZString = new Function((await load('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js')) + '\n;return LZString;')();
new Function(await load(SITE + 'js/sync/collector.js?u=' + Date.now())).call(globalThis);
await globalThis.SPCollect.runScriptable({ site: SITE, Request, Alert, Keychain, Notification, Safari, Script, config, args, LZString });

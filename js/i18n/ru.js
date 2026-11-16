/* =====================================================================
   РУССКИЙ ЯЗЫК (основной). Каждый ключ — одна строка интерфейса.
   {n}, {name} и т.п. — сюда подставляются значения.
   { one, few, many, other } — формы для чисел: 1 вопрос, 2 вопроса, 5 вопросов.
   Чтобы поменять текст на сайте — поменяйте его здесь
   (и, по желанию, в kk.js и en.js с тем же ключом).
   ===================================================================== */
window.SP = window.SP || {};
SP.I18N = SP.I18N || {};
SP.I18N.ru = {
  /* ---------- Общее ---------- */
  'common.actions': 'Действия',
  'common.add': 'Добавить',
  'common.apply': 'Применить',
  'common.back': 'Назад',
  'common.cancel': 'Отмена',
  'common.change': 'Изменить',
  'common.close': 'Закрыть',
  'common.confirm': 'Подтвердите действие',
  'common.continue': 'Продолжить',
  'common.copied': 'Скопировано',
  'common.copy': 'Копировать',
  'common.delete': 'Удалить',
  'common.deleteQ': 'Удалить?',
  'common.download': 'Скачать',
  'common.later': 'Позже',
  'common.next': 'Следующий',
  'common.ok': 'OK',
  'common.open': 'Открыть',
  'common.prev': 'Предыдущий',
  'common.save': 'Сохранить',
  'common.understood': 'Понятно',
  'common.update': 'Обновить',
  'common.upload': 'Загрузить',
  'unit.b': 'Б', 'unit.kb': 'КБ', 'unit.mb': 'МБ',
  'time.justNow': 'только что',
  'time.never': 'ещё не обновлялось',

  /* ---------- Навигация ---------- */
  'nav.label': 'Боковая панель',
  'nav.main': 'Главные разделы',
  'nav.schedule': 'Расписание', 'nav.scheduleShort': 'Расписание',
  'nav.subjects': 'Папки с предметами', 'nav.subjectsShort': 'Папки',
  'nav.tester': 'Тестер', 'nav.testerShort': 'Тестер',
  'nav.grades': 'Оценки', 'nav.gradesShort': 'Оценки',
  'nav.player': 'Плеер', 'nav.playerShort': 'Плеер',
  'nav.settings': 'Настройки',
  'nav.collapse': 'Свернуть панель',
  'nav.expand': 'Развернуть панель',
  'nav.hidePanel': 'Скрыть панель',
  'nav.showPanel': 'Показать панель',

  'day.mon': 'Понедельник', 'day.tue': 'Вторник', 'day.wed': 'Среда', 'day.thu': 'Четверг', 'day.fri': 'Пятница', 'day.sat': 'Суббота',
  'day.monShort': 'Пн', 'day.tueShort': 'Вт', 'day.wedShort': 'Ср', 'day.thuShort': 'Чт', 'day.friShort': 'Пт', 'day.satShort': 'Сб',
  'kind.k-lecture': 'Лекция', 'kind.k-practice': 'Практика', 'kind.k-lab': 'Лабораторная', 'kind.k-seminar': 'Семинар', 'kind.k-other': 'Занятие',

  /* ---------- Вход и регистрация ---------- */
  'auth.loginTitle': 'Вход в StudyPlay',
  'auth.loginSub': 'Войдите с логином и паролем от Platonus.',
  'auth.registerTitle': 'Подключение Platonus и Timetable',
  'auth.registerSub': 'Один раз введите данные от сайтов вуза — дальше StudyPlay сам будет забирать расписание и оценки.',
  'auth.tabLogin': 'Вход',
  'auth.tabRegister': 'Регистрация',
  'auth.login': 'Логин',
  'auth.password': 'Пароль',
  'auth.showPass': 'Показать пароль',
  'auth.hidePass': 'Скрыть пароль',
  'auth.ttSame': 'В Timetable такие же логин и пароль',
  'auth.group': 'Группа',
  'auth.groupPh': 'Например, ИР-252',
  'auth.groupHint': 'Нужна, чтобы показать материалы и тесты вашей группы. Можно изменить позже в Настройках.',
  'auth.remember': 'Запомнить пароль на этом устройстве (в зашифрованном виде)',
  'auth.loginBtn': 'Войти',
  'auth.registerBtn': 'Подключить и войти',
  'auth.guest': 'Продолжить без входа',
  'auth.how': 'Как хранятся пароли?',
  'auth.footer': 'StudyPlay — неофициальный помощник для студентов. Пароль не сохраняется на GitHub и на сервере.',
  'auth.fillBoth': 'Введите логин и пароль.',
  'auth.fillTt': 'Введите логин и пароль от Timetable или отметьте, что они такие же.',
  'auth.noProxyTitle': 'Вход через Platonus пока не настроен',
  'auth.noProxyText': 'Автор сайта ещё не указал адрес сервера-посредника (js/config.js). Пока можно пользоваться сайтом без входа.',
  'auth.codeTitle': 'Код подтверждения',
  'auth.codeText': 'Platonus отправил 6-значный код на почту {email}. Введите его здесь.',
  'auth.yourEmail': 'вашу почту',
  'auth.code': 'Код из письма',
  'auth.codeLen': 'Код должен состоять из 6 цифр.',
  'auth.codeConfirm': 'Подтвердить',
  'auth.codeResend': 'Отправить код ещё раз',
  'auth.codeSent': 'Новый код отправлен на почту.',
  'auth.welcome': 'Добро пожаловать, {name}!',
  'auth.guestTitle': 'Режим без входа',
  'auth.guestText': 'Расписание и оценки из вуза загружаться не будут. Тестер, плеер, папки предметов и загрузка расписания файлом работают полностью.',
  'auth.guestGo': 'Продолжить',
  'auth.guestName': 'Гость',
  'auth.guestShort': 'Без входа',
  'auth.loginPlatonus': 'Войти через Platonus',
  'auth.logout': 'Выйти',
  'auth.logoutTitle': 'Выйти из аккаунта?',
  'auth.logoutText': 'Сохранённый пароль и кэш оценок будут удалены с этого устройства. Тесты, папки и заметки останутся.',
  'auth.askPlTitle': 'Пароль от Platonus',
  'auth.askTtTitle': 'Пароль от Timetable',
  'auth.askPassText': 'Пароль не был сохранён на этом устройстве. Введите его, чтобы обновить данные.',
  'auth.ttRelink': 'Данные для Timetable',
  'auth.howTitle': 'Как хранятся логины и пароли',
  'auth.howHtml': '<p><b>Коротко:</b> ваш пароль хранится только в вашем браузере, в зашифрованном виде. На GitHub и на сервере его нет.</p>' +
    '<ol><li><b>Зачем нужен сервер-посредник.</b> Браузер не может сам зайти на platonus.kgu.kz и timetable.kgu.kz — сайты вуза это запрещают (правило CORS). Поэтому есть маленькая программа на Cloudflare (Worker): она получает от вашего браузера логин и пароль, входит на сайт вуза, забирает расписание и оценки и сразу отдаёт их вам. Ничего не записывает.</li>' +
    '<li><b>Где лежит пароль.</b> Если отмечено «Запомнить пароль», браузер создаёт секретный ключ, который нельзя скопировать даже из консоли, и шифрует им логин и пароль (AES-256). Зашифрованные данные лежат в памяти браузера на этом устройстве.</li>' +
    '<li><b>От чего это защищает.</b> Если кто-то скопирует файлы браузера или откроет хранилище — увидит только непонятный набор символов.</li>' +
    '<li><b>От чего не защищает.</b> Человек, который сидит за вашим разблокированным устройством, может открыть сайт. На чужом компьютере снимайте галочку «Запомнить пароль» и нажимайте «Выйти».</li>' +
    '<li><b>Кто видит пароль.</b> Только ваш браузер, сервер-посредник автора сайта (в момент входа, без сохранения) и сайт вуза. Если не доверяете автору — разверните свой посредник по инструкции docs/ПУБЛИКАЦИЯ.md.</li></ol>',

  /* ---------- Данные из вуза ---------- */
  'data.refresh': 'Обновить данные',
  'data.updated': 'Данные обновлены',
  'data.updatedAt': 'Обновлено {when}',
  'data.never': 'Ещё не обновлялось',
  'data.lastFailed': 'последняя попытка не удалась',
  'data.failed': 'Не удалось обновить {what}.',
  'data.showingCached': 'Показаны последние сохранённые данные.',
  'data.needLogin': 'Войдите через Platonus, чтобы загружать расписание и оценки.',
  'data.src.grades': 'оценки (Platonus)',
  'data.src.timetable': 'расписание (Timetable)',

  /* ---------- Ошибки ---------- */
  'err.NO_PROXY': 'Сервер-посредник не настроен (адрес в js/config.js пустой).',
  'err.OFFLINE': 'Нет подключения к интернету.',
  'err.TIMEOUT': 'Сайт вуза слишком долго не отвечает. Попробуйте позже.',
  'err.PROXY_UNREACHABLE': 'Сервер-посредник недоступен. Проверьте интернет или адрес в js/config.js.',
  'err.PROXY_ERROR': 'Ошибка сервера-посредника.',
  'err.BAD_RESPONSE': 'Получен непонятный ответ. Попробуйте позже.',
  'err.INVALID_CREDENTIALS': 'Неверный логин или пароль.',
  'err.BAD_CODE': 'Неверный код подтверждения.',
  'err.CODE_EXPIRED': 'Срок действия кода истёк. Запросите новый.',
  'err.UPSTREAM_DOWN': 'Сайт вуза сейчас недоступен. Попробуйте позже.',
  'err.UPSTREAM_ERROR': 'Сайт вуза вернул ошибку.',
  'err.SESSION_EXPIRED': 'Сессия Platonus истекла.',
  'err.UNAUTHORIZED': 'Нужно войти заново.',
  'err.NEED_PASSWORD': 'Нужен пароль для обновления.',
  'err.CANCELLED': 'Действие отменено.',
  'err.PARSE_ERROR': 'Не удалось разобрать страницу сайта вуза — возможно, она изменилась.',
  'err.RATE_LIMIT': 'Слишком много попыток. Подождите минуту.',
  'err.FORBIDDEN_ORIGIN': 'Сервер-посредник не принимает запросы с этого адреса сайта (настройка ALLOWED_ORIGINS).',
  'err.BAD_REQUEST': 'Неверный запрос.',
  'err.SCRIPT': 'Что-то пошло не так. Обновите страницу.',
  'err.UNKNOWN': 'Неизвестная ошибка.',

  /* ---------- Расписание ---------- */
  'schedule.source': 'Источник расписания',
  'schedule.src.own': 'Своё',
  'schedule.src.timetable': 'Timetable',
  'schedule.src.course': 'Курс',
  'schedule.version': 'версия {v}',
  'schedule.prevWeek': 'Предыдущая неделя',
  'schedule.nextWeek': 'Следующая неделя',
  'schedule.toToday': 'Вернуться к текущей неделе',
  'schedule.view': 'Вид расписания',
  'schedule.week': 'Неделя',
  'schedule.day': 'День',
  'schedule.days': 'Дни недели',
  'schedule.zoomIn': 'Крупнее',
  'schedule.zoomOut': 'Мельче',
  'schedule.time': 'Время',
  'schedule.openFolder': 'Открыть папку предмета',
  'schedule.lessons': { one: '{n} занятие', few: '{n} занятия', many: '{n} занятий', other: '{n} занятия' },
  'schedule.freeDay': 'Занятий нет',
  'schedule.hint': 'Нажмите на занятие, чтобы открыть папку предмета с материалами и тестами.',
  'schedule.newCourse': 'Пришло новое расписание курса {v}',
  'schedule.newCourseText': 'Ваши заметки, ссылки и файлы не изменятся.',
  'schedule.ttStale': 'Не удалось обновить расписание из Timetable — показано последнее сохранённое.',
  'schedule.emptyTitle': 'Расписания пока нет',
  'schedule.emptyLinked': 'Нажмите «Обновить данные», чтобы загрузить расписание из Timetable, или загрузите файл расписания.',
  'schedule.emptyGuest': 'Войдите через Platonus, чтобы расписание загружалось само, или загрузите файл расписания (JSON или сохранённую HTML-страницу).',
  'schedule.upload': 'Загрузить файл расписания',
  'schedule.howTo': 'Как подготовить расписание',
  'schedule.help1': 'Откройте ChatGPT или другой ИИ и прикрепите фото, PDF, Word, Excel или текст расписания.',
  'schedule.help2': 'Скопируйте промпт ниже и отправьте его вместе с файлом.',
  'schedule.help3': 'Сохраните ответ ИИ как файл .json и загрузите его в Настройки → Данные → «Загрузить расписание». Можно загрузить и сохранённую страницу Timetable (.html).',
  'schedule.help4': 'Своё расписание важнее расписания из Timetable и курса. Вернуть их можно в Настройки → Данные.',
  'schedule.aiPromptLabel': 'Промпт для ИИ',
  'schedule.aiPrompt': 'Ты — помощник по составлению расписания занятий для StudyPlay. На основе прикреплённого фото, скриншота, PDF, Word, Excel или текста извлеки расписание без выдумывания отсутствующих данных. Верни ТОЛЬКО корректный JSON без Markdown в формате: {"version":1,"timeSlots":[{"id":"slot1","start":"08:30:00","end":"09:20:00"}],"subjects":[{"id":"subject-1","code":"","name":"Название предмета","teacher":"ФИО преподавателя","materials":[],"tests":[],"notes":""}],"schedule":[{"id":"lesson-1","day":0,"slotId":"slot1","subjectId":"subject-1","name":"Название предмета","kind":"Лекция","room":"Аудитория","building":"Корпус","teacher":"ФИО преподавателя"}]}. day: 0 понедельник, 1 вторник, 2 среда, 3 четверг, 4 пятница, 5 суббота. Создай отдельный timeSlot для каждого времени пары. Создай один subject на каждый уникальный предмет. Не добавляй занятий, которых нет в источнике. Верни только JSON.',
  'schedule.dlTemplate': 'Шаблон JSON',
  'schedule.editTitle': 'Редактировать расписание (JSON)',
  'schedule.editText': 'День: 0 — понедельник … 5 — суббота. slotId должен совпадать с id временного слота, subjectId — с id предмета. Сохранённое станет вашим расписанием.',
  'schedule.editNeed': 'Нужны массивы schedule и timeSlots.',
  'schedule.editNoSubject': 'Не найден предмет для subjectId: {id}',
  'schedule.saved': 'Расписание сохранено',

  /* ---------- Данные расписания / папок (служебные) ---------- */
  'hub.subject': 'Предмет',
  'hub.noName': 'Без названия',
  'hub.storageFull': 'Не удалось сохранить: память браузера заполнена. Скачайте резервную копию и удалите крупные файлы.',
  'hub.fromImport': '— из импортированного файла —',
  'hub.mateNotesLabel': '— заметки сокурсника —',
  'hub.courseFail': 'Не удалось загрузить данные курса (нет сети или сайт открыт как файл). Используются сохранённые.',
  'hub.courseUpdated': 'Данные курса обновлены (версия {v}). Ваши заметки и ссылки не тронуты.',
  'hub.courseActual': 'Данные курса актуальны',
  'hub.fileProtocol': 'сайт открыт как файл — откройте его по адресу GitHub Pages',
  'hub.fileNotFound': 'файл не найден: «{path}». Проверьте путь в manifest.json и регистр букв.',
  'hub.htmlNoTable': 'в HTML не найдена таблица с днями недели',
  'hub.htmlNoLessons': 'в таблице не найдено ни одного занятия',
  'hub.importBad': 'файл не является ни JSON, ни HTML-страницей расписания',
  'hub.importEmpty': 'в файле нет ни предметов, ни расписания',
  'hub.importDay': 'у занятия «{name}» день должен быть от 0 до 5',
  'hub.replaceTitle': 'Заменить расписание?',
  'hub.replaceText': 'Заменить ваше расписание расписанием из файла «{name}»? Предметы, материалы и заметки сохранятся.',
  'hub.replace': 'Заменить',
  'hub.exportOk': 'Скачана резервная копия: расписание, предметы, материалы, ссылки, тесты и заметки.',
  'hub.exportMissing': 'Копия скачана, но {n} файл(ов) не удалось включить.',
  'hub.manifestOk': 'Скачан manifest.json (версия {v}). Положите его в папку data/{dir}/ репозитория, а файлы — в data/{dir}/files/<предмет>/.',
  'hub.scheduleOk': 'Скачан schedule.json (версия {v}). Положите его в папку data/{dir}/ репозитория.',
  'hub.sharedDup': 'уже добавлен',
  'hub.sharedNothing': 'нет новых тестов и заметок',
  'hub.sharedOk': 'Файлы сокурсника добавлены отдельно (тестов: {t}, заметок: {n}). Чтобы сохранить их себе — нажмите «Сохранить к себе» в папке предмета.',
  'hub.notAdded': 'Не добавлено:',

  'import.done': 'Импорт выполнен',
  'import.failed': 'Импорт не выполнен',
  'import.files': 'Обработано файлов: {n}',
  'import.subjects': 'Новых предметов: {n}',
  'import.items': 'Добавлено материалов, ссылок и тестов: {n} (повторы пропущены)',
  'import.notes': 'Дополнено заметок: {n}',
  'import.lessons': 'Расписание загружено, занятий: {n}',
  'import.lost': 'Пропущено занятий без предмета: {n}',
  'import.kept': 'Ваше текущее расписание не изменено.',
  'import.safe': 'Ранее сохранённые данные не тронуты.',

  /* ---------- Папки с предметами ---------- */
  'subjects.count': { one: '{n} предмет', few: '{n} предмета', many: '{n} предметов', other: '{n} предмета' },
  'subjects.add': 'Добавить предмет',
  'subjects.sharedLoad': 'Файлы сокурсника',
  'subjects.emptyTitle': 'Папок пока нет',
  'subjects.emptyText': 'Папки появятся автоматически из расписания. Можно добавить предмет вручную.',
  'subjects.search': 'Поиск предмета',
  'subjects.notFound': 'Ничего не найдено',
  'subjects.itemMeta': 'Материалов: {m} · тестов: {t}',
  'subjects.hasMate': 'есть файлы сокурсника',
  'subjects.mateGroup': 'Из файла «{name}»',
  'subjects.testsN': { one: '{n} тест', few: '{n} теста', many: '{n} тестов', other: '{n} теста' },
  'subjects.pick': 'Выберите предмет слева.',
  'subjects.all': 'Все предметы',
  'subjects.noTeacher': 'Преподаватель не указан',
  'subjects.fromTt': 'из Timetable',
  'subjects.fromCourse': 'от курса',
  'subjects.edit': 'Изменить предмет',
  'subjects.materials': 'Материалы',
  'subjects.tests': 'Тесты',
  'subjects.notes': 'Заметки',
  'subjects.uploadMat': 'Загрузить материалы',
  'subjects.addLink': 'Добавить ссылку',
  'subjects.noMat': 'Пока нет материалов. Добавьте конспекты, презентации, PDF или ссылки (например, на Telegram).',
  'subjects.uploadTest': 'Добавить файл теста',
  'subjects.noTests': 'Пока нет тестов. Можно загрузить TXT, DOCX или JSON.',
  'subjects.notesLabel': 'Личные конспекты и напоминания',
  'subjects.notesPh': 'Определения, вопросы преподавателю, план подготовки…',
  'subjects.notesAuto': 'Сохраняется автоматически',
  'subjects.notesSaving': 'Сохраняется…',
  'subjects.notesSaved': 'Сохранено',
  'subjects.link': 'Ссылка',
  'subjects.courseFile': 'от курса',
  'subjects.courseFileTip': 'Файл добавил автор курса на GitHub',
  'subjects.runTest': 'Пройти',
  'subjects.pin': 'Закрепить',
  'subjects.unpin': 'Открепить',
  'subjects.moveUp': 'Переместить выше',
  'subjects.moveDown': 'Переместить ниже',
  'subjects.deleteFile': 'Удалить «{name}»? Это действие нельзя отменить.',
  'subjects.mateTitle': 'Файлы сокурсника',
  'subjects.mateText': 'Эти тесты и заметки лежат отдельно и пока не входят в ваш предмет.',
  'subjects.mateSave': 'Сохранить к себе',
  'subjects.mateSaved': 'Сохранено: тестов {t}, заметок {n}',
  'subjects.mateNotes': 'Заметки сокурсника',
  'subjects.added': { one: 'Добавлен {n} файл', few: 'Добавлено {n} файла', many: 'Добавлено {n} файлов', other: 'Добавлено {n} файла' },
  'subjects.readFail': 'не удалось прочитать',
  'subjects.editTitle': 'Изменить предмет',
  'subjects.newTitle': 'Новый предмет',
  'subjects.name': 'Название предмета',
  'subjects.namePh': 'Например, Архитектура компьютера',
  'subjects.code': 'Код предмета',
  'subjects.teacher': 'Преподаватель',
  'subjects.nameReq': 'Введите название.',
  'subjects.deleteSubject': 'Удалить предмет',
  'subjects.deleteSubjectText': 'Удалить предмет со всеми материалами, тестами и заметками? Его занятия в вашем расписании тоже будут удалены.',
  'subjects.linkName': 'Название',
  'subjects.linkNamePh': 'Например, чат группы в Telegram',
  'subjects.linkNote': 'Заметка (необязательно)',
  'subjects.badUrl': 'Введите корректную ссылку (http:// или https://).',
  'subjects.dupUrl': 'Такая ссылка уже есть в этом предмете.',
  'subjects.linkAdded': 'Ссылка добавлена',
  'subjects.noContent': 'Содержимое файла недоступно',
  'subjects.openFail': 'Не удалось открыть:',
  'subjects.noPreview': 'Предпросмотр недоступен',
  'subjects.noPreviewText': 'Скачайте файл и откройте его в подходящей программе.',
  'subjects.slide': 'Слайд {i} из {n}',
  'subjects.pptxNote': 'Текстовый просмотр: оформление может отличаться.',

  /* ---------- Тестер ---------- */

  'tester.sub': 'Загрузите тесты и тренируйтесь. Вопросы и варианты перемешиваются.',
  'tester.help': 'Как это работает',
  'tester.editQuestions': 'Редактор вопросов',
  'tester.step1': '1. Файлы с тестами',
  'tester.formats': 'TXT, DOC, DOCX или .studyplay.json · можно несколько файлов',
  'tester.filesOf': '{n} из {max}',
  'tester.dropHint': 'Перетащите файлы сюда или нажмите кнопку',
  'tester.pick': 'Выбрать файл',
  'tester.addMore': 'Добавить ещё файл',
  'tester.limit': 'Лимит {max} файлов',
  'tester.qCount': { one: '{n} вопрос', few: '{n} вопроса', many: '{n} вопросов', other: '{n} вопроса' },
  'tester.badCount': 'с ошибками: {n}',
  'tester.removeFile': 'Убрать файл',
  'tester.step2': '2. Начать тест',
  'tester.total': { one: 'Загружен {n} вопрос', few: 'Загружено {n} вопроса', many: 'Загружено {n} вопросов', other: 'Загружено {n} вопроса' },
  'tester.badTotal': 'с ошибками: {n} — исправить',
  'tester.howMany': 'Сколько вопросов',
  'tester.all': 'Все',
  'tester.random': 'Вопросы выбираются случайно',
  'tester.start': 'Начать тест',
  'tester.needFile': 'Сначала загрузите файл с тестом.',
  'tester.loaded': 'Загружено',
  'tester.noQuestions': 'в файле не найдено вопросов',
  'tester.image': 'Иллюстрация',
  'tester.helpTitle': 'Инструкция: тесты в StudyPlay',
  'tester.helpHtml': '<p>Загрузите файл теста или создайте его в <b>Дизайнере тестов</b> (Настройки → Для автора). Можно отмечать один или несколько правильных ответов, добавлять изображения и вопросы с вводом ответа с клавиатуры.</p>' +
    '<p><b>Формат файла.</b> Вопрос начинается с <code>&lt;question&gt;</code>, правильный вариант — <code>&lt;variantright&gt;</code>, остальные — <code>&lt;variant&gt;</code>, ответ с клавиатуры — <code>&lt;variant_keyboard&gt;</code>. Если правильный вариант не отмечен, верным считается первый. Пояснение к ответу — <code>&lt;explain&gt;</code> в конце вопроса: оно появится сразу после ответа. Платонус такую метку не понимает — для него экспортируйте без пояснений.</p>' +
    '<p><b>Проверка.</b> При нескольких правильных ответах нужно выбрать все верные и ни одного лишнего. Ответ с клавиатуры сравнивается без учёта регистра и пробелов по краям.</p>' +
    '<p><b>Нижняя панель.</b> Слева — «Сверхпоиск», «Режим ИИ» и «Перевести», справа — «Назад» и «Далее». Под «Перевести» есть переключатель «Автоперевод» (он же в Настройках → Тестер и плеер): когда он включён, вопросы переводятся сами.</p><p><b>Клавиши</b> (когда курсор не в поле ввода): ← → — предыдущий / следующий вопрос, 1–9 — выбрать вариант, Enter — ответить / дальше, Esc — снять фокус. В поле ручного ввода Enter отправляет ответ. Отключаются в Настройках → Тестер и плеер.</p>',
  'tester.exMulti': 'Выберите цвета флага Казахстана',
  'tester.exKb': 'Введите число 100',
  'tester.exExplain': 'Решение: 10 · 10 = 100. Пояснение видно после ответа.',
  'quiz.explain': 'Пояснение',
  'designer.explainPh': 'Пояснение к ответу (необязательно) — покажется после ответа',
  'designer.withEx': 'С пояснениями (снимите для загрузки в Платонус)',
  'tester.promptDocx': 'Промпт для ИИ (DOCX)',
  'tester.promptCopy': 'Скопировать промпт',
  'tester.aiQ': 'Вопрос:',
  'tester.aiOpts': 'Варианты ответа:',
  'tester.aiAsk': 'Ответь на русском языке. Объясни правильный ответ и каждый вариант.',
  'tester.err.noText': 'нет текста вопроса',
  'tester.err.noAnswer': 'не указан правильный ответ для ввода с клавиатуры',
  'tester.err.oneOpt': 'только один вариант ответа — добавьте ещё хотя бы один',
  'tester.err.allRight': 'все варианты отмечены правильными — нужен хотя бы один неверный',
  'tester.err.noOpts': 'нет вариантов ответа — добавьте их или сделайте вопрос специальным',
  'tester.err.min2': 'нужно минимум 2 варианта',
  'tester.err.noRight': 'не отмечен верный ответ',
  'tester.err.noDocxLib': 'библиотека чтения DOCX не загрузилась (нужен интернет)',
  'tester.err.format': 'поддерживаются TXT, DOC, DOCX и JSON',
  'tester.err.json': 'JSON должен содержать массив all или questions',
  'tester.err.notFound': 'вопросы не найдены (проверьте теги <question>, <variant>, <variantright>, <variant_keyboard>)',

  'bank.loaded': { one: 'Загружен {n} вопрос из файлов: {f}', few: 'Загружено {n} вопроса из файлов: {f}', many: 'Загружено {n} вопросов из файлов: {f}', other: 'Загружено {n} вопроса из файлов: {f}' },
  'bank.withErrors': 'С ошибками: {n} (не добавлены, видны в редакторе)',
  'bank.noOptions': 'Без вариантов ответа: {n} — дополните в редакторе',
  'bank.limit': 'Лимит {max} файлов: не добавлено {n}',
  'bank.draftFull': 'Черновик не поместился в память браузера (слишком много картинок). Сохраните тест файлом.',

  /* ---------- Прохождение теста ---------- */
  'quiz.progress': 'Вопрос {i} из {n} · отвечено {d}',
  'quiz.round': 'Работа над ошибками, раунд {n}',
  'quiz.exit': 'Выйти',
  'quiz.exitTitle': 'Выйти из теста?',
  'quiz.exitText': 'Ответы этого теста не сохранятся.',
  'quiz.nav': 'Номера вопросов',
  'quiz.goTo': 'Перейти к вопросу {n}',
  'quiz.kindKb': 'Ввод с клавиатуры',
  'quiz.kindMulti': 'Несколько верных ответов: {n}',
  'quiz.kindSingle': 'Один верный ответ',
  'quiz.search': 'Лупа',
  'quiz.searchTip': 'Найти этот вопрос в Google',
  'quiz.super': 'Сверхпоиск',
  'quiz.superTip': 'Запрос в Google: вопрос и все варианты с просьбой разобрать каждый',
  'quiz.ai': 'Режим ИИ',
  'quiz.aiTip': 'Тот же запрос в режиме ИИ Google',
  'quiz.translate': 'Перевести',
  'quiz.original': 'Оригинал',
  'quiz.typeAnswer': 'Введите ответ',
  'quiz.yourAnswer': 'Ваш ответ',
  'quiz.kbHint': 'Регистр букв и пробелы по краям не важны. Enter — проверить.',
  'quiz.right': 'Верно',
  'quiz.wrong': 'Неверно',
  'quiz.correctIs': 'Правильный ответ: {a}',
  'quiz.check': 'Проверить',
  'quiz.answer': 'Ответить',
  'quiz.next': 'Дальше',
  'quiz.finish': 'Завершить',
  'quiz.answerWord': 'ответ',
  'quiz.skipped': 'без ответа',
  'quiz.correct': 'Верно',
  'quiz.great': 'Отлично!',
  'quiz.good': 'Хороший результат',
  'quiz.tryAgain': 'Стоит повторить',
  'quiz.statRight': 'верно',
  'quiz.statWrong': 'неверно',
  'quiz.statSkip': 'без ответа',
  'quiz.statTotal': 'всего',
  'quiz.canRedo': 'Ошибки можно повторить в отдельном раунде.',
  'quiz.perfect': 'Ошибок нет — тест пройден идеально!',
  'quiz.redo': 'Работа над ошибками ({n})',
  'quiz.fullAgain': 'Весь тест заново',
  'quiz.again': 'Пройти заново',
  'quiz.review': 'Посмотреть ответы',
  'quiz.toStart': 'В начало',
  'quiz.errors': 'Ошибки и пропуски',

  /* ---------- Дизайнер тестов ---------- */
  'designer.title': 'Дизайнер тестов',
  'designer.sub': 'Создавайте и редактируйте вопросы',
  'designer.import': 'Импорт вопросов',
  'designer.preview': 'Предпросмотр',
  'designer.clear': 'Очистить всё',
  'designer.clearTitle': 'Очистить редактор?',
  'designer.clearText': 'Все вопросы и загруженные файлы будут убраны из Тестера и Плеера.',
  'designer.step1': '1. Обычные ({n})',
  'designer.step2': '2. Специальные ({n})',
  'designer.step3': '3. Сохранение',
  'designer.simpleHint': 'Обычные вопросы: один или несколько правильных вариантов, без картинок.',
  'designer.specialHint': 'Специальные вопросы: ввод ответа с клавиатуры или картинки в вопросе и вариантах.',
  'designer.add': 'Новый вопрос',
  'designer.search': 'Поиск по вопросам и ответам',
  'designer.toSpecial': 'К специальным',
  'designer.toSave': 'К сохранению',
  'designer.ready': 'готов',
  'designer.question': 'Вопрос {n}',
  'designer.delQ': 'Удалить вопрос',
  'designer.delQText': 'Удалить этот вопрос?',
  'designer.qText': 'Текст вопроса',
  'designer.qImg': 'Картинка вопроса',
  'designer.changeImg': 'Заменить картинку',
  'designer.removeImg': 'Убрать картинку',
  'designer.toKb': 'Сделать ввод с клавиатуры',
  'designer.toChoice': 'Сделать варианты ответа',
  'designer.rightAnswer': 'Правильный ответ',
  'designer.answerPh': 'Например, 100',
  'designer.noOpts': 'У вопроса нет вариантов ответа.',
  'designer.addOpts': 'Добавить варианты',
  'designer.makeSpecial': 'Сделать специальным',
  'designer.right': 'верный',
  'designer.option': 'Вариант {n}',
  'designer.optImg': 'Картинка варианта',
  'designer.delOpt': 'Удалить вариант',
  'designer.addOpt': 'Вариант',
  'designer.min2': 'Оставьте минимум 2 варианта.',
  'designer.movedSpecial': 'Вопрос перенесён в «Специальные»',
  'designer.nothing': 'Ничего не найдено.',
  'designer.emptyStep': 'Здесь пока нет вопросов. Нажмите «Новый вопрос» или «Импорт вопросов».',
  'designer.found': 'Найдено: {a} из {b}',
  'designer.totalN': 'Всего: {n}',
  'designer.badTitle': 'Вопросы с ошибками — не загружены ({n})',
  'designer.badHint': 'Исправьте их в исходном файле и загрузите снова. Крестик только скрывает карточку.',
  'designer.hide': 'Скрыть',
  'designer.txtHint': 'Сохраняет картинки внутри файла — лучше всего для вопросов с изображениями.',
  'designer.docHint': 'Только текст: картинки в DOC/DOCX не сохраняются.',
  'designer.onlySimple': 'Только обычные · {n}',
  'designer.onlySpecial': 'Только специальные · {n}',
  'designer.onlyNormal': 'Только с вариантами · {n}',
  'designer.onlyKb': 'Только с вводом с клавиатуры · {n}',
  'designer.allFile': 'Общий файл · {n}',
  'designer.dlTxt': 'Скачать TXT',
  'designer.more': 'Другое',
  'designer.jsonHint': '.studyplay.json сохраняет весь проект, включая картинки.',
  'designer.copyText': 'Копировать как текст',
  'designer.play': 'Пройти этот тест',
  'designer.saved': 'Файл подготовлен',
  'designer.copied': 'Текст теста скопирован (картинки встроены)',
  'designer.groupEmpty': 'В выбранной группе нет вопросов.',
  'designer.noImgInDoc': 'Файл подготовлен. Картинки в DOC/DOCX не сохраняются (вопросов с картинками: {n}).',
  'designer.fixFirst': 'Сначала исправьте вопросы',
  'designer.qProblem': 'Вопрос №{n}: {p}',
  'designer.noValid': 'Нет корректных вопросов для теста.',
  'designer.readyToPlay': 'Тест готов: {n} вопр. Нажмите «Начать тест».',
  'designer.skippedN': 'Пропущено некорректных: {n}.',
  'designer.importTitle': 'Импорт вопросов',
  'designer.importHint': 'Загрузите TXT, DOC, DOCX или .studyplay.json, либо вставьте текст с тегами <question>, <variant>, <variantright>.',
  'designer.importFile': 'Файл',
  'designer.importPaste': 'Или вставьте текст',
  'designer.importRead': 'Прочитать текст',
  'designer.importAdd': 'Добавить в редактор',
  'designer.importDone': 'Добавлено вопросов: {n}.',
  'designer.foundQ': { one: 'Найден {n} вопрос', few: 'Найдено {n} вопроса', many: 'Найдено {n} вопросов', other: 'Найдено {n} вопроса' },
  'designer.from': 'с',
  'designer.to': 'по',
  'designer.pvOf': 'Вопрос {i} из {n}',

  /* ---------- Плеер ---------- */
  'player.sub': 'Видео ставится на паузу, и появляются вопросы из Тестера',
  'player.addFiles': 'Добавить видео или аудио',
  'player.empty': 'Нажмите, чтобы выбрать видео или аудио',
  'player.noVideo': 'Ролик не выбран',
  'player.noVideoMeta': 'Добавьте видео или аудио с компьютера или ссылку на YouTube',
  'player.miniSize': 'Размер окна',
  'player.miniBack': 'Вернуть на место',
  'player.ourButtons': 'Кнопки StudyPlay',
  'player.mini': 'Мини-плеер',
  'player.fullscreen': 'Во весь экран',
  'player.exitFs': 'Выйти из полноэкранного режима',
  'player.inMini': 'Видео играет в мини-плеере',
  'player.soon': 'Скоро вопросы',
  'player.soonText': 'Видео остановится через',
  'player.play': 'Воспроизвести (K)',
  'player.pause': 'Пауза (K)',
  'player.next': 'Следующий ролик',
  'player.settings': 'Скорость и качество',
  'player.keys': 'Клавиши',
  'player.kPause': 'пауза',
  'player.kVol': 'громкость',
  'player.kMute': 'звук',
  'player.kJump': 'перейти к 0–90%',
  'player.muted': 'Звук выключен',
  'player.testsTitle': 'Вопросы во время просмотра',
  'player.loadTests': 'Загрузить тесты в Тестере',
  'player.every': 'Показывать вопросы каждые',
  'player.minutes': 'Минуты',
  'player.seconds': 'Секунды',
  'player.min': 'мин',
  'player.sec': 'сек',
  'player.perTest': 'Вопросов за раз',
  'player.warnLabel': 'Предупреждать за',
  'player.warnHint': 'За сколько секунд до вопросов показать предупреждение (по умолчанию 30).',
  'player.require': 'Требовать ответить перед продолжением',
  'player.saved': 'Настройки сохранены',
  'player.watched': 'Активный просмотр: {w} · до вопросов: {l}',
  'player.queue': 'Очередь',
  'player.queueEmpty': 'Очередь пуста',
  'player.urlPh': 'Ссылка на YouTube или видео',
  'player.storeNote': 'Файлы и место просмотра сохраняются в браузере — после перезагрузки ролик продолжится с того же места.',
  'player.remove': 'Убрать из очереди',
  'player.audio': 'Аудио',
  'player.video': 'Видео',
  'player.ytMeta': 'YouTube · встроенный плеер',
  'player.localAudio': 'Аудиофайл с компьютера',
  'player.localVideo': 'Видеофайл с компьютера',
  'player.direct': 'Прямая ссылка',
  'player.pickFirst': 'Сначала выберите ролик',
  'player.notStored': '«{name}» не удалось сохранить в браузере (слишком большой?). Он доступен, пока открыта страница.',
  'player.badUrl': 'Введите ссылку, которая начинается с https://',
  'player.ytError': 'YouTube не даёт воспроизвести это видео во встроенном плеере.',
  'player.cantPlay': 'Не удалось воспроизвести файл: формат не поддерживается или ссылка недоступна.',
  'player.lastInQueue': 'Это последний ролик в очереди',
  'player.restored': 'Ролик восстановлен — продолжите с {t}',
  'player.speed': 'Скорость',
  'player.quality': 'Качество',
  'player.auto': 'Авто',
  'player.nowPlaying': 'Сейчас: {q}',
  'player.ytNative': 'Родные кнопки YouTube',
  'player.ytNativeHint': 'YouTube часто игнорирует выбор качества извне — включите родные кнопки, у них своя шестерёнка.',
  'player.qualityLocal': 'У файла одно качество — то, что записано в нём.',
  'player.qualityNone': 'Выбор качества появится для роликов YouTube.',
  'player.autoMiniOn': 'При прокрутке вниз: включён',
  'player.autoMiniOff': 'При прокрутке вниз: выключен',
  'player.ytIgnored': 'YouTube не применил выбор — играет {q}. Включите «Родные кнопки YouTube».',
  'player.noBank': 'Пора на вопросы, но тестов нет — загрузите их в Тестере или выберите из папок предметов.',
  'player.noBankShort': 'Тесты не загружены — вопросы показываться не будут',
  'player.noBankText': 'Загрузите файл с тестами в Тестере или отметьте тесты из папок предметов справа («Откуда вопросы») — вопросы будут появляться во время просмотра.', 'player.srcTitle': 'Откуда вопросы', 'player.srcOwn': 'Мои тесты из Тестера', 'player.srcFolders': 'Тесты из папок предметов', 'player.srcNone': 'В папках предметов пока нет тестов.', 'player.srcLoading': 'загрузка…', 'player.srcFail': 'не открылся', 'player.srcQ': '{n} вопр.',
  'player.bankN': { one: 'В базе {n} вопрос', few: 'В базе {n} вопроса', many: 'В базе {n} вопросов', other: 'В базе {n} вопроса' },
  'player.questions': 'Вопросы',
  'player.testTime': 'Время вопросов',
  'player.redoRound': 'Работа над ошибками · раунд {n}',
  'player.stoppedAt': 'остановились на {t}',
  'player.skip': 'Пропустить',
  'player.noteFirst': 'Видео на паузе. После ответов оно продолжится с {t}.',
  'player.noteNext': 'Видео на паузе ({t}). Вернуться к просмотру можно в любой момент.',
  'player.qOf': 'Вопрос {i} из {n}',
  'player.backToVideo': 'Вернуться к видео',
  'player.showResult': 'Показать результат',
  'player.resultOf': 'Верно: {a} из {n}',
  'player.seenOf': 'Пройдено вопросов базы: {a} из {n}',
  'player.errsN': 'ошибок: {n}',
  'player.allSeen': 'Вы прошли все вопросы базы!',
  'player.allSeenErrs': 'Все вопросы базы уже были. Вопросы с ошибками ещё вернутся — круг закончится, когда ответишь верно на все.', 'player.learnedOf': 'выучено: {a} из {n}',
  'player.more': 'Ещё вопросы (осталось {n})',
  'player.newRound': 'Новый круг по всем вопросам',
  'player.resume': 'Продолжить просмотр',
  'player.feedTitle': 'Лента вопросов',
  'player.feedSub': 'Отвечено: {a} · верно: {ok} · неверно: {bad}',
  'player.askNow': 'Вопросы сейчас',
  'player.lgRight': 'верно',
  'player.lgWrong': 'неверно',
  'player.lgCurrent': 'текущий',
  'player.lgNext': 'предстоящий',
  'player.nextIn': 'Следующие вопросы через',
  'player.pillDone': 'Вопрос {n}: {r}',
  'player.feedEmpty': 'Пока нет вопросов',
  'player.atVideo': 'на {t} видео',
  'player.yourAnswer': 'Ваш ответ',
  'player.feedSaved': 'Прогресс сохраняется автоматически и не пропадёт после перезагрузки.',
  'player.resetProgress': 'Сбросить прогресс',
  'player.resetTitle': 'Сбросить прогресс вопросов?',
  'player.resetText': 'История ответов и ошибки в плеере будут удалены. Сами тесты останутся.',
  'player.resetDone': 'Прогресс сброшен',

  /* ---------- Оценки ---------- */
  'grades.subGuest': 'Журнал из Platonus и калькулятор рейтинга',
  'grades.journal': 'Журнал',
  'grades.calc': 'Калькулятор',
  'grades.needLogin': 'Оценки доступны после входа через Platonus',
  'grades.needLoginText': 'Сайт будет сам забирать журнал оценок. Калькулятор рейтинга работает и без входа.',
  'grades.openCalc': 'Открыть калькулятор',
  'grades.stale': 'Не удалось обновить оценки — показаны последние сохранённые.',
  'grades.noData': 'Оценки ещё не загружены',
  'grades.noDataText': 'Загрузите журнал, сохранённый из Platonus (JSON или сохранённая страница).',
  'grades.course': '{n} курс',
  'grades.empty': 'В журнале пока нет записей.',
  'grades.term': 'Семестр',
  'grades.termLabel': '{y} · семестр {t}',
  'grades.cantRead': 'Не удалось разобрать журнал',
  'grades.cantReadText': 'Platonus вернул данные в неожиданном виде. Откройте «Исходные данные» ниже и сообщите автору сайта.',
  'grades.current': 'Текущая',
  'grades.rk1': 'РК1',
  'grades.rk2': 'РК2',
  'grades.admission': 'Допуск',
  'grades.exam': 'Экзамен',
  'grades.total': 'Итог',
  'grades.letter': 'Буква',
  'grades.colors': 'Цвета: 90+ зелёный · 70–89 синий · 50–69 жёлтый · ниже 50 красный.',
  'grades.raw': 'Исходные данные',
  'grades.rawText': 'Так ответил Platonus. Если оценки показаны неверно — скачайте файл и отправьте автору сайта (в нём нет пароля).',
  'grades.formula': 'Рейтинг = текущая·60% + РК1·20% + РК2·20%; итог = рейтинг·60% + экзамен·40%',
  'grades.fromPlatonus': 'Взять из Platonus',
  'grades.addSubject': 'Предмет',
  'grades.calcEmpty': 'Предметов пока нет. Нажмите «Предмет», внесите оценки, РК1 и РК2 — сайт покажет, сколько нужно набрать на экзамене.',
  'grades.calcHint': 'Серые подсказки в полях показывают, сколько нужно набрать для 70+ (с запасом — 72).',
  'grades.subjectName': 'Название предмета',
  'grades.delSubject': 'Удалить предмет',
  'grades.delSubjectText': 'Удалить предмет «{name}» из калькулятора?',
  'grades.oneByOne': 'Оценки по одной',
  'grades.avgAtOnce': 'Сразу средняя текущая',
  'grades.currentAvg': 'Текущая средняя',
  'grades.newMark': 'Новая оценка (0–100)',
  'grades.addMark': 'Добавить оценку',
  'grades.delMark': 'Удалить оценку {v}',
  'grades.delMarkTip': 'Нажмите, чтобы удалить',
  'grades.avgCurrent': 'Ср. текущая',
  'grades.rating': 'Рейтинг',
  'grades.final': 'Итог',
  'grades.marksN': 'Оценок: {n}',
  'grades.avgIs': 'средняя {v}',
  'grades.enough': 'уже хватает',
  'grades.notEnough': 'не хватит даже 100',
  'grades.ok70': 'Итог 70+ — хорошо и выше.',
  'grades.below70': 'Итог ниже 70.',
  'grades.need': 'Чтобы выйти на 70+ ({list}): {x}. С запасом (72): {y}.',
  'grades.pickSubject': 'Выберите предмет из расписания или создайте новый.',
  'grades.newSubject': 'Новый предмет',
  'grades.filled': 'Заполнено предметов: {n}',

  /* ---------- Настройки ---------- */
  'settings.sub': 'Внешний вид, язык, аккаунт и данные',
  'settings.sections': 'Разделы настроек',
  'settings.appearance': 'Внешний вид',
  'settings.language': 'Язык',
  'settings.account': 'Аккаунт',
  'settings.data': 'Данные',
  'settings.testerPlayer': 'Тестер и плеер',
  'settings.tools': 'Инструменты',
  'settings.author': 'Для автора',
  'settings.about': 'О сайте',
  'settings.theme': 'Тема',
  'settings.theme.light': 'Светлая',
  'settings.theme.dark': 'Тёмная',
  'settings.theme.system': 'Как в системе',
  'settings.fontSize': 'Размер шрифта',
  'settings.sample': 'Аа',
  'settings.font.s': 'Маленький',
  'settings.font.ms': 'Меньше среднего',
  'settings.font.m': 'Средний',
  'settings.font.l': 'Большой',
  'settings.sidebar': 'Боковая панель',
  'settings.sidebarHint': 'Свёрнутая — только иконки. Скрытая — остаётся маленькая кнопка в углу.',
  'settings.sb.expanded': 'Развёрнута',
  'settings.sb.collapsed': 'Свёрнута',
  'settings.sb.hidden': 'Скрыта',
  'settings.linked': 'подключён',
  'settings.ttSame': 'тот же логин, что в Platonus',
  'settings.ttOwn': 'свой логин',
  'settings.remembered': 'Сохранённый пароль',
  'settings.rememberedYes': 'Пароль хранится на этом устройстве в зашифрованном виде.',
  'settings.rememberedNo': 'Пароль не сохранён — сайт спросит его при обновлении.',
  'settings.forget': 'Забыть пароль',
  'settings.forgetText': 'Пароль будет удалён с этого устройства. При следующем обновлении сайт спросит его снова.',
  'settings.forgotten': 'Пароль удалён с устройства',
  'settings.guestText': 'Вы пользуетесь сайтом без входа. Войдите через Platonus, чтобы расписание и оценки загружались сами.',
  'settings.groupHint': 'Папка материалов курса: data/{dir}/',
  'settings.leaveGuest': 'Выйти из режима без входа',
  'settings.saved': 'Сохранено',
  'settings.dataUni': 'Сайты вуза',
  'settings.refreshHint': 'Забрать свежее расписание из Timetable и оценки из Platonus.',
  'settings.uploadSchedule': 'Загрузить расписание',
  'settings.uploadScheduleHint': 'JSON StudyPlay или сохранённая HTML-страница расписания.',
  'settings.downloadSchedule': 'Скачать расписание',
  'settings.downloadScheduleHint': 'Резервная копия: расписание, папки, материалы, тесты и заметки в одном файле.',
  'settings.howToHint': 'Промпт для ИИ и шаблон файла.',
  'settings.editHint': 'Ручная правка в формате JSON.',
  'settings.dropOwn': 'Убрать своё расписание',
  'settings.dropOwnHint': 'Снова показывать расписание из Timetable или курса.',
  'settings.dropOwnBtn': 'Убрать',
  'settings.dropOwnText': 'Ваше загруженное расписание будет убрано. Папки, материалы и заметки останутся.',
  'settings.course': 'Данные курса (GitHub)',
  'settings.courseRefresh': 'Обновить данные курса',
  'settings.courseNone': 'Данные курса не загружены',
  'settings.ghScheduleHint': 'Для автора: файл расписания группы для папки data/<группа>/.',
  'settings.ghManifestHint': 'Для автора: список материалов, тестов и ссылок группы.',
  'settings.backup': 'Резервная копия',
  'settings.export': 'Экспорт настроек и прогресса',
  'settings.exportHint': 'Настройки, тесты, прогресс плеера, калькулятор. Пароли в файл не попадают.',
  'settings.exportBtn': 'Экспорт',
  'settings.exportDone': 'Файл резервной копии скачан',
  'settings.import': 'Импорт из резервной копии',
  'settings.importHint': 'Восстановить данные из файла экспорта.',
  'settings.importBtn': 'Импорт',
  'settings.importBad': 'Это не файл резервной копии StudyPlay.',
  'settings.importConfirm': 'Текущие настройки и прогресс будут заменены данными из файла. Продолжить?',
  'settings.wipe': 'Удалить все данные',
  'settings.wipeHint': 'Стереть всё, что StudyPlay хранит на этом устройстве.',
  'settings.wipeBtn': 'Удалить всё',
  'settings.wipeText': 'Будут удалены пароль, тесты, папки, файлы, заметки, прогресс и настройки на этом устройстве. Это нельзя отменить.',
  'settings.trLang': 'Язык перевода вопросов',
  'settings.trLangHint': 'На какой язык кнопка «Перевести» переводит вопросы в Тестере и Плеере.',
  'settings.playerMore': 'Интервал и число вопросов',
  'settings.playerMoreHint': 'Настраиваются на странице Плеера.',
  'settings.stopwatchHint': 'Небольшой секундомер поверх сайта.',
  'settings.designerHint': 'Создание и редактирование тестов, экспорт в TXT, DOCX, JSON.',

  'stopwatch.title': 'Секундомер',
  'stopwatch.start': 'Старт',
  'stopwatch.pause': 'Пауза',
  'stopwatch.reset': 'Сброс',
  'stopwatch.toggle': 'Свернуть или развернуть секундомер',

  /* ---------- Для автора ---------- */
  'author.sub': 'Инструменты для того, кто ведёт сайт',
  'author.guide': 'Памятка для автора',
  'author.guideHint': 'Как устроены группы, папки курса и обновления.',
  'author.groups': 'Группы и папки (файл)',
  'author.groupsHint': 'Связь «группа → папка материалов» (data/groups.json). Пароли здесь не хранятся.',
  'author.prompt': 'Промпт для ИИ',
  'author.promptHint': 'Как попросить ИИ составить тест в формате StudyPlay.',
  'author.folder': 'Папка',
  'author.groupsText': 'Каждой группе — своя папка с расписанием и материалами курса. Скачайте файл и положите его в репозиторий как data/groups.json.',
  'author.groupsAdd': 'Добавить группу',
  'author.groupsReload': 'Загрузить с сайта',
  'author.groupsDownload': 'Скачать groups.json',
  'author.groupsLoaded': 'Загружено групп: {n}',
  'author.groupsBad': 'Строка {n}: заполните название группы.',
  'author.groupsDone': 'Скачан groups.json. Замените им data/groups.json в репозитории и опубликуйте изменения.',
  'author.guideHtml': '<h3>1. Вход студентов</h3><p>Студенты входят своим логином и паролем от Platonus. Список логинов вести больше не нужно: старый файл accounts.json удалён, потому что пароли в нём лежали открыто.</p>' +
    '<h3>2. Группы и папки курса</h3><ol><li>Настройки → Для автора → «Группы и папки»: добавьте группу (например, ИР-252) и папку (ir-252).</li><li>Скачайте groups.json и замените им data/groups.json в репозитории.</li><li>В папку группы кладите schedule.json и manifest.json, а файлы — в data/&lt;папка&gt;/files/&lt;предмет&gt;/.</li></ol>' +
    '<pre class="code"><code>data/\n  groups.json          ← группы и папки\n  ir-252/\n    schedule.json      ← расписание группы (запасное)\n    manifest.json      ← материалы, тесты, ссылки\n    files/Философия/Лекция 1.pdf</code></pre>' +
    '<h3>3. Обновления</h3><ol><li>Изменили файлы группы — обязательно поменяйте "version" (например 2026-10-23.1 → 2026-10-24.1). Сайт делает это сам при скачивании через Настройки → Данные.</li><li>Студенты увидят уведомление «Пришло новое расписание курса».</li><li>Личные данные студентов (заметки, ссылки, своё расписание, калькулятор) не стираются.</li></ol>' +
    '<h3>4. Расписание и оценки из вуза</h3><p>Их забирает сервер-посредник (папка worker/). Если Platonus или Timetable изменят свои страницы, поправьте разбор в worker/src/index.js и js/features/grades.js. Подробно — docs/РЕДАКТИРОВАНИЕ.md.</p>',

  'about.text': 'StudyPlay {v}. Неофициальный учебный помощник: расписание, папки предметов, тестер, оценки и плеер. Код открыт — инструкции в папке docs/ репозитория.'
};

/* --- Дополнения: файловый импорт оценок и локальный профиль --- */
Object.assign(SP.I18N.ru, {
  'auth.welcomeTitle': 'Добро пожаловать в StudyPlay',
  'auth.welcomeSub': 'Укажите группу — и сразу увидите материалы и расписание своей группы. Имя можно не вводить.',
  'auth.yourName': 'Имя',
  'auth.yourNamePh': 'Например, Алан (необязательно)',
  'auth.start': 'Войти',
  'auth.noGroup': 'Группа не выбрана',
  'auth.reset': 'Сбросить профиль',
  'auth.resetTitle': 'Сбросить профиль?',
  'auth.resetText': 'Имя, группа и загруженные оценки будут удалены с этого устройства. Тесты, папки предметов и заметки останутся.',
  'data.importedAt': 'Загружено {when}',
  'grades.howTo': 'Как загрузить оценки',
  'grades.how1': 'Сайт не хранит ваш пароль и не заходит в Platonus за вас — журнал вы сохраняете сами. Так безопаснее.',
  'grades.how2': 'Войдите в Platonus в своём браузере и откройте «Журнал оценок».',
  'grades.how3': 'Сохраните страницу журнала (Ctrl+S) или, если умеете, сохраните ответ запроса rest/api/journal как файл .json.',
  'grades.how4': 'Вернитесь сюда, нажмите «Загрузить оценки» и выберите сохранённый файл. Данные останутся только на вашем устройстве.',
  'grades.howSafe': 'Пароль при этом нигде не вводится и никуда не передаётся — вы просто приносите готовый файл.',
  'grades.openPlatonus': 'Открыть журнал Platonus',
  'grades.import': 'Загрузить оценки',
  'grades.update': 'Обновить оценки',
  'grades.importAdd': 'Загрузить',
  'grades.importBad': 'Не удалось прочитать файл: нужен JSON журнала Platonus.',
  'grades.imported': 'Оценки загружены (семестров: {n})',
  'grades.importEmpty': 'Вставьте данные журнала или выберите файл.',
  'grades.importFile': 'Файл журнала (.json или сохранённая страница)',
  'grades.importIntro': 'Загрузите журнал, сохранённый из Platonus.',
  'grades.importPaste': 'Или вставьте содержимое сюда',
  'settings.importGrades': 'Загрузить оценки из файла',
  'settings.importGradesHint': 'Журнал, сохранённый из Platonus (JSON или страница).',
  'settings.localText': 'Профиль хранится только на этом устройстве. Пароль от Platonus сайт не спрашивает и не хранит.'
});

/* --- v4: режимы расписания, журнал Shokan, папки, группы, ИИ --- */
Object.assign(SP.I18N.ru, {
  'auth.yourNamePh': 'Сергей',
  'auth.groupPh': 'ИР-252',
  'grades.calc': 'Калькулятор оценок',
  'tester.aiLang': 'Отвечай только на этом языке: {lang}.',
  'tester.aiAsk': 'Объясни правильный ответ и каждый вариант.',
  'player.lastResult': 'Последний результат: {p}% (верно {a} из {n})',
  'player.showResult': 'Результат',
  'schedule.mode': 'Режим расписания',
  'schedule.mode.timetable': 'Timetable',
  'schedule.mode.shokan': 'Shokan',
  'schedule.mode.timetableTip': 'Timetable — классическая сетка как на сайте вуза. Удобнее на компьютере.',
  'schedule.mode.shokanTip': 'Shokan — вид как в приложении Shokan University. Удобнее на телефоне.',
  'schedule.weekOf': 'Неделя, начиная с',
  'schedule.select': 'Выбрать',
  'schedule.pickDate': 'Выбрать дату',
  'schedule.gap': 'Окно · {m} мин',
  'shk.letters': 'П,В,С,Ч,П,С',
  'shk.kind.lec': 'Лекции', 'shk.kind.lab': 'Лабораторные', 'shk.kind.pr': 'Практики', 'shk.kind.sem': 'Семинары',
  'shk.kind.exam': 'Экзамен', 'shk.kind.cons': 'Консультация',
  'shk.kind.prsem': 'Практики, семинары', 'shk.kind.sro': 'СРО', 'shk.kind.srop': 'СРОП',
  'jr.sub': 'Журнал предметов и калькулятор оценок',
  'jr.teacher': 'Преподаватель', 'jr.teachers': 'Преподаватели', 'jr.teacherField': 'Преподаватель(и)',
  'jr.cur': 'Ср. тек.', 'jr.rating': 'Рейтинг', 'jr.exam': 'Экзамен', 'jr.final': 'Итоговая',
  'jr.edit': 'Изменить оценки',
  'jr.fromCalc': 'Из калькулятора', 'jr.toJournal': 'Перенести в журнал',
  'jr.fromSchedule': 'Предметы из расписания',
  'jr.emptyTitle': 'Журнал пока пуст',
  'jr.emptyText': 'Доступа к Platonus нет, поэтому оценки вводите сами: добавьте предметы и нажмите на стрелку в карточке, чтобы вписать значения. Можно перенести их из калькулятора оценок.',
  'jr.moved': 'Перенесено из калькулятора: {n}', 'jr.calcEmpty': 'В калькуляторе нет предметов с названием.',
  'jr.added': 'Добавлено предметов: {n}', 'jr.delText': 'Удалить этот предмет из журнала?',
  'group.invalid': 'Формат группы: большие буквы, дефис и три цифры, например ИР-252. Пометку можно добавить в скобках: ИР-252 (уск).',
  'group.noMatch': 'Такой группы в списке нет — можно ввести свою.',
  'group.noList': 'Список групп не загружен — введите группу сами.',
  'subjects.select': 'Выбрать', 'subjects.selDone': 'Готово',
  'subjects.selectAll': 'Выбрать все',
  'subjects.selected': { one: 'Выбрана {n} папка', few: 'Выбрано {n} папки', many: 'Выбрано {n} папок', other: 'Выбрано {n} папки' },
  'subjects.selectOne': 'Выбрать папку «{name}»',
  'subjects.delFoldersTitle': 'Удалить папки ({n})?',
  'subjects.delFoldersText': 'Папки удалятся вместе с вашими материалами, тестами и заметками. Папки курса можно вернуть кнопкой «Вернуть удалённые».',
  'subjects.delFoldersDone': 'Удалено папок: {n}',
  'subjects.restoreRemoved': 'Вернуть удалённые', 'subjects.restored': 'Папки курса возвращены',
  'subjects.hideList': 'Скрыть список папок', 'subjects.showList': 'Показать список папок', 'subjects.foldersBtn': 'Папки',
  'subjects.showHidden': 'Показать скрытые ({n})', 'subjects.hideHidden': 'Не показывать скрытые',
  'subjects.allHidden': 'Все файлы скрыты. Нажмите «Показать скрытые».',
  'subjects.hiddenBadge': 'скрыт', 'subjects.hide': 'Скрыть', 'subjects.unhide': 'Показать снова',
  'subjects.hiddenToast': 'Файл скрыт. Вернуть: «Показать скрытые».',
  'subjects.cantDelete': 'Удалить нельзя (файл курса) — можно скрыть',
  'settings.font.xl': 'Очень большой', 'settings.font.xxl': 'Огромный'
});
Object.assign(SP.I18N.ru, { 'schedule.roomInFolder': 'Кабинет и преподаватель — в папке предмета', 'subjects.lessons': 'Занятия и кабинеты' });

Object.assign(SP.I18N.ru, { 'schedule.custom': 'Размер блоков', 'schedule.blockW': 'Ширина', 'schedule.blockH': 'Высота', 'schedule.auto': 'авто', 'schedule.reset': 'Сбросить' });

Object.assign(SP.I18N.ru, { 'quiz.tools': 'Инструменты ИИ', 'quiz.keysTip': 'Клавиши: ← → вопросы, 1–9 вариант, Enter ответ / дальше, Esc снять фокус', 'quiz.autoTrOn': 'Автоперевод включён', 'quiz.autoTrTip': 'Вопрос переведён автоматически. Нажмите, чтобы показать оригинал.', 'settings.schSize': 'Размер расписания ({m})', 'settings.sch.std': 'Стандарт', 'settings.sch.sm': 'Меньше', 'settings.sch.xs': 'Ещё меньше', 'settings.schHint': 'Считается от общего размера шрифта и меняет только расписание в своём режиме. Остальной сайт не меняется.', 'settings.autoTr': 'Автоперевод', 'settings.autoTrHint': 'Переводить вопросы теста сразу, без нажатия «Перевести».', 'settings.hotkeys': 'Горячие клавиши в тесте', 'settings.hotkeysHint': '← → вопросы, 1–9 вариант, Enter ответ / дальше, Esc снять фокус. В полях ввода не работают.' });

Object.assign(SP.I18N.ru, { 'jr.rk1': 'РК 1', 'jr.rk2': 'РК 2', 'jr.autoCalc': 'Рейтинг = Ср. тек.·60% + РК1·20% + РК2·20%. Итоговая = Рейтинг·60% + Экзамен·40%. Считаются сами.' });

Object.assign(SP.I18N.ru, { 'jr.sub': 'Журнал оценок: все предметы из расписания, рейтинг и итоговая считаются сами', 'jr.emptyText': 'Предметы появятся сами, когда загрузится расписание. Можно добавить предмет кнопкой «Предмет».', 'designer.mobileTitle': 'Редактор тестов — для компьютера', 'designer.mobileText': 'Редактор тяжёлый: на телефоне он может тормозить или закрыться. Откройте его с ПК или ноутбука. Проходить тесты на телефоне можно в Тестере.', 'designer.mobileAnyway': 'Всё равно открыть' });

Object.assign(SP.I18N.ru, { 'jr.how': 'Как считать оценку?', 'jr.restoreText': 'Верните удалённый предмет или создайте новый.', 'jr.restored': 'Предмет «{name}» возвращён',
  'jr.howHtml': '<p><b>Что вводите вы.</b> Нажмите стрелку на карточке предмета и впишите: текущие оценки по одной (или сразу среднее), РК 1, РК 2 и экзамен. Пустое поле — оценки ещё нет; 0 — получен ноль.</p>' +
    '<p><b>Средняя текущая</b> — среднее всех текущих оценок.</p><p><b>Рейтинг</b> (допуск) = Ср. тек. × 60% + РК 1 × 20% + РК 2 × 20%. Виден сразу, как в Platonus: РК, которого ещё нет, считается как 0.</p><p><b>Итоговая</b> = Рейтинг × 60% + Экзамен × 40%. Появляется, когда введён экзамен.</p>' +
    '<p><b>Пример.</b> Ср. тек. 85, РК 1 80, РК 2 90 → рейтинг 85 × 0,6 + 80 × 0,2 + 90 × 0,2 = 85. Экзамен 75 → итоговая 85 × 0,6 + 75 × 0,4 = 81.</p>' +
    '<p><b>Сколько нужно для 70+.</b> Под кольцами написано, сколько надо набрать на том, что ещё не сдано. Считается сразу с запасом до 71: ровно 70 на деле не засчитывается. Пока ничего не введено, подсказки нет.</p>' +
    '<p><b>Цвета колец.</b> <span class="jr-legend"><span><i style="background:var(--ring-green)"></i>90–100</span><span><i style="background:var(--ring-blue)"></i>70–89</span><span><i style="background:var(--ring-yellow)"></i>50–69</span><span><i style="background:var(--ring-red)"></i>0–49</span></span></p>' +
    '<p>Рейтинг и итоговая не вводятся — считаются сами. Все данные хранятся только на этом устройстве.</p>' });
Object.assign(SP.I18N.ru, { 'jr.need': 'Чтобы выйти на 70+ ({list}): {x}.', 'settings.exportHint': 'Настройки, тесты, прогресс плеера, журнал оценок. Пароли в файл не попадают.' });

Object.assign(SP.I18N.ru, { 'player.normal': 'Обычная', 'player.fit': 'Масштаб', 'player.fit.contain': 'Вписать', 'player.fit.cover': 'Заполнить', 'player.fitHint': 'Работает в полном экране: «Заполнить» убирает чёрные полосы, края видео могут обрезаться.' });

/* Раздел «Конспекты» */
Object.assign(SP.I18N.ru, {
  'nav.notes': 'Конспекты', 'nav.notesShort': 'Конспекты',
  'notes.sub': 'Лекции по предметам: конспект, вопросы с ответами и тесты',
  'notes.emptyTitle': 'Конспектов пока нет', 'notes.emptyText': 'Для вашей группы автор ещё не добавил конспекты. Проверьте группу в Настройках → Аккаунт.',
  'notes.continue': 'Продолжить: {where}', 'notes.start': 'Начать читать', 'notes.testsDone': 'тестов пройдено: {n}',
  'notes.ruOnly': 'Текст конспектов — на русском, как в исходных PDF.',
  'notes.loading': 'Загружаем конспект…', 'notes.loadError': 'Не удалось загрузить конспект. Проверьте интернет и обновите страницу.',
  'notes.toc': 'Оглавление', 'notes.pdf': 'Открыть PDF', 'notes.focus': 'На весь экран', 'notes.focusExit': 'Выйти из полного экрана',
  'notes.intro': 'О конспекте', 'notes.out': 'Пример работы программы',
  'notes.show': 'Показать ответ', 'notes.hide': 'Скрыть ответ', 'notes.showSol': 'Показать решение', 'notes.hideSol': 'Скрыть решение',
  'notes.showAll': 'Показать все ответы', 'notes.hideAll': 'Скрыть все ответы',
  'notes.task': 'Задача {n}', 'notes.toRef': 'К разделу {r}', 'notes.ownAnswer': 'В PDF ответа нет — он составлен по тексту этой лекции.',
  'notes.test': 'тест', 'notes.testTitle': 'Тест: {l}', 'notes.testN': '{n} вопросов', 'notes.testStart': 'Начать тест', 'notes.testAgain': 'Пройти ещё раз', 'notes.best': 'лучший результат {p}%',
  'notes.sec.text': 'Конспект'
});
Object.assign(SP.I18N.ru, {
  'notes.view': 'Вид конспекта', 'notes.view.pdf': 'Как в PDF', 'notes.view.text': 'Текстом',
  'notes.pdfError': 'Не удалось показать страницу PDF. Проверьте интернет или переключитесь на «Текстом».',
  'notes.plain': 'Простыми словами: что нужно сделать', 'notes.plainEx': 'Пример: что должно получиться'
});
Object.assign(SP.I18N.ru, { 'notes.qstyle': 'Оформление теста', 'notes.qstyle.paper': 'Белое, как PDF', 'notes.qstyle.site': 'Как на сайте' });
Object.assign(SP.I18N.ru, { 'notes.qview': 'Как показывать вопросы', 'notes.qview.list': 'Списком', 'notes.qview.one': 'По одному', 'notes.carN': '{i} из {n}', 'notes.tocHide': 'Скрыть оглавление', 'notes.tocShow': 'Показать оглавление', 'notes.plainEx': 'Твоя программа должна работать так' });
Object.assign(SP.I18N.ru, { 'notes.jump': 'К заданиям', 'notes.jumpTip': 'Перейти к следующим вопросам, задачам или тесту ниже' });

Object.assign(SP.I18N.ru, { 'notes.where': 'Где ответ в конспекте', 'notes.whereNone': 'Место в конспекте не найдено', 'notes.backToQ': 'К вопросу' });
Object.assign(SP.I18N.ru, { 'auth.device': 'Устройство', 'auth.dev.phone': 'Телефон', 'auth.dev.pc': 'Компьютер', 'auth.deviceHint': 'Определено само: {d}. От этого зависят размеры и вид расписания: на телефоне — Shokan «Неделя», на компьютере — Timetable.', 'settings.deviceHint': 'Определено само: {d}. При смене ставятся удобные размеры и вид расписания для этого устройства.', 'settings.deviceDone': 'Размеры и расписание настроены под устройство', 'auth.out': 'Выйти', 'auth.outTitle': 'Выйти на экран входа?', 'auth.outText': 'Откроется экран входа — можно выбрать другую группу или устройство. Тесты, оценки, папки и заметки останутся.', 'auth.outHint': '«Выйти» — вернуться на экран входа (например, если перепутали группу). «Сбросить профиль» — ещё и удалить имя, группу и оценки с этого устройства.' });
/* Новые конспекты: папка предмета и экран лекции */
Object.assign(SP.I18N.ru, {
  'sj.files': 'Файлы', 'sj.upload': 'Загрузить', 'sj.lectures': 'Лекции', 'sj.myNotes': 'Мои заметки',
  'sj.read': 'прочитано', 'sj.readPct': 'прочитано {p}%', 'sj.qs': 'вопросы {a}/{n}', 'sj.tasks': 'задачи {a}/{n}', 'sj.test': 'тест {p}%',
  'sj.start': 'Начать', 'sj.continue': 'Продолжить',
  'lx.tab.text': 'Текст', 'lx.tab.qs': 'Вопросы', 'lx.tab.tasks': 'Задачи', 'lx.tab.cards': 'Карточки', 'lx.tab.test': 'Тест',
  'lx.back': 'В папку предмета', 'lx.prevLec': 'Предыдущая лекция', 'lx.nextLec': 'Следующая лекция', 'lx.parts': 'Части лекции',
  'lx.lecOf': '{l} из {n}', 'lx.sum': 'Главное за 1 минуту',
  'lx.endQs': 'Дочитал? Ответь на вопросы — если не помнишь, «Где в лекции?» вернёт к нужному месту.',
  'lx.endTasks': 'Дочитал? Реши задачи — если застрял, «Где в лекции?» покажет раздел, где это объяснено.',
  'lx.nextTab': 'Дальше: {t}', 'lx.task': 'Задача', 'lx.q': 'Вопрос', 'lx.nOf': '{w} {i} из {n}',
  'lx.yourCode': 'Твой код · сохраняется сам', 'lx.codeReset': 'Сначала', 'lx.where': 'Где в лекции?',
  'lx.mSolved': 'Ты отметил: решил', 'lx.mKnew': 'Ты отметил: знал', 'lx.mAgain': 'Ты отметил: повторить',
  'lx.check': 'Сверить с решением', 'lx.hint': 'Подсказка', 'lx.gotIt': 'Получилось?', 'lx.knewIt': 'Знал ответ?',
  'lx.solved': 'Решил', 'lx.knew': 'Знал', 'lx.again': 'Повторить',
  'lx.swipeHint': 'Листай свайпом влево-вправо или стрелками ← →',
  'lx.cardsHint': 'Нажми на карточку — увидишь ответ. Незнакомые вернутся через пару карточек.',
  'lx.cardsDone': 'знаю / всего ответов', 'lx.again2': 'Ещё раз', 'lx.cardsStat': 'Знаю {y} · Не знаю {n}',
  'lx.flip': 'Перевернуть карточку', 'lx.tapFlip': 'Нажми, чтобы увидеть ответ', 'lx.answer': 'Ответ', 'lx.remember': 'Запомни', 'lx.dontKnow': 'Не знаю',
  'lx.backQ': 'Вернуться к вопросу {n}', 'lx.backTask': 'Вернуться к задаче {n}'
});Object.assign(SP.I18N.ru, { 'lx.zoom': 'Увеличенный фрагмент' });
Object.assign(SP.I18N.ru, { 'lx.hide': 'Скрыть' });
Object.assign(SP.I18N.ru, { 'sj.itemMeta': 'Файлов: {m} · тестов: {t}', 'sj.hasNotes': 'конспект', 'sj.konspekt': 'Конспект', 'sj.nLec': '{n} лекц.', 'sj.kProg': 'прочитано {r} из {n}', 'sj.kTests': 'тесты {a} из {n}' });

Object.assign(SP.I18N.ru, { 'jr.plLoad': 'Загрузить из Platonus', 'jr.plPick': 'Выбрать файл', 'jr.plAt': 'Из Platonus: {d}', 'jr.plHow': 'Как обновить?',
  'jr.plCur': 'Текущие оценки: {n}', 'jr.plDone': 'Оценки обновлены, предметов: {n}.', 'jr.plAdded': 'Новых карточек: {n}.',
  'jr.plBad': 'Это не файл оценок. Выберите файл, сохранённый кнопкой «Сохранить для StudyPlay».',
  'jr.plHowTitle': 'Оценки из Platonus',
  'jr.plHowHtml': '<p>Сайт не просит пароль от Platonus. Оценки забирает программа «Мои оценки» на вашем компьютере, а сюда вы загружаете готовый файл.</p>' +
    '<ol class="jr-steps"><li>Запустите программу «Мои оценки» и нажмите <b>«Получить оценки»</b>.</li><li>Нажмите <b>«Сохранить для StudyPlay»</b>. Файл сохранится на рабочий стол.</li>' +
    '<li>Здесь нажмите <b>«Загрузить из Platonus»</b> и выберите этот файл.</li></ol>' +
    '<p><b>На телефоне:</b> отправьте файл себе в Telegram («Избранное»), сохраните его на телефон и выберите здесь.</p>' +
    '<p class="small muted">РК 1, РК 2, экзамен и средняя текущая подставятся в карточки, текущие оценки с датами появятся под кольцами. Предметы, которых нет, добавятся. Файл хранит только оценки: логина и пароля в нём нет.</p>' });
Object.assign(SP.I18N.ru, { 'jr.plBadLink': 'Не удалось прочитать оценки из ссылки. Сохраните файл в программе и загрузите его кнопкой «Загрузить из Platonus».', 'jr.plOld': 'Этот браузер слишком старый для загрузки по ссылке. Обновите его или загрузите файл кнопкой «Загрузить из Platonus».' });
Object.assign(SP.I18N.ru, { 'jr.plRun': 'Обновить из Platonus', 'jr.plRunToast': 'Запускаю программу «Мои оценки». Когда она закроется, оценки появятся здесь. Если ничего не открылось — один раз запустите «Подключить к StudyPlay.bat» рядом с программой.',
  'jr.plClip': 'Разрешите сайту доступ к буферу обмена (значок в адресной строке) — так он получит оценки от программы.' });
Object.assign(SP.I18N.ru, { 'jr.plSetupTitle': 'Подключить оценки из Platonus', 'jr.plDownload': 'Скачать программу', 'jr.plRunGo': 'Уже подключено — обновить',
  'jr.plRunToast': 'Получаю оценки из Platonus… Через несколько секунд они появятся здесь.',
  'jr.plSetupHtml': '<p>Кнопка «Обновить из Platonus» запускает на вашем компьютере программу «Мои оценки». Она входит в Platonus и передаёт оценки сюда. Пароль хранится только у вас на компьютере в зашифрованном виде — сайт его не видит. Только для Windows.</p>' +
    '<p><b>Подключение (один раз):</b></p><ol class="jr-steps">' +
    '<li>Скачайте программу (кнопка ниже) и распакуйте архив в постоянную папку, например «Документы\\StudyPlay-оценки».</li>' +
    '<li>Дважды щёлкните <b>start.vbs</b>. Если Windows покажет «Windows защитила ваш компьютер» — «Подробнее» → «Выполнить в любом случае».</li>' +
    '<li>Введите логин и пароль от Platonus, отметьте <b>«Запомнить пароль»</b> и нажмите <b>«Получить оценки»</b> (если придёт код на почту — введите его). Закройте окно.</li>' +
    '<li>Дважды щёлкните <b>connect.bat</b> и нажмите любую клавишу.</li></ol>' +
    '<p><b>Дальше:</b> «Обновить из Platonus» → браузер спросит «Открыть приложение?» → «Открыть» (галочка «Всегда разрешать» уберёт этот вопрос). Через несколько секунд оценки появятся сами. Первый раз браузер попросит доступ к буферу обмена — разрешите.</p>' +
    '<p class="small muted">Отключить — disconnect.bat в той же папке. Подробности — README.txt в архиве. С телефона: в программе «Сохранить для StudyPlay», а здесь «Скачать» → «Загрузить файл оценок».</p>' });
Object.assign(SP.I18N.ru, { 'settings.plHide': 'Скрыть кнопки Platonus в «Оценках»', 'settings.plHideHint': 'Кнопки «Обновить из Platonus», настройка программы и «Загрузить из Platonus». Снимите галочку, чтобы они появились.' });
Object.assign(SP.I18N.ru, { 'jr.dl': 'Скачать', 'jr.dlCsv': 'Таблица (Excel)', 'jr.dlCsvHint': 'Все предметы: текущая, РК, рейтинг, экзамен, итоговая. Открывается в Excel и на телефоне — удобно скинуть в Telegram.',
  'jr.dlJson': 'Файл для StudyPlay', 'jr.dlJsonHint': 'Перенести оценки на другое устройство: там Оценки → Скачать → «Загрузить файл оценок».',
  'jr.jLoad': 'Загрузить файл оценок (с другого устройства)', 'jr.jDone': 'Оценки загружены, предметов: {n}.', 'jr.jBad': 'Это не файл оценок StudyPlay.', 'jr.csvMarks': 'Текущие оценки' });
Object.assign(SP.I18N.ru, { 'jr.csvSubject': 'Предмет' });

Object.assign(SP.I18N.ru, { 'settings.plAuto': 'Автообновление из Platonus', 'settings.min': 'мин',
  'settings.plAutoHint': 'Каждые N минут, пока сайт открыт, и сразу при открытии сайт сам нажимает «Обновить из Platonus». 0 — выключено. Чтобы браузер не спрашивал каждый раз, поставьте «Всегда разрешать» в окне «Открыть приложение?». Слишком часто не стоит: Platonus может временно заблокировать вход.' });
Object.assign(SP.I18N.ru, { 'jr.plBusy': 'Обновляю оценки из Platonus…' });

Object.assign(SP.I18N.ru, { 'jr.newOne': 'Новая оценка', 'jr.newMany': 'Новые оценки' });

Object.assign(SP.I18N.ru, { 'settings.plHideHint': 'Кнопка «Обновить из Platonus» и настройка программы. Снимите галочку, чтобы они появились.' });
Object.assign(SP.I18N.ru, { 'jr.more': 'Ещё' });

Object.assign(SP.I18N.ru, { 'jr.plCool': 'Откат: ещё {s} сек. Обновлять из Platonus можно не чаще раза в минуту — это защита от блокировки.' });
Object.assign(SP.I18N.ru, { 'jr.plNightTitle': 'Ночной перерыв Platonus', 'jr.plNightGo': 'Всё равно попробовать',
  'jr.plNightText': 'Platonus обычно не работает ночью — примерно с 23:00 до 7:00. Сейчас обновить оценки, скорее всего, не получится.',
  'settings.plAutoHint': 'Каждые N минут, пока сайт открыт, и сразу при открытии сайт сам нажимает «Обновить из Platonus». 0 — выключено, минимум 1 минута. Ночью (примерно 23:00–7:00) Platonus обычно не работает, поэтому в это время автообновление само делает перерыв. Чтобы браузер не спрашивал каждый раз, поставьте «Всегда разрешать» в окне «Открыть приложение?».' });
SP.I18N.ru['jr.plSetupHtml'] = SP.I18N.ru['jr.plSetupHtml'].replace('<p class="small muted">', '<p class="small"><b>Ночной перерыв:</b> Platonus обычно не работает примерно с 23:00 до 7:00 — в это время обновить оценки не получится, автообновление само ждёт утра.</p><p class="small muted">');
/* Расписание из Timetable через ту же программу «Мои оценки» */
Object.assign(SP.I18N.ru, { 'schedule.ttRun': 'Обновить расписание', 'schedule.link': 'Ссылка от преподавателя',
  'jr.ttRunToast': 'Получаю расписание из Timetable… Через несколько секунд оно обновится.',
  'jr.plQueued': 'Программа уже работает — это обновление запустится сразу после неё.',
  'jr.plBusy': 'Обновляю из Platonus / Timetable…',
  'jr.ttFirst': 'Расписание из Timetable загружено: {n} занятий в неделю. Ссылки преподавателей видны прямо в расписании.',
  'jr.ttNewLink': 'Новая ссылка в расписании', 'jr.ttNewLinks': 'Новые ссылки в расписании',
  'jr.ttChanged': 'Расписание в Timetable изменилось — обновлено.',
  'jr.ttOld': 'Чтобы обновлять расписание, обновите программу: скачайте её заново (шестерёнка в «Оценках» → «Программа «Мои оценки»»), замените файлы в своей папке и ещё раз запустите connect.bat. Оценки при этом обновились.',
  'jr.ttBad': 'Не получилось прочитать расписание из Timetable.',
  'settings.ttAuto': 'Автообновление расписания',
  'settings.ttAutoHint': 'Каждые N минут (и сразу при открытии сайта) программа берёт расписание и ссылки преподавателей из Timetable. 0 — только кнопкой «Обновить расписание» (в «Расписании» или в шестерёнке «Оценок»). Расписание меняется редко — хватит 60 минут или кнопки.',
  'jr.plSetupTitle': 'Программа «Мои оценки»: оценки + расписание',
  'jr.plSetupHtml': '<p>Программа «Мои оценки» работает на вашем компьютере и умеет два дела: <b>оценки</b> из Platonus («Обновить из Platonus») и <b>расписание со ссылками преподавателей</b> из Timetable («Обновить расписание»). Логин и пароль одни и те же, они хранятся только у вас на компьютере в зашифрованном виде — сайт их не видит. Только для Windows.</p>' +
    '<p><b>Подключение (один раз):</b></p><ol class="jr-steps">' +
    '<li>Скачайте программу (кнопка ниже) и распакуйте архив в постоянную папку, например «Документы\\StudyPlay-оценки». Если программа уже стоит — просто замените файлы в её папке.</li>' +
    '<li>Дважды щёлкните <b>start.vbs</b>. Если Windows покажет «Windows защитила ваш компьютер» — «Подробнее» → «Выполнить в любом случае».</li>' +
    '<li>Введите логин и пароль от Platonus, отметьте <b>«Запомнить пароль»</b> и нажмите <b>«Получить оценки»</b> (если придёт код на почту — введите его). Закройте окно.</li>' +
    '<li>Дважды щёлкните <b>connect.bat</b> и нажмите любую клавишу. После обновления программы запустите его ещё раз.</li></ol>' +
    '<p><b>Дальше:</b> нажимайте «Обновить из Platonus» или «Обновить расписание» → браузер спросит «Открыть приложение?» → «Открыть» (галочка «Всегда разрешать» уберёт этот вопрос). Через несколько секунд всё появится само. Первый раз браузер попросит доступ к буферу обмена — разрешите. Периодичность — в Настройках → Инструменты.</p>' +
    '<p class="small"><b>Ночной перерыв:</b> Platonus обычно не работает примерно с 23:00 до 7:00 — в это время обновить оценки не получится, автообновление само ждёт утра. Расписания это не касается.</p>' +
    '<p class="small"><b>Ссылки:</b> если преподаватель оставил ссылку в Timetable (поле «Мессенджер»), она появится под занятием в тот день, к которому её прикрепили.</p>' +
    '<p class="small muted">Отключить — disconnect.bat в той же папке. Подробности — README.txt в архиве. С телефона: в программе «Сохранить для StudyPlay», а здесь «Скачать» → «Загрузить файл оценок».</p>' });
Object.assign(SP.I18N.ru, { 'jr.ttCool': 'Откат: ещё {s} сек. Обновлять расписание можно не чаще раза в минуту.' });

/* программа одним окном */
Object.assign(SP.I18N.ru, {
  'jr.ttOld': 'Чтобы обновлять расписание, обновите программу: скачайте её заново (шестерёнка в «Оценках» → «Программа «Мои оценки»»), замените файлы в своей папке, откройте StudyPlay.vbs и нажмите «Обновить подключение». Оценки при этом обновились.',
  'jr.plSetupHtml': '<p>Программа работает на вашем компьютере и умеет два дела: <b>оценки</b> из Platonus и <b>расписание со ссылками преподавателей</b> из Timetable. Пароль хранится только у вас на компьютере в зашифрованном виде — сайт его не видит. Только для Windows.</p>' +
    '<p><b>Подключение (один раз):</b></p><ol class="jr-steps">' +
    '<li>Скачайте программу (кнопка ниже) и распакуйте в постоянную папку, например «Документы\\StudyPlay». Если программа уже стоит — замените файлы в её папке.</li>' +
    '<li>Дважды щёлкните <b>StudyPlay.vbs</b>. Если Windows покажет «Windows защитила ваш компьютер» — «Подробнее» → «Выполнить в любом случае».</li>' +
    '<li>В окне: логин и пароль от Platonus, галочка <b>«Запомнить пароль»</b>. Если в Timetable пароль другой — снимите галочку «В Timetable тот же логин и пароль» и введите его. Нажмите <b>«Получить всё»</b> (если придёт код на почту — введите его).</li>' +
    '<li>Там же нажмите <b>«Подключить»</b> (или «Обновить подключение») — кнопки на сайте заработают во всех браузерах. По желанию — «Ярлык на рабочий стол».</li></ol>' +
    '<p><b>Дальше:</b> «Обновить из Platonus» берёт только оценки, «Обновить расписание» — только расписание со ссылками. Браузер спросит «Открыть приложение?» → «Открыть» (галочка «Всегда разрешать» уберёт вопрос). Первый раз браузер попросит доступ к буферу обмена — разрешите. Как часто обновлять — Настройки → Инструменты.</p>' +
    '<p class="small"><b>Ночной перерыв:</b> Platonus обычно не работает примерно с 23:00 до 7:00 — оценки в это время не обновятся, автообновление само ждёт утра. Расписания это не касается.</p>' +
    '<p class="small"><b>Ссылки:</b> если преподаватель оставил ссылку в Timetable (поле «Мессенджер»), она появится под занятием в тот день, к которому её прикрепили. В окне программы все ссылки есть на вкладке «Ссылки преподавателей».</p>' +
    '<p class="small muted">Без кнопок и с телефона: в программе «Получить всё» → «Файл для StudyPlay», а здесь «Скачать» → «Загрузить файл оценок» — придут и оценки, и расписание со ссылками. Отключить кнопки — в окне программы «Отключить».</p>' });
Object.assign(SP.I18N.ru, { 'jr.plBad': 'Это не файл оценок. Выберите файл, сохранённый в программе кнопкой «Файл для StudyPlay».' });
Object.assign(SP.I18N.ru, { 'schedule.weekOf2': '{n}-я неделя из {t}', 'schedule.weekN': '{n}-я неделя семестра' });

/* StudyPlay на телефоне */
Object.assign(SP.I18N.ru, {
  'app.credsTitle': 'Вход на этом телефоне', 'app.credsHint': 'Логин и пароль от Platonus (и Timetable). Хранятся только в защищённом хранилище телефона.',
  'app.credsText': 'Приложение само входит в Platonus и Timetable. Логин и пароль хранятся только на этом телефоне в защищённом хранилище.',
  'app.login': 'Логин Platonus', 'app.password': 'Пароль', 'app.same': 'В Timetable тот же логин и пароль', 'app.ttLogin': 'Логин Timetable', 'app.ttPassword': 'Пароль Timetable',
  'app.runToast': 'Получаю оценки из Platonus… Через несколько секунд они появятся здесь.',
  'app.fail': 'Не получилось. Проверьте интернет и попробуйте ещё раз.',
  'app.notify': 'Уведомления о новых оценках', 'app.notifyHint': 'Примерно раз в полчаса приложение тихо проверяет Platonus (даже закрытое) и присылает уведомление, если появилась новая оценка. Ночью (23:00–7:00) не проверяет.',
  'app.phoneTitle': 'StudyPlay на телефоне', 'app.apk': 'Скачать для Android (APK)', 'app.iosCopy': 'Скопировать скрипт для iPhone', 'app.iosFile': 'Файл скрипта',
  'app.phoneHtml': '<p><b>Android — приложение StudyPlay.</b> Внутри тот же сайт (меняется вместе с ним), но приложение само берёт оценки из Platonus и расписание со ссылками из Timetable — без компьютера — и присылает уведомления о новых оценках, даже когда закрыто.</p>' +
    '<ol class="jr-steps"><li>Нажмите «Скачать для Android» на телефоне, откройте файл и разрешите установку из этого источника → «Установить».</li>' +
    '<li>В приложении: Настройки → Инструменты → снимите галочку «Скрыть кнопки Platonus» → «Вход на этом телефоне» → логин и пароль.</li>' +
    '<li>Там же — как часто обновлять оценки и расписание, и «Уведомления о новых оценках».</li></ol>' +
    '<p><b>iPhone и iPad — через бесплатное приложение Scriptable.</b> Своё приложение для iPhone без платного аккаунта Apple не установить, поэтому работает небольшой скрипт; всю логику он каждый раз берёт с сайта.</p>' +
    '<ol class="jr-steps"><li>Установите <b>Scriptable</b> из App Store (бесплатно).</li>' +
    '<li>Откройте этот сайт на iPhone → «Скопировать скрипт для iPhone».</li>' +
    '<li>Scriptable → «+» → вставьте текст → назовите скрипт <b>StudyPlay</b>.</li>' +
    '<li>Нажмите ▶: скрипт спросит логин и пароль (хранятся в связке ключей iPhone), получит оценки и расписание и откроет StudyPlay в Safari.</li>' +
    '<li>Автообновление: приложение «Команды» → «Автоматизация» → «Время суток» (например 8:00, 14:00, 20:00) → действие Scriptable «Run Script» → StudyPlay → «Запускать сразу». Появилась новая оценка — придёт уведомление; нажмите на него, и StudyPlay откроется с новыми данными.</li></ol>' +
    '<p class="small muted">Пароль хранится только на телефоне и уходит только в Platonus и Timetable. Сменить его: Android — «Вход на этом телефоне»; iPhone — запустите скрипт с параметром setup или удалите и добавьте скрипт заново.</p>' });
SP.I18N.ru['app.phoneHtml'] = SP.I18N.ru['app.phoneHtml'].replace('iPhone — запустите скрипт с параметром setup или удалите и добавьте скрипт заново.', 'iPhone — если вход не удастся, скрипт при запуске ▶ сам предложит ввести новый.');
Object.assign(SP.I18N.ru, { 'app.iosRun': 'Открываю Scriptable… Через несколько секунд он вернёт вас сюда с новыми данными.', 'app.iosReady': 'Скрипт уже стоит — обновить' });
SP.I18N.ru['app.phoneHtml'] = SP.I18N.ru['app.phoneHtml'].replace('<li>Автообновление: приложение «Команды»', '<li><b>Обновлять прямо с сайта:</b> в Safari на этом сайте кнопки «Обновить из Platonus» и «Обновить расписание» сами запускают скрипт в Scriptable, и через несколько секунд он возвращает вас сюда с новыми данными.</li><li>Автообновление: приложение «Команды»');
SP.I18N.ru['app.phoneHtml'] = SP.I18N.ru['app.phoneHtml'].replace('возвращает вас сюда с новыми данными.</li>', 'возвращает вас сюда с новыми данными — в тот же браузер, где вы нажали (Safari, Chrome, Firefox, Edge или Яндекс).</li>');
Object.assign(SP.I18N.ru, { 'app.paste': 'Вставить обновление', 'app.pasteHint': 'Scriptable скопировал новые данные — вставьте их сюда.', 'app.pasteNone': 'В буфере обмена нет данных StudyPlay. Нажмите «Обновить» ещё раз и дождитесь, пока Scriptable скажет «Готово».' });
SP.I18N.ru['app.phoneHtml'] = SP.I18N.ru['app.phoneHtml'].replace('<li>Автообновление: приложение «Команды»', '<li><b>Значок на экране «Домой»:</b> в Safari «Поделиться» → «На экран «Домой»». StudyPlay откроется отдельным приложением. У него своя память, поэтому после обновления Scriptable скажет «Готово» — вернитесь кнопкой «◀ StudyPlay» в левом верхнем углу и нажмите «Вставить обновление».</li><li>Автообновление: приложение «Команды»');

/* мастер автообновления */
Object.assign(SP.I18N.ru, {
  'jr.plRun': 'Обновить оценки',
  'setup.title': 'Автообновление оценок и расписания',
  'setup.intro': 'StudyPlay может сам брать ваши оценки из Platonus и расписание со ссылками преподавателей из Timetable — не нужно вводить их вручную. Настроим это на этом устройстве (2–3 минуты). Пароль хранится только у вас и никуда, кроме Platonus и Timetable, не отправляется.',
  'setup.skip': 'Пропустить, настрою потом',
  'setup.doneCheck': 'Готово — проверить',
  'setup.saveCheck': 'Сохранить и проверить',
  'setup.win': '<p><b>Вы на компьютере с Windows.</b> Оценки и расписание берёт небольшая программа на этом компьютере.</p><ol class="jr-steps">' +
    '<li>Нажмите <b>«Скачать программу»</b> ниже.</li>' +
    '<li>Откройте скачанный архив и перетащите папку в постоянное место, например в «Документы». Из архива не запускайте.</li>' +
    '<li>В папке дважды щёлкните <b>StudyPlay.vbs</b>. Если Windows скажет «Windows защитила ваш компьютер» — «Подробнее» → «Выполнить в любом случае».</li>' +
    '<li>В окне программы введите логин и пароль от Platonus, отметьте <b>«Запомнить пароль»</b>. Если в Timetable пароль другой — снимите галочку «В Timetable тот же…» и введите его.</li>' +
    '<li>Там же нажмите <b>«Подключить»</b> (рядом с «Кнопки на сайте»). Окно программы можно закрыть.</li>' +
    '<li>Вернитесь сюда и нажмите <b>«Готово — проверить»</b>. Браузер спросит «Открыть приложение?» — нажмите «Открыть» и поставьте «Всегда разрешать». Через несколько секунд появятся оценки.</li></ol>' +
    '<p class="small muted">Дальше: в «Оценках» кнопка «Обновить оценки», в «Расписании» — «Обновить расписание». Как часто обновлять само — Настройки → Автообновление. Ночью (23:00–7:00) Platonus не работает.</p>',
  'setup.app': '<p><b>Вы в приложении StudyPlay для Android.</b> Приложение само заходит в Platonus и Timetable — достаточно один раз ввести логин и пароль.</p>' +
    '<p class="small muted">Включите уведомления — и приложение примерно раз в полчаса будет проверять оценки и сообщать о новых, даже когда оно закрыто.</p>',
  'setup.ios': '<p><b>Вы на iPhone или iPad.</b> Здесь оценки берёт бесплатное приложение Scriptable с небольшим скриптом StudyPlay.</p><ol class="jr-steps">' +
    '<li>Установите <b>Scriptable</b> из App Store (бесплатно).</li>' +
    '<li>Нажмите <b>«Скопировать скрипт для iPhone»</b> ниже.</li>' +
    '<li>Откройте Scriptable → нажмите <b>«+»</b> справа вверху → вставьте текст → назовите скрипт ровно <b>StudyPlay</b> → «Готово».</li>' +
    '<li>Вернитесь сюда и нажмите <b>«Готово — проверить»</b>. Откроется Scriptable, спросит логин и пароль от Platonus (хранятся в связке ключей iPhone) и вернёт вас сюда с оценками.</li></ol>' +
    '<p class="small muted">Совет: в Safari «Поделиться» → «На экран «Домой»» — StudyPlay будет открываться как приложение. Тогда после обновления вернитесь кнопкой «◀ StudyPlay» в левом верхнем углу и нажмите «Вставить обновление». Проверка оценок по расписанию с уведомлением: «Команды» → «Автоматизация» → «Время суток» → Scriptable «Run Script» → StudyPlay.</p>',
  'setup.android': '<p><b>Вы на Android через браузер.</b> Браузер не может сам заходить в Platonus, поэтому для автообновления нужно приложение StudyPlay. Внутри — этот же сайт, но оценки и расписание обновляются сами, и приходят уведомления о новых оценках.</p><ol class="jr-steps">' +
    '<li>Нажмите <b>«Скачать для Android»</b> ниже.</li>' +
    '<li>Откройте скачанный файл StudyPlay.apk. Телефон скажет, что установка из этого источника запрещена — нажмите «Настройки» → «Разрешить из этого источника» → назад.</li>' +
    '<li>Нажмите «Установить». Если Play Защита спросит — «Установить всё равно».</li>' +
    '<li>Откройте приложение StudyPlay — оно само предложит ввести логин и пароль.</li></ol>' +
    '<p class="small muted">Не хотите ставить приложение — оценки можно вводить вручную в «Оценках».</p>',
  'setup.other': '<p>На этом устройстве автообновление пока недоступно: оно работает на компьютере с Windows, в приложении StudyPlay для Android и на iPhone. Оценки здесь можно вводить вручную в «Оценках».</p>',
  'settings.setupTitle': 'Автообновление оценок и расписания',
  'settings.setupHint': 'Пошаговая настройка для этого устройства: компьютер, Android или iPhone.',
  'settings.plShow': 'Кнопки «Обновить оценки» и «Обновить расписание»',
  'settings.plShowHint': 'Включаются сами после настройки. Если пропустили настройку — включите здесь.',
  'settings.setupBtn': 'Настроить',
  'app.phoneRow': 'StudyPlay на телефоне',
  'app.phoneRowHint': 'Как поставить на Android и iPhone — если хотите отправить инструкцию на телефон.'
});

/* новые названия кнопок и мастер настройки вместо шестерёнки */
['jr.plSetupHtml', 'settings.plAutoHint', 'settings.ttAutoHint', 'app.phoneHtml', 'jr.plNightText'].forEach(function (k) {
  if (SP.I18N.ru[k]) SP.I18N.ru[k] = SP.I18N.ru[k].split('«Обновить из Platonus»').join('«Обновить оценки»').split(' (в «Расписании» или в шестерёнке «Оценок»)').join(' (в «Расписании»)').split('Настройки → Инструменты').join('Настройки → Инструменты → Автообновление');
});
SP.I18N.ru['app.phoneHtml'] = SP.I18N.ru['app.phoneHtml'].replace('В приложении: Настройки → Инструменты → Автообновление → снимите галочку «Скрыть кнопки Platonus» → «Вход на этом телефоне» → логин и пароль.', 'Откройте приложение — оно само покажет настройку: введите логин и пароль от Platonus.');
Object.assign(SP.I18N.ru, {
  'jr.ttOld': 'Чтобы обновлять расписание, обновите программу: Настройки → Инструменты → «Автообновление оценок и расписания» → «Настроить» → «Скачать программу», замените файлы в своей папке, откройте StudyPlay.vbs и нажмите «Обновить подключение». Оценки при этом обновились.'
});Object.assign(SP.I18N.ru, { 'app.shareTitle': 'Сохранить или открыть файл' });

/* раздел «Оценки и расписание», вопрос о частоте */
Object.assign(SP.I18N.ru, {
  'settings.sync': 'Оценки и расписание',
  'setup.autoTitle': 'Как часто обновлять автоматически?',
  'setup.autoText': 'Всё работает! Выберите, как часто StudyPlay будет сам брать новые оценки и расписание. Потом это можно поменять в Настройках → «Оценки и расписание».',
  'setup.autoGrades': 'Оценки', 'setup.autoTt': 'Расписание и ссылки преподавателей',
  'setup.never': 'Не обновлять само', 'setup.byButton': 'Только кнопкой', 'setup.m15': '15 мин', 'setup.m30': '30 мин', 'setup.h1': '1 час', 'setup.h3': '3 часа', 'setup.h6': '6 часов', 'setup.day': 'Раз в день',
  'setup.autoNotePc': 'Обновляется, пока сайт открыт, и сразу при открытии. Ночью (23:00–7:00) Platonus не работает — оценки в это время не обновляются.',
  'setup.autoNoteApp': 'Пока приложение открыто — по этому выбору. А закрытое приложение примерно раз в полчаса тихо проверяет оценки и присылает уведомление о новых. Ночью (23:00–7:00) Platonus не работает.'
});
['setup.win', 'settings.plAutoHint', 'settings.ttAutoHint', 'app.phoneHtml', 'jr.ttOld', 'settings.plShowHint', 'jr.plSetupHtml'].forEach(function (k) {
  if (SP.I18N.ru[k]) SP.I18N.ru[k] = SP.I18N.ru[k].split('Настройки → Инструменты → «Автообновление оценок и расписания»').join('Настройки → «Оценки и расписание»')
    .split('Настройки → Инструменты → Автообновление').join('Настройки → «Оценки и расписание»').split('Настройки → Автообновление').join('Настройки → «Оценки и расписание»').split('Настройки → Инструменты').join('Настройки → «Оценки и расписание»');
});
Object.assign(SP.I18N.ru, { 'settings.plAuto': 'Автообновление оценок' });

/* мои конспекты */
Object.assign(SP.I18N.ru, {
  'mn.addBtn': 'Добавить конспект', 'mn.importBtn': 'Загрузить файл', 'mn.editBtn': 'Изменить', 'mn.moreLec': 'Добавить лекции', 'mn.download': 'Скачать файл', 'mn.forSite': 'Для сайта',
  'mn.mineBadge': 'Мой конспект', 'mn.my': 'мой конспект', 'mn.noSubject': 'Без предмета',
  'mn.empty': 'Здесь пока нет конспекта. Нажмите «Добавить конспект»: сайт даст готовый промт для ИИ (подойдёт бесплатный ChatGPT, Gemini, DeepSeek), вы вставите ответ — и получится конспект как в StudyPlay: главное за 1 минуту, текст, термины, вопросы с ответами, карточки и тест.',
  'mn.addTitle': 'Добавить конспект',
  'mn.s1': 'Скопируйте промт и отправьте его ИИ',
  'mn.s1Text': 'Подойдут бесплатные ChatGPT, Gemini, DeepSeek, Qwen, Copilot. Вставьте промт в чат и приложите лекцию: PDF, фото слайдов или текст лекции сразу после промта. Можно одну лекцию или несколько.',
  'mn.format': 'Формат', 'mn.fmtText': 'Текст (советуем)', 'mn.copyPrompt': 'Скопировать промт', 'mn.showPrompt': 'Показать', 'mn.copied': 'Промт скопирован — вставьте его в чат с ИИ',
  'mn.tipsT': 'Советы, чтобы получилось хорошо',
  'mn.tipsHtml': '<ul class="small"><li><b>Формат «Текст»</b> бесплатные ИИ почти никогда не ломают. JSON — для тех, кому удобнее; если он оборвался или с ошибкой, лучше попросить в формате «Текст».</li>' +
    '<li><b>Большой курс</b> — по 1–2 лекции за раз. Если ответ оборвался («ПРОДОЛЖЕНИЕ СЛЕДУЕТ»), напишите ИИ «дальше» и вставьте продолжение сразу под первым ответом в поле ниже.</li>' +
    '<li><b>Копируйте ответ целиком</b> — кнопкой «Копировать» под ответом ИИ. Лишние фразы вроде «Вот ваш конспект» сайт уберёт сам.</li>' +
    '<li><b>Картинки</b> ИИ не рисует: на их месте будет «Здесь картинка: …». Нажмите «Изменить» у конспекта и вставьте нужное фото или слайд.</li>' +
    '<li>Ответ можно поправить вручную — в редакторе есть кнопки-заготовки и подсказка по разметке.</li></ul>',
  'mn.s2': 'Вставьте ответ ИИ', 'mn.s2Text': 'Скопируйте весь ответ и вставьте сюда (или загрузите файл .txt / .md / .json). Ниже сразу видно, что получилось.',
  'mn.srcPh': '## Лекция 1. …\n### Главное\n- …', 'mn.fromFile': 'Из файла', 'mn.paste': 'Вставить из буфера', 'mn.pasteHand': 'Вставьте в поле вручную: долгое нажатие → «Вставить» (или Ctrl+V)',
  'mn.waiting': 'Здесь появится проверка: сколько лекций, вопросов, тестов получилось.',
  'mn.sLec': 'Лекций', 'mn.sQs': 'Вопросов', 'mn.sTasks': 'Задач', 'mn.sCards': 'Карточек', 'mn.sTest': 'Вопросов теста', 'mn.sTerms': 'Терминов', 'mn.sSchemes': 'Схем', 'mn.sFormulas': 'Формул', 'mn.sImgs': 'Картинок',
  'mn.imgsNeed': 'Мест под картинки: {n}. Их можно добавить после сохранения: «Изменить» → «Выбрать картинку».',
  'mn.warnN': 'Замечания: {n} — конспект сохранится, но лучше поправить', 'mn.fixFirst': 'Сначала вставьте ответ ИИ — сейчас он не читается (см. сообщение)',
  'mn.s3': 'Сохраните', 'mn.title': 'Название конспекта', 'mn.titlePh': 'например: Философия — РК1', 'mn.subject': 'Предмет (папка)', 'mn.otherSubj': 'Другой (как в ответе ИИ)',
  'mn.where': 'Куда сохранить', 'mn.asNew': 'Новый конспект', 'mn.appendTo': 'Дописать лекции в «{t}»', 'mn.saveOpen': 'Сохранить и открыть',
  'mn.saved': 'Конспект сохранён на этом устройстве', 'mn.appended': 'Лекции добавлены: {n}', 'mn.imgsLater': 'Не забудьте картинки ({n}): «Конспект» в папке → «Изменить».',
  'mn.imported': 'Конспект «{t}» загружен', 'mn.gone': 'Конспект не найден на этом устройстве',
  'mn.editTitle': 'Редактор конспекта', 'mn.tools': 'Вставить',
  'mn.snip.lec': 'Лекция', 'mn.snip.sub': 'Подзаголовок', 'mn.snip.mem': 'Запомни', 'mn.snip.table': 'Таблица', 'mn.snip.scheme': 'Схема', 'mn.snip.formula': 'Формула', 'mn.snip.code': 'Код',
  'mn.snip.q': 'Вопрос', 'mn.snip.task': 'Задача', 'mn.snip.card': 'Карточка', 'mn.snip.test': 'Вопрос теста', 'mn.snip.img': 'Картинка',
  'mn.phTitle': 'Нужно вставить картинки:', 'mn.pickImg': 'Выбрать картинку', 'mn.imgBad': 'Не получилось открыть картинку',
  'mn.delTitle': 'Удалить конспект?', 'mn.delText': '«{t}» удалится с этого устройства вместе с отметками прогресса. Если он нужен — сначала «Скачать файл».', 'mn.deleted': 'Конспект удалён',
  'mn.cheatT': 'Подсказка по разметке',
  'mn.cheatHtml': '<div class="small mn-cheat"><p><code>## Лекция 1. Название</code> — новая лекция. Разделы: <code>### Главное</code>, <code>### Конспект</code>, <code>### Термины</code>, <code>### Вопросы</code>, <code>### Задачи</code>, <code>### Карточки</code>, <code>### Тест</code>.</p>' +
    '<p><code>#### Подзаголовок</code> — часть текста (попадает в оглавление). <code>**жирный**</code>, <code>*курсив*</code>, <code>- список</code>, <code>1. список</code>, <code>| таблица |</code>, <code>&gt; Запомни: …</code> (а также Важно, Пример, Ловушка).</p>' +
    '<p>Вопрос: <code>? вопрос</code>, ответ: <code>= ответ</code>, место в лекции: <code>@ Где: подзаголовок</code>. Задача: <code>?? 1.1 название</code>, решение: <code>== решение</code>. Карточка: <code>термин — ответ</code>. Тест: <code>1. вопрос</code>, <code>+ верный</code>, <code>- неверный</code>.</p>' +
    '<p>Формула: <code>$a^2$</code> в строке или <code>$$ … $$</code> отдельно. Схема: блок <code>```mermaid</code>. Код: <code>```cpp</code>. Картинка: кнопка «Картинка» или место <code>[[КАРТИНКА: что вставить]]</code>.</p></div>',
  'mn.authorTitle': 'Выложить конспект для всей группы',
  'mn.authorHtml': '<p>Скачались два файла. Чтобы конспект появился у всей группы:</p><ol class="jr-steps"><li>Положите оба файла в папку <code>{dir}</code> репозитория сайта.</li><li>В файл <code>index.json</code> той же папки добавьте в список <code>"notes"</code> строку ниже (через запятую).</li><li>Залейте изменения на GitHub — через минуту конспект появится у всех.</li></ol>',
  'mn.imgHere': 'Здесь картинка:', 'mn.mmBad': 'Схема с ошибкой — показана текстом. Поправьте её в редакторе.'
});

/* анкета и «Доработать» */
Object.assign(SP.I18N.ru, {
  'mn.s1': 'Ответьте на пару вопросов и скопируйте промт',
  'mn.s1Text': 'По ответам сайт сам соберёт подробный промт для ИИ. Потом вставьте его в бесплатный ChatGPT, Gemini, DeepSeek, Qwen или Copilot и приложите лекцию (PDF, фото слайдов или текст).',
  'mn.q.subject': 'Предмет', 'mn.q.subjectPh': 'например: Философия',
  'mn.q.goal': 'К чему готовитесь', 'mn.goal.rk1': 'РК1', 'mn.goal.rk2': 'РК2', 'mn.goal.exam': 'Экзамен', 'mn.goal.study': 'Просто учить',
  'mn.q.depth': 'Как подробно', 'mn.q.depthHint': 'Кратко — только для сдачи; подробно — всё с примерами',
  'mn.depth.short': 'Кратко', 'mn.depth.medium': 'Средне', 'mn.depth.full': 'Подробно',
  'mn.q.want': 'Что ещё сделать', 'mn.q.wantHint': 'Главное, текст и термины будут всегда',
  'mn.want.qs': 'Вопросы с ответами', 'mn.want.test': 'Тест', 'mn.want.cards': 'Карточки',
  'mn.q.tasks': 'Задачи с решением', 'mn.q.tasksHint': 'Для математики, программирования, экономики',
  'mn.tasks.auto': 'Пусть ИИ решит', 'mn.tasks.yes': 'Нужны', 'mn.tasks.no': 'Не нужны',
  'mn.q.testSrc': 'Тест — чей', 'mn.src.ai': 'Составит ИИ', 'mn.src.mine': 'Мои тесты', 'mn.src.mine2': 'Мои тесты', 'mn.src.both': 'Мои + ИИ',
  'mn.bankPh': 'Вставьте сюда свою базу тестов (например, «база 500») в любом виде — ИИ разложит вопросы по лекциям',
  'mn.bankHint': 'Как отмечены верные ответы — неважно: звёздочка, «+», жирный, ключ ответов, «всегда первый» — ИИ разберётся.',
  'mn.bankBig': 'База большая — бесплатный ИИ может не принять всё сразу. Лучше вставлять по частям: одна тема (лекция) за раз.',
  'mn.bankEmpty': 'Вставьте свою базу тестов в поле под «Тест — чей» — или выберите «Составит ИИ»',
  'mn.q.split': 'Как разбить', 'mn.q.splitHint': 'По лекциям — как в материале; по темам — ИИ сам сгруппирует',
  'mn.split.auto': 'Пусть ИИ решит', 'mn.split.lectures': 'По лекциям', 'mn.split.topics': 'По темам',
  'mn.q.lang': 'Язык конспекта', 'mn.lang.auto': 'Как в материале', 'mn.lang.ru': 'Русский', 'mn.lang.kk': 'Қазақша',
  'mn.q.fmt': 'Формат ответа', 'mn.fmtJson': 'JSON',
  'mn.fmtTextNote': 'Текст — простая разметка: бесплатные ИИ почти не ошибаются, ответ можно читать и поправить руками, а если он оборвался — написать ИИ «дальше» и вставить продолжение ниже. Советуем.',
  'mn.fmtJsonNote': 'JSON — строгий машинный формат: удобен для сильных ИИ и коротких лекций, но одна ошибка или обрыв ломает весь ответ, а продолжить его нельзя — большие курсы только по одной лекции.',
  'mn.tipsT': 'Советы, чтобы получилось хорошо',
  'mn.tipsText': '<ul class="small"><li><b>По 1–2 лекции за раз.</b> Чем меньше кусок, тем подробнее и точнее конспект. Следующую — в том же чате: «Теперь лекция 3».</li>' +
    '<li><b>Ответ оборвался</b> (последняя строка «ПРОДОЛЖЕНИЕ СЛЕДУЕТ» или текст на полуслове) — напишите ИИ «дальше» и вставьте продолжение сразу под первым ответом в поле ниже.</li>' +
    '<li><b>Копируйте кнопкой «Копировать»</b> под ответом ИИ — так сохранится разметка. Лишние фразы вроде «Вот ваш конспект» сайт уберёт сам.</li>' +
    '<li><b>Чего-то мало</b> — после проверки появятся кнопки «Доработать»: короткий промт в тот же чат, ответ вставьте ниже — сайт сам допишет его в нужную лекцию.</li>' +
    '<li><b>Лучше всего получается</b> у ChatGPT и Gemini; DeepSeek и Qwen тоже хорошо, но иногда короче.</li></ul>',
  'mn.tipsJson': '<ul class="small"><li><b>Одна лекция — один ответ.</b> Следующую просите словом «следующая» — ИИ пришлёт новый JSON, вставьте его ниже, под предыдущим.</li>' +
    '<li><b>Если сайт пишет «JSON с ошибкой» или «оборвался»</b> — не пишите «продолжи», а попросите: «Пришли этот JSON заново целиком, без ошибок». Или переключитесь на формат «Текст».</li>' +
    '<li><b>Копируйте блок кода целиком</b> кнопкой «Копировать» в углу блока.</li>' +
    '<li><b>Чего-то мало</b> — кнопки «Доработать» дадут промт; ответ (новый JSON) вставьте ниже — сайт объединит.</li>' +
    '<li>JSON лучше держат ChatGPT и Gemini. Если ИИ путается — переключитесь на «Текст».</li></ul>',
  'mn.impTitle': 'Можно доработать', 'mn.impGood': 'Получилось хорошо! Если хотите — можно улучшить',
  'mn.impCopy': 'Скопировать промт', 'mn.impCopied': 'Скопировано — отправьте в тот же чат с ИИ, а его ответ вставьте сюда же, ниже прошлого',
  'mn.impHow': 'Ответ ИИ на доработку вставляйте в то же поле, ниже — сайт сам допишет его в нужную лекцию и уберёт повторы.',
  'mn.imp.test': 'мало вопросов теста ({n})', 'mn.imp.qs': 'мало вопросов с ответами ({n})', 'mn.imp.where': 'у {n} вопросов не указано «Где в лекции»',
  'mn.imp.cards': 'мало карточек ({n})', 'mn.imp.tasks': 'нет задач', 'mn.imp.sum': 'нет «Главного»', 'mn.imp.text': 'текст лекции слишком короткий',
  'mn.imp.all': 'Попросить ИИ проверить весь конспект и прислать исправленный'
});

/* конструктор конспекта по шагам */
Object.assign(SP.I18N.ru, {
  'mn.moreLec': 'Дополнить', 'mn.addTitle': 'Добавить конспект',
  'mn.empty': 'Здесь пока нет конспекта. Нажмите «Добавить конспект» — сайт проведёт по шагам: сначала ИИ делает сам конспект, потом по желанию вопросы, тест, карточки и задачи. Подойдёт бесплатный ChatGPT, Gemini или DeepSeek.',
  'mn.bTitle': 'Новый конспект — по шагам', 'mn.bTitleMore': 'Дополнить конспект', 'mn.bSteps': 'Шаги', 'mn.bSave': 'Сохранить конспект',
  'mn.step.konspekt': 'Конспект', 'mn.step.qs': 'Вопросы', 'mn.step.test': 'Тест', 'mn.step.cards': 'Карточки', 'mn.step.tasks': 'Задачи',
  'mn.bLecN': 'лекций: {n}', 'mn.bItemsN': 'готово: {n}', 'mn.bNeed': 'начните отсюда', 'mn.bOpt': 'по желанию',
  'mn.bHowMany': 'Сколько', 'mn.bPerLec': 'на каждую лекцию',
  'mn.bText.konspekt': 'Скопируйте промт, вставьте его в чат с ИИ (ChatGPT, Gemini, DeepSeek — бесплатно) и приложите лекцию: PDF, фото слайдов или текст. На этом шаге ИИ делает только сам конспект — так он получается подробнее и красивее.',
  'mn.bText.qs': 'Вопросы с ответами, как на экзамене, — у каждого ссылка «Где в лекции». Отправьте промт в тот же чат, где ИИ делал конспект.',
  'mn.bText.test': 'Тест с вариантами: правильно или нет — видно сразу после ответа. Можно взять свою базу тестов — ИИ разложит её по лекциям.',
  'mn.bText.cards': 'Карточки «вопрос — ответ» для быстрого повторения.',
  'mn.bText.tasks': 'Задачи с решением по шагам — для математики, программирования, экономики.',
  'mn.bCopy1': 'Скопировать промт', 'mn.bCopyN': 'Скопировать промт',
  'mn.bNewChat': 'Это новый чат — добавить конспект в промт',
  'mn.bPaste': 'Ответ ИИ', 'mn.bPastePh.konspekt': 'Вставьте сюда весь ответ ИИ…\n\n## Лекция 1. …\n### Главное\n- …',
  'mn.bPastePh.qs': 'Вставьте ответ ИИ…\n\n## Лекция 1. …\n### Вопросы\n? …\n= …', 'mn.bPastePh.test': 'Вставьте ответ ИИ…\n\n## Лекция 1. …\n### Тест\n1. …\n+ …\n- …',
  'mn.bPastePh.cards': 'Вставьте ответ ИИ…\n\n## Лекция 1. …\n### Карточки\nТермин — ответ', 'mn.bPastePh.tasks': 'Вставьте ответ ИИ…\n\n## Лекция 1. …\n### Задачи\n?? 1.1 …\n== …',
  'mn.bAdd': 'Добавить в конспект', 'mn.bAddMore': 'Добавить ещё лекции',
  'mn.bCopied1': 'Промт скопирован — вставьте его в чат с ИИ и приложите лекцию', 'mn.bCopiedN': 'Промт скопирован — отправьте его в тот же чат с ИИ',
  'mn.bBad': 'Не получилось прочитать ответ. Скопируйте его целиком кнопкой «Копировать» под ответом ИИ.',
  'mn.bNone.konspekt': 'В ответе не видно конспекта лекций (строк «## Лекция …» и текста). Проверьте, что скопирован весь ответ.',
  'mn.bNone.qs': 'В ответе не видно вопросов (строк «? вопрос» и «= ответ»).', 'mn.bNone.test': 'В ответе не видно теста (строк «1. вопрос», «+ верный», «- неверный»).',
  'mn.bNone.cards': 'В ответе не видно карточек (строк «термин — ответ» под «### Карточки»).', 'mn.bNone.tasks': 'В ответе не видно задач (строк «?? 1.1 …» и «== решение»).',
  'mn.bFoundLec': 'Лекций: {n}', 'mn.bFound.qs': 'Вопросов: {n}', 'mn.bFound.test': 'Вопросов теста: {n}', 'mn.bFound.cards': 'Карточек: {n}', 'mn.bFound.tasks': 'Задач: {n}',
  'mn.bNewLec': '«{l}» — такой лекции нет в конспекте, она добавится отдельно. Если ИИ переименовал лекцию — поправьте заголовок в ответе.',
  'mn.bCut': 'Ответ оборвался. Добавьте эту часть, потом напишите ИИ «дальше» и вставьте продолжение.', 'mn.bCopyMore': 'Скопировать «дальше»', 'mn.bMoreCopied': 'Скопировано — отправьте ИИ',
  'mn.bAdded': 'Добавлено в конспект',
  'mn.bNextT': 'Готово! Что добавить дальше?', 'mn.bNextSum': 'Лекций: {l} · вопросов: {q} · тест: {t} · карточек: {c} · задач: {z}',
  'mn.bNextText': 'Каждая кнопка — короткий промт в тот же чат. Можно сохранить уже сейчас и дополнить потом кнопкой «Дополнить».',
  'mn.bMoreLec': 'Ещё лекции', 'mn.bSaveNow': 'Сохранить и открыть', 'mn.bSaveNeed': 'Сначала добавьте сам конспект (шаг «Конспект»)',
  'mn.bRestored': 'Продолжаем незаконченный конспект', 'mn.bankEmpty': 'Вставьте свою базу тестов в поле ниже — или выберите «Составит ИИ»',
  'mn.bTips': '<ul class="small"><li><b>Все шаги — в одном чате с ИИ.</b> Тогда он помнит лекцию и конспект. Если чат новый — отметьте «Это новый чат».</li>' +
    '<li><b>Много лекций</b> — по 1–2 за раз: «Добавить в конспект», потом «Ещё лекции» и напишите ИИ «Теперь лекция 3».</li>' +
    '<li><b>Ответ оборвался</b> — добавьте то, что есть, напишите ИИ «дальше» и добавьте продолжение.</li>' +
    '<li><b>Копируйте кнопкой «Копировать»</b> под ответом ИИ — так сохранится разметка. Лишние фразы вроде «Вот ваш конспект» сайт уберёт сам.</li>' +
    '<li><b>Картинки</b> ИИ не рисует — после сохранения: «Изменить» → «Выбрать картинку».</li></ul>'
});
Object.assign(SP.I18N.ru, { 'mn.bCont': 'Продолжение — допишется в конец «{l}».' });

/* «ИИ решит / Скажу сам», «Всё сразу», «Посмотреть» */
Object.assign(SP.I18N.ru, {
  'mn.o.ai': 'ИИ решит', 'mn.o.self': 'Скажу сам', 'mn.q.depthHint': '«Скажу сам» — напишете ИИ в чате, как хотите',
  'mn.bPerLec': 'на каждую лекцию. «Скажу сам» — напишете ИИ в чате',
  'mn.bText.konspekt': 'Скопируйте промт, вставьте его в чат с ИИ (ChatGPT, Gemini, DeepSeek — бесплатно) и приложите лекцию: PDF, фото слайдов или текст. Нет материалов — просто напишите тему, ИИ сделает по своим знаниям. Свои пожелания пишите ИИ прямо в чате — они важнее настроек.',
  'mn.step.all': 'Всё сразу', 'mn.bAllBtn': 'Сделать всё остальное сразу', 'mn.bAllSub': 'Вопросы, тест, карточки и задачи (если они нужны по предмету) — одним промтом',
  'mn.bOrOne': 'Или по одному — так каждая часть получается подробнее:', 'mn.bAllHint': 'Сколько чего — решит ИИ (или напишите ему сами)',
  'mn.bText.all': 'Один промт — и ИИ сделает к каждой лекции вопросы с ответами, тест, карточки, а задачи — только если по предмету их решают. Отправьте его в тот же чат, где делали конспект.',
  'mn.bPastePh.all': 'Вставьте ответ ИИ…\n\n## Лекция 1. …\n### Вопросы\n…\n### Тест\n…\n### Карточки\n…',
  'mn.bNone.all': 'В ответе не видно ни вопросов, ни теста, ни карточек. Проверьте, что скопирован весь ответ.',
  'mn.bFound.all': 'Вопросов: {q} · тест: {t} · карточек: {c} · задач: {z}',
  'mn.step.view': 'Посмотреть', 'mn.bViewSub': 'что получилось', 'mn.bViewBtn': 'Посмотреть, что получилось',
  'mn.bViewText': 'Так лекции будут выглядеть. Не нравится — «Исправить с ИИ» (выберите, что не так, ИИ пришлёт лекцию заново) или поправьте текст сами.',
  'mn.v.text': 'текст ✓', 'mn.v.noText': 'нет текста', 'mn.v.qs': 'вопросов: {n}', 'mn.v.test': 'тест: {n}', 'mn.v.cards': 'карточек: {n}', 'mn.v.tasks': 'задач: {n}', 'mn.v.sum': 'Главное',
  'mn.v.fix': 'Исправить с ИИ', 'mn.v.edit': 'Править текст', 'mn.v.apply': 'Применить', 'mn.v.replace': 'Заменить лекцию', 'mn.v.replaced': 'Лекция заменена',
  'mn.v.editHint': 'Это текст только этой лекции. Подсказка по разметке — в редакторе конспекта.',
  'mn.v.delT': 'Удалить лекцию?', 'mn.v.delText': '«{t}» уберётся из конспекта вместе с вопросами, тестом и карточками.',
  'mn.v.fixText': 'Что не так? Нажмите подходящее или напишите своими словами, скопируйте промт — ИИ пришлёт лекцию заново, вставьте её ниже.',
  'mn.v.wishPh': 'своими словами, например: «добавь про Канта», «тест сложнее»', 'mn.v.ansPh': 'Вставьте сюда ответ ИИ — новую версию лекции',
  'mn.v.got': 'Новая версия: «{l}» — вопросов: {q}, тест: {t}, карточек: {c}', 'mn.v.other': 'ИИ назвал лекцию иначе или прислал несколько — встанет на место этой лекции под её названием.',
  'mn.w.more': 'Подробнее', 'mn.w.simple': 'Проще', 'mn.w.tests': 'Больше вопросов и теста', 'mn.w.errors': 'Исправь ошибки', 'mn.w.examples': 'Больше примеров', 'mn.w.visual': 'Таблицы и схемы',
  'mn.wp.more': 'сделай подробнее, ничего не сокращай', 'mn.wp.simple': 'объясни проще, понятным языком', 'mn.wp.tests': 'добавь больше вопросов с ответами и вопросов теста',
  'mn.wp.errors': 'проверь факты и ответы теста, исправь ошибки', 'mn.wp.examples': 'добавь больше примеров', 'mn.wp.visual': 'добавь таблицы для сравнений и схемы mermaid для процессов',
  'mn.bTips': '<ul class="small"><li><b>Лень по шагам?</b> После конспекта нажмите «Сделать всё остальное сразу» — один промт на всё.</li>' +
    '<li><b>Все шаги — в одном чате с ИИ.</b> Тогда он помнит лекцию и конспект. Если чат новый — отметьте «Это новый чат».</li>' +
    '<li><b>Свои пожелания</b> («подробнее про Канта», «30 вопросов теста», «на казахском») пишите ИИ прямо в чате — они важнее настроек здесь.</li>' +
    '<li><b>Нет материалов?</b> Напишите ИИ тему или название лекции — он сделает конспект по своим знаниям (сверьте с лекцией).</li>' +
    '<li><b>Ответ оборвался</b> — добавьте то, что есть, напишите ИИ «дальше» и добавьте продолжение.</li>' +
    '<li><b>Посмотреть</b> (в списке шагов) — как выглядит каждая лекция; там же «Исправить с ИИ», правка и удаление.</li></ul>'
});
/* новый вид (ui2): «Вид», вкладки настроек, справочник, «Что нового», тур */
Object.assign(SP.I18N.ru, {
  'ui2.view': 'Вид', 'ui2.v.mode': 'Как показывать', 'ui2.v.src': 'Чьё расписание', 'ui2.v.zoom': 'Масштаб', 'ui2.v.size': 'Размер блоков',
  'ui2.updated': 'Обновлено {when}', 'ui2.never': 'Ещё не обновлялось',
  'ui2.tab.look': 'Вид', 'ui2.tab.study': 'Учёба', 'ui2.tab.data': 'Данные', 'ui2.tab.guide': 'Справочник',
  'ui2.guide': 'Справочник', 'ui2.guideSub': 'Всё о сайте: что где лежит, как работает, секреты и фишки', 'ui2.copyAll': 'Скопировать всё для ИИ', 'ui2.tourAgain': 'Показать обучение снова',
  'ui2.g.sch': 'Расписание', 'ui2.g.schSub': 'Timetable и Shokan, «Вид», обновление, ссылки на онлайн-пары',
  'ui2.g.sub': 'Папки и конспекты', 'ui2.g.subSub': 'Файлы, тесты, свои конспекты с ИИ по шагам',
  'ui2.g.tst': 'Тестер', 'ui2.g.tstSub': 'Свои тесты, редактор вопросов, подсказки ИИ',
  'ui2.g.grd': 'Оценки', 'ui2.g.grdSub': 'Обновление из Platonus, как считается итог',
  'ui2.g.ply': 'Плеер', 'ui2.g.plySub': 'Видео с вопросами по ходу просмотра',
  'ui2.g.keys': 'Секреты и горячие клавиши', 'ui2.g.keysSub': '← → недели, / поиск, Esc закрыть',
  'ui2.newsT': 'Что нового', 'ui2.newsShort': 'Новый вид, кнопка «Вид» в расписании, справочник',
  'ui2.n1T': 'Кнопка «Вид» в расписании', 'ui2.n1': 'Масштаб, режим и «своё / курс» — теперь в одном месте, сетка сразу на экране.',
  'ui2.n2T': 'Конспекты с ИИ по шагам', 'ui2.n2': '«Сделать всё сразу», просмотр лекций и «Исправить с ИИ».',
  'ui2.n3T': 'Справочник', 'ui2.n3': 'Настройки → Справочник: всё о сайте, секреты и обучение.',
  'ui2.toGuide': 'В справочник', 'ui2.ok': 'Понятно',
  'ui2.step': 'Шаг {i} из {n}', 'ui2.skip': 'Пропустить', 'ui2.next': 'Дальше', 'ui2.done': 'Готово',
  'ui2.ts1T': 'Всё про вид — здесь', 'ui2.ts1': 'Timetable или Shokan, своё расписание или курса, масштаб и размер блоков.',
  'ui2.ts2T': 'Неделя', 'ui2.ts2': 'Выберите неделю. На компьютере можно листать стрелками ← →.',
  'ui2.ts3T': 'Нажмите на пару', 'ui2.ts3': 'Откроется папка предмета: файлы, тесты и конспект.'
});
/* новый вид: справочник, туры, «Отменить» */
Object.assign(SP.I18N.ru, {
  'common.undo': 'Отменить', 'common.undone': 'Вернули как было',
  'subjects.fileDeleted': '«{name}» удалён', 'subjects.folderDeleted': 'Папка «{name}» удалена',
  'jr.deleted': 'Предмет «{name}» убран из журнала', 'designer.qDeleted': 'Вопрос удалён',
  'mn.deletedT': 'Конспект «{t}» удалён', 'mn.v.deleted': 'Лекция «{t}» удалена',
  'ui2.gSearch': 'Найти в справочнике: например, «обновить оценки»', 'ui2.gNone': 'Ничего не нашлось. Попробуйте другое слово.',
  'ui2.copiedAll': 'Скопировано — вставьте в чат с ИИ и спросите что угодно о сайте',
  'ui2.tf1T': 'Поиск предмета', 'ui2.tf1': 'Начните писать название — список сразу сузится. На компьютере — клавиша «/».',
  'ui2.tf2T': 'Папка предмета', 'ui2.tf2': 'Внутри — файлы, тесты и конспект. Добавить свой конспект с ИИ — во вкладке «Конспект».',
  'ui2.tf3T': 'Свой предмет', 'ui2.tf3': 'Нет нужной папки — создайте свою.',
  'ui2.tt1T': 'Загрузите тест', 'ui2.tt1': 'TXT, DOC, DOCX или .studyplay.json — можно несколько файлов сразу.',
  'ui2.tt2T': 'Сколько вопросов', 'ui2.tt2': 'Вопросы и варианты каждый раз перемешиваются.',
  'ui2.tt3T': 'Свои тесты', 'ui2.tt3': 'Редактор вопросов и готовый промт для ИИ.',
  'ui2.tg1T': 'Оценки по предмету', 'ui2.tg1': 'Нажмите стрелку — можно ввести оценки вручную. Рейтинг и итог считаются сами.',
  'ui2.tg2T': 'Как считается', 'ui2.tg2': 'Формулы с примером и сколько нужно для 70+.',
  'ui2.tg3T': 'Обновить или добавить', 'ui2.tg3': 'После настройки здесь кнопка «Обновить оценки». «Предмет» — добавить свой.',
  'ui2.tp1T': 'Добавьте видео', 'ui2.tp1': 'Файл или ссылка YouTube. Видео будет вставать на паузу и задавать вопросы из Тестера.',
  'ui2.tp2T': 'Лента вопросов', 'ui2.tp2': 'Пройденные, текущий и следующие вопросы. Прогресс сохраняется.',
  'ui2.tn1T': 'Настройки по полкам', 'ui2.tn1': 'Вид, Учёба, Новости, Данные и Справочник — всего 5 вкладок. В «Новостях» — какие обновления приходили.',
  'ui2.tn2T': 'Справочник', 'ui2.tn2': 'Всё о сайте, секреты, клавиши и «Что нового». Можно скопировать целиком для ИИ.'
});
Object.assign(SP.I18N.ru, { 'ui2.ts2T': 'Неделя и день', 'ui2.ts2': 'На компьютере листайте стрелками ← →, на телефоне — жестом от края экрана: от левого назад, от правого вперёд.' });

Object.assign(SP.I18N.ru, { 'schedule.hasLinks': 'есть ссылки: {l}', 'schedule.lkJoin': 'Войти в {s}', 'schedule.lkOpen': 'Открыть {s}' });

Object.assign(SP.I18N.ru, { 'nav.settingsShort': 'Настройки', 'settings.phonePlayer': 'Плеер в нижней панели (телефон)', 'settings.phonePlayerHint': 'По умолчанию на телефоне вкладки «Плеер» нет — на её месте Настройки. Включите, если пользуетесь плеером: вкладок станет 6.', 'settings.phonePlayerOn': 'Плеер добавлен в нижнюю панель', 'settings.phonePlayerOff': 'Плеер убран из нижней панели' });
Object.assign(SP.I18N.ru, { 'tester.aiAskQ': 'Какой вариант правильный и почему? Ответ на русском.' });
Object.assign(SP.I18N.ru, { 'tester.continue': 'Продолжить тест', 'tester.startNew': 'Начать новый', 'tester.resumeInfo': 'Отвечено {d} из {n} · ошибок {e}', 'tester.fromFolders': 'Из папок предметов', 'tester.srcRoom': 'Отметь тесты галочками — они загрузятся в Тестер. Можно добавить ещё файлов: {n}.', 'tester.srcLoaded': '✓ уже в тестере', 'tester.srcFile': 'тест из папки', 'tester.srcNoSj': 'В папках предметов пока нет тестов.', 'tester.srcLoad': 'Загрузить выбранные', 'tester.srcMore': 'Ещё {n}', 'tester.srcLess': 'Свернуть', 'tester.srcPicked': 'отмечено {n}', 'tester.srcCounting': 'считаю вопросы…', 'tester.srcPick': 'Отметь хотя бы один тест', 'tester.srcOver': 'Можно добавить только {n} — убери какой-нибудь файл из тестера', 'tester.errTitle': 'Ошибки · {f}', 'tester.errSub': 'Хранятся, пока сам не уберёшь: ✕ у вопроса, если уже понял, или «Очистить» — весь файл.', 'tester.errTimes': 'Ошибся раз: {n}', 'tester.errGo': 'Пройти ошибки', 'tester.errClear': 'Очистить', 'tester.errClearQ': 'Удалить все ошибки файла «{f}» ({n})? Ошибки других файлов останутся.', 'tester.errYour': 'Твой ответ', 'tester.errStreak': 'Верно подряд: {s} из {n}', 'tester.errRemove': 'Убрать из ошибок', 'tester.errMore': 'Показать все ({n})', 'tester.errNone': 'Ошибок нет', 'tester.errNoneSub': 'Когда ошибёшься в тесте, вопрос появится здесь — отдельно для каждого файла.', 'tester.errLearned': 'Выучен — убран из ошибок' });
Object.assign(SP.I18N.ru, { 'ui2.tab.news': 'Новости', 'ui2.newsSub': 'Какие обновления приходили на сайт — от новых к старым', 'ui2.newBadge': 'новое', 'ui2.newsOld': 'Показать старые обновления ({n})', 'ui2.newsAll': 'Новости и обновления' });
Object.assign(SP.I18N.ru, { 'settings.game': 'Игра', 'settings.gameName': 'Подземелье знаний', 'settings.gameText': 'Проходи пещеры и побеждай монстров, отвечая на вопросы из своих тестов. Прогресс сохраняется.', 'settings.gamePlay': 'Играть' });

/* Раздел «Разработчик» (#/dev) */
Object.assign(SP.I18N.ru, {
  'settings.dev': 'Разработчик', 'settings.devRow': 'Папки предметов для всех', 'settings.devHint': 'Добавить, удалить или переименовать тесты, лекции и ссылки, а потом скачать архив для GitHub или опубликовать одной кнопкой. Там же точки сохранения и откат сайта.',
  'dev.title': 'Разработчик', 'dev.sub': 'Меняешь папки предметов здесь — потом изменения уходят всем через GitHub.', 'dev.loading': 'Загружаю…',
  'dev.how': '<b>Как это работает.</b> Ниже — папки предметов так, как они сейчас на сайте у всех (исходное состояние). Добавляй, удаляй, переименовывай, переноси файлы — это пока только черновик в твоём браузере. Когда готово, внизу выбери: <b>А</b> — скачать архив и загрузить на GitHub по шагам, или <b>Б</b> — опубликовать одной кнопкой (нужен ключ GitHub).',
  'dev.loadErr': 'Не удалось загрузить manifest.json с сайта. Проверь интернет и нажми «Загрузить заново».',
  'dev.stale': 'Пока ты правил, на сайте поменялись файлы (кто-то опубликовал изменения). Лучше начать заново, иначе можно затереть чужие правки.',
  'dev.reload': 'Загрузить заново', 'dev.reloadText': 'Черновик со всеми несохранёнными изменениями будет удалён. Продолжить?',
  'dev.group': 'Группа', 'dev.version': 'Версия на сайте: {v}', 'dev.addSubject': 'Новый предмет', 'dev.subjName': 'Название предмета',
  'dev.subjHint': 'Пиши так же, как предмет называется в расписании, — тогда файлы попадут в его папку. Предмет появится у всех, когда в нём будет хотя бы один файл.',
  'dev.count': { one: '{n} файл', few: '{n} файла', many: '{n} файлов', other: '{n} файла' }, 'dev.empty': 'Пока пусто.',
  'dev.addTest': 'Тест', 'dev.addMat': 'Материал', 'dev.addLink': 'Ссылка', 'dev.delSubject': 'Удалить все файлы предмета', 'dev.delSubjectText': 'Убрать из папки «{s}» все файлы ({n})?',
  'dev.kind.test': 'Тест', 'dev.kind.material': 'Материал', 'dev.kind.link': 'Ссылка',
  'dev.st.new': 'новый', 'dev.st.mod': 'изменён', 'dev.st.del': 'удалён', 'dev.restore': 'Вернуть',
  'dev.added': { one: 'Добавлен {n} файл', few: 'Добавлено {n} файла', many: 'Добавлено {n} файлов', other: 'Добавлено {n} файла' }, 'dev.idbErr': 'Не удалось сохранить файл в браузере.',
  'dev.fName': 'Название', 'dev.fNameHint': 'Так файл называется на сайте. Сам файл на GitHub не переименовывается.', 'dev.fKind': 'Вкладка', 'dev.fSubject': 'Предмет', 'dev.note': 'Подпись (необязательно)',
  'dev.editText': 'Редактировать текст', 'dev.replace': 'Заменить файл', 'dev.replaced': 'Файл заменён', 'dev.noFile': 'Файл не найден на сайте.',
  'dev.textHint': 'Формат теста: <question> вопрос, потом <variant> варианты, первый — правильный.',
  'dev.changes': 'Изменения', 'dev.noChanges': 'Пока изменений нет', 'dev.sum': '+{a} · −{d} · ✎{m}', 'dev.reset': 'Сбросить всё', 'dev.resetText': 'Отменить все изменения в черновике?',
  'dev.wayA': 'А. Скачать изменения', 'dev.wayAText': 'Архив с файлами и инструкция, куда их загрузить на GitHub. Без ключей и паролей.', 'dev.zip': 'Скачать архив',
  'dev.wayB': 'Б. Опубликовать для всех', 'dev.wayBText': 'Одна кнопка — через 1–2 минуты у всех. Перед этим сама ставится точка сохранения.', 'dev.wayBNoKey': 'Нужен ключ GitHub — подключи его ниже.', 'dev.publish': 'Опубликовать',
  'dev.pubText': 'Отправить на сайт для всех: +{a} · −{d} · ✎{m}? Перед публикацией сохранится точка, к которой можно вернуться.',
  'dev.p.check': 'Проверяю…', 'dev.p.point': 'Точка сохранения…', 'dev.p.file': 'Файл {i} из {n}…', 'dev.p.commit': 'Публикую…',
  'dev.published': 'Опубликовано! Через 1–2 минуты обнови сайт — изменения будут у всех.', 'dev.msg': 'Разработчик: папки предметов {s}',
  'dev.e401': 'Ключ GitHub не подходит или истёк. Создай новый.', 'dev.e403': 'У ключа нет права записи в репозиторий. Нужно: Contents — Read and write, доступ к репозиторию testerw.',
  'dev.e409': 'На сайте файлы уже поменялись после начала правок. Нажми «Загрузить заново» и сделай изменения ещё раз.',
  'dev.key': 'Ключ GitHub (для пути Б и отката)', 'dev.keyOn': 'Подключён. Хранится только в этом браузере.', 'dev.keyOff': 'Не подключён. Путь А работает и без него.',
  'dev.keyAdd': 'Подключить ключ', 'dev.keyRemove': 'Отключить', 'dev.keyRemoved': 'Ключ удалён из браузера', 'dev.keySaved': 'Ключ подключён',
  'dev.k.steps': '<li>Открой <a href="{url}" target="_blank" rel="noopener">страницу создания ключа на GitHub</a> (войди в свой аккаунт).</li><li><b>Token name</b> — любое, например «StudyPlay». <b>Expiration</b> — например 90 дней.</li><li><b>Repository access</b> → «Only select repositories» → выбери <b>{repo}</b>.</li><li><b>Permissions</b> → найди <b>Contents</b> и поставь «Read and write».</li><li>Внизу <b>Generate token</b>, скопируй ключ (начинается с github_pat_) и вставь сюда.</li>',
  'dev.k.paste': 'Ключ', 'dev.k.check': 'Проверить и сохранить',
  'dev.k.warn': 'Никому не показывай ключ. Он хранится только в этом браузере; с ним можно менять сайт. Если за компьютер сядет чужой человек — нажми «Отключить» или удали ключ на GitHub.',
  'dev.points': 'Точки сохранения и откат', 'dev.pointsSub': 'Можно вернуть весь сайт к любой точке: файлы, тесты и код — как было в тот момент.',
  'dev.pointsNoKey': 'Список видно и без ключа, а вернуть сайт можно только с ключом GitHub.', 'dev.pointsErr': 'Не удалось загрузить список с GitHub',
  'dev.pointNew': 'Сохранить точку сейчас', 'dev.pointDone': 'Точка сохранения создана', 'dev.undo': 'Отменить последнюю публикацию',
  'dev.tags': 'Точки сохранения', 'dev.commits': 'Последние изменения сайта', 'dev.back': 'Вернуть сайт сюда',
  'dev.backText': 'Вернуть весь сайт к состоянию «{p}»? Всё, что менялось после, пропадёт с сайта (но перед откатом сохранится новая точка — можно будет вернуться обратно).',
  'dev.backSame': 'Сайт уже в этом состоянии.', 'dev.backMsg': 'Откат сайта к «{p}»', 'dev.backDone': 'Сайт возвращён. Через 1–2 минуты обнови страницу.',
  'dev.beforeLast': 'до последней публикации', 'dev.undoText': 'Отменить твою последнюю публикацию и вернуть сайт как было до неё?',
  'dev.undoWarn': 'После твоей последней публикации на сайте были ещё изменения — откат уберёт и их. Точно вернуть?',
  'dev.i.title': 'Как загрузить изменения на GitHub', 'dev.i.1': 'Распакуй скачанный архив: правой кнопкой по нему → «Извлечь всё».',
  'dev.i.2': 'Открой репозиторий сайта на GitHub (войди в свой аккаунт):', 'dev.i.3': 'Нажми кнопку «Add file» → «Upload files».',
  'dev.i.4': 'Перетащи в окно папку «data» из распакованного архива — целиком папку. GitHub сам разложит файлы по местам и заменит старые.',
  'dev.i.5': 'Внизу нажми зелёную кнопку «Commit changes».', 'dev.i.6': 'Подожди 1–2 минуты и обнови сайт — изменения будут у всех. Потом вернись сюда и нажми «Я всё загрузил».',
  'dev.i.files': 'Что внутри архива', 'dev.i.del': 'Удалённые файлы уже не показываются на сайте. Стереть их с GitHub не обязательно, но можно (меньше места): открой ссылку → «Commit changes».',
  'dev.i.back': 'Если что-то пошло не так — в «Разработчике» есть точки сохранения: с ключом GitHub сайт возвращается одной кнопкой.', 'dev.i.done': 'Я всё загрузил'
});
Object.assign(SP.I18N.ru, { 'dev.noManifest': 'В группе {g} на сайте пока нет файлов папок (manifest.json ещё не создан). Добавь первый файл или ссылку — при публикации файл создастся сам.' });
/* Лента (#/feed) */
Object.assign(SP.I18N.ru, {
  'feed.title': 'Лента', 'feed.badge': 'как в TikTok', 'feed.cardSub': 'Быстрый тест в дорогу: вопросы из Тестера по одному на весь экран, листаешь вверх. Запоминает, где ты ошибся, — ошибки вернутся позже.', 'feed.open': 'Открыть ленту',
  'feed.tabErr': 'Ошибки', 'feed.tabNew': 'Новые', 'feed.tabFy': 'Для тебя', 'feed.navHome': 'Главная', 'feed.navMe': 'Профиль',
  'feed.qOf': 'Вопрос {i} из {n}', 'feed.sound': 'оригинальный звук — {f}', 'feed.multi': 'Выбери все верные ({n})', 'feed.type': 'Впиши ответ…', 'feed.check': 'Проверить',
  'feed.right': 'Верно!', 'feed.wrong': 'Мимо', 'feed.swipe': 'Листай дальше',
  'feed.save': 'В ошибки', 'feed.saved': 'В ошибках', 'feed.savedT': 'Добавлено в ошибки Тестера', 'feed.unsavedT': 'Убрано из ошибок',
  'feed.whyTitle': '{n} комментариев', 'feed.whyFirst': 'Сначала ответь — потом покажу разбор 😉', 'feed.youSaid': 'Твой ответ', 'feed.aiWho': 'ИИ-помощник', 'feed.aiText': 'Не понял, почему так? Нажми «Спросить ИИ» — объясню простыми словами.', 'feed.askAi': 'Спросить ИИ, почему так',
  'feed.endSub': 'Все вопросы пройдены', 'feed.endSkip': 'Пропущено вопросов: {n}', 'feed.more': 'Ещё {n}', 'feed.onlyErr': 'Только ошибки', 'feed.toTester': 'В Тестер', 'feed.perRound': 'Вопросов за раз:',
  'feed.noBank': 'В Тестере пока нет тестов. Загрузи файлы или возьми тест из папок предметов — и они появятся в ленте.', 'feed.noErr': 'Ошибок нет — так держать!', 'feed.noNew': 'Новых вопросов не осталось: все уже попадались.',
  'feed.stLearned': 'выучено', 'feed.stBad': 'ошибки', 'feed.stNew': 'ещё не было', 'feed.stPct': 'Выучено {p}% из {n} вопросов в Тестере', 'feed.stNow': 'Сейчас в ленте: верно {ok} из {n}'
});
Object.assign(SP.I18N.ru, { 'ext.during': '(во время видео)', 'ext.got': 'Ответы из расширения учтены: {n}' });
Object.assign(SP.I18N.ru, { 'app.offline': 'Нет интернета — показываю сохранённое: расписание и тесты, которые уже открывались.' });
/* Настройки стали проще: 5 вкладок, имени нет — только группа */
Object.assign(SP.I18N.ru, {
  'settings.sub': 'Группа, вид, обновление и твои данные. Редко нужное — во вкладке «Ещё».',
  'settings.account': 'Группа', 'settings.groupOnly': 'Расписание и папки предметов этой группы',
  'settings.data': 'Мои данные', 'settings.course': 'Файлы курса', 'settings.lookMore': 'Ещё настройки вида',
  'ui2.tab.look': 'Главное', 'ui2.tab.study': 'Обновление', 'ui2.tab.data': 'Мои данные', 'ui2.tab.more': 'Ещё',
  'auth.welcomeSub': 'Выбери свою группу — и сразу увидишь её расписание, папки предметов и тесты.',
  'settings.phonePlayer': 'Показывать «Плеер» в меню', 'settings.phonePlayerHint': 'Плеер с вопросами во время видео. Сейчас его заменяют Лента и расширение Chrome, поэтому по умолчанию он скрыт.',
  'settings.devRow': 'Раздел «Разработчик»', 'settings.devHint': 'Группы, расписание групп, папки предметов, карточки и точки сохранения сайта. Для тех, кто ведёт сайт.'
});
Object.assign(SP.I18N.ru, { 'settings.phonePlayerOn': 'Плеер добавлен в меню', 'settings.phonePlayerOff': 'Плеер убран из меню' });
/* Разработчик: вкладки, группы, расписание, общие предметы, карточки, помощь (2026-11-16c) */
Object.assign(SP.I18N.ru, {
  'dev.sub': 'Всё, что видят студенты: группы, их расписание и папки предметов. Правки — черновик в браузере, потом «Опубликовать для всех».',
  'dev.how': '<b>Папки предметов группы.</b> Добавляй, удаляй, переименовывай файлы — пока это черновик только у тебя. Когда готово, внизу: <b>А</b> — скачать архив и загрузить на GitHub руками или <b>Б</b> — опубликовать одной кнопкой (нужен ключ GitHub, вкладка «Точки сохранения»).',
  'dev.tab.folders': 'Папки', 'dev.tab.groups': 'Группы', 'dev.tab.schedule': 'Расписание', 'dev.tab.points': 'Точки сохранения', 'dev.tab.help': 'Помощь',
  'dev.wayBNoKey': 'Нужен ключ GitHub — подключи его во вкладке «Точки сохранения».',
  'dev.tags': 'Точки сохранения (хранится не больше {n}, старые удаляются сами)',
  'dev.pointsSub': 'Перед каждой публикацией точка ставится сама. Любой точкой можно вернуть весь сайт как было.',
  'dev.kind.cards': 'Карточки', 'dev.addCards': 'Карточки', 'dev.addCardsTip': 'Устные вопросы «вопрос — ответ». В папке появится вкладка «Карточки».',
  'dev.sharedTitle': 'Общие предметы из других групп', 'dev.sharedSub': 'Подключено предметов: {n}. Файлы не копируются — группа видит их из папки другой группы, и обновление там сразу видно здесь.',
  'dev.sharedFrom': 'Из группы {g}', 'dev.sharedNone': 'Других групп пока нет. Создай группу во вкладке «Группы».',

  'dev.g.how': '<b>Группы сайта.</b> Студент выбирает группу при первом входе и видит её расписание и папки. У каждой группы своя папка <code>data/&lt;группа&gt;/</code>. Общие тесты не копируй — подключи их (кнопка «Папки» у группы → «Общие предметы из других групп»).',
  'dev.g.title': 'Группы', 'dev.g.sub': 'Всего: {n}', 'dev.g.add': 'Новая группа', 'dev.g.rename': 'Переименовать', 'dev.g.del': 'Убрать группу',
  'dev.g.delText': 'Группа «{g}» пропадёт из списка на сайте. Папка data/{f}/ на GitHub останется — её можно вернуть.',
  'dev.g.save': 'Сохранить список групп для всех', 'dev.g.dirty': 'Есть несохранённые изменения в списке групп', 'dev.g.pubText': 'Запишет data/groups.json (и пустые папки новых групп) одним коммитом.',
  'dev.g.dlText': 'Скачать groups.json и положить его на GitHub в папку data/ вручную.',
  'dev.g.from': 'Общие предметы', 'dev.g.fromNone': 'Не подключать', 'dev.g.fromHint': 'Например, у МР-252 и ИР-252 одна база тестов — выбери ИР-252 и отметь предметы.',
  'dev.g.create': 'Создать', 'dev.g.exists': 'Такая группа уже есть', 'dev.g.created': 'Группа {g} добавлена. Теперь нажми «Опубликовать» внизу.', 'dev.g.folder': 'Папка группы: data/{f}/',
  'dev.g.renameHint': 'Меняется только название. Папка data/{f}/ остаётся прежней.', 'dev.g.pubConfirm': 'Записать список групп на GitHub? Перед этим поставится точка сохранения.', 'dev.g.msg': 'Разработчик: список групп',

  'dev.s.how': '<b>Расписание группы для всех.</b> Сначала «Время пар» и «Предметы», потом пары по дням. Быстрый старт — «Из файла»: сохранённая страница Timetable (.html) или schedule.json. Студенты увидят его как «Расписание курса».',
  'dev.s.file': 'Из файла', 'dev.s.copy': 'Скопировать из группы', 'dev.s.copyText': 'Расписание выбранной группы станет черновиком этой группы. Потом поправь отличия.', 'dev.s.copyNone': 'У той группы ещё нет расписания',
  'dev.s.none': 'У группы {g} ещё нет расписания на сайте. Заполни ниже или загрузи из файла.',
  'dev.s.save': 'Сохранить расписание для всех', 'dev.s.dirty': 'Есть изменения · пар в неделю: {n}', 'dev.s.pubText': 'Запишет schedule.json группы одним коммитом (перед этим — точка сохранения).',
  'dev.s.dlText': 'Скачать и положить на GitHub в {p}.', 'dev.s.dlDone': 'Файл скачан. Загрузи его на GitHub в {p}.',
  'dev.s.slots': 'Время пар', 'dev.s.addSlot': 'Пара', 'dev.s.start': 'Начало', 'dev.s.end': 'Конец',
  'dev.s.subjects': 'Предметы', 'dev.s.subjectsSub': 'Название как в папках предметов — тогда пары и папка свяжутся сами.', 'dev.s.teacher': 'Преподаватель', 'dev.s.noSubj': 'Добавь хотя бы один предмет, потом пары.',
  'dev.s.count': 'Пар: {n}', 'dev.s.addLesson': 'Пара', 'dev.s.slot': 'Пара', 'dev.s.kind': 'Тип', 'dev.s.room': 'Кабинет', 'dev.s.building': 'Корпус', 'dev.s.free': 'Выходной — пар нет.',
  'dev.s.reloadText': 'Черновик расписания этой группы будет удалён и загрузится то, что сейчас на сайте.', 'dev.s.delUsed': 'Удалится и пар в расписании: {n}.',
  'dev.s.fileBad': 'Не нашёл расписание в файле. Нужна сохранённая страница Timetable (.html) или schedule.json.', 'dev.s.fileOk': 'Загружено пар: {n}. Проверь и опубликуй.',
  'dev.s.fixEmpty': 'Заполни пустые названия предметов и время пар.', 'dev.s.pubConfirm': 'Опубликовать расписание {g} ({n} пар в неделю) для всех?', 'dev.s.msg': 'Разработчик: расписание {g}',

  'dev.h.title': 'Как всё устроено', 'dev.h.sub': 'Короткие инструкции для тебя и второго разработчика',
  'dev.h.tests': 'Как сделать тест', 'dev.h.testsSub': 'Формат файла, картинки, пояснения, код',
  'dev.h.testsHtml': '<p>Тест — файл <b>.docx</b> или <b>.txt</b>. Каждый вопрос начинается с метки:</p><pre class="pv-text">&lt;question&gt;Текст вопроса\n&lt;variant&gt;неверный вариант\n&lt;variantright&gt;верный вариант\n&lt;variant_keyboard&gt;ответ вводят с клавиатуры\n&lt;explain&gt;пояснение после ответа (последним)</pre><ul><li>Верных вариантов может быть несколько.</li><li>Картинка вопроса: <code>&lt;question_image&gt;</code>, картинка варианта: <code>&lt;variant_image&gt;</code>. В .docx картинки можно просто вставить.</li><li>Код: блок в тройных обратных кавычках <code>```cpp … ```</code>, в строке — в одинарных.</li><li>Название файла: «Предмет — N вопросов.docx». Один файл — один предмет.</li><li>Быстро: «Помощь» → «Промпт для тестов» → отдай ИИ вместе с лекцией или списком вопросов.</li><li>Проверить файл: открой его в Тестере — он покажет ошибки разметки.</li></ul><p>Добавить для всех: «Папки» → предмет → «＋ Тест» → «Опубликовать».</p>',
  'dev.h.cards': 'Как сделать карточки', 'dev.h.cardsSub': 'Устные вопросы и билеты: вопрос — ответ',
  'dev.h.cardsHtml': '<p>Карточки — для устного экзамена: студент видит вопрос, отвечает вслух, открывает ответ и сам ставит «Не знаю / Частично / Знаю». По умолчанию вкладки «Карточки» в папке нет — она появляется, когда ты добавишь файл с типом «Карточки».</p><pre class="pv-text"># Билет 1\nВопрос: Что такое философия?\nОтвет: Наука о наиболее общих законах…\n— пункт 1\n— пункт 2\n\nВопрос: Основной вопрос философии?\nОтвет: Отношение мышления к бытию.</pre><ul><li>Между карточками — пустая строка. «# Билет N» — необязательно; с ним работает «Вытянуть билет».</li><li>Файл .txt (UTF-8) или .docx.</li><li>Быстро: «Промпт для карточек» → ИИ сделает файл из списка вопросов к экзамену.</li></ul><p>Добавить: «Папки» → предмет → «＋ Карточки» → «Опубликовать».</p>',
  'dev.h.groups': 'Группы и общие предметы', 'dev.h.groupsSub': 'МР-252, ИР-252 и одна база тестов',
  'dev.h.groupsHtml': '<ol><li>«Группы» → «Новая группа» → название (например МР-252).</li><li>В «Общие предметы» выбери группу, где уже лежат тесты (ИР-252), и отметь общие предметы. Файлы не копируются.</li><li>«Опубликовать» внизу — группа появится у всех.</li><li>«Расписание» → выбери новую группу → заполни или «Из файла» / «Скопировать из группы».</li><li>Позже подключить или убрать общий предмет: «Папки» группы → «Общие предметы из других групп».</li></ol><p>Имени студента больше нет: при входе спрашивается только группа.</p>',
  'dev.h.schedule': 'Расписание группы', 'dev.h.scheduleSub': 'Время пар, предметы, пары по дням',
  'dev.h.scheduleHtml': '<ol><li>Выбери группу.</li><li>«Время пар» — начало и конец каждой пары.</li><li>«Предметы» — названия как в папках предметов и преподаватели.</li><li>Пары по дням: пара, предмет, тип, кабинет, корпус.</li><li>«Опубликовать» — у студентов это «Расписание курса». Если студент подключил Timetable или загрузил своё расписание, ему показывается его вариант.</li></ol><p>Быстрый старт: в Timetable открой расписание группы → сохрани страницу (Ctrl+S) → «Из файла».</p>',
  'dev.h.publish': 'Публикация и откат', 'dev.h.publishSub': 'Ключ GitHub, точки сохранения',
  'dev.h.publishHtml': '<ul><li>«Опубликовать» записывает изменения на GitHub одним коммитом. Сайт обновляется у всех через 1–2 минуты.</li><li>Ключ GitHub создаёт и вставляет только сам разработчик (вкладка «Точки сохранения» → «Подключить ключ»). Ключ хранится только в этом браузере.</li><li>Перед каждой публикацией ставится точка сохранения. Хранится не больше 4 точек — старые удаляются сами.</li><li>«Вернуть сайт сюда» у точки — весь сайт станет как в тот момент (история не стирается).</li><li>Без ключа: путь А — скачать файлы и загрузить на GitHub руками.</li></ul>',
  'dev.h.team': 'Для второго разработчика', 'dev.h.teamSub': 'Где что лежит в коде, как запустить на Mac',
  'dev.h.teamHtml': '<p>Полная инструкция — файл <b>docs/ДЛЯ-РАЗРАБОТЧИКА.md</b> в репозитории (<a href="{repo}/blob/main/docs/%D0%94%D0%9B%D0%AF-%D0%A0%D0%90%D0%97%D0%A0%D0%90%D0%91%D0%9E%D0%A2%D0%A7%D0%98%D0%9A%D0%90.md" target="_blank" rel="noopener">открыть на GitHub</a>).</p><ul><li>Сайт — обычные файлы HTML/CSS/JS без сборки. Запуск на Mac: в папке сайта <code>python3 -m http.server 8099</code> → http://localhost:8099</li><li><code>js/core/</code> — каркас, <code>js/features/</code> — разделы (один файл = один раздел), <code>js/i18n/</code> — все тексты, <code>data/</code> — группы, расписания, файлы.</li><li>Новый файл скрипта — подключить в index.html и поднять версию <code>?v=</code> у всех файлов.</li><li>Новость о каждом изменении — в <code>js/data/guide.js</code> (NEWS).</li></ul>',
  'dev.h.ai': 'Промпты для ИИ', 'dev.h.aiSub': 'Отдай промпт ИИ вместе с лекцией или списком вопросов — получишь готовый файл',
  'dev.h.aiTests': 'Промпт для тестов', 'dev.h.aiTestsHint': 'Все правила формата StudyPlay: варианты, картинки, ввод ответа, пояснения, код, самопроверка.',
  'dev.h.aiCards': 'Промпт для карточек', 'dev.h.aiCardsHint': 'Устные вопросы и билеты в формате «Вопрос: … / Ответ: …».', 'dev.h.example': 'Пример',
  'dev.h.cardsExample': '# Билет 1\nВопрос: Что такое философия?\nОтвет: Философия — наука о наиболее общих законах развития природы, общества и мышления.\n— изучает бытие, познание, человека и ценности;\n— разделы: онтология, гносеология, этика, логика.\n\nВопрос: Основной вопрос философии\nОтвет: Отношение мышления к бытию. Что первично — материя или сознание, и познаваем ли мир.\n\n# Билет 2\nВопрос: Что такое онтология?\nОтвет: Учение о бытии — о том, что существует и как устроен мир.\n',

  'cards.tab': 'Карточки', 'cards.intro': 'Устные вопросы: прочитай вопрос, ответь вслух, открой ответ и честно оцени себя.',
  'cards.learn': 'Учить', 'cards.ticket': 'Вытянуть билет', 'cards.weak': 'Повторить слабые',
  'cards.stat': 'Карточек: {n} · знаю {k} · частично {p} · не знаю {w}', 'cards.tickets': 'билетов: {n}', 'cards.none': 'Слабых карточек нет — всё знаешь!',
  'cards.done': 'Готово!', 'cards.know': 'Знаю', 'cards.part': 'Частично', 'cards.no': 'Не знаю', 'cards.noAnswer': 'Ответа в файле нет', 'cards.tap': 'Ответь вслух, потом открой ответ', 'cards.show': 'Показать ответ'
});
/* Памятка автора (Настройки → Ещё → Для автора) — коротко и актуально; подробности — в «Разработчике» → «Помощь» */
Object.assign(SP.I18N.ru, {
  'author.guideHtml': '<h3>1. Вход студентов</h3><p>Студент при первом входе выбирает только <b>группу</b> — имени и паролей нет. Пароли от Platonus сайт не хранит.</p>' +
    '<h3>2. Группы, расписание, папки</h3><p>Всё делается на сайте: <b>Настройки → вкладка «Разработчик»</b>. Вкладки: Папки (тесты, материалы, ссылки, карточки и общие предметы из других групп) · Группы · Расписание · Точки сохранения · Помощь.</p>' +
    '<h3>3. Тесты и карточки</h3><p>Формат и готовые промпты для ИИ — «Разработчик → Помощь». Файл теста — .docx или .txt, карточки — «Вопрос: … / Ответ: …».</p>' +
    '<h3>4. Публикация и откат</h3><p>«Опубликовать» записывает изменения на GitHub (нужен свой ключ GitHub). Перед публикацией сама ставится точка сохранения; хранится не больше 4. Любой точкой можно вернуть весь сайт.</p>' +
    '<h3>5. Второй разработчик</h3><p>Инструкция по коду и запуску на Mac — docs/ДЛЯ-РАЗРАБОТЧИКА.md в репозитории.</p>'
});

/* 17.11: перетаскивание в папках, наглядный редактор расписания, «Домашка» */
Object.assign(SP.I18N.ru, {
  'nav.homework': 'Домашка', 'nav.homeworkShort': 'Домашка',
  'subjects.moveTo': 'Перенести в другую папку…', 'subjects.moveToTitle': 'В какую папку перенести?',
  'subjects.movedTo': '«{name}» → папка «{to}»',
  'subjects.cantMoveBase': 'Это файл курса — его переносит только разработчик. Можно закрепить или скрыть.',
  'settings.removedFolders': 'Убранные папки курса: {n}',
  'settings.removedFoldersHint': 'Ты удалил их у себя. Телефон помнит только их названия, чтобы они не вернулись при обновлении. Свои файлы удаляются полностью.',
  'dev.orderChanged': 'Порядок файлов',
  'dev.s.week': 'Неделя', 'dev.s.gridHint': '«＋» в клетке — новая пара. Нажми на пару — изменить или удалить. Пару можно перетащить на другое время или день.',
  'dev.s.viewAs': 'Как увидят студенты', 'dev.s.view.pc': 'Компьютер', 'dev.s.view.phone': 'Телефон',
  'dev.s.addAt': 'Добавить пару: {d}, {t}', 'dev.s.addLesson': 'Добавить пару', 'dev.s.newLesson': 'Новая пара', 'dev.s.lesson': 'Пара',
  'dev.s.newSubj': '＋ Новый предмет…', 'dev.s.when': 'Когда', 'dev.s.preview': 'Так пару увидят студенты',
  'dev.s.noTeacherShort': 'Преподаватель не указан', 'dev.s.noTeacher': 'Без преподавателя: {n} — впиши в «Предметы» ниже (поле подсвечено).',
  'dev.s.clash': 'В одно время две пары: {list}. Если это подгруппы — всё в порядке.', 'dev.s.clashOne': 'В это время уже есть пара.',
  'dev.s.firstSubj': 'Предметов ещё нет. Нажми «＋» в любой клетке и выбери «Новый предмет» — или добавь их в «Предметы» ниже.',
  'dev.s.slotsSub': 'Строки сетки: начало и конец каждой пары.',
  'dev.s.deleted': 'Пара удалена', 'dev.s.moved': 'Пара перенесена: {d}, {t}',
  'dev.s.dayMenu': '{d}: действия', 'dev.s.copyDay': 'Скопировать {d} в…', 'dev.s.clearDay': 'Очистить {d}',
  'dev.s.clearDayText': 'Убрать все пары этого дня ({n})?', 'dev.s.copyDayText': 'Пары этого дня добавятся в выбранные дни. То, что там уже стоит, останется.',
  'dev.s.copied': 'Скопировано пар: {n}',
  'hw.ph': 'Что задали? Например: «Прочитать §5, ответить на вопросы 1–3»',
  'hw.subject': 'Предмет', 'hw.noSubject': 'Без предмета', 'hw.date': 'Срок',
  'hw.dueNext': 'К следующей паре', 'hw.dueTomorrow': 'Завтра', 'hw.dueWeek': 'Через неделю',
  'hw.toGroup': 'Для всей группы', 'hw.add': 'Добавить', 'hw.added': 'Добавлено',
  'hw.left': 'Не сделано: {n}', 'hw.allDone': 'Всё сделано',
  'hw.today': 'сегодня', 'hw.tomorrow': 'завтра', 'hw.yesterday': 'вчера', 'hw.wd': 'пн,вт,ср,чт,пт,сб,вс',
  'hw.forGroup': 'для группы', 'hw.markDone': 'Отметить: сделано', 'hw.undone': 'Снять отметку',
  'hw.sec.late': 'Просрочено', 'hw.sec.today': 'Сегодня', 'hw.sec.tomorrow': 'Завтра', 'hw.sec.week': 'На неделе', 'hw.sec.later': 'Позже', 'hw.sec.none': 'Без срока', 'hw.sec.done': 'Сделано',
  'hw.empty': 'Домашки пока нет. Впиши задание сверху — оно сохранится только у тебя.', 'hw.emptyDone': 'Всё сделано, молодец!',
  'hw.clearDone': 'Убрать сделанное', 'hw.cleared': 'Убрано: {n}', 'hw.deleted': 'Задание удалено',
  'hw.delGroup': 'Удалить у всех', 'hw.delGroupText': 'Задание пропадёт у всей группы (через 1–2 минуты).',
  'hw.shareGroup': 'Отправить всей группе',
  'hw.publishing': 'Публикую для группы…', 'hw.published': 'Готово — у группы появится через 1–2 минуты',
  'hw.commit': 'Домашка группы {g}',
  'hw.inFolder': 'Домашка: {n}'
});
Object.assign(SP.I18N.ru, {
  'dev.h.scheduleHtml': '<ol><li>Выбери группу.</li><li>Неделя выглядит как у студента: переключи «Компьютер» (Timetable) или «Телефон» (Shokan).</li><li>«＋» в пустой клетке — новая пара: предмет (можно сразу «＋ Новый предмет»), тип, кабинет, корпус. Сверху в окне видно, как пару увидят студенты.</li><li>Нажми на пару — изменить или удалить. Перетащи пару — другое время или день. «…» у дня — скопировать день в другие дни или очистить.</li><li>Ниже: «Предметы» (названия как в папках и преподаватели) и «Время пар».</li><li>«Опубликовать» — у студентов это «Расписание курса». Если студент подключил Timetable или загрузил своё расписание, ему показывается его вариант.</li></ol><p>Быстрый старт: в Timetable открой расписание группы → сохрани страницу (Ctrl+S) → «Из файла».</p>'
});
/* 17.11 (b): компактная «Домашка», переключатель «Домашка · Оценки», вкладка «Разработчик» */
Object.assign(SP.I18N.ru, {
  'ui2.tab.dev': 'Разработчик',
  'hw.switch': 'Домашка и оценки', 'hw.ph': 'Добавить задание…', 'hw.date': 'Срок', 'hw.toGroup': 'Группе',
  'hw.toGroupTip': 'Отправить всей группе (видно только разработчику)',
  'hw.filter': 'Предмет', 'hw.all': 'Все', 'hw.emptyFilter': 'По этому предмету домашки нет.',
  'hw.doneToast': 'Сделано ✓', 'hw.dueToday': 'Сегодня', 'hw.pickDate': 'Выбрать дату…', 'hw.noDue': 'Без срока',
  'hw.grpEditNote': 'Это задание всей группы: изменения увидят все.', 'hw.openFolder': 'Папка предмета',
  'hw.editTitle': 'Задание', 'hw.viewTitle': 'Задание для группы'
});
/* 17.11 (c): фото к домашке */
Object.assign(SP.I18N.ru, {
  'hw.photo': 'Фото', 'hw.photoN': 'Фото · {n}', 'hw.photoAdd': 'Добавить фото', 'hw.photoDel': 'Удалить фото', 'hw.photoOpen': 'Открыть отдельно',
  'hw.photoBad': 'Не получилось прочитать фото', 'hw.photoSaving': 'Сохраняю фото…', 'hw.photoTask': 'Задание на фото'
});
/* 17.11 (d): фото заданий группы на сайте, разработчик не прячет задания группы */
Object.assign(SP.I18N.ru, {
  'hw.publishingPh': 'Загружаю задание с фото для группы…',
  'hw.photoGrpNote': 'Фото этого задания видит вся группа. Добавишь — загрузится для всех; удалить фото у всех — открой его и «Удалить фото».',
  'hw.devKeep': 'Задания группы остаются здесь и не убираются кнопкой ниже — когда задание уже не нужно, нажми на него → «Удалить у всех».'
});

/* ENGLISH. Same keys as ru.js. Missing keys fall back to Russian. */
window.SP = window.SP || {};
SP.I18N = SP.I18N || {};
SP.I18N.en = {
  'common.actions': 'Actions', 'common.add': 'Add', 'common.apply': 'Apply', 'common.back': 'Back', 'common.cancel': 'Cancel',
  'common.change': 'Change', 'common.close': 'Close', 'common.confirm': 'Please confirm', 'common.continue': 'Continue',
  'common.copied': 'Copied', 'common.copy': 'Copy', 'common.delete': 'Delete', 'common.deleteQ': 'Delete?', 'common.download': 'Download',
  'common.later': 'Later', 'common.next': 'Next', 'common.ok': 'OK', 'common.open': 'Open', 'common.prev': 'Previous', 'common.save': 'Save',
  'common.understood': 'Got it', 'common.update': 'Update', 'common.upload': 'Upload',
  'unit.b': 'B', 'unit.kb': 'KB', 'unit.mb': 'MB',
  'time.justNow': 'just now', 'time.never': 'not updated yet',

  'nav.label': 'Sidebar', 'nav.main': 'Main sections',
  'nav.schedule': 'Schedule', 'nav.scheduleShort': 'Schedule',
  'nav.subjects': 'Subject folders', 'nav.subjectsShort': 'Folders',
  'nav.tester': 'Tester', 'nav.testerShort': 'Tester',
  'nav.grades': 'Grades', 'nav.gradesShort': 'Grades',
  'nav.player': 'Player', 'nav.playerShort': 'Player',
  'nav.settings': 'Settings', 'nav.collapse': 'Collapse sidebar', 'nav.expand': 'Expand sidebar',
  'nav.hidePanel': 'Hide sidebar', 'nav.showPanel': 'Show sidebar',

  'day.mon': 'Monday', 'day.tue': 'Tuesday', 'day.wed': 'Wednesday', 'day.thu': 'Thursday', 'day.fri': 'Friday', 'day.sat': 'Saturday',
  'day.monShort': 'Mon', 'day.tueShort': 'Tue', 'day.wedShort': 'Wed', 'day.thuShort': 'Thu', 'day.friShort': 'Fri', 'day.satShort': 'Sat',
  'kind.k-lecture': 'Lecture', 'kind.k-practice': 'Practice', 'kind.k-lab': 'Lab', 'kind.k-seminar': 'Seminar', 'kind.k-other': 'Class',

  'auth.loginTitle': 'Sign in to StudyPlay', 'auth.loginSub': 'Use your Platonus login and password.',
  'auth.registerTitle': 'Connect Platonus and Timetable',
  'auth.registerSub': 'Enter your university credentials once — StudyPlay will then fetch your schedule and grades by itself.',
  'auth.tabLogin': 'Sign in', 'auth.tabRegister': 'Register', 'auth.login': 'Login', 'auth.password': 'Password',
  'auth.showPass': 'Show password', 'auth.hidePass': 'Hide password',
  'auth.ttSame': 'Timetable uses the same login and password',
  'auth.group': 'Group', 'auth.groupPh': 'For example, ИР-252',
  'auth.groupHint': 'Used to show your group’s course materials and tests. You can change it later in Settings.',
  'auth.remember': 'Remember password on this device (encrypted)',
  'auth.loginBtn': 'Sign in', 'auth.registerBtn': 'Connect and sign in', 'auth.guest': 'Continue without signing in',
  'auth.how': 'How are passwords stored?',
  'auth.footer': 'StudyPlay is an unofficial student helper. Your password is never stored on GitHub or on the server.',
  'auth.fillBoth': 'Enter your login and password.',
  'auth.fillTt': 'Enter your Timetable login and password, or tick that they are the same.',
  'auth.noProxyTitle': 'Platonus sign-in is not set up yet',
  'auth.noProxyText': 'The site owner has not set the proxy server address yet (js/config.js). You can use the site without signing in for now.',
  'auth.codeTitle': 'Confirmation code',
  'auth.codeText': 'Platonus sent a 6-digit code to {email}. Enter it here.',
  'auth.yourEmail': 'your email', 'auth.code': 'Code from the email', 'auth.codeLen': 'The code must be 6 digits.',
  'auth.codeConfirm': 'Confirm', 'auth.codeResend': 'Send the code again', 'auth.codeSent': 'A new code has been sent.',
  'auth.welcome': 'Welcome, {name}!',
  'auth.guestTitle': 'Guest mode',
  'auth.guestText': 'Schedule and grades will not be loaded from the university. Tester, player, subject folders and uploading a schedule file work fully.',
  'auth.guestGo': 'Continue', 'auth.guestName': 'Guest', 'auth.guestShort': 'Guest mode',
  'auth.loginPlatonus': 'Sign in with Platonus', 'auth.logout': 'Sign out',
  'auth.logoutTitle': 'Sign out?',
  'auth.logoutText': 'The saved password and cached grades will be removed from this device. Tests, folders and notes stay.',
  'auth.askPlTitle': 'Platonus password', 'auth.askTtTitle': 'Timetable password',
  'auth.askPassText': 'The password was not saved on this device. Enter it to update your data.',
  'auth.ttRelink': 'Timetable credentials',
  'auth.howTitle': 'How logins and passwords are stored',
  'auth.howHtml': '<p><b>In short:</b> your password is stored only in your browser, encrypted. It is not on GitHub or on the server.</p>' +
    '<ol><li><b>Why a proxy server.</b> A browser cannot sign in to platonus.kgu.kz and timetable.kgu.kz directly — the university sites forbid it (CORS rule). A small Cloudflare program (Worker) receives your login and password from your browser, signs in to the university site, fetches the schedule and grades and returns them right away. It stores nothing.</li>' +
    '<li><b>Where the password is.</b> With “Remember password” ticked, the browser creates a secret key that cannot be copied even from the console and encrypts your login and password with it (AES-256). The encrypted data stays in this device’s browser storage.</li>' +
    '<li><b>What it protects against.</b> Anyone who copies browser files or opens storage sees only gibberish.</li>' +
    '<li><b>What it does not protect against.</b> A person using your unlocked device can open the site. On someone else’s computer untick “Remember password” and press “Sign out”.</li>' +
    '<li><b>Who sees the password.</b> Only your browser, the site owner’s proxy (at sign-in, without saving) and the university site. If you do not trust the owner, deploy your own proxy following docs/ПУБЛИКАЦИЯ.md.</li></ol>',

  'data.refresh': 'Refresh data', 'data.updated': 'Data updated', 'data.updatedAt': 'Updated {when}', 'data.never': 'Not updated yet',
  'data.lastFailed': 'last attempt failed', 'data.failed': 'Could not update {what}.', 'data.showingCached': 'Showing the last saved data.',
  'data.needLogin': 'Sign in with Platonus to load your schedule and grades.',
  'data.src.grades': 'grades (Platonus)', 'data.src.timetable': 'schedule (Timetable)',

  'err.NO_PROXY': 'The proxy server is not configured (address in js/config.js is empty).',
  'err.OFFLINE': 'No internet connection.', 'err.TIMEOUT': 'The university site is taking too long. Try again later.',
  'err.PROXY_UNREACHABLE': 'The proxy server is unreachable. Check the internet or the address in js/config.js.',
  'err.PROXY_ERROR': 'Proxy server error.', 'err.BAD_RESPONSE': 'Unexpected response. Try again later.',
  'err.INVALID_CREDENTIALS': 'Wrong login or password.', 'err.BAD_CODE': 'Wrong confirmation code.',
  'err.CODE_EXPIRED': 'The code has expired. Request a new one.', 'err.UPSTREAM_DOWN': 'The university site is unavailable right now. Try again later.',
  'err.UPSTREAM_ERROR': 'The university site returned an error.', 'err.SESSION_EXPIRED': 'Platonus session expired.',
  'err.UNAUTHORIZED': 'Please sign in again.', 'err.NEED_PASSWORD': 'Password needed to update.', 'err.CANCELLED': 'Cancelled.',
  'err.PARSE_ERROR': 'Could not read the university page — it may have changed.', 'err.RATE_LIMIT': 'Too many attempts. Wait a minute.',
  'err.FORBIDDEN_ORIGIN': 'The proxy does not accept requests from this site address (ALLOWED_ORIGINS setting).',
  'err.BAD_REQUEST': 'Bad request.', 'err.SCRIPT': 'Something went wrong. Reload the page.', 'err.UNKNOWN': 'Unknown error.',

  'schedule.source': 'Schedule source', 'schedule.src.own': 'My own', 'schedule.src.timetable': 'Timetable', 'schedule.src.course': 'Course',
  'schedule.version': 'version {v}', 'schedule.prevWeek': 'Previous week', 'schedule.nextWeek': 'Next week', 'schedule.toToday': 'Back to this week',
  'schedule.view': 'Schedule view', 'schedule.week': 'Week', 'schedule.day': 'Day', 'schedule.days': 'Days of the week',
  'schedule.zoomIn': 'Larger', 'schedule.zoomOut': 'Smaller', 'schedule.time': 'Time', 'schedule.openFolder': 'Open the subject folder',
  'schedule.lessons': { one: '{n} class', other: '{n} classes' }, 'schedule.freeDay': 'No classes',
  'schedule.hint': 'Click a class to open its subject folder with materials and tests.',
  'schedule.newCourse': 'A new course schedule has arrived {v}', 'schedule.newCourseText': 'Your notes, links and files will not change.',
  'schedule.ttStale': 'Could not update the Timetable schedule — showing the last saved one.',
  'schedule.emptyTitle': 'No schedule yet',
  'schedule.emptyLinked': 'Press “Refresh data” to load your Timetable schedule, or upload a schedule file.',
  'schedule.emptyGuest': 'Sign in with Platonus to load your schedule automatically, or upload a schedule file (JSON or a saved HTML page).',
  'schedule.upload': 'Upload a schedule file', 'schedule.howTo': 'How to prepare a schedule',
  'schedule.help1': 'Open ChatGPT or another AI and attach a photo, PDF, Word, Excel or text of the schedule.',
  'schedule.help2': 'Copy the prompt below and send it together with the file.',
  'schedule.help3': 'Save the AI answer as a .json file and upload it in Settings → Data → “Upload schedule”. A saved Timetable page (.html) also works.',
  'schedule.help4': 'Your own schedule takes priority over Timetable and the course. You can switch back in Settings → Data.',
  'schedule.aiPromptLabel': 'AI prompt',
  'schedule.aiPrompt': 'You help build a class schedule for StudyPlay. From the attached photo, screenshot, PDF, Word, Excel or text, extract the schedule without inventing missing data. Return ONLY valid JSON without Markdown in this format: {"version":1,"timeSlots":[{"id":"slot1","start":"08:30:00","end":"09:20:00"}],"subjects":[{"id":"subject-1","code":"","name":"Subject name","teacher":"Teacher name","materials":[],"tests":[],"notes":""}],"schedule":[{"id":"lesson-1","day":0,"slotId":"slot1","subjectId":"subject-1","name":"Subject name","kind":"Lecture","room":"Room","building":"Building","teacher":"Teacher name"}]}. day: 0 Monday, 1 Tuesday, 2 Wednesday, 3 Thursday, 4 Friday, 5 Saturday. Create a timeSlot for each class time and one subject per unique subject. Do not add classes that are not in the source. Return only JSON.',
  'schedule.dlTemplate': 'JSON template', 'schedule.editTitle': 'Edit schedule (JSON)',
  'schedule.editText': 'Day: 0 — Monday … 5 — Saturday. slotId must match a time slot id, subjectId — a subject id. The saved result becomes your own schedule.',
  'schedule.editNeed': 'schedule and timeSlots arrays are required.', 'schedule.editNoSubject': 'No subject for subjectId: {id}',
  'schedule.saved': 'Schedule saved',

  'hub.subject': 'Subject', 'hub.noName': 'Untitled',
  'hub.storageFull': 'Could not save: browser storage is full. Download a backup and remove large files.',
  'hub.fromImport': '— from the imported file —', 'hub.mateNotesLabel': '— classmate’s notes —',
  'hub.courseFail': 'Could not load course data (no network or the site is opened as a file). Using saved data.',
  'hub.courseUpdated': 'Course data updated (version {v}). Your notes and links were not touched.', 'hub.courseActual': 'Course data is up to date',
  'hub.fileProtocol': 'the site is opened as a file — open it via its GitHub Pages address',
  'hub.fileNotFound': 'file not found: “{path}”. Check the path in manifest.json and letter case.',
  'hub.htmlNoTable': 'no table with weekdays found in the HTML', 'hub.htmlNoLessons': 'no classes found in the table',
  'hub.importBad': 'the file is neither JSON nor a schedule HTML page', 'hub.importEmpty': 'the file has no subjects and no schedule',
  'hub.importDay': 'class “{name}”: day must be 0 to 5', 'hub.replaceTitle': 'Replace schedule?',
  'hub.replaceText': 'Replace your schedule with the one from “{name}”? Subjects, materials and notes are kept.', 'hub.replace': 'Replace',
  'hub.exportOk': 'Backup downloaded: schedule, subjects, materials, links, tests and notes.', 'hub.exportMissing': 'Backup downloaded, but {n} file(s) could not be included.',
  'hub.manifestOk': 'manifest.json downloaded (version {v}). Put it in data/{dir}/ in the repository and files in data/{dir}/files/<subject>/.',
  'hub.scheduleOk': 'schedule.json downloaded (version {v}). Put it in data/{dir}/ in the repository.',
  'hub.sharedDup': 'already added', 'hub.sharedNothing': 'no new tests or notes',
  'hub.sharedOk': 'Classmate’s files added separately (tests: {t}, notes: {n}). To keep them, press “Save to mine” in the subject folder.',
  'hub.notAdded': 'Not added:',

  'import.done': 'Import complete', 'import.failed': 'Import failed', 'import.files': 'Files processed: {n}', 'import.subjects': 'New subjects: {n}',
  'import.items': 'Materials, links and tests added: {n} (duplicates skipped)', 'import.notes': 'Notes extended: {n}',
  'import.lessons': 'Schedule loaded, classes: {n}', 'import.lost': 'Classes without a subject skipped: {n}',
  'import.kept': 'Your current schedule was not changed.', 'import.safe': 'Previously saved data was not touched.',

  'subjects.count': { one: '{n} subject', other: '{n} subjects' }, 'subjects.add': 'Add subject', 'subjects.sharedLoad': 'Classmate’s files',
  'subjects.emptyTitle': 'No folders yet', 'subjects.emptyText': 'Folders appear automatically from the schedule. You can also add a subject manually.',
  'subjects.search': 'Search subjects', 'subjects.notFound': 'Nothing found', 'subjects.itemMeta': 'Materials: {m} · tests: {t}',
  'subjects.hasMate': 'has classmate’s files', 'subjects.mateGroup': 'From file “{name}”', 'subjects.testsN': { one: '{n} test', other: '{n} tests' },
  'subjects.pick': 'Choose a subject on the left.', 'subjects.all': 'All subjects', 'subjects.noTeacher': 'Teacher not specified',
  'subjects.fromTt': 'from Timetable', 'subjects.fromCourse': 'from the course', 'subjects.edit': 'Edit subject',
  'subjects.materials': 'Materials', 'subjects.tests': 'Tests', 'subjects.notes': 'Notes', 'subjects.uploadMat': 'Upload materials', 'subjects.addLink': 'Add link',
  'subjects.noMat': 'No materials yet. Add notes, slides, PDFs or links (for example, to Telegram).',
  'subjects.uploadTest': 'Add a test file', 'subjects.noTests': 'No tests yet. You can upload TXT, DOCX or JSON.',
  'subjects.notesLabel': 'Personal notes and reminders', 'subjects.notesPh': 'Definitions, questions for the teacher, study plan…',
  'subjects.notesAuto': 'Saved automatically', 'subjects.notesSaving': 'Saving…', 'subjects.notesSaved': 'Saved',
  'subjects.link': 'Link', 'subjects.courseFile': 'course', 'subjects.courseFileTip': 'Added by the course author on GitHub', 'subjects.runTest': 'Take test',
  'subjects.pin': 'Pin', 'subjects.unpin': 'Unpin', 'subjects.moveUp': 'Move up', 'subjects.moveDown': 'Move down',
  'subjects.deleteFile': 'Delete “{name}”? This cannot be undone.', 'subjects.mateTitle': 'Classmate’s files',
  'subjects.mateText': 'These tests and notes are kept separately and are not part of your subject yet.', 'subjects.mateSave': 'Save to mine',
  'subjects.mateSaved': 'Saved: tests {t}, notes {n}', 'subjects.mateNotes': 'Classmate’s notes',
  'subjects.added': { one: '{n} file added', other: '{n} files added' }, 'subjects.readFail': 'could not be read',
  'subjects.editTitle': 'Edit subject', 'subjects.newTitle': 'New subject', 'subjects.name': 'Subject name', 'subjects.namePh': 'For example, Computer architecture',
  'subjects.code': 'Subject code', 'subjects.teacher': 'Teacher', 'subjects.nameReq': 'Enter a name.', 'subjects.deleteSubject': 'Delete subject',
  'subjects.deleteSubjectText': 'Delete the subject with all its materials, tests and notes? Its classes in your own schedule will be removed too.',
  'subjects.linkName': 'Name', 'subjects.linkNamePh': 'For example, group chat in Telegram', 'subjects.linkNote': 'Note (optional)',
  'subjects.badUrl': 'Enter a valid link (http:// or https://).', 'subjects.dupUrl': 'This link already exists in this subject.', 'subjects.linkAdded': 'Link added',
  'subjects.noContent': 'File content is not available', 'subjects.openFail': 'Could not open:', 'subjects.noPreview': 'Preview not available',
  'subjects.noPreviewText': 'Download the file and open it in a suitable app.', 'subjects.slide': 'Slide {i} of {n}', 'subjects.pptxNote': 'Text-only view: formatting may differ.',

  'tester.sub': 'Load tests and practise. Questions and options are shuffled.', 'tester.help': 'How it works', 'tester.editQuestions': 'Question editor',
  'tester.step1': '1. Test files', 'tester.formats': 'TXT, DOC, DOCX or .studyplay.json · several files allowed', 'tester.filesOf': '{n} of {max}',
  'tester.dropHint': 'Drag files here or press the button', 'tester.pick': 'Choose file', 'tester.addMore': 'Add another file', 'tester.limit': 'Limit of {max} files',
  'tester.qCount': { one: '{n} question', other: '{n} questions' }, 'tester.badCount': 'with errors: {n}', 'tester.removeFile': 'Remove file',
  'tester.step2': '2. Start the test', 'tester.total': { one: '{n} question loaded', other: '{n} questions loaded' }, 'tester.badTotal': 'with errors: {n} — fix',
  'tester.howMany': 'Number of questions', 'tester.all': 'All', 'tester.random': 'Questions are picked at random', 'tester.start': 'Start test',
  'tester.needFile': 'Load a test file first.', 'tester.loaded': 'Loaded', 'tester.noQuestions': 'no questions found in the file', 'tester.image': 'Illustration',
  'tester.helpTitle': 'Guide: tests in StudyPlay',
  'tester.helpHtml': '<p>Upload a test file or create one in the <b>Test designer</b> (Settings → For the author). You can mark one or several correct answers, add images and keyboard-answer questions.</p>' +
    '<p><b>File format.</b> A question starts with <code>&lt;question&gt;</code>, the correct option with <code>&lt;variantright&gt;</code>, others with <code>&lt;variant&gt;</code>, a typed answer with <code>&lt;variant_keyboard&gt;</code>. If no option is marked correct, the first one counts as correct.</p>' +
    '<p><b>Checking.</b> With several correct answers you must select all correct ones and nothing else. Typed answers ignore letter case and surrounding spaces.</p>' +
    '<p><b>Bottom bar.</b> On the left: Super search, AI mode and Translate; on the right: Back and Next. Under Translate there is an Auto-translate switch (also in Settings → Tester and player): when it is on, questions are translated automatically.</p><p><b>Keys</b> (when not typing in a field): ← → — previous / next question, 1–9 — choose an option, Enter — answer / next, Esc — remove focus. In a typed-answer field, Enter submits. Turn them off in Settings → Tester and player.</p>',
  'tester.exMulti': 'Choose the colours of the flag of Kazakhstan', 'tester.exKb': 'Type the number 100',
  'tester.promptDocx': 'AI prompt (DOCX)', 'tester.promptCopy': 'Copy prompt', 'tester.aiQ': 'Question:', 'tester.aiOpts': 'Options:',
  'tester.aiAsk': 'Answer in English. Explain the correct answer and each option.',
  'tester.err.noText': 'no question text', 'tester.err.noAnswer': 'no correct answer for the keyboard question',
  'tester.err.oneOpt': 'only one option — add at least one more', 'tester.err.allRight': 'all options are marked correct — at least one must be wrong',
  'tester.err.noOpts': 'no options — add them or make the question special', 'tester.err.min2': 'at least 2 options are required',
  'tester.err.noRight': 'no correct answer marked', 'tester.err.noDocxLib': 'the DOCX reader library did not load (internet needed)',
  'tester.err.format': 'TXT, DOC, DOCX and JSON are supported', 'tester.err.json': 'JSON must contain an all or questions array',
  'tester.err.notFound': 'no questions found (check the tags <question>, <variant>, <variantright>, <variant_keyboard>)',

  'bank.loaded': { one: '{n} question loaded from files: {f}', other: '{n} questions loaded from files: {f}' },
  'bank.withErrors': 'With errors: {n} (not added, shown in the editor)', 'bank.noOptions': 'Without options: {n} — complete them in the editor',
  'bank.limit': 'Limit of {max} files: {n} not added', 'bank.draftFull': 'The draft did not fit into browser storage (too many images). Save the test as a file.',

  'quiz.progress': 'Question {i} of {n} · answered {d}', 'quiz.round': 'Mistake review, round {n}', 'quiz.exit': 'Exit', 'quiz.exitTitle': 'Leave the test?',
  'quiz.exitText': 'Answers from this test will not be saved.', 'quiz.nav': 'Question numbers', 'quiz.goTo': 'Go to question {n}',
  'quiz.kindKb': 'Type the answer', 'quiz.kindMulti': 'Several correct answers: {n}', 'quiz.kindSingle': 'One correct answer',
  'quiz.search': 'Search', 'quiz.searchTip': 'Search this question on Google', 'quiz.super': 'Super search', 'quiz.superTip': 'Google query: the question and all options with a request to explain each',
  'quiz.ai': 'AI mode', 'quiz.aiTip': 'The same query in Google AI mode', 'quiz.translate': 'Translate', 'quiz.original': 'Original',
  'quiz.typeAnswer': 'Type your answer', 'quiz.yourAnswer': 'Your answer', 'quiz.kbHint': 'Letter case and surrounding spaces do not matter. Enter — check.',
  'quiz.right': 'Correct', 'quiz.wrong': 'Wrong', 'quiz.correctIs': 'Correct answer: {a}', 'quiz.check': 'Check', 'quiz.answer': 'Answer',
  'quiz.next': 'Next', 'quiz.finish': 'Finish', 'quiz.answerWord': 'answer', 'quiz.skipped': 'not answered', 'quiz.correct': 'Correct',
  'quiz.great': 'Excellent!', 'quiz.good': 'Good result', 'quiz.tryAgain': 'Worth repeating', 'quiz.statRight': 'correct', 'quiz.statWrong': 'wrong',
  'quiz.statSkip': 'skipped', 'quiz.statTotal': 'total', 'quiz.canRedo': 'You can repeat the mistakes in a separate round.', 'quiz.perfect': 'No mistakes — perfect!',
  'quiz.redo': 'Review mistakes ({n})', 'quiz.fullAgain': 'Whole test again', 'quiz.again': 'Try again', 'quiz.review': 'Review answers', 'quiz.toStart': 'To start',
  'quiz.errors': 'Mistakes and skipped',

  'designer.title': 'Test designer', 'designer.sub': 'Create and edit questions', 'designer.import': 'Import questions', 'designer.preview': 'Preview',
  'designer.clear': 'Clear all', 'designer.clearTitle': 'Clear the editor?', 'designer.clearText': 'All questions and loaded files will be removed from Tester and Player.',
  'designer.step1': '1. Regular ({n})', 'designer.step2': '2. Special ({n})', 'designer.step3': '3. Save',
  'designer.simpleHint': 'Regular questions: one or several correct options, no images.', 'designer.specialHint': 'Special questions: typed answers or images in the question and options.',
  'designer.add': 'New question', 'designer.search': 'Search questions and answers', 'designer.toSpecial': 'To special', 'designer.toSave': 'To saving',
  'designer.ready': 'ready', 'designer.question': 'Question {n}', 'designer.delQ': 'Delete question', 'designer.delQText': 'Delete this question?',
  'designer.qText': 'Question text', 'designer.qImg': 'Question image', 'designer.changeImg': 'Replace image', 'designer.removeImg': 'Remove image',
  'designer.toKb': 'Make it a typed answer', 'designer.toChoice': 'Make it multiple choice', 'designer.rightAnswer': 'Correct answer', 'designer.answerPh': 'For example, 100',
  'designer.noOpts': 'This question has no options.', 'designer.addOpts': 'Add options', 'designer.makeSpecial': 'Make special', 'designer.right': 'correct',
  'designer.option': 'Option {n}', 'designer.optImg': 'Option image', 'designer.delOpt': 'Delete option', 'designer.addOpt': 'Option', 'designer.min2': 'Keep at least 2 options.',
  'designer.movedSpecial': 'Question moved to “Special”', 'designer.nothing': 'Nothing found.', 'designer.emptyStep': 'No questions here yet. Press “New question” or “Import questions”.',
  'designer.found': 'Found: {a} of {b}', 'designer.totalN': 'Total: {n}', 'designer.badTitle': 'Questions with errors — not loaded ({n})',
  'designer.badHint': 'Fix them in the source file and upload it again. The cross only hides the card.', 'designer.hide': 'Hide',
  'designer.txtHint': 'Keeps images inside the file — best for questions with pictures.', 'designer.docHint': 'Text only: images are not saved in DOC/DOCX.',
  'designer.onlySimple': 'Regular only · {n}', 'designer.onlySpecial': 'Special only · {n}', 'designer.onlyNormal': 'With options only · {n}',
  'designer.onlyKb': 'Typed answers only · {n}', 'designer.allFile': 'Combined file · {n}', 'designer.dlTxt': 'Download TXT', 'designer.more': 'Other',
  'designer.jsonHint': '.studyplay.json keeps the whole project, including images.', 'designer.copyText': 'Copy as text', 'designer.play': 'Take this test',
  'designer.saved': 'File ready', 'designer.copied': 'Test text copied (images embedded)', 'designer.groupEmpty': 'No questions in the selected group.',
  'designer.noImgInDoc': 'File ready. Images are not saved in DOC/DOCX (questions with images: {n}).', 'designer.fixFirst': 'Fix the questions first',
  'designer.qProblem': 'Question #{n}: {p}', 'designer.noValid': 'No valid questions for a test.', 'designer.readyToPlay': 'Test ready: {n} questions. Press “Start test”.',
  'designer.skippedN': 'Invalid skipped: {n}.', 'designer.importTitle': 'Import questions',
  'designer.importHint': 'Upload TXT, DOC, DOCX or .studyplay.json, or paste text with the tags <question>, <variant>, <variantright>.',
  'designer.importFile': 'File', 'designer.importPaste': 'Or paste text', 'designer.importRead': 'Read text', 'designer.importAdd': 'Add to editor',
  'designer.importDone': 'Questions added: {n}.', 'designer.foundQ': { one: '{n} question found', other: '{n} questions found' }, 'designer.from': 'from', 'designer.to': 'to',
  'designer.pvOf': 'Question {i} of {n}',

  'player.sub': 'The video pauses and questions from the Tester appear', 'player.addFiles': 'Add video or audio', 'player.empty': 'Click to choose a video or audio file',
  'player.noVideo': 'No video selected', 'player.noVideoMeta': 'Add a video or audio file from your computer or a YouTube link',
  'player.miniSize': 'Window size', 'player.miniBack': 'Put back', 'player.ourButtons': 'StudyPlay buttons', 'player.mini': 'Mini player',
  'player.fullscreen': 'Full screen', 'player.exitFs': 'Exit full screen', 'player.inMini': 'The video is playing in the mini player',
  'player.soon': 'Questions soon', 'player.soonText': 'The video will stop in', 'player.play': 'Play (K)', 'player.pause': 'Pause (K)', 'player.next': 'Next video',
  'player.settings': 'Speed and quality', 'player.keys': 'Keys', 'player.kPause': 'pause', 'player.kVol': 'volume', 'player.kMute': 'mute', 'player.kJump': 'jump to 0–90%',
  'player.muted': 'Muted', 'player.testsTitle': 'Questions while watching', 'player.loadTests': 'Load tests in the Tester',
  'player.every': 'Show questions every', 'player.minutes': 'Minutes', 'player.seconds': 'Seconds', 'player.min': 'min', 'player.sec': 'sec',
  'player.perTest': 'Questions per break', 'player.warnLabel': 'Warn before', 'player.warnHint': 'How many seconds before the questions to show a warning (default 30).',
  'player.require': 'Require answers before continuing', 'player.saved': 'Settings saved', 'player.watched': 'Active watching: {w} · until questions: {l}',
  'player.queue': 'Queue', 'player.queueEmpty': 'The queue is empty', 'player.urlPh': 'YouTube or video link',
  'player.storeNote': 'Files and playback position are saved in the browser — after reloading the video continues from the same place.',
  'player.remove': 'Remove from queue', 'player.audio': 'Audio', 'player.video': 'Video', 'player.ytMeta': 'YouTube · embedded player',
  'player.localAudio': 'Audio file from your computer', 'player.localVideo': 'Video file from your computer', 'player.direct': 'Direct link',
  'player.pickFirst': 'Choose a video first', 'player.notStored': '“{name}” could not be saved in the browser (too large?). It works while the page is open.',
  'player.badUrl': 'Enter a link that starts with https://', 'player.ytError': 'YouTube does not allow this video in the embedded player.',
  'player.cantPlay': 'Could not play the file: unsupported format or unavailable link.', 'player.lastInQueue': 'This is the last video in the queue',
  'player.restored': 'Video restored — continue from {t}', 'player.speed': 'Speed', 'player.quality': 'Quality', 'player.auto': 'Auto', 'player.nowPlaying': 'Now: {q}',
  'player.ytNative': 'YouTube’s own buttons', 'player.ytNativeHint': 'YouTube often ignores external quality changes — turn on its own buttons, they have their own gear menu.',
  'player.qualityLocal': 'A file has a single quality — the one it was recorded in.', 'player.qualityNone': 'Quality selection appears for YouTube videos.',
  'player.autoMiniOn': 'When scrolling down: on', 'player.autoMiniOff': 'When scrolling down: off',
  'player.ytIgnored': 'YouTube ignored the choice — playing {q}. Turn on “YouTube’s own buttons”.',
  'player.noBank': 'Time for questions, but no tests are loaded — load them in the Tester.', 'player.noBankShort': 'No tests loaded — questions will not appear',
  'player.noBankText': 'Load a test file in the Tester — questions will appear while you watch.', 'player.bankN': { one: '{n} question in the bank', other: '{n} questions in the bank' },
  'player.questions': 'Questions', 'player.testTime': 'Question time', 'player.redoRound': 'Mistake review · round {n}', 'player.stoppedAt': 'stopped at {t}', 'player.skip': 'Skip',
  'player.noteFirst': 'The video is paused. After the answers it continues from {t}.', 'player.noteNext': 'The video is paused ({t}). You can go back to watching at any time.',
  'player.qOf': 'Question {i} of {n}', 'player.backToVideo': 'Back to video', 'player.showResult': 'Show result', 'player.resultOf': 'Correct: {a} of {n}',
  'player.seenOf': 'Bank questions covered: {a} of {n}', 'player.errsN': 'mistakes: {n}', 'player.allSeen': 'You have covered all bank questions!',
  'player.allSeenErrs': 'You have covered all bank questions — mistakes are left to review.', 'player.more': 'More questions ({n} left)',
  'player.newRound': 'New round through all questions', 'player.resume': 'Continue watching', 'player.feedTitle': 'Question feed',
  'player.feedSub': 'Answered: {a} · correct: {ok} · wrong: {bad}', 'player.askNow': 'Questions now', 'player.lgRight': 'correct', 'player.lgWrong': 'wrong',
  'player.lgCurrent': 'current', 'player.lgNext': 'upcoming', 'player.nextIn': 'Next questions in', 'player.pillDone': 'Question {n}: {r}', 'player.feedEmpty': 'No questions yet',
  'player.atVideo': 'at {t} of the video', 'player.yourAnswer': 'Your answer', 'player.feedSaved': 'Progress is saved automatically and survives reloading.',
  'player.resetProgress': 'Reset progress', 'player.resetTitle': 'Reset question progress?', 'player.resetText': 'Answer history and mistakes in the player will be deleted. The tests themselves stay.',
  'player.resetDone': 'Progress reset',

  'grades.subGuest': 'Platonus journal and rating calculator', 'grades.journal': 'Journal', 'grades.calc': 'Calculator',
  'grades.needLogin': 'Grades are available after signing in with Platonus', 'grades.needLoginText': 'The site will fetch your grade journal by itself. The rating calculator works without signing in.',
  'grades.openCalc': 'Open calculator', 'grades.stale': 'Could not update grades — showing the last saved ones.', 'grades.noData': 'Grades not loaded yet',
  'grades.noDataText': 'Load a journal saved from Platonus (JSON or a saved page).', 'grades.course': 'year {n}', 'grades.empty': 'No journal entries yet.', 'grades.term': 'Term', 'grades.termLabel': '{y} · term {t}',
  'grades.cantRead': 'Could not read the journal', 'grades.cantReadText': 'Platonus returned data in an unexpected form. Open “Raw data” below and send it to the site owner.',
  'grades.current': 'Current', 'grades.rk1': 'RK1', 'grades.rk2': 'RK2', 'grades.admission': 'Admission', 'grades.exam': 'Exam', 'grades.total': 'Final', 'grades.letter': 'Letter',
  'grades.colors': 'Colours: 90+ green · 70–89 blue · 50–69 yellow · below 50 red.', 'grades.raw': 'Raw data',
  'grades.rawText': 'This is what Platonus returned. If grades look wrong, download the file and send it to the site owner (it contains no password).',
  'grades.formula': 'Rating = current·60% + RK1·20% + RK2·20%; final = rating·60% + exam·40%', 'grades.fromPlatonus': 'Fill from Platonus', 'grades.addSubject': 'Subject',
  'grades.calcEmpty': 'No subjects yet. Press “Subject”, enter grades, RK1 and RK2 — the site shows what you need on the exam.',
  'grades.calcHint': 'Grey hints in the fields show what you need for 70+ (with a margin — 72).', 'grades.subjectName': 'Subject name', 'grades.delSubject': 'Delete subject',
  'grades.delSubjectText': 'Delete “{name}” from the calculator?', 'grades.oneByOne': 'Grades one by one', 'grades.avgAtOnce': 'Current average at once',
  'grades.currentAvg': 'Current average', 'grades.newMark': 'New grade (0–100)', 'grades.addMark': 'Add grade', 'grades.delMark': 'Delete grade {v}', 'grades.delMarkTip': 'Click to delete',
  'grades.avgCurrent': 'Avg. current', 'grades.rating': 'Rating', 'grades.final': 'Final', 'grades.marksN': 'Grades: {n}', 'grades.avgIs': 'average {v}',
  'grades.enough': 'already enough', 'grades.notEnough': 'not enough even with 100', 'grades.ok70': 'Final 70+ — good or better.', 'grades.below70': 'Final below 70.',
  'grades.need': 'To reach 70+ ({list}): {x}. With a margin (72): {y}.', 'grades.pickSubject': 'Choose a subject from the schedule or create a new one.',
  'grades.newSubject': 'New subject', 'grades.filled': 'Subjects filled: {n}',

  'settings.sub': 'Appearance, language, account and data', 'settings.sections': 'Settings sections',
  'settings.appearance': 'Appearance', 'settings.language': 'Language', 'settings.account': 'Account', 'settings.data': 'Data',
  'settings.testerPlayer': 'Tester and player', 'settings.tools': 'Tools', 'settings.author': 'For the author', 'settings.about': 'About',
  'settings.theme': 'Theme', 'settings.theme.light': 'Light', 'settings.theme.dark': 'Dark', 'settings.theme.system': 'System',
  'settings.fontSize': 'Font size', 'settings.sample': 'Aa', 'settings.font.s': 'Small', 'settings.font.ms': 'Below medium', 'settings.font.m': 'Medium', 'settings.font.l': 'Large',
  'settings.sidebar': 'Sidebar', 'settings.sidebarHint': 'Collapsed — icons only. Hidden — a small button stays in the corner.',
  'settings.sb.expanded': 'Expanded', 'settings.sb.collapsed': 'Collapsed', 'settings.sb.hidden': 'Hidden',
  'settings.linked': 'connected', 'settings.ttSame': 'same login as Platonus', 'settings.ttOwn': 'separate login',
  'settings.remembered': 'Saved password', 'settings.rememberedYes': 'The password is stored on this device, encrypted.', 'settings.rememberedNo': 'The password is not saved — the site will ask for it when updating.',
  'settings.forget': 'Forget password', 'settings.forgetText': 'The password will be removed from this device. The site will ask for it again next time.',
  'settings.forgotten': 'Password removed from the device', 'settings.guestText': 'You are using the site without signing in. Sign in with Platonus to load your schedule and grades automatically.',
  'settings.groupHint': 'Course materials folder: data/{dir}/', 'settings.leaveGuest': 'Leave guest mode', 'settings.saved': 'Saved',
  'settings.dataUni': 'University sites', 'settings.refreshHint': 'Fetch a fresh schedule from Timetable and grades from Platonus.',
  'settings.uploadSchedule': 'Upload schedule', 'settings.uploadScheduleHint': 'StudyPlay JSON or a saved schedule HTML page.',
  'settings.downloadSchedule': 'Download schedule', 'settings.downloadScheduleHint': 'Backup: schedule, folders, materials, tests and notes in one file.',
  'settings.howToHint': 'AI prompt and file template.', 'settings.editHint': 'Manual editing in JSON.', 'settings.dropOwn': 'Remove my own schedule',
  'settings.dropOwnHint': 'Show the Timetable or course schedule again.', 'settings.dropOwnBtn': 'Remove', 'settings.dropOwnText': 'Your uploaded schedule will be removed. Folders, materials and notes stay.',
  'settings.course': 'Course data (GitHub)', 'settings.courseRefresh': 'Update course data', 'settings.courseNone': 'Course data not loaded',
  'settings.ghScheduleHint': 'For the author: group schedule file for data/<group>/.', 'settings.ghManifestHint': 'For the author: list of the group’s materials, tests and links.',
  'settings.backup': 'Backup', 'settings.export': 'Export settings and progress', 'settings.exportHint': 'Settings, tests, player progress, calculator. Passwords are not included.',
  'settings.exportBtn': 'Export', 'settings.exportDone': 'Backup file downloaded', 'settings.import': 'Import from backup', 'settings.importHint': 'Restore data from an export file.',
  'settings.importBtn': 'Import', 'settings.importBad': 'This is not a StudyPlay backup file.', 'settings.importConfirm': 'Current settings and progress will be replaced with the file’s data. Continue?',
  'settings.wipe': 'Delete all data', 'settings.wipeHint': 'Erase everything StudyPlay keeps on this device.', 'settings.wipeBtn': 'Delete everything',
  'settings.wipeText': 'The password, tests, folders, files, notes, progress and settings on this device will be deleted. This cannot be undone.',
  'settings.trLang': 'Question translation language', 'settings.trLangHint': 'Which language the “Translate” button uses in the Tester and Player.',
  'settings.playerMore': 'Interval and number of questions', 'settings.playerMoreHint': 'Set on the Player page.',
  'settings.stopwatchHint': 'A small stopwatch on top of the site.', 'settings.designerHint': 'Create and edit tests, export to TXT, DOCX, JSON.',

  'stopwatch.title': 'Stopwatch', 'stopwatch.start': 'Start', 'stopwatch.pause': 'Pause', 'stopwatch.reset': 'Reset', 'stopwatch.toggle': 'Collapse or expand the stopwatch',

  'author.sub': 'Tools for whoever runs the site', 'author.guide': 'Author’s guide', 'author.guideHint': 'How groups, course folders and updates work.',
  'author.groups': 'Groups and folders (file)', 'author.groupsHint': 'Links “group → materials folder” (data/groups.json). No passwords here.',
  'author.prompt': 'AI prompt', 'author.promptHint': 'How to ask an AI to write a test in StudyPlay format.', 'author.folder': 'Folder',
  'author.groupsText': 'Each group has its own folder with the course schedule and materials. Download the file and put it in the repository as data/groups.json.',
  'author.groupsAdd': 'Add group', 'author.groupsReload': 'Load from the site', 'author.groupsDownload': 'Download groups.json', 'author.groupsLoaded': 'Groups loaded: {n}',
  'author.groupsBad': 'Row {n}: fill in the group name.', 'author.groupsDone': 'groups.json downloaded. Replace data/groups.json in the repository with it and publish.',
  'author.guideHtml': '<h3>1. Student sign-in</h3><p>Students sign in with their own Platonus login and password. You no longer need to keep a list of logins: the old accounts.json was removed because passwords were stored in it openly.</p>' +
    '<h3>2. Groups and course folders</h3><ol><li>Settings → For the author → “Groups and folders”: add a group (e.g. ИР-252) and a folder (ir-252).</li><li>Download groups.json and replace data/groups.json in the repository.</li><li>Put schedule.json and manifest.json in the group folder, and files in data/&lt;folder&gt;/files/&lt;subject&gt;/.</li></ol>' +
    '<pre class="code"><code>data/\n  groups.json          ← groups and folders\n  ir-252/\n    schedule.json      ← group schedule (fallback)\n    manifest.json      ← materials, tests, links\n    files/Philosophy/Lecture 1.pdf</code></pre>' +
    '<h3>3. Updates</h3><ol><li>After changing group files, always change "version" (e.g. 2026-10-23.1 → 2026-10-24.1). The site does it when you download via Settings → Data.</li><li>Students will see “A new course schedule has arrived”.</li><li>Students’ personal data (notes, links, own schedule, calculator) is never erased.</li></ol>' +
    '<h3>4. University schedule and grades</h3><p>They are fetched by the proxy (worker/ folder). If Platonus or Timetable change their pages, fix the parsing in worker/src/index.js and js/features/grades.js. Details — docs/РЕДАКТИРОВАНИЕ.md.</p>',
  'about.text': 'StudyPlay {v}. An unofficial study helper: schedule, subject folders, tester, grades and player. Open source — guides are in the docs/ folder of the repository.'
};

/* --- File-based grade import and local profile --- */
Object.assign(SP.I18N.en, {
  'auth.welcomeTitle': 'Welcome to StudyPlay',
  'auth.welcomeSub': 'Enter your group to see your group’s materials and schedule right away. The name is optional.',
  'auth.yourName': 'Name',
  'auth.yourNamePh': 'For example, Alan (optional)',
  'auth.start': 'Enter',
  'auth.noGroup': 'No group selected',
  'auth.reset': 'Reset profile',
  'auth.resetTitle': 'Reset profile?',
  'auth.resetText': 'Your name, group and imported grades will be removed from this device. Tests, subject folders and notes stay.',
  'data.importedAt': 'Imported {when}',
  'grades.howTo': 'How to load grades',
  'grades.how1': 'The site does not store your password or sign in to Platonus for you — you save the journal yourself. This is safer.',
  'grades.how2': 'Sign in to Platonus in your own browser and open the grade journal.',
  'grades.how3': 'Save the journal page (Ctrl+S) or, if you can, save the rest/api/journal response as a .json file.',
  'grades.how4': 'Come back here, press “Load grades” and choose the saved file. The data stays only on your device.',
  'grades.howSafe': 'No password is entered or sent anywhere — you simply bring a ready file.',
  'grades.openPlatonus': 'Open Platonus journal',
  'grades.import': 'Load grades',
  'grades.update': 'Update grades',
  'grades.importAdd': 'Load',
  'grades.importBad': 'Could not read the file: a Platonus journal JSON is needed.',
  'grades.imported': 'Grades loaded (terms: {n})',
  'grades.importEmpty': 'Paste the journal data or choose a file.',
  'grades.importFile': 'Journal file (.json or a saved page)',
  'grades.importIntro': 'Load a journal saved from Platonus.',
  'grades.importPaste': 'Or paste the content here',
  'settings.importGrades': 'Load grades from a file',
  'settings.importGradesHint': 'A journal saved from Platonus (JSON or a page).',
  'settings.localText': 'The profile is stored only on this device. The site never asks for or stores your Platonus password.'
});

/* --- v4 --- */
Object.assign(SP.I18N.en, {
  'auth.yourNamePh': 'Sergey',
  'auth.groupPh': 'ИР-252',
  'grades.calc': 'Grade calculator',
  'tester.aiLang': 'Answer only in this language: {lang}.',
  'tester.aiAsk': 'Explain the correct answer and each option.',
  'player.lastResult': 'Last result: {p}% ({a} of {n} correct)',
  'player.showResult': 'Result',
  'schedule.mode': 'Schedule mode',
  'schedule.mode.timetable': 'Timetable',
  'schedule.mode.shokan': 'Shokan',
  'schedule.mode.timetableTip': 'Timetable — the classic grid as on the university site. Best on a computer.',
  'schedule.mode.shokanTip': 'Shokan — the look of the Shokan University app. Best on a phone.',
  'schedule.weekOf': 'Week starting',
  'schedule.select': 'Select',
  'schedule.pickDate': 'Pick a date',
  'schedule.gap': 'Gap · {m} min',
  'shk.letters': 'M,T,W,T,F,S',
  'shk.kind.lec': 'Lectures', 'shk.kind.lab': 'Labs', 'shk.kind.pr': 'Practicals', 'shk.kind.sem': 'Seminars',
  'shk.kind.prsem': 'Practicals, seminars', 'shk.kind.sro': 'Self-study', 'shk.kind.srop': 'Guided self-study',
  'jr.sub': 'Subject journal and grade calculator',
  'jr.teacher': 'Teacher', 'jr.teachers': 'Teachers', 'jr.teacherField': 'Teacher(s)',
  'jr.cur': 'Avg. cur.', 'jr.rating': 'Rating', 'jr.exam': 'Exam', 'jr.final': 'Final',
  'jr.edit': 'Edit grades',
  'jr.fromCalc': 'From calculator', 'jr.toJournal': 'Move to journal',
  'jr.fromSchedule': 'Subjects from schedule',
  'jr.emptyTitle': 'The journal is empty',
  'jr.emptyText': 'There is no access to Platonus, so you enter grades yourself: add subjects and press the arrow on a card to type the values. You can also move them from the grade calculator.',
  'jr.moved': 'Moved from calculator: {n}', 'jr.calcEmpty': 'The calculator has no named subjects.',
  'jr.added': 'Subjects added: {n}', 'jr.delText': 'Delete this subject from the journal?',
  'group.invalid': 'Group format: capital letters, a hyphen and three digits, e.g. ИР-252. A note can go in brackets: ИР-252 (уск).',
  'group.noMatch': 'No such group in the list — you can type your own.',
  'group.noList': 'The group list is not loaded — type your group.',
  'subjects.select': 'Select', 'subjects.selDone': 'Done',
  'subjects.selectAll': 'Select all',
  'subjects.selected': { one: '{n} folder selected', other: '{n} folders selected' },
  'subjects.selectOne': 'Select folder “{name}”',
  'subjects.delFoldersTitle': 'Delete folders ({n})?',
  'subjects.delFoldersText': 'The folders will be deleted with your materials, tests and notes. Course folders can be brought back with “Restore deleted”.',
  'subjects.delFoldersDone': 'Folders deleted: {n}',
  'subjects.restoreRemoved': 'Restore deleted', 'subjects.restored': 'Course folders restored',
  'subjects.hideList': 'Hide folder list', 'subjects.showList': 'Show folder list', 'subjects.foldersBtn': 'Folders',
  'subjects.showHidden': 'Show hidden ({n})', 'subjects.hideHidden': 'Don’t show hidden',
  'subjects.allHidden': 'All files are hidden. Press “Show hidden”.',
  'subjects.hiddenBadge': 'hidden', 'subjects.hide': 'Hide', 'subjects.unhide': 'Show again',
  'subjects.hiddenToast': 'File hidden. To bring it back: “Show hidden”.',
  'subjects.cantDelete': 'Can’t delete (course file) — you can hide it',
  'settings.font.xl': 'Very large', 'settings.font.xxl': 'Huge'
});
Object.assign(SP.I18N.en, { 'schedule.roomInFolder': 'Room and teacher are in the subject folder', 'subjects.lessons': 'Classes and rooms' });

Object.assign(SP.I18N.en, { 'schedule.custom': 'Block size', 'schedule.blockW': 'Width', 'schedule.blockH': 'Height', 'schedule.auto': 'auto', 'schedule.reset': 'Reset' });

Object.assign(SP.I18N.en, { 'quiz.tools': 'AI tools', 'quiz.keysTip': 'Keys: ← → questions, 1–9 option, Enter answer / next, Esc remove focus', 'quiz.autoTrOn': 'Auto-translate on', 'quiz.autoTrTip': 'The question was translated automatically. Click to show the original.', 'settings.schSize': 'Schedule size ({m})', 'settings.sch.std': 'Standard', 'settings.sch.sm': 'Smaller', 'settings.sch.xs': 'Even smaller', 'settings.schHint': 'Relative to the site font size; changes only the schedule in its mode. The rest of the site stays the same.', 'settings.autoTr': 'Auto-translate', 'settings.autoTrHint': 'Translate test questions right away, without pressing Translate.', 'settings.hotkeys': 'Keyboard shortcuts in tests', 'settings.hotkeysHint': '← → questions, 1–9 option, Enter answer / next, Esc remove focus. Disabled in input fields.' });

Object.assign(SP.I18N.en, { 'jr.rk1': 'Midterm 1', 'jr.rk2': 'Midterm 2', 'jr.autoCalc': 'Rating = Current avg·60% + Midterm 1·20% + Midterm 2·20%. Final = Rating·60% + Exam·40%. Calculated automatically.' });

Object.assign(SP.I18N.en, { 'jr.sub': 'Grade journal: all subjects from the schedule, rating and final are calculated automatically', 'jr.emptyText': 'Subjects appear automatically once the schedule is loaded. You can add one with the Subject button.', 'designer.mobileTitle': 'The test editor is for computers', 'designer.mobileText': 'The editor is heavy and may lag or crash on a phone. Open it on a PC or laptop. You can take tests on your phone in the Tester.', 'designer.mobileAnyway': 'Open anyway' });

Object.assign(SP.I18N.en, { 'jr.how': 'How are grades calculated?', 'jr.restoreText': 'Bring back a deleted subject or create a new one.', 'jr.restored': 'Subject “{name}” restored',
  'jr.howHtml': '<p><b>What you enter.</b> Tap the arrow on a subject card and fill in: current grades one by one (or the average at once), Midterm 1, Midterm 2 and the exam. Empty means no grade yet; 0 means you got zero.</p>' +
    '<p><b>Current average</b> — the average of all current grades.</p><p><b>Rating</b> = Current avg × 60% + Midterm 1 × 20% + Midterm 2 × 20%. Shown right away, like in Platonus: a midterm not graded yet counts as 0.</p><p><b>Final</b> = Rating × 60% + Exam × 40%. Appears once the exam is entered.</p>' +
    '<p><b>Example.</b> Current 85, Midterm 1 80, Midterm 2 90 → rating 85 × 0.6 + 80 × 0.2 + 90 × 0.2 = 85. Exam 75 → final 85 × 0.6 + 75 × 0.4 = 81.</p>' +
    '<p><b>What you need for 70+.</b> Under the rings you see how much you need on what is left. It already includes a margin up to 71, because exactly 70 does not count. No hint until something is entered.</p>' +
    '<p><b>Ring colors.</b> <span class="jr-legend"><span><i style="background:var(--ring-green)"></i>90–100</span><span><i style="background:var(--ring-blue)"></i>70–89</span><span><i style="background:var(--ring-yellow)"></i>50–69</span><span><i style="background:var(--ring-red)"></i>0–49</span></span></p>' +
    '<p>Rating and final are calculated automatically. All data stays on this device.</p>' });
Object.assign(SP.I18N.en, { 'jr.need': 'To reach 70+ ({list}): {x}.', 'settings.exportHint': 'Settings, tests, player progress, grade journal. Passwords are not included.' });

Object.assign(SP.I18N.en, { 'player.normal': 'Normal', 'player.fit': 'Scale', 'player.fit.contain': 'Fit', 'player.fit.cover': 'Fill', 'player.fitHint': 'Works in full screen: Fill removes black bars, the edges of the video may be cropped.' });

/* Notes section */
Object.assign(SP.I18N.en, {
  'nav.notes': 'Notes', 'nav.notesShort': 'Notes',
  'notes.sub': 'Lectures by subject: summary, questions with answers and tests',
  'notes.emptyTitle': 'No notes yet', 'notes.emptyText': 'The author has not added notes for your group yet. Check your group in Settings → Account.',
  'notes.continue': 'Continue: {where}', 'notes.start': 'Start reading', 'notes.testsDone': 'tests done: {n}',
  'notes.ruOnly': 'The notes are in Russian, as in the original PDFs.',
  'notes.loading': 'Loading notes…', 'notes.loadError': 'Could not load the notes. Check the internet and reload the page.',
  'notes.toc': 'Contents', 'notes.pdf': 'Open PDF', 'notes.focus': 'Full screen', 'notes.focusExit': 'Exit full screen',
  'notes.intro': 'About these notes', 'notes.out': 'Program output',
  'notes.show': 'Show answer', 'notes.hide': 'Hide answer', 'notes.showSol': 'Show solution', 'notes.hideSol': 'Hide solution',
  'notes.showAll': 'Show all answers', 'notes.hideAll': 'Hide all answers',
  'notes.task': 'Task {n}', 'notes.toRef': 'Go to section {r}', 'notes.ownAnswer': 'The PDF has no answer here; it was written from this lecture.',
  'notes.test': 'test', 'notes.testTitle': 'Test: {l}', 'notes.testN': '{n} questions', 'notes.testStart': 'Start test', 'notes.testAgain': 'Take again', 'notes.best': 'best result {p}%',
  'notes.sec.text': 'Summary'
});
Object.assign(SP.I18N.en, {
  'notes.view': 'Notes view', 'notes.view.pdf': 'As in PDF', 'notes.view.text': 'As text',
  'notes.pdfError': 'Could not show the PDF page. Check the internet or switch to “As text”.',
  'notes.plain': 'In plain words: what to do', 'notes.plainEx': 'Example: what you should get'
});
Object.assign(SP.I18N.en, { 'notes.qstyle': 'Test style', 'notes.qstyle.paper': 'White, like PDF', 'notes.qstyle.site': 'Like the site' });
Object.assign(SP.I18N.en, { 'notes.qview': 'How to show questions', 'notes.qview.list': 'As a list', 'notes.qview.one': 'One by one', 'notes.carN': '{i} of {n}', 'notes.tocHide': 'Hide contents', 'notes.tocShow': 'Show contents', 'notes.plainEx': 'Your program should work like this' });
Object.assign(SP.I18N.en, { 'notes.jump': 'To tasks', 'notes.jumpTip': 'Go to the next questions, tasks or test below' });

Object.assign(SP.I18N.en, { 'notes.where': 'Where it is in the notes', 'notes.whereNone': 'Could not find the place in the notes', 'notes.backToQ': 'Back to question' });
Object.assign(SP.I18N.en, { 'auth.device': 'Device', 'auth.dev.phone': 'Phone', 'auth.dev.pc': 'Computer', 'auth.deviceHint': 'Detected automatically: {d}. It sets sizes and the schedule view: Shokan “Week” on a phone, Timetable on a computer.', 'settings.deviceHint': 'Detected automatically: {d}. Changing it applies sizes and the schedule view that suit this device.', 'settings.deviceDone': 'Sizes and schedule adjusted to the device', 'auth.out': 'Sign out', 'auth.outTitle': 'Go back to the sign-in screen?', 'auth.outText': 'The sign-in screen opens — you can pick another group or device. Tests, grades, folders and notes stay.', 'auth.outHint': '“Sign out” returns to the sign-in screen (e.g. if you picked the wrong group). “Reset profile” also deletes your name, group and grades from this device.' });
/* New notes: subject folder and lecture screen */
Object.assign(SP.I18N.en, {
  'sj.files': 'Files', 'sj.upload': 'Upload', 'sj.lectures': 'Lectures', 'sj.myNotes': 'My notes',
  'sj.read': 'read', 'sj.readPct': 'read {p}%', 'sj.qs': 'questions {a}/{n}', 'sj.tasks': 'tasks {a}/{n}', 'sj.test': 'test {p}%',
  'sj.start': 'Start', 'sj.continue': 'Continue',
  'lx.tab.text': 'Text', 'lx.tab.qs': 'Questions', 'lx.tab.tasks': 'Tasks', 'lx.tab.cards': 'Cards', 'lx.tab.test': 'Test',
  'lx.back': 'Back to subject folder', 'lx.prevLec': 'Previous lecture', 'lx.nextLec': 'Next lecture', 'lx.parts': 'Lecture parts',
  'lx.lecOf': '{l} of {n}', 'lx.sum': 'Key points in 1 minute',
  'lx.endQs': 'Done reading? Answer the questions — if you forget, “Where in the lecture?” takes you to the right place.',
  'lx.endTasks': 'Done reading? Solve the tasks — if stuck, “Where in the lecture?” shows the section that explains it.',
  'lx.nextTab': 'Next: {t}', 'lx.task': 'Task', 'lx.q': 'Question', 'lx.nOf': '{w} {i} of {n}',
  'lx.yourCode': 'Your code · saved automatically', 'lx.codeReset': 'Reset', 'lx.where': 'Where in the lecture?',
  'lx.mSolved': 'You marked: solved', 'lx.mKnew': 'You marked: knew it', 'lx.mAgain': 'You marked: repeat',
  'lx.check': 'Compare with solution', 'lx.hint': 'Hint', 'lx.gotIt': 'Did it work?', 'lx.knewIt': 'Did you know it?',
  'lx.solved': 'Solved', 'lx.knew': 'Knew it', 'lx.again': 'Repeat',
  'lx.swipeHint': 'Swipe left/right or use the ← → keys',
  'lx.cardsHint': 'Tap a card to see the answer. Cards you don’t know come back a few cards later.',
  'lx.cardsDone': 'knew / total answers', 'lx.again2': 'Again', 'lx.cardsStat': 'Knew {y} · Didn’t know {n}',
  'lx.flip': 'Flip the card', 'lx.tapFlip': 'Tap to see the answer', 'lx.answer': 'Answer', 'lx.remember': 'Remember', 'lx.dontKnow': 'Don’t know',
  'lx.backQ': 'Back to question {n}', 'lx.backTask': 'Back to task {n}'
});Object.assign(SP.I18N.en, { 'lx.zoom': 'Zoomed fragment' });
Object.assign(SP.I18N.en, { 'lx.hide': 'Hide' });
Object.assign(SP.I18N.en, { 'sj.itemMeta': 'Files: {m} · tests: {t}', 'sj.hasNotes': 'notes', 'sj.konspekt': 'Notes', 'sj.nLec': '{n} lectures', 'sj.kProg': 'read {r} of {n}', 'sj.kTests': 'tests {a} of {n}' });

Object.assign(SP.I18N.en, { 'jr.plLoad': 'Load from Platonus', 'jr.plPick': 'Choose file', 'jr.plAt': 'From Platonus: {d}', 'jr.plHow': 'How to update?',
  'jr.plCur': 'Current marks: {n}', 'jr.plDone': 'Grades updated, subjects: {n}.', 'jr.plAdded': 'New cards: {n}.',
  'jr.plBad': 'This is not a grades file. Choose the file saved with “Save for StudyPlay”.',
  'jr.plHowTitle': 'Grades from Platonus',
  'jr.plHowHtml': '<p>The site never asks for your Platonus password. The “My grades” program on your computer fetches the grades, and you upload the ready file here.</p>' +
    '<ol class="jr-steps"><li>Run the “My grades” program and press <b>“Get grades”</b>.</li><li>Press <b>“Save for StudyPlay”</b>. The file is saved to the desktop.</li>' +
    '<li>Here, press <b>“Load from Platonus”</b> and choose that file.</li></ol>' +
    '<p><b>On a phone:</b> send the file to yourself in Telegram, save it to the phone and choose it here.</p>' +
    '<p class="small muted">Midterm 1, Midterm 2, exam and current average fill the cards; dated current marks appear under the rings. The file holds only grades: no login or password.</p>' });
Object.assign(SP.I18N.en, { 'jr.plBadLink': 'Could not read grades from the link. Save the file in the program and load it with "Load from Platonus".', 'jr.plOld': 'This browser is too old to load grades from a link. Update it or load the file with "Load from Platonus".' });
Object.assign(SP.I18N.en, { 'jr.plRun': 'Update from Platonus', 'jr.plRunToast': 'Starting the "My grades" program. When it closes, grades will appear here. If nothing opened, run "Подключить к StudyPlay.bat" next to the program once.',
  'jr.plClip': 'Allow the site to read the clipboard (icon in the address bar) so it can receive grades from the program.' });
Object.assign(SP.I18N.en, { 'jr.plSetupTitle': 'Connect Platonus grades', 'jr.plDownload': 'Download the program', 'jr.plRunGo': 'Already connected — update',
  'jr.plRunToast': 'Getting grades from Platonus… They will appear here in a few seconds.',
  'jr.plSetupHtml': '<p>The “Update from Platonus” button starts the “My grades” program on your computer. It signs in to Platonus and sends the grades here. Your password stays encrypted on your computer only — the site never sees it. Windows only.</p>' +
    '<p><b>Setup (once):</b></p><ol class="jr-steps">' +
    '<li>Download the program (button below) and unzip it into a permanent folder, e.g. “Documents\\StudyPlay-grades”.</li>' +
    '<li>Double-click <b>start.vbs</b>. If Windows shows “Windows protected your PC” — “More info” → “Run anyway”.</li>' +
    '<li>Enter your Platonus login and password, tick <b>“Remember password”</b> and press <b>“Get grades”</b> (enter the e-mail code if asked). Close the window.</li>' +
    '<li>Double-click <b>connect.bat</b> and press any key.</li></ol>' +
    '<p><b>Then:</b> “Update from Platonus” → the browser asks “Open application?” → “Open”. Grades appear in a few seconds. The first time, allow clipboard access.</p>' +
    '<p class="small muted">To disconnect — disconnect.bat in the same folder. Details — README.txt in the archive.</p>' });
Object.assign(SP.I18N.en, { 'settings.plHide': 'Hide Platonus buttons in Grades', 'settings.plHideHint': '"Update from Platonus", program setup and "Load from Platonus". Untick to show them.' });
Object.assign(SP.I18N.en, { 'jr.dl': 'Download', 'jr.dlCsv': 'Table (Excel)', 'jr.dlCsvHint': 'All subjects: current, midterms, rating, exam, final. Opens in Excel and on a phone — handy to send in Telegram.',
  'jr.dlJson': 'StudyPlay file', 'jr.dlJsonHint': 'Move grades to another device: there, Grades → Download → "Load grades file".',
  'jr.jLoad': 'Load grades file (from another device)', 'jr.jDone': 'Grades loaded, subjects: {n}.', 'jr.jBad': 'This is not a StudyPlay grades file.', 'jr.csvMarks': 'Current marks' });
Object.assign(SP.I18N.en, { 'jr.csvSubject': 'Subject' });

Object.assign(SP.I18N.en, { 'settings.plAuto': 'Auto-update from Platonus', 'settings.min': 'min',
  'settings.plAutoHint': 'Every N minutes while the site is open, and right when it opens, the site presses "Update from Platonus" by itself. 0 — off. Tick "Always allow" in the "Open application?" prompt so the browser stops asking. Not too often: Platonus may block sign-in for a while.' });
Object.assign(SP.I18N.en, { 'jr.plBusy': 'Updating grades from Platonus…' });

Object.assign(SP.I18N.en, { 'jr.newOne': 'New grade', 'jr.newMany': 'New grades' });

Object.assign(SP.I18N.en, { 'settings.plHideHint': 'The "Update from Platonus" button and program setup. Untick to show them.' });
Object.assign(SP.I18N.en, { 'jr.more': 'More' });

Object.assign(SP.I18N.en, { 'jr.plCool': 'Cooldown: {s} s left. Platonus can be updated at most once a minute to avoid a sign-in block.' });
Object.assign(SP.I18N.en, { 'jr.plNightTitle': 'Platonus night break', 'jr.plNightGo': 'Try anyway',
  'jr.plNightText': 'Platonus is usually offline at night — roughly 23:00 to 7:00. Updating grades will most likely fail now.',
  'settings.plAutoHint': 'Every N minutes while the site is open, and right when it opens, the site presses "Update from Platonus" by itself. 0 — off, minimum 1 minute. Platonus is usually offline at night (about 23:00–7:00), so auto-update pauses then. Tick "Always allow" in the "Open application?" prompt so the browser stops asking.' });
SP.I18N.en['jr.plSetupHtml'] = SP.I18N.en['jr.plSetupHtml'].replace('<p class="small muted">', '<p class="small"><b>Night break:</b> Platonus is usually offline from about 23:00 to 7:00 — grades cannot be updated then; auto-update waits for the morning.</p><p class="small muted">');
/* Timetable schedule via the same "My grades" program */
Object.assign(SP.I18N.en, { 'schedule.ttRun': 'Update schedule', 'schedule.link': 'Teacher\'s link',
  'jr.ttRunToast': 'Getting the schedule from Timetable… It will update in a few seconds.',
  'jr.plQueued': 'The program is already running — this update starts right after it.',
  'jr.plBusy': 'Updating from Platonus / Timetable…',
  'jr.ttFirst': 'Timetable schedule loaded: {n} classes a week. Teachers\' links show right in the schedule.',
  'jr.ttNewLink': 'New link in the schedule', 'jr.ttNewLinks': 'New links in the schedule',
  'jr.ttChanged': 'The Timetable schedule changed — updated.',
  'jr.ttOld': 'To update the schedule, update the program: download it again, replace the files in its folder and run connect.bat once more. Grades were updated.',
  'jr.ttBad': 'Could not read the Timetable schedule.',
  'settings.ttAuto': 'Schedule auto-update',
  'settings.ttAutoHint': 'Every N minutes (and right when the site opens) the program takes the schedule and teachers\' links from Timetable. 0 — only with the "Update schedule" button. The schedule rarely changes — 60 minutes is plenty.',
  'jr.plSetupTitle': '"My grades" program: grades + schedule',
  'jr.plSetupHtml': '<p>The "My grades" program runs on your computer and does two things: <b>grades</b> from Platonus ("Update from Platonus") and the <b>schedule with teachers\' links</b> from Timetable ("Update schedule"). One login and password, stored encrypted only on your computer — the site never sees them. Windows only.</p>' +
    '<p><b>Setup (once):</b></p><ol class="jr-steps">' +
    '<li>Download the program (button below) and unzip it into a permanent folder. If you already have it, just replace the files in its folder.</li>' +
    '<li>Double-click <b>start.vbs</b>.</li>' +
    '<li>Enter your Platonus login and password, tick <b>"Remember password"</b> and press <b>"Get grades"</b>. Close the window.</li>' +
    '<li>Double-click <b>connect.bat</b>. After updating the program, run it again.</li></ol>' +
    '<p class="small"><b>Night break:</b> Platonus is usually offline about 23:00–7:00. This does not affect the schedule.</p>' +
    '<p class="small muted">To disconnect — disconnect.bat in the same folder. Details — README.txt in the archive.</p>' });
Object.assign(SP.I18N.en, { 'jr.ttCool': 'Cooldown: {s} more sec. The schedule can be updated at most once a minute.' });

/* программа одним окном */
Object.assign(SP.I18N.en, {
  'jr.ttOld': 'To update the schedule, update the program: download it again, replace the files in its folder, open StudyPlay.vbs and press "Обновить подключение" (update connection). Grades were updated.',
  'jr.plSetupHtml': '<p>The program runs on your computer and does two things: <b>grades</b> from Platonus and the <b>schedule with teachers\' links</b> from Timetable. The password is stored encrypted only on your computer — the site never sees it. Windows only.</p>' +
    '<p><b>Setup (once):</b></p><ol class="jr-steps">' +
    '<li>Download the program (button below) and unzip it into a permanent folder. If you already have it, replace the files in its folder.</li>' +
    '<li>Double-click <b>StudyPlay.vbs</b>.</li>' +
    '<li>In the window: Platonus login and password, tick <b>"Remember password"</b>. If the Timetable password is different, untick "same login and password in Timetable" and enter it. Press <b>"Get all"</b>.</li>' +
    '<li>In the same window press <b>"Connect"</b> — the site buttons will work in every browser.</li></ol>' +
    '<p class="small"><b>Night break:</b> Platonus is usually offline about 23:00–7:00. This does not affect the schedule.</p>' +
    '<p class="small muted">From a phone: "File for StudyPlay" in the program, then here "Download" → "Load grades file" — both grades and the schedule with links arrive.</p>' });
Object.assign(SP.I18N.en, { 'schedule.weekOf2': 'Week {n} of {t}', 'schedule.weekN': 'Semester week {n}' });

/* StudyPlay на телефоне */
Object.assign(SP.I18N.en, {
  'app.credsTitle': 'Sign-in on this phone', 'app.credsHint': 'Platonus (and Timetable) login and password. Stored only in the phone\'s secure storage.',
  'app.credsText': 'The app signs in to Platonus and Timetable by itself. The login and password are stored only on this phone.',
  'app.login': 'Platonus login', 'app.password': 'Password', 'app.same': 'Same login and password in Timetable', 'app.ttLogin': 'Timetable login', 'app.ttPassword': 'Timetable password',
  'app.runToast': 'Getting grades from Platonus…', 'app.fail': 'That did not work. Check the internet and try again.',
  'app.notify': 'New grade notifications', 'app.notifyHint': 'About every half hour the app quietly checks Platonus (even when closed) and notifies you about new grades. Not at night (23:00–7:00).',
  'app.phoneTitle': 'StudyPlay on your phone', 'app.apk': 'Download for Android (APK)', 'app.iosCopy': 'Copy the iPhone script', 'app.iosFile': 'Script file',
  'app.phoneHtml': '<p><b>Android — the StudyPlay app.</b> The same site inside, but it fetches grades and the schedule with links by itself, without a computer, and notifies you about new grades.</p>' +
    '<ol class="jr-steps"><li>Tap "Download for Android", open the file and allow installing from this source.</li><li>In the app: Settings → Tools → untick "Hide Platonus buttons" → "Sign-in on this phone".</li></ol>' +
    '<p><b>iPhone — via the free Scriptable app.</b></p>' +
    '<ol class="jr-steps"><li>Install <b>Scriptable</b> from the App Store.</li><li>Open this site on the iPhone → "Copy the iPhone script".</li><li>Scriptable → "+" → paste, name it <b>StudyPlay</b> → ▶.</li><li>Auto-update: Shortcuts → Automation → Time of Day → Scriptable "Run Script" → StudyPlay.</li></ol>' });
Object.assign(SP.I18N.en, { 'app.iosRun': 'Opening Scriptable… In a few seconds it brings you back here with fresh data.', 'app.iosReady': 'The script is set up — update' });
SP.I18N.en['app.phoneHtml'] = SP.I18N.en['app.phoneHtml'].replace('<li>Auto-update:', '<li>On this site in Safari the Update from Platonus and Update schedule buttons run the script in Scriptable, and it brings you back here with fresh data.</li><li>Auto-update:');
Object.assign(SP.I18N.en, { 'app.paste': 'Paste update', 'app.pasteHint': 'Scriptable copied fresh data — paste it here.', 'app.pasteNone': 'No StudyPlay data in the clipboard. Press Update again and wait until Scriptable says Done.' });

/* мастер автообновления */
Object.assign(SP.I18N.en, {
  'jr.plRun': 'Update grades',
  'setup.title': 'Auto-update of grades and schedule',
  'setup.intro': 'StudyPlay can take your grades from Platonus and the schedule with teachers\' links from Timetable by itself. Let\'s set it up on this device (2–3 minutes). The password stays only with you.',
  'setup.skip': 'Skip, set up later', 'setup.doneCheck': 'Done — check', 'setup.saveCheck': 'Save and check',
  'setup.win': '<ol class="jr-steps"><li>Press "Download the program" below.</li><li>Move the folder from the archive to a permanent place, e.g. Documents.</li><li>Double-click <b>StudyPlay.vbs</b>.</li><li>Enter your Platonus login and password, tick <b>"Remember password"</b>.</li><li>Press <b>"Подключить"</b> (Connect).</li><li>Come back and press <b>"Done — check"</b>.</li></ol>',
  'setup.app': '<p><b>You are in the StudyPlay app for Android.</b> Enter your login and password once.</p>',
  'setup.ios': '<ol class="jr-steps"><li>Install <b>Scriptable</b> from the App Store.</li><li>Press "Copy the iPhone script" below.</li><li>Scriptable → "+" → paste, name it <b>StudyPlay</b>.</li><li>Come back and press <b>"Done — check"</b>.</li></ol>',
  'setup.android': '<p>A browser cannot sign in to Platonus by itself — auto-update needs the StudyPlay app.</p><ol class="jr-steps"><li>Press "Download for Android".</li><li>Open StudyPlay.apk and allow installing.</li><li>Open the app — it will ask for the login.</li></ol>',
  'setup.other': '<p>Auto-update is not available on this device yet. Grades can be entered manually.</p>',
  'settings.setupTitle': 'Auto-update of grades and schedule', 'settings.setupHint': 'Step-by-step setup for this device.',
  'settings.plShow': '"Update grades" and "Update schedule" buttons', 'settings.plShowHint': 'Turn on by themselves after setup.', 'settings.setupBtn': 'Set up',
  'app.phoneRow': 'StudyPlay on your phone', 'app.phoneRowHint': 'How to install on Android and iPhone.'
});

['app.phoneHtml','settings.plAutoHint','settings.ttAutoHint'].forEach(function (k) { if (SP.I18N.en[k]) SP.I18N.en[k] = SP.I18N.en[k].split('Update from Platonus').join('Update grades'); });
Object.assign(SP.I18N.en, { 'app.shareTitle': 'Save or open the file' });

Object.assign(SP.I18N.en, {
  'settings.sync': 'Grades and schedule',
  'setup.autoTitle': 'How often to update automatically?',
  'setup.autoText': 'Everything works! Choose how often StudyPlay takes new grades and the schedule by itself. You can change it later in Settings → "Grades and schedule".',
  'setup.autoGrades': 'Grades', 'setup.autoTt': 'Schedule and teachers\' links',
  'setup.never': 'Do not update', 'setup.byButton': 'Button only', 'setup.m15': '15 min', 'setup.m30': '30 min', 'setup.h1': '1 hour', 'setup.h3': '3 hours', 'setup.h6': '6 hours', 'setup.day': 'Once a day',
  'setup.autoNotePc': 'Updates while the site is open and right when it opens. Platonus is offline at night (23:00–7:00).',
  'setup.autoNoteApp': 'While the app is open — by this choice. A closed app checks grades about every half hour and notifies you about new ones.'
});
Object.assign(SP.I18N.en, { 'settings.plAuto': 'Grades auto-update' });

/* мои конспекты */
Object.assign(SP.I18N.en, {
  'mn.addBtn': 'Add notes', 'mn.importBtn': 'Load file', 'mn.editBtn': 'Edit', 'mn.moreLec': 'Add lectures', 'mn.download': 'Download file', 'mn.forSite': 'For the site', 'mn.mineBadge': 'My notes',
  'mn.addTitle': 'Add notes', 'mn.s1': 'Copy the prompt and send it to an AI', 'mn.s2': 'Paste the AI answer', 'mn.s3': 'Save', 'mn.copyPrompt': 'Copy prompt', 'mn.saveOpen': 'Save and open',
  'mn.empty': 'No notes here yet. Press "Add notes": the site gives a ready prompt for an AI; paste the answer and you get notes like in StudyPlay.',
  'mn.imgHere': 'Image here:', 'mn.editTitle': 'Notes editor'
});

/* анкета и «Доработать» */
Object.assign(SP.I18N.en, {
  'mn.s1': 'Answer a few questions and copy the prompt', 'mn.q.subject': 'Subject', 'mn.q.goal': 'Preparing for', 'mn.q.depth': 'How detailed',
  'mn.depth.short': 'Short', 'mn.depth.medium': 'Medium', 'mn.depth.full': 'Detailed', 'mn.q.want': 'Also make', 'mn.want.qs': 'Q&A', 'mn.want.test': 'Test', 'mn.want.cards': 'Cards',
  'mn.q.tasks': 'Tasks with solutions', 'mn.q.testSrc': 'Whose test', 'mn.q.split': 'How to split', 'mn.q.lang': 'Language', 'mn.q.fmt': 'Answer format', 'mn.impCopy': 'Copy prompt'
});

Object.assign(SP.I18N.en, {
  'mn.moreLec': 'Add more', 'mn.bTitle': 'New notes — step by step', 'mn.bTitleMore': 'Add to notes', 'mn.bSave': 'Save notes',
  'mn.step.konspekt': 'Notes', 'mn.step.qs': 'Questions', 'mn.step.test': 'Test', 'mn.step.cards': 'Cards', 'mn.step.tasks': 'Tasks',
  'mn.bCopy1': 'Copy prompt', 'mn.bCopyN': 'Copy prompt', 'mn.bAdd': 'Add to notes', 'mn.bPaste': 'AI answer', 'mn.bNextT': 'Done! What next?', 'mn.bSaveNow': 'Save and open', 'mn.bMoreLec': 'More lectures'
});
Object.assign(SP.I18N.en, { 'mn.o.ai': 'AI decides', 'mn.o.self': 'I will say', 'mn.step.all': 'All at once', 'mn.step.view': 'Preview', 'mn.bAllBtn': 'Make everything else at once', 'mn.v.fix': 'Fix with AI', 'mn.v.edit': 'Edit text' });

Object.assign(SP.I18N.en, { 'ui2.view': 'View', 'ui2.tab.look': 'Look', 'ui2.tab.study': 'Study', 'ui2.tab.data': 'Data', 'ui2.tab.guide': 'Guide', 'ui2.updated': 'Updated {when}', 'ui2.newsT': 'What is new', 'ui2.skip': 'Skip', 'ui2.next': 'Next', 'ui2.done': 'Done' });

Object.assign(SP.I18N.en, { 'common.undo': 'Undo', 'common.undone': 'Restored', 'ui2.copyAll': 'Copy all for AI', 'ui2.guide': 'Guide' });

Object.assign(SP.I18N.en, { 'schedule.hasLinks': 'links: {l}', 'schedule.lkJoin': 'Join {s}', 'schedule.lkOpen': 'Open {s}' });

Object.assign(SP.I18N.en, { 'nav.settingsShort': 'Settings', 'settings.phonePlayer': 'Player in the bottom bar (phone)' });

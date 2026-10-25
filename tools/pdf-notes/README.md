# Перенос PDF-конспекта на сайт

Инструмент для автора. Превращает PDF в данные вкладки «Конспекты»
(`data/<группа>/notes/*.json`). Работает в браузере, Python и Node не нужны.

## Как пользоваться

1. Положите PDF в отдельную папку, например `work/`, и скопируйте туда
   `dump.js`, `parse.js`, `build.js`, `answers.json` из этой папки.
2. Запустите сервер (PowerShell):
   `powershell -File tools/pdf-notes/serve.ps1 -Root work -Port 8100`
3. Откройте `http://localhost:8100/` и в консоли браузера (F12) выполните:
   ```js
   const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
   pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
   const { dump } = await import('/dump.js');
   await fetch('/save/cpp.raw.json', { method: 'POST', body: JSON.stringify(await dump(pdfjs, '/RK1_Cpp_konspekt.pdf')) });
   const B = await import('/build.js'); await B.build();
   ```
4. Готовые файлы появятся в `work/out/*.final.json` — скопируйте их в
   `data/<группа>/notes/` и пропишите в `index.json`.

## Что важно знать

- `dump.js` достаёт текст с координатами, размером и типом шрифта (жирный, курсив, код).
- `parse.js` собирает из этого лекции, разделы, таблицы, код с отступами, вопросы
  с ответами и тесты с ключами. Правила подобраны под вёрстку двух PDF
  (Философия и C++): у другого PDF могут быть другие размеры шрифтов — тогда
  поправьте функции `parseFilo` / `parseCpp` или сделайте свою по образцу.
- `plain.json` — пояснения «Простыми словами» к задачам C++ (ключ: номер задачи, например `4Б.3`).
- Для вида «Как в PDF» разбор сохраняет у текстовых разделов поле `pdf` — границы раздела на страницах.
- `answers.json` — ответы на «Контрольные вопросы» C++, которых нет в PDF
  (ключ: `лекция|номер`).
- После сборки всегда проверяйте результат на сайте: число вопросов и тестов,
  таблицы, код и ключи (`check` в блоке теста: сколько вопросов без верного ответа).
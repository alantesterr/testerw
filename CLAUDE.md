# StudyPlay — заметки для Claude Code

Static site (no build, no Node) served by GitHub Pages from `main` of `alantesterr/testerw`.
Full human guide: `docs/ДЛЯ-РАЗРАБОТЧИКА.md` (Russian). The owner and users write in Russian; answer in Russian, simply.

- Run locally: `python3 -m http.server 8099` → http://localhost:8099 (Service Worker `sw.js` caches files: hard-reload or unregister it while testing).
- Everything hangs off `window.SP`; one file per section in `js/features/`, registered with `SP.views.register`.
- All UI text goes to `js/i18n/ru.js` (kk/en fall back to ru). Use `SP.t`, `SP.icon`, `SP.esc`.
- On every change: bump the same `?v=` on every script/style in `index.html`; add a `NEWS` entry and update the chapter in `js/data/guide.js`; add a short note to `docs/КАК-ПОЛЬЗОВАТЬСЯ.md`.
- Do not change the look of «Оценки» (Shokan style) or the Shokan schedule view unless asked.
- Never commit passwords, tokens or keys. The GitHub token is pasted by its owner into the site, never into files.
- Before risky changes create a save point: `git tag backup-YYYY-MM-DD-name && git push origin <tag>` (keep at most 4 `backup-*` tags).
- Content (groups, schedules, subject files, cards) lives in `data/`; see the manifest format in `docs/ДЛЯ-РАЗРАБОТЧИКА.md`.

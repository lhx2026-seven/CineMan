# CineMan development

This static site serves `game-runtime.js`, generated from the game source scripts. Edit the source scripts, not the generated file.

After changing any game runtime source or game.css, run `node scripts/build-game-runtime.cjs`. It rebuilds the runtime and updates the HTML, homepage preload URLs, and content hashes together. Verify with `node scripts/build-game-runtime.cjs --check` before publishing. The source list is in that script.

After changing data/cinemas.json, also run `node scripts/build-cinema-data.cjs` before rebuilding the runtime.

Use the existing browser tests for the affected feature. Entry regressions: `CINEMAN_BASE_URL=http://127.0.0.1:PORT node tests/entry-performance-browser.cjs`; pricing and sliders: `node tests/parameter-browser.cjs` with the same environment variable. Both require a local static server, Playwright and Chromium.

After changing data/source/Event.xlsx or data/event-rules.json, run `python3 scripts/import-events.py` (requires openpyxl), then rebuild the runtime. Check with `python3 scripts/import-events.py --check`. Event regressions: `node tests/event-rules.cjs`, `node tests/events-settlement.cjs`, and `tests/events-browser.cjs` / `tests/events-season-browser.cjs` with CINEMAN_BASE_URL. Baseline component browser tests may use tests/helpers/isolate-random-events.cjs; event tests must exercise the actual pool.

# CineMan development

This static site serves `game-runtime.js`, generated from the game source scripts. Edit the source scripts, not the generated file.

After changing any game runtime source or game.css, run `node scripts/build-game-runtime.cjs`. It rebuilds the runtime and updates the HTML, homepage preload URLs, and content hashes together. Verify with `node scripts/build-game-runtime.cjs --check` before publishing. The source list is in that script.

After changing data/cinemas.json, also run `node scripts/build-cinema-data.cjs` before rebuilding the runtime.

Use the existing browser tests for the affected feature. Entry regressions: `CINEMAN_BASE_URL=http://127.0.0.1:PORT node tests/entry-performance-browser.cjs`; pricing and sliders: `node tests/parameter-browser.cjs` with the same environment variable. Both require a local static server, Playwright and Chromium.

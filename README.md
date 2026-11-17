# CineMan

靜態電影院經營遊戲。正式網站：https://lhx2026-seven.github.io/CineMan/

## 程式與資料

| 位置 | 用途 |
| --- | --- |
| `index.html`、`app.js`、`home-save.js` | 首頁、戲院選擇與續玩 |
| `game.html`、`game.js`、`game.css` | 遊戲介面、週進程與年度圖片切換 |
| `films.js`、`*-rules.js` 及其他根目錄模組 | 排片、事件、營運與財務規則 |
| `autosave.js` | IndexedDB存檔 |
| `data/source/` | 原始Excel資料 |
| `data/` | 執行資料與匯入設定 |
| `assets/films/` | filmID對應WebP海報 |
| `assets/cinemas/` | 戲院圖片：landscape、counters、tickets、projection及optimized響應圖 |
| `docs/` | 各項規格、規則與變更紀錄 |
| `scripts/` | 資料匯入、圖片及runtime建置 |
| `tests/` | 規則與Playwright瀏覽器檢查 |

當前年份圖片配置見 [docs/year-visuals.md](docs/year-visuals.md)。部分早期介面文件保留歷史描述；判斷現況時需核對現行程式與對應測試。

## 修改與檢查

先閱讀 [AGENTS.md](AGENTS.md)。`game-runtime.js`為產物，不直接編輯。修改來源或CSS後執行：

```bash
node scripts/build-game-runtime.cjs
node scripts/build-game-runtime.cjs --check
git diff --check
```

提交時包含建置連動更新的HTML、首頁預載與版本碼。資料匯入指令依AGENTS.md及各規則文件；`node scripts/build-cinema-responsive.cjs`可由保留原圖重建其列出的響應圖（需要ImageMagick）。

瀏覽器測試需Playwright、Chromium及靜態伺服器：

```bash
python3 -m http.server 8162
# 另一個終端
CINEMAN_BASE_URL=http://127.0.0.1:8162 node tests/year-visuals-browser.cjs
CINEMAN_BASE_URL=http://127.0.0.1:8162 node tests/entry-performance-browser.cjs
```

依修改範圍執行對應規則及瀏覽器測試。圖片歷史保留於Git，不把已取代的每版圖片持續放在目前資產目錄。

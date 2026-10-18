# 第一層戲院選擇

啟動：`python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace/CineMan`。頁面透過 fetch 讀取 JSON，請透過 HTTP 開啟。

`assets/cinemas/` 保留使用者 cinema_design_cut.zip 的十張原始 JPG：每家各有 exterior（外觀）與 interior（內裝），原始檔保留作參考；目前頁面改用 landscape 子目錄的重新生成圖片。

`data/cinemas.json` 轉錄使用者提供的 CinemasList.xlsx、LocationsList.xlsx、ScreensList.xlsx 第一張工作表，保留非空白欄名、原始欄名、null、布林與 normal；略過整列空白與無欄名的空白欄。共 31 筆戲院配置、8 筆地點、13 筆影廳類型。不是後端資料庫。

關聯：C01=baogong=寶宮、C02=century=世紀、C03=broadway=布洛威、C04=ylc=YLC、C05=arthouse=公會堂。cinemaID 對應 LocationsList 的 cinemaID_Cxx_applicable 欄。只有 true 顯示為適用，空白代表不適用（使用者已確認）。CinemasList 的 screens 是可選廳數，不是連續範圍；依 Excel 取代原 HTML 的概略數值。影廳類型 A/B/C/D/EXTRA 可對應 ScreensList.type，但目前不生成實際配置，也不推算座位總數。

第一層僅保留 cinemaID（localStorage: cineman.selectedCinema），可改選並顯示摘要；第二層與跨裝置儲存未實作。儲存不可用時仍可在本頁選擇。

使用者已確認：影廳資料以 Excel 為準；normal 代表常態分布；LocationsList 空白代表否定（不適用）。目前保留 normal 原值，不生成隨機配置。實作時仍需定義常態分布的平均值、標準差、取值範圍及離散化方式；第二層進入流程也尚待定義。原頁土地與租金敘述缺少 Excel 依據，因此不作為配置資料展示。

玩家卡片依序展示外觀圖、戲院名稱與類型及選擇鈕、內裝圖，不使用圖片切換按鈕。影廳選項與適用地點不在卡片或選擇摘要中顯示；完整規則仍保留在 data/cinemas.json，以 cinemaID 關聯。

目前使用 assets/cinemas/landscape/ 的十張 AI 重新生成圖片，原生比例 2:1、尺寸 1774×887，依照原本戲院風格重新安排入口／銀幕與座席的橫幅構圖。網頁採 WebP（quality 88），十張合計約 2.8 MiB，未使用舊版 scale 放大補償。桌面版也使用 2:1 圖片比例。

手機版（寬度 760px 以下）採用上下橫幅裁切，卡片高度為 min(520px, 100svh - 32px)，中間名稱與選擇鈕保留自動高度，圖片分配剩餘空間。一般直式手機畫面使用接近原生 2:1 橫幅構圖、置中顯示；極短或極寬的畫面仍會依容器作適量裁切。已驗證 320×568、375×667、390×844、430×932、740×360 的單卡高度與選擇操作。

圖片微調：布洛威外觀改為帶有使用年歲的商業辦公大樓與多幅巨型電影海報；YLC 外觀保留原建築，在屋頂附近加上 YLC 發光招牌。兩張使用 -v2.webp 新檔名；index.html 的 app.js 加上版本參數以避免沿用舊程式快取。部署透過 GitHub Pages 的 main 分支自動執行；推送成功與部署成功需分別確認。

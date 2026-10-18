# 第一層戲院選擇

啟動：`python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace/CineMan`。頁面透過 fetch 讀取 JSON，請透過 HTTP 開啟。

`assets/cinemas/` 保留使用者 cinema_design_cut.zip 的十張原始 JPG：每家各有 exterior（外觀）與 interior（內裝），未重新裁切或生成。

`data/cinemas.json` 轉錄使用者提供的 CinemasList.xlsx、LocationsList.xlsx、ScreensList.xlsx 第一張工作表，保留非空白欄名、原始欄名、null、布林與 normal；略過整列空白與無欄名的空白欄。共 31 筆戲院配置、8 筆地點、13 筆影廳類型。不是後端資料庫。

關聯：C01=baogong=寶宮、C02=century=世紀、C03=broadway=布洛威、C04=ylc=YLC、C05=arthouse=公會堂。cinemaID 對應 LocationsList 的 cinemaID_Cxx_applicable 欄。只有 true 顯示為適用，空白代表不適用（使用者已確認）。CinemasList 的 screens 是可選廳數，不是連續範圍；依 Excel 取代原 HTML 的概略數值。影廳類型 A/B/C/D/EXTRA 可對應 ScreensList.type，但目前不生成實際配置，也不推算座位總數。

第一層僅保留 cinemaID（localStorage: cineman.selectedCinema），可改選並顯示摘要；第二層與跨裝置儲存未實作。儲存不可用時仍可在本頁選擇。

使用者已確認：影廳資料以 Excel 為準；normal 代表常態分布；LocationsList 空白代表否定（不適用）。目前保留 normal 原值，不生成隨機配置。實作時仍需定義常態分布的平均值、標準差、取值範圍及離散化方式；第二層進入流程也尚待定義。原頁土地與租金敘述缺少 Excel 依據，因此不作為配置資料展示。

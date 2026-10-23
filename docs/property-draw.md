# 地點、土地權屬與空間首抽

`property-rules.js` 使用與影廳、餐飲獨立的四條具種子亂數流。資料來源為原 LocationsList 匯入的 `data/cinemas.json.locations`，不新增網路請求。

## 機率

- 地點只接受 `cinemaID_Cxx_applicable === true`，空白／null 不適用；適用地點間等機率。
- 自有土地：YLC 1%、布洛威 3%、其餘三家 5%；承租為各自剩餘機率，與地點、空間獨立。
- 有可活用空間 33%，沒有 67%；沒有時 activationType=null，不顯示收費欄。
- 寶宮／世紀抽中空間後，旅社條件機率 1%（整體約 0.33%），電子看板機率為 0%，商場、娃娃機、停車場各 33%。使用者已確認此條件機率。
- 布洛威／YLC 不會抽到旅社，四種一般類型各 25%。公會堂不會抽到旅社或電子看板，商場、娃娃機、停車場各 1/3。

| 活化類型 | 單位 | min | max | step |
| --- | --- | ---: | ---: | ---: |
| 商場櫃位租金 | 每月租金 | 20,000 | 100,000 | 5,000 |
| 娃娃機台租金 | 每月租金 | 10,000 | 100,000 | 2,000 |
| 停車場收費 | 每小時收費 | 10 | 100 | 5 |
| 電子看板廣告費 | 每秒收費 | 0.5 | 3 | 0.5 |
| 電影院主題旅社收費 | 每晚收費 | 500 | 10,000 | 500 |

收費使用既有拉條樣式，初始 min，顯示類型與單位。這是收費設定，尚未計算實際收入；不同單位不可直接加總至每週五項行政支出，故每週預算合計維持只加五項支出。

## 保存與還原

checkpoint 的 `property` 保存 version、cinemaID、runId、locationID、tenure（owned/rented）、hasSpace、activationType、rentalActive、realEstateTaxActive；收費存於 values.activationRate。新局重抽，同局讀檔／重新整理固定。可用地點、權屬旗標與類型均驗證；不相容的現有資料不以重抽掩蓋。

舊存檔缺 property 時，以既有局種子補入新欄位，不改動既有影廳／座位或其他設定；ON 時寫回 checkpoint，OFF 時仍由同一種子重現。

承租啟用 rentalActive；自有啟用 realEstateTaxActive 並停用 rentalActive。旗標同時放在 financial-report 的 data 屬性供後續公式使用。租金已依總座位數、區位係數及隨機係數固定計價，每4週出帳，詳見rent-expense.md；活化收入見space-income.md。管理費與不動產稅仍待公式。

## 驗證

- `node tests/property-rules.cjs`：五家各 50,000 局、共 250,000 局；檢查地點白名單、分布、權屬、空間、旅社條件機率、其他類型分布、確定性與不相容資料。
- `CINEMAN_BASE_URL=http://127.0.0.1:8000 node tests/property-browser.cjs`：五種類型的 min/max/step／單位、無空間隱藏、權屬旗標、讀檔與繼續經營、舊檔補欄位、原影廳不重抽、五項預算不混加收入、320／390／1440px 無溢出。
- 進場測試確認仍只載入單一 runtime，新局不等待存檔讀取，也無新增資料庫 fetch。

原始程式碼變更後執行 `node scripts/build-game-runtime.cjs`，並用 `--check` 確認產物與預載網址同步。

後續機率調整只適用新抽選；已有存檔的電子看板保留，不重抽其他場地資料。

自有土地機率：YLC（C04）1%、布洛威（C03）3%，寶宮／世紀／公會堂維持5%。既有快照權屬保持原抽值，不重新抽選。

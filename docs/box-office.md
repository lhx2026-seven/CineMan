# Gross box office and delayed weekly recognition

Implemented after confirmation of round-to-nearest viewers, round-to-nearest whole NT$ gross, and uncapped location-specific special-session baseline. Gross receipts remain independent from distributor deductions and food/merchandise income. Distributor net is implemented in distributor-rules.js (see distributor-income.md); expense settlement, tax, profit and cash balance remain pending.

## Regular sessions

Cinema average standard ticket:
- C01/C03/C04: (full + mean(full−30, full−60, full×0.5)) / 2.
- C02: entered price / 1, / 2, or / (screenCount×2), for single/double/unlimited respectively.
- C05: full price only.

Weight standard and EXTRA hall prices by actual seat counts. EXTRA prices are entered per format but repeated for every physical hall of that format when calculating both seat weighting and >500 attendance penalties. `weightedAveragePrice = sum(hallSeats × applicableHallPrice) / totalSeats`.

For each film currently showing:
1. Determine its own current-week raw attendance from the saved opening date and fixed run seed.
2. For ordinary films, apply the initial location factor, then current location cinema adjustments, then tier adjustments, and clamp [0,1], then cumulative ticket penalties and clamp again. C05 then multiplies hit by 0.5 or average by 1.5, clamping once more; bomb is unchanged. This applies to both featured and non-featured films. Special-tier films retain their raw profile and bypass all attendance modifiers.
3. Featured film uses exactly its selected screening share; all other still-showing films equally divide the remainder. Retired films do not share it. If no new releases are available, remaining films divide sessions equally. A single featured film does not automatically override its selected share to 100%.
4. `dailyViewers = round(effectiveAttendance × totalSeats × 6 × filmShare × marketingFactor)`.
5. `weeklyRegularGross = dailyViewers × weightedAveragePrice × 3`. Retain fractional money internally until final film-week rounding.

## Special sessions

Extra sessions do not consume regular sessions. Location baseline B is150 at LOC01,50 at LOC06/LOC08,100 elsewhere, including special-tier films. At400: baseline B viewers. At 410–500: baseline B × raw current-week attendance. At 510–600: baseline B × raw attendance ×0.70. Multiply this unrounded viewer baseline by the marketing factor, then round once (see Marketing audience factor below). Prices use 10-unit steps. No ordinary location attendance adjustment, ticket penalty, hall-size cap or three-day multiplier applies; the location changes only the special-session baseline. Each selected session occurs once; add up to five. C02 and C05 remain excluded from this feature.

For each film, `weeklyGross = round(weeklyRegularGross + sum(specialSessionViewers × specialSessionPrice))`. Sum these integer film grosses for the week's gross. Rounding uses a tiny floating-point error correction so values such as 33.49999999999999 mathematically representing 33.5 round to 34.

## Weekly progression and storage

W1 report shows 0 before any receipt exists. Advancing from W1 to W2 settles W1 using its saved opening history and current settings, then recognizes that receipt in W2. All films and special sessions follow this one-week delay. Per-film cumulative gross and annual gross are recognized on the same receipt date. The game closes W50 in a virtual W51 meeting before releasing next-year films. That receipt carries accountingYear for the closing year and is not recognized again in next-year W1. Historical untagged receipts retain their original booking-year attribution.

The pure advance operation builds a new ledger and movie state, without mutating originals. Ledger validation rejects duplicate/out-of-order receipts, inconsistent sums and mismatched cumulative totals. It prevents settling the same source week twice. The UI prevents double-click progression, clears the next week's featured selection and special-session selections, and keeps ticket prices and other management settings. No new film choice is selected automatically. Movies retire before their next operating week; special events are announced at the beginning of their triggering week. All existing location, tenure, hall allocation and exclusive food metadata remain unchanged.

Checkpoints include `boxOffice` and movie retirement dates. Reload/Continue validate and restore both; they do not re-run settlements. Legacy preview saves gain an empty ledger without inventing past income. Auto Save OFF continues to mean no persistent game save; progress can be lost on refresh/closing unless it is enabled.

Weekly report now fills gross ticket revenue only. The annual ticket row is explicitly labeled gross to avoid presenting pre-split income as post-split income. Other revenue, costs, after-split ticket revenue, profits and taxes remain pending. Existing palette, tabs and cinema visuals are retained.

Tests: `node tests/box-office.cjs`; `CINEMAN_BASE_URL=http://127.0.0.1:PORT node tests/box-office-browser.cjs`. Also run entry, movie-pool and property-save browser regressions when relevant.

## Carry last week's featured film

From operating week 2, an additional manual choice permits carrying last week's featured film, without replacing either new-release slot. It is offered only if the exact previous source-week receipt identifies that film, it remains showing, and no earlier settled receipt marks that film extended. The original opening date, attendance decline and retirement rules remain unchanged.

The carried film takes the selected featured share; every other surviving title divides the remainder, subject to the Baogong cap below. Draft selection, switching away, reload and Continue do not consume the right. Only actual weekly settlement records featuredID and extendedFeatured in the receipt. The per-film right is therefore consumed at most once in the run, persists in saves and is validated when loading.

Older receipts without featuredID remain valid. When there are at least three films and exactly one screening-share outlier, the previous feature is recovered from the former equal-remainder rule. Equal-share or two-film cases are ambiguous and are never guessed; for those saves, the option becomes available after the next normal settlement records a known feature.

Tests: `node tests/box-office.cjs` and `tests/carry-feature-browser.cjs`.

The weekly regular-session multiplier is now 3 (previously 4). This applies to future settlements only; already booked receipt amounts are preserved, not recalculated.

## Mandatory low-gross retirement

At the beginning of each operating week, any still-showing film whose **immediately previous week's** finalized gross is below NT$2,000 is forced off. Exactly NT$2,000 survives this specific check. Gross includes that week's regular and special-session income and uses the already rounded per-film amount in the receipt. Lifetime cumulative gross is irrelevant, even if very high.

This mandatory rule overrides normal/special minimum-run protections; the existing scheduled/probabilistic retirement rules still apply to survivors. The film is marked retiredAt=currentWeek with retirementReason=low-gross. It is removed from remaining screening shares, special-session choices and carry-feature eligibility. A retired MV0503 cannot trigger its opening-week-4 event later.

Only films present in the previous source-week receipt are considered. Newly drawn movies with no prior-week operation are not mistaken for zero-gross films. Weeks without a historical receipt (legacy preview saves) do not invent an income result or trigger this rule. Existing saves apply the same check on load using their stored previous-week receipt, preserving all booked money and cumulative totals; no recalculation is performed.

Tests: `node tests/box-office.cjs` and `tests/low-gross-browser.cjs`.

## Second-run featured share steps

C02 世紀 uses 2 share-grid units per allocated hall: each step is 100% / screenCount / 2. Other cinemas retain 6 units per hall. New weeks default to capacity−1, the highest step below 100%. This changes the share slider only: the daily gross formula still uses totalSeats × 6.

The same shared capacity helper drives UI percentages and settlement. Snapshots record featuredCapacity. Legacy six-unit C02 saves convert the old ratio to the nearest new grid step; an old default converts specifically to the new below-100 default. Already booked receipts are not recomputed.

Tests: `node tests/films.cjs`, `tests/second-run-share-browser.cjs`.

## Cinema scheduling limits

非單廳戲院採「新片＋同步上映」期望片量，包含當週實際抽到的新片：寶宮4–6部、布洛威8–10部、YLC 10–15部；世紀為約5/3～2倍廳數（下限ceil(廳數×5/3)、上限廳數×2），故2廳4部、3廳5–6部、4廳7–8部、6廳10–12部。公會堂與所有單廳不新增片量目標。

每週先依上週實際票房執行＜2,000元強制下片，保留MV0003在W2必下的規則，再以兩個原本新片池正常抽選（片池不足仍允許少於2部）。新片加入後，依上週單片票房由低到高處理已符合原隨機下片資格的舊片：片量高於下限時沿用原隨機機率；達下限就保護剩餘影片，讓較強舊片留下。仍超過上限時優先淘汰符合下片資格的較弱舊片。非寶宮不為強制達標提早淘汰尚未符合年齡門檻的普通／special片，可能暫時超過上限；開局、強制下片與片池不足也可能低於下限，不補造／復活電影。寶宮原本即有獨立結構性片數限制，非單廳正常上限由3／4放寬為6，保留當週新片及最強舊片，玩家指定沿用的主打仍優先保留。

單廳寶宮沿用原規則：兩部新片＋上週票房最高的舊片；第二部舊片須上週至少2,000元且達最高舊片票房50%，最多四部。這個舊的50%第四片條件不再限制非單廳寶宮。既有單廳開局不放MV0001–MV0003規則不變。

Above 80% featured share the existing two-film exception takes priority: keep the feature and its surviving same-opening-week companion, then newest-film fallback. Initial old films are not treated as newly opened companions even when their stored dates match W1. Never revive retired films or add titles just to fill slots. Excess films receive zero regular AND special-session gross this operating week and are permanently retired at the source week with reason baogong-focus; their zero receipt rows and retirement dates survive reload. Hard low-gross retirement retains priority; random retirement now respects the applicable soft lineup floor. A good prior gross does not revive an already retired title.

C02 above 60% featured share halves non-featured ordinary-film attendance. C01 above 80% does the same to its surviving ordinary secondary. C03/C04 above 80% featured share multiply only the featured ordinary film attendance by 0.75; non-featured films are unchanged. Special sessions still use raw attendance. Any cinema with more than 7 halls and featured share strictly above 50% multiplies only the featured ordinary film attendance by 0.25. This stacks multiplicatively with the C03/C04 >80% factor (0.75×0.25=0.1875). Exactly 7 halls or 50% does not trigger it. Non-featured films, special-tier films and special sessions are exempt from this new rule. Exact thresholds do not trigger the penalty. Special-tier films bypass the attendance penalty, but remain subject to Baogong's structural film cap and mandatory retirement. Remaining screening share is divided only among survivors. Already booked receipts are never recalculated.

Tests: node tests/scheduling-weights.cjs, plus the box-office and location/ticket suites.

Retention thresholds and ledger integration: `node tests/baogong-retention.cjs`; new lineup goals: `node tests/lineup-targets.cjs` and `tests/lineup-targets-browser.cjs`.

## Featured-share ceiling

C03/C04/C05 (布洛威/YLC/公會堂) cannot select 100% featured share. Keep the range max and right-end label at the full capacity (100%), but clamp interactive and restored values to capacity−1. Settlement validates the same ceiling. C01/C02 still permit 100%. Previously booked receipts remain unchanged. Test: tests/featured-share-limit-browser.cjs.

## Marketing audience factor

For ordinary films, C01/C03/C04 marketing=0 gives factor0.5; C02 marketing>10000 gives factor1.1; C05 marketing>10000 gives factor2 only to average films; otherwise1. Exactly10000 gives no bonus. All special-tier movies have factor1. Apply to both featured and non-featured titles. Missing marketing defaults to0, matching the form minimum.

Multiply unrounded general-session viewers and each special session's unrounded location-baseline viewers by this factor before rounding once. At400 a zero-marketing ordinary-film special session gets half its location baseline; special-tier films retain the full location baseline. Do not change raw attendance or double-round viewers. C02/C05 special-session closure and forced-retirement zero revenue remain intact. Marketing acts on people after attendance modifiers, with no extra seat-cap clamp; it is not an attendance percentage-point adjustment. Receipts retain marketingFactor for audit. Existing posted receipts are preserved; marketing expense settlement remains pending.

Test: node tests/marketing-attendance.cjs.

## Annual ticket-price window

Only operating W1 of each 50-week year allows ordinary ticketFull, secondRunPrice, secondRunMode and all EXTRA hall prices to change. Other weeks disable and gray those controls, preserving values in snapshots and settlement. Derived student/morning/accessibility prices remain visible and computed from the locked full price. Each following year's W1 unlocks automatically without resetting prices. Food, merchandise and extra special-session prices retain their existing adjustability. Tests: tests/annual-ticket-lock-browser.cjs.

## Final attendance floor

After all attendance and scheduling adjustments, apply max(rate,0.001) for films still showing with positive screening share. Forced-off films retain zero attendance and revenue. This is an attendance floor, not a one-viewer or minimum-revenue guarantee: marketing remains an audience multiplier before integer viewer rounding, so tiny allocations can still round to zero. The <2000 prior-week retirement rule is unchanged. Special sessions keep raw attendance. Posted receipts are not recomputed. Test: tests/attendance-floor.cjs.

## Second-run player visibility

C02 世紀 hides cumulative box-office lines below both new-release and retained-film posters. Weekly and annual whole-cinema aggregates remain visible. Its annual meeting also omits the per-film Top5 list, so player-facing reporting remains aggregate-only. Internal per-film receipts, cumulative totals, ranking helpers, retirement and carry rules continue to operate unchanged. Other cinemas retain per-film displays. Test: tests/second-run-revenue-visibility-browser.cjs.


片量調整僅影響之後的營運週；已下片者、已入帳票房、歷史帳本不回算。每部片的retiredAt（含null保護狀態）繼續使用既有存檔欄位，讀檔不重抽隨機下片。W50會議期間不抽新片、不做下一週片量調整；開始下一年度時以同一戲院、廳數執行一次。每週僅對仍上映的少數影片排序，無迴圈抽到達標、無額外圖片或資料庫讀取。

主打片場次占比不得為0，最低為1個有效刻度（世紀100%／廳數／2，其餘100%／廳數／6）。舊存檔0刻度載入時提升至1，不回算已入帳票房；結算也拒絕0刻度。既有各戲院上限及預設值不變。

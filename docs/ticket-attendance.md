# Ticket-price attendance deductions

Rates are decimals. Deductions are percentage points, deterministic, and cumulative.

- C01 寶宮 / C03 布洛威 / C04 YLC: full price strictly >350 deducts 0.50.
- C02 世紀: secondRunMode=single (一票單片) deducts 0.50; double/unlimited do not.
- C05 公會堂: full price strictly >200 deducts 0.05.
- All cinema types: count physical special halls priced strictly >500; deduct that count / total screenCount. Two qualifying halls out of ten deduct 0.20, not 0.002. A hall priced exactly 500 does not qualify.

若本週硬體維護預算嚴格大於「一般廳數×5,000＋特殊廳數×10,000」，上述全部票價扣減幅度減半，再扣除並限制上座率範圍；等於門檻維持原懲罰。一般廳數＝總廳數－實際EXTRA廳數，所有特殊廳均計入維護門檻，與其是否超過500元無關。

| 懲罰 | 維護達標後 |
|---|---|
| 寶宮／布洛威／YLC全票＞350元 | 減25個百分點 |
| 世紀一票單片 | 減25個百分點 |
| 公會堂全票＞200元 | 減2.5個百分點 |
| 超價特殊廳數／總廳數 | 原扣減幅度×0.5 |

例如10廳中2廳為特殊廳，維護門檻60,000元；須＞60,000元才減半。如果2個特殊廳均超價，扣減由20降至10個百分點。此減半不影響排片、行銷、區位或特殊場的獨立規則。

`CinemaMovieRules.ticketAttendance(context)` accepts a base attendanceRate, cinemaID, actual screenCount, ticketFull (except C02), secondRunMode (C02), maintenance (defaults to 0), and specialHallPrices. The latter array has one price per physical EXTRA hall, never one entry per price-field/format. Two VIP halls sharing the same 600 price must produce [600,600]. Normal halls do not belong in this array. If there are no special halls, use [].

`effectiveAttendance(movie, record, week, seed, venue, pricing)` returns special-tier attendance unchanged; for ordinary films it composes current-week attendance → initial location factor → location cinema/tier adjustments with 0–100% clamp → cumulative ticket-price deductions with 0–100% clamp. Omitting pricing preserves the earlier location-only helper behavior. Future financial calculation must supply actual saved prices, not omit pricing or rely on defaults. Inputs and the original first-week base are not mutated.

The eventual formula is average ticket price × final effective attendance × total seats × 6 × film screening share. Do not multiply by location_weight or ticket_price_weight again: both are attendance adjustments, not extra gross-revenue factors. Average ticket-price rules remain separate from attendance penalties.

The module is used by weekly gross box-office settlement; see `docs/box-office.md`. Historical settled receipts keep their posted amounts; maintenance changes apply to future weekly settlements.

Test: `node tests/ticket-attendance.cjs`.

After ticket deductions, effectiveAttendance applies C05 tier multipliers (hit×0.5, average×1.5) and clamps to [0,1]. Standalone ticketAttendance remains the ticket deduction helper; special-tier profiles bypass these modifiers.

## 年度票價確認

每年W1按「下一週」且已完成必要排片時，先開啟置中確認卡（桌機、手機相同）。深色半透明卡片、細金邊、背景略暗，使用原生dialog進行焦點限制與背景操作阻擋。

文案：「請確認今年度電影票價」「（確認後今年度即不得再修改）」；按鈕「返回修改」「確認」。初始焦點在返回修改；返回或Esc會關閉卡片、切至銷售規劃，保留目前票價和主打選擇，不結算、不推進週次。確認才執行原每週結算並進入W2，原年度票價鎖定照常套用。其他週、年度會議、進入新年度W1時不彈出，僅W1往W2時提醒。載入失敗或未選主打造成下一週不可用時，不顯示確認卡。卡片本身不啟動計時器或新增存檔狀態。

驗證：tests/annual-ticket-lock-browser.cjs（五戲院、390/1440px置中、返回/Esc、結算、重載鎖價、隔年再次確認及W2免提醒）。

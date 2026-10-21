# Ticket-price attendance deductions

Rates are decimals. Deductions are percentage points, deterministic, and cumulative.

- C01 寶宮 / C03 布洛威 / C04 YLC: full price strictly >350 deducts 0.50.
- C02 世紀: secondRunMode=single (一票單片) deducts 0.50; double/unlimited do not.
- C05 公會堂: full price strictly >200 deducts 0.05.
- All cinema types: count physical special halls priced strictly >500; deduct that count / total screenCount. Two qualifying halls out of ten deduct 0.20, not 0.002. A hall priced exactly 500 does not qualify.

`CinemaMovieRules.ticketAttendance(context)` accepts a base attendanceRate, cinemaID, actual screenCount, ticketFull (except C02), secondRunMode (C02), and specialHallPrices. The latter array has one price per physical EXTRA hall, never one entry per price-field/format. Two VIP halls sharing the same 600 price must produce [600,600]. Normal halls do not belong in this array. If there are no special halls, use [].

`effectiveAttendance(movie, record, week, seed, venue, pricing)` composes current-week normal/special attendance → location rule with 0–100% clamp → cumulative ticket-price deductions with 0–100% clamp. Omitting pricing preserves the earlier location-only helper behavior. Future financial calculation must supply actual saved prices, not omit pricing or rely on defaults. Inputs and the original first-week base are not mutated.

The eventual formula is average ticket price × final effective attendance × total seats × 6 × film screening share. Do not multiply by location_weight or ticket_price_weight again: both are attendance adjustments, not extra gross-revenue factors. Average ticket-price rules remain separate from attendance penalties.

The module is used by weekly gross box-office settlement; see `docs/box-office.md`. After-split ticket revenue and other income/expenses remain pending.

Test: `node tests/ticket-attendance.cjs`.

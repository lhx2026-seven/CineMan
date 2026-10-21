# Location attendance adjustment

Attendance rates use decimals (40% = 0.4). Additions/subtractions are percentage points, not relative multipliers. For ordinary films, multiply current-week raw attendance by the initial location factor first, then apply the adjustment below and clamp to [0, 1]. Initial factors: LOC01=1, LOC02=1, LOC03=0.8, LOC04=0.9, LOC05=0.8, LOC06=0.6, LOC07=0.7, LOC08=0.6. Even the ordinary W5+ 1% uses this factor. All six special-tier films bypass location, ticket and scheduling attendance adjustments and retain their own current-week profile. Do not modify the remembered first-week base.

| Location | Condition | Adjustment |
|---|---|---|
| LOC01 都會區舊城 | C01 寶宮 or C05 公會堂 | +0.50 |
| LOC02 都會CBD | hit | ×1.75 |
| LOC03 都會中心社區 | C02 世紀 | +0.25 |
| LOC04 城郊社區 | hit | +0.50 |
| LOC05 衛星城市 | hit and screenCount < 4 | ×1.5 |
| LOC06 新市鎮 | bomb or average | ×0.5 |
| LOC07 中型城市 | average | −0.25 |
| LOC08 小城鎮 | all films and cinema types | ×0.5 |

Unmatched conditions leave the initial-factor-adjusted rate unchanged. These rules are deterministic; they supersede the earlier placeholder of randomly drawing location_weight ranges. The first-draw property.locationID, cinemaID, actual allocated screenCount and movie tier are the inputs, not player-entered values.

`CinemaMovieRules.locationAttendance(context)` applies just the adjustment. `effectiveAttendance(movie, openingRecord, absoluteWeek, runSeed, venue)` first obtains current-week attendance; special-tier profiles return directly, while ordinary films apply location rules. No additional random draw is introduced and neither helper mutates the opening record or location.

For the eventual box-office calculation, use:

    daily gross = average ticket price × final effectiveAttendance × total seats × 6 × film screening share

Do not multiply by location_weight or ticket_price_weight again: pass pricing to effectiveAttendance so both attendance effects are included. See `docs/ticket-attendance.md`. For example, base 40% plus 50 points becomes 90%; hit 80% ×1.75 becomes 100%; average 10% minus 25 points becomes 0%.

The calculation module is used by weekly gross box-office settlement; see `docs/box-office.md`. Other financial formulas remain pending, and no invented results are displayed.

Test: `node tests/location-attendance.cjs`.

C05 公會堂 additionally multiplies hit attendance by 0.5 and average by 1.5 in effectiveAttendance, after location and any ticket-price adjustments, then clamps to [0,1]. This applies to featured and non-featured films; bomb and special are unchanged. locationAttendance itself still represents only location rules.

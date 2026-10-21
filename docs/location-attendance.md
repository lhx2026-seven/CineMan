# Location attendance adjustment

Attendance rates use decimals (40% = 0.4). Additions/subtractions are percentage points, not relative multipliers. Apply the location rule to the film's own current-week attendance, after its ordinary decline or special profile; then clamp to [0, 1]. Do not modify the remembered first-week base.

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

Unmatched conditions leave the original rate unchanged. These rules are deterministic; they supersede the earlier placeholder of randomly drawing location_weight ranges. The first-draw property.locationID, cinemaID, actual allocated screenCount and movie tier are the inputs, not player-entered values.

`CinemaMovieRules.locationAttendance(context)` applies just the adjustment. `effectiveAttendance(movie, openingRecord, absoluteWeek, runSeed, venue)` first obtains the current week's normal/special attendance and then applies location rules. No additional random draw is introduced and neither helper mutates the opening record or location.

For the eventual box-office calculation, use:

    daily gross = average ticket price × final effectiveAttendance × total seats × 6 × film screening share

Do not multiply by location_weight or ticket_price_weight again: pass pricing to effectiveAttendance so both attendance effects are included. See `docs/ticket-attendance.md`. For example, base 40% plus 50 points becomes 90%; hit 80% ×1.75 becomes 100%; average 10% minus 25 points becomes 0%.

The calculation module is ready; financial reports and weekly settlement remain inactive pending the other unprovided formula parameters. No estimates or invented financial results are displayed.

Test: `node tests/location-attendance.cjs`.

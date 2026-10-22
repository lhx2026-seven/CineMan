# Location attendance adjustment

Rates are decimals. Apply raw current-week ordinary attendance × initial factor, then cinema adjustment, then tier adjustment; finally clamp [0,1]. Additions are percentage points. Conditions stack within a location. Special-tier movies bypass attendance modifiers, but their special-session baseline still follows the location.

| Location | Initial | Cinema adjustment | Tier adjustment | Special baseline |
|---|---:|---|---|---:|
| LOC01 | 1 | C01 ×1.5; C02 +0.10 | none |150|
| LOC02 | 1 | C03/C04 +0.20 | hit +0.20 |100|
| LOC03 | 0.8 | C02 +0.20 | hit +0.10 |100|
| LOC04 | 0.9 | C04 +0.50 | hit +0.20; average ×1.2 |100|
| LOC05 | 0.8 | C03 +0.20 | hit +0.10; average ×1.2 |100|
| LOC06 | 0.6 | C04 +0.10 | hit ×1.5 |50|
| LOC07 | 0.7 | C03 +0.10 | hit ×1.2 |100|
| LOC08 | 0.6 | none | hit ×1.5; average/bomb ×0.5 |50|

These replace the old withdrawn eight bonuses, not restore them. In particular LOC05 has no hall-count condition. Example C03 average raw40% at LOC05: (0.4×0.8+0.2)×1.2=0.624. W5 ordinary raw1% also gets the initial factor and these adjustments.

locationAttendance performs location effects only. effectiveAttendance then applies ticket penalties and C05 tier modifiers, bounded to [0,1]. Settlement applies scheduling penalties and the marketing audience factor. Special sessions use raw attendance, their location baseline and marketing factor, not ordinary attendance weights. LOC08 no-special-halls allocation is independent and remains active. Already booked receipts are not recomputed.

Tests: tests/location-attendance.cjs, tests/location-special-sessions.cjs.

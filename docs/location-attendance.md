# Location attendance adjustment

Rates use decimals (40% = 0.4). Only initial location factors are active:

| Location | Initial factor |
|---|---:|
| LOC01 | 1.0 |
| LOC02 | 1.0 |
| LOC03 | 0.8 |
| LOC04 | 0.9 |
| LOC05 | 0.8 |
| LOC06 | 0.6 |
| LOC07 | 0.7 |
| LOC08 | 0.6 |

The former second-stage eight location bonuses/penalties are withdrawn: LOC01 C01/C05 +0.50; LOC02 hit ×1.75; LOC03 C02 +0.25; LOC04 hit +0.50; LOC05 hit with <4 halls ×1.5; LOC06 bomb/average ×0.5; LOC07 average −0.25; LOC08 ×0.5. They are not applied after the initial factors.

locationAttendance returns raw current-week ordinary attendance × initial factor, bounded to [0,1]. It does not change the remembered first-week base. W5+ ordinary 1% also receives the factor. Special-tier profiles bypass all attendance modifiers. No extra random draw is introduced. effectiveAttendance subsequently applies ticket penalties and C05 hit×0.5/average×1.5, with clamping; box-office settlement applies scheduling penalties.

For example, ordinary 40% at LOC03 becomes32%, and LOC08 becomes24%. Ordinary W5 1% at LOC06 becomes0.6% regardless of hit/bomb/average. The LOC08 no-special-halls allocation constraint remains active independently. Existing posted receipts are not recalculated.

See box-office.md and 拆帳前票房公式.md for settlement order, pricing, scheduling and special exceptions. Tests: node tests/location-attendance.cjs, node tests/art-cinema-attendance.cjs.

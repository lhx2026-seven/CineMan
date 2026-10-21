# Gross box office and delayed weekly recognition

Implemented after confirmation of round-to-nearest viewers, round-to-nearest whole NT$ gross, and uncapped 100-person special-session baseline. No distributor split, food/merch revenue, expense settlement, tax, net profit or cash balance is invented.

## Regular sessions

Cinema average standard ticket:
- C01/C03/C04: (full + mean(full−30, full−60, full×0.5)) / 2.
- C02: entered price / 1, / 2, or / (screenCount×2), for single/double/unlimited respectively.
- C05: full price only.

Weight standard and EXTRA hall prices by actual seat counts. EXTRA prices are entered per format but repeated for every physical hall of that format when calculating both seat weighting and >500 attendance penalties. `weightedAveragePrice = sum(hallSeats × applicableHallPrice) / totalSeats`.

For each film currently showing:
1. Determine its own current-week raw attendance from the saved opening date and fixed run seed.
2. Apply location adjustment with [0,1] clamp, then cumulative ticket penalties and clamp again.
3. Featured film uses exactly its selected screening share; all other still-showing films equally divide the remainder. Retired films do not share it. If no new releases are available, remaining films divide sessions equally. A single featured film does not automatically override its selected share to 100%.
4. `dailyViewers = round(effectiveAttendance × totalSeats × 6 × filmShare)`.
5. `weeklyRegularGross = dailyViewers × weightedAveragePrice × 3`. Retain fractional money internally until final film-week rounding.

## Special sessions

Extra sessions do not consume regular sessions. At 400: 100 viewers. At 410–500: round(100 × raw current-week attendance). At 510–600: round(100 × raw attendance × 0.70). Prices use 10-unit steps. No location adjustment, ordinary ticket penalty, hall-size cap or three-day multiplier applies. Each selected session occurs once; add up to five. C02 and C05 remain excluded from this feature.

For each film, `weeklyGross = round(weeklyRegularGross + sum(specialSessionViewers × specialSessionPrice))`. Sum these integer film grosses for the week's gross. Rounding uses a tiny floating-point error correction so values such as 33.49999999999999 mathematically representing 33.5 round to 34.

## Weekly progression and storage

W1 report shows 0 before any receipt exists. Advancing from W1 to W2 settles W1 using its saved opening history and current settings, then recognizes that receipt in W2. All films and special sessions follow this one-week delay. Per-film cumulative gross and annual gross are recognized on the same receipt date. W50 gross is therefore booked into next year's W1 annual receipt total; both earnedAt and bookedAt are stored for future changes in annual reporting rules.

The pure advance operation builds a new ledger and movie state, without mutating originals. Ledger validation rejects duplicate/out-of-order receipts, inconsistent sums and mismatched cumulative totals. It prevents settling the same source week twice. The UI prevents double-click progression, clears the next week's featured selection and special-session selections, and keeps ticket prices and other management settings. No new film choice is selected automatically. Movies retire before their next operating week; special events are announced at the beginning of their triggering week. All existing location, tenure, hall allocation and exclusive food metadata remain unchanged.

Checkpoints include `boxOffice` and movie retirement dates. Reload/Continue validate and restore both; they do not re-run settlements. Legacy preview saves gain an empty ledger without inventing past income. Auto Save OFF continues to mean no persistent game save; progress can be lost on refresh/closing unless it is enabled.

Weekly report now fills gross ticket revenue only. The annual ticket row is explicitly labeled gross to avoid presenting pre-split income as post-split income. Other revenue, costs, after-split ticket revenue, profits and taxes remain pending. Existing palette, tabs and cinema visuals are retained.

Tests: `node tests/box-office.cjs`; `CINEMAN_BASE_URL=http://127.0.0.1:PORT node tests/box-office-browser.cjs`. Also run entry, movie-pool and property-save browser regressions when relevant.

## Carry last week's featured film

From operating week 2, an additional manual choice permits carrying last week's featured film, without replacing either new-release slot. It is offered only if the exact previous source-week receipt identifies that film, it remains showing, and no earlier settled receipt marks that film extended. The original opening date, attendance decline and retirement rules remain unchanged.

The carried film takes the selected featured share; every other still-showing title (including both new releases) divides the remainder. Draft selection, switching away, reload and Continue do not consume the right. Only actual weekly settlement records featuredID and extendedFeatured in the receipt. The per-film right is therefore consumed at most once in the run, persists in saves and is validated when loading.

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

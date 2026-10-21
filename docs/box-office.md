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
5. `weeklyRegularGross = dailyViewers × weightedAveragePrice × 4`. Retain fractional money internally until final film-week rounding.

## Special sessions

Extra sessions do not consume regular sessions. At 400: 100 viewers. At 410–500: round(100 × raw current-week attendance). At 510–600: round(100 × raw attendance × 0.70). Prices use 10-unit steps. No location adjustment, ordinary ticket penalty, hall-size cap or four-day multiplier applies. Each selected session occurs once; add up to five. C02 and C05 remain excluded from this feature.

For each film, `weeklyGross = round(weeklyRegularGross + sum(specialSessionViewers × specialSessionPrice))`. Sum these integer film grosses for the week's gross. Rounding uses a tiny floating-point error correction so values such as 33.49999999999999 mathematically representing 33.5 round to 34.

## Weekly progression and storage

W1 report shows 0 before any receipt exists. Advancing from W1 to W2 settles W1 using its saved opening history and current settings, then recognizes that receipt in W2. All films and special sessions follow this one-week delay. Per-film cumulative gross and annual gross are recognized on the same receipt date. W50 gross is therefore booked into next year's W1 annual receipt total; both earnedAt and bookedAt are stored for future changes in annual reporting rules.

The pure advance operation builds a new ledger and movie state, without mutating originals. Ledger validation rejects duplicate/out-of-order receipts, inconsistent sums and mismatched cumulative totals. It prevents settling the same source week twice. The UI prevents double-click progression, clears the next week's featured selection and special-session selections, and keeps ticket prices and other management settings. No new film choice is selected automatically. Movies retire before their next operating week; special events are announced at the beginning of their triggering week. All existing location, tenure, hall allocation and exclusive food metadata remain unchanged.

Checkpoints include `boxOffice` and movie retirement dates. Reload/Continue validate and restore both; they do not re-run settlements. Legacy preview saves gain an empty ledger without inventing past income. Auto Save OFF continues to mean no persistent game save; progress can be lost on refresh/closing unless it is enabled.

Weekly report now fills gross ticket revenue only. The annual ticket row is explicitly labeled gross to avoid presenting pre-split income as post-split income. Other revenue, costs, after-split ticket revenue, profits and taxes remain pending. Existing palette, tabs and cinema visuals are retained.

Tests: `node tests/box-office.cjs`; `CINEMAN_BASE_URL=http://127.0.0.1:PORT node tests/box-office-browser.cjs`. Also run entry, movie-pool and property-save browser regressions when relevant.

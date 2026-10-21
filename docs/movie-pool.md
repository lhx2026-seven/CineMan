# Movie database and release pools

Source: `data/source/MoviesList.xlsx` (505 titles). Run `python3 scripts/build-movie-data.py` to regenerate `data/movies.json` and `data/movies.js`, then `node scripts/build-game-runtime.cjs`. The runtime embeds the catalog; game entry makes no additional movie database request.

502 titles enter new-release selection. MV0001–MV0003 remain initial older films and are excluded from both new-release pools; single-screen starts exclude these older films entirely.

Pool 1: average + special. Pool 2: hit + bomb + special. Eligible films are selected directly with equal probability, not by selecting tier first. The first selection is recorded before drawing the second; titles never repeat within a run. Both selections count as opened, irrespective of the featured-film selection. Tiers and unlock criteria are internal and are not extra information presented to players.

## Import corrections confirmed in chat

- `must_release_by_year` is imported as `releaseYear`: only that year is eligible, and release is guaranteed within it. The three `2022 W1` entries are initial films, not guaranteed new releases.
- MV0031: releaseYear 2022. MV0032: fixed 200-week prerequisite gap.
- SR018 and SR019: minimum 8 weeks between any films in the same series; MV0052 additionally requires MV0051 and its 25–50-week gap.
- SR015: no specified first film; after any opening, draw its shared-series cooldown in the 25–100-week range.
- Explicit predecessor gaps are sampled once from an independent deterministic stream when the predecessor opens. Reaching the interval grants eligibility; the sequel is not automatically forced that week.
- Episode numbers are descriptive; only explicit previousID creates an ordering prerequisite. IDs and row order do not imply release order.

## Guaranteed scheduling and save behavior

`movie-rules.js` reserves one compatible pool slot in the specified year for each guaranteed film, using the run seed. A guaranteed film may still be randomly selected earlier in that year; its reservation then becomes unnecessary. Unreleased reserved titles are forced in their reserved slots. Optional franchise films cannot consume a same-series cooldown immediately before a reservation. These forced reservations are the exception to ordinary uniform selection, required by the guarantee rule.

The release planner uses 50 weekly draws per year; W50 is followed by the next year’s W1. Empty eligible pools return fewer films without repeating previously released titles or inventing new movies. Across five years there are 500 possible slots and 502 new titles. Total supply is sufficient by count, but pool eligibility and locked prerequisites can still cause shortages. No end year is imposed by this importer.

New runs draw new release pairs. Movie checkpoints record weeksPerYear=50. Older 52-week movie timestamps migrate without redrawing films; former W51/W52 opening dates fold into W50 of the same year. Checkpoints store `movies` (version, seed, opening history, current IDs, lastWeek). Reload/Continue restore it. Legacy placeholders new-01/new-02 map to the corresponding real first/second selection. Existing allocations, property and prices are retained. Legacy saves missing movie metadata are backfilled deterministically; no historical financial results are inferred.

## Attendance and retirement profiles

First-week hit 50–100%, bomb 1–10%, average 1–50%, inclusive integer percentage-point steps. W2 retains 50–100% of its own first-week attendance; W3 retains 25–50%; W4 retains 1–50%. Each decline is sampled separately against the first-week base, so rebound is allowed. W5 onward: weekly retirement probability 90%, attendance 1% if retained.

- MV0001, MV0002: initial attendance fixed 50%; game W3 onward 90% retirement per week.
- MV0003: initial 10%; forced off game W2.
- MV0503: opening ages W1–W4 = 50/70/90/99%; W5 onward 50% attendance and 50% retirement. At opening age W4, emit the exact user-provided land-purchase petition event text. This is a notification; no unprovided financial/land-ownership effect is invented.
- MV0504: opening ages W1–W4 = 100%; W5–W8 = 90%; W9–W12 = 50%; W13 onward 1% attendance and 90% retirement.
- MV0505: opening ages W1–W4 = 100%; W5–W8 = 80%; W9–W12 = 60%; W13 onward 1% attendance and 90% retirement.

Weekly progression is now active for movie opening, retirement, events and delayed gross box-office recognition. See `docs/box-office.md`. After-split income, other revenue and expense/net settlement remain pending.

Tests: `node tests/movie-rules.cjs`, `node tests/films.cjs`, and `CINEMAN_BASE_URL=http://127.0.0.1:PORT node tests/movie-pool-browser.cjs`. Entry performance and property save regression tests also apply.

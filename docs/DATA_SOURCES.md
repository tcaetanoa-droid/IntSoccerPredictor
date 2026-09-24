# Data sources

All data comes from **https://eloratings.net**, which serves tab-separated files with no header row. Fetch with plain HTTP GET (`requests`). Files are small (ratings ≈ 20 KB, a team history ≈ 50 KB). Be polite: cache in `data/raw/`, re-download only on demand.

## Endpoints

| URL | Content |
|---|---|
| `https://eloratings.net/World.tsv` | Current world ratings table, one row per team (244 rows) |
| `https://eloratings.net/<Team_Name>.tsv` | Full match history of a team, e.g. `Spain.tsv`, `Argentina.tsv` (spaces → `_`) |
| `https://eloratings.net/<YYYY>_<Tournament>.tsv` | Ratings table restricted to a tournament's teams, e.g. `2026_World_Cup.tsv`, `2024_Copa_America.tsv`, `2024_European_Championship.tsv` |
| `https://eloratings.net/en.teams.tsv` | Team code → English name (331 rows) |
| `https://eloratings.net/en.tournaments.tsv` | Tournament code → name (669 rows) |
| `https://eloratings.net/en.labels.tsv`, `menu.tsv`, `teams.tsv`, `tournaments.tsv` | UI/lookup files used by the site (not needed yet) |

Team file names: display name from `en.teams.tsv`, spaces → `_`, accents stripped (`Curaçao` → `Curacao.tsv`, `Bosnia and Herzegovina` → `Bosnia_and_Herzegovina.tsv`). The files are UTF-8 but served without a charset header: read `resp.content`, not `resp.text`.

Code gotchas: `SQ` = Scotland (not Slovakia), `CD` = DR Congo, `CI` = Ivory Coast, `KR` = South Korea, `BA` = Bosnia and Herzegovina, `CW` = Curaçao. Some very old rows have month/day = 0 (unknown); the parser clamps them to the 1st.

## Ratings table layout (`World.tsv`, `<YYYY>_<Tournament>.tsv`)

No header. Example row:

```
1  1  ES  2259  1  2259  7  1947  19  1806  0  +102  0  +87  0  +80  0  +102  +7  +250  +5  +303  790  341  302  147  469  138  183  1609  700
```

| Col (0-based) | Field | Confidence |
|---|---|---|
| 0 | rank | sure |
| 1 | rank (duplicate / previous) | probable |
| 2 | team code | sure |
| 3 | **current rating** | sure |
| 4, 5 | highest rank, highest rating | probable |
| 6, 7 | lowest rank, lowest rating (over some window) | probable |
| 8, 9 | another (rank, rating) pair, probably all-time low | guess |
| 10–21 | six (rank change, rating change) pairs over increasing periods (1 m, 3 m, 6 m, 1 y, …) | probable |
| 22–25 | matches, wins, draws, losses (22 = 23+24+25) | sure |
| 26–28 | three more W/D/L-like counts summing to matches (home/neutral/away?) | guess |
| 29, 30 | goals for, goals against | probable |

Only columns 2 and 3 are needed for simulation. The `2026_World_Cup.tsv` variant has 22 columns (drops the record columns) and only 47–48 rows.

## Match history layout (`<Team>.tsv`)

No header. Example rows from `Spain.tsv`:

```
1921  10  07  ES  BE  2  0  F                6   2022  1882   0   0   2   9
2026  07  19  ES  AR  1  0  WC  US   27   2259  2173   0   0   1   2
```

| Col | Field |
|---|---|
| 0, 1, 2 | year, month, day |
| 3 | home team code (first-listed team; the team whose country hosted, if not neutral) |
| 4 | away team code |
| 5, 6 | home goals, away goals (final score incl. extra time; shootouts not shown separately, treat as draw) |
| 7 | match type code (`F` friendly, `WC` World Cup, `EC` Euro, `CA` Copa América, `OG` Olympics, qualifiers etc.; see `en.tournaments.tsv`) |
| 8 | venue country code; **empty = played in the home team's country**, otherwise neutral venue in that country |
| 9 | rating points exchanged (from home team's perspective) |
| 10, 11 | home rating after match, away rating after match |
| 12, 13 | home rank change, away rank change (`−` = unranked) |
| 14, 15 | home rank, away rank after match |

Minus signs are the Unicode `−` (U+2212), not ASCII `-`. Normalise when parsing.

Pre-match rating = rating after − points exchanged (for home; + for away). This is how we reconstruct pre-tournament ratings for backtesting and fit the goals model.

## Tournament formats (for `data/tournaments/*.yaml`)

- **Euro 2028**: 9 Jun – 9 Jul 2028, hosts England, Scotland, Wales, Republic of Ireland. 24 teams, 6 groups of 4; group winners, runners-up and best four third-placed teams → R16. Qualifying draw 6 Dec 2026; finals draw not yet held. Use UEFA tiebreakers and the UEFA third-place pairing table (same structure as Euro 2024).
- **Copa América 2028**: host, dates, team count and format **not yet announced** (candidates: Ecuador, USA, Uruguay). Template on the 2024 edition: 16 teams (10 CONMEBOL + 6 CONCACAF), 4 groups of 4, top two → quarter-finals, no third-place path. Keep fully configurable.
- **World Cup 2026** (current target): 48 teams, 12 groups of 4, top two + best eight thirds → R32, 11 Jun – 19 Jul 2026. Groups are in `data/tournaments/wc2026.yaml` (inferred from match data), all 104 real results in `data/tournaments/wc2026_results.csv`, pre-tournament ratings in `data/snapshots/2026-06-10_wc2026.csv`. Hosts played true home games (venue column empty), so the site applied +100 for USA, Canada and Mexico in their own countries.

# Elo formula (eloratings.net)

Source: eloratings.net "About" page (formula text is JS-rendered; cross-checked against the
Wikipedia article "World Football Elo Ratings"). Verified September 2026.

## Rating update

```
Rn = Ro + K · G · (W − We)
```

| Symbol | Meaning |
|---|---|
| `Ro`, `Rn` | rating before / after the match |
| `W` | actual result: 1 win, 0.5 draw, 0 loss. Penalty shootout = draw (0.5). |
| `We` | expected result, `1 / (10^(−dr/400) + 1)` |
| `dr` | rating difference from this team's perspective, **+100 if this team is at home** |
| `K` | match-importance weight (table below) |
| `G` | goal-difference multiplier (table below) |

Both teams' changes are equal and opposite (zero-sum).

### K by match type

| Match type | K | eloratings.net tournament codes (see `docs/DATA_SOURCES.md`) |
|---|---|---|
| World Cup finals (and Olympics 1908–1980) | 60 | `WC` |
| Continental championship finals, major intercontinental | 50 | `EC`, `CA`, … |
| WC / continental qualifiers, major tournaments | 40 | `WCQ`, `ECQ`, … |
| All other tournaments | 30 | |
| Friendlies | 20 | `F` |

Empirical check (Sept 2026, backing K out of real rows for Spain/Argentina/England/France since
2010): `F` 20, `WQ`/`EQ` 40, `ENA`/`ENB` (Nations League A/B group games) 40, `ENL` (Nations
League finals) 50, `EC`/`CA`/`CC`/`IC` 50, `WC` 60, `NLC`/`FT`/`ADI` and other minor tournaments 30.
Also confirmed: an empty venue column means a true home game (+100), and neutral rows get 0.

### G by goal margin N

| N | G |
|---|---|
| 0 or 1 | 1 |
| 2 | 1.5 |
| ≥ 3 | (11 + N) / 8  → 3 goals 1.75, 4 goals 1.875, 5 goals 2.0 … |

### Home advantage

+100 rating points to the home side when computing `dr`. Applies only to genuine home games
(host nation playing in its own country). Neutral-venue matches get no adjustment.

## Worked example (2026 World Cup final, 19 Jul 2026, Spain 1–0 Argentina, neutral venue)

From `Spain.tsv`: `2026 07 19 ES AR 1 0 WC US 27 2259 2173 ...` → points exchanged 27,
ratings after 2259 / 2173, so ratings **before** were Spain 2259 − 27 = 2232 and
Argentina 2173 + 27 = 2200.

- `dr` (Spain's view) = 2232 − 2200 = +32 (neutral venue, no home term)
- `We(Spain)` = 1 / (10^(−32/400) + 1) = 0.546
- K = 60 (World Cup finals), G = 1 (margin 1), W = 1
- Change = 60 · 1 · (1 − 0.546) = +27.2 → Spain 2259, Argentina 2146 (site keeps ratings
  unrounded internally, so expect occasional ±1 differences on other rows)

Every row of a team history is a test case like this: reconstruct pre-match ratings, apply the
formula, compare with column 9 (points exchanged).

## Why `We` is not a win probability

`We` is the *expected score* (a win counts 1, a draw 0.5). Two equal teams have `We` = 0.5 but
P(win) is roughly 0.37 with P(draw) roughly 0.26. Sampling "random < We → win" produces no draws
and over-states wins. The simulator therefore never samples outcomes from `We` directly; outcomes
come from the Poisson scoreline. `We` is used only inside the rating update.

## Goals model (Elo difference → expected goals)

Status: **fitted** (Roadmap component 4). Parameters live in `data/model_params.yaml`; refit with
`intsoccer fit`. Code: `src/intsoccer/model/goals.py`, `fit.py`.

```
lambda_team = exp(a + b * dr_team + c * is_friendly)
```

`dr_team` is the rating gap from that team's view, including the +100 home term, so the two
teams' rates mirror each other (A uses +dr, B uses −dr). Both sides' goals are then drawn from
independent Poisson distributions with those rates.

Fit (Sept 2026): Poisson maximum likelihood on 7,526 matches from the histories of the 48 World
Cup 2026 teams, 1 Jan 2010 to 10 Jun 2026 (the World Cup itself is excluded so the backtest is
honest), friendlies included (2,650 of them).

| Parameter | Value | Meaning |
|---|---|---|
| a | 0.136 | equal teams at a neutral venue: exp(0.136) = 1.15 goals each, 2.3 per match |
| b | 0.00176 per Elo point | every +100 Elo multiplies a team's goal rate by exp(0.176) = 1.19 |
| c_friendly | −0.008 | friendlies have the same goal rates as competitive games; the simulator uses 0 |

Fitting only competitive matches gives a = 0.133, b = 0.00178: the friendlies make no
practical difference, which is why they stay in (more data, same curve).

Examples: home team +100 → 1.37 vs 0.96 goals; +400 favourite → 2.32 vs 0.57 goals.

Calibration by Elo-gap bin (from `intsoccer fit` diagnostics, chart in
`output/goals_model_diagnostics.png`): predicted and observed mean goals agree within ~0.05 for
every bin between −700 and +700; predicted win rates are within ~0.02 of observed across the
range. The one visible weakness is draws: near dr = 0 the model gives 0.28 vs 0.30 observed
(the usual independent-Poisson under-prediction; a Dixon–Coles correction is the roadmap fix if
the backtest shows it matters).

Elo `We` vs reality: at a +300 gap Elo's expected score is 0.88 while the observed score
(W + D/2) is 0.82; at +100 it is 0.70 vs 0.65. The Poisson model tracks the observed values.
This is the divergence between Elo win expectancy and real outcomes that the scoreline model
fixes.


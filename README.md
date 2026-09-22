# IntSoccerPredictor

A Monte Carlo simulator for international soccer tournaments. It rates every team with the
[World Football Elo Ratings](https://eloratings.net), turns the rating gap of each match into a
Poisson scoreline, updates the ratings as the simulated tournament unfolds, and repeats the whole
tournament 100,000 times to estimate each team's chance of winning its group, reaching each
knockout round, and lifting the trophy.

The first target is a replay of the **2026 FIFA World Cup** from the ratings as they stood on
10 June 2026, scored against what actually happened. UEFA Euro 2028 and Copa América 2028 will
run on the same code once their fields and formats are known.

## Why

I watched the 2026 World Cup and wondered how well a simple, transparent model could have called
it. Elo ratings are among the strongest public predictors of international results, and the
eloratings.net system publishes both the ratings and every match that produced them, so the
whole pipeline can be checked against real data at each step.

## How it works

For every match in a simulated tournament:

1. Take both teams' current Elo ratings (already updated by earlier simulated matches).
2. Compute the rating gap, adding 100 points to a host playing at home.
3. Convert the gap into expected goals for each side using a curve fitted to 7,526 real matches
   from 2010 to June 2026: `goals = exp(0.136 + 0.00176 × gap)`. Equal teams expect 1.15 goals
   each; every 100 rating points multiplies a team's rate by 1.19.
4. Draw both scores from Poisson distributions. Win, draw or loss follows from the score, so draws
   happen at their real frequency. Knockout ties go to extra time and then penalties.
5. Update both ratings with the eloratings.net formula `R' = R + K·G·(W − We)`, where K is 60 for
   World Cup matches and G grows with the margin of victory, then move on to the next match.

Repeat the tournament many times and count outcomes.

The fitted curve reproduces observed goals and win rates across the entire range of rating gaps.
It also shows why the scoreline model matters: Elo's own win expectancy (dashed) overstates how
often a favourite actually gets the result.

![Goals model calibration](docs/img/goals_model_diagnostics.png)

## Status

| Done | Next |
|---|---|
| Data layer for eloratings.net TSV files | Report charts and the 2026 backtest |
| Elo engine, verified against the site's own point exchanges | |
| Pre-tournament ratings for all 48 teams, groups, all 104 real results, full bracket and FIFA's 495-row third-place table | |
| Goals model fitted and calibrated | |
| Single-match simulator with extra time and penalties, and the tournament definition loader | |
| Group standings with the 2026 tiebreakers, verified to reproduce the real 32 qualifiers | |
| Knockout bracket with FIFA's third-place table, verified to reproduce all 32 real knockout pairings | |
| Full single-tournament simulation with Elo carried match to match and host home advantage | |
| Monte Carlo runner that stores every match of every simulation as Parquet | |
| Report data layer: ten views (group odds, fate table, paradoxes, most-probable bracket, reality check) as CSV/JSON | |

Details and the full component list are in [docs/ROADMAP.md](docs/ROADMAP.md).

### Website

The simulations are published at [int-soccer-predictor.vercel.app](https://int-soccer-predictor.vercel.app):
the 2026 World Cup in eight chapters — who wins it, the group stage, the bracket, the hosts, the
underdogs, the paradoxes, pick a team, and how it works. It is plain HTML, CSS and JavaScript under
`site/`, with no build step and no framework. Every number on it is read from
`site/data/wc2026/*.json`, written by `intsoccer report --site` and committed alongside the pages,
so the site never computes a statistic of its own; the views themselves are specified in
[docs/REPORTS.md](docs/REPORTS.md). Vercel deploys it from `main` through its GitHub integration,
with the project's root directory set to `site/`; every pull request gets a preview deployment.

Design: [PRODUCT.md](PRODUCT.md) holds the product truth (audience, purpose, voice, brand
commitments), `DESIGN.md` the visual system (written at the end of the restyle), and
`.impeccable/surfaces/` the per-page design briefs.

## Quick start

```bash
git clone https://github.com/tcaetanoa-droid/IntSoccerPredictor.git
cd IntSoccerPredictor
python3 -m venv .venv && source .venv/bin/activate   # keep the clone out of iCloud-synced folders
pip install -e ".[dev]"

pytest                                   # run the test suite
node --test tests/js/*.mjs               # the print engine's formulas (site/js/print.js)
intsoccer fetch --teams ES AR EN         # download current ratings and team histories
intsoccer snapshot --date 2026-06-11 --label wc2026   # ratings as of the eve of the World Cup
intsoccer fit                            # refit the goals model and draw the calibration chart
intsoccer simulate --n 100000 --seed 2026   # 100k World Cups -> output/wc2026/ (~8 min)
intsoccer report --run output/wc2026        # the report views -> output/wc2026/report/
```

Requires Python 3.11 or newer. Downloads are cached in `data/raw/` and simulation runs are
written to `output/` (neither is committed).

## Project layout

```
src/intsoccer/
  data/        fetch.py (cached downloads into data/raw/), parse.py (headerless TSVs, Unicode
               minus), schema.py (column layouts, K by match type), snapshot.py (a team's rating
               on a date = rating after its last match before it; infer_groups from fixtures)
  elo/         core.py: rating_diff (+100 home), expected_score, goal_multiplier, update
  model/       goals.py (GoalsModel, outcome_probs), fit.py (Poisson regression, diagnostics
               chart), match.py (simulate_match: scoreline, extra time, shootout, Elo update,
               vectorised over simulations)
  tournament/  format.py (load_tournament: YAML + third-place table, fully cross-validated),
               group.py (standings, tiebreaker rulesets, best-thirds ranking), knockout.py
               (bracket resolution incl. third-place table), simulate.py (one whole tournament)
  montecarlo/  run.py (n simulations, each seeded as [seed, i] so any one can be regenerated;
               matches / teams / sims Parquet tables plus a summary CSV under output/<name>/)
  report/      tables.py (views 1-8), bracket.py (most-probable bracket, reality overlay),
               build.py (writes output/<name>/report/*.csv|json); the views are specified in
               docs/REPORTS.md
  backtest/    not started
  cli.py       intsoccer fetch | snapshot | fit | simulate | report
site/               the static website (plain HTML/CSS/JS), reads site/data/<name>/*.json
data/tournaments/   wc2026.yaml (annotated schema example), wc2026_results.csv (all 104 real
                    results with pre-match ratings), wc2026_third_place_table.csv (FIFA Annex C,
                    495 rows); euro2028 / copa2028 placeholders awaiting their draws
data/snapshots/     committed rating snapshots, e.g. 2026-06-10_wc2026.csv
data/model_params.yaml   fitted goals-model parameters
docs/               formula reference, data-source reference, 2026 format rules, roadmap
tests/              pytest suite with small real-data fixtures
```

Data flow:

```
eloratings.net TSVs
    ↓  data/fetch.py (cached in data/raw/)
    ↓  data/parse.py
    ├─→ data/snapshot.py  → data/snapshots/<date>_<label>.csv   (ratings on the eve)
    └─→ model/fit.py      → data/model_params.yaml               (goals curve, pre-cutoff only)

data/tournaments/<name>.yaml + snapshot + params
    ↓  tournament/format.py   (validated Tournament)
    ↓  tournament/group.py    (standings, tiebreakers, best thirds)
    ↓  tournament/knockout.py (bracket, third-place table)
    ↓  tournament/simulate.py (one whole tournament, Elo carried match to match)
    ↓  model/match.py         (one match, vectorised over simulations)
    ↓  montecarlo/            (n runs → output/<name>/{matches,teams,sims}.parquet + summary.csv)
    ↓  report/                (output/<name>/report/: one CSV/JSON per view, charts to come)
    ↓  backtest/              (Brier / log-loss vs the real 2026 results)         [todo]
```

Tests check the code against reality wherever the data allows. `tests/fixtures/` holds small real
TSV slices; the Elo tests reconstruct pre-match ratings from them and compare the update with the
site's own points column. The match-simulator tests run 200,000 simulations and compare outcome
frequencies with the analytic Poisson probabilities. The loader tests read the real `wc2026.yaml`
and cross-check its groups against the real results and the ratings snapshot.

## Working notes

The decisions behind the code and the things that bite. Formulas are in
[docs/ELO_FORMULA.md](docs/ELO_FORMULA.md), endpoints and column layouts in
[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), the 2026 standings and bracket rules in
[docs/WC2026_FORMAT.md](docs/WC2026_FORMAT.md), the plan and status in
[docs/ROADMAP.md](docs/ROADMAP.md). Code comments point there rather than repeating them.

### Design decisions

- **Outcomes come from the scoreline model, never from Elo's win expectancy `We`.** `We` is an
  expected score, not a probability, and sampling from it produces no draws. This is the one idea
  that must survive every refactor.
- **One match, one pipeline.** Pre-match Elo, gap `dr` (+100 home), expected goals, Poisson
  scores, result from the score, Elo update with the site's formula, new ratings carried into the
  next match of *that* simulation. Every stage is a pure function so each can be checked against
  real data.
- **Reproducibility.** Every simulation takes an explicit `np.random.default_rng(seed)`. No global
  RNG state anywhere.
- **Rules live in data, not in loops.** Groups, hosts, tiebreaker ruleset, bracket and the
  third-place table are YAML/CSV under `data/tournaments/`, interpreted by `tournament/`. The
  simulator loop never contains a tournament-specific `if`. `euro2028.yaml` and `copa2028.yaml`
  are `TBD` placeholders the loader rejects by design until the draws happen.
- **Honest backtest.** The goals model is fitted only on matches before 11 June 2026. Never widen
  the training window into the World Cup.
- **Tiebreaker rulesets.** Two named orders: `head_to_head_first` (World Cup 2026 and UEFA:
  points, head-to-head among the tied teams, then overall GD, GF) and `overall_first` (CONMEBOL).
  2026 is the first World Cup with head-to-head before overall GD. Fair play and FIFA ranking
  cannot be modelled: fall back to pre-tournament Elo, then a seeded draw.

### Implementation details

- Paths in a tournament YAML (`ratings_snapshot`, `third_place_table`) resolve against the
  project root; every module finds it as `Path(__file__).resolve().parents[3]`.
- `simulate_match` broadcasts scalars to length-n arrays; downstream code should assume arrays.
- Elo update in knockouts uses the score **after extra time**; a shootout is `W = 0.5`, `G = 1`.
- An empty venue column in a history row means a true home game (+100). A venue code means
  neutral, even for a host playing elsewhere in the host region (Canada's knockouts were in the USA).
- `K` comes from the tournament's `match_type` via `elo.k_factor()` (WC 60, EC/CA 50, F 20).

### Gotchas

1. **Quote every team code in YAML.** Bare `NO` (Norway) parses as `false`.
2. **Team codes are eloratings.net's, not ISO.** The trap list is under "Data and credits"; the
   lookup is `data/raw/en.teams.tsv`. Check before typing one.
3. **TSV quirks.** No header row, Unicode minus sign, UTF-8 without a charset header: read
   `resp.content`, never `resp.text`. Team history filenames strip accents.
4. **Ruff is not the gate, pytest is.** `ruff check` reports import-wrapping style in older files;
   keep new files clean for `--select F,E` and leave the rest alone.

### Conventions

Work through [docs/ROADMAP.md](docs/ROADMAP.md) one component per sitting and validate against
reality whenever the data allows:

```
Elo update      → points exchanged match the site within ±1 on real rows
Group standings → the 72 real 2026 group results yield the real 32 qualifiers
Bracket         → the real standings yield all 16 real round-of-32 pairings
```

A component is done when `pytest` passes, its ROADMAP row is updated and the docs reflect any
formula, endpoint or rule change. Commits are `Component N: <what>`. The website is light-themed
and reads `site/data/<name>/*.json`; the views are specified in [docs/REPORTS.md](docs/REPORTS.md).

## Data and credits

All ratings and match histories come from [eloratings.net](https://eloratings.net) (World Football
Elo Ratings). Tournament regulations are taken from FIFA's 2026 World Cup regulations as
documented on Wikipedia. Flag images are served by flagcdn.com. This is a personal,
non-commercial project and is not affiliated with any of them.

Teams are identified everywhere by eloratings.net's own two-letter codes, which are not ISO codes.
Some are easy to get wrong: `SQ` is Scotland (`SC` is Seychelles), `IE` is the Republic of Ireland
(`IR` is Iran), `EN` is England and `WA` is Wales. The full lookup is `en.teams.tsv`, downloaded
into `data/raw/` by `intsoccer fetch`.

## License

Not chosen yet. Until one is added, all rights reserved.

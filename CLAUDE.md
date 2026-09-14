# CLAUDE.md - Technical notes for IntSoccerPredictor

Working brief for coding sessions: what the code does, the decisions behind it, and the things
that bite. Facts a human reader needs (what the project is, team-code traps, data credits) live in
`README.md`; the plan and status live in `docs/ROADMAP.md`. Do not duplicate either here.

## Project Overview

Solo hobby project by Thiago Caetano. Simulates international soccer tournaments: eloratings.net
Elo ratings → expected goals from the rating gap → Poisson scorelines → Elo updated match by
match → Monte Carlo over the whole tournament. Current target is replaying the **2026 World Cup**
from pre-tournament ratings and scoring it against the real results. Euro 2028 and Copa América
2028 later, same code, new YAML.

The one idea that must survive every refactor: match outcomes come from the **scoreline model**,
never from Elo's win expectancy `We`. `We` is an expected score, not a probability, and sampling
from it produces no draws.

## Architecture

Package `src/intsoccer/`. `elo/` and `model/` are pure functions over numpy arrays with no I/O.
I/O lives in `data/`, `tournament/format.py` (YAML/CSV loading) and later `report/`.

### `data/` - eloratings.net files

**`schema.py`** - column layouts (TSVs have no header), `K_BY_MATCH_TYPE` (WC 60, EC/CA 50,
WQ 40, F 20, default 30; verified empirically, see `docs/ELO_FORMULA.md`).

**`fetch.py`** - `download()` caches into `data/raw/` (git-ignored); `fetch_core()` gets
`World.tsv` plus the team/tournament lookups; `fetch_team_histories()` gets `<Team>.tsv` per team.
`team_filename()` strips accents because the site does.

**`parse.py`** - `load_ratings()`, `load_matches()`, `load_team_names()`. Converts the site's
Unicode minus sign and reads bytes as UTF-8 (the server sends no charset).

**`snapshot.py`** - `rating_on()` = rating-after of a team's last match before date D;
`build_snapshot()` / `save_snapshot()` / `load_snapshot()` for `data/snapshots/<date>_<label>.csv`
(committed). `infer_groups()` reconstructs tournament groups from who played whom.

### `elo/` - the rating formula

**`core.py`** - `rating_diff()` (adds `HOME_ADVANTAGE` = 100 for a true home game),
`expected_score()`, `result_score()` (shootout = draw), `goal_multiplier()`, `k_factor()`,
`update()` → `Update(new_a, new_b, delta)`. Zero-sum, unrounded.

### `model/` - goals and match simulation

**`goals.py`** - `GoalsModel(a, b, c_friendly)`: `lambda = exp(a + b·dr)`, mirror-image rates
for the two teams. `outcome_probs()` gives P(W/D/L) from two Poisson rates (used in tests and
later for Brier/log-loss). Params persist in `data/model_params.yaml`.

**`fit.py`** - `build_training_set()` from real histories, `fit_goals_model()` (Poisson
regression by `scipy.optimize.minimize` on `dr / 1000` so all parameters are O(1)),
`diagnostics()` + `plot_diagnostics()` for the calibration chart in `output/` and `docs/img/`.

**`match.py`** - `simulate_match(rating_a, rating_b, k, model, rng, home_sign, knockout)` →
`MatchResult`. Vectorised: scalars or length-n arrays, one entry per simulation. Knockout: extra
time as Poisson with rates × 30/90, then a shootout (`shootout_p_a`, default 0.5). `decided_by`
is `REGULAR` / `EXTRA_TIME` / `PENALTIES`.

### `tournament/` - rules as data

**`format.py`** - `load_tournament("wc2026")` → frozen `Tournament` (groups, hosts, `top_n`,
`best_thirds`, `tiebreakers`, knockout `matches` keyed by FIFA match number, `rounds`,
`third_place_table`). Slots are `GroupSlot` (`1A`), `ThirdSlot` (`3:ABCDF`), `MatchRef` (`W74`,
`L101`); `parse_slot()` / `format_slot()` convert. `build_tournament()` validates every
cross-reference and raises `ValueError` with a message that names the offending row.

Planned, empty for now: `tournament/group.py` (standings), `tournament/knockout.py` (bracket),
`tournament/simulate.py`, `montecarlo/`, `backtest/`, `report/`. See `docs/ROADMAP.md`.

### `cli.py`

`intsoccer fetch | snapshot | fit` work; `simulate | backtest | report` are stubs.

### Data files

- `data/tournaments/wc2026.yaml` - the annotated schema example. `euro2028.yaml` / `copa2028.yaml`
  are placeholders with `TBD` teams; the loader rejects them by design until the draws happen.
- `data/tournaments/wc2026_results.csv` - all 104 real 2026 results with pre-match ratings.
- `data/tournaments/wc2026_third_place_table.csv` - FIFA Annex C, 495 rows.
- `data/snapshots/2026-06-10_wc2026.csv` - every participant's rating on the eve of the opener.

## Key Design Decisions

### One match, one pipeline
Pre-match Elo → gap `dr` (+100 home) → expected goals → Poisson scores → result from the score →
Elo update with the site's formula → carry the new ratings into the next match of *that*
simulation. Every stage exists as its own pure function so each can be checked against real data.

### Reproducibility
Every simulation takes an explicit `np.random.default_rng(seed)`. No global RNG state anywhere.

### Rules live in data, not in loops
Groups, hosts, tiebreaker ruleset, bracket and the third-place table are YAML/CSV under
`data/tournaments/` and are interpreted by `tournament/`. The simulator loop never contains a
tournament-specific `if`.

### Honest backtest
The goals model is fitted only on matches before 11 June 2026. Never widen the training window
into the World Cup.

### Tiebreaker rulesets
Two named orders: `head_to_head_first` (World Cup 2026 and UEFA: points, head-to-head among the
tied teams, then overall GD, GF) and `overall_first` (CONMEBOL). 2026 is the first World Cup with
head-to-head before overall GD. Fair play and FIFA ranking cannot be modelled: fall back to
pre-tournament Elo, then a seeded draw. Full text in `docs/WC2026_FORMAT.md`.

### References, not copies
Formulas in `docs/ELO_FORMULA.md`, endpoints and column layouts in `docs/DATA_SOURCES.md`, 2026
standings and bracket rules in `docs/WC2026_FORMAT.md`. Code comments point there.

## Important Implementation Details

- Paths in a tournament YAML (`ratings_snapshot`, `third_place_table`) resolve against the
  project root, the same convention as `model/goals.py`'s `PARAMS_PATH`.
- `simulate_match` broadcasts scalars to length-n arrays; downstream code should assume arrays.
- Elo update in knockouts uses the score **after extra time**; a shootout is `W = 0.5`, `G = 1`.
- Hosts get +100 when the venue column is empty in a history row (true home game). A venue code
  means neutral, even for a host playing elsewhere in the host country group (Canada's knockouts
  were in the USA).
- Project root is `Path(__file__).resolve().parents[3]` from any module in the package.

## Common Gotchas

1. **Quote every team code in YAML.** Bare `NO` (Norway) parses as `false`.
2. **Team codes are eloratings.net's, not ISO.** The trap list (`SQ`, `IE`, `IR`, `SC`) is in
   README under "Data and credits"; the lookup is `data/raw/en.teams.tsv`. Check before typing one.
3. **TSV quirks.** No header row, Unicode minus sign, UTF-8 without a charset header: read
   `resp.content`, never `resp.text`. Team history filenames strip accents.
4. **iCloud.** The project lives in `~/Developer/` on purpose. iCloud once evicted the venv and
   data files and every Python import hung with no CPU use. Never move it to Desktop/Documents.
   The venv is `.venv.nosync/` with `.venv` symlinked to it. If an import ever hangs, check
   `ls -lO` for the `dataless` flag.
5. **Ruff is not the gate, pytest is.** `ruff check` reports import-wrapping style in older files;
   keep new files clean for `--select F,E` and leave the rest alone.

## How to Work

### Think before coding
State assumptions. Before a design-changing choice (model form, a tournament rule interpretation,
a data cutoff) lay out the options and ask. Routine implementation choices: decide and mention.

### Simplicity first
Minimum code that solves the component. No speculative flexibility, no configurability that was
not asked for, no abstractions for single-use code. If 200 lines could be 50, rewrite.

### Surgical changes
Every changed line traces to the current component. Do not tidy adjacent code or formatting.
Mention unrelated problems; do not fix them silently. Remove only the orphans you created.

### Goal-driven execution
Work through `docs/ROADMAP.md` one component per sitting. Turn it into a verifiable goal before
writing code, and validate against reality whenever data allows:

```
Elo update      → verify: points exchanged match the site within ±1 on real rows
Group standings → verify: the 72 real 2026 group results yield the real 32 qualifiers
Bracket         → verify: the real standings yield all 16 real round-of-32 pairings
```

Show the test output, not a claim. A component is done when `pytest` passes, the ROADMAP status
row is updated, and the docs in `docs/` reflect any formula, endpoint or rule change. Commit as
`Component N: <what>` and push to `origin main` only when asked. No half components, no
squashing components together.

## Commands

```
python3 -m venv .venv.nosync && ln -s .venv.nosync .venv   # once
source .venv/bin/activate && pip install -e ".[dev]"
pytest                                                  # the gate
intsoccer fetch --teams ES AR                           # TSVs into data/raw/ (cached)
intsoccer snapshot --date 2026-06-11 --label wc2026     # ratings as of the day before a date
intsoccer fit                                           # refit -> data/model_params.yaml
```

## Testing Notes

`tests/fixtures/` holds small real TSV slices (Spain and Argentina from 2022 on, ratings-table
heads). Elo tests reconstruct pre-match ratings from those rows and compare the update with the
site's own points column. Match-simulator tests run 200k simulations and compare frequencies
with the analytic Poisson probabilities from `outcome_probs()`. Loader tests read the real
`wc2026.yaml` and mutate it in memory to check each validation message.

## Data Flow Summary

```
eloratings.net TSVs
    ↓  data/fetch.py (cached in data/raw/)
    ↓  data/parse.py
    ├─→ data/snapshot.py  → data/snapshots/<date>_<label>.csv   (ratings on the eve)
    └─→ model/fit.py      → data/model_params.yaml               (goals curve, pre-cutoff only)

data/tournaments/<name>.yaml + snapshot + params
    ↓  tournament/format.py   (validated Tournament)
    ↓  tournament/group.py    (standings, tiebreakers, best thirds)      [todo]
    ↓  tournament/knockout.py (bracket, third-place table)               [todo]
    ↓  model/match.py         (one match, vectorised over simulations)
    ↓  montecarlo/            (N seeds → P(win), P(reach round), group finish)   [todo]
    ↓  report/ + backtest/    (tables, charts, Brier / log-loss vs 2026)        [todo]
```

# CLAUDE.md - Technical notes for IntSoccerPredictor

Working brief for coding sessions: the decisions behind the code, the things that bite, and how
to work. What the project is, the module map, data flow and team-code traps are in `README.md`;
plan and status in `docs/ROADMAP.md`; formulas and rules in `docs/`. Do not duplicate them here.

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

Package `src/intsoccer/`, one sub-package per pipeline stage:

- `data/` - all eloratings.net I/O: fetch (cached in `data/raw/`), parse, rating snapshots.
- `elo/` - the rating formula. Pure functions over numpy arrays, no I/O.
- `model/` - goals curve, its fit, and `simulate_match()` (vectorised over simulations). Pure.
- `tournament/` - rules as data: `format.py` loads and validates `data/tournaments/*.yaml`;
  `group.py`, `knockout.py`, `simulate.py` follow (see ROADMAP).
- `montecarlo/`, `backtest/`, `report/` - todo. `cli.py` exposes `fetch | snapshot | fit`.

## Key Design Decisions

### One match, one pipeline
Pre-match Elo → gap `dr` (+100 home) → expected goals → Poisson scores → result from the score →
Elo update with the site's formula → carry the new ratings into the next match of *that*
simulation. Every stage is its own pure function so each can be checked against real data.

### Reproducibility
Every simulation takes an explicit `np.random.default_rng(seed)`. No global RNG state anywhere.

### Rules live in data, not in loops
Groups, hosts, tiebreaker ruleset, bracket and the third-place table are YAML/CSV under
`data/tournaments/` and are interpreted by `tournament/`. The simulator loop never contains a
tournament-specific `if`. `euro2028.yaml` / `copa2028.yaml` are `TBD` placeholders that the
loader rejects by design until the draws happen.

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
  project root; every module finds it as `Path(__file__).resolve().parents[3]`.
- `simulate_match` broadcasts scalars to length-n arrays; downstream code should assume arrays.
- Elo update in knockouts uses the score **after extra time**; a shootout is `W = 0.5`, `G = 1`.
- An empty venue column in a history row means a true home game (+100). A venue code means
  neutral, even for a host playing elsewhere in the host region (Canada's knockouts were in the USA).
- `K` comes from the tournament's `match_type` via `elo.k_factor()` (WC 60, EC/CA 50, F 20).

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
squashing components together. New reader-facing facts go in README, not here.

## Commands

```
python3 -m venv .venv.nosync && ln -s .venv.nosync .venv   # once
source .venv/bin/activate && pip install -e ".[dev]"
pytest                                                  # the gate
intsoccer fetch --teams ES AR                           # TSVs into data/raw/ (cached)
intsoccer snapshot --date 2026-06-11 --label wc2026     # ratings as of the day before a date
intsoccer fit                                           # refit -> data/model_params.yaml
```

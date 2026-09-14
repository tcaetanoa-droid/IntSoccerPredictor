# IntSoccerPredictor

Personal project: an international soccer tournament simulator using Elo ratings, Poisson
scorelines, and Monte Carlo (100,000 runs) to estimate each team's chance of reaching each round.

**Current target: the 2026 World Cup**, simulated from ratings dated 10 June 2026 (day before
kickoff) and scored against what actually happened. Euro 2028 and Copa América 2028 are deferred
until their groups and formats are known; they will reuse the same code with a new YAML.

Owner: Thiago Caetano. Solo hobby project; optimise for clarity and correctness over cleverness.

## How a match is simulated (the core idea, do not drift from it)

1. Take both teams' **current Elo** (updated within the simulated tournament so far).
2. Compute the Elo difference `dr` (add +100 to the home side if it is a true home game).
3. Map `dr` to each team's **expected goals** (λ_home, λ_away) using a curve fitted from real
   match histories (see `docs/ELO_FORMULA.md`, "Goals model").
4. Sample a scoreline: `goals ~ Poisson(λ)` for each side. Win/draw/loss falls out of the score.
   Draws are real outcomes and matter for group standings; never sample W/L directly from `We`.
5. Knockouts: if drawn after 90', simulate extra time (λ scaled by 30/90), then a penalty shootout.
6. **Update both Elos** from the scoreline using the eloratings.net formula
   `Rn = Ro + K·G·(W − We)` and carry the new ratings into the next match of that simulation.
7. Repeat for every match of the tournament; repeat the whole tournament N times.

## Elo formula (confirmed from eloratings.net / Wikipedia, Sept 2026)

- `We = 1 / (10^(−dr/400) + 1)`, `dr` = rating difference from the team's perspective, +100 for home.
- `W` = 1 win, 0.5 draw, 0 loss. A penalty shootout counts as a draw.
- `K` = 60 World Cup finals, 50 continental championship finals (Euro, Copa América),
  40 WC/continental qualifiers and major tournaments, 30 other tournaments, 20 friendlies.
- `G` = 1 for margin 0–1, 1.5 for margin 2, `(11 + N) / 8` for margin N ≥ 3.
- Full detail and worked examples: `docs/ELO_FORMULA.md`.

## Data source

eloratings.net serves plain TSV files (no scraping). Endpoints, column layouts, and codes are
documented in `docs/DATA_SOURCES.md`. Downloaded files live in `data/raw/` (gitignored);
dated rating snapshots that we want to keep are committed under `data/snapshots/`.

## Layout

```
src/intsoccer/
  cli.py          entry point: `intsoccer <command>` (fetch, fit, simulate, backtest, report)
  data/           fetch TSVs, parse into DataFrames, column schemas, team-code mapping
  elo/            win expectancy, K/G factors, rating update (pure functions, no I/O)
  model/          Elo-diff -> expected goals curve, fitting, single-match simulation
  tournament/     tournament format definitions, group tables + tiebreakers, knockout brackets
  montecarlo/     run N tournaments, seeding, aggregate probabilities
  backtest/       replay a past tournament from pre-tournament ratings, scoring metrics
  report/         CSV/JSON tables and matplotlib charts into output/
data/tournaments/ one YAML per tournament (groups, hosts, advancement rules, bracket)
data/model_params.yaml  fitted goals-model parameters (refit with `intsoccer fit`)
docs/             ROADMAP (component breakdown + status), formula, data, and WC2026 format references
tests/            pytest; fixtures are small TSV excerpts committed under tests/fixtures
```

## Conventions

- Python 3.11, venv at `.venv/`, install with `pip install -e ".[dev]"`. Run tests with `pytest`.
- `elo/` and `model/` are pure functions over numbers/arrays. All I/O lives in `data/` and `report/`.
- Use numpy RNG (`np.random.default_rng(seed)`) and pass the generator explicitly; every
  simulation must be reproducible from a seed.
- Prefer vectorising across simulations (arrays of shape `(n_sims, ...)`) over Python loops
  once the simple version works. 100k sims × ~50 matches must finish in well under a minute.
- Tournament rules (advancement, tiebreakers, third-place tables) live in YAML + `tournament/`,
  never hard-coded in the simulator loop.
- Team identity is the eloratings.net two-letter code (e.g. `EN` England, `ES` Spain, `SQ` Scotland).
  Display names come from `en.teams.tsv`. **Always quote codes in YAML**: bare `NO` (Norway) parses as `false`.
- Keep the docs in `docs/` current when a formula, endpoint, or component status changes.
- Work through `docs/ROADMAP.md` one component at a time; update its status table when done.

## Commit / GitHub

One commit per finished roadmap component, message `Component N: <what>` (plus the attribution
trailer). Commit when the component's tests pass and its ROADMAP status is updated, then push to
`origin main`. Do not commit half-finished components; do not squash components together.

# CLAUDE.md

Solo hobby project by Thiago Caetano: simulate international soccer tournaments with Elo ratings,
Poisson scorelines and Monte Carlo. Current target is replaying the **2026 World Cup** from
pre-tournament ratings; Euro/Copa 2028 come later with the same code and a new YAML.
Read `README.md` for the overview and `docs/ROADMAP.md` for what is built and what is next.

## Commands

```
python3 -m venv .venv.nosync && ln -s .venv.nosync .venv   # once; .nosync keeps it out of iCloud
source .venv/bin/activate && pip install -e ".[dev]"
pytest                                                  # must pass before any commit
intsoccer fetch --teams ES AR                           # download TSVs into data/raw/ (cached)
intsoccer snapshot --date 2026-06-11 --label wc2026     # ratings as of the day before a date
intsoccer fit                                           # refit the goals model -> data/model_params.yaml
```

## Architecture decisions (do not drift from these)

- One match = pre-match Elo → Elo gap `dr` (+100 for a true home game) → expected goals via the
  fitted curve → sample both scores from Poisson → result from the score → update both Elos with
  the eloratings.net formula → carry the new ratings into the next match of that simulation.
- Never sample win/loss from Elo win expectancy `We`. It is an expected score, not a probability,
  and it produces no draws. Draws come from the scoreline model.
- `elo/` and `model/` are pure functions over numpy arrays, no I/O. I/O lives in `data/` and `report/`.
- Every simulation is reproducible from a seed: pass `np.random.default_rng(seed)` explicitly.
- Tournament rules (groups, tiebreakers, bracket, third-place table) live in `data/tournaments/*.yaml`
  and `tournament/`, never inline in the simulator loop.
- The goals model is fitted only on matches before 11 June 2026 so the World Cup backtest is honest.
- References, not copies: formulas in `docs/ELO_FORMULA.md`, endpoints and column layouts in
  `docs/DATA_SOURCES.md`, 2026 standings/bracket rules in `docs/WC2026_FORMAT.md`.

## Gotchas you cannot infer from the code

- Team identity is the eloratings.net two-letter code. `SQ` is Scotland, not Slovakia.
- Quote every team code in YAML: bare `NO` (Norway) parses as `false`.
- eloratings.net TSVs have no header, use the Unicode minus sign, and are served as UTF-8 without a
  charset header: read `resp.content`, not `resp.text`. Team history filenames strip accents.
- An empty venue column in a history row means a true home game (+100); a venue code means neutral.
- 2026 World Cup tiebreakers put head-to-head before overall goal difference (new that year).
- The project lives on an iCloud-synced Desktop. iCloud evicts files it thinks are cold, and a
  read of an evicted file blocks forever in a sandbox. The venv is therefore `.venv.nosync/`
  (iCloud skips `*.nosync`) with `.venv` as a symlink to it. If a Python process hangs at import
  with no CPU use, run `brctl download .` and check `ls -lO` for the `dataless` flag.

## How to work

- Follow `docs/ROADMAP.md` one component at a time. Finish it, make `pytest` pass, update the status
  table, then commit as `Component N: <what>` and push to `origin main`. No half components, no
  squashing components together.
- Before a design-changing choice (model form, tournament rule interpretation, data cutoff), state
  the options and ask. Routine implementation choices: decide and mention.
- Validate against reality whenever data allows: Elo updates against the site's points exchanged,
  standings and bracket code against the real 2026 results. Show the test output, not a claim.
- Simplest thing that works. No speculative flexibility, no abstractions for single-use code.
  Touch only what the task needs; mention unrelated problems rather than fixing them silently.
- Keep the docs in `docs/` current when a formula, endpoint or component status changes.

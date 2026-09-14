# Roadmap: components and status

**Current target: the 2026 World Cup.** Build and validate the whole pipeline on it, using every
team's rating as of 10 June 2026 (the day before the opening match). Euro 2028 and Copa América
2028 are deferred until their fields, groups, and knockout formats are known; the code will be
reused unchanged with a new YAML.

Work through these in order; each one is small enough to finish in a sitting and is testable on
its own. Update the status column as things land.

| # | Component | Module | Status |
|---|---|---|---|
| 0 | Project scaffold, CLAUDE.md, docs, venv, git | — | done |
| 1 | Data layer: fetch TSVs, parse ratings + histories, team codes | `data/` | done (fetch + parse) |
| 2 | Elo core: `We`, K, G, rating update, home advantage | `elo/` | done (K verified empirically, ±1 vs site on 125 real rows) |
| 3 | Rating reconstruction: pre-tournament snapshot, group inference, results export | `data/snapshot.py` | done (`data/snapshots/2026-06-10_wc2026.csv`, `wc2026.yaml`, `wc2026_results.csv`) |
| 4 | Goals model: fit Elo-diff → expected goals curve (Poisson regression) | `model/` | done (a=0.136, b=0.00176; `data/model_params.yaml`) |
| 5 | Single-match simulator: scoreline, extra time, shootout, Elo update | `model/match.py` | done (vectorised over sims; frequencies verified against the Poisson model) |
| 6 | Tournament definitions (YAML schema + loader): groups, hosts, rules, bracket | `tournament/format.py` | todo |
| 7 | Group stage: standings, points, tiebreakers (UEFA / CONMEBOL / FIFA), best-thirds ranking. **Validate by replaying the real 2026 group results and checking the 32 advancing teams match reality** | `tournament/group.py` | todo |
| 8 | Knockout stage: bracket resolution incl. the 495-row third-place table. **Validate: real 2026 standings must produce all 16 real R32 pairings** | `tournament/knockout.py` | todo (data + rules documented in `docs/WC2026_FORMAT.md`) |
| 9 | Full single-tournament simulation | `tournament/simulate.py` | todo |
| 10 | Monte Carlo runner: N sims, seeds, aggregation (P(win), P(reach round), group finish) | `montecarlo/` | todo |
| 11 | Reports: CSV/JSON tables + charts | `report/` | todo |
| 12 | 2026 World Cup: transcribe groups/bracket/results to YAML, snapshot ratings at 2026-06-10, run the sim, score it (Brier / log-loss, calibration) | `backtest/` + `data/tournaments/wc2026.yaml` | todo (main goal) |
| 13 | Euro 2028 run | `data/tournaments/euro2028.yaml` | deferred until draw + format known |
| 14 | Copa América 2028 run | `data/tournaments/copa2028.yaml` | deferred until CONMEBOL announces format |
| 15 | GitHub remote, README polish, CI (pytest on push) | — | later |
| 16 | Performance: vectorise sims across `n_sims` axis | `montecarlo/` | later |
| 17 | Model refinements: Dixon–Coles draw correction, confederation-specific curves | `model/` | maybe |

## Component notes

**2 Elo core.** Pure functions. Test against rows from `Spain.tsv`: reconstruct pre-match ratings,
apply the update, expect the site's "points exchanged" column within ±2 (rounding).

**3 Rating reconstruction.** A team's rating on date D = rating-after of its last match before D.
For a tournament backtest, snapshot every participant's rating the day before the opening match.
Save snapshots to `data/snapshots/<YYYY-MM-DD>_<label>.csv` and commit them.

**4 Goals model.** Fitted on all matches (friendlies included, with a separate friendly offset that
turned out to be ~0) from the 48 WC 2026 histories, 2010 to 10 Jun 2026. Params in
`data/model_params.yaml`; diagnostics chart in `output/`. Details in `docs/ELO_FORMULA.md`.

**5 Match simulator.** Inputs: two ratings, home flag, K, rng. Output: scoreline, winner
(after ET/pens if knockout), new ratings. Extra time: Poisson with λ·(30/90). Shootout: 50/50
(or a mild Elo tilt, configurable). Elo update uses the score after extra time, W = 0.5 on pens.

**6 Tournament YAML.** Fields: name, K, hosts (code → venue country), groups (letter → codes),
advancement (top_n, best_thirds n), tiebreaker ruleset name, bracket (list of ties referencing
`A1`, `B2`, `3rd:ABCD`, `W:R16-1`, …), third-place pairing table.

**7 Group standings validation.** The 48-team / best-8-thirds format is the fiddliest part of the
whole project, so it gets its own acceptance test: feed the 72 real group results from
`data/tournaments/wc2026_results.csv` through the standings code and assert the 12 winners, 12
runners-up and 8 best thirds are exactly the 32 teams that appear in the real round of 32.
FIFA 2026 ranks third-placed teams by points, GD, goals scored, then disciplinary points (we
cannot model that; fall back to rng lots) and drawing of lots.

**7 Group tiebreakers.** World Cup 2026 and UEFA: points, then head-to-head among the tied teams
(points, GD, goals; re-applied to any subset still level), then overall GD, goals, fair play (not
modelled: use Elo then rng lots). CONMEBOL Copa: points, overall GD, goals, head-to-head, lots.
Encode as ordered rule lists; exact 2026 text in `docs/WC2026_FORMAT.md`.

**12 Backtest metrics.** For each match: Brier score over (W/D/L) and log-loss. For the tournament:
did the sim's most-likely champion / semi-finalists match? Rank-probability skill vs a naive
"equal odds" baseline and vs a plain-Elo `We` baseline.

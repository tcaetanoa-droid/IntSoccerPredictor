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
| 6 | Tournament definitions (YAML schema + loader): groups, hosts, rules, bracket | `tournament/format.py` | done (wc2026 loads and cross-validates: 48 teams, 32-match bracket, 495-row table; euro/copa 2028 placeholders share the schema) |
| 7 | Group stage: standings, points, tiebreakers (UEFA / CONMEBOL / FIFA), best-thirds ranking. **Validate by replaying the real 2026 group results and checking the 32 advancing teams match reality** | `tournament/group.py` | done (real 72 results -> the real 32 qualifiers and the documented third-place table; no group needed the Elo/lots fallback) |
| 8 | Knockout stage: bracket resolution incl. the 495-row third-place table. **Validate: real 2026 standings must produce all 16 real R32 pairings** | `tournament/knockout.py` | done (component-7 standings from the real results + real knockout results reproduce all 32 real knockout pairings through the final) |
| 9 | Full single-tournament simulation | `tournament/simulate.py` | done (~4 ms per tournament; hosts get +100 in group games and in knockout matches whose YAML `venues` entry is their country) |
| 10 | Monte Carlo runner: N sims, seeds, aggregation (P(win), P(reach round), group finish) | `montecarlo/` | done (every match, team-fate and sim stored as Parquet under `output/<name>/`; any sim regenerable from `[seed, i]`; `intsoccer simulate`; ~225 sims/s) |
| 11 | Reports: CSV/JSON tables + charts | `report/` | 11a done (data layer: the ten views of `docs/REPORTS.md` as CSV/JSON under `output/<name>/report/`, `intsoccer report`); 11b website done (site/, deployed on Vercel from main; data via intsoccer report --site) ; 11c restyle done (the tournament wall chart: spec docs/superpowers/specs/2026-09-20-restyle-design.md, DESIGN.md at the root); 11d mark done (the pitch favicon with PNG fallbacks for Safari and iOS, and the mark before the wordmark in the masthead; DESIGN.md "The mark"); 11e done (visitor-facing hardening: KaTeX integrity, the calibration table for assistive technology, a reload keeps the place; How it works on its own page; clean addresses through site/vercel.json, /world-cup-2026 with the root redirecting, tools/serve.py locally) |
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

**6 Tournament YAML.** Fields: name, match_type (→ K), hosts (code → venue country), groups
(letter → codes), advance (top_n, best_thirds), tiebreakers (`head_to_head_first` for the World Cup
and UEFA, `overall_first` for CONMEBOL), knockout matches keyed by FIFA match number with slots
`1A`, `2B`, `3:ABCDF`, `W74`, `L101`, rounds (name → match numbers), and a third-place table CSV.
`load_tournament("wc2026")` validates every cross-reference: each group position used exactly once,
match refs only point backwards, the table covers all C(groups, best_thirds) sets and only sends
thirds to slots that accept them. Schema in the `tournament/format.py` docstring.

**7 Group standings validation.** The 48-team / best-8-thirds format is the fiddliest part of the
whole project, so it gets its own acceptance test: feed the 72 real group results from
`data/tournaments/wc2026_results.csv` through the standings code and assert the 12 winners, 12
runners-up and 8 best thirds are exactly the 32 teams that appear in the real round of 32.
FIFA 2026 ranks third-placed teams by points, GD, goals scored, then disciplinary points (we
cannot model that; fall back to rng lots) and drawing of lots.

**7 Group tiebreakers.** World Cup 2026 and UEFA: points, then head-to-head among the tied teams
(points, GD, goals; re-applied to any subset still level), then overall GD, goals, fair play (not
modelled: use Elo then rng lots). CONMEBOL Copa: points, overall GD, goals, head-to-head, lots.
Encoded as ordered stage lists in `tournament/group.py`; only the head-to-head block restarts on
a subset still level, later stages continue. `Standings.depth` says how deep a tie went, so the
Monte Carlo can count how often Elo or lots decided a place. Exact 2026 text in
`docs/WC2026_FORMAT.md`.

**8 Knockout.** `play_knockout(tournament, group_orders, best_thirds, play)` resolves slots round
by round and calls `play(number, round, home, away) -> winner` for each match, so the tests replay
the real results and the simulator plugs in `simulate_match`.

**9 Single tournament.** `simulate_tournament(tournament, ratings, model, rng)` plays the 72 group
matches in FIFA match-day order, ranks each group, ranks the thirds, then plays the bracket; Elo
is updated after every match and carried forward, while the standings' Elo fallback uses the
pre-tournament ratings. Home advantage: hosts play their group matches at home; each knockout
match number has a host country in the YAML (`knockout.venues`, taken from the real 2026
schedule) and a host playing there gets +100. Extra time and penalties always apply in the
knockouts; `extra_time_and_penalties: false` (straight to penalties, as in Copa América
quarter-finals) is stored but not yet modelled. About 4 ms per tournament, so 100k simulations
take ~7 minutes until component 16 vectorises across simulations.

**10 Monte Carlo store.** `intsoccer simulate --n 100000 --seed 2026` writes `output/wc2026/`:
`matches.parquet` (one row per match per simulation: stage, group, match number, home, away,
goals after extra time, how it was decided), `teams.parquet` (one row per team per simulation:
group position, points, GD, GF, tiebreak depth, third-place rank, last round reached, final place
1–4, rating after the tournament), `sims.parquet` (champion, runner-up, third, fourth),
`summary.csv` (per-team probabilities) and `meta.yaml`. Simulation i uses
`np.random.default_rng([seed, i])`, so `regenerate(run, i)` rebuilds exactly that tournament.
Team columns are pandas categoricals. ~65 MB for 100k World Cups; `output/` is gitignored.

**11 Reports.** The views are specified in `docs/REPORTS.md` (agreed with Thiago view by view).
11a, `report/tables.py` (views 1–8), `report/bracket.py` (9–10) and `report/build.py`, turns a
saved run into one CSV/JSON per view plus `report.json`; editorial choices per tournament (faded
giants, paradox pairs, real-results file) live in `build.FOCUS`. Tests check the
structural invariants on a fresh 300-run store and, when `output/wc2026/` holds the seed-2026
100k run, the exact numbers quoted in the doc. 11b draws one PNG per view from those files.

**12 Backtest metrics.** For each match: Brier score over (W/D/L) and log-loss. For the tournament:
did the sim's most-likely champion / semi-finalists match? Rank-probability skill vs a naive
"equal odds" baseline and vs a plain-Elo `We` baseline.

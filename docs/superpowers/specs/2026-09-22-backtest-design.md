# Component 12: the backtest

Design spec, 22 September 2026. Brainstormed with Thiago question by question (the screens are in `.superpowers/brainstorm/73900-1790104613/`); approach A chosen over a re-simulation. The glossary at the end defines every scoring word used here.

## 1. What this is and why

In plain words: before the World Cup the model made predictions; the tournament happened; this component is the report card. It reads the 104 real matches and the 48 real fates, scores the predictions against them with standard measures, and writes the result down so the site can say how it did and anyone can reproduce the numbers.

Why it exists: the site says "I simulated the World Cup 100,000 times" and shows the predictions; nowhere does it say whether they were any good. Thiago's goals for the year name this as the point of finishing the edition: "so the model has a scored record". The record is also the strongest sentence the project can offer in an interview: the model was built, measured against reality, and published with its misses.

Scope. In: the scoring, its files, the CLI command, the written record, the tests, and one environmental fix in the run metadata. Out: drawing the numbers on the sheet (component 11g, the Reality check unit, which reads this component's site file), and a re-simulation from the real round of 32 with day-of ratings (a possible 12b; approach B in the brainstorm, deferred).

## 2. Decisions

- **What counts as the prediction for a match** (question 1, corrected mid-brainstorm). Two forecasts, both scored for every match: the model *day-of*, from the ratings the two teams actually carried into the match; and the *runs' own frequencies*, how often the 100,000 runs produced each result, rating drift included. A static "snapshot for every match" column was considered and dropped: each run starts from the 10 June snapshot but its ratings move after every simulated match, so the snapshot is not what the runs think.
- **What it is graded against** (question 2): a shrug, a third each; and plain Elo, the expected score turned into a probability with the fitted set's draw rate. Base rates were offered and declined.
- **The tournament itself** (question 3): the three hits, the fate ladder scored with the ranked probability score against a structural shrug, and the calibration of the reach-the-round odds.
- **Where the record lives** (question 4): `docs/BACKTEST.md`, with the README pointing at it.
- **How it is built** (approach A): from the stored run, the results file, the fitted model and the report's replay of the real path. No new simulation, no new dependency.

## 3. Inputs

In plain words: everything the backtest needs already exists on disk; it reads and never writes to any of it.

| Input | Path | What is used |
|---|---|---|
| The real results | `data/tournaments/wc2026_results.csv` | 104 rows: `date, stage, group, home, away, home_goals, away_goals, venue, neutral, home_rating_before, away_rating_before, points`. Stages: `group` (72), `R32` (16), `R16` (8), `QF` (4), `SF` (2), `3P`, `F`. When `neutral` is false the `home` side plays in its own country. Goals are after extra time where it was played. A knockout's winner comes from the report's replay (`replay_real`): the side with more goals, or, when level after extra time (three round-of-32 shootouts in 2026), the side that appears in a later round. |
| The goals model | `data/model_params.yaml` | `a`, `b`, `max_goals`; `c_friendly` is 0 for every tournament match. |
| The stored run | `output/wc2026/{matches,teams,sims}.parquet`, `meta.yaml` | `matches`: `sim, stage, home, away, home_goals, away_goals, decided_by, winner` (10.4 M rows). `teams`: `sim, team, group, group_pos, reached, place` (4.8 M rows). `meta`: `n_sims`, `rounds`, `tournament_yaml`, `ratings_snapshot`. |
| The report's replay of reality | `intsoccer.report.bracket.load_real_results`, `replay_real` | The real group orders, the eight best thirds and the 32 knockout matches with winners. The modal bracket (`modal_bracket`) and the fate table (`report.tables.with_fates`, `fate_order`) for the hits and the ladders. |
| The snapshot | `data/snapshots/2026-06-10_wc2026.csv` | Names and the pre-tournament ratings, for the doc's tables only; no forecast is computed from it. |

## 4. The two forecasts, exactly

In plain words: a forecast is three numbers that add to one for a group match (home win, draw, away win) and two numbers for a knockout (each side wins the tie).

**Day-of.** For each real match, `GoalsModel.expected_goals(home_rating_before, away_rating_before, home_sign)` with `home_sign = 1` when `neutral` is false (the home side at home) and `0` otherwise; then `outcome_probs` gives (win, draw, loss) for the home side. Group matches are scored on those three. A knockout is scored two ways, on the probability of winning the tie, extended exactly as the engine plays it (`model/match.py`): extra time is a fresh Poisson draw at `EXTRA_TIME_FRACTION` (30/90) of each side's rate, and a shootout is a fair coin:

    P(home wins tie) = P(win in 90) + P(draw in 90) × (P(win ET) + P(draw ET) × ½)

where the ET probabilities come from `outcome_probs(λ_home × 30/90, λ_away × 30/90)`.

**The runs' frequencies.** For a group match, the shares of the three outcomes over all `n_sims` runs of that fixture, matched by the two team codes in either order and read from the named side's point of view (the store may hold the fixture with the sides swapped). For a knockout, the share of runs in which the named side won, over the runs in which that pairing occurred at that stage; the count of such runs is kept as `runs_n`. A pairing with `runs_n` under 500 is scored but flagged (`sparse = true`) in the match file and counted in the summary.

**Baselines**, both computed for every match in the same two- or three-way form:

- *The shrug*: equal probability to every outcome.
- *Plain Elo*: `We = 1 / (1 + 10^(−d/400))` with `d = rating_diff(home, away, home_sign)` (the +100 home edge included, as the engine applies it); three-way: `(We (1 − δ), δ, (1 − We)(1 − δ))` with `δ` the fitted set's observed draw rate, computed from `site/data/wc2026/calibration.json` as the match-weighted mean of `obs_draw` (0.234 today); two-way: `(We, 1 − We)`.

## 5. The match scores

In plain words: two standard ways of measuring how far a forecast was from what happened, both 0 for perfect, both averaged over the 104 matches, and each turned into a skill score that says how much better than a baseline the model was.

- **Brier** for a forecast `p` and the observed one-hot `o` over the K outcomes: `Σ_k (p_k − o_k)²`. A shrug scores `1 − 1/K` (0.667 three-way, 0.5 two-way).
- **Log-loss**: `−ln p_observed`, natural log. A shrug scores `ln K` (1.099 three-way, 0.693 two-way). Probabilities are floored at 1e-6 before the log so a zero-count frequency cannot be infinite; the floor is recorded in the summary.
- **Aggregation**: the mean over all 104 matches, and separately over the 72 group matches and the 32 knockouts, for each forecast and baseline. Three-way and two-way matches are averaged together only in the all-matches line, and the doc says so.
- **Skill**: `1 − S_forecast / S_baseline` for each score and baseline; 0 is no better than the baseline, 1 is perfect, negative is worse.

## 6. The tournament

In plain words: every team ended the World Cup with exactly one fate, and the runs had given each team a probability for each fate; this scores those, checks whether the most likely things happened, and checks whether the "X% chance to reach the round" numbers were honest.

**Real fates.** From the replayed path: the final's winner is `champion`, its loser `runner_up`; the third-place match's winner `third`, its loser `fourth`; the losers of the QF, R16 and R32 are `qf`, `r16`, `r32`; a team in no round-of-32 match is `gs4` when its real group position is 4 and `gs3_out` otherwise. Exactly 48 fates, asserted.

**Ladders.** From the store's team rows through the report's `with_fates` and `fate_order`, which give the nine-fate order `gs4, gs3_out, r32, r16, qf, fourth, third, runner_up, champion` and each team's counts; divided by `n_sims`.

**Ranked probability score** per team: with `F` the cumulative sum of the ladder and `O` the cumulative sum of the real fate's one-hot, `RPS = Σ_{k=1}^{K−1} (F_k − O_k)² / (K − 1)`, K = 9. The **structural shrug** gives every team the fates' slot counts over 48: `(12, 4, 16, 8, 4, 1, 1, 1, 1) / 48`. The summary carries the mean RPS over the 48 teams for the runs and for the shrug, and the skill.

**The hits.**
- Modal champion: the team with the largest `champion` count; matched against the real one.
- Semi-finalists: the four largest `P(reach the semis) = (fourth + third + runner_up + champion) / n_sims`; the overlap with the real four, 0 to 4.
- Bracket: the modal bracket's round-of-32 pairings (`modal_bracket(ctx)`, `round == "R32"`, unordered pairs) against the real sixteen; the count matched.

**Calibration.** Six thresholds per team, `reach the R32, R16, QF, semis, final; win it`, each the sum of the ladder from that rung up; 288 predictions with a 0/1 outcome. Five bins by the predicted probability, `[0, .1), [.1, .25), [.25, .5), [.5, .75), [.75, 1]`; per bin the count, the mean prediction and the share that came true. Plus the Brier over the 288 against the structural shrug's own thresholds.

## 7. Outputs

In plain words: four files a person can open beside the run, and one compact file for the site.

Under `output/<name>/backtest/`:

- `matches.csv`, one row per real match: `date, stage, group, home, away, home_goals, away_goals, outcome` (`H`/`D`/`A`, or the winner for a knockout), `ways` (3 or 2), then for each of `dayof`, `runs`, `shrug`, `elo`: `p_home, p_draw, p_away, brier, logloss` (`p_draw` empty on a two-way row); and `runs_n`, `sparse`.
- `teams.csv`, one row per team: `team, name, group, elo_snapshot, real_fate`, the nine ladder probabilities, `rps, rps_shrug`, and the six reach-the-round probabilities with their 0/1 outcomes.
- `calibration.csv`: the five bins, `bin, n, mean_p, observed`, and one row per threshold with its own mean and observed share.
- `summary.json`: `meta` (run name, n_sims, seed, results file, model params, the log floor, the draw rate, the date built), `matches` (per forecast and baseline: mean Brier and log-loss for all, group and knockout; the skills), `sparse_pairings` (count, and the list), `tournament` (`rps`, `rps_shrug`, `rps_skill`, the hits with the names involved), `calibration` (the bins and the 288-Brier pair).

With `--site`: `site/data/<name>/backtest.json`, the summary less `meta`'s local paths (the report's `LOCAL_PATH_META` rule), plus `teams` reduced to `team, real_fate, rps` and the calibration bins. Nothing on the sheet changes in this component.

## 8. The command

`intsoccer backtest [--run output/wc2026] [--results data/tournaments/wc2026_results.csv] [--site]`. Defaults are the World Cup run and its results file; `--site` writes the site file beside the report's. The stub in `cli.py` is replaced; the help text names the doc.

## 9. The stale path

In plain words: the run's metadata remembers where the tournament file was before the project folder moved, so two readers fail on a fresh checkout; this fixes it.

`meta.yaml` records `tournament_yaml` as an absolute path (`/Users/.../IntSoccerPredictor/ data/tournaments/wc2026.yaml`, the pre-20-September location). `montecarlo.run.regenerate` and `report.tables.context` pass it to `load_tournament`. One resolver in `montecarlo/run.py`, `resolve_meta_path(path)`: the recorded path if it exists, else `data/tournaments/<basename>` resolved from the package's data root, else the original error. Both readers use it; the backtest does too. This is the cause of the one failing test today (`test_full_run_matches_the_numbers_in_docs_reports`), which passes after the fix.

## 10. Tests

In plain words: every formula is checked on cases a person can verify by hand, the real fates are checked against the replay the report already publishes, and the final numbers are pinned so a future change that moves them is noticed.

- `scores.py`: Brier and log-loss on hand cases (a certain correct call, a shrug, a certain miss); the log floor; RPS on a one-rung and an eight-rung miss and on the structural shrug; skill on equal, better and worse scores.
- `forecasts.py`: the hosts' opener day-of forecast equals the brainstorm's figures (Mexico 82%, draw 13%, South Africa 5% to the percentage point); a neutral match carries no home edge; the knockout two-way probability equals a 200,000-draw simulation of `simulate_match` with `knockout=True` within 1 point (the engine's own rule, tested against the engine).
- `fates.py`: exactly 48 real fates; the champion, runner-up, third and fourth match the replay; the sixteen group exits split 12 `gs4` and 4 `gs3_out`.
- The runs' group-match frequencies are within 2 points of the day-of forecast on every first-matchday group match (both sides' pre-match ratings equal the snapshot, so the runs' drift has not started): a sanity test of the simulator that the brainstorm showed holds, 81/14/6 against 82/13/5 on the hosts' opener.
- With the seed-2026 store present: the summary's mean RPS is 0.0816 and the shrug's 0.1208 to four places; the hits are Spain/Spain, 4 of 4, 4 of 16; the calibration bins are (152, 47, 38, 29, 22) predictions with observed shares (0.000, 0.149, 0.395, 0.793, 0.818) to three places. The match-score figures are pinned once first computed, in the same test, and copied into the doc.

## 11. Docs

`docs/BACKTEST.md`: the method (one paragraph per section 4 to 6, in the plain register of this spec), the tables (the summary's match scores and skills, the hits, the calibration bins, the ten best- and the ten worst-scored matches by the day-of log-loss), and a short honest reading of the result. README: the status table's "Next" cell, the pipeline diagram's `backtest/` line marked done, the commands block gains the command. `docs/ROADMAP.md` row 12 marked done with the date. `docs/REPORTS.md` view 10 gains one line: "formal scoring is component 12, `docs/BACKTEST.md`".

## 12. Glossary

- **Forecast**: the probabilities the model gave before the match, one per possible result.
- **Baseline**: a deliberately simple forecast to compare against; a score means nothing on its own.
- **Brier score**: how far the forecast's probabilities were from what happened, squared and summed; 0 is perfect.
- **Log-loss**: minus the log of the probability the forecast gave to what actually happened; 0 is perfect, and a confident miss is punished hard.
- **Skill score**: one minus the model's score over the baseline's; 0 means no better than the baseline, 1 means perfect, negative means worse.
- **Fate**: the one place a team ended the tournament, from 4th in its group to champion.
- **Ranked probability score (RPS)**: the Brier score's cousin for ordered outcomes like fates; being one rung off costs little, eight rungs off costs a lot.
- **Structural shrug**: a forecast that gives every team the tournament's own slot counts (one in 48 wins, sixteen go out in the round of 32) and knows nothing else.
- **Calibration**: whether the forecaster's "60%" things happened about 60% of the time.
- **Hit**: whether the single most likely thing, such as the modal champion, actually happened.

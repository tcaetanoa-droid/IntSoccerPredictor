# The 2026 backtest

In plain words: before the World Cup the model made its predictions; the tournament happened;
this is the report card. `intsoccer backtest` scores the seed-2026 run (100,000 simulations from
the ratings of 10 June 2026) against the 104 real matches and the 48 real team fates and writes
the numbers under `output/wc2026/backtest/`; the site reads a compact copy from
`site/data/wc2026/backtest.json`. Built 22 September 2026; results in
`data/tournaments/wc2026_results.csv`.

## What is scored

### Each match

Every real match carries two forecasts and two baselines, all four in the same form: three
numbers that add to one for a group match (home win, draw, away win), two for a knockout (each
side wins the tie). The first forecast is the model **day-of**, computed from the ratings the two
sides actually carried into that match, through the fitted goals curve. The second is **the runs'
own frequencies**: how often the 100,000 simulated tournaments produced each result for that
fixture, with all the rating drift the simulated matches before it had caused. The baselines are
**the shrug**, an equal share to every outcome, and **plain Elo**, the expected score `We` turned
into a probability with the fitted set's observed draw rate, 0.234. Knockouts are scored on the
probability of winning the tie, extended exactly as the engine plays it: extra time is a fresh
Poisson draw at 30/90 of each side's rate and a shootout is a fair coin. Each forecast gets a
**Brier score**, how far its probabilities sat from what happened, squared and added up, and a
**log-loss**, which punishes a confident miss hard; probabilities are floored at 1e-6 before the
log so a frequency of zero cannot be infinite. A pairing the runs produced fewer than 500 times
is scored but flagged as sparse; none was flagged, the rarest being the third-place match,
England against France, which occurred in 957 of the 100,000 runs. A pairing no run produced at
all would fall back to the shrug.

### The tournament

Every team ended the World Cup on exactly one rung of a nine-rung ladder — fourth in its group,
third and out, then the round of 32, the round of 16, the quarter-finals, fourth, third,
runner-up, champion — and the runs had given each team a probability for every rung. Those
ladders are scored with the ranked probability score, which charges little for being one rung out
and a lot for being eight, against a **structural shrug** that knows only the shape of the
tournament: of 48 teams, 12 finish fourth in their group, 4 go out third, 16 lose in the round of
32, 8 in the round of 16, 4 in the quarter-finals, and one each takes fourth, third, runner-up
and the title. Three **hits** are checked on top: whether the most likely champion won it,
how many of the four most likely semi-finalists made the semi-finals, and how many of the most
probable bracket's sixteen round-of-32 pairings actually met. Finally, the six reach-the-round
odds for each of the 48 teams — 288 predictions, each with a 0 or 1 outcome — are sorted into
five bins by the size of the prediction, to see whether the "X%" things happened about X% of the
time.

## The result

### Match scores

The last four columns are skill scores: one minus the forecast's score over the baseline's, so 0
is no better than the baseline, 1 is perfect and a negative number is worse. All 104 matches:

| Forecast | n | Brier | Log-loss | Brier vs shrug | vs Elo | Log-loss vs shrug | vs Elo |
|---|---|---|---|---|---|---|---|
| Day-of | 104 | 0.4701 | 0.7770 | +0.236 | -0.022 | +0.202 | -0.028 |
| The runs' frequencies | 104 | 0.4694 | 0.7767 | +0.237 | -0.020 | +0.202 | -0.027 |
| The shrug | 104 | 0.6154 | 0.9739 | | | | |
| Plain Elo | 104 | 0.4602 | 0.7560 | | | | |

The 72 group matches, scored three ways:

| Forecast | n | Brier | Log-loss | Brier vs shrug | vs Elo | Log-loss vs shrug | vs Elo |
|---|---|---|---|---|---|---|---|
| Day-of | 72 | 0.5414 | 0.9095 | +0.188 | -0.015 | +0.172 | -0.023 |
| The runs' frequencies | 72 | 0.5390 | 0.9067 | +0.191 | -0.010 | +0.175 | -0.020 |
| The shrug | 72 | 0.6667 | 1.0986 | | | | |
| Plain Elo | 72 | 0.5335 | 0.8889 | | | | |

The 32 knockouts, scored two ways:

| Forecast | n | Brier | Log-loss | Brier vs shrug | vs Elo | Log-loss vs shrug | vs Elo |
|---|---|---|---|---|---|---|---|
| Day-of | 32 | 0.3096 | 0.4790 | +0.381 | -0.049 | +0.309 | -0.048 |
| The runs' frequencies | 32 | 0.3127 | 0.4844 | +0.375 | -0.059 | +0.301 | -0.060 |
| The shrug | 32 | 0.5000 | 0.6931 | | | | |
| Plain Elo | 32 | 0.2953 | 0.4571 | | | | |

A two-way call is an easier call than a three-way one, so the group and knockout blocks are not
comparable with each other; three-way and two-way matches are averaged together only in the
all-matches lines.

Two things to read off these tables. Both forecasts beat the shrug clearly: +0.236 Brier and
+0.202 log-loss over the 104 matches, and +0.381 and +0.309 on the knockouts alone. And both
lose to plain Elo: -0.022 Brier and -0.028 log-loss over the 104 matches. That second result
holds for the day-of forecast and for the runs' own frequencies, on both scores, in the group
matches and in the knockouts. On this tournament, plain Elo — one line of arithmetic on the
rating gap — called the individual matches slightly better than the simulator did.

### The tournament

| Measure | Runs | Structural shrug | Skill |
|---|---|---|---|
| Mean ranked probability score over the 48 fates | 0.0816 | 0.1208 | 0.324 |

The three hits:

- **Champion.** The most likely champion in the runs was Spain, at 18,626 of the 100,000 runs.
  Spain won it.
- **Semi-finalists.** The four most likely were Spain, Argentina, France and England. The real
  four were Argentina, England, Spain and France: 4 of 4.
- **The bracket.** 4 of the most probable bracket's 16 round-of-32 pairings actually met:
  Austria against Spain, Brazil against Japan, France against Sweden, and Morocco against the
  Netherlands.

### Calibration

The 288 reach-the-round predictions, binned by the size of the prediction:

| Band | Predictions | Mean prediction | Share that came true |
|---|---|---|---|
| [0, 10%) | 152 | 0.027 | 0.000 |
| [10%, 25%) | 47 | 0.168 | 0.149 |
| [25%, 50%) | 38 | 0.350 | 0.395 |
| [50%, 75%) | 29 | 0.619 | 0.793 |
| [75%, 100%] | 22 | 0.900 | 0.818 |

The same 288 predictions by threshold, 48 teams each:

| Threshold | Teams | Mean prediction | Share that came true |
|---|---|---|---|
| Reach the round of 32 | 48 | 0.667 | 0.667 |
| Reach the round of 16 | 48 | 0.333 | 0.333 |
| Reach the quarter-finals | 48 | 0.167 | 0.167 |
| Reach the semi-finals | 48 | 0.083 | 0.083 |
| Reach the final | 48 | 0.042 | 0.042 |
| Win it | 48 | 0.021 | 0.021 |

Both columns of that second table are fixed by the format rather than by the model: every
simulated tournament advances exactly 32 teams to the round of 32, 16 to the round of 16 and so
on, so the mean prediction has to equal the slot share, and the real tournament advanced the same
counts. Those rows confirm the bookkeeping; the bins above are where calibration is actually
visible. Over the 288 predictions the Brier score is 0.0819 against the structural shrug's
0.1200, a skill of 0.317.

### Best and worst calls

The ten matches the day-of forecast scored best, by log-loss:

| Date | Stage | Match | Outcome | Home | Draw | Away | Log-loss |
|---|---|---|---|---|---|---|---|
| 2026-07-03 | R32 | Argentina 3-2 Cape Verde | AR | 0.940 | | 0.060 | 0.062 |
| 2026-07-03 | R32 | Colombia 1-0 Ghana | CO | 0.895 | | 0.105 | 0.111 |
| 2026-07-07 | R16 | Argentina 3-2 Egypt | AR | 0.881 | | 0.119 | 0.127 |
| 2026-06-21 | group | Spain 4-0 Saudi Arabia | H | 0.869 | 0.097 | 0.034 | 0.140 |
| 2026-06-30 | R32 | France 3-0 Sweden | FR | 0.866 | | 0.134 | 0.144 |
| 2026-06-27 | group | Argentina 3-1 Jordan | H | 0.856 | 0.105 | 0.039 | 0.155 |
| 2026-06-14 | group | Germany 7-1 Curaçao | H | 0.847 | 0.111 | 0.042 | 0.166 |
| 2026-06-22 | group | France 3-0 Iraq | H | 0.843 | 0.113 | 0.043 | 0.171 |
| 2026-07-01 | R32 | England 2-1 DR Congo | EN | 0.827 | | 0.173 | 0.190 |
| 2026-06-11 | group | Mexico 2-0 South Africa | H | 0.816 | 0.130 | 0.054 | 0.203 |

The ten it scored worst:

| Date | Stage | Match | Outcome | Home | Draw | Away | Log-loss |
|---|---|---|---|---|---|---|---|
| 2026-06-15 | group | Cape Verde 0-0 Spain | D | 0.025 | 0.078 | 0.898 | 2.556 |
| 2026-06-23 | group | England 0-0 Ghana | D | 0.846 | 0.112 | 0.042 | 2.193 |
| 2026-06-13 | group | Qatar 1-1 Switzerland | D | 0.050 | 0.124 | 0.826 | 2.088 |
| 2026-06-20 | group | Curaçao 0-0 Ecuador | D | 0.052 | 0.127 | 0.821 | 2.062 |
| 2026-06-24 | group | South Africa 1-0 South Korea | H | 0.155 | 0.230 | 0.615 | 1.866 |
| 2026-06-14 | group | Ivory Coast 1-0 Ecuador | H | 0.155 | 0.230 | 0.614 | 1.861 |
| 2026-06-17 | group | Ghana 1-0 Panama | H | 0.171 | 0.239 | 0.590 | 1.767 |
| 2026-06-17 | group | DR Congo 1-1 Portugal | D | 0.102 | 0.188 | 0.711 | 1.673 |
| 2026-06-15 | group | Saudi Arabia 1-1 Uruguay | D | 0.112 | 0.198 | 0.690 | 1.622 |
| 2026-06-12 | group | Canada 1-1 Bosnia & Herz. | D | 0.668 | 0.208 | 0.124 | 1.572 |

All ten worst calls are group matches and seven of them are draws, which is the structural
weakness of the model: the largest draw probability it gave any group match in the tournament was
0.284, so a draw can never be the call and always costs. The other three are wins by the side the
model had between 0.155 and 0.171.

## An honest reading

Against a forecaster that knows nothing, the model is clearly better: +0.236 Brier and +0.202
log-loss over the 104 matches, and the fate ladders score 0.0816 against the structural shrug's
0.1208, a skill of 0.32 — about a third of the way from knowing only the tournament's shape to
calling all 48 fates perfectly. Against plain Elo it is slightly worse, by 0.022 on Brier and
0.028 on log-loss, and that sign does not move: it holds for the day-of forecast and for the
runs' own frequencies, in the group matches and in the knockouts. On these 104 matches, plain
Elo called the individual results better than the simulator did. The two are close
(0.4701 against 0.4602 on Brier) and 104 matches is a small sample, but the finding is the
finding, and it is the reason to build the backtest at all. What the simulator does that plain
Elo cannot do at all is produce a whole tournament: realistic draws, group tables, knockout
paths, and a probability for every fate — and that is where this run was good. The most likely
champion won it, all four of the most likely semi-finalists made the semi-finals, and 4 of the
16 predicted round-of-32 pairings met.

The confident misses were draws. Seven of the ten worst calls were group matches that finished
level, and the model's draw ceiling is 0.284, so it can never call one; the real group stage
produced 20 draws in 72 matches, against a mean draw probability of 0.224. The bins are honest
in the middle and at the bottom: nothing in the 152 predictions under 10% came true, and the
10-25% band came true 0.149 of the time against a mean of 0.168. At the top the picture is
mixed and thin: the 50-75% band came true 0.793 of the time against a mean of 0.619, so it was
too cautious there, while the 22 predictions above 75% came true 0.818 of the time against a
mean of 0.900. What I do not claim: this is one run of one model against one tournament, and 104
matches and 48 fates cannot separate a good model from a lucky one. The run was also never
re-simulated from the real round of 32 with day-of ratings, which would score the knockout
forecasts on the bracket that actually happened; that is a possible component 12b, and it is not
done.

## Reproducing it

```
intsoccer simulate --n 100000 --seed 2026
intsoccer backtest --run output/wc2026 --site
```

The headline numbers above — the fate-ladder RPS and the shrug's, the three hits, the five
calibration bins and the all-matches Brier and log-loss — are pinned in
`tests/test_backtest.py`'s full-run tests, which run whenever `output/wc2026/` holds the
seed-2026 store and skip when it does not.

## Glossary

- **Forecast**: the probabilities the model gave before the match, one per possible result.
- **Baseline**: a deliberately simple forecast to compare against; a score means nothing on its
  own.
- **Brier score**: how far the forecast's probabilities were from what happened, squared and
  summed; 0 is perfect.
- **Log-loss**: minus the log of the probability the forecast gave to what actually happened;
  0 is perfect, and a confident miss is punished hard.
- **Skill score**: one minus the model's score over the baseline's; 0 means no better than the
  baseline, 1 means perfect, negative means worse.
- **Fate**: the one place a team ended the tournament, from 4th in its group to champion.
- **Ranked probability score (RPS)**: the Brier score's cousin for ordered outcomes like fates;
  being one rung off costs little, eight rungs off costs a lot.
- **Structural shrug**: a forecast that gives every team the tournament's own slot counts (one in
  48 wins, sixteen go out in the round of 32) and knows nothing else.
- **Calibration**: whether the forecaster's "60%" things happened about 60% of the time.
- **Hit**: whether the single most likely thing, such as the modal champion, actually happened.

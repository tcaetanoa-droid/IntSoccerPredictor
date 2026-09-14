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
3. Convert the gap into expected goals for each side using a curve fitted to 7,500 real matches
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
| Data layer for eloratings.net TSV files | Group standings with the 2026 tiebreakers and best-third ranking |
| Elo engine, verified against the site's own point exchanges | Knockout bracket resolution |
| Pre-tournament ratings for all 48 teams, groups, all 104 real results, full bracket and FIFA's 495-row third-place table | Full tournament simulation and Monte Carlo runner |
| Goals model fitted and calibrated | Reports and the 2026 backtest |
| Single-match simulator with extra time and penalties, and the tournament definition loader | |

Details and the full component list are in [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

```bash
git clone https://github.com/tcaetanoa-droid/IntSoccerPredictor.git
cd IntSoccerPredictor
python3 -m venv .venv && source .venv/bin/activate   # keep the clone out of iCloud-synced folders
pip install -e ".[dev]"

pytest                                   # run the test suite
intsoccer fetch --teams ES AR EN         # download current ratings and team histories
intsoccer snapshot --date 2026-06-11 --label wc2026   # ratings as of the eve of the World Cup
intsoccer fit                            # refit the goals model and draw the calibration chart
```

Requires Python 3.11 or newer. Downloads are cached in `data/raw/` (not committed).

## Project layout

```
src/intsoccer/      the package: data/, elo/, model/, tournament/, montecarlo/, backtest/, report/
data/tournaments/   one YAML per tournament (groups, hosts, rules, bracket) plus real results
data/snapshots/     committed rating snapshots, e.g. 2026-06-10_wc2026.csv
data/model_params.yaml   fitted goals-model parameters
docs/               formula reference, data-source reference, 2026 format rules, roadmap
tests/              pytest suite with small real-data fixtures
```

## Data and credits

All ratings and match histories come from [eloratings.net](https://eloratings.net) (World Football
Elo Ratings). Tournament regulations are taken from FIFA's 2026 World Cup regulations as
documented on Wikipedia. This is a personal, non-commercial project and is not affiliated with
either.

Teams are identified everywhere by eloratings.net's own two-letter codes, which are not ISO codes.
Some are easy to get wrong: `SQ` is Scotland (`SC` is Seychelles), `IE` is the Republic of Ireland
(`IR` is Iran), `EN` is England and `WA` is Wales. The full lookup is `en.teams.tsv`, downloaded
into `data/raw/` by `intsoccer fetch`.

## License

Not chosen yet. Until one is added, all rights reserved.

# Reports and website views

What to build on top of the Monte Carlo store (`output/<name>/`, see ROADMAP component 10).
Captured from Thiago's walk-through on 13 Sep 2026; refined view by view below. Scope for now is
the **2026 World Cup only**; Euro 2028 and Copa América 2028 are a year away and get their own
pass then (read rounds/hosts from the YAML where it costs nothing, but do not design for them).
The views feed a public website, so each one is a tidy table (CSV/JSON) first and a chart second.

Numbers quoted are from `output/wc2026/` (100,000 simulations, seed 2026).

**Visual direction.** The screenshots Thiago shared for views 1–3 (his friend's slides) are
layout references only: which numbers, in what arrangement. He does not like how they look, so
our versions must be visually better, designed for a website (clean typography, restrained
colour, no glow/bevel), while keeping the same information and arrangement.

## Status

| # | View | Defined | Built (data = CSV/JSON by `report/`; chart = PNG) |
|---|---|---|---|
| 1 | Group advance probabilities | defined | data |
| 2 | Full fate table, counts per team | defined | data |
| 3 | Weakest teams (+ lowest-Elo companion) | defined | data |
| 4 | First-time champions | defined | data |
| 5 | Trophy paradox: new contenders vs faded giants | defined | data |
| 6 | Host nations exit distributions | defined | data |
| 7 | Paradoxes: Elo vs tournament odds | defined | data |
| 8 | Team focus page (Spain first) | defined | data |
| 9 | Most-probable bracket | defined | data |
| 10 | Reality overlay: real final, real path, three closest runs | defined | data |

## 1. Group advance probabilities (defined)

Twelve panels, one per group, laid out 4 x 3 (A–D, E–H, I–L). Each panel lists the four teams
sorted by **Adv%** = share of simulations in which the team reached the round of 32, one
percentage per team, nothing else. Row styling carries the extra information:

- text colour by most-likely finishing position: 1st yellow, 2nd blue, 3rd orange, 4th grey;
- the two top rows shaded green (they advance), and the third row shaded blue in the eight
  groups whose third-placed team most often qualifies (the modal set of best thirds), so exactly
  8 of the 12 third rows are shaded.

Reference layout: the screenshot Thiago shared (his friend's version of the same view). Team
names in full ("S. Korea", "Iv. Coast" style abbreviations where needed for width).

Data: `teams.parquet` (`reached`, `group_pos`, `third_rank`). Output: `group_advance.csv`
(group, team, adv_pct, modal_pos, third_shaded) + one PNG.

## 2. Full fate table, counts out of 100,000 (defined)

"Probability Table 2026 WC (All Teams, counts / 100 000)". One row per team, all 48, sorted by
champion count descending. Nine mutually exclusive fates as integer counts that sum to 100,000:

    GS4 (4th in group) · GS3 (3rd in group, out) · R32 · R16 · QF · 4th · 3rd · RU · W

A 3rd-placed team that qualified is counted under the knockout round it exited, never under GS3.
Two subtotal columns: **advanced** (= R32 + R16 + QF + 4th + 3rd + RU + W) and **3rd in group**
(qualified or not). Two context columns: group letter and pre-tournament Elo. Counts only, no
percentage version.

Reference layout: the screenshot Thiago shared: dark background, one colour per fate column
(GS4/GS3 dark, R32/R16/QF browns and ambers, 4th/3rd blues, RU silver, W gold), thousands
separators.

Data: `teams.parquet` (`group_pos`, `reached`, `place`) + snapshot. Output: `fate_table.csv`
(team, group, elo, gs4, gs3_out, r32, r16, qf, fourth, third, runner_up, champion, advanced,
group_third) + one PNG.

## 3. Weakest teams (defined)

"Trapped in the Group Stage: The Weakest Teams". The **five teams with the lowest group-stage
escape %** (share of simulations reaching the round of 32), one card each, side by side:

- team name, pre-tournament Elo;
- a thin stacked bar of the fates GS4 / GS3-out / advanced;
- **GS Escape %** as the big number;
- 4th % (4th in group), 3rd-out % (3rd in group and eliminated), Champ % (two decimals, it is
  ~0.00%). All percentages here, not counts.
- one auto-generated caption line, e.g. "Most simulations end in a 4th-place group exit, over
  N% for <worst team>".

Selection is by escape %, not Elo: this view is about who never got out. Run says the bottom
eight by escape are Curaçao 14%, Ghana 18%, Qatar 19%, Haiti 23%, South Africa 25% ... (the
exact five come from the report code).

**3b. Lowest-Elo teams.** Same card layout for the five lowest pre-tournament Elos (Qatar 1421,
Curaçao 1434, Ghana 1511, South Africa 1518, Haiti 1548). Where the two sets differ, that is
the "Elo is not tournament odds" story of view 7 in miniature (e.g. New Zealand: low Elo, 36%
escape thanks to its group).

Data: snapshot + `teams.parquet`. Output: `weakest_teams.csv` and `lowest_elo_teams.csv`
(team, elo, escape_pct, gs4_pct, gs3_out_pct, champion_pct) + one PNG each.

## 4. Most likely first-time champions (defined)

"Most Likely First-Time Champions". Three cards side by side, the top three by champion %
among teams that have never won the World Cup: team name, "ELO <pre-tournament>", "[No WC
Title]", the **champion %** as the big number (two decimals), then GS Escape %, Reach QF %,
Reach Final %. Run says Portugal 4.9%, Colombia 4.5%, Netherlands 3.5% (Ecuador 3.1% is next).
Same card family as view 3.

Past winners come from the tournament YAML, `past_champions: {code: titles}` with the counts as
they stood **before** the tournament (Spain 1, not 2): Uruguay 2, Italy 4, Germany 4, Brazil 5,
England 1, Argentina 3, France 2, Spain 1. Italy is listed even though it did not qualify.

Data: summary + snapshot + YAML. Output: `first_time_champions.csv` (team, elo, champion_pct,
escape_pct, reach_qf_pct, reach_final_pct) + one PNG.

## 5. The trophy paradox: new contenders vs faded giants (defined)

"The Trophy Paradox: New Contenders vs Faded Giants". One bar chart of champion %: the three
first-timers of view 4 on the left, a dashed divider, then the faded giants on the right, each
giant labelled with its title count ("4x Champion"). Giants = **Germany (4) and Uruguay (2)**
only; Brazil is left out because its odds (4.8%) are ordinary, not faded. Add **Italy (4x
Champion) as a 0% bar labelled "did not qualify"** as the joke at the end. Bar labels: the
percentage above each bar, "Never Won" / "Nx Champion" under the names.
Run says Germany 2.9%, Uruguay 1.8%.

Data: summary + YAML `past_champions`. Output: `trophy_paradox.csv` (team, titles, champion_pct,
qualified) + one PNG.

## 6. Host nations: full round-exit distributions (defined)

Title "Host Nations: Full Round-Exit Distributions". Grouped bar chart, **percentages** of the
100,000 runs: the nine fates of view 2 along the x-axis in order (GS4, GS3 out, out R32, out
R16, out QF, 4th, 3rd, RU, W), and within each fate one bar per host (Mexico, Canada, USA, from
the YAML `hosts`). No caption line. Run says Mexico 2.1% champion / 30% out in R32, Canada 0.8%
/ 41%, USA 1.0% and 26% bottom of its group.

Data: `teams.parquet`. Output: `hosts_exit.csv` (team, fate, pct) + one PNG.

## 7. Paradoxes: Elo is not tournament odds (defined)

Two panels, **one example pair each**, shown as a "versus" card: both teams with pre-tournament
Elo and the one metric that flips, plus a one-line reason.

- **A. Higher Elo, earlier exit.** Argentina 2115 vs France 2064: chance of losing the
  round-of-32 match, given they reached it, 31.6% vs 25.3%. Reason: 1J meets 2H, which is
  usually Uruguay (the store gives the most common R32 opponent).
- **B. Lower Elo, more titles.** Two pairs, both shown: Austria 1830 (0.78% champion) vs USA
  1726 (0.97%), the largest rating gap that flips; and Uruguay 1892 (1.81%) vs Mexico 1875
  (2.12%). Reason line for both: the host plays its knockout matches at home (+100).

Ecuador vs Croatia was considered and rejected: Ecuador has both the higher Elo and the higher
title odds. Data: summary + snapshot + `matches.parquet` for the "usually meets" line.
Output: `paradoxes.csv` (panel, team, elo, metric, value, reason) + one PNG.

## 8. Team focus page: Spain (defined)

For one team, Spain first (highest champion %); the same code renders any team. Header: name,
pre-tournament Elo (2157, highest in the field), champion % as the big number. Then:

- fate distribution as one horizontal stacked bar with labels: out R32 24.7%, out R16 18.9%,
  out QF 13.2%, 4th 4.4%, 3rd 9.3%, runner-up 10.2%, champion 18.6%, group exit 0.6%;
- reach rates as a stepped list: R32 99.4%, R16 74.7%, QF 55.8%, SF 42.6%, final 28.9%;
- **most common opponent per round** (from `matches.parquet`): R32 Austria 32% / Argentina
  28% / Algeria 24%; R16 Croatia, Colombia, Portugal ~18% each; QF Belgium 17%, Turkey 15%;
  SF France 20%; final Argentina 20%, England 9%, Portugal 7%;
- **who knocked Spain out**: Argentina 23% of eliminations, then Austria 9%, Colombia 8%,
  Portugal 8%, England 7%. France barely features despite both being semi-final favourites;
- a short text excerpt: Spain's single biggest risk is the round of 32 (24.7%) because a
  second place in group H sends it straight into Argentina (1J), and vice versa, which is also
  why both giants have unusually high R32 exit rates. Numbers: they meet in the R32 in 27.6%
  of runs, and Spain wins 55% of those meetings.

Data: `teams.parquet`, `matches.parquet`, snapshot. Output: `team_ES.json` (all of the above)
+ one PNG.

## 9. Most-probable bracket (defined)

One bracket built from modal outcomes, computed exactly like this (prototype run on 13 Sep):

1. **Group orders**: per group, the team with the highest P(1st) takes 1st, the highest P(2nd)
   among the rest takes 2nd, then 3rd; the remaining team is 4th. Shown per group with each
   team's Adv% (ties in to view 1).
2. **Best thirds**: the eight groups with the highest P(3rd place *and* qualified). Run:
   A C D E F G I L (D 72% ... H 51% lowest). The third-place table places them.
3. **Knockouts**: for every match slot, the win probability of the two teams is the share of
   simulations in which **those two teams met in that match number** and the first one won
   (conditional frequency from the store; fall back to the match model only if they met fewer
   than 100 times, which never happened in the run: the rarest slot was the third-place match
   at 957 meetings). The more likely winner advances; repeat to the final.

Run result: R32 includes ES v AT 81%, AR v UY 75%, BR v JP 63%, KR v CA 51/49 and DE v NO 49/51
(near coin flips: always print both percentages). R16 EC–FR, KR–NL, BR–NO, MX–EN, CO–ES, TR–BE,
AR–PY, CH–PT. QF FR beat NL 61%, ES beat TR 72%, EN beat BR 53%, AR beat PT 61%. **SF: Spain
beat France 57%, Argentina beat England 58%. Third place: France 54% over England. Final: Spain
beat Argentina 53%.** That is the real 2026 final four and the real final; only the third-place
result differs (England won it 6-4).

Caption to print: "the path of most likely steps, not the most likely single tournament"; the
real 2026 result is overlaid in a second colour (view 10) so hits and misses are visible.

Implementation note: the store lacks an explicit knockout **winner** column (a shootout leaves
the goals level). Add `winner` to `matches.parquet` in component 11 and re-run the 100k; until
then winners are derived from `teams.parquet` (reached / place), which needs a special case for
semi-final losers, who still "reach" the third-place match.

Data: `teams.parquet`, `matches.parquet`, YAML + third-place table. Output: `bracket.json`
(groups with modal order + adv%, matches with home, away, p_home, n_met, winner) + one PNG.

## 10. Reality overlay (defined)

Three parts:

1. **The real final.** Spain beat Argentina in 3.04% of runs, the most common final of all; the
   exact real top four in order (ES, AR, EN, FR) in 0.05%. Show the top five finals with their
   shares and mark the real one.
2. **The real path over the probability bracket** of view 9, in a second colour, so hits and
   misses are visible at a glance.
3. **Three "closest" runs, one per criterion**, each shown as a small bracket next to the real
   one with the matching parts highlighted:
   - *closest group stage*: the run with the most correct group positions out of 48 (run says
     38 is the best; the average run gets 19);
   - *closest knockouts*: the run with the most real knockout pairings **and** winners
     reproduced, counting from the round of 32 (best in the run: 10 of 32; average 1.7);
   - *closest final eight*: the run whose quarter-finalists, semi-finalists and podium overlap
     most with reality (score: number of real quarter-finalists present + real semi-finalists +
     real podium in the right places; ties broken by the knockout criterion).
   Print each run's simulation number so it can be regenerated (`regenerate(run, i)`).
   Caption: an exact replay of the real tournament is essentially impossible; these are the
   nearest misses by three different measures.

Formal scoring (Brier, log-loss, calibration) is ROADMAP component 12, not this view.
Component 12 is done; the scored record is `docs/BACKTEST.md`.

Data: `sims.parquet`, `teams.parquet`, `matches.parquet`, `wc2026_results.csv` through the
component-7/8 code. Output: `reality.json` (finals table, real path, three closest runs with
their brackets and scores) + one PNG.

## Website data (component 11b)

Beyond the ten views, `intsoccer report --site` writes for the site:

- `teams.json`: `{code, iso, name, group, elo, champion_pct}` for every team, sorted by title
  chance. `iso` is the flagcdn.com code (`SQ` -> `gb-sct`, `EN` -> `gb-eng`, `WA` -> `gb-wls`).
  Display names come from `en.teams.tsv` with two overrides: USA and "Bosnia & Herz.".
- `team_<CODE>.json` for all 48 teams: view 8 plus `name` and `excerpt_text`, the generated
  "one thing to know" paragraph (`report/site.py::excerpt_text`): most common fate and share;
  the team that eliminates it most often; how often they meet in the first knockout round and
  the win rate when they do. Branches for a group-stage modal fate and for a champion modal fate.
- `calibration.json` (from `intsoccer fit`): the diagnostics bins with n >= 30, for the
  calibration chart in the method chapter.

Everything is copied into `site/data/<run name>/`, which is committed so Vercel serves it.
The reality view (10) is written but the site does not render it (design decision, 19 Sep 2026).

## Medium

Decided 13 Sep (late): the visuals are a **website, light theme**, designed in its own
brainstorming session (layout, colours, vibe and tone, sections and text) and then built
**section by section on localhost** with Thiago's feedback at each step, using the frontend
skills from his other project setup. Component 11a already provides everything the site needs
as `output/<name>/report/*.csv|json` and `report.json`; the site renders those files and
recomputes nothing.

Open for the next session: whether component 11b (static PNG charts) is still wanted, or whether
the charts are the website's own components. Suggested order when resuming: brainstorm the site,
then a style sample of one section (the fate table sets the fate palette that views 6 and 8
reuse), then the rest one at a time.

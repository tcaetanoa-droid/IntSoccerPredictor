# 2026 World Cup format: standings, third-place ranking, bracket

Sources: FIFA World Cup 2026 Regulations (May 2025, Annex C for the third-place table), as quoted on Wikipedia (main article, "Tie-breaking criteria" and "Ranking of third-place teams", and the `Template:2026 FIFA World Cup third-place table`). Everything below was cross-checked against the 104 real results in `data/tournaments/wc2026_results.csv`: our standings code must reproduce the real 32 qualifiers and all 16 real round-of-32 pairings (Roadmap components 7 and 8).

## 1. Group standings (12 groups of 4, 3 points a win, 1 a draw)

Rank by points in all group matches. Teams level on points are separated, in order, by:

| Step | Criterion | Scope |
|---|---|---|
| a | points | matches among the tied teams only |
| b | goal difference | matches among the tied teams only |
| c | goals scored | matches among the tied teams only |
| — | if a–c separate *some* of the tied teams, re-apply a–c to those still level | |
| d | goal difference | all group matches |
| e | goals scored | all group matches |
| f | fair-play points (yellow −1, second yellow −3, direct red −4, yellow + direct red −5) | all group matches |
| g | FIFA ranking, most recent | |
| h | progressively older FIFA rankings | |

**This is new for 2026:** head-to-head (a–c) comes *before* overall goal difference. In 2022 and earlier it was overall GD, overall goals, then head-to-head. UEFA uses the head-to-head-first order too, so one "head-to-head first" implementation covers the World Cup and the Euros. CONMEBOL (Copa América) uses overall GD first; keep the rule order configurable per tournament.

Simulation note: we cannot model cards, so steps f–h are replaced by the pre-tournament Elo rating (higher first), then a seeded random draw. `tournament/group.py` reports how deep each tie went (`Standings.depth`); in the real 2026 group stage no tie went past step d. Interpretation used: when a–c separate *some* tied teams, a–c are re-applied to those still level (a fresh sub-table of just their matches); when d or e separate some, the rest continue with the next step rather than going back to head-to-head.

## 2. Ranking the twelve third-placed teams (best eight advance)

Compare all twelve third-placed teams on: points, overall goal difference, overall goals scored, fair-play points, FIFA ranking. Same modelling fallback as above.

Real 2026 third-place table (points / GD / GF): DR Congo 4/+1/4, Sweden 4/0/7, Ecuador 4/0/2, Ghana 4/0/2, Bosnia 4/−1/5, Algeria 4/−2/5, Paraguay 4/−2/2, **Senegal 3/+2/8** (8th, in), Iran 3/0/3 (9th, out), South Korea 3/−1, Scotland 3/−3, Uruguay 2/−1. Ecuador and Ghana were level on all three criteria (both advanced, so it only affected the ranking, not qualification, and the ranking does not affect placement — see below).

## 3. Round of 32 bracket (matches 73–88)

Winners and runners-up have fixed slots. The eight third-placed teams fill eight slots opposite group winners; each slot only accepts thirds from certain groups:

| Match | Home slot | Away slot |
|---|---|---|
| 73 | 2A | 2B |
| 74 | 1E | 3rd from A/B/C/D/F |
| 75 | 1F | 2C |
| 76 | 1C | 2F |
| 77 | 1I | 3rd from C/D/F/G/H |
| 78 | 2E | 2I |
| 79 | 1A | 3rd from C/E/F/H/I |
| 80 | 1L | 3rd from E/H/I/J/K |
| 81 | 1D | 3rd from B/E/F/I/J |
| 82 | 1G | 3rd from A/E/H/I/J |
| 83 | 2K | 2L |
| 84 | 1H | 2J |
| 85 | 1B | 3rd from E/F/G/I/J |
| 86 | 1J | 2H |
| 87 | 1K | 3rd from D/E/I/J/L |
| 88 | 2D | 2G |

**Which third goes where depends only on the *set* of eight groups that supplied a qualifying third, not on the thirds' ranking.** FIFA fixed the assignment for all C(12,8) = 495 sets in Annex C. The full table is in `data/tournaments/wc2026_third_place_table.csv` (columns: `combo`, `groups`, then the third's group for each of the slots 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L). Validated: every row uses each of its eight groups exactly once and only in an allowed slot; row 67 (groups B D E F I J K L, the real 2026 case) reproduces the real fixtures 1E–3D, 1I–3F, 1A–3E, 1L–3K, 1D–3B, 1G–3I, 1B–3J, 1K–3L.

## 4. Later rounds (fixed pairings by match number)

| Round | Matches |
|---|---|
| Round of 16 | 89: W74–W77 · 90: W73–W75 · 91: W76–W78 · 92: W79–W80 · 93: W83–W84 · 94: W81–W82 · 95: W86–W88 · 96: W85–W87 |
| Quarter-finals | 97: W89–W90 · 98: W93–W94 · 99: W91–W92 · 100: W95–W96 |
| Semi-finals | 101: W97–W98 · 102: W99–W100 |
| Third place | 103: L101–L102 |
| Final | 104: W101–W102 |

Verified against the real 2026 knockout results (e.g. R16 France–Paraguay = W77–W74, Morocco–Canada = W75–W73, QF Spain–Belgium = W93–W94, SF Spain–France = W97–W98).

Knockout matches: extra time then penalties if level after 90 minutes. For Elo, a shootout counts as a draw and G uses the score after extra time.

## 5. Home advantage

Hosts played their group matches in their own country (true home games, +100 Elo). In the knockouts the site's venue column shows Mexico's and the USA's matches at home too (e.g. Mexico– Ecuador, USA–Bosnia, Mexico–England), so apply +100 whenever a host plays in its own country. Canada's knockout games were in the USA (neutral).

The host country of every knockout match number is fixed by the schedule and recorded in `wc2026.yaml` under `knockout.venues` (Mexico: 75, 79, 92; Canada: 83, 85, 96; all others USA). The simulator gives +100 to a host in its group matches and in any knockout match whose venue is its own country, so Canada would have been at home in match 85 had it won group B.

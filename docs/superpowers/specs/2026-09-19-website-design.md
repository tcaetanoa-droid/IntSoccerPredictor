# IntSoccerPredictor website: design spec

> Superseded for everything the visitor sees by `2026-09-20-restyle-design.md` (20 September 2026). Hosting is Vercel, not GitHub Pages; see the README.

Date: 19 September 2026. Status: agreed in the brainstorm session of the same day; every choice below was picked by Thiago from rendered mock-ups (kept under `.superpowers/brainstorm/`, not committed). Roadmap component 11b.

## 1. Purpose and audience

A public, light-themed website presenting the 100,000-run World Cup 2026 simulations, with placeholder pages for Euro 2028 and Copa América 2028. It is first a portfolio piece: most visitors will arrive from Thiago's personal website (not built yet), so the tone is confident, explains the model once, and never sells. Football fans get big numbers and clear stories; data-minded readers get the full maths at the end.

## 2. Stack, hosting, repository layout

- Plain HTML, CSS and JavaScript. No framework, no build step, no bundler.
- Charts are drawn in the browser as SVG and HTML from the report JSON. No images of charts.
- KaTeX from the jsDelivr CDN renders the formulas in the method chapter.
- Flags are PNGs from flagcdn.com (`https://flagcdn.com/w40/<iso>.png`), referenced by ISO code. The site never sees eloratings.net codes.
- Hosted on GitHub Pages from the `site/` folder of this repository.
- Layout of `site/`:

  ```
  site/
    index.html            World Cup 2026 (the site)
    euro2028.html         coming soon
    copa2028.html         coming soon
    thiago.html           coming soon (target of the footer link "Thiago Caetano")
    css/site.css
    js/                   one module per chapter plus shared helpers
    data/wc2026/          copied report JSON (see section 4)
  ```

- The site recomputes nothing. Every number comes from a JSON file written by `intsoccer report`.

## 3. Visual language

Option "Pitch", chosen from three rendered directions.

| Token | Value |
|---|---|
| paper (page background) | `#F2F6F1` |
| ink (text) | `#10261A` |
| ink-soft (secondary text) | `#2C4A38`, muted `#5B6E62`, faint `#8A9A90` |
| green (accent, links, current chapter) | `#1B5E3A` |
| orange (highlight, the "real" thing, hot numbers) | `#C2410C` |
| card | `#FFFFFF` with border `#D4DFD4` |
| rule (table lines) | `#E3EAE2`, strong rule = ink |
| headline face | Newsreader (Google Fonts), weight 500, tight letter-spacing |
| body face | IBM Plex Sans |
| numbers | IBM Plex Mono, tabular figures, everywhere a number is a value |

Fate palette, used by chapters 1, 4 and 7 in this order:

| Fate | Colour |
|---|---|
| 4th in group | `#DDE3DC` |
| 3rd, out | `#C9D3C7` |
| Out in round of 32 | `#C2DFC6` |
| Out in round of 16 | `#98C8A2` |
| Out in quarter-final | `#6BAE7C` |
| 4th place | `#3F8F57` |
| 3rd place | bronze `#B87333` |
| Runner-up | silver `#A8A9AD` |
| Champion | gold `#C9A227` |

Team colours (intro chart, hosts chapter, trophy chart) are one solid flag colour per team. Agreed overrides: Portugal red `#DA291C`, Italy dark green `#005F35`. The 48-team map lives in `site/js/teams.js` next to the ISO flag codes (see section 4 for the trap codes).

Chapter header pattern on every chapter: mono kicker `0N · Title case name`, Newsreader h2, one intro paragraph at 16px/1.55 in ink-soft with the key phrase in bold ink.

## 4. Data contract (report-layer changes)

`intsoccer report` today writes one file per view plus `report.json` under `output/<name>/report/`. For the site it also:

1. **Writes a JSON per team**, `team_<CODE>.json`, for all 48 teams (the existing `team_page()` in a loop), plus `teams.json`: a list of `{code, iso, name, group, elo, champion_pct}` sorted by title chance, for the picker and for every place the site needs a name or a flag.
2. **Generates the team-page paragraph** ("The one thing to know") as `excerpt_text` in each team file, from a rules-based template:
   - most common fate and its share ("Spain's most common ending is the round of 32, where 24.7% of its runs stop");
   - the team that eliminates it most often and that team's share of eliminations;
   - how often the two meet in the first knockout round and the win rate in those meetings;
   - branches: if the most common fate is a group-stage exit, lead with that and say how often the team got out at all; if the most common fate is the trophy, lead with that. The generator is a pure function with tests: Spain, Qatar and one mid-table team.
3. **Exports the calibration bins** from `intsoccer fit` as `data/calibration.json` (bin, n, observed and predicted goals, win and draw rates; bins with fewer than 30 matches dropped). The report copies it into the site data.
4. **Copies the site's data** into `site/data/wc2026/` (`report.json`, the per-team files, `teams.json`, `calibration.json`). `output/` is gitignored; `site/data/` is committed so GitHub Pages serves it.
5. **Name and flag map.** `teams.json` carries the ISO flag code. eloratings.net codes are not ISO: `SQ` Scotland → `gb-sct`, `EN` England → `gb-eng`, `WA` Wales → `gb-wls`, `IE` Republic of Ireland → `ie`, `IR` Iran → `ir`. Display names come from `en.teams.tsv` with two overrides: United States → "USA", Bosnia and Herzegovina → "Bosnia & Herz.".

## 5. Page structure

Three real pages plus one placeholder. The World Cup page is one long scroll in this order.

0. Hero
1. Who wins it (fate table)
2. Group stage
3. The bracket
4. The hosts
5. Underdogs
6. Paradoxes
7. Pick a team
8. How it works
9. Footer

The "What really happened" chapter (reality overlay, view 10 of `docs/REPORTS.md`) was designed, reviewed and **dropped**. Its two useful facts live elsewhere: the hero says the real final was the most common one, the bracket caption says the real tournament produced the same four semi-finalists and the same final. `reality.json` is still written but not rendered.

### Site header
Wordmark left: "IntSoccerPredictor" in Newsreader 600, "Soccer" in green. Right: World Cup 2026 (current, orange underline), Euro 2028 and Copa América 2028 each with a small grey "soon" pill, How it works, GitHub.

### Sticky chapter navigation
A left rail on desktop: the eight chapters with mono numbers, fixed while scrolling, the chapter on screen in green bold. On phones it collapses to a "chapters" button that opens the same list.

### Hero
Split layout. Left: kicker "FIFA World Cup 2026 · 100,000 replays · Elo + Poisson + Monte Carlo"; headline **"I simulated the 2026 World Cup 100,000 times. *Spain won 18,626 of them.*"** (second sentence italic orange); intro paragraph "No betting odds, no pundits, no FIFA ranking. Just the eloratings.net ratings from 10 June 2026, a Poisson model for goals fitted on 7,500 real matches, and 100,000 seeded replays of the full tournament. Every number on this page is counted from those runs."; number strip 100,000 simulated tournaments · 104 matches per run · 1 real result to answer to. Right: chart **"Champions, in 100,000 runs"**, subtitle "Number of runs each team lifted the trophy", the top eight teams as horizontal bars in solid flag colours with real flags, values as counts, no "won" tag; a line beneath: "The other 40 teams won the remaining 33,716 runs between them. Nobody outside this list clears 3,200." Below both: the chapter row (01 Who wins it … 08 How it works).

### Chapter 1: Who wins it
Heading "Every team's fate, counted." Full table, all 48 teams sorted by titles: Team (flag + name), Group, Elo, then the nine fates as counts with thousands separators, then subtotals Advanced and 3rd in group. Each fate column is tinted on its own scale in its fate colour (tint proportional to value / column max, exponent 0.55, capped so the strongest tint is 85% of the fate colour). **All digits in ink; never white text.** Column headers carry a colour swatch and sort the table on click. Footnote on counts versus percentages and on the overlapping subtotals.

### Chapter 2: Group stage
Heading "Who gets out of the group." Twelve cards, 4 × 3, A to L. Each card: "Group X" and a right-aligned note "third usually goes through" or "third usually out"; four rows sorted by advance chance: modal finishing position (mono, small), flag, name, "host" tag in orange for US/MX/CA, a bar, and the rounded percentage. Rows one and two shaded `#E4F0E5`; row three shaded `#F1F6EF` in exactly the eight groups where `third_shaded` is true; row four in muted ink. Legend above, footnote on the Group D case (USA out more often than Australia yet fourth more often than third).

### Chapter 3: The bracket
Heading "The most likely road to the final." Intro explains modal group orders and conditional winners and ends: "It is the path of most likely steps, **not the most likely single tournament**, which is far rarer. The real tournament got the same four semi-finalists and the same final." (No "model says" sentence.) Classic two-sided bracket: round of 32 on the outer columns, final in the middle with the champion above it and the third-place match beneath; each tie box shows both teams with flags, both conditional percentages, the winner row shaded green, FIFA match number in the corner. **Connector lines between boxes** are part of the build. Left half feeds match 101 (R32 74, 77, 73, 75, 83, 84, 81, 82), right half feeds 102 (76, 78, 79, 80, 86, 88, 85, 87). Footnote gives the conditional-probability example (Spain beat Austria in 81% of the 28,929 runs where they met in match 84) and the Germany/Norway coin flip.

### Chapter 4: The hosts
Heading "Home advantage only goes so far." Intro "The rule, then the verdict" (hosts seeded into their own groups, +100 at home, Canada's knockouts in the USA so no bonus; Mexico strongest, Canada nearly always out of the group and out in the next two rounds, USA one run in four bottom of Group D). Chart title "How far the hosts go", subtitle "How often each host's World Cup ended at each stage". **Small multiples**: three mini bar charts side by side, Mexico, Canada, USA, nine fates each, every bar in that host's flag colour (Mexico `#006847`, Canada `#D52B1E`, USA `#3C3B6E`), values as counts of 100,000.

### Chapter 5: Underdogs
Heading "From no chance to first chance." Intro "Two ends of the field" (Curaçao got out in 13,555 runs and lifted the trophy in exactly one; Portugal and Colombia each won it in roughly one run in twenty, level with Brazil; the Netherlands in one in thirty). Two rows of cards. Row one, sub-heading "Trapped in the group stage": five cards, the five lowest escape chances (Curaçao, Ghana, Qatar, Iraq, Haiti), each with flag, name, Elo, a thin stacked bar GS4 / GS3-out / advanced, the escape count as the big number, then 4th in group, 3rd out and champion as counts. Caption: for all five the most common outcome is fourth in the group, 76.7% for Curaçao. Row two, sub-heading "Most likely first-time champions": three larger cards (Portugal, Colombia, Netherlands) with "no World Cup title" in orange caps, the title count in gold as the big number, then got out of the group, reached a quarter-final, reached the final. Caption on the 40 never-won teams.

### Chapter 6: Paradoxes
Heading "Why the strongest team is not always the favourite." Intro "Explain the gap" (Elo measures strength; odds also depend on draw, bracket and venue; two illustrations: past glory buys nothing, and home is worth about a hundred points). Chart first, then three versus cards. Sub-heading **"New contenders, faded giants"**, description "Three teams that have never won it, each more likely to lift the trophy than Germany, a four-time champion. Italy has four titles and no chance at all: it did not qualify." Vertical bars in flag colours (Portugal red, Colombia yellow, Netherlands orange, Germany black, Uruguay light blue, Italy dark green as a flat bar), percentages above, "never won it" / "4× champion" under the names, a dashed divider labelled NEW CONTENDERS | FADED GIANTS. Sub-heading **"Elo is not tournament odds"**, description "A rating says how good a team is. A tournament also asks who you play, and where. Three pairs where the lower-rated team has the better number." Three versus cards: Argentina v France (chance of losing the round-of-32 tie once there, 31.6% v 25.3%), Austria v USA (title chance 0.78% v 0.97%), Uruguay v Mexico (1.8% v 2.1%); the better number in orange, a one-line reason under each (Group J sends Argentina into Uruguay 48% of the time; the hosts play their knockouts at home).

### Chapter 7: Pick a team
Heading "One team, one hundred thousand tournaments." Intro "What the page shows" (every team has its own version of this page … Spain is up first, as the favourite. Pick any of the 48). Picker: a dropdown with flag and name, all 48 sorted by title chance; changing it re-renders the page from that team's JSON and updates the URL hash (`#team=AR`). Layout: dashboard cards. Team header (large flag, name, "Group H · Elo 2157, highest in the field" for the top-rated team, else "Group X · Elo NNNN"; title count in gold at the right, "won the tournament"). Cards: (wide) "How <Team>'s 100,000 runs ended", the fate bar with counts inside segments ≥ 6% and a legend with all nine counts; "How far <Team> gets", a stepped list R32, R16, QF, SF, Final, Champion with bars and counts; "Most common opponent, round by round", three per round with flag and share of the runs the team reached that round; "Who knocked <Team> out", five bars in orange with shares; "The one thing to know", the generated `excerpt_text`.

### Chapter 8: How it works
Heading "Under the hood." Intro: "This is not a betting model and does not use odds, rankings or expert picks. It has two fitted parameters and four formulas, and this section walks through all of them: … regenerated." Six numbered steps, each in two columns (prose left, maths right):

1. Start from the ratings. Formula for W_e; key: W_e, d_r; note that W_e is only used in the update.
2. Turn the gap into expected goals. Formulas for d_r and λ_A, λ_B; **plain-language key for every symbol** (R_A, R_B, d_r, λ, e^x, a, b); parameter table (a 0.136, b 0.00176, c_friendly −0.008); examples.
3. Play the match. Poisson formula; key for P, k, λ, λ^k, k!, e^−λ; prose explains what a Poisson distribution is in words. Note on the draw rate 0.28 v 0.30.
4. Update the ratings after every match. Update formula; key for R_old, R_new, K, G, W, W_e, W − W_e; K and G tables; the "equal and opposite, verified within ±1" note; **worked example: the real final**, Spain 1–0 Argentina, 2232/2200 → +27.2.
5. Play the whole tournament, 100,000 times. Rules as data, tiebreakers, best thirds, fallback to Elo then a seeded draw, seeded runs, all runs stored. Right column: the two validation checks (real 32 qualifiers, all 16 real R32 pairings). **No timing figure.**
6. What it gets wrong. Draws under-predicted; "The known fix is the Dixon–Coles correction, a single extra parameter that nudges the four low-scoring lines (0–0, 1–0, 0–1, 1–1) towards their real frequencies. It will be added for the Euro 2028 and Copa América 2028 simulations."; flat home advantage; no squads, injuries, form or weather; calibration within about 0.05 goals and 0.02 win rate between −700 and +700. **Full-width calibration chart** beneath the step, drawn from `calibration.json`: two panels (mean goals; win and draw rates), model as lines, observed as hollow dots sized by bin count, y-axis sized to the data, caption as in the mock-up.

Then a "Reproduce it" box with the five commands and a pointer to the footer link.

### Footer
Dark (ink background), three columns. About: wordmark and "100,000 replays of international tournaments from Elo ratings. A personal project by Thiago Caetano, not affiliated with FIFA, UEFA, CONMEBOL or eloratings.net." Data: eloratings.net, FIFA regulations via Wikipedia, flags from flagcdn. Links: Source code on GitHub, How it works, **Thiago Caetano** (points to `thiago.html` until the personal site exists, then to it).

### Coming-soon pages (euro2028.html, copa2028.html)
Same header and footer. Kicker with the tournament name, heading "Coming after the draw.", a "what we know" card (Euro: 9 June to 9 July 2028; England, Scotland, Wales, Republic of Ireland; 24 teams, six groups, four best thirds, no third-place match; qualifying draw 6 December 2026, finals draw not held. Copa: "host, dates and format not yet announced"), a "What will be here" paragraph (the same eight chapters, run the day after the draw, scored against the real tournament), and a "Model change" paragraph (Dixon–Coles for these two runs). `thiago.html` is a one-line version: "Thiago Caetano's personal site is coming soon."

## 6. Behaviour and quality rules

- Responsive at 375, 768, 1024 and 1440 px. Phone: single column everywhere, the fate table and bracket scroll horizontally inside their container, the group cards go 1 × 12, the small multiples and versus cards stack, the rail becomes a button. No horizontal page scroll.
- Hover: rows highlight, bars and segments show a tooltip with the exact value; sortable column headers show a pointer cursor and the sort direction.
- Text contrast at least 4.5:1 on paper and on white; focus rings visible; `prefers-reduced- motion` disables the few transitions.
- No emoji icons. The only icons are flags.
- Every chart has a title, a unit line and, where colour carries meaning, a legend.

## 7. Testing and acceptance

- Report layer (pytest): 48 team files written; `teams.json` has 48 rows sorted by `champion_pct` with valid ISO codes; `excerpt_text` tests for Spain, Qatar and one mid-table team; `calibration.json` has the 20 bins with n ≥ 30.
- Site: a smoke script (Python, no browser) that loads each page's JSON references and checks every file the site fetches exists in `site/data/`. Visual checks with headless Chrome screenshots at the four widths, reviewed by eye, during the section-by-section build.
- Acceptance is section by section on localhost with Thiago, in the page order above, hero first. Each section is compared against its final mock-up.

## 8. Out of scope

Dixon–Coles (component for the 2028 runs); a simulation browser; Brier/log-loss scoring (component 12); dark mode; analytics.

## 9. Build order

1. Report layer: per-team files, `teams.json`, `excerpt_text`, `calibration.json`, site copy.
2. `site/` skeleton: tokens, fonts, header, rail, footer, the three placeholder pages.
3. Hero, then chapters 1 to 8 one at a time, each reviewed on localhost before the next.
4. GitHub Pages deployment.

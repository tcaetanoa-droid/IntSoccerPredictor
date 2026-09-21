# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: portfolio visitors. Recruiters and hiring peers who judge craft, thinking,
problem-solving, product design, product management and engineering. They arrive from Thiago's
personal website (not built yet; it will link here), usually while he is looking for a new role.
They decide in minutes whether the work is good.

Secondary, confirmed: football fans who want big numbers and clear stories, and data-minded
readers who want to check the method. Both are served after the primary audience, never
instead of it. (Confirmed by Thiago, 20 Sep 2026.)

## Product Purpose

IntSoccerPredictor publishes a Monte Carlo replay of the 2026 FIFA World Cup: 100,000 seeded
runs from the eloratings.net ratings of 10 June 2026, scored against what actually happened.
The site tells it in a hero and eight chapters: who wins it, the group stage, the bracket, the
hosts, the underdogs, the paradoxes, pick a team, how it works. It exists because Thiago
watched the tournament and wanted to know how well a simple, transparent model could have
called it. Success is a visitor understanding what was simulated and how closely it matched
reality, and a recruiter seeing the craft and the thinking behind it. UEFA Euro 2028 and Copa
América 2028 run on the same code once their formats are known; their pages are placeholders.

## Positioning

Every number is counted from stored simulation runs and can be traced back to them. The
ratings are public, the goals model is fitted only on the 7,526 real matches before the
tournament, and the results are checked against the real 2026 World Cup. No betting odds, no
pundits, no FIFA ranking, and the page itself never computes a statistic. A neighbouring
site could show predictions; it could not truthfully claim this transparency and this
backtest.

## Operating Context

- `intsoccer report --site` writes the site's data into `site/data/wc2026/` (`report.json`,
  one `team_<CODE>.json` per team, `teams.json`, `calibration.json`), specified in
  `docs/REPORTS.md`. The data is committed; the site reads it and renders in the browser.
- Vercel deploys from `main` with the root directory set to `site/`; every pull request gets a
  preview URL. Live at int-soccer-predictor.vercel.app.
- Design work is built one section at a time with a checkpoint on localhost after each,
  in page order: hero, then chapters 01 to 08.
- The personal website is the next project. It gets its own visual world; it inherits nothing
  visual from this restyle.

## Capabilities and Constraints

- Plain HTML, CSS and JavaScript. No framework, no build step, no bundler. The DOM of every
  section is built by the modules in `site/js/` from the JSON data; `site/index.html` holds
  only the shell. KaTeX renders formulas from the jsDelivr CDN; flags are PNGs from
  flagcdn.com by ISO code.
- Page structure is fixed: hero, eight chapters in the order above, footer. Three placeholder
  pages: Euro 2028, Copa América 2028, and `thiago.html` until the personal site exists.
- Chapters are known by name. The 01 to 08 numbering and the numbered chapter rail are
  dropped (Thiago, 20 Sep 2026); how a visitor finds a chapter is a design decision.
- Voice is first person, confident, explains the model once and never sells. The voice and the
  chapters stay. Sentences may be reworded or cut where a new design warrants it (Thiago,
  20 Sep 2026).
- Terminology: "runs" or "replays" for simulations; a team's "fate" is the round where its run
  ended, on a nine-step scale from fourth in the group to champion, used by chapters 01, 04
  and 07. Teams are shown by name and flag; eloratings.net's two-letter codes never appear.
- Undecided: the software license; the Euro 2028 and Copa América 2028 formats and draws.

## Brand Commitments

- Name and wordmark: IntSoccerPredictor, set as text. There is no logo.
- Light theme, a standing preference for all of Thiago's sites.
- Type: no house type. Decided 20 Sep 2026 (revised the same day): every project of Thiago's
  chooses its own visual world and faces for its own subject; nothing is shared with Guard or
  with the personal website. This site's faces are recorded in DESIGN.md at the finish and bind
  this site only. What the projects share is the craft standard and the first-person voice.
- Palette: the green-and-paper palette Thiago chose from rendered options on 19 Sep 2026
  (the tokens at the top of `site/css/site.css`, including the nine-step fate scale) is
  pinned for the restyle. Decided 20 Sep 2026 with the route: a new look, palette kept,
  type open.

## Evidence on Hand

- The 100,000-run results for all 48 teams in `site/data/wc2026/`, including each team's
  fates, the group odds, the most-probable bracket, the paradox pairs and a per-team paragraph.
- The real 2026 results, all 104 matches with pre-match ratings, in
  `data/tournaments/wc2026_results.csv`.
- The goals-model calibration: `site/data/wc2026/calibration.json` and
  `docs/img/goals_model_diagnostics.png`.
- Headline facts: Spain won 18,626 of the 100,000 runs; the real final was the most common
  one; the real tournament produced the same four semi-finalists.
- Absent, never to be fabricated: testimonials, press, user counts, usage metrics, betting
  comparisons.

## Product Principles

1. Counted, not computed: every number on the page comes from a stored run and the page
   never derives a statistic of its own.
2. Explain the model once, with confidence, then let the numbers carry the story.
3. Show the work: the reality check and the method are part of the product, not an appendix.
4. The page is the portfolio claim. Its craft is evidence of thinking and execution.
5. Rules and content live in data, so Euro 2028 and Copa América 2028 arrive without a
   redesign.

## Accessibility & Inclusion

No standard is mandated. Motion honours `prefers-reduced-motion` (inferred from the current
stylesheet, which already disables transitions under it; a requirement now that motion is
part of the design). Chapter navigation stays keyboard-reachable, and every flag is paired
with the team's name.

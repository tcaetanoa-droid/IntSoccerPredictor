# Handoff: IntSoccerPredictor, 19 Sep 2026

For a fresh Claude Code session picking up this project. Read this, then `CLAUDE.md`, then
`docs/REPORTS.md`. Everything is committed and pushed to `origin main`; the tree is clean.

## Where the project is

Roadmap components 0–10 and 11a are done (see `docs/ROADMAP.md`):

- Elo engine, goals model, match simulator, tournament loader, group standings, knockout
  bracket, single-tournament simulation, Monte Carlo runner. All validated against the real
  2026 World Cup (real results reproduce the real 32 qualifiers and all 32 knockout pairings).
- `output/wc2026/` holds the **100,000-run store** (seed 2026, ~56 MB, gitignored, regenerable
  with `intsoccer simulate --n 100000 --seed 2026`, ~7.5 min). Every match, every team's fate
  and every simulation are Parquet tables; simulation i is seeded as `[2026, i]` and can be
  rebuilt alone with `montecarlo.regenerate(run, i)`.
- `output/wc2026/report/` holds the **report data layer** (component 11a): one CSV/JSON per
  view plus `report.json`, rebuilt with `intsoccer report --run output/wc2026` (~20 s).
  The ten views are specified in `docs/REPORTS.md` and were agreed with Thiago one by one.
- 87 tests pass (`pytest`). One test pins the numbers quoted in `docs/REPORTS.md` to the real
  100k store and is skipped if the store is absent.

Headline numbers (100k runs): Spain 18.6% champion, Argentina 13.7%, France 9.8%. The real final
(Spain beat Argentina) was the most common final at 3.04%. The most-probable bracket reproduces
the real semi-finals and the real final.

## What is left

| # | Item | Notes |
|---|---|---|
| 11b | Website | **Next. Brainstorm first (see below).** Replaces the original "PNG charts" idea: the site's components are the charts, fed by `output/wc2026/report/*.json`. Not yet on the roadmap table as a component; add it. |
| 12 | Backtest | Brier / log-loss / calibration vs the real 2026 results; pure Python; a good switch when design work stalls. |
| 15 | CI | GitHub Actions running pytest on push. |
| 16, 17 | Performance, model refinements | Optional. |
| 13, 14 | Euro 2028, Copa 2028 | Wait for the draws; on the site they are "coming soon" pages. |

## The website: decisions already made

- **Public site**, World Cup 2026 now, Euro 2028 and Copa América 2028 as "coming soon" pages.
- **Light theme.**
- **Brainstorm before building**: layout, colours, vibe and tone, the section list and copy.
- **Build section by section on localhost**, showing Thiago each piece for feedback before the
  next one. Never build the whole site in one go.
- Thiago disliked the look of the slide-style screenshots in `docs/REPORTS.md` (his friend's
  version): take the *numbers and arrangement* from them, not the styling.
- The site **renders `output/<name>/report/*.json` and recomputes nothing**, so Euro/Copa 2028
  will need only a new run and report.

## How to resume the brainstorm (exactly where we stopped)

Skills are installed in `.claude/skills/` (obra/superpowers incl. `brainstorming` with its
localhost visual companion, and `ui-ux-pro-max`); `frontend-design` is the global Anthropic
plugin. Invoke, in this order, with the Skill tool:

1. `brainstorming` — follow it. The task is **architectural** (a new project): clarifying
   questions one at a time, then 2–3 approaches, then a design presented in sections with
   approval after each, then a spec at `docs/superpowers/specs/2026-09-19-website-design.md`,
   then the `writing-plans` skill. Offer the visual companion only when a question is truly
   visual (layout / colour comparisons), as its own message.
2. `ui-ux-pro-max` — for palette, typography and UX rules. Its search script:
   `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p
   "IntSoccerPredictor"`. A first probe suggested a "Data-Dense Dashboard" style with a
   blue-and-amber light palette; treat that as one input, not the answer.
3. `frontend-design` — Anthropic's design guidance (avoid generic AI-page tells, one memorable
   element, deliberate type).

**The first clarifying question was asked and is still unanswered.** Ask it again:

> Who is this site mainly for?
> A. Football fans who want to browse (big numbers, clear stories, light on method).
> B. Data-minded people who want to check the work (method front and centre).
> C. A portfolio piece (balanced story and method, "how it works", link to the repo).
> D. Mostly Thiago and friends (exploration first, less explaining).

Questions worth asking after that, one per message: tech stack and hosting (static site vs
framework; Thiago has Next.js experience from other projects but nothing is decided), single
long page vs multi-page, how much interactivity (static views vs pick-any-team / pick-any-
simulation explorers), and where the "how it works" method section sits.

## Files a website session will touch

- `output/wc2026/report/report.json` — everything in one file; also one file per view:
  `group_advance.csv`, `fate_table.csv`, `weakest_teams.csv`, `lowest_elo_teams.csv`,
  `first_time_champions.csv`, `trophy_paradox.csv`, `hosts_exit.csv`, `paradoxes.csv`,
  `team_ES.json`, `bracket.json`, `reality.json`.
- `src/intsoccer/report/` — `tables.py` (views 1–8), `bracket.py` (9–10), `build.py`
  (writer; per-tournament editorial choices in `FOCUS`).
- `data/tournaments/wc2026.yaml` — groups, hosts, bracket, venues, past champions.
- Team names: codes are eloratings.net's (`SQ` Scotland, `IE` Ireland, `IR` Iran); the code →
  name lookup is `data/raw/en.teams.tsv` after `intsoccer fetch`. The site needs a code → name
  (and flag) map; none exists in the report files yet.

## Pushing to GitHub

Two GitHub accounts are logged in on this machine. The repo belongs to `tcaetanoa-droid`; if
the active `gh` account is `guard-supplements` a push fails with "Repository not found". Fix:
`gh auth switch --user tcaetanoa-droid`, push, then `gh auth switch --user guard-supplements`
so the other project is unaffected.

## Working agreements

- One component per sitting; ask before design-changing choices; routine choices decide and
  mention. Commit only when Thiago says so, as `Component N: <what>`, then push.
- Reader-facing facts go in `README.md`, not `CLAUDE.md`.
- Memory files for this project are in
  `~/.claude/projects/-Users-thiagocaetano-Developer-IntSoccerPredictor/memory/`.

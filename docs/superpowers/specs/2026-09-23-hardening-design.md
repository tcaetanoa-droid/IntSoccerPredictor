# 11f Internal hardening: design

Component 11f of [docs/ROADMAP.md](../../ROADMAP.md). Designed with Thiago on 23 September 2026.

## 1. What this is

The final review before PR #2 (22 September 2026) left a list of hardening items that touch no
ordinary read of the sheet; the backtest's final review added a twelfth. This design settles all
twelve, one visitor-facing fault found while reading them (a failed pick blanks chapter seven),
and the clean-up left by dropping 11g (the Reality check unit, scrapped 23 September 2026).

Thiago's decisions, 23 September 2026:

- **Fix:** 1, 2, 5, 6, 12 and the failed pick.
- **Measure, then fix only what fails the criteria in section 5:** 3, 4 and 8.
- **Close in the docs, no code:** 7, 9, 10 and 11.
- The failed pick restores the previous team and says so in one line.
- `site/data/wc2026/backtest.json` is deleted with the `intsoccer backtest --site` flag.

Nothing a visitor sees in an ordinary read of either page changes; section 10 proves it.

## 2. Design authority

- PRODUCT.md: `PRODUCT.md`
- DESIGN.md: `DESIGN.md`
- Surface brief: `.impeccable/surfaces/site-index-html.md` (seed key bed5693b), unchanged: this
  work extends the existing surface and its world.
- Detector baseline: 2 findings on 23 September 2026, both `wide-tracking` on How it works (the
  .06em caps labels DESIGN.md sanctions, which a dump cannot show are capitals); 0 on the World
  Cup page. Command: `impeccable detect --json` on headless-Chrome `--dump-dom` renders of
  `/world-cup-2026` and `/how-it-works` at 1440×900, with `css/` beside them.
- Critique snapshot: `.impeccable/critique/2026-09-22T07-51-55Z__site-index-html.md` (local).
- Motion thesis: unchanged (restyle spec §4, DESIGN.md "The Print"). These fixes make two of its
  rules hold at every width: a unit never un-prints, and reduced motion is the finished sheet.
- Type roles: unchanged. The one new line of text takes the foot-note role (News Cycle .8rem,
  muted), through the chapter's existing `.foot` class.

## 3. The items and where each lands

| # | Item | Disposition |
|---|---|---|
| 1 | Hero rows un-print when the width crosses 1024px mid-fill | Fix, section 4.1 |
| 2 | Sideways cue and bracket summary frozen under reduced motion | Fix, section 4.2 |
| 3 | Chart redraws and pin re-layout on height-only resizes; no zero-width guard | Measure, section 5 |
| 4 | `tick()` interleaves layout reads and style writes | Measure, section 5 |
| 5 | A stale first draw can overwrite an early pick | Fix, section 4.3 |
| 6 | Helpers duplicated across modules | Fix, section 6 |
| 7 | Spec §3.1's promised tint contrast cap is not in code | Close, section 8 |
| 8 | `groups.js` reads the grid's computed style per box per frame | Measure, section 5 |
| 9 | Stale spec lines (hover transition, hero leading) | Close, section 8 |
| 10 | The 516px gap behind chapter two's lead "lives only in a comment" | Close, section 8 |
| 11 | Sort arrows and the clear × against the glyph ban | Close, section 8 |
| 12 | `resolve_meta_path` substitutes a file silently | Fix, section 7 |
| new | A failed pick download leaves chapter seven blank | Fix, section 4.4 |

## 4. Visitor-facing fixes

### 4.1 The hero across 1024px (item 1)

At 1024px and wider the champion column is pinned and fills with one progress, `pinned.p`, each
row painted at `rowWindow(p, i, 13)`; narrower, it flows and each row keeps its own progress
`r.p` from the reading line, never lower. The pinned branch of `tickPin` never records `r.p`, so
a width change mid-fill switches methods without the progress: going to the pin, every row is
repainted from the pin's own progress (a row printed in flow drops back); going to flow, rows
restart from zero as they cross the line.

Fix: each row keeps `r.p` in both modes. The pinned branch paints `max(r.p, rowWindow(...))`,
stores it, and paints only rows whose value moved (the budget rule). `pin()` starts `r.p` at
the value it paints, 1 under reduced motion. The flow branch is unchanged. The chapter gate stays
right without seeding `pinned.p`: a pinned hero is the held content plus 1.35 screens tall, so
chapter one stays below the fold until the pin's own travel passes 1.

Rejected: locking the mode after the first scroll. After a real rotation the pinned layout would
no longer fit the screen.

### 4.2 Reduced motion follows the width (item 2)

`boot()` returns under reduced motion before it listens for resize or for the faces settling,
so `layoutScrollX()` runs once and the `.sx` class, the "Scrolls sideways" line and the
bracket's phone summary (`#bracket .lock:has(> .scroll-x.sx) .bsum`, site.css) keep their
load-time state.

Fix: one `relayout` (read the viewport, `layoutPin()`, and `schedule()` only when motion is on)
is registered for `resize` and `document.fonts.ready` before the reduced-motion return. Under
reduced motion it never paints from the scroll, so the finished sheet stays finished.

### 4.3 The first load against an early pick (item 5)

`render()` in `team.js` ends with `draw(await ctx.team(code), false)`. A pick made while that
file downloads draws its team; the first draw then lands on top with Spain's data under the
picked team's flag. Fix: the first draw takes the generation counter every pick increments, and
draws only if no pick has happened since. Accepted: a pick that fails (4.4) while the first team
is still loading leaves the line over an empty chapter; the next pick draws.

### 4.4 The failed pick (found 23 September 2026)

`pick()` fades the old team out while the new team's file downloads. If the download fails,
`Promise.all` rejects, the fade still runs to paper, and nothing restores it: the chapter stays
blank with no message until a pick succeeds.

Fix, in `pick()`:

1. Remember the team and the address hash on the page before the pick.
2. Start the fade, await the file, then await the fade (the same concurrency as today).
3. On a failure, wait for the fade, and if no newer pick has started: put the previous team back
   (its code, the address hash, its name in the search field, the body's ink) and print under the
   search field: **"Brazil's runs did not load. Pick again to retry."** (the picked team's name
   in place of Brazil's).
4. The next pick clears the line.

The line is a `<p class="foot" role="status">` inside the picker (`.pk`), after the search field,
present from the first render so assistive technology announces its text when it is set. Empty,
it takes no height: its margins collapse into the picker's bottom margin. It is feedback, not a
printed unit, so it shows at full foot-note ink at once. Under reduced motion there is no fade
and the restore is immediate.

## 5. Measured items (3, 4 and 8)

The criteria are fixed before any number is seen. `tools/check.mjs measure` (section 9) runs
headless Chrome at a 6× CPU slowdown in two profiles, a phone (390×844, device scale 3, mobile,
touch) and a desktop (1440×900), on the code as it stands before this component's fixes. A
script loaded before the page's own times every `requestAnimationFrame` callback (the engine's
tick runs there, and the layout it forces is synchronous, so it lands inside) and every window
`resize` handler.

- **4 and 8, one decision** (both are layout reads inside the frame). Scroll the whole of
  `/world-cup-2026` top to bottom at two screens a second. The engine's frame work is the
  duration of each animation-frame callback during the scroll (the engine's tick, the pins'
  schedules inside it, and the layouts they force). If it exceeds **8 ms at the 95th
  percentile** in either profile (half a 60 fps frame, leaving the rest for the browser's own
  style, layout and paint), fix both: `tick()` measures every live unit, then
  paints them; `groups.js` keeps its column count from the last layout (measured once the wall
  is on the page and again on each resize) instead of reading the computed style per box per
  frame. Re-measure and report. Otherwise close both with the numbers.
- **3.** At three places on the page (the hero, the bracket, the hosts), change the phone
  profile's height from 844 to 788 and back, as an address bar does. If the resize handlers of
  one change together exceed **16.7 ms** (one frame), the four charts (the bracket's connectors,
  the hosts, the paradoxes, the calibration panels) skip a resize-driven redraw when their
  measured width is unchanged or zero; one guard covers both halves of the item. The redraw once
  the faces settle always runs, since the faces move the boxes without moving the width.
  Re-measure; if the engine's own `layoutPin()` still carries the excess, it skips a height-only
  change while neither pin is engaged, then re-measure once more. Otherwise close with the numbers.
- The numbers go into the roadmap's 11f note and the pull request, whichever way they fall.

## 6. Shared helpers (item 6)

Each helper moves to the module that owns its idea; no new file.

- `print.js` exports `inkAt(p) = 0.04 + 0.96p` (the 4% floor of unprinted text, row heads and
  cells; 19 copies in 7 modules), `ruleAt(p) = 0.06 + 0.94p` (the 6% floor of a box's rule
  through `--bp`; 4 copies in 3 modules) and `reduced()` (a copy in `team.js`). The names are
  not `ink` and `rule` because `paradoxes.js` and `underdogs.js` already use `ink` for a local
  progress.
- `svg.js` exports `snap(v) = Math.round(v) + 0.5`, now private to each of the four chart
  modules.
- `print.js` drops its private `fmt` and imports `fmtCount` from `dom.js` (the two modules
  already import each other); the Node test for `fmt` tests `fmtCount`.
- Every call site keeps its own formatting (`.toFixed(3)` and the bracket's `× 0.75`), so the
  painted strings stay byte-identical; section 10's dump proves it. The Node tests pin
  `inkAt` and `ruleAt`.

Rejected: a new `helpers.js` holding all four. One import line per module, but a grab bag, and
the formulas the Node tests pin already live in `print.js`.

## 7. The run's recorded paths (item 12)

`resolve_meta_path` returns a recorded path when it exists, else the file of the same folder
and name in this checkout. The fallback exists because runs record absolute paths and the project
folder has moved; it stays, and it now emits a `UserWarning` naming the recorded path and the
substitute, so a run pointed at a variant tournament file can no longer be read against this
checkout's own file unnoticed. The existing test asserts the warning with `pytest.warns`.
Rejected: asserting that the loaded tournament's rounds match `run.meta["rounds"]`, which
catches a structural mismatch only.

## 8. Closures and clean-up

- **7.** Measured on 23 September 2026 with the pinned tokens: ink on a fate tint falls under
  4.5:1 only on 4th place above 92.4% strength (a 37.0% share) and on 3rd place above 95.3%
  (38.1%); every other fate clears it at full strength. The highest shares on the 2026 sheet
  are 5.3% and 9.3%, and no real tournament gives a team a 37% chance of finishing fourth.
  Restyle spec §3.1's promised cap is replaced by these numbers, and DESIGN.md's fate scale
  carries them in one sentence. No cap in code.
- **9.** Restyle spec §4's two "120 ms" hover lines state the build: `filter: brightness(.94)`
  with no transition (DESIGN.md's Don'ts already say so). §6's "1rem on 1.8" and the §3.2 type
  table's hero row (the same stale value, a third line) become 1rem, line-height 1.5, .15rem
  padding.
- **10.** Nothing to write: the restyle spec's §8 owner amendment (commit b28fb5c, before the
  11f list was written) records the 516px gap and the clearance formula. The roadmap says so.
- **11.** DESIGN.md's Buttons paragraph records the ruling: the sort arrows and the clear × are
  characters in the text face, not an icon system; passed twice in review; they stay.
- **11g dropped.** The roadmap's row 11 and its 11g note, the README's status table and
  `docs/BACKTEST.md` stop listing it. The workspace's `context/current-priorities.md` and
  `projects/README.md` follow in a workspace commit.
- **`backtest.json` deleted.** The file, `intsoccer backtest --site`, `site_payload()` and the
  `site_dir` argument, the test's site-file assertions, and the mentions in the README (quick
  start, layout), `docs/BACKTEST.md` and the `backtest/build.py` docstring. The record stays in
  `output/<run>/backtest/` and `docs/BACKTEST.md`.
- **The failed-pick line** gets one sentence in DESIGN.md's Inputs / Fields.
- **The roadmap** marks 11f done; its note becomes the record: what was fixed, what was measured
  and the numbers, what was closed and why. The README gains `node tools/check.mjs` in the quick
  start and in the layout's `tools/` line.

## 9. `tools/check.mjs`

A committed dev tool, Node 24, no dependencies: Node's built-in `WebSocket` against the Chrome
DevTools Protocol of a headless Chrome it launches (`--remote-debugging-port`, a throwaway
profile) and closes. It reads the site from `tools/serve.py` (default `http://localhost:8001`).
Viewports come from `Emulation.setDeviceMetricsOverride`, not `--window-size` (headless Chrome
clamps windows to 500px wide), reduced motion from `Emulation.setEmulatedMedia`, the slowdown
from `Emulation.setCPUThrottlingRate`, held and failed downloads from the `Fetch` domain.

- `checks`: the four behaviours of section 4, each a pass or a failure with what it saw, exit 1
  on any failure. (1) Mid-fill, cross 1024px both ways at a height where the hero pins on the
  wide side (the block's `flow` class flips): no hero row's opacity drops. (2) Reduced motion,
  1440 to 820 wide and back: `.sx` on the bracket's region, the "Scrolls sideways" line and the
  phone summary follow. (3) Hold Spain's file, pick Brazil, release: Brazil's head, flag and name
  are on the page. (4) Fail Brazil's file, pick it: Spain's page is back at full ink, the address
  hash and search field are Spain's, and the line reads as in 4.4.
- `dump <file>`: both pages, both profiles, motion on and reduced. From the top, in steps of half
  a viewport to the bottom, waiting two frames after each step, it records every element's inline
  style attribute, every count display's text and every `.sx` class, keyed by a stable element
  path, as sorted JSON for a plain `diff`.
- `measure`: section 5's protocol; prints the numbers.

## 10. Testing and acceptance

- `pytest` passes (item 12's warning; the backtest test without the site file).
- `node --test tests/js/*.mjs` passes (`inkAt`, `ruleAt`, `fmtCount`).
- `node tools/check.mjs checks` passes.
- `node tools/check.mjs dump` equals the dump taken before the first site change, byte for byte,
  after every commit that touches `site/`: an ordinary read is unchanged.
- The UI track's render check: `/world-cup-2026` and `/how-it-works` at 1440×900 and at 390×844
  through the iframe harness, plus full-height captures; nothing moved against the captures taken
  before the first change.
- The detector on rendered dumps: no finding beyond the baseline's two.
- Branch `hardening`, commits `Component 11f: <what>`; a pull request, Thiago's review on
  localhost (`python3 tools/serve.py`), a merge commit on his word.

## 11. Out of scope

- Any change to what a visitor sees in an ordinary read, and any new copy beyond 4.4's line.
- The Euro 2028 and Copa América 2028 pages and their data.
- 11g, in any form; 12b (the re-simulation from the real round of 32).
- A cap on fate tints in code (section 8, item 7).

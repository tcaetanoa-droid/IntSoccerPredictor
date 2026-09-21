# IntSoccerPredictor restyle: the tournament wall chart

Date: 20 September 2026. Status: design approved in the brainstorm session of the same day, on
the UI track (brainstorming + impeccable). Every decision below was picked by Thiago from
rendered options in the visual companion; the decisions and their near-misses are recorded in
`2026-09-20-restyle-decisions.md` beside this file. Roadmap: component 11c (row to be added).

This spec supersedes the visual parts of `2026-09-19-website-design.md` (its sections 3, 5 and
6: visual language, page structure as rendered, behaviour rules). That spec stays the record of
the content, the data contract and the facts each chapter states. Hosting is Vercel, as the
README says; the older spec's GitHub Pages lines are historical.

## 1. What this is

A restyle of the World Cup 2026 page and its shell into one printed sheet: a newspaper wall
chart, in a vintage-newspaper rendition, filled in 100,000 times. The sheet is filled in as the
visitor reads it: ink prints and counts count up. Content, chapter order, data and the
first-person voice stay; sentences may be tightened where the design warrants it. The page is
built one section at a time with a localhost checkpoint after each, in page order.

Process, agreed with Thiago on 20 September 2026 (option C):

- This spec fully designs the printed system, the motion thesis, the shell, the hero and
  chapter one.
- Chapters two to eight inherit the system and the chapter pattern (section 7). The treatment of
  the elements the pattern does not cover (group boxes, the bracket, the charts, the picker, the
  method's steps) is decided in one visual-companion screen at the start of each chapter's task
  and recorded in section 8 of this spec as an amendment before that chapter is built.
- The restyle lives on one branch and merges once the whole page is restyled, so the live site
  never shows a half-printed sheet. Vercel's PR preview is the shared build.

## 2. Design authority

- PRODUCT.md: projects/IntSoccerPredictor/PRODUCT.md
- DESIGN.md: written at finish (new world; no `impeccable document`)
- Surface brief: .impeccable/surfaces/site-index-html.md (seed key bed5693b)
- Detector baseline: 8 findings on 20 Sep 2026, rendered-DOM scan (6 cramped-padding legend
  swatches, 1 tiny-text 11px, 1 flat-type-hierarchy unverified); source scan 10
  undersized-ui-text
- Critique snapshot: none

The direction contract in the surface brief is a development-only document. Nothing from it
ships: no HTML comment, data attribute, hidden DOM, JSON or served file carries its text. Code
comments name mechanisms, never the contract.

## 3. The printed system

### 3.1 Paper, ink and colour

The green-and-paper palette pinned in PRODUCT.md is kept. One surface: the paper. No second
surface colour, no white cards.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F2F6F1` | the page and every region on it |
| `--ink` | `#10261A` | text, rules, bars, the masthead |
| `--ink-soft` | `#2C4A38` | reading text: ledes, intros, method prose |
| `--muted` | `#5B6E62` | secondary labels, foot notes, "soon" links, the rest-of-field row (4.99:1 on paper) |
| `--orange` | `#C2410C` | the real result and the hot number, nothing else (4.68:1 on paper) |
| `--hair` | `rgba(16,38,26,.18)` | hairlines between rows |
| `--f-gs4` … `--f-w` | unchanged nine-step scale | fate cell colour, at a strength that follows the share |
| `--display` | `'League Gothic', 'Arial Narrow', sans-serif` | mastheads, headline, chapter titles, sub-heads |
| `--reading` | `'Old Standard TT', Georgia, serif` | ledes, intros, prose |
| `--grid` | `'News Cycle', 'Arial Narrow', sans-serif` | every table, box, label, nav and foot note |
| `--gutter` | `48px`; `16px` below 1024px | sheet margins |
| `--sheet` | `1360px` | the sheet's maximum width |

Colour rules:

- Orange marks the real result and the hot number. On the first viewport that is the headline's
  second sentence and Spain's row in the champion column. Each later chapter's use, if any, is
  decided at its screen (the bracket's real final is the obvious candidate). Green headings were
  rejected; ink-only was rejected.
- The fate scale is the only other colour. It colours a cell whose column is a fate, at strength
  `min(1, 2.5 × share)` where share is the cell's count over the run total. Numbers are always in
  full ink; text never fades to carry frequency. Colour carries the frequency.
- Ink density carries frequency only where there is no fate colour: the hero's champion column.
  Its floor is 65% ink, not the 55% approved in the companion, because 55% ink on this paper
  measures 3.55:1 and 65% measures 4.8:1 (AA is 4.5:1). Impeccable's contrast rule applies by
  default; the floor is revisited at the hero checkpoint (section 12).
- Every text colour clears 4.5:1 on the paper and on the strongest tint it sits on. The plan
  measures the tinted cells; the dark fates (4th place green, 3rd place bronze) never reach the
  strength where ink would fail because their shares are small, and the strength is capped at
  the last value that clears 4.5:1 if a data refresh ever changes that.
- Flag colours are gone from every chart and bar. Flags themselves stay as the team's mark
  beside its name in the chapters (PRODUCT.md: teams are shown by name and flag), except where
  the approved companion screens showed none: the hero column (decided at the hero checkpoint)
  and chapter one's fate table (to confirm at its checkpoint).

Retired tokens: `--green` (no element uses it once the rail, kickers and labels go; the paper
and the fate scale carry the green), `--faint` (2.71:1; hairlines use `--hair`), `--card`,
`--border`, `--rule`, `--gold`, `--silver`, `--bronze`, `--gold-text` (duplicates of `--f-w`,
`--f-ru`, `--f-3rd`, or unused), `--serif`, `--sans`, `--mono`, `--rail-w`. During the build
`--serif`, `--sans` and `--mono` stay as aliases of the new faces so the untouched chapters
render in the new type at every checkpoint; the aliases are deleted with the last chapter.

### 3.2 Type

Three faces from Google Fonts, loaded with two `preconnect` links and one stylesheet link in
the head (replacing the `@import`), `display=swap`: League Gothic (one weight), Old Standard TT
(400, 700, italic 400 for emphasis inside prose), News Cycle (400, 700). None is on
impeccable's overused list. These become the house type for Thiago's personal sites
(PRODUCT.md, Brand commitments).

| Role | Face | Size (≥1024px / below) | Weight, case | Notes |
|---|---|---|---|---|
| Wordmark | League Gothic | 1.35rem | caps, tracking .02em | site masthead and footer |
| Site nav, Chapters button | News Cycle | 0.85rem | 400 | current page: 2px orange underline; "soon" pages: muted |
| Chart masthead title | League Gothic | 1.75rem / 1.4rem, line-height 1 | caps | "World Cup 2026 · Wall chart" |
| Chart masthead line | News Cycle | 0.8rem | 400, muted | right-aligned; wraps under the title on phones |
| Hero headline | League Gothic | `clamp(2.6rem, 5.2vw, 4.4rem)`, line-height 1 | caps; second sentence orange on its own line | |
| Lede and chapter intro | Old Standard TT | 1.05rem, line-height 1.55 | 400, ink-soft; the claim sentence 700 ink | measure ≤ 60ch |
| Chapter title | League Gothic | 2.6rem / 2rem, line-height .95 | caps, centred | between two 3px rules |
| Sub-head inside a chapter | League Gothic | 1.5rem | caps | |
| Column label, table head, box label | News Cycle | 0.75rem | 700 caps, tracking .06em to .08em | |
| Agate table body | News Cycle | 0.8rem | 400; row padding .25rem .3rem | tabular figures |
| Hero column row | News Cycle | 1rem, line-height 1.8 | 400; the hot row's count 700 | the rest-of-field row 0.85rem muted |
| Foot note | News Cycle | 0.8rem | muted | |
| Link | inherits | | ink, 1px underline, offset .15em | no green links |
| Commands (method chapter only) | `ui-monospace, Menlo, monospace` | 0.85rem | | the only monospace on the site: it sets code, not a costume |

Floors: no text under 0.75rem (12px). Reading text at 1.05rem; agate at 0.8rem is the one
dense role. Only two weights exist in the sans and the serif; League Gothic has one. Emphasis
comes from weight and size, never from a second colour.

Numbers are set in News Cycle with `font-variant-numeric: tabular-nums`. Whether the face
carries tabular figures is checked at the hero checkpoint; if it does not, counts stay
right-aligned so the count-up settles on the right edge.

### 3.3 Rules, boxes and surfaces

- Hairline: 1px `--hair` between table rows and list rows.
- Heavy rule: 3px `--ink` under the chart masthead, above and below every chapter title, at the
  top of every table head (with a 1px ink rule under the head row), and at the bottom edge of the
  held hero screen.
- Box: a 1px ink border, no fill, no radius, no shadow. Its label is a News Cycle 700 caps line
  with a 1px ink rule under it. Boxes replace every card.
- Not on the sheet: cards, border radius, shadows, glow, gradients, pills, kickers or eyebrows
  above headings, chapter numbers, monospace as a "technical" costume, a numbered rail, a stat
  strip.
- Flags: PNGs from flagcdn as today, 20 × 14 at agate size, no radius, a 1px `--hair` ring,
  `alt=""` beside the team's name.
- Browser surfaces are themed from the palette: `::selection` is ink on paper inverted (paper
  text on ink); the focus ring stays 2px orange with 2px offset; sideways-scrolling regions use
  `scrollbar-width: thin; scrollbar-color: var(--ink) transparent`; links underline at 1px with
  `.15em` offset.

### 3.4 Layout

- One column. The sheet is `max-width: var(--sheet)`, centred, with `--gutter` either side. No
  rail, no grid with a side column.
- Chapters are separated by air, 3rem above a chapter's top rule, and by their own title rules;
  the old 1px border between chapters goes.
- Breakpoints stay at 1440, 1024, 768 and 390 for the render check. The fate table and the
  bracket scroll sideways inside the sheet on narrow screens, as today. Multi-column regions
  stack: the exact ladders are set per chapter.

## 4. The motion thesis

Thesis (fixed): the sheet is filled in as you read it. Ink prints and counts count up; nothing
slides, rises or fades in from below. Fill is scrubbed to the scroll on the way down and never
un-prints on the way up. One authored moment, the pinned hero; each chapter varies the thesis
with its own content, never the same reveal twice.
Amendment (21 September 2026, companion screen transition-3-hold): two authored moments, not
one. The bracket (section 8, The bracket, motion amendment) is the second: once the round of
32 has printed on the scroll, the page holds still with the whole bracket in view while the
knockout rounds print round by round over one and a half screens of wheel travel, then a beat,
then the release. Thiago's decision, made with the one-moment rule in front of him. The hero
stays the first moment; the mechanism is the same `pin(held, rows)`, and the bracket's pin
engages only when the bracket fits the viewport.

- **Focal moment:** the pinned hero (section 6). The page holds still while the champion
  column fills, row by row, over one screen of wheel travel.
- **Continuity:** chapter one's rows print as each crosses the reading line; later chapters vary
  the material (a bracket path draws, group boxes print A to L, the picker reprints its regions;
  section 8). Sorting chapter one keeps every printed row printed: progress is keyed by team,
  not by row position. Picking a team in chapter seven reprints that chapter once, not on
  scroll.
- **Feedback:** a hovered row darkens its ink (`filter: brightness(.94)` on the row, 120 ms; a
  faded hero row goes to full ink on hover). Sort buttons, the picker and the Chapters popover
  keep visible focus and pointer cursors. No hover lifts, no transforms.
- **Budget:** scroll-linked properties are written per frame by script, never transitioned. One
  passive scroll listener and one `requestAnimationFrame` per scroll event. Units outside the
  viewport plus one screen either side are not measured or painted (an IntersectionObserver
  marks the live set). Only units whose progress changed are painted. No blur, filter or shadow
  animation. The only CSS transitions are hover (120 ms) and the popover (none).
- **Reduced motion** (`prefers-reduced-motion: reduce`): the finished sheet. No pin, no
  count-ups, no scroll-linked change; every unit is painted complete at boot; hover feedback
  stays.

### 4.1 Ink material

Two materials, both scrubbed and never un-printing:

- **Density:** a row prints from 6% ink to its target darkness. In the hero column the target
  follows the share (section 6). In chapter tables the row's heading prints from 15% to full ink
  and each cell from 20% to full ink.
- **Count:** a count prints as `round(p × count)`, formatted with thousands separators, so the
  number climbs to its value as the ink darkens. Fate cells also print their colour: the tint
  strength at progress p is `p × min(1, 2.5 × share)`.

### 4.2 The print engine, `site/js/print.js`

One module owns every scroll-linked change. Chapter modules build their DOM and register units;
they never listen to scroll themselves.

- `register(el, painter)`: `painter(p)` paints `el` at progress `p` in `[0, 1]`. The module
  guarantees `p` never decreases for a registered unit.
- Default painters: `row` (a table row or list row carrying `data-count` and `data-share` on
  its cells) and `block` (a title or paragraph that prints from 4% to full ink).
- Progress for a chapter unit, with `H` the viewport height and `top` the unit's top edge
  relative to the viewport: a block prints over the first 40% of a screen after its chapter's
  top enters the viewport, `p = clamp((H − top_chapter) / 0.4H)`; a row prints as it crosses the
  reading line, `p = clamp((0.92H − top_row) / 0.18H)`. A unit that is already above the reading
  line when the page loads (a hash, a reload mid-page) is painted complete.
- `pin(held, rows)`: the hero mechanism of section 6.
- `reprint(root, ms)`: paints every unit under `root` from 0 to 1 over `ms` once, ease-out,
  independent of scroll (chapter seven). Reduced motion: complete immediately.
- `boot()`: attaches the listener, the observer and the resize handler (viewport height, pin
  geometry and the pin condition are recomputed on resize), and, under reduced motion, paints
  everything complete and attaches nothing.

Counts and assistive technology: every printed count is two spans, the final value visually
hidden for screen readers and the counting display `aria-hidden`. A screen reader always reads
the finished sheet.

## 5. The shell

### 5.1 Site masthead

One line at the top of every page, on paper, 1px ink rule beneath, not sticky. Left: the
wordmark "IntSoccerPredictor" in League Gothic caps, a link to the World Cup page. Right, in
News Cycle: World Cup 2026 (current: 2px orange underline), Euro 2028 and Copa América 2028 in
muted ink (the "soon" pills go; the pages themselves say "coming after the draw"), How it works
(`#how-it-works`), GitHub, Chapters. On phones the nav wraps under the wordmark.

### 5.2 Chapters

"Chapters" is a button in the masthead that opens a popover (`popover` attribute, so Escape and
light dismiss come from the browser): a box on paper anchored under the masthead's right edge,
listing the eight chapters by name, no numbers, in News Cycle 0.85rem with hairlines between
them, each a link to its section. The first link takes focus when the popover opens. Chapters
are otherwise found by reading down: no contents line, no contents box, no rail, no rail toggle.
`rail.js` and the rail markup are deleted.

### 5.3 Footer

The dark footer becomes the sheet's colophon: paper, a 3px ink rule above, the same three
columns (wordmark and the personal-project line; Data; Links) in News Cycle 0.85rem with links
underlined in ink; one column on phones. Confirmed at the closing checkpoint (section 12).

### 5.4 Placeholder pages

`euro2028.html`, `copa2028.html` and `thiago.html` carry the same masthead and footer. Their
body is a chart masthead ("Euro 2028 · Wall chart" with "Coming after the draw." as the line,
3px rule beneath), the "what we know" facts as a ruled key list (label in News Cycle 700 caps,
value in News Cycle, hairlines between rows), then the two paragraphs in Old Standard TT under
League Gothic sub-heads. `thiago.html` is the masthead, one sentence, the footer. Content
unchanged from today.

## 6. The hero (first viewport)

Composition, as approved: the chart masthead under a 3px rule; the headline and lede on the
left; the champion column on the right; a 3px rule at the bottom edge. The 100,000, the 18,626
and the team name are read from the data as today; the stat strip and the chapter row are gone.

- Chart masthead: "World Cup 2026 · Wall chart" left; right, muted: "Filled in 100,000 times.
  Darker ink means it happened more often." (run count from `ctx.n`).
- Headline: "I simulated the 2026 World Cup 100,000 times." then, on its own line in orange,
  "Spain won 18,626 of them." Printed on load, no motion.
- Lede, unchanged: "No betting odds, no pundits, no FIFA ranking. Just the eloratings.net
  ratings from 10 June 2026, a Poisson model for goals fitted on 7,526 real matches, and
  100,000 seeded replays of the full tournament. Every number on this page is counted from
  those runs." Printed on load.
- Champion column: a 3px rule on top, then the label row "Champion" / "Runs won", then twelve
  rows (name and count, no flag: Thiago at the hero checkpoint, 20 September 2026, matching the
  approved companion screen) for the twelve teams with the most titles in the fate table's order,
  then "The other 36 teams, between them" with their summed count in muted ink (the 36 is
  `teams − 12`, the sum a display aggregate as today's "other 40" is). Spain's row is orange with
  its count in bold. Rows are 1rem on 1.8 with hairlines. Blank on load: every row at 6% ink,
  every count 0.
- Grid: headline column 1.15fr, champion column 1fr, gap 3rem at 1440; the column is at most
  560px wide. Below 1024px the column sits under the lede.

### 6.1 The pin (Thiago's rule)

While scrolling through the hero the page does not move; the column fills; the page releases
only when the last number is complete.

| Quantity | Value |
|---|---|
| `H` | the viewport height (`100dvh`), refreshed on resize |
| Held screen | the chart masthead, the hero and the bottom rule; `position: sticky; top: 0; height: H`; the rule sits at its bottom edge throughout |
| Travel | `1.0 × H` of scroll spent on the fill |
| Hold | `0.35 × H` of scroll during which the finished column holds |
| Pin block | `height: H + travel + hold`; the held screen is sticky inside it |
| Progress | `p = clamp((scrollY − pinTop) / travel)`, never decreasing |
| Row `i` of `R = 13` | `p_i = clamp((p − i / (R + 1)) / (2 / (R + 1)))`: rows start in sequence top to bottom, each overlapping the next by half; the last row finishes at `p = 1` |
| Row paint at `p_i` | opacity `0.06 + p_i × (target − 0.06)` with `target = 0.65 + 0.35 × share`, share = count over the top count (the rest row: 1); count text `round(p_i × count)` |
| Release | the page moves past the held screen only after `travel + hold`, by which point `p = 1` |
| Boundary | 3rem of paper between the bottom rule and chapter one; no second rule; chapter one's title carries its own two |

The site masthead sits above the pin block and scrolls away during the first masthead-height
of scroll; the column starts filling once the held screen reaches the top of the viewport, as
in the approved mock.

Gate: chapter one prints nothing until the column is complete. With this geometry the chapter's
top cannot enter the viewport before `p = 1`; `print.js` still computes chapter units only once
the hero reports complete, so the gate holds if the geometry ever changes.

Pin condition: the pin applies only when the held screen's content fits in `H` (measured at
boot and on resize). When it does not (a short laptop viewport, most phones in landscape), the
hero is not pinned: the column prints as a chapter table would, row by row across the reading
line, and chapter one follows normally. Reduced motion: no pin, the column printed complete.

## 7. The chapter pattern and chapter one

Every chapter:

1. Title between rules: the chapter's name in League Gothic caps, centred, full width, a 3px
   rule above and below. Names: Who wins it, Group stage, The bracket, The hosts, Underdogs,
   Paradoxes, Pick a team, How it works.
2. Intro in Old Standard TT, ≤ 60ch, left-aligned. Its first sentence is the chapter's claim
   (today's h2 text) set in bold ink, then the intro as today. Title and intro print as a block
   when the chapter enters.
3. Tables are agate: News Cycle 0.8rem, tight rows, hairlines, a 3px rule over the head and a
   1px rule under it, column heads in News Cycle 700 caps. Fate columns carry the fate colour at
   a strength that follows the share; numbers in full ink.
4. Sub-heads in League Gothic 1.5rem caps; foot notes in News Cycle 0.8rem muted.
5. Rows print as they cross the reading line. Each chapter's own variation is in section 8.

Chapter one, Who wins it:

- Table columns: Team (name, then the group in muted News Cycle after the name, no flag, as in
  the approved screen; flags to confirm at the chapter-one checkpoint), Elo, the nine fates (4th in group, 3rd out, R32, R16, QF, 4th place, 3rd
  place, Runner-up, Champion), Advanced, 3rd in group. The champion column is bold. The two
  subtotal columns are untinted with a 1px ink rule on their left, as today.
- Sorting stays: every numeric head is a button in its `th` with `aria-sort`, Enter and Space,
  focus kept after a re-draw. The colour swatches in the heads go; the legend row goes (the heads
  name the fates, the masthead line and the foot explain the colour).
- Foot: "Counts of runs, out of 100,000. A zero is a fate that never happened in any run.
  Advanced and 3rd in group are subtotals: a team can be third and still advance, so they
  overlap. Click a column head to sort."
- Motion: title and intro print as the chapter enters; each of the 48 rows prints as it crosses
  the reading line (heading 15% to full ink, cells 20% to full ink, counts climbing, tints
  printing to `min(1, 2.5 × share)`). Progress is keyed by team code so a sort re-draw keeps
  every printed row printed and prints the rest as they arrive. Hover darkens the row.

## 8. Chapters two to eight

Rule: each chapter inherits sections 3, 4 and 7 as written. At the start of its task, one
companion screen renders the chapter in the built system with real data and puts the open
questions below as three-option groups; Thiago's picks are written into this section as an
amendment, then the chapter is built and checked on localhost. The "fixed" lines below are not
open at the screen; the "open" lines are; the "motion" line is the proposal the screen shows.

**Group stage.** Fixed: twelve boxes (1px ink, box label "Group A" with a rule under it), rows
in agate with hairlines, the host marked in text, no bars in flag colours, four boxes across at
the sheet's width stepping to three, two and one. Open: how the two automatic places and the
eight "third usually through" groups are marked (a 1px ink rule under row two; a fate tint by
share on each row; a muted fourth row); whether the advance bar survives as an ink bar or the
share is printed as a count; where the modal finishing position goes. Motion: the boxes print in
group order, A to L, as each crosses the reading line, rows top to bottom within a box.
Amendment (20 September 2026, companion screen chapter-2): the places are marked by ink,
not lines: the rows that usually go out (the fourth row everywhere; the third row too in the
four groups whose third usually goes out) print in muted ink, the rows that go through in full
ink; no cut lines, no tint. The advance share is a thin bar of solid ink in its own column with
the percentage after it. The modal finishing position is a figure 1 to 4 in muted ink at the
left of each row. Copy: the intro is rewritten to match (no "green rows", no "paler third
row"): the bar is how often a team reached the round of 32; the rows in lighter ink usually go
out; the foot note keeps the Group D example.
Motion amendment (21 September 2026, companion screen transition-2): as proposed. The boxes
print one by one, A to L, as each crosses the reading line (a wave across each row of four,
each box starting a half band after its neighbour); inside a box each row prints with its bar
filling as its percentage climbs; the spec's band of 18% of a screen.

**The bracket.** Fixed: the nine-column grid and the connectors stay; tie boxes become ruled
boxes; round heads in News Cycle caps; match numbers in News Cycle 0.75rem muted; the winner's
row in full ink and the loser's in muted; connectors 1px ink. Open: the final's box (an orange
rule for the real final, or ink), the champion mark above the final, the third-place match's
mark, how the winner row is marked beyond weight. Motion: the most likely path draws from the
round of 32 to the final along its connectors as the bracket crosses the reading line; boxes
print with their column.
Amendment (21 September 2026, companion screen chapter-3): the final's box is ink like every
other box, no orange anywhere in the bracket; a line in muted ink hangs under the box and says
the real tournament produced this final (Spain v Argentina). The champion mark above the final
is the name in the display face: the flag, Spain in League Gothic caps, and under it "wins the
final in 53% of the runs that got here" in muted News Cycle. The winner of every tie is marked
by a light ink-grey tint on its row (ink at 9% over the paper, the same depth on every tie; the
row itself full ink and bold) and the loser's row is muted ink faded to 0.75 opacity. That fade
measures 3.07:1 for 12px text, under AA's 4.5:1 (unfaded muted is 4.99:1); Thiago chose it with
that number in front of him, the loser being the secondary row. The third-place match keeps a
"Third place" label in News Cycle caps with a rule under it and its own box under the final, no
other mark.
Motion amendment (21 September 2026, companion screen transition-3-hold; replaces the motion
line above): the bracket is the sheet's second authored moment (section 4 amendment). As the
bracket rises through the window only the round of 32 prints, row by row, both sides in step
(74 with 76, 77 with 78, and so on down the module's feed order), each box printing as any
unit does (rule, number and rows, the percentages counting up, the winner ending in full ink on
its tint, the loser at 0.75). The eight rows are scheduled on wheel travel from the bracket's
top crossing the reading line to its top reaching the top of the viewport, where the bracket
pins with the whole grid in view; the eighth row completes exactly as the pin engages, and no
later box or connector moves before it. Inside the hold the wheel spends one and a half screens
of travel in five equal parts: the round of 16, the quarter-finals, the semi-finals, the final
(the third-place box, the champion mark and the caption print with it), then a beat with the
finished bracket; then the release. Within a round the rows print top to bottom, both sides in
step; each box's two connectors draw from the feeders' boxes along their elbows into it
(stroke-dashoffset from the path's own length to 0) before its rule prints, then its rows. The
eight connectors on the two finalists' routes (Spain 84, 93, 98, 101, 104; Argentina 86, 95,
100, 102, 104; derived from the data, never typed) draw at 2px and stay 2px, so the road to the
final remains readable after the hold; the other twenty-two are 1px. Nothing un-prints on the
way back up. Build notes: the pin engages only when the bracket fits the viewport (its height at
most the viewport's less a small margin); otherwise the same schedule runs on the travel with no
pin, and the foot note then keys on its own entry rather than on the release. The round-of-32
rows begin printing while their box top is still just under the fold (12 to 34px in the 620px
demo): shown to Thiago and not vetoed, open to change at the chapter's checkpoint. The beat is a
fifth of the hold. Reduced motion: the finished sheet, no hold.

**The hosts.** Fixed: three regions, one per host, in News Cycle; flag-colour bars go. Open: ink
bars per fate or a nine-row fate list with the chapter-one cell encoding, one per host; how the
counts and the axis are labelled. Motion: each host's nine values print in fate order, fourth
in the group to champion, as the region crosses the reading line.
Amendment (21 September 2026, companion screen chapter-4): three regions side by side in
equal columns (402px each at the sheet's width), each host's nine fates as a small chart of nine
plain ink bars in fate order, fourth in the group to champion, the fate name under each bar (the
real names, which turn and read up the page at this column width). A shared axis in runs behind
the bars: hairlines at 0, 10,000, 20,000, 30,000 and 40,000, topping out at 45,000, and the count
above every bar (Thiago's correction after Submit, 21 September: the screen's option labelled
only each host's tallest bar, Mexico 32,508, Canada 41,113, the USA 26,379; he expects every
bar's count with the axis kept, a combination the screen did not offer; confirm at the chapter's
localhost checkpoint). The
region head is the flag and the system's team name (USA, not "The United States"; the lede
keeps its own words). Build note: the section keeps id="hosts"; delete the legacy
"chapter 4: the hosts" block from site.css.
Motion amendment (21 September 2026, companion screen transition-4): as proposed. The three
regions print together, fate by fate, fourth in the group first and champion last, nine steps as
the block crosses the reading line, successive values 0.35 of a band apart (a region's nine take
3.8 bands). Each bar grows from the baseline while its count climbs to the run count, the count
riding up with the bar; the spec's band of 18% of a screen. The chart's chrome (the baseline,
the fate names, the axis hairlines) prints with the region head, before the first bar grows, so
a bar never rises out of nothing.

**Underdogs.** Fixed: the five weakest and the three first-time champions as two ruled agate
tables under League Gothic sub-heads (no cards, no big-number tiles); fate columns carry the
chapter-one encoding. Open: whether the stacked fourth / third / advanced strip survives as an
ink strip; the columns; the "no World Cup title" mark. Motion: both tables print row by row.
Amendment (21 September 2026, companion screen chapter-5): as proposed. The five weakest as a
ruled agate table whose three group-stage fates are tinted cells carrying their counts (no ink
strip, no extra share column); the champion column prints even where it is a real 0 (Qatar) or
1 (Curaçao). Team columns as chapter one: Team with the group in muted type after the name, then
an Elo column, on both tables. The "never won a World Cup" mark is the sub-head alone ("Most
likely first-time champions"); the foot note keeps its verbatim sourcing line. Build notes: add
a unit line ("Counts of runs, out of 100,000") as chapter one has, since neither foot note says
it; the section keeps id="underdogs", delete the legacy "chapter 5: underdogs" block from
site.css.
Motion amendment (21 September 2026, companion screen transition-5): a table at a time. Each
of the two tables prints as a whole when its sub-head crosses the reading line, its rows top to
bottom half a band apart, so the table is finished before the reader reaches its rows. Inside a
row the counts climb first, on plain paper, over the first two thirds of the row's band, then
the fate tints bloom behind them. The spec's band of 18% of a screen. Build notes: the sub-head
crosses the reading line about a fifth printed, so rows can be printing under a heading still
coming up (shown, not vetoed); the Elo column prints with the row's ink and does not climb, a
rating not being a count of runs; the ruled frame and the table heads are printed from the
start.

**Paradoxes.** Fixed: the trophy chart's bars in ink (Italy a hairline stub), labels in News
Cycle, the divider a dashed ink rule; the three versus pairs as ruled boxes; the better number in
bold ink, not orange. Open: the versus box composition (two sides, or a two-row table); how the
bars are labelled. Motion: the six bars print in order; each versus box's numbers count up as it
crosses the reading line.
Amendment (21 September 2026, companion screen chapter-6): each versus pair is a small two-row
agate inside its ruled box, one row per team with the flag, the name, the Elo and the number,
the bigger number's row in bold; the box label's rule closes the head, so the agate drops its
own 3px rule. The trophy chart's bars are labelled with the percentage above each (4.9%, 4.5%,
3.5%, 2.9%, 1.8%, 0.0%), the axis in percent as fixed. Each pair's reason line sits under the
pair inside its box, in Old Standard TT 0.95rem ink-soft. Rulings carried to the build: bold
marks the bigger number, the one that makes the point (in pair one Argentina's 31.6% chance of
going out), not the better outcome, unless Thiago says otherwise at the checkpoint; pairs two
and three share the champion metric, so their box labels read the same; the box label stays the
module's full sentence in caps; the section keeps id="paradoxes", delete the legacy "chapter 6:
paradoxes" block (with .card, .row3 and the flag-colour bars) from site.css; below about 900px
the chart needs a scroll wrapper or three bars per row, and the boxes step to one column.
Copy note (21 September 2026, found on the transition-7 screen): the box label for pairs two
and three reads "Lower rating, more titles: chance of winning the tournament", but their
paradox is home advantage, not titles; that first half comes from the screen builder's metric
map. The build writes each pair's label from its own paradox; the metric half is right.
Motion amendment (21 September 2026, companion screen transition-6): the six bars print one
after another, left to right, each growing out of the baseline while its label counts up,
Portugal first and Italy last, from the moment the chart crosses the reading line; the chart's
ticks, baseline and dashed divider with its two side labels are printed from the start. Each
versus box prints as it crosses the reading line in three windows inside its band: the two
names first, then the numbers count up, the bigger one last and landing in bold; the reason
line prints on the box's own band. The spec's band of 18% of a screen. Build notes: the three
boxes share a top, so they print together; the bold lands as a step when the unit finishes; the
Elo prints with the row's ink and does not climb; Italy's unit grows only its 3px stub.

**Pick a team.** Fixed: the search combobox as a printed field (1px ink box, News Cycle, no
radius, the same keyboard behaviour); the favourites as a printed line of links, not chips; the
team head (flag, name in League Gothic, group and Elo, the title count); the five regions as
ruled regions of the sheet; the fate strip becomes a single fate-table row with the chapter-one
encoding (this retires the segmented bar, its legend and the accepted contrast exception on its
two dark segments). Open: the "how far it gets" and "who knocked it out" lists (ink bars or
counts only); one or two columns for the regions. Motion: on a pick, the chapter reprints once
(`reprint`, 400 ms, ease-out): counts climb from zero and tints print; reduced motion prints
the new team complete.
Amendment (21 September 2026, companion screen chapter-7): the "how far it gets" and "who
knocked it out" lists carry a thin ink bar beside each number, solid ink, no track, no radius;
for "how far" the bar is the share of the 100,000 runs, for "knocked out" it is measured against
the biggest eliminator, as the module measures it. Two columns: the fate row full width, then
"how far" and the opponents down the left, "who knocked it out" and "the one thing to know"
down the right. The favourites line is the picker region's opening line above the field, "Pick
a team, or one of the favourites: …", names only, no flags; the field's visible "Team" label
becomes screen-reader-only text, since the opening line names the field. Build notes: print
the list shares with one decimal so the whole-percent ties (Colombia and Portugal both 7%,
Croatia and Colombia both 18%) resolve; the two lists have different denominators (100,000 runs
against the runs in which the team went out), which their sub-lines say; the opponents region
may use a container query (container-type: inline-size) for its narrow column; delete the
legacy "chapter 7: pick a team" block with .card, .legend, the segmented bar and the chip rules;
at phone width the two columns step to one and the lists' label columns need checking at 360px.

**How it works.** Fixed: the six steps keep their two-column layout and their numbers, "1." to
"6." in the step title, because the pipeline order is the content (no mono kicker); step titles
in League Gothic; prose in Old Standard TT; symbol keys as ruled lists and parameter tables as
agate; KaTeX unchanged; the five commands in the system monospace; the calibration chart in
ink (model line ink, observed hollow dots ink, grid hairlines). Open: whether a key is a box or
a bare ruled list; where the calibration caption sits. Motion: feedback only; the chapter is
printed complete.

## 9. Files and build order

Files:

- `site/index.html`: font links replace the `@import`; masthead rewritten; rail and rail toggle
  removed; Chapters popover added; footer restyled; sections unchanged.
- `site/css/site.css`: rewritten from the tokens down for the shell, hero, chapter pattern and
  chapter one; each later chapter's block is rewritten in its task; the face aliases go with the
  last one.
- `site/js/print.js`: new, the print engine (section 4.2).
- `site/js/hero.js`: rewritten (masthead, headline, lede, column, bottom rule; registers the
  pin).
- `site/js/fate-table.js`: reworked (columns, heads without swatches, no legend, two-span
  counts, units registered by team code). Its `FATES` export stays for chapters four and seven;
  `tint()` goes once no chapter uses it.
- `site/js/dom.js`: a `count(n)` helper returning the two spans.
- `site/js/main.js`: no rail; `print.boot()` after the chapters render.
- `site/js/rail.js`: deleted.
- Chapters two to eight: their module and CSS block, each in its own task.
- `site/euro2028.html`, `site/copa2028.html`, `site/thiago.html`: the shell, in the closing
  task.
- Data: no change. `intsoccer report --site` and the JSON contract are untouched; `ctx.n` stays
  the single source of the run count.
- Docs: README "Design" line already points at PRODUCT.md, DESIGN.md and the surface briefs;
  ROADMAP gains row 11c; the 19 September spec gets a one-line supersession note at its top;
  DESIGN.md and `.impeccable/design.json` are written at the finish by the documenter.

Build order, one checkpoint on localhost after each step, page order:

1. The system and the first viewport: tokens, fonts, aliases, masthead, Chapters popover,
   `print.js`, the hero with its pin. Checkpoint: the hero.
2. Chapter one. Checkpoint.
3. to 9. Chapters two to eight, each: companion screen, amendment to section 8, build,
   checkpoint.
10. Closing: footer, placeholder pages, delete the aliases and any orphan, docs, the render
    check at 1440 and 390, `impeccable critique`, `polish`, the finish reviewer (disposition
    `ship`), the documenter (DESIGN.md).

## 10. Testing and acceptance

- The project's gate is `pytest`; no Python changes are planned, and the suite is run before
  the finish to prove it.
- Render check after every section (the `ui-design-track` procedure): headless Chrome
  screenshots at 1440 × 900 and 390 × 844 into `.impeccable/review/`, and the detector on a
  rendered DOM dump plus `site.css`. Findings are fixed or ignored with a named reason through
  `impeccable hooks`; computed-size rules on a dump are unverified, not findings.
- Motion checks, by hand in Chrome at each checkpoint: the page does not move while the column
  fills; the bottom rule stays at the viewport's bottom edge; the last row finishes last; the
  finished column holds for the beat; chapter one shows no ink until the release; scrolling up
  un-prints nothing; a reload at `#pick-a-team` shows everything above printed; the reduced-motion
  emulation shows the finished sheet with no pin.
- Contrast: every text colour on paper and on the strongest tint it sits on measured ≥ 4.5:1 in
  the section's task; the plan carries the numbers.
- Accessibility: the Chapters popover opens from the keyboard, moves focus in, closes on Escape;
  the sort buttons keep today's behaviour; screen readers read final counts (the visually hidden
  span); every flag has `alt=""` next to its team's name; no horizontal page scroll at 390px.
- Acceptance is section by section on localhost with Thiago, in page order, hero first. Each
  section is judged against this spec and, for chapters two to eight, against its amendment.

## 11. Out of scope

Content beyond tightening sentences; new chapters or views; the backtest (component 12); dark
mode; any motion library; self-hosting the fonts (Google Fonts as today); the personal website;
the ledger's deferred code-quality minors that the touched modules do not reach.

## 12. Decisions carried to checkpoints

- Hero, decided at its checkpoint (20 September 2026): the ink floor stays at 65% (the
  faintest row measures 5.65:1); no flags in the column; the hover lift to full ink stays; the
  bottom rule bleeds to the sheet edge while the masthead rule spans the content, as built; News
  Cycle has no tabular figures, so digits shift sideways while a count climbs, accepted.
- Chapter one, decided at its checkpoint (20 September 2026): approved as built; the claim as
  the intro's bold lead-in, the group inline after the name, no flags in the Team cell, the
  subtotal columns in muted ink.
- Closing: the paper footer; the placeholder pages' key list.
- Chapters two to eight: the open lines of section 8, each at its own screen.

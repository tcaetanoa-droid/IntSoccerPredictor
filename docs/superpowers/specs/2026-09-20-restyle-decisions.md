# Design decisions, IntSoccerPredictor restyle (20 Sep 2026)

## Section 1: the printed system (approved in the companion, screen system-v4)
- Headline face: League Gothic (uppercase). Near-miss: none; Bodoni Moda and Alfa Slab One tried once each.
- Reading face: Old Standard TT. Near-miss: Noticia Text (tried three times).
- Grid face (tables, group boxes, bracket, agate): News Cycle. Near-miss: Archivo Narrow (toggled ~8 times).
- Paper: the pinned #F2F6F1. Newsprint #EFEBE0 tried and rejected; white stock tried and rejected.
- Rules: broadsheet (hairlines, one heavy masthead rule). Near-miss: poster (toggled ~8 times).
- Second colour: orange only for the real result and the hot number; green headings rejected; ink-only rejected.
- Ink density encodes frequency (opacity scaled to share) in every table: kept from the sketch, unchallenged.

## Section 2: the motion thesis (approved in the companion, screen motion)
- Thesis (fixed): the sheet is filled in as you read it. Ink prints and counts count up; nothing slides,
  rises or fades in from below. One authored idea; each chapter varies it with its own content.
- Fill mode: scrubbed, never un-prints (progress tracks scroll on the way down, holds on the way up).
  Near-miss: printed once (tried once), plain scrubbed (start).
- Ink material: density and counts (each row prints to its own darkness, count counts up).
  Near-misses: written one by one (tried twice), ink bars (tried once).
- Hero focal moment: on first scroll. The headline is printed on load; the champion column prints as the
  visitor begins to scroll. Near-misses: on load (twice), on load with the number counting (twice).
- Gate (Thiago): chapter 01 "Who wins it" must not appear until the hero's animation has finished.
  The hero holds the first viewport; chapter 01 begins below the fold and only starts printing once
  the hero column is complete.
- Concern (Thiago): ink density by share makes small numbers hard to read. Decide after seeing real
  small numbers at size. Sections 3 and 4 show the density encoding with a legibility floor and two
  alternatives that keep every number in full ink.
- Reduced motion: the finished sheet, no count-ups, no scroll-linked change (fixed rule).
- Feedback: a hovered row darkens its ink (spec; not shown in the demo).

## Section 3: the hero and the shell (approved in the companion, screen hero-v2)
- Composition: headline and lede left, champion column right (unchanged default; B and C never tried).
- Counts: density with a 55% ink floor. Near-misses: full ink with tinted cell (tried twice), ink bar (once).
  Density stays on probation until the fate table's tiny numbers are seen in section 4.
- Masthead: masthead only. No contents line, no contents box; a small "Chapters" link in the site masthead
  opens the chapter list. Chapters are found by reading down. Near-miss: contents box (tried once).
- Site masthead: wordmark left (League Gothic caps), tournaments and links right, current tournament
  underlined in orange, "soon" pages in muted ink, no pills.
- Hero column: twelve champions plus "the other 36 teams, between them"; Spain's row in orange as the hot number.

## Section 4: the chapter pattern (approved in the companion, screen chapter)
- Chapter head: title between rules (full width, centred, between two heavy rules like a broadsheet
  section head). Near-misses: title in the margin (many toggles), title over the table (twice).
- Table density: agate (0.8rem, tight rows). Near-miss: roomy (toggled ~8 times); two-tier once.
- Fate cells: fate colour by share. The cell's fate colour (the pinned nine-step scale) at a strength
  that follows the share; numbers in full ink. This resolves the density probation: colour carries the
  frequency, text never fades. The hero column keeps density with a 55% floor (section 3) since it has
  no fate colour; revisit if it reads too faint on localhost.
- Near-miss: fate colour at fixed strength (tried twice).

## Section 5: the scroll from the hero into chapter one (two screens: transition, then pinned; Submit pressed)
- Thiago's rule, verbatim in intent: as you scroll through the hero, the page does not scroll; the champion
  table's numbers fill up as the scroll happens; only after the final number is fully filled can the page
  scroll on to "Who wins it"; the rule at the top of that boundary is the limit the page cannot pass before.
- Mechanism: a pinned hero (sticky inside a taller pin block); the wheel travel is spent on the fill.
- Scroll distance spent on the fill: one screen. Near-miss: none (two and three never tried).
- Fill order: rows in sequence, top to bottom, the last row (the other 36 teams) finishing last.
  Near-miss: Spain first then the rest (tried once).
- Limit and release: the 3px rule sits at the bottom edge of the held screen throughout; the finished
  table holds a beat (about a third of a screen of extra travel) before the page releases.
- Chapter one: not present at all until the hero is released (hidden gate); arrives row by row as each
  row crosses the reading line; the boundary between the held screen and chapter one is air (no second
  rule; the chapter title carries its own two rules).

## Hero checkpoint (20 Sep 2026, localhost)
- Ink floor: 65% kept (built at 65% because 55% failed AA at 3.55:1; the faintest row measures 5.65:1).
- Flags in the champion column: none, as the approved companion screen. Chapter one's table follows the same screen; confirm at its checkpoint.
- Hover on an unprinted row lifting it to full ink: kept.
- The bottom rule bleeding to the sheet edge while the masthead rule spans the content: kept as built (the mock did the same).
- Count jitter (News Cycle has no tabular figures): accepted.

## Chapter one checkpoint (20 Sep 2026, localhost)
- Approved as built: no flags in the Team cell; the claim as the intro's bold lead-in; the group inline after the name; the two subtotal columns in muted ink.
- Lesson: the browser cached the old chapter script across the hero checkpoint; the local server now sends Cache-Control: no-store (serve-nocache.py in the session scratchpad; ports 8000 and 8001).

## Chapter two, the group stage (20 Sep 2026, companion screen chapter-2, Submit pressed)
- Places: no cut lines; the rows that usually go out in muted ink (C). Near-misses: a 1px cut under row two (A, toggled three times), a green tint by share on every row (B, once).
- Share: a thin ink bar in its own column beside the percentage (A). Near-misses: percentage only (B, twice), the count with the percentage muted after it (C, once).
- Position: a figure 1 to 4 in muted ink at the left (A). Near-misses: "usually 1st" after the name (B, once), dropped to the foot note (C, once).

## Chapter two, the transition from chapter one (21 Sep 2026, companion screen transition-2, Submit pressed)
- How the wall prints: box by box A to L as each crosses the reading line (A, the spec). Near-misses: none (A clicked twice).
- Inside a box: row and bar together as the percentage climbs (A). Near-miss: the four rows then the four bars (B, once).
- Pace: the spec's 18% band (A). Near-misses: slower 30% (C, once), quicker 10% (B, once).

## Chapter three, the bracket (21 Sep 2026, companion screen chapter-3, Submit pressed)
- The final's box: ink like every other box, a muted caption under it naming the real final (B). Near-misses: an orange rule on the final (A, the spec's proposal, toggled three times), "the real final" in orange caps as the corner label (C, twice).
- The champion mark: the name in the display face with the flag and the 53% line under it (A). Near-misses: one boxed line in the label face (B, once), no mark with "champion" after the name in the final's row (C, once).
- The winner mark: a light ink-grey tint on the winner's row, the loser's row faded to 0.75 (B). Thiago asked for this variant from the terminal after the first showing, and the winner group was rebuilt around it. Near-misses, first showing: a green tint by share on the winner (the old B, clicked three times), a bar under the winner's name (the old C, once). Near-misses, rebuilt screen: the same grey by share, 53% pale to 86% darkest (C, toggled eleven times against B), weight only (A, twice).
- Contrast: the faded loser row is 3.07:1 at 12px, under AA; even a 0.85 fade is 3.70:1. Told to Thiago before Submit; recorded as his call.

## Chapter three, the transition from chapter two (21 Sep 2026, two companion screens: transition-3 judged from the terminal, then transition-3-hold, Submit pressed)
- First screen (transition-3, groups connectors / tie boxes / hold): Thiago chose Hold B (the bracket holds the screen) from the terminal and described a different scheme for the boxes and the connectors, so the screen was not submitted. Near-misses there: connectors A (the path draws to the final, the spec), B (every connector draws, the path last), C (nothing draws); boxes A (column by column, outer first, the spec), B (all thirty-two together), C (the path's boxes first); hold A (no hold, the spec), C (the path draws on its own over 700 ms).
- Second screen (transition-3-hold), his scheme fixed: the round of 32 on the scroll, row by row, both sides in step, ending exactly at the pin; the later rounds inside the hold, round by round, lines then box, top to bottom, both sides in step; a beat; release.
- Lines: the road to the final stays heavier, 2px on the eight connectors of the finalists' routes (B, his one click). Near-misses: each line draws into its box at 1px (A, the pre-selection), lines appear whole with the box (C), neither clicked.
- Rounds: both sides in step, top to bottom (A, his own description, kept as pre-selected). Near-misses: a whole round at once (B), the left side then the right (C), neither clicked.
- Pace: a screen and a half of hold travel, 0.3 of a screen per round and a 0.3 beat (A, kept as pre-selected). Near-misses: one screen (B), two and a half (C), neither clicked.
- Told before Submit: the round-of-32 rows start printing 12 to 34px under the fold; the beat is fixed at a fifth of the hold. Neither vetoed.
- This makes the bracket the sheet's second pinned moment; spec §4 amended the same day, with the one-moment rule in front of him.

## Chapter four, the hosts (21 Sep 2026, companion screen chapter-4, Submit pressed)
- Form: nine plain ink bars per host, the fate name under each (A). Near-misses: a nine-row fate list per host tinted by share (B, once), one agate table for all three hosts (C, once).
- Numbers: a shared axis in runs, hairlines every 10,000, only each host's tallest bar labelled (B, clicked three times). Near-misses: the count on every bar and no axis (A, once), count and percentage everywhere (C, once).
- Layout: side by side, equal widths (A). Near-misses: stacked full width with the fate names flat (B, once), Mexico large with Canada and the USA stacked beside it (C, once).
- Told before Submit: the fate names turn vertical in layouts A and C; the region head reads "USA". Neither vetoed.

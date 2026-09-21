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
- Correction after Submit (same sitting, from the terminal): Thiago expected the count on every bar together with the axis; option B labelled only the tallest bar. Recorded as the count above every bar plus the shared axis, to be seen at the chapter's localhost checkpoint.

## Chapter four, the transition from chapter three (21 Sep 2026, companion screen transition-4; picks stated from the terminal, order A, bars A, pace A)
- Order: all three together, fate by fate (A, the spec). Near-misses: host by host (B, once), each region as a whole as it arrives (C, once).
- Values: the bar grows from the baseline while its count climbs (A, the spec). Near-miss: the bar darkens from faint to full ink at full height (C, once); the bar stamped at full height (B) not clicked.
- Pace: 18% of a screen (A, the spec). Near-miss: 10% (B, once); 30% (C) not clicked.

## Chapter five, underdogs (21 Sep 2026, companion screen chapter-5, Submit pressed)
- Split: no strip, the three tinted cells with their counts (A, the spec). Near-misses: a thin ink strip before the counts (B, toggled five times), an extra column with the got-out share (C, twice).
- Columns: Team with the group after it, then an Elo column, as chapter one (A, the spec). Near-misses: the Elo after the name and no Elo column (B, three times), Team and group first with Elo last (C, twice).
- Mark: the sub-head alone (A, the spec). Near-misses: a muted note under the table (B, six times), a titles column reading "none" (C, twice).
- All three the spec's proposals, after the longest toggling of any screen so far (33 clicks).

## Chapter five, the transition from chapter four (21 Sep 2026, companion screen transition-5, Submit pressed)
- Order: a table at a time, printed as a whole when its sub-head crosses the reading line (B). Near-miss: row by row as each row arrives (A, the spec, once); both tables as the chapter enters (C) not clicked.
- Inside a row: the counts climb first, then the tints bloom behind them (B). Near-miss: tints and counts together (A, the spec, once); tints first (C) not clicked.
- Pace: 18% of a screen (A, the spec, kept as pre-selected); 10% (B) and 30% (C) not clicked.
- Told before Submit: order B's count-ups run partly before the rows reach the reading line; the Elo column does not climb. Neither vetoed.

## Chapter six, paradoxes (21 Sep 2026, companion screen chapter-6, Submit pressed)
- Versus: a two-row agate inside the box, the bigger row in bold (B). Near-misses: two sides left and right with "vs" between them (A, the spec, three times), one table for all three pairs (C, twice).
- Bars: the percentage above each bar (A, the spec). Near-misses: the count of runs (B, three times), count and percentage together (C, once).
- Reason: under the pair inside its box, in the reading face (A, the spec). Near-misses: one numbered foot note under the row of boxes (B, three times), the box's opening line in News Cycle (C, twice).
- Told before Submit: bold marks the bigger number, in pair one the worse outcome; pairs two and three carry the same label. Neither vetoed.

## Chapter six, the transition from chapter five (21 Sep 2026, companion screen transition-6, Submit pressed)
- Bars: one after another, left to right (A, the spec). Near-miss: the two sides in turn (B, once); all six at once (C) not clicked.
- Boxes: the names first, then the numbers count up, the bigger one last (C). Near-misses: each box as it arrives with both numbers together (A, the spec) and all three when the row enters (B), neither clicked.
- Pace: 18% of a screen (A, the spec). Near-miss: 30% (C, once); 10% (B) not clicked.

## Chapter seven, pick a team (21 Sep 2026, companion screen chapter-7, Submit pressed)
- Lists: a thin ink bar beside the number (A, the spec). Near-misses: the number only, right-aligned (B, four times), the row tinted by its share (C, once).
- Columns: two columns (A, the spec). Near-miss: one column (B, twice); a row of three (C) not clicked.
- Favourites: above the field as the region's opening line (C). Near-misses: under the field on its own line (A, the spec, twice), in the team head at the right (B, once).
- Told before Submit: whole-percent ties in the lists (one decimal fixes it, carried as a build note); no flags on the favourites line. Neither vetoed.

## Chapter seven, the transition from chapter six (21 Sep 2026, companion screen transition-7, Submit pressed)
- Arrive: the head, then each region as it is reached (A, the spec, kept as pre-selected). Near-misses: the whole page when the head enters (B), the fate row then the regions one by one (C), neither clicked.
- Pick: the old ink fades to paper over 150 ms, then the new team prints over 400 ms (B, one click). Near-misses: the regions reprint in place (A, the spec) and the new team just there with the clicked favourite bold for a beat (C), neither clicked.
- Pace: 10% of a screen, quicker (B, one click). Near-misses: 18% (A, the spec) and 30% (C), neither clicked.
- Told before Submit: Pick B adds a fade-out the thesis does not name. Chosen anyway; spec §4 amended the same day.

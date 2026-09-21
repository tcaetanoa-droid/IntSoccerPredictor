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

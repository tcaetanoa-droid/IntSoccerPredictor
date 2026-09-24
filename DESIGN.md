---
name: IntSoccerPredictor
description: The tournament as a newspaper wall chart, filled in 100,000 times; ink and count are the whole story.
colors:
  paper: "#F2F6F1"
  ink: "#10261A"
  ink-soft: "#2C4A38"
  muted: "#5B6E62"
  orange: "#C2410C"
  hair: "rgba(16, 38, 26, .18)"
  fate-gs4: "#DDE3DC"
  fate-gs3: "#C9D3C7"
  fate-r32: "#C2DFC6"
  fate-r16: "#98C8A2"
  fate-qf: "#6BAE7C"
  fate-4th: "#3F8F57"
  fate-3rd: "#B87333"
  fate-ru: "#A8A9AD"
  fate-w: "#C9A227"
typography:
  display:
    fontFamily: "League Gothic, Arial Narrow, sans-serif"
    fontSize: "clamp(2.6rem, 5.2vw, 4.4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "League Gothic, Arial Narrow, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "normal"
  title:
    fontFamily: "League Gothic, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Old Standard TT, Georgia, serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  agate:
    fontFamily: "News Cycle, Arial Narrow, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  head:
    fontFamily: "News Cycle, Arial Narrow, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "News Cycle, Arial Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  none: "0px"
spacing:
  cell: "0.25rem 0.3rem"
  gutter-narrow: "16px"
  gutter: "48px"
  chapter: "3rem 0 2rem"
  sheet: "1360px"
components:
  nav-link:
    typography: "{typography.agate}"
    textColor: "{colors.ink}"
  nav-link-current:
    typography: "{typography.agate}"
    textColor: "{colors.ink}"
    padding: "0 0 0.1rem"
  chapters-list:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.35rem 0.9rem 0.4rem"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.4rem 0.6rem"
    width: "320px"
  box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.4rem 0.5rem 0.45rem"
  box-label:
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    padding: "0 0 0.2rem"
  box-head:
    typography: "{typography.head}"
    textColor: "{colors.ink}"
    padding: "0 0 0.3rem"
  agate-head:
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    padding: "0.3rem 0.3rem 0.2rem"
  agate-cell:
    typography: "{typography.agate}"
    textColor: "{colors.ink}"
    padding: "{spacing.cell}"
  chapter-title:
    typography: "{typography.headline}"
    textColor: "{colors.ink}"
    padding: "0.35rem 0 0.3rem"
---

# Design System: IntSoccerPredictor

## Overview

**Creative North Star: "The Wall Chart"**

The site is one printed sheet: a newspaper wall chart of the 2026 World Cup, filled in 100,000 times. One paper, one ink, and the count. Everything a visitor reads sits on the same surface; nothing floats above it, nothing is boxed off into a card, nothing glows. The hierarchy is the broadsheet's: condensed capitals for mastheads and chapter titles, a text serif for the sentences, a compact sans for every table, label and figure. Rules do the structural work that colour and elevation do elsewhere: a 3px rule under a masthead, a pair of 3px rules around a chapter title, a hairline between rows.

Colour is rationed by meaning. Orange marks the hot number and the real result, and appears in two pieces of chrome (the current-page underline, the focus ring). The nine-step fate scale colours a cell whose column is a fate, at a strength that follows the share, so the tint carries frequency and the number stays in full ink. Where there is no fate colour, ink density carries frequency instead (the hero's champion column). Text never fades to say "small".

The sheet is filled in as you read it. Ink prints and counts count up as a row crosses the reading line; nothing slides, rises or fades in from below; nothing un-prints on the way back up. Two authored moments hold the page still (the pinned hero, the held bracket); every other chapter varies the same print with its own material. This world was chosen against the heat-shaded probability dashboard and against the cream, italic-serif, mono-kicker editorial scroll the site had before; both are rejected, not merely absent.

**Key Characteristics:**
- One surface: paper, with ink and hairline rules as the only structure. No cards, no shadows, no radius, no gradients, no glow.
- Three faces, each with one job: League Gothic capitals for titles, Old Standard TT for reading, News Cycle for every table, label, count and nav.
- Colour rationed: orange for the hot number, the real result and two chrome uses; the fate scale as cell tint whose strength follows the share; numbers always in full ink.
- Motion is print: scrubbed to the scroll on the way down, never un-printing, with count-ups and ink density instead of transitions. No CSS transitions exist on the sheet.
- Contrast floor: every text colour clears 4.5:1 on paper and on the tint it sits on; no text under 12px.

## Colors

A green-tinted paper and a near-black green ink, with one orange for what is real, and a nine-step fate scale that runs from pale grey-green through the greens to bronze, silver and gold.

### Primary
- **Orange** (`orange`): the hot number and the real result. On the first viewport it colours the headline's second sentence ("Spain won 18,626 of them") and Spain's row in the champion column, whose count also goes bold. Its two chrome uses are the 2px underline beneath the current page in the site masthead and the 2px focus ring (offset 2px) on every focusable element. The bracket's real final is a muted caption, not orange (Thiago's pick at the bracket checkpoint). 4.68:1 on paper.

### Secondary
- **The fate scale** (`fate-gs4` through `fate-w`, in tournament order: 4th in group, 3rd and out, round of 32, round of 16, quarter-final, 4th place, 3rd place, runner-up, champion): the colour of a table cell whose column is a fate. It is a categorical scale, not a tonal ramp: four greens rising in depth for the early exits and the deep runs, then bronze, silver and gold for the podium. A cell is tinted with `color-mix(in srgb, <fate> <strength>%, transparent)` where strength is `min(1, 2.5 × share)` and share is the cell's count over the run total; the tint saturates at a 40% share. The scale is also the legend order for the hosts' and paradoxes' charts, though those charts draw in plain ink and use the scale only as an ordering.

### Neutral
- **Paper** (`paper`): the page and every region on it. There is no second surface; a popover, a results list and a box are paper with an ink border. Also the text colour of `::selection` (paper on ink) and the fill of a hollow chart dot.
- **Ink** (`ink`): text, rules, bars, connectors, borders, the masthead's bottom rule, the selection background. Numbers are always ink.
- **Soft ink** (`ink-soft`): reading text (the lede, chapter intros, method prose, the paradox reason lines), and the step darker a muted count takes when it sits on the 9% tint (muted would read 4.19:1 there).
- **Muted** (`muted`): secondary labels, foot notes, the chart masthead's line, "soon" links, the rest-of-field row, a group's usual outs, a bracket loser, ticks on a chart axis. 4.99:1 on paper.
- **Hairline** (`hair`): 18% ink. The rule between table rows and list rows, a chart's grid runs, the 1px ring around a flag, the closing rule under a worked example.
- **The 9% tint**: `color-mix(in srgb, var(--ink) 9%, transparent)`, not a token but a reused value: the flat ground under a winning tie in the bracket, a highlighted row in the team search results, a hovered chapter in the Chapters list. The same depth every time it appears.

### Named Rules
**The Real-Result Rule.** Orange means the thing that actually happened or the number the page exists to show. It is never decoration, never a heading colour, never a link colour. Beyond the hot number and the real result its only uses are the current-page underline and the focus ring.

**The Ink-Number Rule.** A number is set in full ink whatever tint sits under it. Colour carries frequency; text never fades to carry it. The one place ink density carries frequency is the hero's champion column, where there is no fate colour, and its floor is 65% ink (4.8:1 on paper).

**The 4.5 Floor Rule.** Every text colour clears 4.5:1 on paper and on the strongest tint it sits on. A muted figure that lands on the 9% tint steps to soft ink to keep the floor. One kept exception exists and is recorded under Do's and Don'ts, not here.

## Typography

**Display Font:** League Gothic (with Arial Narrow, sans-serif)
**Body Font:** Old Standard TT (with Georgia, serif)
**Label/Mono Font:** News Cycle (with Arial Narrow, sans-serif) for every table, label, count, nav item and foot note; `ui-monospace, Menlo, monospace` only for the five reproduction commands in the method chapter.

**Character:** A newspaper's three registers. League Gothic is the condensed headline capital: one weight, always uppercase, set tight at line-height 1 or below. Old Standard TT is the text face for anything that reads as a sentence, and the sheet's only serif. News Cycle is the agate: compact, upright, with proportional figures (the face has no tabular set; `tabular-nums` is declared and inert), and it carries the whole numerical story. Emphasis comes from weight and size, never from a second colour.

The faces are self-hosted: twelve woff2 files under `site/fonts/`, declared one face per file in `css/fonts.css`, which every page links before `css/site.css`; the page reaches no Google domain. Each declaration carries `font-display: swap` and Google's own `unicode-range`, in the latin and latin-extended subsets, so a page downloads only what its text needs: League Gothic in its one weight, News Cycle 400 and 700, Old Standard TT 400, 700 and italic 400. Every page preloads `fonts/league-gothic-400-latin.woff2`, the masthead's face, so the first paint is never Arial Narrow. All three families are under the SIL Open Font License, whose text sits beside them as `OFL-<family>.txt`. These faces bind this site only; no house type is shared across Thiago's projects.

### Hierarchy
- **Display** (400, `clamp(2.6rem, 5.2vw, 4.4rem)`, line-height 1, uppercase): the hero headline only. Its second sentence is orange on its own line.
- **Headline** (400, 2.6rem at 1024px and up, 2rem below, line-height .95, uppercase, centred): a chapter title, set between a 3px rule above and a 3px rule below.
- **Title** (400, 1.5rem, line-height 1, uppercase): a sub-head inside a chapter, a host region's name, the champion's name in the bracket. The chart masthead's title is the same face at 1.75rem (1.4rem below 1024px); the picked team's name at 2rem; the wordmark at 1.35rem with .02em tracking.
- **Body** (400, 1.05rem, line-height 1.55, soft ink, measure ≤ 60ch): the lede, chapter intros, method prose, the picked team's paragraph. The claim that opens an intro is 700 in full ink. The paradox reason lines and the worked example run at .95rem with the same leading; 1.55 is the reading face's one leading.
- **Agate** (400, .8rem, News Cycle, figures right-aligned): the body of every table, the foot notes and the chart masthead's line; cells pad .25rem .3rem. Rows in the bracket and the paradox boxes run at .75rem; list rows in the picker and the search results at .875rem; the hero column rows at 1rem (the rest-of-field row at .85rem).
- **Label** (700, .75rem, .06em tracking, uppercase): the short-label role — a table head, a column label, a group box's label, a round head in the bracket, the sub-line under a count, the calibration chart's two SVG panel titles. The hero column's label, a host mark, the footer's column heads and the placeholder pages' fact keys track wider at .08em.
- **Head** (700, .8rem, line-height 1.3, sentence case, no tracking, full ink): a label that reads as a sentence rather than a column head — the three paradox box labels and the method chapter's worked-example, calibration and "Reproduce it" heads — over the same 1px rule the caps label carries (a box head's rule prints with its box at `--bp`).
- **Count** (700, 2rem, News Cycle, right-aligned): the picked team's headline count in chapter seven, the one figure set at title size.
- **Equation** (KaTeX at 20px, line-height 1.4, ink): display maths in the method chapter; the size chosen so KaTeX's smallest script level stays at 12px.

### Named Rules
**The Twelve-Pixel Rule.** No text under 12px (.75rem): agate is the densest role, superscripts are floored at `max(12px, .72em)`, chart labels are drawn at 12px at every width because the charts redraw at their measured pixel width rather than scaling through a viewBox.

**The Three Registers Rule.** League Gothic sets titles, Old Standard TT sets sentences, News Cycle sets everything that is a table, label or number. A face does not cross into another's job; a title is never set in the serif, and a count is never set in the display face.

**The Sentence-Case Head Rule.** A label that runs as a sentence is set as a sentence-case bold head (News Cycle 700, .8rem, no tracking, full ink) over its rule. Tracked capitals are for short labels only: a column head, a box label, a round head, a chart's panel title.

**The Right-Edge Rule.** Every number sits in News Cycle and is right-aligned, so a count-up settles on its right edge. `font-variant-numeric: tabular-nums` is declared throughout but News Cycle carries no tabular figures, so digits shift sideways while a count climbs; accepted at the hero checkpoint, and the reason numbers are never centred.

## Layout

One column. The sheet is a centred `max-width: 1360px` with a 48px gutter either side (16px below 1024px); there is no rail, no side column, no grid with a secondary track. The site masthead is sticky at the top on paper, `z-index: 5`, with a 1px ink rule beneath it; its measured height is published as `--hdr` on `:root` by `js/header.js` (0px until measured, re-measured on resize and once the faces settle), and the two pinned regions, the Chapters popover's top edge and every hash target's `scroll-margin-top` take their geometry from it. Every focusable element carries `scroll-margin-top: calc(var(--hdr) + .5rem)` so a Tab never lands behind the masthead. Below 1024px the masthead is one row — the wordmark and the Chapters button — and the five site links withdraw into the Chapters popover as a first group above a 1px ink rule; `--hdr` measures about 46px there against 49px on the desktop.

A chapter is padded `3rem 0 2rem`. It opens with its title between two 3px rules, then an intro in the reading face at ≤ 60ch, then its own region of the chart. Chapters are separated by air and by their own title rules; there is no border between them. The hero is a held screen as tall as its own content (sticky at `top: var(--hdr)`) inside a taller pin block, and closes on a 3px rule set 1.5rem under the taller of its two columns, bleeding to the gutters as the sheet's first limit.

Region ladders are set per chapter from measured widths, not from shared breakpoints: the group wall runs four boxes across, stepping to three at 1299px, two at 899px, one at 559px; the hosts' three regions stack below 1150px (each capped at 560px); the paradox pairs stack below 900px; the picker's two columns stack below 900px, and its opponents region is a container that drops the round label onto its own line below 560px and the three opponents to one per line below 440px; the method chapter's calibration panels stack below 1327px and its step grid below 1023px. The fate table (1100px floor), the underdogs tables (1100px), the bracket grid (1104px), the paradox chart (500px) and the calibration chart (600px below 631px) never shrink below the width their 12px type needs: they scroll sideways inside a focusable region with a thin ink scrollbar and a "Scrolls sideways" line printed under them while they overflow.

Density is the agate's: cell padding `.25rem .3rem`, row padding `.3rem` in lists, `gap: 10px 8px` in the bracket grid, `1.1rem .9rem` between group boxes.

## Elevation & Depth

No shadows, no elevation. The sheet is flat by definition: one paper surface with everything printed on it. The single `box-shadow` in the stylesheet is the 1px hairline ring around a flag (`0 0 0 1px var(--hair)`), a border by other means with no blur and no offset, not depth. Layered things (the Chapters popover, the team search results) are paper with a 1px ink border sitting on paper; their separation is the rule, not a shadow. Emphasis is conveyed by ink weight (a 3px rule against a hairline), by bold, and by the flat 9% ink tint under a highlighted or winning row.

### Named Rules
**The No-Shadow Rule.** Nothing on the sheet casts a shadow, glows, blurs or lifts on hover. A popover or a dropdown is a ruled box on the paper. If a new surface needs to read as "above", give it a 1px ink border.

## Shapes

Square. Every corner on the sheet is a right angle: `border-radius: 0` is the only radius that appears, and it is declared once, on the search field, to make the intent explicit. Flags are 20 × 14 rectangles (18 × 12 in the bracket, larger at chapter heads and the champion mark) with no radius and a hairline ring.

The form language is the rule and the box. Rules come in three weights with three jobs: a 3px ink rule under a masthead, above and below a chapter title, at the top of a table head, at the bottom of the held hero and at the top of the footer and a worked example; a 1px ink rule under a table head row, under a box label, under the site masthead and under a region's sub-head; a 1px hairline between rows and as a chart's grid runs. A box is a 1px ink border with no fill, and a box prints as one unit: its border's ink is a custom property (`--bp`) that the print engine takes from 6% to full ink with the box's label. Bars are plain ink rectangles (6px in the group boxes, 8px in the picker's lists, drawn bars in the SVG charts) on a hairline or paper track; the bracket's connectors are 1px ink paths, 2px on the two finalists' routes.

## Components

### Buttons
There are no styled buttons. Every button on the sheet is text in the surrounding type with the chrome removed (`background: none; border: 0; padding: 0; cursor: pointer`): the Chapters button in the masthead, the sort buttons inside the fate table's column heads (which take the head's caps and tracking, underline when sorted, and append an arrow from `aria-sort`), and the clear button inside the search field (muted, 1.05rem). Focus is the 2px orange ring; inside a sideways-scrolling region the ring's offset goes negative (`-2px`) so the container does not clip it.

### Navigation
- **Site masthead:** sticky, paper, 1px ink rule beneath, flex with the mark and the wordmark left (the 20px mark, then League Gothic 1.35rem caps) and the nav right (News Cycle .85rem, no underline at rest), wrapping at narrow widths. The current page carries a 2px orange underline with .1rem of padding; a "soon" page is muted; a hovered link takes the sheet's underline. Below 1024px the nav links are withdrawn and the masthead is one row, wordmark and Chapters button, about 46px tall.
- **Chapters list:** a native `popover` fixed under the masthead's right edge (`inset: calc(var(--hdr) + .4rem) var(--gutter) auto auto`), paper with a 1px ink border, at least 12rem wide, one chapter per line at .85rem with a hairline between (the sheet's seven; How it works is a page of its own, `/how-it-works`, listed among the site links); a hovered chapter takes the 9% tint. Below 1024px it opens with the five site links as a first group, each page's own states kept (the current page marked with a 2px orange underline, since a border would draw the box's full width; a "soon" page muted), and a 1px ink rule between that group and the chapters. Escape and light dismiss come from the popover; the first link is autofocused.
- **Chart masthead:** the hero's, the method page's and the placeholder pages' title line: title in League Gothic 1.75rem caps left, the muted .8rem line right, a 3px ink rule beneath, wrapping under the title on phones.

### The mark
The site's one image: a soccer pitch drawn in ink on paper, `site/favicon.svg`. A 32-unit box with a 6-unit corner radius, the ground paper, the lines ink at 2.5 units (1.25px in a 16px tab): the touchlines inset to the corner, the halfway line, the centre circle (r 5.5) and its spot, and the two penalty areas (8 deep, 19 tall). No orange, no green, no ball. It is the favicon on every page (the SVG; `favicon-32.png` for Safari, which ignores SVG icons; `apple-touch-icon.png` at 180px from the square-cornered drawing, since iOS cuts its own corners) and it sits before the wordmark in the masthead at 20px, an `<img>` inline in the text run (`vertical-align: -3px`, .5rem before the name) so the masthead's baseline row and the header height `js/header.js` measures do not move. Nowhere else: not in the footer, not in a chapter. Its rounded corners are the one radius on the site and belong to the mark, not to any region. Chosen by Thiago from rendered options on 22 Sep 2026: the whole pitch over a centre crop and one end, rounded over square and disc, paper over ink and green, the rule weight over hairline and heavy, ink only, and the tab and masthead over the tab alone.

### Inputs / Fields
- **Style:** the team search is a ruled field: 1px ink border, no fill, no radius, `.4rem .6rem` padding, 320px wide (capped at 100%); inside it the chosen team's flag, the text input (News Cycle 1rem, no border of its own, 16px on coarse pointers and under 600px so iOS does not zoom) and the clear button.
- **Focus:** the box carries the ring, not the input (`:focus-within` draws the 2px orange outline at 2px offset; the input's own outline is 0).
- **Results:** a paper box with a 1px ink border hung off the field 4px below, at the field's width, capped at 15rem and scrolling; rows at .875rem with the count muted and right-aligned; the active or hovered row takes the 9% tint and its count steps to soft ink; the empty state is a muted, non-interactive row.
- **Failure:** a pick whose file does not arrive leaves the previous team on the page, with its name in the field and its address, and prints one line under the field in the foot-note role (News Cycle .8rem, muted, `role="status"`): "Brazil's runs did not load. Pick again to retry." The next pick clears it. Empty, the line takes no room.

### Tables (the agate)
- **Style:** `border-collapse: collapse`, full width, .8rem News Cycle. The head row is the label style (700, .75rem, caps, .06em) over a 3px ink rule and closed by a 1px ink rule; heads and cells are right-aligned except the first column; the row head is bold with an optional muted, regular-weight note beside it (a team's group). Body rows separate with a hairline; cells carry right-aligned figures.
- **Fate cell:** a cell with `data-share` takes its column's fate colour at a strength the print engine writes to `--t`; the number stays ink and the champion column's count is bold. Subtotal columns are muted with a rule to their left (1px ink at the head, hairline in the body).
- **Fixed layout where width would encode:** the underdogs tables and symbol keys use `table-layout: fixed`, so a tint block's area does not follow the length of its column head.
- **Hover:** a hovered row darkens its ink (`filter: brightness(.94)`), the one feedback the sheet gives, with no transition.

### Boxes (the ruled unit)
- **Corner Style:** square.
- **Background:** none; paper shows through.
- **Border:** 1px ink whose strength is `--bp`, printed from 6% to full with the label.
- **Label:** the label style with a 1px ink rule beneath (`.2rem` to `.3rem` of padding); in a box the table inside drops its own 3px head rule because the label's rule closes the head.
- **Internal Padding:** `.4rem .5rem .45rem` in the group wall; `.65rem .75rem .75rem` in the paradox pairs; `5px` per tie in the bracket. A box's last row drops its hairline.

### Charts
SVG drawn by script at the holder's measured pixel width and redrawn on resize, never scaled through a viewBox, so every label is 12px at every width. Bars are ink, grid runs are hairline, the baseline is 1px ink, ticks are muted, values are ink (bold where they are the mark), the calibration line is 1.5px ink and its observed points are hollow (paper fill, 1.4px ink stroke). No colour but ink; no bar carries a flag colour.

### Bracket summary (narrow screens)
A ruled unit, not a box: a 3px ink rule above, a hairline below, `.9rem 0 1rem` of padding. On a screen too narrow for the bracket grid it prints between the chapter's intro and the sideways grid — the champion mark, the final's tie box (capped at 300px, centred) and the reality caption centred beneath it — built from the same matches as the grid, nothing typed. It is shown by a `:has()` on the grid's own overflow class, so it is out of the layout wherever the grid fits whole and a browser without `:has()` simply never shows it. It prints as one block on entry: its box's rule from 6% to full ink with the unit, its three percentages counting out of blank.

### The Print (signature)
Motion on the sheet is one thing: a unit prints. `js/print.js` owns every scroll-linked change; chapter modules build their DOM, register units and never listen to scroll. Progress follows the scroll on the way down and never decreases. A block (a title, an intro) prints over the first 40% of a screen after its top enters, from 4% to full ink. A row prints as it crosses the reading line at 92% of the viewport, over a band of 18% of a screen by default (a unit with its own schedule asks for more): its row head and its cells from that same 4% floor, its counts as `round(p × count)` with thousands separators, its fate tint as `p × min(1, 2.5 × share)`. A hero row prints from 6% ink to a target of `0.65 + 0.35 × share`. Nothing shows until it prints: a count or a percentage is empty at progress 0 and climbs from the first frame, so a half-read sheet carries no number the runs never produced, while the frame — heads, labels, rules, axes, ticks, a box border at its 6% floor — is printed from the start. Every count is two spans: the final value visually hidden for assistive technology, the counting display `aria-hidden`; a screen reader always reads the finished sheet.

Two authored moments hold the page. The hero: the held screen sticks under the masthead inside a block of `held content + 1.35 × viewport`; one screen of scroll fills the thirteen rows in sequence, each overlapping the next by half, the last finishing at progress 1; the finished column then holds for 0.35 of a screen, during which chapter one's title rises from below the fold and arrives 3rem under the limit rule exactly at the release, so no blank paper scrolls past. Nothing below prints until the column is complete. The pin engages only when the held content fits the viewport less the masthead and the sheet is at least 1024px wide (below that the column stacks under the lede and the hero flows, so a phone's URL bar changing the viewport height mid-scroll can never flip it), and it snaps at half a pixel, so a masthead height rounded up never starts the fill on an unscrolled page. The bracket: once its grid crosses the reading line the page holds the whole grid in view for 1.35 screens of wheel travel, printing the four knockout rounds over 0.3 of a screen each, then a beat of 0.15 with the finished bracket, then releases; the approach is 0.92 of a screen less the header and less the chapter head when that is held with the grid. The held region carries 8px of paper above its content at the lock (one constant, the same 8 in the stylesheet and in the engine), so its top rule never touches the masthead's; the fit test, the block's travel height and the slack all count it. Either pin engages only when its region fits the viewport (height, and for the bracket width too); otherwise the rows print across the reading line like any table.

Exceptions are exact: on a pick in chapter seven the old team's ink fades to paper over 150ms, then the new team reprints from zero over 400ms ease-out (`1 − (1 − k)³`), independent of scroll. Sorting the fate table keys progress by team, so a sorted row stays printed. Under `prefers-reduced-motion: reduce` the sheet is finished: every unit painted complete at boot, no pin, no hold, no scroll listener (the layout still follows the width), and smooth scrolling off. There are no CSS transitions anywhere; hover feedback is instant. Budget: one passive scroll listener, one `requestAnimationFrame` per scroll event, an IntersectionObserver marking the live set one screen either side, and only units whose progress changed are painted.

## Do's and Don'ts

### Do:
- **Do** put every new region on the paper with rules for structure: a 3px ink rule to open a table head or a masthead, a 1px ink rule to close a head or a label, a hairline (`hair`) between rows.
- **Do** set a title in League Gothic capitals, a sentence in Old Standard TT at 1.05rem/1.55 and ≤ 60ch, and every table, label, count and nav item in News Cycle with right-aligned figures.
- **Do** keep numbers in full ink and let the fate scale's tint at `min(1, 2.5 × share)` carry frequency; where there is no fate colour, use ink density with a 65% floor.
- **Do** reserve orange for the hot number, the real result, the current-page underline and the focus ring.
- **Do** make a new unit print through `js/print.js` (register it with a painter; blocks on entry, rows across the reading line) and honour reduced motion by painting it complete at boot.
- **Do** leave a count or a percentage blank until its unit prints, and sit an unprinted row at the 4% block floor; the frame (heads, labels, rules, axes, a box border at its floor) prints from the start.
- **Do** set a label that runs as a sentence as a sentence-case bold head (News Cycle 700, .8rem, no tracking) over its rule, and keep tracked capitals for short labels.
- **Do** clear 4.5:1 on paper and on the tint a text sits on, and never set text under 12px; step a muted figure to soft ink when it lands on the 9% tint.
- **Do** give a wide region a measured minimum width and let it scroll sideways inside a focusable `.scroll-x` with its cue line, rather than shrinking type or scaling a chart.
- **Do** measure a chart's width and redraw it, so its labels stay 12px.

### Don't:
- **Don't** add cards, a second surface colour, border radius, shadows, glow, gradients or pills; a raised thing is a 1px ink box on paper. The mark's own corners are the one radius (see The mark).
- **Don't** put a kicker, an eyebrow or a chapter number above a heading; a chapter is known by its name between two rules.
- **Don't** use orange on the bracket (its real final is a muted caption), as a heading colour or as a link colour; links are ink with a 1px underline at .15em offset.
- **Don't** fade text to say a number is small, and don't colour a bar or chart with a flag's colours; bars are ink.
- **Don't** use monospace as a costume; it sets the five reproduction commands and nothing else.
- **Don't** add a CSS transition, a hover lift, a transform or a fade-in from below; the sheet's only fade is the 150ms ink-to-paper on a team pick, and the only hover feedback is `brightness(.94)`.
- **Don't** let a unit un-print on the way back up, or listen to scroll outside `js/print.js`.
- **Don't** stretch tracked capitals across a sentence-length label, and don't print a "0" where a unit has not printed yet; blank is the unprinted state.
- **Don't** let a column head's length set a tinted cell's width; fix the layout where a tint could read as area.
- **Don't** treat the bracket's losing rows at 0.75 opacity (3.07:1 at 12px) as licence: it is Thiago's one kept exception to the 4.5 floor, not a pattern for new surfaces.

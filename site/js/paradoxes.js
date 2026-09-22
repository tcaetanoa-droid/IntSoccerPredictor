// site/js/paradoxes.js
import { h, flag, name, fmtCount, fmtPct, scrollX, chapterHead } from './dom.js';
import { svgEl } from './svg.js';
import { register, paintBlock, rowWindow } from './print.js';

// Italy has four titles and did not qualify, so it is not in teams.json; the chart still has to
// name it. It has no flag anywhere on the site, and the chart carries no flags by design.
const ABSENT = { IT: 'Italy' };
// A box label is the pair's own paradox and then the metric it is measured on. Panel A is the
// round-of-32 draw, panel B home advantage (spec §8, Paradoxes, the copy note).
const PANEL = {
  A: 'Higher rating, earlier exit: chance of losing the round-of-32 tie, once there',
  B: 'Lower rating, home advantage: chance of winning the tournament',
};
const REASON = {
  'A:1': 'Argentina tops Group J, which sends it into a round-of-32 tie with the runner-up of Group H: Uruguay, in 48% of runs. France tops Group I and usually meets a third-placed team (Sweden most often, 12%).',
  'B:1': 'The United States play every knockout match at home, and home is worth 100 Elo points in the model. That closes a 104-point gap and then some.',
  'B:2': 'Same mechanism, smaller gap: Mexico plays its knockouts at home and edges past a Uruguay side rated 17 points higher.',
};

// The axis, in percent: hairlines behind the bars and a ceiling that clears Portugal's 4.889%.
const TICKS = [0, 1, 2, 3, 4, 5], YMAX = 5.5;
// The chart's geometry in CSS pixels, as the approved screen draws it. The chart is drawn at its
// holder's measured width and never scaled by a viewBox, so its 12px labels are 12px at every
// width. AXIS is the column the tick labels hang in, EDGE the air at the right, TOP the air the
// label over the tallest bar needs, PLOT the bars' own height.
const AXIS = 34, EDGE = 8, TOP = 24, PLOT = 230, BASE = TOP + PLOT;
// Under the baseline: the team name, then its title line, and the height one or two of those
// lines cost the chart. LABEL_GAP is the air between a bar's head and its percentage.
const NAME_Y = 20, SUB_Y = 37, SUB_LINE = 15, FOOT_1 = 46, FOOT_2 = 62, LABEL_GAP = 7;
const STUB = 3;     // Italy: a hairline stub, the one bar whose height is not its value
// A title line fits its column when it is no wider than the column less this air; when one
// two-part line does not fit, every two-part line breaks in two. It is also where the holder's
// min-width in site.css comes from.
const CLEAR = 10;
// The bars print one after another, left to right, each over a band and half a band behind the
// one before (spec §8, the motion amendment, the approved pace of 18% of a screen). rowWindow is
// exactly that sequence, and it spans (n + 1) / 2 bands: 3.5 of them for six bars.
const chartBand = (n) => (0.18 * (n + 1)) / 2;

// "never won it" for a first-timer, the title count for a giant, and Italy's absence after it.
const titleLine = (r) => (r.side === 'first_timer' ? 'never won it'
  : `${r.titles}× champion${r.qualified ? '' : ', did not qualify'}`);

// The title lines are measured in the chart's own type, because the faces settle after boot and
// a line too wide for its column breaks in two.
function measure(section, rows) {
  const probe = svgEl('svg', { class: 'tc', width: 600, height: 40, style: 'position:absolute;left:-9999px;visibility:hidden' });
  section.append(probe);
  const widths = rows.map((r) => {
    const text = svgEl('text', { class: 'ts', 'font-size': 12 }, r.sub);
    probe.append(text);
    const w = text.getComputedTextLength();
    text.remove();
    return w;
  });
  probe.remove();
  return widths;
}

// The trophy chart: the frame (the axis hairlines and their ticks, the baseline and the dashed
// divider with its two side labels) in a group of its own, then a bar per team with the
// percentage over its head and the name and title line under the baseline. Returns the pieces
// the painter writes. The SVG is aria-hidden, its counting label being SVG text rather than
// dom.js's two spans; the hidden agate table beside it is what assistive technology reads.
function chart(rows, subWidths, n, width) {
  const gw = (width - AXIS - EDGE) / rows.length, bw = Math.min(gw * 0.46, 96);
  const snap = (v) => Math.round(v) + 0.5;         // a hairline on the pixel, not across two
  const Y = (share) => BASE - (share * 100) / YMAX * PLOT;
  const two = rows.some((r, i) => r.parts.length > 1 && subWidths[i] > gw - CLEAR);
  const height = BASE + (two ? FOOT_2 : FOOT_1);
  const svg = svgEl('svg', { class: 'tc', width, height, 'aria-hidden': 'true' });
  const chrome = svgEl('g', { class: 'chrome' });
  for (const t of TICKS) {
    const y = snap(Y(t / 100));
    chrome.append(
      svgEl('line', { class: 'grid', x1: AXIS, x2: width - EDGE, y1: y, y2: y }),
      svgEl('text', { class: 'tick', x: AXIS - 7, y: y + 4, 'text-anchor': 'end', 'font-size': 12 }, `${t}%`));
  }
  chrome.append(svgEl('line', { class: 'base', x1: AXIS, x2: width - EDGE, y1: snap(BASE), y2: snap(BASE) }));
  // The divider sits after the first-timers, counted from the data rather than placed by hand.
  const xd = snap(AXIS + rows.filter((r) => r.first).length * gw);
  chrome.append(
    svgEl('line', { class: 'dv', x1: xd, x2: xd, y1: TOP, y2: height - 6, 'stroke-dasharray': '4 4' }),
    svgEl('text', { class: 'dl', x: xd - 10, y: TOP + 13, 'text-anchor': 'end', 'font-size': 12 }, 'NEW CONTENDERS'),
    svgEl('text', { class: 'dl', x: xd + 10, y: TOP + 13, 'font-size': 12 }, 'FADED GIANTS'));
  svg.append(chrome);                              // the hairlines run behind the bars
  const bars = rows.map((r, i) => {
    const cx = AXIS + i * gw + gw / 2;
    const top = r.qualified ? Y(r.share) : BASE - STUB;
    const rect = svgEl('rect', { class: 'bar', x: (cx - bw / 2).toFixed(1), y: BASE, width: bw.toFixed(1), height: 0 });
    // data-count carries the runs behind the share, the engine's unit for a printed count; the
    // label itself reads in percent, so the painter formats it with fmtPct rather than
    // paintCounts, which formats whole numbers.
    const ct = svgEl('tspan', { class: 'ct' }, '0');
    const val = svgEl('text', { class: 'val', 'data-count': Math.round(r.share * n), x: cx.toFixed(1), y: BASE, 'text-anchor': 'middle', 'font-size': 13 }, ct);
    const tn = svgEl('text', { class: 'tn', x: cx.toFixed(1), y: BASE + NAME_Y, 'text-anchor': 'middle', 'font-size': 13 }, r.name);
    const lines = two ? r.parts : [r.sub];
    const subs = lines.map((t, k) => svgEl('text', { class: 'ts', x: cx.toFixed(1), y: BASE + SUB_Y + k * SUB_LINE, 'text-anchor': 'middle', 'font-size': 12 },
      k === 0 && lines.length > 1 ? `${t},` : t));
    svg.append(rect, val, tn, ...subs);
    return { rect, val, ct, tn, subs, share: r.share, full: BASE - top };
  });
  return { svg, bars };
}

// A bar prints: it grows out of the baseline in full ink while its percentage rides up with it
// and counts to the bar's value in tenths. The bar's height is the number, so nothing slides.
// The team name and its title line print like a row's heading. Italy grows only its stub.
function paintBar(bar, p) {
  const grown = bar.full * p, y = BASE - grown;
  bar.rect.setAttribute('y', y.toFixed(1));
  bar.rect.setAttribute('height', grown.toFixed(1));
  bar.val.setAttribute('y', (y - LABEL_GAP).toFixed(1));
  bar.val.style.opacity = (0.2 + 0.8 * p).toFixed(3);
  bar.ct.textContent = fmtPct(p * bar.share);
  const ink = (0.15 + 0.85 * p).toFixed(3);
  bar.tn.style.opacity = ink;
  for (const t of bar.subs) t.style.opacity = ink;
}

// A versus pair prints as one unit in three overlapping windows inside its band (spec §8, the
// motion amendment): the box's rule, its label and the two teams first, then each number counts
// up, the bigger one starting last and landing in bold as the unit finishes. The Elo prints with
// the row's ink and never climbs: a rating is not a count of runs. The reason line prints over
// the box's own band, so the explanation is on the paper before the figures land.
function paintPair(pair, p) {
  const ink = rowWindow(p, 0, 3);
  pair.el.style.setProperty('--bp', (0.06 + 0.94 * ink).toFixed(3));
  paintBlock(pair.label, ink);
  const head = (0.15 + 0.85 * ink).toFixed(3), cell = (0.2 + 0.8 * ink).toFixed(3);
  for (const s of pair.sides) {
    s.th.style.opacity = head;
    s.elo.style.opacity = cell;
    const q = rowWindow(p, s.hi ? 2 : 1, 3);
    s.cell.style.opacity = (0.2 + 0.8 * q).toFixed(3);
    s.ct.textContent = fmtPct(q * s.share, s.dec);
    if (s.hi) s.tr.classList.toggle('hi', q >= 1);
  }
  paintBlock(pair.reason, p);
}

export function render(section, ctx) {
  const runs = fmtCount(ctx.n);
  const rows = ctx.report.trophy_paradox.map((r) => {
    const sub = titleLine(r);
    return {
      name: ABSENT[r.team] || name(r.team, ctx.byCode), share: r.champion_pct,
      qualified: r.qualified, first: r.side === 'first_timer',
      sub, parts: sub.includes(', ') ? sub.split(', ') : [sub],
    };
  });
  const unit = `Chance of winning the tournament, in ${runs} runs`;
  // The chart is aria-hidden, so its six values are read from here: the same agate as any other
  // table on the sheet, visually hidden. The .sr box is the wrapper, not the table: overflow is
  // ignored on a table box, and a table sized to its content would widen the region.
  const sr = h('div', { class: 'sr' }, h('table', {}, h('caption', {}, unit),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Team'), h('th', { scope: 'col' }, 'Chance'), h('th', { scope: 'col' }, 'Titles'))),
    h('tbody', {}, ...rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.name),
      h('td', {}, fmtPct(r.share)), h('td', {}, r.sub))))));
  // Six full team names need room: below the holder's floor the chart scrolls sideways inside
  // the sheet, as chapter one's table does.
  const holder = h('div', { class: 'holder' });
  const wrap = scrollX('Trophy chart, scrolls sideways', sr, holder);

  let bars = [], printed = [], chartP = 0;
  // Only a bar whose own window moved is written (spec §4, the budget); a redraw clears the
  // record, since fresh nodes carry no print.
  const paintBars = () => bars.forEach((bar, i) => {
    const q = rowWindow(chartP, i, bars.length);
    if (printed[i] === q) return;
    printed[i] = q;
    paintBar(bar, q);
  });
  // The chart follows its holder's measured width, so it is redrawn when that changes and once
  // the faces have settled, then repainted at the progress it had, as chapter four's charts are.
  const draw = () => {
    const drawn = chart(rows, measure(section, rows), ctx.n, holder.clientWidth);
    bars = drawn.bars;
    printed = [];
    holder.replaceChildren(drawn.svg);
    paintBars();
  };

  const groups = {};
  for (const r of ctx.report.paradoxes) (groups[`${r.panel}:${r.pair}`] ??= []).push(r);
  // A pair: its label over the label's own rule, then a two-row agate with the flag, the name,
  // the Elo and the number, and the reason line under it. The label's rule closes the head, so
  // the agate drops its own 3px rule (site.css). The bigger number's row goes bold: it is the
  // number that makes the point, not the better outcome.
  const boxes = Object.entries(groups).map(([key, [a, b]]) => {
    const bigger = Math.max(a.value, b.value);
    const sides = [a, b].map((r) => {
      const dec = r.value < 0.01 ? 2 : 1;
      const ct = h('span', { class: 'ct', 'aria-hidden': 'true' }, '0');
      const th = h('th', { scope: 'row' }, flag(r.team, ctx.byCode), name(r.team, ctx.byCode));
      const elo = h('td', { class: 'el' }, Math.round(r.elo));
      const cell = h('td', {}, h('span', { class: 'sr' }, fmtPct(r.value, dec)), ct);
      return { tr: h('tr', {}, th, elo, cell), th, elo, cell, ct, share: r.value, dec, hi: r.value === bigger };
    });
    const label = h('div', { class: 'plab' }, PANEL[a.panel]);
    const reason = h('p', { class: 'prz' }, REASON[key]);
    const el = h('div', { class: 'pbox' }, label,
      h('table', { class: 'agate vst' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Team'), h('th', { scope: 'col', class: 'el' }, 'Elo'), h('th', { scope: 'col' }, 'Chance'))),
        h('tbody', {}, ...sides.map((s) => s.tr))),
      reason);
    return { el, label, sides, reason };
  });

  const subHead = (title) => {
    const el = h('h3', {}, title);
    register(el, paintBlock, { kind: 'block' });
    return el;
  };
  const desc = (text) => {
    const el = h('p', { class: 'foot' }, text);
    register(el, paintBlock, { kind: 'block' });
    return el;
  };
  section.replaceChildren(
    ...chapterHead('Paradoxes', 'Why the strongest team is not always the favourite.',
      'Elo measures strength. Tournament odds also depend on the draw, the bracket and the venue, so two teams of similar strength can have very different chances. Two illustrations: past glory buys nothing, and playing at home is worth about a hundred rating points, enough to lift a host above a better-rated team.'),
    subHead('New contenders, faded giants'),
    desc('Three teams that have never won it, each more likely to lift the trophy than Germany, a four-time champion. Italy has four titles and no chance at all: it did not qualify.'),
    wrap,
    subHead('Elo is not tournament odds'),
    desc('A rating says how good a team is. A tournament also asks who you play, and where. Three pairs where the lower-rated team has the better number.'),
    h('div', { class: 'pairs' }, ...boxes.map((box) => box.el)));

  draw();                                    // the holder has its width once it is on the page
  // The chart is one unit whose 3.5 bands carry the six bars. The three boxes share a top, so
  // the reading line prints them together; stacked on a narrow screen they print as they arrive.
  register(holder, (_el, p) => { chartP = p; paintBars(); }, { band: chartBand(rows.length) });
  for (const box of boxes) register(box.el, (_el, p) => paintPair(box, p));
  window.addEventListener('resize', draw);
  document.fonts.ready.then(draw);
}

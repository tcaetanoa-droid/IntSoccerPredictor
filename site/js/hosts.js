// site/js/hosts.js
import { h, flag, name, fmtCount, chapterHead } from './dom.js';
import { FATES } from './fate-table.js';
import { svgEl } from './svg.js';
import { register, paintBlock, paintCounts, clamp } from './print.js';

// data/tournaments/wc2026.yaml `hosts`, strongest first as the lede tells it. No flag colours
// here: the bars are plain ink like every other mark on the sheet.
const HOSTS = ['MX', 'CA', 'US'];
// The shared axis, in runs: hairlines behind the bars and a scale that clears Canada's tallest.
const TICKS = [0, 10000, 20000, 30000, 40000], YMAX = 45000;
// The chart's geometry in CSS pixels. The chart is drawn at its holder's measured width, never
// scaled by a viewBox, so its 12px labels are 12px at every width the layout allows. TOP is the air
// the count above the tallest bar needs, PLOT the bars' own height, GAP the air under the
// baseline, AXIS the column the tick labels hang in.
const TOP = 18, PLOT = 210, GAP = 8, AXIS = 46;
// The nine values of a region print 0.35 of a band apart and each take a band, so the region's
// nine take 3.8 bands of the spec's 18% of a screen (spec §8, the motion amendment).
const STEP = 0.35, BANDS = 3.8, BAND = 0.18 * BANDS;
// A block's own 40% of a screen would finish a third of a screen past the reading line, with the
// first bars already growing. The head and the chrome are given that third of a screen as a
// negative lead, so their block is complete exactly as the region's top reaches the reading line
// and the first bar starts out of a printed baseline.
const HEAD_LEAD = 0.6 - 0.92;

// The turned fate names read up the page, so the height they cost a chart is the longest name's
// width in the chart's own type. Measured in a hidden SVG because the faces settle after boot.
function labelRun(section) {
  const probe = svgEl('svg', { class: 'hc', width: 600, height: 40, style: 'position:absolute;left:-9999px;visibility:hidden' });
  section.append(probe);
  let run = 0;
  for (const f of FATES) {
    const text = svgEl('text', { class: 'lab', 'font-size': 12 }, f.head);
    probe.append(text);
    run = Math.max(run, text.getComputedTextLength());
  }
  probe.remove();
  return Math.ceil(run) + 12;
}

// One host's chart: the chrome (the axis hairlines and their labels, the baseline, the nine turned
// fate names) in a group of its own, then a bar and a count per fate in fate order. Returns the
// pieces the painter writes: the chrome group, and each bar with its count, the height it prints
// to and the y it reaches. The SVG is aria-hidden, the counting display being SVG text rather than
// dom.js's two spans; the hidden agate table beside the charts is what assistive technology reads.
function chart(byFate, width, labelH) {
  const base = TOP + PLOT, height = base + GAP + labelH, slot = (width - AXIS) / 9;
  const snap = (v) => Math.round(v) + 0.5;       // a hairline on the pixel, not across two
  const Y = (v) => base - v / YMAX * PLOT;
  const svg = svgEl('svg', { class: 'hc', width, height, 'aria-hidden': 'true' });
  const chrome = svgEl('g', { class: 'chrome' });
  for (const t of TICKS) chrome.append(
    svgEl('line', { class: 'grid', x1: AXIS, x2: width, y1: snap(Y(t)), y2: snap(Y(t)) }),
    svgEl('text', { class: 'tick', x: AXIS - 6, y: snap(Y(t)) + 4, 'text-anchor': 'end', 'font-size': 12 }, fmtCount(t)));
  chrome.append(svgEl('line', { class: 'base', x1: AXIS, x2: width, y1: snap(base), y2: snap(base) }));
  const bars = FATES.map((f, i) => {
    const cx = AXIS + i * slot + slot / 2, bw = Math.min(slot * 0.62, 56), n = byFate[f.key];
    const rect = svgEl('rect', { class: 'bar', x: (cx - bw / 2).toFixed(1), y: base, width: bw.toFixed(1), height: 0 });
    // The count is authored where it belongs on the finished chart; the painter rides it up with
    // the bar by translating its group, so the number never leaves the bar's head.
    const val = svgEl('g', { class: 'v' }, svgEl('text', { class: 'val', 'data-count': Math.round(n), x: cx.toFixed(1), y: (Y(n) - 5).toFixed(1), 'text-anchor': 'middle', 'font-size': 12 },
      svgEl('tspan', { class: 'ct' }, '0')));
    // Nine real fate names never fit flat in a column this narrow (the longest measures 82px at
    // 12px caps against a slot of 40px), so they are turned and belong to the chrome.
    chrome.append(svgEl('g', { transform: `translate(${cx.toFixed(1)},${base + 9}) rotate(-90)` },
      svgEl('text', { class: 'lab', x: 0, y: 0, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 12 }, f.head)));
    svg.append(rect, val);
    return { rect, val, full: base - Y(n), top: Y(n) };
  });
  svg.prepend(chrome);                           // the hairlines run behind the bars
  return { svg, chrome, bars };
}

// A value prints: its bar grows out of the baseline in full ink while its count climbs to the run
// count and rides up with it.
function paintValue(bar, p) {
  const grown = bar.full * p, rise = bar.full - grown;
  bar.rect.setAttribute('y', (bar.top + rise).toFixed(1));
  bar.rect.setAttribute('height', grown.toFixed(1));
  bar.val.setAttribute('transform', `translate(0,${rise.toFixed(1)})`);
  bar.val.style.opacity = (0.04 + 0.96 * p).toFixed(3);
  paintCounts(bar.val, p);
}

export function render(section, ctx) {
  const runs = {};
  for (const r of ctx.report.hosts_exit) (runs[r.team] ??= {})[r.fate] = r.pct * ctx.n;
  const regions = HOSTS.map((code) => {
    const head = h('h4', { class: 'hn' }, flag(code, ctx.byCode, 80), name(code, ctx.byCode));
    const holder = h('div', { class: 'holder' });
    return { code, head, holder, el: h('div', { class: 'reg' }, head, holder), chart: null, headP: 0, p: 0, done: [] };
  });
  const wall = h('div', { class: 'regions' }, ...regions.map((r) => r.el));
  const unit = `How often each host's World Cup ended at each stage, in runs out of ${fmtCount(ctx.n)}`;
  // The charts are aria-hidden, so the twenty-seven counts are read from here: the same agate as
  // any other table on the sheet, visually hidden. The .sr box is the wrapper, not the table:
  // overflow is ignored on a table box, and a table sized to its content would widen the page.
  const sr = h('div', { class: 'sr' }, h('table', {}, h('caption', {}, unit),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Host'), ...FATES.map((f) => h('th', { scope: 'col' }, f.head)))),
    h('tbody', {}, ...HOSTS.map((code) => h('tr', {}, h('th', { scope: 'row' }, name(code, ctx.byCode)),
      ...FATES.map((f) => h('td', {}, fmtCount(runs[code][f.key]))))))));
  const sub = h('h3', {}, 'How far the hosts go');
  const foot = h('p', { class: 'foot' }, unit);
  section.replaceChildren(
    ...chapterHead('The hosts', 'Home advantage only goes so far.',
      "The United States, Mexico and Canada were seeded into their own groups and got the home-advantage bonus in their own stadiums (Canada's knockout games were in the United States, so no bonus there). None of them was a contender. Mexico was the strongest of the three, the most likely to reach a quarter-final and the only one with a title chance above 2%. Canada almost always got out of its group and usually went out in the next two rounds. The United States were the outlier: one run in four finished bottom of Group D."),
    sub, sr, wall, foot);
  register(sub, paintBlock, { kind: 'block' });
  register(foot, paintBlock, { kind: 'block' });

  // The chrome and each bar are written only where their value moved (spec §4, the budget), and a
  // redraw clears the record, since fresh nodes carry no print.
  const paintChrome = (r) => { if (r.chart) r.chart.chrome.style.opacity = (0.04 + 0.96 * r.headP).toFixed(3); };
  const paintBars = (r) => {
    if (!r.chart) return;
    r.chart.bars.forEach((bar, i) => {
      const q = clamp(r.p * BANDS - STEP * i);   // value i opens 0.35 of a band after value i - 1
      if (r.done[i] === q) return;
      r.done[i] = q;
      paintValue(bar, q);
    });
  };
  // The charts are drawn at their holders' measured width, so they follow the column and their
  // labels stay at 12px; that means redrawing when the width changes and once the faces have
  // settled, then repainting, as the bracket's connectors do.
  const draw = () => {
    for (const r of regions) r.holder.replaceChildren();
    const labelH = labelRun(section);
    const widths = regions.map((r) => r.holder.clientWidth);
    regions.forEach((r, i) => {
      r.chart = chart(runs[r.code], widths[i], labelH);
      r.done = [];
      r.holder.append(r.chart.svg);
      paintChrome(r);
      paintBars(r);
    });
  };
  draw();
  // A region is two units. Its head and the chart's chrome print as a block when the region
  // enters, before the first bar grows, so a bar never rises out of nothing; the region itself is
  // one row unit whose 3.8 bands carry the nine values. Side by side the three regions share a
  // top and so print in step, fate by fate; stacked they print as each one arrives.
  for (const r of regions) {
    register(r.head, (el, p) => { paintBlock(el, p); r.headP = p; paintChrome(r); }, { kind: 'block', lead: HEAD_LEAD });
    register(r.el, (el, p) => { r.p = p; paintBars(r); }, { band: BAND });
  }
  window.addEventListener('resize', draw);
  document.fonts.ready.then(draw);
}

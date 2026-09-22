// site/js/calibration.js
import { svgEl } from './svg.js';
import { h, fmtPct, scrollX } from './dom.js';
import { register, rowWindow } from './print.js';

// The chart's geometry in CSS pixels. Each panel is drawn at its holder's measured width and never
// scaled by a viewBox, so its 12px labels are 12px at every width the layout allows. The axis runs
// from −1000 to +1000 rating points; a bin is labelled by its left edge and is 100 points wide, so
// its marker sits at bin + 50.
const H = 300, L = 50, R = 16, T = 30, B = 46, XMIN = -1000, XMAX = 1000;
const AXIS = "rating gap, from the team's point of view (home +100 included)";

// One panel: the chrome, then the model line and the observed dots of each series. Returns the
// pieces the painter writes, the lines with the length their dash is measured over.
function panel(p, bins, width) {
  const pw = width - L - R, ph = H - T - B;
  const X = (x) => L + (x - XMIN) / (XMAX - XMIN) * pw, Y = (y) => T + ph - y / p.ymax * ph;
  const snap = (v) => Math.round(v) + 0.5;         // a hairline on the pixel, not across two
  const svg = svgEl('svg', { width, height: H, viewBox: `0 0 ${width} ${H}`, role: 'img',
    'aria-label': `${p.title}: what the model predicts against what was observed, by rating gap` },
    svgEl('text', { class: 'ttl', x: L, y: 13, 'font-size': 12 }, p.title.toUpperCase()));
  for (const t of p.ticks) {
    const y = snap(Y(t.v));
    svg.append(svgEl('line', { class: t.v === 0 ? 'base' : 'grid', x1: L, x2: width - R, y1: y, y2: y }),
      svgEl('text', { class: 'tick', x: L - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 12 }, t.label));
  }
  svg.append(svgEl('line', { class: 'zero', x1: snap(X(0)), x2: snap(X(0)), y1: T, y2: T + ph, 'stroke-dasharray': '3 3' }));
  // The two end labels sit on the panel edges, so centring them clips half of "+1000"; anchor those
  // two inwards and leave the interior ones centred.
  for (let x = XMIN; x <= XMAX; x += 250)
    svg.append(svgEl('text', { class: 'tick', x: X(x).toFixed(1), y: H - B + 17, 'font-size': 12,
      'text-anchor': x === XMIN ? 'start' : x === XMAX ? 'end' : 'middle' },
    (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x)));
  svg.append(svgEl('text', { class: 'axl', x: ((L + width - R) / 2).toFixed(1), y: H - 6, 'text-anchor': 'middle', 'font-size': 12 }, AXIS));
  const lines = [], dots = [], last = bins[bins.length - 1];
  for (const s of p.series) {
    const ln = svgEl('polyline', { class: 'ln', points: bins.map((b) => `${X(b.bin + 50).toFixed(1)},${Y(b[s.pred]).toFixed(1)}`).join(' ') });
    svg.append(ln);
    lines.push({ el: ln, len: 0 });
    bins.forEach((b, i) => {
      const dot = svgEl('circle', { class: 'ob', 'data-i': i, cx: X(b.bin + 50).toFixed(1), cy: Y(b[s.obs]).toFixed(1),
        r: (2.5 + 2.5 * Math.min(b.n, 1500) / 1500).toFixed(2) });
      svg.append(dot);
      dots.push(dot);
    });
    // Two ink lines in one panel, so each says which it is at its right end.
    if (s.label) svg.append(svgEl('text', { class: 'sl', x: (X(last.bin + 50) - 6).toFixed(1), y: (Y(last[s.pred]) + s.at).toFixed(1),
      'text-anchor': 'end', 'font-size': 12 }, s.label));
  }
  return { svg, lines, dots };
}

const legendMark = (line) => (line
  ? svgEl('svg', { width: 22, height: 8, viewBox: '0 0 22 8', 'aria-hidden': 'true' }, svgEl('line', { class: 'ln', x1: 0, y1: 4, x2: 22, y2: 4 }))
  : svgEl('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true' }, svgEl('circle', { class: 'ob', cx: 6, cy: 6, r: 4.2 })));

// The chart's numbers for assistive technology: every bin as a row of a table that is read and
// never seen, the way a printed count's final value is. The panels keep their own labels.
function dataTable(bins) {
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '\u2212' : ''}${Math.abs(x)}`;
  const head = ['Rating gap', 'Matches', 'Predicted goals', 'Observed goals', 'Predicted win rate', 'Observed win rate', 'Predicted draw rate', 'Observed draw rate'];
  return h('table', { class: 'sr' },
    h('caption', {}, 'Calibration by rating gap: what the model predicts against what was observed, in bins of 100 rating points'),
    h('thead', {}, h('tr', {}, ...head.map((s) => h('th', { scope: 'col' }, s)))),
    h('tbody', {}, ...bins.map((b) => h('tr', {},
      h('th', { scope: 'row' }, `${signed(b.bin)} to ${signed(b.bin + 100)}`), h('td', {}, String(b.n)),
      h('td', {}, b.pred_goals.toFixed(2)), h('td', {}, b.obs_goals.toFixed(2)),
      h('td', {}, fmtPct(b.pred_win)), h('td', {}, fmtPct(b.obs_win)),
      h('td', {}, fmtPct(b.pred_draw)), h('td', {}, fmtPct(b.obs_draw))))));
}

export function calibrationChart(bins) {
  const label = h('div', { class: 'klab' }, 'Calibration: predicted against observed, by rating gap');
  // A later tournament may ship no calibration rows at all, and the 30-match floor can drop the
  // zero bin the draw sentence quotes. Neither may throw: this runs before replaceChildren, so
  // an exception here would leave the whole chapter empty.
  if (!bins.length) return { el: h('div', { class: 'calwrap' }, label, h('p', { class: 'foot' }, 'No calibration data is available for this tournament yet.')), draw: () => {} };
  // Round the goals axis up to the next half goal so the widest bin (+900, 6.05 predicted) sits
  // inside the panel; the rate panel is always a full 0-100%.
  const gmax = Math.ceil(Math.max(...bins.map((b) => Math.max(b.obs_goals, b.pred_goals))) * 2) / 2;
  const specs = [
    { title: 'Mean goals scored per team', ymax: gmax,
      ticks: Array.from({ length: Math.floor(gmax) + 1 }, (_, v) => ({ v, label: v.toFixed(1) })),
      series: [{ pred: 'pred_goals', obs: 'obs_goals' }] },
    { title: 'Win rate and draw rate', ymax: 1,
      ticks: [0, 1, 2, 3, 4].map((k) => ({ v: k / 4, label: `${k * 25}%` })),
      series: [{ pred: 'pred_win', obs: 'obs_win', label: 'win rate', at: 24 },
        { pred: 'pred_draw', obs: 'obs_draw', label: 'draw rate', at: -16 }] },
  ];
  const holders = specs.map(() => h('div', { class: 'cp' }));
  const grid = h('div', { class: 'cal2' }, ...holders);
  let panels = [], p = 0;
  // The chart prints as it crosses the reading line (spec §8, the transition-8 amendment): the
  // observed dots land first, bin by bin left to right, then the model lines draw over them by a
  // dash-offset over each line's own length. Both panels share the one progress.
  const paint = (el, q) => {
    p = q;
    const pd = rowWindow(q, 0, 2), pl = rowWindow(q, 1, 2);
    for (const pn of panels) {
      for (const l of pn.lines) {
        l.el.style.strokeDasharray = pl >= 1 ? 'none' : `${l.len.toFixed(1)} ${l.len.toFixed(1)}`;
        l.el.style.strokeDashoffset = pl >= 1 ? '0' : (l.len * (1 - pl)).toFixed(1);
      }
      for (const dot of pn.dots) dot.style.opacity = rowWindow(pd, +dot.dataset.i, bins.length).toFixed(3);
    }
  };
  // Redrawn at the holders' measured width on resize and once the faces have settled, as chapter
  // four's charts are. Fresh nodes carry no print, so the painter runs again after every redraw.
  const draw = () => {
    if (!holders[0].clientWidth) return;           // not in the page yet: render() draws it once it is
    // Every holder is emptied before any is measured: a holder still carrying a panel drawn at the
    // stacked width would hold the grid's other column open and the new panel would measure short.
    for (const holder of holders) holder.replaceChildren();
    const widths = holders.map((holder) => holder.clientWidth);
    panels = specs.map((s, i) => {
      const pn = panel(s, bins, widths[i]);
      holders[i].append(pn.svg);
      for (const l of pn.lines) l.len = l.el.getTotalLength();
      return pn;
    });
    paint(grid, p);
  };
  window.addEventListener('resize', draw);
  document.fonts.ready.then(draw);
  // One unit on the panel grid, with a band of its own height and a floor of a third of a screen,
  // so the chart is finished as its bottom crosses the reading line however tall the panels are.
  register(grid, paint, { band: () => Math.max(grid.getBoundingClientRect().height / window.innerHeight, 0.3) });
  const eq = bins.find((b) => b.bin === 0);        // the near-equal bin the caption quotes
  return {
    el: h('div', { class: 'calwrap' }, label,
      h('div', { class: 'caprow' },
        h('p', { class: 'capt' }, `7,526 matches from January 2010 to 10 June 2026, in bins of 100 rating points; bins with fewer than 30 matches are dropped. The line is what the model predicts for the matches in each bin, the dots are what happened. Between −500 and +500 the two agree within about 0.07 goals and 0.02 in win rate.${eq ? ` The draw line sits just under the dots near zero: the model gives ${fmtPct(eq.pred_draw, 0)}, reality ${fmtPct(eq.obs_draw, 0)}.` : ''}`),
        h('div', { class: 'cleg' },
          h('span', {}, legendMark(true), 'model'),
          h('span', {}, legendMark(false), 'observed, dot size = number of matches in the bin'))),
      scrollX('Calibration charts, scroll sideways on a narrow screen', grid),
      dataTable(bins)),
    draw,
  };
}

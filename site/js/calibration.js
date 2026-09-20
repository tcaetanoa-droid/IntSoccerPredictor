// site/js/calibration.js
import { svgEl } from './svg.js';
import { h, fmtPct } from './dom.js';

// One panel of the calibration chart: the model's prediction as a line, what really happened as
// dots sized by how many matches fell in the bin. A bin is labelled by its left edge and is 100
// points wide, so its marker sits at bin + 50. Colours come in as tokens (see calibrationChart)
// and every other colour is a class in site.css, as in chapters 4 and 6.
function panel(title, bins, series, ymax, ylab, W = 620, H = 300, L = 44, T = 28, B = 40, R = 12) {
  const pw = W - L - R, ph = H - T - B, xmin = -1000, xmax = 1000;
  const X = (x) => L + (x - xmin) / (xmax - xmin) * pw, Y = (y) => T + ph - y / ymax * ph;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', class: 'chart' }, svgEl('text', { class: 'ttl', x: L, y: 14, 'font-size': 12, 'font-weight': 600 }, title));
  for (let i = 0; i <= 4; i++) { const t = i * ymax / 4; svg.append(svgEl('line', { class: 'grid', x1: L, x2: W - R, y1: Y(t), y2: Y(t) }), svgEl('text', { class: 'tick n', x: L - 6, y: Y(t) + 4, 'font-size': 10, 'text-anchor': 'end' }, ylab(t))); }
  // The two end labels sit on the panel edges, so centring them (as the mock-up does) clips half
  // of "+1000" against the viewBox; anchor those two inwards and leave the interior ones centred.
  for (let x = -1000; x <= 1000; x += 250) svg.append(svgEl('text', { class: 'tick n', x: X(x), y: H - B + 16, 'font-size': 10, 'text-anchor': x === -1000 ? 'start' : x === 1000 ? 'end' : 'middle' }, (x > 0 ? '+' : '') + x));
  svg.append(svgEl('line', { class: 'zero', x1: X(0), x2: X(0), y1: T, y2: T + ph, 'stroke-dasharray': '3 3' }),
    svgEl('text', { class: 'lab', x: (L + W - R) / 2, y: H - 4, 'font-size': 10, 'text-anchor': 'middle' }, "rating gap, from the team's point of view (home +100 included)"));
  for (const [pred, obs, col] of series) {
    svg.append(svgEl('polyline', { points: bins.map((b) => `${X(b.bin + 50)},${Y(b[pred])}`).join(' '), style: `fill:none;stroke:${col}`, 'stroke-width': 2 }));
    for (const b of bins) svg.append(svgEl('circle', { cx: X(b.bin + 50), cy: Y(b[obs]), r: 2.5 + 2.5 * Math.min(b.n, 1500) / 1500, style: `fill:var(--card);stroke:${col}`, 'stroke-width': 1.6 }));
  }
  return svg;
}

export function calibrationChart(bins) {
  const head = h('div', { class: 'exh' }, 'Calibration: predicted against observed, by rating gap');
  // A later tournament may ship no calibration rows at all, and the 30-match floor can drop the
  // zero bin the draw sentence quotes. Neither may throw: this runs before replaceChildren, so
  // an exception here would leave the whole chapter empty.
  if (!bins.length) return h('div', { class: 'card calbox' }, head, h('p', { class: 'foot' }, 'No calibration data is available for this tournament yet.'));
  // Round the goals axis up to the next half goal so the widest bin (+900, 6.05 predicted) sits
  // inside the panel; the rate panel is always a full 0-100%.
  const gmax = Math.ceil(Math.max(...bins.map((b) => Math.max(b.obs_goals, b.pred_goals))) * 2) / 2;
  const eq = bins.find((b) => b.bin === 0);  // the near-equal bin the footnote quotes
  return h('div', { class: 'card calbox' }, head,
    h('div', { class: 'cl' }, h('span', {},h('i', { class: 'ln', style: 'background:var(--green)' }), 'model'), h('span', {}, h('i', { class: 'dot', style: 'border-color:var(--green)' }), 'observed, dot size = number of matches in the bin'), h('span', {}, h('i', { class: 'ln', style: 'background:var(--orange)' }), 'draws, model'), h('span', {}, h('i', { class: 'dot', style: 'border-color:var(--orange)' }), 'draws, observed')),
    h('div', { class: 'cal2 scroll-x', tabindex: '0', role: 'group', 'aria-label': 'Calibration charts, scroll sideways on a narrow screen' },
      panel('Mean goals scored per team', bins, [['pred_goals', 'obs_goals', 'var(--green)']], gmax, (t) => t.toFixed(1)),
      panel('Win rate and draw rate', bins, [['pred_win', 'obs_win', 'var(--green)'], ['pred_draw', 'obs_draw', 'var(--orange)']], 1, (t) => `${Math.round(t * 100)}%`)),
    h('p', { class: 'foot' }, `7,526 matches from January 2010 to 10 June 2026, in bins of 100 rating points; bins with fewer than 30 matches are dropped. The line is what the model predicts for the matches in each bin, the dots are what happened. Between −500 and +500 the two agree within about 0.07 goals and 0.02 in win rate.${eq ? ` The draw line sits just under the dots near zero: the model gives ${fmtPct(eq.pred_draw, 0)}, reality ${fmtPct(eq.obs_draw, 0)}.` : ''}`));
}

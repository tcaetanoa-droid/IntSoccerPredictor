// site/js/bracket.js
import { h, flag, name, fmtPct, scrollX } from './dom.js';

// Feed order from data/tournaments/wc2026.yaml knockout.matches: 101 = W97 v W98, 102 = W99 v W100.
const LEFT = { R32: [74, 77, 73, 75, 83, 84, 81, 82], R16: [89, 90, 93, 94], QF: [97, 98], SF: [101] };
const RIGHT = { R32: [76, 78, 79, 80, 86, 88, 85, 87], R16: [91, 92, 95, 96], QF: [99, 100], SF: [102] };
const HEAD = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32'];

export function render(section, ctx) {
  const M = Object.fromEntries(ctx.report.bracket.matches.map((m) => [m.number, m]));
  const team = (code, p, win) => h('div', { class: 'tie' + (win ? ' win' : '') }, flag(code, ctx.byCode), h('span', { class: 'nm' }, name(code, ctx.byCode)), h('span', { class: 'n p' }, fmtPct(p, 0)));
  const box = (n) => { const m = M[n]; return h('div', { class: 'm', 'data-match': n }, h('span', { class: 'mn n' }, n), team(m.home, m.p_home, m.winner === m.home), team(m.away, 1 - m.p_home, m.winner === m.away)); };
  const col = (nums, side) => h('div', { class: `col ${side}` }, ...nums.map((n) => h('div', { class: 'slot' }, box(n))));
  const champ = ctx.report.bracket.champion;
  const final = M[104];
  const pChamp = final.home === champ ? final.p_home : 1 - final.p_home;
  // The round headers are cells of the bracket grid itself, so they centre over the columns
  // whatever width the content gives each one (a second grid could not share the track sizes).
  const grid = h('div', { class: 'bracket' }, ...HEAD.map((t) => h('div', { class: 'bh' }, t)),
    col(LEFT.R32, 'l'), col(LEFT.R16, 'l'), col(LEFT.QF, 'l'), col(LEFT.SF, 'l'),
    h('div', { class: 'col fin' }, h('div', { class: 'slot' },
      h('div', { class: 'champ' }, h('div', { class: 'lbl' }, 'Champion'), flag(champ, ctx.byCode, 80), h('b', {}, name(champ, ctx.byCode)), h('div', { class: 'sub' }, `wins the final in ${fmtPct(pChamp, 0)} of the runs that got here`)),
      box(104), h('div', { class: 'third' }, h('div', { class: 'lbl', style: 'margin-top:22px' }, 'Third place'), box(103)))),
    col(RIGHT.SF, 'r'), col(RIGHT.QF, 'r'), col(RIGHT.R16, 'r'), col(RIGHT.R32, 'r'));
  const es = M[84];
  section.replaceChildren(
    h('div', { class: 'num' }, '03 · The bracket'), h('h2', {}, 'The most likely road to the final.'),
    h('p', { class: 'lede', html: 'Take the most common finishing order in every group, then at each knockout match ask: of all the runs where these two teams met in this exact slot, who won more often? Follow the winners to the final. It is the path of most likely steps, <b>not the most likely single tournament</b>, which is far rarer. The real tournament got the same four semi-finalists and the same final.' }),
    scrollX('The bracket, scrolls sideways', grid),
    h('p', { class: 'foot' }, `Percentages are conditional on the pairing: ${name(es.home, ctx.byCode)} beat ${name(es.away, ctx.byCode)} in ${fmtPct(es.p_home, 0)} of the ${es.n_met.toLocaleString('en-GB')} runs where they met in match 84. Coin flips are printed as coin flips: Germany 49%, Norway 51%. Match numbers are FIFA's.`));
  drawConnectors(grid);
}

// Connector lines: an SVG overlay on the grid, in the grid's own pixel space. Each box's outer
// edge mid-point (right edge on the left half, left edge on the right half) is joined to the
// inner edge mid-point of the box it feeds, with the elbow half-way across the column gap, so
// the two feeders of a box share one vertical stem. Redrawn whenever the window resizes and
// once the web fonts have settled, since the column widths follow the content.
function drawConnectors(grid) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'conn');
  svg.setAttribute('aria-hidden', 'true');
  grid.append(svg);
  const cols = [...grid.querySelectorAll('.col')];
  const boxes = (c) => [...c.querySelectorAll('.m')];
  const final = grid.querySelector('[data-match="104"]');
  const draw = () => {
    svg.replaceChildren();
    const g = grid.getBoundingClientRect();
    const mid = (el, edge) => { const r = el.getBoundingClientRect(); return [(edge === 'r' ? r.right : r.left) - g.left, r.top + r.height / 2 - g.top]; };
    const link = (a, b, side) => {
      const [x1, y1] = mid(a, side === 'l' ? 'r' : 'l'), [x2, y2] = mid(b, side);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x1},${y1} H${(x1 + x2) / 2} V${y2} H${x2}`);
      svg.append(p);
    };
    const pairUp = (from, to, side) => { const b = boxes(to); boxes(from).forEach((box, i) => link(box, b[i >> 1], side)); };
    for (let i = 0; i < 3; i++) { pairUp(cols[i], cols[i + 1], 'l'); pairUp(cols[8 - i], cols[7 - i], 'r'); }
    link(boxes(cols[3])[0], final, 'l');
    link(boxes(cols[5])[0], final, 'r');
  };
  draw();
  window.addEventListener('resize', draw);
  document.fonts.ready.then(draw);
}

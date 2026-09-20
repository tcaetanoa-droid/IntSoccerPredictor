// site/js/paradoxes.js
import { h, flag, name, fmtPct } from './dom.js';
import { svgEl } from './svg.js';

const COLOUR = { PT: '#DA291C', CO: '#FCD116', NL: '#F36C21', DE: '#111111', UY: '#5CBFEB', IT: '#005F35' };
// Italy did not qualify, so it is not in teams.json; the chart still has to name it.
const ABSENT = { IT: 'Italy' };
const REASON = {
  'A:1': 'Argentina tops Group J, which sends it into a round-of-32 tie with the runner-up of Group H: Uruguay, in 48% of runs. France tops Group I and usually meets a third-placed team (Sweden most often, 12%).',
  'B:1': 'The United States play every knockout match at home, and home is worth 100 Elo points in the model. That closes a 104-point gap and then some.',
  'B:2': 'Same mechanism, smaller gap: Mexico plays its knockouts at home and edges past a Uruguay side rated 17 points higher.',
};
const METRIC = { r32_exit_given_reached: 'Higher rating, earlier exit: chance of losing the round-of-32 tie, once there', champion_pct: 'Lower rating, more titles: chance of winning the tournament' };

// Wider and taller than js/svg.js barChart: six teams, full names beneath and a divider down
// the middle. Team colours are the only ones written here; the rest are classes (site.css).
function trophyChart(rows) {
  const W = 1300, H = 300, L = 50, T = 26, B = 58, ph = H - T - B, ymax = 5.5, gw = (W - L - 20) / rows.length, bw = gw * 0.5;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', class: 'chart' });
  for (let y = 0; y <= 5; y++) { const yy = T + ph - y / ymax * ph; svg.append(svgEl('line', { class: 'grid', x1: L, x2: W - 20, y1: yy, y2: yy }), svgEl('text', { class: 'tick n', x: L - 8, y: yy + 4, 'font-size': 11, 'text-anchor': 'end' }, `${y}%`)); }
  rows.forEach((r, i) => {
    const v = r.champion_pct * 100, hgt = v / ymax * ph, x = L + i * gw + (gw - bw) / 2, col = `fill:${COLOUR[r.team] || 'var(--faint)'}`;
    svg.append(r.qualified ? svgEl('rect', { x, y: T + ph - hgt, width: bw, height: hgt, style: col, rx: 3 }) : svgEl('rect', { x, y: T + ph - 3, width: bw, height: 3, style: col, opacity: .5 }),
      svgEl('text', { class: 'val n', x: x + bw / 2, y: T + ph - hgt - 7, 'font-size': 13, 'text-anchor': 'middle', 'font-weight': 600 }, fmtPct(r.champion_pct)),
      svgEl('text', { class: 'tn', x: x + bw / 2, y: H - B + 20, 'font-size': 13, 'text-anchor': 'middle', 'font-weight': 600, 'data-team': r.team }, ''),
      svgEl('text', { class: 'tt' + (r.side === 'first_timer' ? ' first' : ''), x: x + bw / 2, y: H - B + 37, 'font-size': 11, 'text-anchor': 'middle' }, r.side === 'first_timer' ? 'never won it' : `${r.titles}× champion${r.qualified ? '' : ', did not qualify'}`));
  });
  const xd = L + 3 * gw;
  svg.append(svgEl('line', { class: 'dv', x1: xd, x2: xd, y1: T, y2: T + ph + 40, 'stroke-dasharray': '4 4' }),
    svgEl('text', { class: 'dl n', x: xd - 10, y: T + 12, 'font-size': 10, 'text-anchor': 'end', 'letter-spacing': 1 }, 'NEW CONTENDERS'),
    svgEl('text', { class: 'dl n', x: xd + 10, y: T + 12, 'font-size': 10, 'letter-spacing': 1 }, 'FADED GIANTS'));
  return svg;
}

export function render(section, ctx) {
  const chart = trophyChart(ctx.report.trophy_paradox);
  chart.querySelectorAll('text[data-team]').forEach((t) => { t.textContent = ABSENT[t.dataset.team] || name(t.dataset.team, ctx.byCode); });
  const pairs = {};
  for (const r of ctx.report.paradoxes) (pairs[`${r.panel}:${r.pair}`] ??= []).push(r);
  const cards = Object.entries(pairs).map(([key, [a, b]]) => {
    const mx = Math.max(a.value, b.value);
    const side = (r, hi) => h('div', { class: 'vs-side' },
      h('div', { class: 'vh' }, flag(r.team, ctx.byCode), h('b', {}, name(r.team, ctx.byCode)), h('span', { class: 'n' }, `Elo ${Math.round(r.elo)}`)),
      h('div', { class: 'vb' }, h('i', { style: `width:${Math.round(r.value / mx * 100)}%;background:${hi ? 'var(--orange)' : 'var(--f-r16)'}` })),
      h('div', { class: 'n vv' + (hi ? ' hi' : '') }, fmtPct(r.value, r.value < 0.01 ? 2 : 1)));
    return h('div', { class: 'card vs' }, h('div', { class: 'vm' }, METRIC[a.metric]), h('div', { class: 'vs-grid' }, side(a, a.value > b.value), h('div', { class: 'vsx' }, 'vs'), side(b, b.value > a.value)), h('p', { class: 'vn' }, REASON[key]));
  });
  section.replaceChildren(
    h('div', { class: 'num' }, '06 · Paradoxes'), h('h2', {}, 'Why the strongest team is not always the favourite.'),
    h('p', { class: 'lede' }, 'Elo measures strength. Tournament odds also depend on the draw, the bracket and the venue, so two teams of similar strength can have very different chances. Two illustrations: past glory buys nothing, and playing at home is worth about a hundred rating points, enough to lift a host above a better-rated team.'),
    h('div', { class: 'sh' }, 'New contenders, faded giants'), h('p', { class: 'cst' }, 'Three teams that have never won it, each more likely to lift the trophy than Germany, a four-time champion. Italy has four titles and no chance at all: it did not qualify.'),
    // Six full team names need room: below a floor the chart scrolls, as in chapters 1 and 3.
    h('div', { class: 'scroll-x' }, chart),
    h('div', { class: 'sh' }, 'Elo is not tournament odds'), h('p', { class: 'cst' }, 'A rating says how good a team is. A tournament also asks who you play, and where. Three pairs where the lower-rated team has the better number.'),
    h('div', { class: 'row3' }, ...cards));
}

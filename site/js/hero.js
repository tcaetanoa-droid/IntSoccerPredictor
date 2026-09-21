// site/js/hero.js
import { h, name, fmtCount, count } from './dom.js';
import { pin, paintDensityRow } from './print.js';

// The first viewport: chart masthead, headline and lede left, the champion column right, a 3px
// rule at the bottom edge. The column is blank until the visitor scrolls; js/print.js fills it.
export function render(section, ctx) {
  const rows = ctx.report.fate_table;
  const top = rows.slice(0, 12);
  const rest = rows.slice(12).reduce((s, r) => s + r.champion, 0);   // a display aggregate, as the old "other 40" was
  const max = top[0].champion;
  const runs = fmtCount(ctx.n);
  const row = (label, n, share, cls) => h('div', { class: cls ? `hr ${cls}` : 'hr', 'data-share': share.toFixed(4) },
    h('span', { class: 'nm' }, ...label), h('span', { class: 'ct-cell', 'data-count': n }, count(n)));
  const list = [
    ...top.map((r, i) => row([name(r.team, ctx.byCode)], r.champion, r.champion / max, i === 0 ? 'hot' : '')),
    row([`The other ${rows.length - 12} teams, between them`], rest, 1, 'rest'),
  ];
  const held = h('div', { class: 'held' },
    h('div', { class: 'mast' },
      h('div', { class: 'mt' }, 'World Cup 2026 · Wall chart'),
      h('div', { class: 'mi' }, `Filled in ${runs} times. Darker ink means it happened more often.`)),
    h('div', { class: 'hero-grid' },
      h('div', {},
        h('h1', {}, `I simulated the 2026 World Cup ${runs} times. `,
          h('span', { class: 'hot' }, `${name(rows[0].team, ctx.byCode)} won ${fmtCount(rows[0].champion)} of them.`)),
        h('p', { class: 'lede' }, `No betting odds, no pundits, no FIFA ranking. Just the eloratings.net ratings from 10 June 2026, a Poisson model for goals fitted on 7,526 real matches, and ${runs} seeded replays of the full tournament. Every number on this page is counted from those runs.`)),
      h('div', { class: 'col' },
        h('div', { class: 'cl' }, h('span', {}, 'Champion'), h('span', {}, 'Runs won')),
        ...list)),
    h('div', { class: 'limit' }));
  const block = h('div', { class: 'pin' }, held);
  section.replaceChildren(block);
  pin(block, held, list, paintDensityRow);
}

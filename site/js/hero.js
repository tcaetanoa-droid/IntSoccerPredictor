// site/js/hero.js
import { h, flag, name, fmtCount } from './dom.js';

// One flag colour per team, for the champion bars (locked mock-up: solid bars).
const COLOUR = { ES: '#C60B1E', AR: '#74ACDF', FR: '#0055A4', EN: '#CF081F', PT: '#DA291C', BR: '#009C3B', CO: '#FCD116', NL: '#F36C21', EC: '#FFDD00', DE: '#111111' };

export function render(section, ctx) {
  const rows = ctx.report.fate_table;
  const top = rows.slice(0, 8);
  const rest = rows.slice(8).reduce((s, r) => s + r.champion, 0);
  const max = top[0].champion;
  const runs = fmtCount(ctx.n);
  const bars = top.map((r) => h('div', { class: 'bar' },
    h('div', {}, flag(r.team, ctx.byCode), name(r.team, ctx.byCode)),
    h('div', { class: 'track' }, h('div', { class: 'fill', style: `width:${(r.champion / max * 100).toFixed(1)}%;background:${COLOUR[r.team] || '#3F8F57'}` })),
    h('div', { class: 'v n' }, fmtCount(r.champion))));
  section.replaceChildren(
    h('div', { class: 'hero-split' },
      h('div', {},
        h('div', { class: 'kicker' }, `FIFA World Cup 2026 · ${runs} replays · Elo + Poisson + Monte Carlo`),
        h('h1', { html: `I simulated the 2026 World Cup ${runs} times. <em>${name(rows[0].team, ctx.byCode)} won ${fmtCount(rows[0].champion)} of them.</em>` }),
        h('p', { class: 'lede', html: `No betting odds, no pundits, no FIFA ranking. Just the <b>eloratings.net</b> ratings from 10 June 2026, a Poisson model for goals fitted on 7,500 real matches, and ${runs} seeded replays of the full tournament. Every number on this page is counted from those runs.` }),
        h('div', { class: 'strip' },
          h('div', {}, h('b', { class: 'n' }, runs), h('span', {}, 'simulated tournaments')),
          h('div', {}, h('b', { class: 'n' }, '104'), h('span', {}, 'matches per run')),
          h('div', {}, h('b', { class: 'n' }, '1'), h('span', {}, 'real result to answer to')))),
      h('div', { class: 'bars' },
        h('div', { class: 't' }, `Champions, in ${runs} runs`),
        h('div', { class: 'st' }, 'Number of runs each team lifted the trophy'),
        ...bars,
        h('div', { class: 'others', html: `The other ${rows.length - 8} teams won the remaining <span class="n">${fmtCount(rest)}</span> runs between them. Nobody outside this list clears ${fmtCount(rows[8].champion)}.` }))),
    h('nav', { class: 'chapters', 'aria-label': 'Jump to a chapter' }, ...[...document.querySelectorAll('.rail a')]
      .map((a) => h('a', { href: a.getAttribute('href') }, h('i', {}, a.querySelector('i').textContent), a.lastChild.textContent))));
}

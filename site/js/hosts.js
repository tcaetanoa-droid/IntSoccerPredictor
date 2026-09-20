// site/js/hosts.js
import { h, flag, name, fmtCount, countOf } from './dom.js';
import { FATES } from './fate-table.js';
import { barChart } from './svg.js';

// data/tournaments/wc2026.yaml `hosts`, each with its own flag colour for its nine bars.
const HOSTS = [['MX', '#006847'], ['CA', '#D52B1E'], ['US', '#3C3B6E']];

export function render(section, ctx) {
  const by = {};
  for (const r of ctx.report.hosts_exit) (by[r.team] ??= {})[r.fate] = r.pct;
  // The bars are plotted in percent and labelled in runs, so the ticks are the same positions
  // counted the other way: 10% of the runs is 10,000 of them.
  const ticks = [0, 10, 20, 30, 40].map((y) => ({ y, label: countOf(y / 100, ctx.n) }));
  const charts = HOSTS.map(([code, colour]) => h('div', { class: 'sm' },
    h('div', { class: 'hn' }, flag(code, ctx.byCode), h('b', {}, name(code, ctx.byCode))),
    barChart({ values: FATES.map((f) => ({ label: f.label, value: by[code][f.key] * 100, text: countOf(by[code][f.key], ctx.n), colour })), ymax: 45, ticks })));
  section.replaceChildren(
    h('div', { class: 'num' }, '04 · The hosts'), h('h2', {}, 'Home advantage only goes so far.'),
    h('p', { class: 'lede', html: 'The United States, Mexico and Canada were seeded into their own groups and got the home-advantage bonus in their own stadiums (Canada\'s knockout games were in the United States, so no bonus there). None of them was a contender. <b>Mexico was the strongest of the three</b>, the most likely to reach a quarter-final and the only one with a title chance above 2%. Canada almost always got out of its group and usually went out in the next two rounds. The United States were the outlier: one run in four finished bottom of Group D.' }),
    h('div', { class: 'sh' }, 'How far the hosts go'),
    h('div', { class: 'cst' }, `How often each host's World Cup ended at each stage, in runs out of ${fmtCount(ctx.n)}`),
    h('div', { class: 'sm3' }, ...charts));
}

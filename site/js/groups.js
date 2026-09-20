// site/js/groups.js
import { h, flag, name, fmtCount, countOf } from './dom.js';

const HOSTS = ['US', 'MX', 'CA'];  // data/tournaments/wc2026.yaml `hosts`

export function render(section, ctx) {
  const all = ctx.report.group_advance;
  const byGroup = {};
  for (const r of all) (byGroup[r.group] ??= []).push(r);
  const cards = Object.keys(byGroup).sort().map((g) => {
    const rows = byGroup[g].sort((a, b) => b.adv_pct - a.adv_pct);
    const shaded = rows[0].third_shaded;  // a property of the group, carried on every row
    return h('div', { class: 'card gcard' },
      h('div', { class: 'gh' }, h('span', {}, `Group ${g}`), h('span', { class: 'th' }, shaded ? 'third usually goes through' : 'third usually out')),
      ...rows.map((r, i) => h('div', { class: 'row ' + (i < 2 ? 'adv' : i === 2 && shaded ? 'third' : 'out') },
        h('span', { class: 'pos n' }, r.modal_pos),
        h('span', { class: 'tm' }, flag(r.team, ctx.byCode), name(r.team, ctx.byCode), HOSTS.includes(r.team) ? h('em', {}, 'host') : null),
        h('span', { class: 'bar' }, h('i', { style: `width:${(r.adv_pct * 100).toFixed(1)}%` })),
        h('span', { class: 'n v' }, `${Math.round(r.adv_pct * 100)}%`))));
  });
  const best = all.reduce((a, b) => (b.adv_pct > a.adv_pct ? b : a));
  const worst = all.reduce((a, b) => (b.adv_pct < a.adv_pct ? b : a));
  const got = (r) => `${name(r.team, ctx.byCode)} got out of Group ${r.group} in ${countOf(r.adv_pct, ctx.n)}`;
  const runs = fmtCount(ctx.n);
  section.replaceChildren(
    h('div', { class: 'num' }, '02 · Group stage'), h('h2', {}, 'Who gets out of the group.'),
    h('p', { class: 'lede', html: `Twelve groups of four. The top two go through, and the eight best third-placed teams join them. Each bar is how often a team reached the round of 32 in ${runs} runs. Green rows are the two automatic places; the paler third row marks the eight groups whose third-placed team usually makes it. <b>${got(best)} runs; ${got(worst)}.</b>` }),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { style: 'background:var(--adv)' }), 'top two, through'),
      h('span', {}, h('i', { style: 'background:var(--third)' }), 'third place, usually through'),
      h('span', {}, h('i', { style: 'background:var(--card)' }), 'usually out'),
      h('span', { class: 'n', style: 'font-size:11px' }, '1–4 = most common finishing position')),
    h('div', { class: 'ggrid' }, ...cards),
    h('p', { class: 'foot' }, 'The small number at the left is the position a team finishes most often, which is not always the order of the bars: in Group D the USA get out more often than Australia yet finish fourth more often than third.'));
}

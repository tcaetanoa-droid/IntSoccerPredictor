// site/js/underdogs.js
import { h, flag, name, fmtCount, countOf } from './dom.js';

const kv = (label, value) => h('div', { class: 'kv' }, h('span', {}, label), h('span', { class: 'n' }, value));

export function render(section, ctx) {
  const weak = ctx.report.weakest_teams.map((r) => h('div', { class: 'card wc' },
    h('div', { class: 'wh' }, flag(r.team, ctx.byCode), h('b', {}, name(r.team, ctx.byCode)), h('span', { class: 'n' }, `Elo ${Math.round(r.elo)}`)),
    // The three fate colours of chapter 1, as tokens: 4th in group, 3rd and out, got out.
    h('div', { class: 'sb' }, h('i', { style: `width:${(r.gs4_pct * 100).toFixed(1)}%;background:var(--f-gs4)` }), h('i', { style: `width:${(r.gs3_out_pct * 100).toFixed(1)}%;background:var(--f-gs3)` }), h('i', { style: `width:${(r.escape_pct * 100).toFixed(1)}%;background:var(--f-4th)` })),
    h('div', { class: 'big n' }, countOf(r.escape_pct, ctx.n)), h('div', { class: 'bl' }, 'got out of the group'),
    kv('4th in group', countOf(r.gs4_pct, ctx.n)), kv('3rd, out', countOf(r.gs3_out_pct, ctx.n)), kv('Champion', countOf(r.champion_pct, ctx.n))));
  const first = ctx.report.first_time_champions.map((r) => h('div', { class: 'card fc' },
    h('div', { class: 'wh' }, flag(r.team, ctx.byCode), h('b', {}, name(r.team, ctx.byCode)), h('span', { class: 'n' }, `Elo ${Math.round(r.elo)}`), h('em', {}, 'no World Cup title')),
    h('div', { class: 'big n gold' }, countOf(r.champion_pct, ctx.n)), h('div', { class: 'bl' }, 'won the tournament'),
    kv('Got out of the group', countOf(r.escape_pct, ctx.n)), kv('Reached a quarter-final', countOf(r.reach_qf_pct, ctx.n)), kv('Reached the final', countOf(r.reach_final_pct, ctx.n))));
  const worst = ctx.report.weakest_teams[0];
  section.replaceChildren(
    h('div', { class: 'num' }, '05 · Underdogs'), h('h2', {}, 'From no chance to first chance.'),
    h('p', { class: 'lede', html: `Two kinds of underdog. At one end, the teams that almost never left their group: ${name(worst.team, ctx.byCode)} got out in ${countOf(worst.escape_pct, ctx.n)} runs of ${fmtCount(ctx.n)} and lifted the trophy in exactly one. At the other, the strongest teams that have never won a World Cup. Portugal and Colombia each won it in roughly one run in twenty, level with Brazil; the Netherlands in one run in thirty.` }),
    h('div', { class: 'sh' }, 'Trapped in the group stage'), h('div', { class: 'row5' }, ...weak),
    h('p', { class: 'foot' }, `For all five, the most common outcome is fourth in the group: ${(worst.gs4_pct * 100).toFixed(1)}% of runs for ${name(worst.team, ctx.byCode)}.`),
    h('div', { class: 'sh' }, 'Most likely first-time champions'), h('div', { class: 'row3' }, ...first),
    h('p', { class: 'foot' }, 'Among the 40 teams that have never won the World Cup. Portugal, Colombia and the Netherlands are all top-eight teams by rating; none has ever gone all the way.'));
}

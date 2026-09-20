// site/js/team.js
import { h, flag, name, fmtCount, fmtPct, countOf } from './dom.js';
import { FATES } from './fate-table.js';

const ROUNDS = [['R32', 'Round of 32'], ['R16', 'Round of 16'], ['QF', 'Quarter-final'], ['SF', 'Semi-final'], ['F', 'Final']];

export async function render(section, ctx) {
  const runs = fmtCount(ctx.n);
  const cnt = (share) => countOf(share, ctx.n);
  const fromHash = (location.hash.match(/team=([A-Z]{2})/) || [])[1];
  let code = ctx.byCode[fromHash] ? fromHash : ctx.teams[0].code;
  const select = h('select', { class: 'picker', 'aria-label': 'Team', onchange: (e) => { code = e.target.value; history.replaceState(null, '', `#team=${code}`); show(); } },
    ...ctx.teams.map((t) => h('option', { value: t.code, selected: t.code === code ? '' : null }, `${t.name} · ${cnt(t.champion_pct)}`)));
  const body = h('div', { class: 'tbody' });
  section.replaceChildren(
    h('div', { class: 'num' }, '07 · Pick a team'), h('h2', {}, 'One team, one hundred thousand tournaments.'),
    h('p', { class: 'lede' }, `Every team has its own version of this page: how its ${runs} runs ended, how far it usually got, who it usually met along the way, and who ended its tournament. ${ctx.teams[0].name} is up first, as the favourite. Pick any of the ${ctx.teams.length}.`),
    h('div', { class: 'pk' }, h('label', {}, 'Team'), select, h('span', { class: 'pkn' }, `${ctx.teams.length} teams, sorted by title chance`)), body);
  async function show() {
    const t = await ctx.team(code);
    const top = ctx.teams[0].code === code;
    const nm = t.name;
    const segs = FATES.map((f) => h('i', { style: `width:${(t.fates[f.key] * 100).toFixed(2)}%;background:${f.colour}`, title: `${f.long}: ${cnt(t.fates[f.key])}` }, t.fates[f.key] >= 0.06 ? h('span', {}, cnt(t.fates[f.key])) : null));
    const legend = h('div', { class: 'legend fl' }, ...FATES.map((f) => h('span', {}, h('i', { style: `background:${f.colour}` }), `${f.long} `, h('b', { class: 'n' }, cnt(t.fates[f.key])))));
    // The two step colours are spec tokens: the reached-that-round green and the trophy gold.
    const steps = [...ROUNDS.map(([k, lab]) => [lab, t.reach[k], 'var(--f-4th)']), ['Champion', t.champion_pct, 'var(--gold)']]
      .map(([lab, v, col]) => h('div', { class: 'st' }, h('span', {}, lab), h('i', {}, h('b', { style: `width:${(v * 100).toFixed(1)}%;background:${col}` })), h('span', { class: 'n' }, cnt(v))));
    const opps = ROUNDS.map(([k, lab]) => h('div', { class: 'op' }, h('span', { class: 'ol' }, lab), ...(t.opponents_by_round[k] || []).map((o) => h('span', { class: 'oc' }, flag(o.team, ctx.byCode, 20), name(o.team, ctx.byCode), h('b', { class: 'n' }, fmtPct(o.pct, 0))))));
    const kmax = t.knocked_out_by.length ? t.knocked_out_by[0].pct : 1;
    const ko = t.knocked_out_by.map((o) => h('div', { class: 'ko' }, h('span', { class: 'oc' }, flag(o.team, ctx.byCode, 20), name(o.team, ctx.byCode)), h('i', {}, h('b', { style: `width:${Math.round(o.pct / kmax * 100)}%` })), h('span', { class: 'n' }, fmtPct(o.pct, 0))));
    body.replaceChildren(
      h('div', { class: 'th' }, flag(code, ctx.byCode, 80), h('div', {}, h('div', { class: 'tn' }, nm), h('div', { class: 'tm n' }, `Group ${t.group} · Elo ${Math.round(t.elo)}${top ? ', highest in the field' : ''}`)), h('div', { class: 'tc' }, h('b', { class: 'n' }, cnt(t.champion_pct)), h('span', {}, 'won the tournament'))),
      h('div', { class: 'cards4' },
        h('div', { class: 'card cd wide' }, h('div', { class: 'sh' }, `How ${nm}'s ${runs} runs ended`), h('div', { class: 'fs' }, ...segs), legend),
        h('div', { class: 'card cd' }, h('div', { class: 'sh' }, `How far ${nm} gets`), h('div', { class: 'steps' }, ...steps)),
        h('div', { class: 'card cd' }, h('div', { class: 'sh' }, 'Most common opponent, round by round'), h('div', { class: 'cst' }, `Share of the runs in which ${nm} reached that round`), ...opps),
        h('div', { class: 'card cd' }, h('div', { class: 'sh' }, `Who knocked ${nm} out`), h('div', { class: 'cst' }, `Share of the runs in which ${nm} was eliminated`), ...ko),
        h('div', { class: 'card cd' }, h('div', { class: 'sh' }, 'The one thing to know'), h('p', { class: 'ex' }, t.excerpt_text))));
  }
  await show();
}

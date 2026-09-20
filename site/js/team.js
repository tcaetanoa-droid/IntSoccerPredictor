// site/js/team.js
import { h, flag, name, fmtCount, fmtPct, countOf } from './dom.js';
import { FATES } from './fate-table.js';

const ROUNDS = [['R32', 'Round of 32'], ['R16', 'Round of 16'], ['QF', 'Quarter-final'], ['SF', 'Semi-final'], ['F', 'Final']];
// 3rd place (#B87333) and 4th place (#3F8F57) are too dark for a 12px count and no text colour
// clears 4.5:1 on them, so those two segments carry their count in the tooltip and legend only.
const NO_COUNT = new Set(['third', 'fourth']);
// "curacao" has to find "Curaçao", so both sides of the match lose their accents.
const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export async function render(section, ctx) {
  const runs = fmtCount(ctx.n);
  const cnt = (share) => countOf(share, ctx.n);
  const fromHash = (location.hash.match(/team=([A-Z]{2})/) || [])[1];
  let code = ctx.byCode[fromHash] ? fromHash : ctx.teams[0].code;
  let matches = [], hi = -1;

  const input = h('input', { class: 'si', id: 'team-search', type: 'text', autocomplete: 'off', role: 'combobox',
    'aria-controls': 'team-results', 'aria-expanded': 'false', 'aria-autocomplete': 'list',
    onfocus: (e) => e.target.select(),
    oninput: () => openList(input.value),
    onblur: () => setTimeout(() => closeList(true), 120),  // after a row's click has landed
    onkeydown: onKey });
  const fsl = h('span', { class: 'sfl' });  // the chosen team's flag, redrawn by show()
  const clear = h('button', { class: 'x', type: 'button', 'aria-label': 'Clear the team name',
    onclick: () => { input.value = ''; closeList(false); input.focus(); } }, '×');
  const results = h('div', { class: 'res', id: 'team-results', role: 'listbox', 'aria-label': 'Teams', hidden: '' });
  const chips = h('div', { class: 'chips' });
  const body = h('div', { class: 'tbody' });
  section.replaceChildren(
    h('div', { class: 'num' }, '07 · Pick a team'), h('h2', {}, 'One team, one hundred thousand tournaments.'),
    h('p', { class: 'lede' }, `Every team has its own version of this page: how its ${runs} runs ended, how far it usually got, who it usually met along the way, and who ended its tournament. ${ctx.teams[0].name} is up first, as the favourite. Pick any of the ${ctx.teams.length}.`),
    h('div', { class: 'pk' }, h('label', { for: 'team-search' }, 'Team'),
      h('div', { class: 'sw' }, h('div', { class: 'srch' }, fsl, input, clear), results), chips), body);

  function drawList() {
    results.replaceChildren(...(matches.length
      ? matches.map((t, i) => h('div', { class: 'r' + (i === hi ? ' on' : ''), id: `tr-${t.code}`, role: 'option',
        'aria-selected': i === hi ? 'true' : 'false',
        onmousedown: (e) => e.preventDefault(),  // keep the focus so the blur restore does not fire first
        onclick: () => pick(t.code) },
        flag(t.code, ctx.byCode, 20), t.name, h('b', { class: 'n' }, cnt(t.champion_pct))))
      : [h('div', { class: 'r none' }, 'No team matches')]));
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (hi >= 0) input.setAttribute('aria-activedescendant', `tr-${matches[hi].code}`);
    else input.removeAttribute('aria-activedescendant');
  }
  function openList(q) {
    const s = norm(q.trim());
    matches = (s ? ctx.teams.filter((t) => norm(t.name).includes(s)) : ctx.teams).slice(0, 8);
    hi = matches.length ? 0 : -1;
    drawList();
  }
  function closeList(restore) {
    results.hidden = true;
    results.replaceChildren();
    matches = []; hi = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (restore) input.value = ctx.byCode[code].name;
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (results.hidden) openList(''); else if (hi < matches.length - 1) { hi++; drawList(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!results.hidden && hi > 0) { hi--; drawList(); } }
    else if (e.key === 'Enter') { e.preventDefault(); const t = matches[hi < 0 ? 0 : hi]; if (t) pick(t.code); }
    else if (e.key === 'Escape') { e.preventDefault(); closeList(true); }
  }
  function pick(c) {
    code = c;
    history.replaceState(null, '', `#team=${code}`);
    closeList(false);
    show();
  }

  async function show() {
    const t = await ctx.team(code);
    const top = ctx.teams[0].code === code;
    const nm = t.name;
    fsl.replaceChildren(flag(code, ctx.byCode, 40));
    input.value = nm;
    // The five favourites are the strongest teams that are not the one already on the page.
    chips.replaceChildren(...ctx.teams.slice(0, 6).filter((z) => z.code !== code).slice(0, 5)
      .map((z) => h('button', { class: 'chip', type: 'button', onclick: () => pick(z.code) }, flag(z.code, ctx.byCode, 20), z.name)),
      h('span', { class: 'pkn' }, 'favourites'));
    const segs = FATES.map((f) => h('i', { style: `width:${(t.fates[f.key] * 100).toFixed(2)}%;background:${f.colour}`, title: `${f.long}: ${cnt(t.fates[f.key])}` },
      t.fates[f.key] >= 0.06 && !NO_COUNT.has(f.key) ? h('span', {}, cnt(t.fates[f.key])) : null));
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

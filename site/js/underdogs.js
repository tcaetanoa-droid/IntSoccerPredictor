// site/js/underdogs.js
import { h, flag, name, fmtCount, fmtPct, countOf, count, scrollX, chapterHead } from './dom.js';
import { register, paintBlock, paintCounts, rowWindow, clamp, tintStrength } from './print.js';

// The count columns of the two tables: the head over the column, the share in report.json it
// counts and the fate colour that tints it (chapter one's tokens, in fate order with the trophy
// last). Every value is a share of the runs, so a cell's tint is that share's own strength.
const WEAKEST = [
  { head: '4th in group', key: 'gs4_pct', token: '--f-gs4' },
  { head: '3rd, out', key: 'gs3_out_pct', token: '--f-gs3' },
  { head: 'Got out of the group', key: 'escape_pct', token: '--f-r32' },
  { head: 'Champion', key: 'champion_pct', token: '--f-w' },
];
const FIRST_TIME = [
  { head: 'Got out of the group', key: 'escape_pct', token: '--f-r32' },
  { head: 'Reached a quarter-final', key: 'reach_qf_pct', token: '--f-qf' },
  { head: 'Reached the final', key: 'reach_final_pct', token: '--f-ru' },
  { head: 'Won the tournament', key: 'champion_pct', token: '--f-w' },
];

// A row prints in two phases (spec §8, the motion amendment): the counts climb with the row's
// ink on plain paper over the first two thirds of its window, then the tints bloom behind the
// finished numbers over the last third. The Elo cell carries no count, so it prints with the ink
// and never climbs: a rating is not a count of runs.
function paintUnderdogRow(tr, p) {
  const ink = clamp(p * 1.5);               // p / (2/3): the ink and the counts
  const bloom = clamp(p * 3 - 2);           // (p - 2/3) / (1/3): the tints, behind them
  tr.querySelector('th').style.opacity = (0.04 + 0.96 * ink).toFixed(3);
  for (const td of tr.querySelectorAll('td')) td.style.opacity = (0.04 + 0.96 * ink).toFixed(3);
  // paintCounts sets each count and its tint from one progress; the tints are then rewritten to
  // their own, later phase, so a number is finished before its colour arrives.
  paintCounts(tr, ink);
  for (const td of tr.querySelectorAll('[data-share]'))
    td.style.setProperty('--t', (bloom * tintStrength(+td.dataset.share)).toFixed(4));
}

// A sub-head and its table are one printed unit: the rows print top to bottom, half a band
// apart and each over a band, so the table is finished before the reader reaches its rows.
// rowWindow is exactly that sequence, and it spans (n + 1) / 2 bands of the spec's 18% of a
// screen: three bands for five rows, two for three.
const tableBand = (n) => (0.18 * (n + 1)) / 2;
function tablePainter(rows) {
  const printed = [];                       // only a row whose progress moved is painted (spec §4, the budget)
  return (_el, p) => rows.forEach((tr, i) => {
    const q = rowWindow(p, i, rows.length);
    if (printed[i] === q) return;
    printed[i] = q;
    paintUnderdogRow(tr, q);
  });
}

export function render(section, ctx) {
  const runs = fmtCount(ctx.n);
  const worst = ctx.report.weakest_teams[0];
  // One agate table: the team with its group in muted type after the name, the Elo, then a
  // tinted count per column. The ruled frame and the column heads are not units; they are the
  // frame the rows print into.
  const table = (label, rows, cols) => {
    const body = rows.map((r) => h('tr', {},
      h('th', { scope: 'row' }, flag(r.team, ctx.byCode), name(r.team, ctx.byCode), h('i', {}, `Group ${ctx.byCode[r.team].group}`)),
      h('td', { class: 'el' }, Math.round(r.elo)),
      ...cols.map((c) => h('td', { 'data-count': Math.round(r[c.key] * ctx.n), 'data-share': r[c.key].toFixed(5), style: `--fate: var(${c.token})` },
        count(r[c.key] * ctx.n)))));
    const head = h('tr', {}, h('th', { scope: 'col' }, 'Team'), h('th', { scope: 'col', class: 'el' }, 'Elo'),
      ...cols.map((c) => h('th', { scope: 'col' }, c.head)));
    return { body, el: scrollX(label, h('table', { class: 'agate' }, h('thead', {}, head), h('tbody', {}, ...body))) };
  };
  // The unit's top is the sub-head's, so the table prints from the moment the sub-head crosses
  // the reading line, when the sub-head's own block is about a fifth printed.
  const part = (title, label, rows, cols) => {
    const sub = h('h3', {}, title);
    const t = table(label, rows, cols);
    const wrap = h('div', { class: 'part' }, sub, t.el);
    register(sub, paintBlock, { kind: 'block' });
    register(wrap, tablePainter(t.body), { band: tableBand(t.body.length) });
    return wrap;
  };
  const foot = (text) => {
    const p = h('p', { class: 'foot' }, text);
    register(p, paintBlock, { kind: 'block' });
    return p;
  };
  section.replaceChildren(
    ...chapterHead('Underdogs', 'From no chance to first chance.',
      `Two kinds of underdog. At one end, the teams that almost never left their group: ${name(worst.team, ctx.byCode)} got out in ${countOf(worst.escape_pct, ctx.n)} runs of ${runs} and lifted the trophy in exactly one. At the other, the strongest teams that have never won a World Cup. Portugal and Colombia each won it in roughly one run in twenty, level with Brazil; the Netherlands in one run in thirty.`),
    part('Trapped in the group stage', 'The five weakest teams, scrolls sideways', ctx.report.weakest_teams, WEAKEST),
    foot(`Counts of runs, out of ${runs}. For all five, the most common outcome is fourth in the group: ${fmtPct(worst.gs4_pct)} of runs for ${name(worst.team, ctx.byCode)}.`),
    part('Most likely first-time champions', 'The three most likely first-time champions, scrolls sideways', ctx.report.first_time_champions, FIRST_TIME),
    foot('Among the 41 teams that have never won the World Cup. Portugal, Colombia and the Netherlands are all top-eight teams by rating; none has ever gone all the way.'));
}

// site/js/fate-table.js
import { h, flag, name, fmtCount, scrollX } from './dom.js';

// The nine ways a run can end, in tournament order. Chapters 4 and 7 reuse FATES and tint().
export const FATES = [
  { key: 'gs4', label: 'GS4', long: '4th in group', colour: '#DDE3DC' }, { key: 'gs3_out', label: 'GS3', long: '3rd, out', colour: '#C9D3C7' },
  { key: 'r32', label: 'R32', long: 'Round of 32', colour: '#C2DFC6' }, { key: 'r16', label: 'R16', long: 'Round of 16', colour: '#98C8A2' },
  { key: 'qf', label: 'QF', long: 'Quarter-final', colour: '#6BAE7C' }, { key: 'fourth', label: '4th', long: '4th place', colour: '#3F8F57' },
  { key: 'third', label: '3rd', long: '3rd place', colour: '#B87333' }, { key: 'runner_up', label: 'RU', long: 'Runner-up', colour: '#A8A9AD' },
  { key: 'champion', label: 'W', long: 'Champion', colour: '#C9A227' },
];
const PAPER = [0xF2, 0xF6, 0xF1];
export function tint(hex, t) {  // blend paper -> colour by t in [0,1]
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return '#' + c.map((v, i) => Math.round(PAPER[i] + (v - PAPER[i]) * t).toString(16).padStart(2, '0')).join('');
}

export function render(section, ctx) {
  const rows = [...ctx.report.fate_table];
  const max = Object.fromEntries(FATES.map((f) => [f.key, Math.max(...rows.map((r) => r[f.key]))]));
  const table = h('table', { class: 'fate' });
  let sortKey = 'champion', desc = true;
  const draw = () => {
    rows.sort((a, b) => (desc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]) || b.champion - a.champion);
    const head = h('tr', {}, h('th', { class: 'tm', scope: 'col' }, 'Team'), h('th', { scope: 'col' }, 'Group'), th('elo', 'Elo'),
      ...FATES.map((f) => th(f.key, f.label, f.colour)), th('advanced', 'Advanced', null, 'sub'), th('group_third', '3rd in group', null, 'sub'));
    const body = rows.map((r) => h('tr', {}, h('td', { class: 'tm' }, flag(r.team, ctx.byCode), name(r.team, ctx.byCode)),
      h('td', { class: 'g' }, r.group), h('td', { class: 'n g' }, Math.round(r.elo)),
      ...FATES.map((f) => { const t = r[f.key] ? Math.pow(r[f.key] / max[f.key], 0.55) * 0.85 : 0;
        return h('td', { class: 'n' + (f.key === 'champion' ? ' w' : ''), style: `background:${tint(f.colour, t)}` }, fmtCount(r[f.key])); }),
      h('td', { class: 'n sub' }, fmtCount(r.advanced)), h('td', { class: 'n sub' }, fmtCount(r.group_third))));
    const keepFocus = table.contains(document.activeElement);
    table.replaceChildren(h('thead', {}, head), h('tbody', {}, ...body));
    if (keepFocus) table.querySelector('th.sorted button').focus();  // the row was rebuilt; follow the sort
  };
  const sortBy = (key) => { desc = sortKey === key ? !desc : true; sortKey = key; draw(); };
  // A real button inside a real column header: Enter and Space come free, the header keeps its
  // semantics, and aria-sort carries the direction (the arrow after the label is CSS).
  function th(key, label, colour, cls = '') {
    const sorted = sortKey === key;
    return h('th', { class: ['sort', cls, sorted && 'sorted'].filter(Boolean).join(' '), scope: 'col', 'aria-sort': sorted ? (desc ? 'descending' : 'ascending') : 'none' },
      h('button', { type: 'button', title: 'Sort', onclick: () => sortBy(key) }, colour ? h('i', { style: `background:${colour}` }) : null, label));
  }
  draw();
  const runs = fmtCount(ctx.n);
  section.replaceChildren(
    h('div', { class: 'num' }, '01 · Who wins it'), h('h2', {}, "Every team's fate, counted."),
    h('p', { class: 'lede' }, `Each row splits a team's ${runs} runs into nine ways a World Cup can end: fourth in the group, third and out, then the round where the run stopped, up to the trophy. A third-placed team that squeaked through is counted where it was eventually knocked out.`),
    h('div', { class: 'legend' }, ...FATES.map((f) => h('span', {}, h('i', { style: `background:${f.colour}` }), f.long)), h('span', { style: 'margin-left:auto' }, 'Click a column header to sort')),
    scrollX('Fate table, scrolls sideways', table),
    h('p', { class: 'foot' }, 'The Advanced and 3rd-in-group columns are subtotals: a team can be third and still advance, so they overlap.'));
}

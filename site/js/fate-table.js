// site/js/fate-table.js
import { h, name, fmtCount, count, scrollX, chapterHead } from './dom.js';
import { register, paintRow } from './print.js';

// The nine ways a run can end, in tournament order. Chapters 4 and 7 reuse FATES.
export const FATES = [
  { key: 'gs4', label: 'GS4', head: '4th in group', long: '4th in group', token: '--f-gs4', colour: '#DDE3DC' },
  { key: 'gs3_out', label: 'GS3', head: '3rd, out', long: '3rd, out', token: '--f-gs3', colour: '#C9D3C7' },
  { key: 'r32', label: 'R32', head: 'Out in R32', long: 'Round of 32', token: '--f-r32', colour: '#C2DFC6' },
  { key: 'r16', label: 'R16', head: 'Out in R16', long: 'Round of 16', token: '--f-r16', colour: '#98C8A2' },
  { key: 'qf', label: 'QF', head: 'Out in QF', long: 'Quarter-final', token: '--f-qf', colour: '#6BAE7C' },
  { key: 'fourth', label: '4th', head: '4th place', long: '4th place', token: '--f-4th', colour: '#3F8F57' },
  { key: 'third', label: '3rd', head: '3rd place', long: '3rd place', token: '--f-3rd', colour: '#B87333' },
  { key: 'runner_up', label: 'RU', head: 'Runner-up', long: 'Runner-up', token: '--f-ru', colour: '#A8A9AD' },
  { key: 'champion', label: 'W', head: 'Champion', long: 'Champion', token: '--f-w', colour: '#C9A227' },
];

export function render(section, ctx) {
  const rows = [...ctx.report.fate_table];
  const table = h('table', { class: 'agate fate' });
  let sortKey = 'champion', desc = true;
  const cell = (r, key, attrs = {}) => h('td', { 'data-count': r[key], ...attrs }, count(r[key]));
  const draw = () => {
    rows.sort((a, b) => (desc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]) || b.champion - a.champion);
    const head = h('tr', {}, h('th', { scope: 'col' }, 'Team'), th('elo', 'Elo'),
      ...FATES.map((f) => th(f.key, f.head)), th('advanced', 'Advanced', 'sub'), th('group_third', '3rd in group', 'sub'));
    const body = rows.map((r) => {
      const tr = h('tr', {},
        h('th', { scope: 'row' }, name(r.team, ctx.byCode), h('i', {}, `Group ${r.group}`)),   // no flag, as the approved screen
        h('td', {}, Math.round(r.elo)),
        ...FATES.map((f) => cell(r, f.key, { class: f.key === 'champion' ? 'w' : null, 'data-share': (r[f.key] / ctx.n).toFixed(4), style: `--fate: var(${f.token})` })),
        cell(r, 'advanced', { class: 'sub' }), cell(r, 'group_third', { class: 'sub' }));
      register(tr, paintRow, { key: r.team });   // keyed by team, so a sort keeps every printed row printed
      return tr;
    });
    const keepFocus = table.contains(document.activeElement);
    table.replaceChildren(h('thead', {}, head), h('tbody', {}, ...body));
    if (keepFocus) table.querySelector('th.sorted button').focus();   // the row was rebuilt; follow the sort
  };
  const sortBy = (key) => { desc = sortKey === key ? !desc : true; sortKey = key; draw(); };
  // A real button inside a real column header: Enter and Space come free, the header keeps its
  // semantics, and aria-sort carries the direction (the arrow after the label is CSS).
  function th(key, label, cls = '') {
    const sorted = sortKey === key;
    return h('th', { class: ['sort', cls, sorted && 'sorted'].filter(Boolean).join(' '), scope: 'col', 'aria-sort': sorted ? (desc ? 'descending' : 'ascending') : 'none' },
      h('button', { type: 'button', title: 'Sort', onclick: () => sortBy(key) }, label));
  }
  draw();
  const runs = fmtCount(ctx.n);
  section.replaceChildren(
    ...chapterHead('Who wins it', "Every team's fate, counted.",
      `Each row splits a team's ${runs} runs into nine ways a World Cup can end: fourth in the group, third and out, then the round where the run stopped, up to the trophy. A third-placed team that squeaked through is counted where it was eventually knocked out.`),
    scrollX('Fate table, scrolls sideways', table),
    h('p', { class: 'foot' }, `Counts of runs, out of ${runs}. A zero is a fate that never happened in any run. Advanced and 3rd in group are subtotals: a team can be third and still advance, so they overlap. Click a column head to sort.`));
}

// site/js/groups.js
import { h, flag, name, fmtCount, countOf, count, chapterHead } from './dom.js';
import { register, paintRow, paintBlock, rowWindow, clamp, inkAt, ruleAt } from './print.js';

const HOSTS = ['US', 'MX', 'CA'];  // data/tournaments/wc2026.yaml `hosts`
const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

// A box is one printed unit. Its border and label print over the first fifth of its progress;
// its four rows follow in sequence, each overlapping the next by half, a row's bar filling as
// its percentage climbs.
function paintBox(box, p) {
  const label = clamp(p / 0.2);
  box.style.setProperty('--bp', ruleAt(label).toFixed(3));
  box.querySelector('.label').style.opacity = inkAt(label).toFixed(3);
  box.querySelectorAll('tbody tr').forEach((tr, i) => {
    const q = rowWindow(p, i, 4);
    paintRow(tr, q);
    tr.querySelector('.bar i').style.width = `${(q * +tr.dataset.share * 100).toFixed(2)}%`;
  });
}

export function render(section, ctx) {
  const all = ctx.report.group_advance;
  const byGroup = {};
  for (const r of all) (byGroup[r.group] ??= []).push(r);
  const wall = h('div', { class: 'wall' });
  // The boxes of a wall row share a top, so the reading line alone would print them in lockstep.
  // A quarter of a band of lead per column (0.045 of a screen) makes them print one by one, A to
  // L, at whatever column count the width gives. The wave is a quarter of a band and not the half
  // it was because the whole wall has to be printed before the bracket's grid reaches the reading
  // line: four across, the last column's lead plus its own band has to fit in the 516px between
  // the last wall row and that grid, which at half a band it did not on a window over 1147px tall.
  const LEAD = 0.045;
  // The wall's column count follows the width alone (site.css's media queries), so it is read once
  // the wall is on the page and again on each resize, not per box on every frame.
  let columns = 4;
  const countColumns = () => { columns = getComputedStyle(wall).gridTemplateColumns.split(' ').length; };
  Object.keys(byGroup).sort().forEach((g, i) => {
    const rows = byGroup[g].sort((a, b) => b.adv_pct - a.adv_pct);
    const shaded = rows[0].third_shaded;  // a property of the group, carried on every row
    const box = h('div', { class: 'box' },
      h('div', { class: 'label' }, h('b', {}, `Group ${g}`), h('span', {}, shaded ? 'third usually goes through' : 'third usually out')),
      h('table', { class: 'agate' },
        h('colgroup', {}, h('col', { style: 'width:16px' }), h('col'), h('col', { style: 'width:42px' }), h('col', { style: 'width:36px' })),
        h('tbody', {}, ...rows.map((r, j) => {
          const pct = Math.round(r.adv_pct * 100);
          // The rows that usually go out: the fourth everywhere, the third where third usually goes out.
          return h('tr', { class: j === 3 || (j === 2 && !shaded) ? 'out' : null, 'data-share': r.adv_pct.toFixed(4) },
            h('td', { class: 'ps' }, r.modal_pos),
            h('th', { scope: 'row', class: 'tm' }, flag(r.team, ctx.byCode), name(r.team, ctx.byCode), HOSTS.includes(r.team) ? h('em', { class: 'host' }, 'host') : null),
            h('td', {}, h('span', { class: 'bar' }, h('i'))),
            h('td', { 'data-count': pct }, count(pct), '%'));
        }))));
    register(box, paintBox, { lead: () => (i % columns) * LEAD });
    wall.append(box);
  });
  const best = all.reduce((a, b) => (b.adv_pct > a.adv_pct ? b : a));
  const worst = all.reduce((a, b) => (b.adv_pct < a.adv_pct ? b : a));
  const got = (r) => `${name(r.team, ctx.byCode)} got out of Group ${r.group} in ${countOf(r.adv_pct, ctx.n)}`;
  const runs = fmtCount(ctx.n);
  const D = Object.fromEntries(byGroup.D.map((r) => [r.team, r]));
  const pc = (r) => `${Math.round(r.adv_pct * 100)}%`;
  const foot = h('p', { class: 'foot' }, `The figure at the left of each row is the position a team finishes most often, which is not always the order of the rows: in Group D the USA get out more often than Australia (${pc(D.US)} to ${pc(D.AU)}) yet finish ${ORD[D.US.modal_pos]} more often than ${ORD[D.AU.modal_pos]}.`);
  register(foot, paintBlock, { kind: 'block' });
  section.replaceChildren(
    ...chapterHead('Group stage', 'Who gets out of the group.',
      `Twelve groups of four. The top two go through, and the eight best third-placed teams join them. Each bar is how often a team reached the round of 32 in ${runs} runs. The rows in lighter ink usually go out. ${got(best)} runs; ${got(worst)}.`),
    wall, foot);
  countColumns();
  window.addEventListener('resize', countColumns);   // before the engine's own, which boots later
}

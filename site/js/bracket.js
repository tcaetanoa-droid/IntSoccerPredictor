// site/js/bracket.js
import { h, flag, name, fmtPct, fmtCount, count, chapterHead, scrollX } from './dom.js';
import { hold, register, paintBlock, paintCounts, rowWindow, holdPhase, roundProgress, clamp, inkAt, ruleAt } from './print.js';
import { snap, redrawOnWidth } from './svg.js';

// Feed order from data/tournaments/wc2026.yaml knockout.matches: 101 = W97 v W98, 102 = W99 v W100.
const LEFT = { R32: [74, 77, 73, 75, 83, 84, 81, 82], R16: [89, 90, 93, 94], QF: [97, 98], SF: [101] };
const RIGHT = { R32: [76, 78, 79, 80, 86, 88, 85, 87], R16: [91, 92, 95, 96], QF: [99, 100], SF: [102] };
const HEAD = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32'];
const KEYS = ['R32', 'R16', 'QF', 'SF'];
// A printed row is the left box with the right box of the same rank, so both sides print in step.
const rowsOf = (k) => LEFT[k].map((n, i) => [n, RIGHT[k][i]]);
const R32 = rowsOf('R32');
const HELD = [rowsOf('R16'), rowsOf('QF'), rowsOf('SF'), [[104]]];
// Each box's two feeders, keyed as the connectors are ("feeder-fed"), in the pairing the SVG
// uses: box j of a column feeds box j >> 1 of the next, and each semi-final feeds the final.
const FEED = {};
const feed = (a, b) => ((FEED[b] ??= []).push(`${a}-${b}`));
for (const side of [LEFT, RIGHT]) {
  for (let r = 0; r < 3; r++) side[KEYS[r]].forEach((n, j) => feed(n, side[KEYS[r + 1]][j >> 1]));
  feed(side.SF[0], 104);
}
// The road to the final: the match each finalist won in every round before the final, then the
// final itself. Followed out of the data match by match, never typed.
const roadOf = (M, code) => KEYS.map((k) => [...LEFT[k], ...RIGHT[k]].find((n) => M[n].winner === code)).concat(104);
const roadLinks = (M, f) => new Set([f.home, f.away].flatMap((c) => {
  const r = roadOf(M, c);
  return r.slice(1).map((n, i) => `${r[i]}-${n}`);
}));

export function render(section, ctx) {
  const M = Object.fromEntries(ctx.report.bracket.matches.map((m) => [m.number, m]));
  const champ = ctx.report.bracket.champion;
  const final = M[104];
  const pChamp = final.home === champ ? final.p_home : 1 - final.p_home;
  const whole = (p) => Math.round(p * 100);
  // Every printed percentage is a counting cell: the final value for assistive technology beside
  // the display that climbs to it.
  const pcell = (p, cls) => h('span', { class: cls, 'data-count': whole(p) }, count(whole(p)), '%');
  const tie = (code, p, win) => h('div', { class: 'tie' + (win ? ' win' : '') },
    flag(code, ctx.byCode), h('span', { class: 'nm' }, name(code, ctx.byCode)), pcell(p, 'p'));
  const box = (n) => {
    const m = M[n];
    return h('div', { class: 'm', 'data-match': n }, h('span', { class: 'mn' }, n),
      tie(m.home, m.p_home, m.winner === m.home), tie(m.away, 1 - m.p_home, m.winner === m.away));
  };
  const col = (nums, side) => h('div', { class: `col ${side}` }, ...nums.map((n) => h('div', { class: 'slot' }, box(n))));

  // The champion mark and the reality caption are built twice from the same data: once inside the
  // grid, once inside the phone summary above it.
  const champMark = () => h('div', { class: 'champ' }, flag(champ, ctx.byCode, 80),
    h('b', { class: 'cn' }, name(champ, ctx.byCode)),
    h('div', { class: 'sub' }, 'wins the final in ', pcell(pChamp), ' of the runs that got here'));
  const capText = `The real tournament produced this final: ${name(final.home, ctx.byCode)} v ${name(final.away, ctx.byCode)}.`;
  const mark = champMark();
  const cap = h('p', { class: 'realcap' }, capText);
  const thirdLbl = h('div', { class: 'lbl' }, 'Third place');
  // The round heads are cells of the bracket grid itself, so they centre over the columns
  // whatever width the content gives each one (a second grid could not share the track sizes).
  const grid = h('div', { class: 'bracket' }, ...HEAD.map((t) => h('div', { class: 'bh' }, t)),
    col(LEFT.R32, 'l'), col(LEFT.R16, 'l'), col(LEFT.QF, 'l'), col(LEFT.SF, 'l'),
    h('div', { class: 'col fin' }, h('div', { class: 'slot' }, mark,
      h('div', { class: 'finwrap' }, box(104), cap),
      h('div', { class: 'third' }, thirdLbl, box(103)))),
    col(RIGHT.SF, 'r'), col(RIGHT.QF, 'r'), col(RIGHT.R16, 'r'), col(RIGHT.R32, 'r'));
  const held = scrollX('The bracket, scrolls sideways', grid);
  // A screen too narrow for the grid gets the result before the road to it: the champion mark, the
  // final's own box and the real final, a ruled unit between the intro and the grid. It is built
  // from the same matches the grid is, and site.css shows it only while the grid carries the .sx
  // class js/dom.js sets in the layout pass, so nothing is duplicated where the grid fits whole.
  const sumBox = box(104);
  const sum = h('div', { class: 'bsum' }, champMark(), sumBox, h('p', { class: 'realcap' }, capText));
  // The lock's first candidate: the chapter's title and intro with the grid, so the screen locks
  // at the title (spec §8, checkpoint amendment). js/print.js falls back to the grid alone, the
  // second candidate, on a window too short to hold all three.
  const lock = h('div', { class: 'lock' },
    ...chapterHead('The bracket', 'The most likely road to the final.',
      'Take the most common finishing order in every group, then at each knockout match ask: of all the runs where these two teams met in this exact slot, who won more often? Follow the winners to the final. It is the path of most likely steps, not the most likely single tournament, which is far rarer. The real tournament got the same four semi-finalists and the same final.'),
    sum, held);
  const block = h('div', { class: 'pin' }, lock);
  const es = M[84], coin = M[78];
  const foot = h('p', { class: 'foot' }, `Percentages are conditional on the pairing: ${name(es.home, ctx.byCode)} beat ${name(es.away, ctx.byCode)} in ${fmtPct(es.p_home, 0)} of the ${fmtCount(es.n_met)} runs where they met in match ${es.number}. Coin flips are printed as coin flips: ${name(coin.home, ctx.byCode)} ${fmtPct(coin.p_home, 0)}, ${name(coin.away, ctx.byCode)} ${fmtPct(1 - coin.p_home, 0)}. Match numbers are FIFA's.`);
  section.replaceChildren(block, foot);

  const boxes = [...grid.querySelectorAll('.m')];
  const heads = [...grid.querySelectorAll('.bh')];
  const headBox = [LEFT.R32[0], LEFT.R16[0], LEFT.QF[0], LEFT.SF[0], 104, RIGHT.SF[0], RIGHT.QF[0], RIGHT.R16[0], RIGHT.R32[0]];
  const paths = [];
  // Nothing un-prints: every box and every connector keeps the most it has printed.
  const ruleP = new Map(), rowsP = new Map(), lineP = new Map();
  const setBox = (n, pr, pw) => { ruleP.set(n, Math.max(ruleP.get(n) ?? 0, pr)); rowsP.set(n, Math.max(rowsP.get(n) ?? 0, pw)); };
  const setLine = (k, p) => lineP.set(k, Math.max(lineP.get(k) ?? 0, p));
  // A box prints as the engine prints one: its rule with --bp (0.06 to full ink), its number and
  // both rows 0.04 to full, the percentages counting up from blank, the winner ending in full ink
  // on its 9% tint and the loser at 0.75.
  const paintBox = (el, pr, pw) => {
    el.style.setProperty('--bp', ruleAt(pr).toFixed(3));
    const on = inkAt(pw);
    el.querySelector('.mn').style.opacity = on.toFixed(3);
    for (const row of el.querySelectorAll('.tie')) {
      row.style.opacity = (row.classList.contains('win') ? on : on * 0.75).toFixed(3);
      paintCounts(row, pw);
    }
  };
  // The last value written to each piece, so a paint touches only what moved (spec §4, the
  // budget: only units whose progress changed are painted). A connector keeps its own on the
  // path record, which is rebuilt with the path on every redraw, so a fresh path is always
  // written even where the progress is unchanged.
  const doneRule = new Map(), doneRows = new Map(), doneHead = new Map();
  let doneFin = -1, doneThird = -1;
  const paintAll = () => {
    for (const el of boxes) {
      const n = +el.dataset.match, pr = ruleP.get(n) ?? 0, pw = rowsP.get(n) ?? 0;
      if (doneRule.get(n) === pr && doneRows.get(n) === pw) continue;
      doneRule.set(n, pr); doneRows.set(n, pw);
      paintBox(el, pr, pw);
    }
    // A connector draws by its own length: the dash is the path's length and the offset runs from
    // that length to zero, so the line grows out of the feeder into the box it feeds.
    for (const p of paths) {
      const v = lineP.get(p.key) ?? 0;
      if (p.drawn === v) continue;
      p.drawn = v;
      p.el.style.strokeDasharray = p.len.toFixed(2);
      p.el.style.strokeDashoffset = (p.len * (1 - v)).toFixed(2);
    }
    heads.forEach((el, k) => {
      const v = rowsP.get(headBox[k]) ?? 0;
      if (doneHead.get(k) === v) return;
      doneHead.set(k, v);
      el.style.opacity = inkAt(v).toFixed(3);
    });
    const pf = rowsP.get(104) ?? 0, pt = rowsP.get(103) ?? 0;
    if (pf !== doneFin) {
      doneFin = pf;
      mark.style.opacity = inkAt(pf).toFixed(3);
      paintCounts(mark, pf);
      cap.style.opacity = inkAt(pf).toFixed(3);
    }
    if (pt !== doneThird) { doneThird = pt; thirdLbl.style.opacity = inkAt(pt).toFixed(3); }
  };
  const paint = (t, H, approach) => {
    const { p1, q } = holdPhase(t, H, approach);
    // Phase one, on the scroll: the round of 32 in eight rows, both sides in step, the eighth
    // row completing exactly as the pin engages.
    R32.forEach((row, j) => { const u = rowWindow(p1, j, R32.length); row.forEach((n) => setBox(n, u, u)); });
    // Phase two, inside the hold: five equal parts, one per round and a beat with the finished
    // bracket. Inside a round the rows print top to bottom, both sides in step; inside a row a
    // box's two connectors draw over the first half of its unit, its rule prints as they arrive
    // and its rows follow.
    HELD.forEach((rws, k) => {
      const rq = roundProgress(q, k);
      rws.forEach((row, j) => {
        const u = rowWindow(rq, j, rws.length);
        const pr = clamp((u - 0.4) / 0.35), pw = clamp((u - 0.55) / 0.45);
        row.forEach((n) => {
          for (const key of FEED[n]) setLine(key, clamp(u / 0.5));
          setBox(n, pr, pw);
          if (n === 104) setBox(103, pr, pw);   // the third-place box prints with the final
        });
      });
    });
    paintAll();
    // On a phone the grid sits at its minimum width, where the columns widen as the percentages
    // print and so move the boxes after the connectors were drawn. A width change is now the only
    // resize that redraws them, so they are redrawn once, when the final has printed.
    if (!redrawn && roundProgress(q, 3) === 1) { redrawn = true; redraw(); }
  };
  let redrawn = false;
  const redraw = drawConnectors(grid, roadLinks(M, final), paths, paintAll);
  // The phone summary is one printed unit: it prints as a block on entry, its box's rule with it
  // and its three percentages counting out of blank, the way every ruled unit on the sheet prints.
  register(sum, (el, p) => {
    paintBlock(el, p);
    sumBox.style.setProperty('--bp', ruleAt(p).toFixed(3));
    paintCounts(el, p);
  }, { kind: 'block' });
  const bracket = hold(block, [lock, held], paint, { start: held });
  // The foot note. With the pin the block holds it below the window until the release, so it is
  // given the paper left under the held bracket as a lead and prints on the travel after the
  // release; with no pin the lead is zero and it prints on its own entry like any block.
  register(foot, paintBlock, { kind: 'block', lead: () => bracket.slack });
}

// Connector lines: an SVG overlay on the grid, in the grid's own pixel space. Each box's outer
// edge mid-point (right edge on the left half, left edge on the right half) is joined to the
// inner edge mid-point of the box it feeds, with the elbow half-way across the column gap, so
// the two feeders of a box share one vertical stem. Every path is keyed "feeder-fed" and its own
// length measured, so the hold can draw it by stroke-dashoffset; the eight on the road to the
// final carry the class that keeps them at 2px. Redrawn whenever the page's width changes, once
// the web fonts have settled and once the bracket has printed (render() calls the draw returned
// here), since the column widths follow the content, and repainted after each redraw because a
// fresh path carries no dash.
function drawConnectors(grid, road, paths, repaint) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'conn');
  svg.setAttribute('aria-hidden', 'true');
  grid.append(svg);
  const cols = [...grid.querySelectorAll('.col')];
  const boxes = (c) => [...c.querySelectorAll('.m')];
  const final = grid.querySelector('[data-match="104"]');
  const draw = () => {
    svg.replaceChildren();
    paths.length = 0;
    const g = grid.getBoundingClientRect();
    const mid = (el, edge) => { const r = el.getBoundingClientRect(); return [(edge === 'r' ? r.right : r.left) - g.left, snap(r.top + r.height / 2 - g.top)]; };
    const link = (a, b, side) => {
      const [x1, y1] = mid(a, side === 'l' ? 'r' : 'l'), [x2, y2] = mid(b, side);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x1},${y1} H${snap((x1 + x2) / 2)} V${y2} H${x2}`);
      const key = `${a.dataset.match}-${b.dataset.match}`;
      p.setAttribute('data-link', key);
      if (road.has(key)) p.setAttribute('class', 'on');
      svg.append(p);
      paths.push({ el: p, key, len: p.getTotalLength() });
    };
    const pairUp = (from, to, side) => { const b = boxes(to); boxes(from).forEach((box, i) => link(box, b[i >> 1], side)); };
    for (let i = 0; i < 3; i++) { pairUp(cols[i], cols[i + 1], 'l'); pairUp(cols[8 - i], cols[7 - i], 'r'); }
    link(boxes(cols[3])[0], final, 'l');
    link(boxes(cols[5])[0], final, 'r');
    repaint();
  };
  draw();
  redrawOnWidth(grid, draw);
  document.fonts.ready.then(draw);
  return draw;
}

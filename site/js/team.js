// site/js/team.js
import { h, flag, name, fmtCount, fmtPct, countOf, count, scrollX, chapterHead, layoutScrollX } from './dom.js';
import { FATES } from './fate-table.js';
import { register, reprint, paintRow, paintBlock, paintCounts, inkAt, reduced } from './print.js';

const ROUNDS = [['R32', 'Round of 32'], ['R16', 'Round of 16'], ['QF', 'Quarter-final'], ['SF', 'Semi-final'], ['F', 'Final']];
// "curacao" has to find "Curaçao", so both sides of the match lose their accents.
const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
// A row here prints over 10% of a screen against the sheet's 18% (spec §8, the motion amendment):
// the rows are two lines of agate apart and their count-ups are meant to be a flicker.
const BAND = 0.10;
// The one fade on the printed sheet (spec §4, the transition-7 amendment): on a pick the old
// team's ink goes to paper before the new team prints, so two teams are never on the sheet at
// once. It is driven here rather than by a CSS transition, which would still run under reduced
// motion and could not be skipped cleanly. Then the new team prints over PRINT_MS, ease-out.
const FADE_MS = 150, PRINT_MS = 400;

function fadeOut(el) {
  if (reduced()) return Promise.resolve();
  return new Promise((resolve) => {
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / FADE_MS);
      el.style.opacity = (1 - k).toFixed(3);
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

// A printed percentage, the shape dom.js's count() has: the final value for assistive
// technology, then the display that climbs.
const pct = (x) => [h('span', { class: 'sr' }, fmtPct(x, 1)), h('span', { class: 'ct', 'aria-hidden': 'true' }, fmtPct(0, 1))];

// A list row of the two ruled lists or of the opponents: its hairline, its label and its values
// from the block floor of 0.04, each bar grows to its own full width, and the numbers climb out
// of blank — counts through the engine's painter, percentages through the formatter beside their
// .sr span.
function paintListRow(el, p) {
  el.style.setProperty('--rp', p.toFixed(3));
  for (const lb of el.querySelectorAll('.lb')) lb.style.opacity = inkAt(p).toFixed(3);
  for (const v of el.querySelectorAll('.val, .oitem')) v.style.opacity = inkAt(p).toFixed(3);
  for (const b of el.querySelectorAll('.bar')) b.style.width = `${(p * +b.dataset.w).toFixed(2)}%`;
  for (const c of el.querySelectorAll('[data-pct]')) c.querySelector('.ct').textContent = p === 0 ? '' : fmtPct(p * +c.dataset.pct, 1);
  paintCounts(el, p);
}
// The head prints as a block and its champion count climbs with it.
const paintHead = (el, p) => { paintBlock(el, p); paintCounts(el, p); };

export async function render(section, ctx) {
  const runs = fmtCount(ctx.n);
  const fromHash = (location.hash.match(/team=([A-Z]{2})/) || [])[1];
  let code = ctx.byCode[fromHash] ? fromHash : ctx.teams[0].code;
  let matches = [], hi = -1, blurT = 0, gen = 0;
  // The team on the page and its address, kept by draw(): what a failed pick puts back. The last
  // team asked for will not do, since a pick overtaken on its way never reached the page. It
  // starts as the first team, for a pick that fails before that one has arrived.
  let drawn = { code, hash: location.hash };

  const input = h('input', { class: 'si', id: 'team-search', type: 'text', autocomplete: 'off', role: 'combobox',
    'aria-controls': 'team-results', 'aria-expanded': 'false', 'aria-autocomplete': 'list',
    onfocus: (e) => { clearTimeout(blurT); e.target.select(); },
    oninput: () => openList(input.value),
    onblur: () => { blurT = setTimeout(() => closeList(true), 120); },  // after a row's click has landed
    onkeydown: onKey });
  const fsl = h('span', { class: 'sfl' });  // the chosen team's flag, redrawn by draw()
  const clear = h('button', { class: 'x', type: 'button', 'aria-label': 'Clear the team name',
    onclick: () => { clearTimeout(blurT); input.value = ''; closeList(false); input.focus(); } }, '×');
  const results = h('div', { class: 'res', id: 'team-results', role: 'listbox', 'aria-label': 'Teams', hidden: '' });
  const favs = h('span', { class: 'favs' });   // the opening line's five names, redrawn by draw()
  const body = h('div', { class: 'tbody' });
  // The line a failed pick prints under the search field. It is on the page from the start, empty,
  // so assistive technology announces its text when a failure sets it; empty, its margins fold into
  // the picker's own and it takes no room.
  const note = h('p', { class: 'foot', role: 'status' });
  // The picker is the region's own unit, outside the body the pick reprints: the field and the
  // favourites line stay printed while the team under them is replaced.
  const pk = h('div', { class: 'pk' },
    h('p', { class: 'lead' }, 'Pick a team, or one of the favourites: ', favs),
    h('label', { class: 'sr', for: 'team-search' }, 'Team'),
    h('div', { class: 'sw' }, h('div', { class: 'srch' }, fsl, input, clear), results),
    note);
  register(pk, paintBlock, { kind: 'block' });
  section.replaceChildren(
    ...chapterHead('Pick a team', 'One team, one hundred thousand tournaments.',
      `Every team has its own version of this page: how its ${runs} runs ended, how far it usually got, who it usually met along the way, and who ended its tournament. ${ctx.teams[0].name} is up first, as the favourite. Pick any of the ${ctx.teams.length}.`),
    pk, body);

  function drawList() {
    results.replaceChildren(...(matches.length
      ? matches.map((t, i) => h('div', { class: 'r' + (i === hi ? ' on' : ''), id: `tr-${t.code}`, role: 'option',
        'aria-selected': i === hi ? 'true' : 'false',
        onmousedown: (e) => e.preventDefault(),  // keep the focus so the blur restore does not fire first
        onclick: () => pick(t.code) },
        flag(t.code, ctx.byCode, 40), t.name, h('b', {}, countOf(t.champion_pct, ctx.n))))
      : [h('div', { class: 'r none', role: 'presentation' }, 'No team matches')]));
    results.hidden = false;
    // Scroll the list box itself, never scrollIntoView: that walks up to the document and would
    // smooth-scroll the page on every keystroke when the list is below the fold.
    if (hi >= 0) { const r = results.children[hi], lo = r.offsetTop, hiEdge = lo + r.offsetHeight;
      if (lo < results.scrollTop) results.scrollTop = lo; else if (hiEdge > results.scrollTop + results.clientHeight) results.scrollTop = hiEdge - results.clientHeight; }
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
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeList(true); }  // the rail's Escape listens on document
  }
  async function pick(c) {
    code = c;
    history.replaceState(null, '', `#team=${code}`);
    // draw() rebuilds the favourites line, so a favourite that was activated is removed from the
    // document and focus would fall to <body>. From a row or the keyboard the focus is already
    // on the input, so it stays there; from a tap on a favourite it must not go to the input,
    // which would open the on-screen keyboard, so it goes to the rebuilt team header instead.
    const onInput = document.activeElement === input;
    closeList(false);
    if (onInput) input.focus();
    note.textContent = '';                     // a new pick clears the last one's failure
    const g = ++gen;
    // The team's JSON is fetched while the old ink fades, so the fade is the whole wait.
    const fade = fadeOut(body);
    let t;
    try {
      t = await ctx.team(code);
    } catch (e) {
      // The file did not arrive. Once the fade has run, and unless a newer pick has taken over,
      // the team on the page comes back as it was, name and address included, and one line says
      // what happened and what to do.
      await fade;
      if (g !== gen) return;
      code = drawn.code;
      history.replaceState(null, '', drawn.hash || location.pathname + location.search);
      input.value = ctx.byCode[code].name;
      body.style.opacity = '';
      note.textContent = `${ctx.byCode[c].name}'s runs did not load. Pick again to retry.`;
      return;
    }
    await fade;
    if (g !== gen) return;                     // a second pick overtook this one
    draw(t, true);
    body.style.opacity = '';
    if (!onInput) body.querySelector('.th').focus();
    reprint(body, PRINT_MS);                   // the new team prints from zero, ease-out
  }

  // One printing of the team page. `manual` keeps the new units out of the scroll (a pick), so
  // reprint() drives them; on first reading they are ordinary scroll units. No unit carries a
  // key: a second pick would otherwise inherit the first team's progress and swallow the print.
  function draw(t, manual) {
    const top = ctx.teams[0].code === code;
    const nm = t.name;
    const blk = (el) => { register(el, paintBlock, { kind: 'block', manual }); return el; };
    const row = (el, painter) => { register(el, painter, { band: BAND, manual }); return el; };
    const region = (cls, title, sub, rows) => h('div', { class: cls ? `reg ${cls}` : 'reg' },
      blk(h('h3', {}, title)), sub ? blk(h('p', { class: 'regs' }, sub)) : null, ...rows);

    fsl.replaceChildren(flag(code, ctx.byCode, 40));
    input.value = nm;
    // The five favourites are the strongest teams that are not the one already on the page.
    const link = (z) => h('a', { href: `#team=${z.code}`,
      onmousedown: (e) => e.preventDefault(),  // a tap must not take the focus off the page's chrome
      onclick: (e) => { e.preventDefault(); pick(z.code); } }, z.name);
    favs.replaceChildren(...ctx.teams.slice(0, 6).filter((z) => z.code !== code).slice(0, 5)
      .flatMap((z, i) => (i ? [h('span', { class: 'sep' }, '·'), link(z)] : [link(z)])));

    const head = h('div', { class: 'th', tabindex: '-1' }, flag(code, ctx.byCode, 160),
      h('div', {}, h('div', { class: 'tn' }, nm),
        h('div', { class: 'tm' }, `Group ${t.group} · Elo ${Math.round(t.elo)}${top ? ', highest in the field' : ''}`)),
      h('div', { class: 'tc' }, h('b', { 'data-count': Math.round(t.champion_pct * ctx.n) }, count(t.champion_pct * ctx.n)),
        h('span', {}, 'won the tournament')));
    register(head, paintHead, { kind: 'block', manual });

    // The fate strip is one row of chapter one's table: the nine heads are the ruled frame it
    // prints into, each cell carrying its count and its own tint strength.
    const fateRow = row(h('tr', {}, ...FATES.map((f) => h('td', { 'data-count': Math.round(t.fates[f.key] * ctx.n),
      'data-share': t.fates[f.key], style: `--fate: var(${f.token})` }, count(t.fates[f.key] * ctx.n)))), paintRow);
    const fate = region(null, `How ${nm}'s ${runs} runs ended`, null,
      [scrollX(`How ${nm}'s runs ended, scrolls sideways`, h('table', { class: 'agate strip' },
        h('thead', {}, h('tr', {}, ...FATES.map((f) => h('th', { scope: 'col' }, f.head)))),
        h('tbody', {}, fateRow)))]);
    // How far it gets: the bars are shares of every run, so the round of 32 nearly fills the row.
    const far = region(null, `How far ${nm} gets`, `Share of all ${runs} runs.`,
      [...ROUNDS.map(([k, lab]) => [lab, t.reach[k]]), ['Champion', t.champion_pct]].map(([lab, v]) =>
        row(h('div', { class: 'lrow' }, h('span', { class: 'lb' }, lab),
          h('span', { class: 'bar', 'data-w': (v * 100).toFixed(1) }),
          h('span', { class: 'val', 'data-count': Math.round(v * ctx.n) }, count(v * ctx.n))), paintListRow)));
    const opps = region('opp', 'Most common opponent, round by round', `Share of the runs in which ${nm} reached that round`,
      ROUNDS.map(([k, lab]) => row(h('div', { class: 'orow' }, h('span', { class: 'lb olb' }, lab),
        h('span', { class: 'olist' }, ...(t.opponents_by_round[k] || []).map((o) => h('span', { class: 'oitem' },
          // The name carries its own element so that it, and never the percentage beside it, is
          // the part the column's ellipsis cuts.
          flag(o.team, ctx.byCode, 40), h('span', { class: 'onm' }, name(o.team, ctx.byCode)),
          h('b', { 'data-pct': o.pct }, pct(o.pct)))))), paintListRow)));
    // Who knocked it out: shares of the runs that ended in an elimination, and the bars are
    // measured against the biggest eliminator, so the first one runs the full width.
    const kmax = t.knocked_out_by.length ? t.knocked_out_by[0].pct : 1;
    const ko = region(null, `Who knocked ${nm} out`,
      `Share of the runs in which ${nm} was eliminated, ${countOf(1 - t.champion_pct, ctx.n)} runs. The bars are measured against the biggest eliminator.`,
      t.knocked_out_by.map((o) => row(h('div', { class: 'krow' },
        h('span', { class: 'lb nm' }, flag(o.team, ctx.byCode, 40), name(o.team, ctx.byCode)),
        h('span', { class: 'bar', 'data-w': (o.pct / kmax * 100).toFixed(1) }),
        h('span', { class: 'val', 'data-pct': o.pct }, pct(o.pct))), paintListRow)));
    const one = region(null, 'The one thing to know', null, [blk(h('p', { class: 'ex' }, t.excerpt_text))]);

    body.replaceChildren(head, fate,
      h('div', { class: 'cols' }, h('div', { class: 'col' }, far, opps), h('div', { class: 'col' }, ko, one)));
    layoutScrollX();     // the fate strip is a fresh region on every pick; it needs its own cue
    drawn = { code, hash: location.hash };   // what a failed pick puts back
  }

  // A pick made while this file was on its way has drawn its own team; drawing the first one now
  // would land on top of it, the picked team's flag over the first team's numbers.
  const first = gen;
  const t = await ctx.team(code);
  if (first === gen) draw(t, false);
}

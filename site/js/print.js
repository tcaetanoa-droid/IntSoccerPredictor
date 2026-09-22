// site/js/print.js
// The sheet is filled in as you read it. One module owns every scroll-linked change: chapter
// modules build their DOM, register units here and never listen to scroll themselves. Progress
// follows the scroll on the way down and never un-prints on the way up. The formulas are the
// ones approved in the design (docs/superpowers/specs/2026-09-20-restyle-design.md, §4 and §6).

import { measure as measureHeader } from './header.js';
import { layoutScrollX } from './dom.js';

export const clamp = (x) => Math.max(0, Math.min(1, x));
export const fmt = (n) => Math.round(n).toLocaleString('en-GB');

// A pinned row's window: rows start in sequence, each overlapping the next by half; the last
// row finishes exactly when the pin's progress reaches 1.
export const rowWindow = (p, i, R) => clamp((p - i / (R + 1)) / (2 / (R + 1)));
// A block (a title, an intro) prints over the first 40% of a screen after its top enters.
export const blockProgress = (H, top) => clamp((H - top) / (0.4 * H));
// A row prints as it crosses the reading line at 92% of the viewport, over its band: 18% of a
// screen by default (the spec's band), wider or narrower where a chapter's unit asks for it.
export const lineProgress = (H, top, band = 0.18) => clamp((0.92 * H - top) / (band * H));
// Density: the darkness a hero row prints to. The floor keeps the faintest row at 4.8:1.
export const densityTarget = (share, floor = 0.65) => floor + (1 - floor) * share;
// A fate cell's colour strength follows the share and saturates at a 40% share.
export const tintStrength = (share) => Math.min(1, 2.5 * share);
// The bracket's hold (spec §4 amendment, §8 The bracket and its checkpoint amendment): the
// sheet's second authored moment. The approach is measured from the grid's top crossing the
// reading line to the held region's top reaching the bottom edge of the sticky site header, so it
// is shorter when the chapter's title is held with the grid (about 0.62 of a screen at 900px)
// than when the grid is held alone (0.92), and shorter again by the header's own height;
// layoutHold works it out per hold and APPROACH is the grid-alone value under no header.
// The hold is the 1.35 screens the wheel then spends held.
export const APPROACH = 0.92, HOLD_TRAVEL = 1.35;
export const holdPhase = (t, H, approach = APPROACH) => ({ p1: clamp(t / (approach * H)), q: clamp((t - approach * H) / (HOLD_TRAVEL * H)) });
// The hold is four rounds of 0.3 of a screen and a beat of 0.15: round k (0 to 3) runs over its
// own 0.3, complete at q = (k + 1) / 4.5, and the beat holds the finished bracket from 4/4.5 to 1.
export const roundProgress = (q, k) => clamp(q * 4.5 - k);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Painters. A count cell carries data-count and holds a .ct span (the counting display) beside
// a .sr span (the final value, for assistive technology); a fate cell also carries data-share.
export function paintCounts(root, p) {
  for (const c of root.querySelectorAll('[data-count]')) {
    const ct = c.querySelector('.ct');
    if (ct) ct.textContent = fmt(p * +c.dataset.count);
    if (c.dataset.share !== undefined) c.style.setProperty('--t', (p * tintStrength(+c.dataset.share)).toFixed(3));
  }
}
export function paintRow(el, p) {
  const head = el.querySelector('th');
  if (head) head.style.opacity = (0.15 + 0.85 * p).toFixed(3);
  for (const c of el.querySelectorAll('td')) c.style.opacity = (0.2 + 0.8 * p).toFixed(3);
  paintCounts(el, p);
}
export function paintBlock(el, p) { el.style.opacity = (0.04 + 0.96 * p).toFixed(3); }
export function paintDensityRow(el, p) {
  const target = densityTarget(+el.dataset.share);
  el.style.opacity = (0.06 + p * (target - 0.06)).toFixed(3);
  paintCounts(el, p);
}

let units = [];
const byEl = new WeakMap();
const memo = new Map();   // key -> progress, so a re-drawn unit (a sorted row) stays printed
// H is the viewport; HD the sticky header's measured height, the top edge of everything pinned
// under it. The reading line stays at 0.92 of the viewport: it is a bottom-of-viewport event.
let io = null, raf = null, H = 0, HD = 0, pinned = null, holds = [], booted = false;

function set(u, p) {
  p = Math.max(p, u.p);            // never un-prints
  if (u.painted && p === u.p) return;
  u.p = p; u.painted = true; u.painter(u.el, p);
  if (u.key) memo.set(u.key, p);
}

// register(el, painter, { kind, key, manual, lead, band })
//   kind    'row' (prints across the reading line, default) or 'block' (prints on entry);
//   key     a stable id, such as a team code, so a re-drawn unit keeps its progress;
//   manual  excluded from scroll progress; driven by reprint() instead;
//   lead    a fraction of the viewport height (a number, or a function returning one) added to
//           the unit's top before its progress is measured: the unit prints that much later, as
//           if it sat that much lower on the sheet (chapter two's wave across a wall row);
//   band    the fraction of a screen a row unit's print takes (a number, or a function returning
//           one, for a band measured off the layout), 0.18 by default. A unit that carries a
//           schedule of its own asks for the whole schedule's travel (chapter four's three regions
//           take 3.8 bands, 0.684 of a screen; chapter eight's chart asks for its own height).
export function register(el, painter, { kind = 'row', key = null, manual = false, lead = 0, band = 0.18 } = {}) {
  const u = { el, painter, kind, key, manual, lead, band, p: 0, painted: false, live: false };
  units.push(u); byEl.set(el, u);
  set(u, reduced() ? 1 : (key && memo.has(key) ? memo.get(key) : 0));
  if (io && !manual) io.observe(el);
  return u;
}

// pin(block, held, rows, painter): the hero. The held screen is sticky inside the taller block;
// one screen of scroll fills the rows in sequence, the finished column holds for a third of a
// screen, then the page releases. When the held screen does not fit the viewport, or under
// reduced motion, there is no pin: the rows print across the reading line like any table.
export function pin(block, held, rows, painter) {
  pinned = { block, held, rows: rows.map((el, i) => ({ el, i, p: 0 })), painter, p: 0, active: false };
  rows.forEach((el) => painter(el, reduced() ? 1 : 0));
  if (booted) layoutPin();
}
function layoutPin() {
  HD = measureHeader();     // before any fit test: a held screen's height is the viewport minus it
  layoutScrollX();          // and before any measurement: the cue is a line inside the layout
  layoutHero();
  for (const o of holds) layoutHold(o);
}
function layoutHero() {
  if (!pinned) return;
  const { block, held } = pinned;
  block.classList.remove('flow');           // measure with the sticky height applied
  const fits = !reduced() && held.scrollHeight <= held.clientHeight + 1;
  pinned.active = fits;
  block.classList.toggle('flow', !fits);
  // One screen + one of travel + a 0.35 hold, less the header: the held screen is that much
  // shorter and starts sticking that much earlier, so the block is that much shorter too.
  block.style.height = fits ? `${Math.round(H * 2.35 - HD)}px` : '';
  if (reduced()) { pinned.p = 1; pinned.rows.forEach(({ el }) => pinned.painter(el, 1)); }
}
// hold(block, candidates, paint, { start }): the bracket's pin. `candidates` is an ordered list
// of regions that could be locked, each the parent of the next (the chapter's head with the grid,
// then the grid alone); the first that fits the viewport is the one held, so a window too short
// for the title keeps the grid's lock (spec §8, checkpoint amendment) and a window too narrow for
// the grid keeps no lock at all. The held region sticks at the top of the viewport inside its
// parent, which is given the region's own height plus the hold's travel, so the wheel keeps
// turning while the bracket stands still. `start` is
// the element whose top crossing the reading line begins the schedule (the grid), so the first
// row always opens with the grid on the reading line whichever region is held, and the approach
// shortens by the head's height rather than the rows starting earlier. `paint(t, H, approach)` is the
// chapter's own schedule, called with the wheel travel since that moment; the travel is measured
// from the block's rect, read live on every tick, and the block itself never sticks, so the travel
// keeps counting while the held region stands still.
// `slack` is the paper left under the held region, a fraction of the viewport, so a unit below
// the block can be given it as a lead and print after the release.
export function hold(block, candidates, paint, { start = candidates[candidates.length - 1] } = {}) {
  const o = { block, candidates, start, paint, slack: 0, offset: 0, approach: APPROACH, t: 0, done: false };
  holds.push(o);
  if (booted) layoutHold(o);
  return o;
}
function layoutHold(o) {
  // Measure at rest: no flow class, no sticky on any candidate and no travel height left over
  // from the last layout, or a candidate would measure its own travel as content.
  o.block.classList.remove('flow');
  o.block.style.height = '';
  for (const el of o.candidates) { el.classList.remove('held'); el.style.height = ''; }
  const blockTop = o.block.getBoundingClientRect().top;
  const rects = o.candidates.map((el) => el.getBoundingClientRect());
  // Fit is both dimensions. A grid wider than its sideways container would be pinned with its
  // last rounds off the sheet, so an overflow sideways rules out every candidate exactly as a
  // window too short for the grid does: no lock, and the schedule on the page's own travel.
  const wide = [...o.block.querySelectorAll('.scroll-x')].some((el) => el.scrollWidth > el.clientWidth);
  const i = reduced() || wide ? -1 : rects.findIndex((r) => r.height <= H - HD - 4);
  const fits = i >= 0;
  // No candidate fits: no lock, but the schedule still runs on the page's own travel from the
  // last candidate, which is the grid, exactly as it did before the title was a candidate.
  const k = fits ? i : o.candidates.length - 1;
  o.offset = rects[k].top - blockTop;           // the held region's rest offset inside the block
  // From the grid crossing the reading line to the held region's top reaching the header's bottom
  // edge; the paper left under the held region is what the viewport has below the header.
  o.approach = (0.92 * H - (o.start.getBoundingClientRect().top - rects[k].top) - HD) / H;
  o.slack = fits ? (H - HD - rects[k].height) / H : 0;
  o.block.classList.toggle('flow', !fits);
  if (fits) {
    o.candidates[k].classList.add('held');
    const parent = k === 0 ? o.block : o.candidates[k - 1];
    const off = rects[k].top - (k === 0 ? blockTop : rects[k - 1].top);
    parent.style.height = `${Math.round(off + rects[k].height + HOLD_TRAVEL * H)}px`;
  }
  // The finished sheet under reduced motion; otherwise the travel so far (none before the first
  // tick), so the bracket is unprinted from boot and never shows printed before it is read.
  o.paint(reduced() ? Infinity : o.t, H, o.approach);
}
function tickHold(o, y) {
  const r = o.block.getBoundingClientRect();
  if (r.top > 2 * H) return;                   // more than a screen below: nothing to paint yet
  // The travel since the grid's top crossed the reading line, measured from the block's rect,
  // read live on every tick; the block itself never sticks, so the travel keeps counting while
  // the held region stands still. The pin point is read off that rect, plus the held region's
  // offset inside it; the pin engages when that point reaches the header's bottom edge, and the
  // half-pixel snap there makes the approach's last unit complete exactly at the pin rather than
  // a fraction short. A deep load below the block lands with the travel already past the release,
  // so the schedule paints the finished sheet.
  const top = r.top + y + o.offset, t = y - top + HD + o.approach * H, was = o.t;
  o.t = Math.max(o.t, y >= top - HD - 0.5 ? Math.max(t, o.approach * H) : t);
  // Only a schedule that moved is painted (spec §4, the budget: only units whose progress
  // changed are painted). Travel never decreases, so scrolling back up inside the hold leaves
  // it equal and paints nothing at all.
  if (o.done || o.t === was) return;           // the schedule has run out, or it did not advance
  o.done = o.t >= (o.approach + HOLD_TRAVEL) * H;
  o.paint(o.t, H, o.approach);
}
// Returns true once the column is complete (or when there is no pin): the gate for the chapters.
function tickPin(y) {
  if (!pinned) return true;
  if (pinned.active) {
    // The held screen sticks at the header's bottom edge, so the column starts filling there.
    const top = pinned.block.getBoundingClientRect().top + y - HD;
    const p = Math.max(pinned.p, clamp((y - top) / H));
    if (p !== pinned.p) { pinned.p = p; pinned.rows.forEach((r) => pinned.painter(r.el, rowWindow(p, r.i, pinned.rows.length))); }
    return p >= 1;
  }
  for (const r of pinned.rows) {
    const p = Math.max(r.p, lineProgress(H, r.el.getBoundingClientRect().top));
    if (p !== r.p) { r.p = p; pinned.painter(r.el, p); }
  }
  return true;
}
// A unit's progress from its own position: its top, pushed down by its lead, through the block
// formula or the reading-line formula.
function progressOf(u) {
  const lead = typeof u.lead === 'function' ? u.lead() : u.lead;
  const band = typeof u.band === 'function' ? u.band() : u.band;
  const top = u.el.getBoundingClientRect().top + lead * H;
  return u.kind === 'block' ? blockProgress(H, top) : lineProgress(H, top, band);
}
function tick() {
  raf = null;
  if (!tickPin(window.scrollY)) return;     // nothing below the hero prints until its column is complete
  for (const o of holds) tickHold(o, window.scrollY);
  units = units.filter((u) => u.el.isConnected);
  for (const u of units) {
    if (u.manual || !u.live) continue;
    set(u, progressOf(u));
  }
}
const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

// reprint(root, ms): paint every unit under root from its current progress to 1 once, ease-out,
// independent of scroll (chapter seven on a pick). Reduced motion: complete at once.
export function reprint(root, ms = 400) {
  const list = units.filter((u) => root.contains(u.el));
  if (reduced() || ms <= 0) { list.forEach((u) => set(u, 1)); return Promise.resolve(); }
  return new Promise((resolve) => {
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const k = clamp((t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      list.forEach((u) => set(u, e));
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

// land(): a deep link's landing, taken again once the sheet stands. The browser scrolled to the
// fragment at parse time, on an empty sheet and before the pinned blocks had the heights
// layoutPin() gives them, so it lands short by everything the layout above the target then gains.
// It belongs here, after that layout and before the seed pass, which then paints from the landed
// position. 'instant' because `scroll-behavior: smooth` would animate the whole sheet and print it
// on the way; a reload keeps the browser's own scroll restoration, and a hash that is not an
// element id (#team=XX) finds nothing and leaves the position alone. The browser's own scroll to
// the fragment is an animation for that same reason, still in flight in this frame and retargeted
// by the pins' new heights, and it settles 31 to 108 pixels past this landing with the chapter
// title behind the masthead: so the landing is taken once more on the next frame, when it and the
// layout have both stopped moving, and that one is the last word. It can only move the sheet up,
// by that much, over units the seed pass has already painted.
function land() {
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload') return;
  const id = location.hash.slice(1), target = id && document.getElementById(id);
  if (!target) return;
  const take = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
  take();
  requestAnimationFrame(take);
}

// boot(): once every chapter has rendered. Under reduced motion the sheet is finished: every
// unit painted complete, no pin, no listener.
export function boot() {
  booted = true;
  H = window.innerHeight;
  if (reduced()) { units.forEach((u) => set(u, 1)); layoutPin(); land(); return; }
  io = new IntersectionObserver((entries) => {
    for (const e of entries) { const u = byEl.get(e.target); if (u) u.live = e.isIntersecting; }
    schedule();
  }, { rootMargin: '100% 0px 100% 0px' });
  units.forEach((u) => { if (!u.manual) io.observe(u.el); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { H = window.innerHeight; layoutPin(); schedule(); });
  document.fonts.ready.then(() => { layoutPin(); schedule(); });   // the held screen's height settles with the faces
  layoutPin();
  land();
  // Seed pass: a deep-load position (a hash, scroll restoration) can land above units the
  // observer has not yet reported live; paint them now from their real position so a unit
  // already above the reading line on load is painted complete, per spec §4.2.
  if (tickPin(window.scrollY)) {
    for (const u of units) {
      if (u.manual || !u.el.isConnected) continue;
      set(u, progressOf(u));
    }
  }
  tick();
}

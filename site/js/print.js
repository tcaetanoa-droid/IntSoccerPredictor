// site/js/print.js
// The sheet is filled in as you read it. One module owns every scroll-linked change: chapter
// modules build their DOM, register units here and never listen to scroll themselves. Progress
// follows the scroll on the way down and never un-prints on the way up. The formulas are the
// ones approved in the design (docs/superpowers/specs/2026-09-20-restyle-design.md, §4 and §6).

export const clamp = (x) => Math.max(0, Math.min(1, x));
export const fmt = (n) => Math.round(n).toLocaleString('en-GB');

// A pinned row's window: rows start in sequence, each overlapping the next by half; the last
// row finishes exactly when the pin's progress reaches 1.
export const rowWindow = (p, i, R) => clamp((p - i / (R + 1)) / (2 / (R + 1)));
// A block (a title, an intro) prints over the first 40% of a screen after its top enters.
export const blockProgress = (H, top) => clamp((H - top) / (0.4 * H));
// A row prints as it crosses the reading line at 92% of the viewport, over an 18% band.
export const lineProgress = (H, top) => clamp((0.92 * H - top) / (0.18 * H));
// Density: the darkness a hero row prints to. The floor keeps the faintest row at 4.8:1.
export const densityTarget = (share, floor = 0.65) => floor + (1 - floor) * share;
// A fate cell's colour strength follows the share and saturates at a 40% share.
export const tintStrength = (share) => Math.min(1, 2.5 * share);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Painters. A count cell carries data-count and holds a .ct span (the counting display) beside
// a .sr span (the final value, for assistive technology); a fate cell also carries data-share.
function paintCounts(root, p) {
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
let io = null, raf = null, H = 0, pinned = null, booted = false;

function set(u, p) {
  p = Math.max(p, u.p);            // never un-prints
  if (u.painted && p === u.p) return;
  u.p = p; u.painted = true; u.painter(u.el, p);
  if (u.key) memo.set(u.key, p);
}

// register(el, painter, { kind, key, manual })
//   kind    'row' (prints across the reading line, default) or 'block' (prints on entry);
//   key     a stable id, such as a team code, so a re-drawn unit keeps its progress;
//   manual  excluded from scroll progress; driven by reprint() instead.
export function register(el, painter, { kind = 'row', key = null, manual = false } = {}) {
  const u = { el, painter, kind, key, manual, p: 0, painted: false, live: false };
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
  if (!pinned) return;
  const { block, held } = pinned;
  block.classList.remove('flow');           // measure with the sticky height applied
  const fits = !reduced() && held.scrollHeight <= held.clientHeight + 1;
  pinned.active = fits;
  block.classList.toggle('flow', !fits);
  block.style.height = fits ? `${Math.round(H * 2.35)}px` : '';   // one screen + one of travel + a 0.35 hold
  if (reduced()) { pinned.p = 1; pinned.rows.forEach(({ el }) => pinned.painter(el, 1)); }
}
// Returns true once the column is complete (or when there is no pin): the gate for the chapters.
function tickPin(y) {
  if (!pinned) return true;
  if (pinned.active) {
    const top = pinned.block.getBoundingClientRect().top + y;
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
function tick() {
  raf = null;
  if (!tickPin(window.scrollY)) return;     // nothing below the hero prints until its column is complete
  units = units.filter((u) => u.el.isConnected);
  for (const u of units) {
    if (u.manual || !u.live) continue;
    const top = u.el.getBoundingClientRect().top;
    set(u, u.kind === 'block' ? blockProgress(H, top) : lineProgress(H, top));
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

// boot(): once every chapter has rendered. Under reduced motion the sheet is finished: every
// unit painted complete, no pin, no listener.
export function boot() {
  booted = true;
  H = window.innerHeight;
  if (reduced()) { units.forEach((u) => set(u, 1)); layoutPin(); return; }
  io = new IntersectionObserver((entries) => {
    for (const e of entries) { const u = byEl.get(e.target); if (u) u.live = e.isIntersecting; }
    schedule();
  }, { rootMargin: '100% 0px 100% 0px' });
  units.forEach((u) => { if (!u.manual) io.observe(u.el); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { H = window.innerHeight; layoutPin(); schedule(); });
  document.fonts.ready.then(() => { layoutPin(); schedule(); });   // the held screen's height settles with the faces
  layoutPin();
  // Seed pass: a deep-load position (a hash, scroll restoration) can land above units the
  // observer has not yet reported live; paint them now from their real position so a unit
  // already above the reading line on load is painted complete, per spec §4.2.
  if (tickPin(window.scrollY)) {
    for (const u of units) {
      if (u.manual || !u.el.isConnected) continue;
      const top = u.el.getBoundingClientRect().top;
      set(u, u.kind === 'block' ? blockProgress(H, top) : lineProgress(H, top));
    }
  }
  tick();
}

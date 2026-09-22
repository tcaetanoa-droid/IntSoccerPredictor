// site/js/header.js
// The site masthead stays at the top of every page, so its own height is the offset everything
// that sits under it needs: the two pinned screens, the chapter popover and every hash target.
// The nav wraps at narrow widths, so that height is measured rather than assumed — at load, once
// the faces have settled and on every resize — and published as one custom property on :root.
// js/print.js calls measure() itself before each of its layouts, so the fit tests never read a
// held screen sized from a stale header.

let hdr = 0;

export function measure() {
  const el = document.querySelector('.site-header');
  const h = el ? Math.round(el.getBoundingClientRect().height) : 0;
  if (h !== hdr) {
    hdr = h;
    document.documentElement.style.setProperty('--hdr', `${h}px`);
  }
  return hdr;
}

// Guarded because js/print.js imports this module and its formulas are unit-tested under Node,
// where there is no document to measure.
if (typeof document !== 'undefined') {
  measure();
  window.addEventListener('resize', measure);
  document.fonts.ready.then(measure);   // League Gothic settles the wordmark's line box
}

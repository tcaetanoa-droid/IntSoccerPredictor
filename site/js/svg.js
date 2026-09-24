// site/js/svg.js
const NS = 'http://www.w3.org/2000/svg';
// A hairline on the pixel, not across two: a one-pixel line at a whole coordinate straddles two
// pixel rows, so every chart puts its rules and ticks on the half pixel.
export const snap = (v) => Math.round(v) + 0.5;
// The charts are drawn at their holders' measured widths, so a resize redraws them; but a resize
// that leaves the page's width alone (a phone's address bar changes only the height) moves
// nothing, and a holder with no width (hidden) has nothing to draw into. The redraw once the
// faces settle is not routed through here: the faces move the boxes without moving the width.
export function redrawOnWidth(holder, draw) {
  let drawnAt = document.documentElement.clientWidth;
  window.addEventListener('resize', () => {
    const w = document.documentElement.clientWidth;
    if (w === drawnAt || !holder.clientWidth) return;
    drawnAt = w;
    draw();
  });
}
export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

// site/js/svg.js
const NS = 'http://www.w3.org/2000/svg';
// A hairline on the pixel, not across two: a one-pixel line at a whole coordinate straddles two
// pixel rows, so every chart puts its rules and ticks on the half pixel.
export const snap = (v) => Math.round(v) + 0.5;
export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

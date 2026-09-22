// site/js/svg.js
const NS = 'http://www.w3.org/2000/svg';
export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

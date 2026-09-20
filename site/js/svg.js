// site/js/svg.js
const NS = 'http://www.w3.org/2000/svg';
export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
// Vertical bars with a value label above each and short labels beneath. ticks: [{y, label}].
// Every colour that is a spec token is a class styled in site.css (.chart rules); only the bar
// takes a colour from the caller, because that one is the team's own.
export function barChart({ values, ymax, ticks, width = 420, height = 230, L = 40, T = 22, B = 44 }) {
  const ph = height - T - B, bw = (width - L - 8) / values.length;
  const Y = (v) => T + ph - v / ymax * ph;
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', class: 'chart' });
  for (const t of ticks) svg.append(svgEl('line', { class: 'grid', x1: L, x2: width - 8, y1: Y(t.y), y2: Y(t.y) }),
    svgEl('text', { class: 'tick n', x: L - 6, y: Y(t.y) + 4, 'font-size': 9.5, 'text-anchor': 'end' }, t.label));
  values.forEach((v, i) => {
    const x = L + i * bw + bw * 0.15;
    svg.append(svgEl('rect', { x, y: Y(v.value), width: bw * 0.7, height: ph - (Y(v.value) - T), fill: v.colour, rx: 2 }),
      svgEl('text', { class: 'val n', x: x + bw * 0.35, y: Y(v.value) - 4, 'font-size': 9.5, 'text-anchor': 'middle' }, v.text),
      svgEl('text', { class: 'lab', x: x + bw * 0.35, y: height - B + 14, 'font-size': 9, 'text-anchor': 'middle' }, v.label));
  });
  return svg;
}
